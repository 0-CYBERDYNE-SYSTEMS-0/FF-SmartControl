import { callLLM, callCloudLLM, getCloudProvider } from './llm.js';
import { z } from 'zod';

export type TriggerType = 'message' | 'heartbeat' | 'scheduled_task' | 'manual';

// ============================================================
// D5 hybrid LLM posture: escalation decision logic
// Local provider answers first (unchanged default). When
// DECISION_ESCALATION=auto and the local answer is low-confidence,
// alert-class, or the sensor snapshot looks anomalous, the cycle
// makes ONE additional cloud call via the existing cloud provider
// keys. Default DECISION_ESCALATION is off: existing installs see
// zero behavior change. The threshold is an env knob
// (FARMPAL_ESCALATION_CONF, default 0.7) that the sim-efficacy
// scorecard run informs — it is picked by the scorecard, not vibes.
// ============================================================

export interface EscalationContext {
  decision: string;
  confidence: number | null | undefined;
  snapshot: Record<string, Record<string, number>>;
}

export function isEscalationEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (env.DECISION_ESCALATION || '').toLowerCase() === 'auto';
}

export function getEscalationThreshold(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = parseFloat(env.FARMPAL_ESCALATION_CONF || '');
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.7;
}

/**
 * Obvious snapshot anomaly: at least one sensor device is registered but no
 * device reports any metric, or a reported value is not a finite number.
 * A snapshot with zero registered sensor devices is a setup state, not an
 * acute anomaly — escalating every cycle there would burn cloud spend.
 */
export function isAnomalousSnapshot(
  snapshot: Record<string, Record<string, number>>,
): boolean {
  const deviceEntries = Object.entries(snapshot);
  if (deviceEntries.length === 0) return false;

  let reportedMetrics = 0;
  for (const [, metrics] of deviceEntries) {
    for (const [, value] of Object.entries(metrics)) {
      if (!Number.isFinite(value)) return true;
      reportedMetrics++;
    }
  }
  return reportedMetrics === 0;
}

/**
 * Decide whether the local answer needs one cloud escalation call.
 * Pure function of the context + env; unit-tested without network.
 */
export function shouldEscalateToCloud(
  ctx: EscalationContext,
  env: NodeJS.ProcessEnv = process.env,
): { escalate: boolean; reasons: string[] } {
  if (!isEscalationEnabled(env)) return { escalate: false, reasons: [] };

  const threshold = getEscalationThreshold(env);
  const reasons: string[] = [];

  if (
    typeof ctx.confidence === 'number' &&
    Number.isFinite(ctx.confidence) &&
    ctx.confidence < threshold
  ) {
    reasons.push(`confidence ${ctx.confidence} < threshold ${threshold}`);
  }
  if (ctx.decision === 'alert') {
    reasons.push('alert-class decision');
  }
  if (isAnomalousSnapshot(ctx.snapshot)) {
    reasons.push('anomalous sensor snapshot');
  }

  return { escalate: reasons.length > 0, reasons };
}

// Robust decision-JSON extraction. Reasoning models (MiniMax-M3, Claude
// extended thinking) wrap or precede the JSON with prose/markdown fences, and a
// greedy `/\{[\s\S]*\}/` either over-captures or fails — silently degrading a
// valid "turn_on" into a no-op. Scan for balanced top-level objects (ignoring
// braces inside strings) and prefer the one that actually carries a `decision`.
export function extractDecisionJson(text: string): Record<string, any> | null {
  if (!text) return null;
  const tryParse = (s: string): Record<string, any> | null => {
    try {
      const v = JSON.parse(s);
      return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  };
  const sources: string[] = [];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) sources.push(fence[1]);
  sources.push(text);

  for (const src of sources) {
    const direct = tryParse(src.trim());
    if (direct) return direct;
    // Collect every balanced {...} object, tracking string literals/escapes.
    const objs: Record<string, any>[] = [];
    let depth = 0;
    let start = -1;
    let inStr = false;
    let esc = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (c === '}') {
        depth--;
        if (depth === 0 && start >= 0) {
          const obj = tryParse(src.slice(start, i + 1));
          if (obj) objs.push(obj);
          start = -1;
        }
      }
    }
    if (objs.length) {
      const withDecision = objs.filter((o) => 'decision' in o);
      return withDecision.length
        ? withDecision[withDecision.length - 1]
        : objs[objs.length - 1];
    }
  }
  return null;
}

