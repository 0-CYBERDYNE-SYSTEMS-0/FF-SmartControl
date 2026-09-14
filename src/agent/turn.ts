import { runDiagnostic, formatDiagnosticReport } from './diagnostic.js';
import { runGenerator } from './generator.js';
import {
  applySuggestion,
  getPendingSuggestions,
  runReflector,
} from './reflector.js';
import { executeVerifiedAction, runVerifier } from './verifier.js';
import { activateEstop } from '../safety/estop.js';
import { halRegistry } from '../hal/registry.js';
import { halSensors } from '../hal/sensors.js';
import { halDecisions } from '../hal/decisions.js';
import { halRelays } from '../hal/relays.js';
import type { MetricType } from '../hal/types.js';

export interface FarmPalTurnInput {
  chatJid: string;
  message: string;
  requestId: string;
  trigger?: 'message' | 'heartbeat' | 'scheduled_task';
}

export interface FarmPalTurnResult {
  ok: boolean;
  result: string;
  streamed: false;
  usage?: {
    provider?: string;
    model?: string;
  };
}

type FarmPalIntent =
  | 'status'
  | 'diagnostic'
  | 'reflection'
  | 'suggestions'
  | 'apply_suggestion'
  | 'emergency_stop'
  | 'control';

const SENSOR_METRICS: MetricType[] = [
  'temperature',
  'humidity',
  'soil_moisture',
  'co2',
  'water_level',
  'ph',
];

function normalizeMessage(message: string): string {
  return message
    .trim()
    .replace(/^!auto\s+/i, '')
    .trim();
}

function classifyIntent(message: string): FarmPalIntent {
  const text = message.trim().toLowerCase();
  if (
    text === '/stop' ||
    text === 'stop' ||
    text.includes('emergency stop') ||
    text.includes('shut everything down')
  ) {
    return 'emergency_stop';
  }
  if (
    text === '/diagnose' ||
    text === 'diagnose' ||
    text.includes('diagnostic')
  ) {
    return 'diagnostic';
  }
  if (
    text === '/reflect' ||
    text === 'reflect' ||
    text.includes('reflection') ||
    text.includes('what did you learn')
  ) {
    return 'reflection';
  }
  if (
    text === '/suggestions' ||
    text === 'suggestions' ||
    text.includes('pending suggestions')
  ) {
    return 'suggestions';
  }
  if (text.startsWith('/apply') || text.startsWith('apply suggestion')) {
    return 'apply_suggestion';
  }
  if (
    text === '/status' ||
    text === 'status' ||
    text.includes('how is') ||
    text.includes('what is the status') ||
    text.includes('sensor')
  ) {
    return 'status';
  }
  return 'control';
}

function formatReading(deviceId: string, metric: MetricType): string | null {
  const reading = halSensors.latest(deviceId, metric);
  if (!reading) return null;
  return `${metric}=${reading.value}${reading.unit}`;
}

function formatStatus(): string {
  const devices = halRegistry.list();
  if (devices.length === 0) {
    return 'FarmPal status: no HAL devices are registered yet.';
  }

  const lines = ['FarmPal status'];
  for (const device of devices.slice(0, 24)) {
    const readings =
      device.type === 'sensor'
        ? SENSOR_METRICS.map((metric) => formatReading(device.id, metric))
            .filter((entry): entry is string => Boolean(entry))
            .slice(0, 4)
        : [];
    const valueParts = [
      `state=${device.last_state || 'unknown'}`,
      device.last_value !== null && device.last_value !== undefined
        ? `value=${device.last_value}`
        : null,
      readings.length > 0 ? readings.join(' ') : null,
    ].filter((entry): entry is string => Boolean(entry));
    lines.push(
      `- ${device.label || device.id} (${device.type}/${device.protocol}): ${valueParts.join(', ')}`,
    );
  }
  if (devices.length > 24) {
    lines.push(`- ... ${devices.length - 24} additional device(s) omitted`);
  }
  return lines.join('\n');
}

function formatReflectionSummary(
  report: Awaited<ReturnType<typeof runReflector>>,
): string {
  if (report.suggestions.length === 0) {
    return `${report.summary}\n\nNo pending controller suggestions were generated.`;
  }
  const suggestions = report.suggestions
    .map(
      (suggestion) =>
        `- [${suggestion.category}] ${suggestion.currentValue} -> ${suggestion.suggestedValue} (${Math.round(
          suggestion.confidence * 100,
        )}%): ${suggestion.reasoning}`,
    )
    .join('\n');
  return `${report.summary}\n\nPending suggestions:\n${suggestions}`;
}

function formatPendingSuggestions(): string {
  const suggestions = getPendingSuggestions();
  if (suggestions.length === 0) {
    return 'No pending FarmPal suggestions. Run /reflect to generate a fresh review.';
  }
  return [
    'Pending FarmPal suggestions',
    ...suggestions.map(
      (suggestion) =>
        `- ${suggestion.id}: [${suggestion.category}] ${suggestion.currentValue} -> ${suggestion.suggestedValue} (${Math.round(
          suggestion.confidence * 100,
        )}%): ${suggestion.reasoning}`,
    ),
    '',
    'Apply with: /apply <suggestion_id>',
  ].join('\n');
}

function parseSuggestionId(message: string): string | null {
  const trimmed = message.trim();
  const match = trimmed.match(
    /^(?:\/apply|apply suggestion)\s+([a-zA-Z0-9_-]+)/i,
  );
  return match?.[1] ?? null;
}

