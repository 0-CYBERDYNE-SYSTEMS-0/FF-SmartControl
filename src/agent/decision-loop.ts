import { callLLM } from './llm.js';

export type TriggerType = 'message' | 'heartbeat' | 'scheduled_task' | 'manual';

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
    try {
      const jsonMatch = llmResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      else parsed.reasoning = llmResult.text;
    } catch {
      parsed.reasoning = llmResult.text;
    }
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
    model: llmResult?.model, // VAL-AUTO-042: model in audit entries
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
      const { verifyAction, recordExecution } =
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

      if (!verifyResult.approved) {
        // Action was DENIED by safety rules
        console.log(
          `[DecisionLoop] Action ${parsed.decision} on ${parsed.device_id} DENIED: ${verifyResult.reason}`,
        );
        halDecisions.complete(decision.id, 'failure');
        return {
          decision: parsed.decision,
          reasoning: `DENIED by safety policy: ${verifyResult.reason}`,
          toolCalls: [],
        };
      }

      // Action was APPROVED - proceed to hardware
      try {
        // Capture pre-action state for rollback (VAL-SAFE-004)
        const deviceBefore = halRegistry.get(parsed.device_id);
        const preActionState = deviceBefore?.last_state ?? null;

        await halRegistry.control(
          parsed.device_id,
          parsed.decision === 'turn_on' ? 'on' : 'off',
        );

        // Re-verify after execution to detect mid-action violations
        // Capture fresh sensor snapshot and re-check safety rules
        const { captureSensorSnapshot } = await import('../safety/verifier.js');
        const freshSensorSnapshot = captureSensorSnapshot();
        const { verifyAction: reVerify } =
          await import('../safety/verifier.js');

        const reVerifyResult = await reVerify({
          action: {
            decision: parsed.decision,
            deviceId: parsed.device_id,
            reasoning: parsed.reasoning,
            confidence: parsed.confidence,
          },
          triggeredBy,
          decisionId: decision.id,
          sensorSnapshot: freshSensorSnapshot,
        });

        // If action is now denied due to sensor change mid-action, rollback
        if (!reVerifyResult.approved) {
          console.log(
            `[DecisionLoop] Mid-action violation detected for ${parsed.device_id}: ${reVerifyResult.reason}. Reverting to pre-action state.`,
          );

          // Revert to pre-action state
          if (preActionState !== null) {
            await halRegistry.control(
              parsed.device_id,
              preActionState as 'on' | 'off',
            );
          }

          // Record interruption in audit log
          const { recordInterruption } = await import('../safety/verifier.js');
          await recordInterruption(verifyResult.auditEntry.id, 1, 1);

          halDecisions.complete(decision.id, 'failure');
          return {
            decision: parsed.decision,
            reasoning: `MID-ACTION VIOLATION: ${reVerifyResult.reason}. Action reverted.`,
            toolCalls: [],
          };
        }

        // Record execution in audit log
        await recordExecution(
          verifyResult.auditEntry.id,
          parsed.decision === 'turn_on' ? 'on' : 'off',
        );

        halRelays.log({
          device_id: parsed.device_id,
          state: parsed.decision === 'turn_on' ? 'on' : 'off',
          reason: 'agent_decision',
          triggered_by: triggeredBy,
        });

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