interface DecisionCycleContext {
  trigger: TriggerType;
  message?: string;
  chatId?: string;
}

// Dynamic imports to avoid circular deps with hal/
async function getHalRegistry() {
  const { halRegistry } = await import('../hal/registry.js');
  return halRegistry;
}

async function getHalSensors() {
  const { halSensors } = await import('../hal/sensors.js');
  return halSensors;
}

async function getHalDecisions() {
  const { halDecisions } = await import('../hal/decisions.js');
  return halDecisions;
}

async function getHalRelays() {
  const { halRelays } = await import('../hal/relays.js');
  return halRelays;
}

async function getSensorSnapshot(
  halSensors: any,
  halRegistry: any,
): Promise<Record<string, Record<string, number>>> {
  const snapshot: Record<string, Record<string, number>> = {};
  const devices = halRegistry.list().filter((d: any) => d.type === 'sensor');
  for (const dev of devices) {
    snapshot[dev.id] = {};
    const tempReading = halSensors.latest(dev.id, 'temperature');
    if (tempReading && typeof tempReading.value === 'number')
      snapshot[dev.id].temperature = tempReading.value;
    const humReading = halSensors.latest(dev.id, 'humidity');
    if (humReading && typeof humReading.value === 'number')
      snapshot[dev.id].humidity = humReading.value;
    const co2Reading = halSensors.latest(dev.id, 'co2');
    if (co2Reading && typeof co2Reading.value === 'number')
      snapshot[dev.id].co2 = co2Reading.value;
    const lightReading = halSensors.latest(dev.id, 'light');
    if (lightReading && typeof lightReading.value === 'number')
      snapshot[dev.id].light = lightReading.value;
    const soilReading = halSensors.latest(dev.id, 'soil_moisture');
    if (soilReading && typeof soilReading.value === 'number')
      snapshot[dev.id].soil_moisture = soilReading.value;
  }
  return snapshot;
}

