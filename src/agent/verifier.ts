/**
 * FarmPal Verifier Agent
 *
 * Validates proposed farm actions against safety rules and current state.
 * Implements the Generator + Verifier pattern for reliable decision-making.
 *
 * Safety rules that NEVER pass:
 * - Never turn off exhaust if temp > 30C
 * - Never turn off circulation if humidity > 80%
 * - Max 3 humidifier activations per hour
 * - Alert on any decision with confidence < 0.7
 */

import { callLLM } from './llm.js';
import { halRegistry } from '../hal/registry.js';
import { halSensors } from '../hal/sensors.js';
import type { HalDevice, HalSensorReading, MetricType } from '../hal/types.js';

export interface VerifierInput {
  proposedAction: {
    decision: string;
    deviceId: string | null;
    reasoning: string;
    confidence: number;
  };
}

export interface VerifierResult {
  approved: boolean;
  reasoning: string;
  concerns: string[];
  safetyOverride?: boolean;
}

interface SafetyRule {
  id: string;
  description: string;
  check: (ctx: DeterministicSafetyContext) => {
    pass: boolean;
    message: string;
  };
}

export interface DeterministicSafetyDeps {
  devices?: HalDevice[];
  latest?: (
    deviceId: string,
    metric: MetricType,
  ) => Pick<HalSensorReading, 'value'> | undefined;
  now?: number;
}

interface DeterministicSafetyContext {
  input: VerifierInput;
  devices: HalDevice[];
  device: HalDevice | null;
  latest: (
    deviceId: string,
    metric: MetricType,
  ) => Pick<HalSensorReading, 'value'> | undefined;
  now: number;
}

// Hard safety rules that always apply
const HARD_SAFETY_RULES: SafetyRule[] = [
  {
    id: 'exhaust_temp',
    description: 'Never turn off exhaust if temperature > 30C',
    check: (ctx) => {
      const { input, device } = ctx;
      if (
        input.proposedAction.decision !== 'turn_off' ||
        !device ||
        !matchesDevice(device, ['exhaust', 'fan'])
      ) {
        return { pass: true, message: 'not an exhaust fan shutdown' };
      }

      const maxTemp = maxLatestMetric(ctx, 'temperature');
      return {
        pass: maxTemp === null || maxTemp <= 30,
        message:
          maxTemp === null
            ? 'Temperature: unavailable'
            : `Temperature: ${maxTemp}C`,
      };
    },
  },
  {
    id: 'circulation_humidity',
    description: 'Never turn off circulation if humidity > 80%',
    check: (ctx) => {
      const { input, device } = ctx;
      if (
        input.proposedAction.decision !== 'turn_off' ||
        !device ||
        !matchesDevice(device, ['circulation', 'fan'])
      ) {
        return { pass: true, message: 'not a circulation shutdown' };
      }

      const maxHumidity = maxLatestMetric(ctx, 'humidity');
      return {
        pass: maxHumidity === null || maxHumidity <= 80,
        message:
          maxHumidity === null
            ? 'Humidity: unavailable'
            : `Humidity: ${maxHumidity}%`,
      };
    },
  },
];

// Rate limiting state (in-memory, reset on restart)
const recentActivations = new Map<string, number[]>();
const MAX_ACTIVATIONS_PER_HOUR = 3;

function checkRateLimit(
  deviceId: string,
  now = Date.now(),
): { pass: boolean; message: string } {
  const oneHourAgo = now - 60 * 60 * 1000;

  const activations = recentActivations.get(deviceId) || [];
  const recentCount = activations.filter((t) => t > oneHourAgo).length;

  // Update the stored activations
  recentActivations.set(
    deviceId,
    activations.filter((t) => t > oneHourAgo),
  );

  return {
    pass: recentCount < MAX_ACTIVATIONS_PER_HOUR,
    message: `Recent activations: ${recentCount}/${MAX_ACTIVATIONS_PER_HOUR} per hour`,
  };
}