async function applyPendingSuggestion(
  message: string,
): Promise<FarmPalTurnResult> {
  const id = parseSuggestionId(message);
  if (!id) {
    return {
      ok: false,
      streamed: false,
      result:
        'Missing suggestion id. Use /suggestions to list pending suggestions, then /apply <suggestion_id>.',
    };
  }

  const suggestions = getPendingSuggestions();
  const suggestion = suggestions.find((candidate) => candidate.id === id);
  if (!suggestion) {
    return {
      ok: false,
      streamed: false,
      result: `Suggestion not found: ${id}`,
    };
  }

  const result = await applySuggestion(suggestion);
  return {
    ok: result.success,
    streamed: false,
    result: result.message,
  };
}

async function runControlTurn(
  input: FarmPalTurnInput,
  message: string,
): Promise<FarmPalTurnResult> {
  let proposal: Awaited<ReturnType<typeof runGenerator>>;
  try {
    proposal = await runGenerator({
      trigger: input.trigger || 'message',
      message,
      chatId: input.chatJid,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    halDecisions.log({
      decision: 'alert',
      confidence: 1,
      reasoning: `Control agent unavailable; no hardware action taken: ${reason}`,
      outcome: 'failure',
    });
    return {
      ok: false,
      streamed: false,
      result: `Control agent unavailable. No hardware action was taken.\nReason: ${reason}`,
    };
  }

  const verification = await runVerifier({
    proposedAction: {
      decision: proposal.decision,
      deviceId: proposal.deviceId,
      reasoning: proposal.reasoning,
      confidence: proposal.confidence,
    },
  });

  if (!verification.approved) {
    halDecisions.log({
      device_id: proposal.deviceId || undefined,
      decision: proposal.decision,
      confidence: proposal.confidence,
      reasoning: `Blocked by verifier: ${verification.reasoning}`,
      outcome: 'failure',
    });
    return {
      ok: true,
      streamed: false,
      result: [
        `Blocked: ${proposal.decision}`,
        proposal.deviceId ? `Device: ${proposal.deviceId}` : null,
        `Reason: ${verification.reasoning}`,
      ]
        .filter((entry): entry is string => Boolean(entry))
        .join('\n'),
    };
  }

  const execution = await executeVerifiedAction(
    proposal.decision,
    proposal.deviceId,
    proposal.toolCalls,
  );
  halDecisions.log({
    device_id: proposal.deviceId || undefined,
    decision: proposal.decision,
    confidence: proposal.confidence,
    reasoning: proposal.reasoning,
    outcome: execution.success ? 'success' : 'failure',
  });
  if (
    execution.success &&
    proposal.deviceId &&
    (proposal.decision === 'turn_on' || proposal.decision === 'turn_off')
  ) {
    halRelays.log({
      device_id: proposal.deviceId,
      state: proposal.decision === 'turn_on' ? 'on' : 'off',
      reason: 'agent_decision',
      triggered_by: 'farmpal_agent',
    });
  }

  return {
    ok: execution.success,
    streamed: false,
    result: [
      execution.success
        ? `Approved: ${proposal.decision}`
        : `Failed: ${proposal.decision}`,
      proposal.deviceId ? `Device: ${proposal.deviceId}` : null,
      `Reason: ${proposal.reasoning}`,
      execution.message ? `Result: ${execution.message}` : null,
    ]
      .filter((entry): entry is string => Boolean(entry))
      .join('\n'),
  };
}

export async function runFarmPalTurn(
  input: FarmPalTurnInput,
): Promise<FarmPalTurnResult> {
  const message = normalizeMessage(input.message);
  const intent = classifyIntent(message);

  if (intent === 'emergency_stop') {
    try {
      const estop = await activateEstop('operator', 'operator', message);
      // Count only devices whose safe state was actually applied ('on'/'off');
      // 'unknown'/'no_change' entries must not inflate the moved count.
      const movedCount = estop.appliedSafeStates.filter(
        (s) => s.safeState === 'on' || s.safeState === 'off',
      ).length;
      const outcome = estop.failures.length > 0 ? 'failure' : 'success';
      const summary = `${movedCount} device(s) moved to safe state, ${estop.failures.length} failure(s)`;
      halDecisions.log({
        decision: 'alert',
        confidence: 1,
        reasoning: `Emergency stop activated by operator: ${summary}.`,
        outcome,
      });
      const failureLines =
        estop.failures.length > 0
          ? `\nFailures:\n${estop.failures.map((f) => `- ${f}`).join('\n')}`
          : '';
      return {
        ok: true,
        streamed: false,
        result: `EMERGENCY STOP ACTIVE. ${summary}.${failureLines}\nAutonomous control is suspended until the E-stop is cleared from the dashboard.`,
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      halDecisions.log({
        decision: 'alert',
        confidence: 1,
        reasoning: `Emergency stop activation FAILED: ${reason}`,
        outcome: 'failure',
      });
      return {
        ok: false,
        streamed: false,
        result: `Emergency stop activation FAILED (${reason}). Use the dashboard E-stop immediately.`,
      };
    }
  }

  if (intent === 'status') {
    return { ok: true, streamed: false, result: formatStatus() };
  }

  if (intent === 'diagnostic') {
    const report = await runDiagnostic();
    return {
      ok: true,
      streamed: false,
      result: formatDiagnosticReport(report),
    };
  }

  if (intent === 'reflection') {
    const report = await runReflector();
    return {
      ok: true,
      streamed: false,
      result: formatReflectionSummary(report),
    };
  }

  if (intent === 'suggestions') {
    return { ok: true, streamed: false, result: formatPendingSuggestions() };
  }

  if (intent === 'apply_suggestion') {
    return applyPendingSuggestion(message);
  }

  return runControlTurn(input, message);
}