// Schema-validate the model's decision payload. Extraction proves it is JSON;
// only validation proves it is a decision we understand. An out-of-contract
// payload (unknown decision verb, non-numeric confidence, junk tool_calls)
// degrades to a safe noop that still carries the raw model text in reasoning
// so the audit trail shows what the model actually said. The same contract
// applies to a D5 cloud escalation answer.
const DecisionPayloadSchema = z.object({
  decision: z.enum(['turn_on', 'turn_off', 'adjust', 'alert', 'noop']),
  device_id: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
  tool_calls: z
    .array(
      z.object({
        tool: z.string().min(1),
        args: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
});

export async function runDecisionCycle(ctx: DecisionCycleContext): Promise<{
  decision: string;
  reasoning: string;
  toolCalls: any[];
}> {
  // Check E-Stop and farm loop safety before proceeding
  const {
    isAutonomousAllowed,
    recordDecisionHeartbeat,
    getEstopState,
    getFarmLoopState,
  } = await import('../safety/estop.js');

  recordDecisionHeartbeat();

  if (!isAutonomousAllowed()) {
    const estopState = getEstopState();
    const farmLoopState = getFarmLoopState();

    let reason = 'Autonomous control suspended';
    if (estopState.active) {
      reason = `E-Stop is active${estopState.reason ? `: ${estopState.reason}` : ''}`;
    } else if (farmLoopState.safetyMode) {
      reason = 'Farm loop hang detected - safety mode active';
    }

    return {
      decision: 'noop',
      reasoning: reason,
      toolCalls: [],
    };
  }

  const halRegistry = await getHalRegistry();
  const halSensors = await getHalSensors();
  const halDecisions = await getHalDecisions();
  const halRelays = await getHalRelays();

  const devices = halRegistry.list();
  const recentDecisions = halDecisions.recent(5);
  const sensorSnapshot = await getSensorSnapshot(halSensors, halRegistry);

  const systemPrompt = [
    'You are FarmPal, an autonomous smart farm controller.',
    'You control: smart plugs, sensors, cameras, GPIO devices.',
    'You have access to these devices:',
    devices
      .map(
        (d: any) =>
          `  - id="${d.id}"${d.label ? ` (${d.label})` : ''}: ${d.type} (${d.protocol}) at ${d.host || 'gpio'}, state=${d.last_state}, value=${d.last_value}`,
      )
      .join('\n'),
    '',
    'Recent decisions:',
    recentDecisions
      .slice(0, 5)
      .map(
        (d: any) =>
          `  - ${d.decision} (${d.outcome})${d.reasoning ? ': ' + d.reasoning : ''}`,
      )
      .join('\n'),
    '',
    'Current sensor readings:',
    Object.entries(sensorSnapshot)
      .flatMap(([deviceId, metrics]) =>
        Object.entries(metrics).map(
          ([metric, value]) => `  - ${deviceId}/${metric}: ${value}`,
        ),
      )
      .join('\n'),
    '',
    `Trigger: ${ctx.trigger}`,
    ctx.message ? `User message: ${ctx.message}` : '',
    '',
    'device_id MUST be one of the exact id="..." values listed above, or null. Do not use the human label.',
    'Respond ONLY with a valid JSON object: {"reasoning":"string","decision":"turn_on|turn_off|adjust|alert|noop","device_id":"string|null","confidence":0.0-1.0,"tool_calls":[]}',
  ].join('\n');

  const userPrompt = ctx.message
    ? `Message: ${ctx.message}\nChat: ${ctx.chatId}\n\nDecide what to do.`
    : `No user message. Run autonomous monitoring. Trigger: ${ctx.trigger}`;

  // Call LLM with timeout and error handling (VAL-AUTO-041)
  let llmResult: { text: string; model: string } | null = null;
  let llmError: string | null = null;
  try {
    llmResult = await callLLM(userPrompt, {
      system: systemPrompt,
      temperature: 0.3,
      maxTokens: 1024,
    });
  } catch (err: any) {
    llmError = err.message || 'LLM unavailable';
    console.error('[DecisionLoop] LLM call failed:', llmError);
  }

  // If LLM unavailable in AUTONOMOUS mode → safety hold (VAL-AUTO-041)
  if (llmError) {
    const { getAutomationMode } = await import('../automation/modes.js');
    const mode = getAutomationMode();

    // Log llm_unavailable event to safety audit (VAL-AUTO-041)
    try {
      const { createAuditEntry } = await import('../safety/audit-log.js');
      const { captureSensorSnapshot } = await import('../safety/verifier.js');
      createAuditEntry({
        deviceId: null,
        proposedAction: 'llm_unavailable',
        verifierResult: 'DENIED',
        deniedReason: `LLM unavailable: ${llmError}. Autonomous mode suspended until LLM recovers.`,
        conflictingRuleIds: null,
        sensorSnapshot: captureSensorSnapshot(),
        decisionId: null,
        triggeredBy: 'agent',
        executed: false,
      });
    } catch {
      // Non-fatal
    }

    // In AUTONOMOUS mode, suspend hardware actions when LLM is down
    if (mode === 'AUTONOMOUS') {
      return {
        decision: 'noop',
        reasoning: `LLM unavailable (${llmError}). AUTONOMOUS mode suspended — awaiting LLM recovery.`,
        toolCalls: [],
      };
    }
    // In other modes (SUGGEST, ASSISTED), continue with reasoning available
    // (parsed will remain empty, decision will be noop)
  }

  // Parse JSON from LLM response
  let parsed: any = {
    decision: 'noop',
    reasoning: llmResult?.text || (llmError ? `LLM error: ${llmError}` : ''),
    confidence: 0.5,
    tool_calls: [],
    device_id: null,
  };
  if (llmResult) {
    const extracted = extractDecisionJson(llmResult.text);
    if (extracted) parsed = { ...parsed, ...extracted };
    else parsed.reasoning = llmResult.text;
  }

  // Schema-validate the model's decision payload (module-level contract above).
  const payloadCheck = DecisionPayloadSchema.safeParse(parsed);
  if (!payloadCheck.success) {
    const issue = payloadCheck.error.issues[0];
    parsed.reasoning =
      `${parsed.reasoning || ''} [decision payload failed schema validation at ${issue?.path.join('.') || 'root'}: ${issue?.message || 'invalid'} — safe noop]`.trim();
    parsed = {
      decision: 'noop',
      reasoning: parsed.reasoning,
      confidence: 0.5,
      tool_calls: [],
      device_id: null,
    };
  }

  // Drop malformed tool calls (missing/blank tool name) so the executor never
  // sees `Unknown tool: undefined` from a reasoning model's loose output.
  if (Array.isArray(parsed.tool_calls)) {
    parsed.tool_calls = parsed.tool_calls.filter(
      (tc: any) => tc && typeof tc.tool === 'string' && tc.tool.length > 0,
    );
  } else {
    parsed.tool_calls = [];
  }

  // Guard against a hallucinated device_id: hal_decision_log has a foreign key
  // on device_id, so an unregistered id throws and kills the whole cycle.
  // Treat an unknown id as a safe no-action instead of crashing.
  if (parsed.device_id && !halRegistry.get(parsed.device_id)) {
    parsed.reasoning =
      `${parsed.reasoning || ''} [device_id "${parsed.device_id}" is not a registered device — no action taken]`.trim();
    parsed.device_id = null;
    parsed.decision = 'noop';
  }

  // D5 escalation: when enabled and the local answer looks hard or anomalous,
  // give the cloud model ONE chance to decide. The cloud payload passes the
  // same schema gate as the local one; if the cloud call fails or answers
  // out-of-contract, the local answer stands. Exactly one escalation per cycle.
  let decidedByModel = llmResult?.model;
  if (isEscalationEnabled() && llmResult) {
    const escalation = shouldEscalateToCloud({
      decision: parsed.decision,
      confidence: parsed.confidence,
      snapshot: sensorSnapshot,
    });
    if (escalation.escalate && getCloudProvider()) {
      try {
        const cloudResult = await callCloudLLM(userPrompt, {
          system: systemPrompt,
          temperature: 0.3,
          maxTokens: 1024,
        });
        const cloudExtracted = extractDecisionJson(cloudResult.text);
        const cloudCheck = cloudExtracted
          ? DecisionPayloadSchema.safeParse(cloudExtracted)
          : { success: false as const };
        if (cloudCheck.success) {
          parsed = {
            decision: cloudCheck.data.decision,
            device_id: cloudCheck.data.device_id ?? null,
            confidence: cloudCheck.data.confidence ?? 0.5,
            reasoning: cloudCheck.data.reasoning ?? cloudResult.text,
            tool_calls: cloudCheck.data.tool_calls ?? [],
          };
          decidedByModel = cloudResult.model;
          // The cloud answer gets the same hygiene as the local one: drop
          // malformed tool calls and re-apply the hallucinated-device guard
          // before the decision is logged or executed.
          if (Array.isArray(parsed.tool_calls)) {
            parsed.tool_calls = parsed.tool_calls.filter(
              (tc: any) =>
                tc && typeof tc.tool === 'string' && tc.tool.length > 0,
            );
          } else {
            parsed.tool_calls = [];
          }
          if (parsed.device_id && !halRegistry.get(parsed.device_id)) {
            parsed.reasoning =
              `${parsed.reasoning || ''} [cloud device_id "${parsed.device_id}" is not a registered device — no action taken]`.trim();
            parsed.device_id = null;
            parsed.decision = 'noop';
          }
          parsed.reasoning =
            `${parsed.reasoning} [escalated to cloud (${escalation.reasons.join('; ')}); decided by ${cloudResult.model}]`.trim();
        } else {
          parsed.reasoning =
            `${parsed.reasoning || ''} [cloud escalation answered out-of-contract — local answer kept]`.trim();
        }
      } catch (err: any) {
        parsed.reasoning =
          `${parsed.reasoning || ''} [cloud escalation failed: ${err?.message || 'unknown'} — local answer kept]`.trim();
        console.error('[DecisionLoop] Cloud escalation failed:', err?.message);
      }
    }
  }

  // Convert sensor snapshot to flat format for decision log (backward compatible)
  const flatSensorSnapshot: Record<string, number> = {};
  for (const [deviceId, metrics] of Object.entries(sensorSnapshot)) {
    for (const [metric, value] of Object.entries(metrics)) {
      flatSensorSnapshot[`${deviceId}_${metric}`] = value;
    }
  }

  // Determine triggered_by based on trigger type (VAL-AUTO-023)
  const triggeredBy: 'agent' | 'manual_ui' | 'schedule' =
    ctx.trigger === 'manual' ? 'manual_ui' : 'agent';

  const decision = halDecisions.log({
    device_id: parsed.device_id || undefined,
    decision: parsed.decision || 'noop',
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    sensor_snapshot: flatSensorSnapshot,
    outcome: 'pending',
    triggered_by: triggeredBy,
    model: decidedByModel, // VAL-AUTO-042: model in audit entries; D5: the model that actually decided
  });

  // Import automation mode handler
  const { handleDecisionBasedOnMode, isObserveOnlyMode, isAutoExecute } =
    await import('../automation/modes.js');

  // Check if this is a no-action decision (no hardware action needed)
  const isNoAction =
    parsed.decision === 'noop' ||
    parsed.decision === 'alert' ||
    !parsed.device_id;

  // In OBSERVE_ONLY mode: zero hardware actions, just log the decision
  if (isObserveOnlyMode()) {
    halDecisions.complete(decision.id, 'pending');
    return {
      decision: parsed.decision,
      reasoning: `OBSERVE_ONLY: ${parsed.reasoning} — no action taken (observe mode)`,
      toolCalls: [],
    };
  }

  // For non-action decisions, just complete and return
  if (isNoAction) {
    halDecisions.complete(decision.id, 'pending');
    return {
      decision: parsed.decision,
      reasoning: parsed.reasoning,
      toolCalls: [],
    };
  }

  // Determine what to do based on current automation mode
  const modeResult = handleDecisionBasedOnMode(
    decision.id,
    parsed.decision,
    parsed.device_id,
  );

  // OBSERVE_ONLY returns executed=false, handled above
  // SUGGEST and ASSISTED: executed=false, pending created
  if (!modeResult.executed) {
    return {
      decision: parsed.decision,
      reasoning: modeResult.reason,
      toolCalls: [],
    };
  }

  // AUTONOMOUS mode: execute immediately (proceeds below)

  // Execute tool calls with mid-action violation checking (VAL-SAFE-004)
  for (
    let stepIndex = 0;
    stepIndex < (parsed.tool_calls || []).length;
    stepIndex++
  ) {
    const tc = parsed.tool_calls[stepIndex];
    try {
      const { executeToolCall } = await import('./tool-executor.js');

      // Capture pre-action state for device control actions (for rollback)
      let preActionStates: Map<string, string | null> = new Map();
      if (tc.tool === 'control_plug' || tc.tool === 'control_device') {
        const deviceId = tc.args.device_id;
        if (deviceId) {
          const deviceBefore = halRegistry.get(deviceId);
          preActionStates.set(deviceId, deviceBefore?.last_state ?? null);
        }
      }

      await executeToolCall(tc, halRegistry);

      // For device control actions, check for mid-action violations after execution
      if (
        (tc.tool === 'control_plug' || tc.tool === 'control_device') &&
        tc.args.device_id
      ) {
        const deviceId = tc.args.device_id;
        const action = tc.args.action;

        // Re-verify the action against current sensor state
        const {
          captureSensorSnapshot,
          verifyAction: verifyToolAction,
          recordInterruption,
        } = await import('../safety/verifier.js');

        const freshSensorSnapshot = captureSensorSnapshot();
        const verifyResult = await verifyToolAction({
          action: {
            decision: action,
            deviceId: deviceId,
            reasoning: 'mid-action verification',
            confidence: 1.0,
          },
          triggeredBy: triggeredBy,
          sensorSnapshot: freshSensorSnapshot,
        });

        if (!verifyResult.approved) {
          console.log(
            `[DecisionLoop] Mid-action violation at step ${stepIndex + 1} for ${deviceId}: ${verifyResult.reason}. Reverting.`,
          );

          // Revert to pre-action state
          const preState = preActionStates.get(deviceId);
          if (preState !== null && preState !== undefined) {
            await halRegistry.control(deviceId, preState as 'on' | 'off');
          }

          // Record interruption and stop executing remaining steps
          await recordInterruption(
            verifyResult.auditEntry.id,
            stepIndex + 1,
            stepIndex + 1,
          );

          halDecisions.complete(decision.id, 'failure');
          return {
            decision: 'noop',
            reasoning: `MID-ACTION VIOLATION at step ${stepIndex + 1}: ${verifyResult.reason}. Action reverted.`,
            toolCalls: parsed.tool_calls.slice(0, stepIndex + 1),
          };
        }
      }
    } catch (err: any) {
      console.error('[DecisionLoop] Tool call error:', err.message);
    }
  }

  // Direct device control - NOW GOES THROUGH SAFETY VERIFIER
  if (parsed.decision === 'turn_on' || parsed.decision === 'turn_off') {
    if (parsed.device_id) {
      // Import verifier dynamically to avoid circular dependency
      const { verifyAction, executeActuation } =
        await import('../safety/verifier.js');

      const verifyResult = await verifyAction({
        action: {
          decision: parsed.decision,
          deviceId: parsed.device_id,
          reasoning: parsed.reasoning,
          confidence: parsed.confidence,
        },
        triggeredBy,
        decisionId: decision.id,
        sensorSnapshot,
      });

      // Actuation flows through the unified chokepoint, which reuses this
      // verify result (single audit entry) and keeps the rollback behavior.
      let actuation;
      try {
        actuation = await executeActuation({
          deviceId: parsed.device_id,
          action: parsed.decision === 'turn_on' ? 'on' : 'off',
          triggeredBy,
          source: 'autonomous',
          decisionId: decision.id,
          verifyResult,
        });
      } catch (err) {
        halDecisions.complete(decision.id, 'failure');
        throw err;
      }

      if (!actuation.executed) {
        if (actuation.auditEntry?.interrupted) {
          // Mid-action violation: chokepoint already reverted to pre-action state
          halDecisions.complete(decision.id, 'failure');
          return {
            decision: parsed.decision,
            reasoning: actuation.reason,
            toolCalls: [],
          };
        }

        // Action was DENIED by safety rules
        console.log(
          `[DecisionLoop] Action ${parsed.decision} on ${parsed.device_id} DENIED: ${actuation.reason}`,
        );
        halDecisions.complete(decision.id, 'failure');
        return {
          decision: parsed.decision,
          reasoning: `DENIED by safety policy: ${actuation.reason}`,
          toolCalls: [],
        };
      }

      try {
        // Mark the pending decision as executed
        const { markDecisionExecuted } = await import('../automation/modes.js');
        markDecisionExecuted(decision.id, 'success');

        halDecisions.complete(decision.id, 'success');
      } catch (err) {
        halDecisions.complete(decision.id, 'failure');
        throw err;
      }
    }
  } else {
    halDecisions.complete(
      decision.id,
      parsed.tool_calls?.length > 0 ? 'success' : 'pending',
    );
  }

  return {
    decision: parsed.decision,
    reasoning: parsed.reasoning,
    toolCalls: parsed.tool_calls || [],
  };
}