function recordActivation(deviceId: string, now = Date.now()): void {
  const activations = recentActivations.get(deviceId) || [];
  activations.push(now);
  recentActivations.set(deviceId, activations);
}

export function resetVerifierRateLimitsForTests(): void {
  recentActivations.clear();
}

function matchesDevice(device: HalDevice, terms: string[]): boolean {
  const haystack = `${device.id} ${device.label || ''}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function isHumidifierLike(device: HalDevice): boolean {
  return matchesDevice(device, ['humidifier', 'mist', 'fogger', 'mister']);
}

function isActuatorDecision(decision: string): boolean {
  return decision === 'turn_on' || decision === 'turn_off';
}

function maxLatestMetric(
  ctx: DeterministicSafetyContext,
  metric: MetricType,
): number | null {
  let max: number | null = null;
  for (const dev of ctx.devices.filter((d) => d.type === 'sensor')) {
    const reading = ctx.latest(dev.id, metric);
    if (!reading || typeof reading.value !== 'number') continue;
    max = max === null ? reading.value : Math.max(max, reading.value);
  }
  return max;
}

export function evaluateDeterministicSafety(
  input: VerifierInput,
  deps: DeterministicSafetyDeps = {},
): { approved: boolean; concerns: string[] } {
  const devices = deps.devices ?? halRegistry.list();
  const device = input.proposedAction.deviceId
    ? (devices.find((d) => d.id === input.proposedAction.deviceId) ?? null)
    : null;
  const ctx: DeterministicSafetyContext = {
    input,
    devices,
    device,
    latest:
      deps.latest ??
      ((deviceId, metric) => halSensors.latest(deviceId, metric)),
    now: deps.now ?? Date.now(),
  };

  const concerns: string[] = [];

  if (isActuatorDecision(input.proposedAction.decision)) {
    if (!input.proposedAction.deviceId) {
      concerns.push('INVALID ACTION: actuator decision requires a device_id');
    } else if (!device) {
      concerns.push(
        `INVALID ACTION: device ${input.proposedAction.deviceId} is not registered`,
      );
    }
  }

  for (const rule of HARD_SAFETY_RULES) {
    const result = rule.check(ctx);
    if (!result.pass) {
      concerns.push(`SAFETY FAIL: ${rule.description} (${result.message})`);
    }
  }

  if (
    input.proposedAction.decision === 'turn_on' &&
    device &&
    (device.type === 'smart_plug' || device.type === 'relay') &&
    isHumidifierLike(device)
  ) {
    const rateCheck = checkRateLimit(device.id, ctx.now);
    if (!rateCheck.pass) {
      concerns.push(
        `RATE LIMIT: Max 3 humidifier activations per hour (${rateCheck.message})`,
      );
    }
  }

  if (input.proposedAction.confidence < 0.7) {
    concerns.push(`LOW CONFIDENCE: ${input.proposedAction.confidence} < 0.7`);
  }

  return {
    approved: concerns.length === 0,
    concerns,
  };
}

function buildSafetyPrompt(input: VerifierInput): string {
  const devices = halRegistry.list();
  const deviceMap = new Map(devices.map((d: any) => [d.id, d]));

  const proposedDevice = input.proposedAction.deviceId
    ? deviceMap.get(input.proposedAction.deviceId)
    : null;

  const currentReadings: string[] = [];
  for (const dev of devices.filter((d: any) => d.type === 'sensor')) {
    const temp = halSensors.latest(dev.id, 'temperature')?.value;
    const humidity = halSensors.latest(dev.id, 'humidity')?.value;
    if (temp !== undefined)
      currentReadings.push(`${dev.label || dev.id}: temp=${temp}C`);
    if (humidity !== undefined)
      currentReadings.push(`${dev.label || dev.id}: humidity=${humidity}%`);
  }

  return [
    'You are a farm safety verifier. Evaluate this proposed action for safety concerns.',
    '',
    'PROPOSED ACTION:',
    `  Decision: ${input.proposedAction.decision}`,
    `  Device: ${input.proposedAction.deviceId || 'none'}`,
    `  Reasoning: ${input.proposedAction.reasoning}`,
    `  Confidence: ${input.proposedAction.confidence}`,
    '',
    'CURRENT STATE:',
    currentReadings.length > 0
      ? currentReadings.join('\n')
      : '  (no readings available)',
    '',
    'SAFETY RULES:',
    '  1. Never turn off exhaust fans if temperature > 30C (heat damage risk)',
    '  2. Never turn off circulation if humidity > 80% (mold risk)',
    '  3. Max 3 humidifier activations per hour (water damage risk)',
    '  4. Alert on decisions with confidence < 0.7 (uncertainty risk)',
    '',
    'Respond ONLY with valid JSON:',
    '{"approved":true|false,"reasoning":"string","concerns":["string"],"safety_override":true|false}',
    '',
    'Set safety_override=true ONLY if the action is unambiguously correct and safe.',
  ].join('\n');
}

export async function runVerifier(
  input: VerifierInput,
): Promise<VerifierResult> {
  const deterministic = evaluateDeterministicSafety(input);
  const concerns = [...deterministic.concerns];

  if (!deterministic.approved) {
    return {
      approved: false,
      reasoning: concerns.map((c) => `- ${c}`).join('\n'),
      concerns,
    };
  }

  // Use LLM for additional context-aware validation
  const systemPrompt = buildSafetyPrompt(input);
  const llmResult = await callLLM(
    'Evaluate this proposed farm action for safety. Consider device state, recent history, and environmental conditions.',
    { system: systemPrompt, temperature: 0.1, maxTokens: 512 },
  );

  try {
    const jsonMatch = llmResult.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.concerns && Array.isArray(parsed.concerns)) {
        concerns.push(...parsed.concerns);
      }
      if (!parsed.approved) {
        concerns.push(
          'LLM_REJECTED: ' + (parsed.reasoning || 'no reason provided'),
        );
      }
    }
  } catch {
    // LLM parse failure, continue with concerns
  }

  const approved = concerns.length === 0;

  // Record successful verification for rate limiting
  if (
    approved &&
    input.proposedAction.deviceId &&
    input.proposedAction.decision === 'turn_on'
  ) {
    const device = halRegistry.get(input.proposedAction.deviceId);
    if (
      device &&
      (device.type === 'smart_plug' || device.type === 'relay') &&
      isHumidifierLike(device)
    ) {
      recordActivation(input.proposedAction.deviceId);
    }
  }

  return {
    approved,
    reasoning: approved
      ? 'All safety checks passed'
      : concerns.map((c) => `- ${c}`).join('\n'),
    concerns,
  };
}

/**
 * Execute a verified action on the HAL registry
 */
export async function executeVerifiedAction(
  decision: string,
  deviceId: string | null,
  toolCalls: Array<{ tool: string; args: Record<string, unknown> }>,
): Promise<{ success: boolean; message: string }> {
  if (!deviceId) {
    return { success: true, message: 'No-op decision' };
  }

  try {
    if (decision === 'turn_on') {
      await halRegistry.control(deviceId, 'on');
      return { success: true, message: `Turned on ${deviceId}` };
    }

    if (decision === 'turn_off') {
      await halRegistry.control(deviceId, 'off');
      return { success: true, message: `Turned off ${deviceId}` };
    }

    // Execute any additional tool calls
    for (const tc of toolCalls) {
      const { executeToolCall } = await import('./tool-executor.js');
      await executeToolCall(tc, halRegistry);
    }

    return { success: true, message: 'Action executed' };
  } catch (err) {
    return { success: false, message: `Execution failed: ${err}` };
  }
}
