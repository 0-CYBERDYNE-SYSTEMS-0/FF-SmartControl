import { callLLM } from './llm.js';

export type TriggerType = 'message' | 'heartbeat' | 'scheduled_task';

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
          `  - ${d.label || d.id}: ${d.type} (${d.protocol}) at ${d.host || 'gpio'}, state=${d.last_state}, value=${d.last_value}`,
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
    'Respond ONLY with a valid JSON object: {"reasoning":"string","decision":"turn_on|turn_off|adjust|alert|noop","device_id":"string|null","confidence":0.0-1.0,"tool_calls":[]}',
  ].join('\n');

  const userPrompt = ctx.message
    ? `Message: ${ctx.message}\nChat: ${ctx.chatId}\n\nDecide what to do.`
    : `No user message. Run autonomous monitoring. Trigger: ${ctx.trigger}`;

  const llmResult = await callLLM(userPrompt, {
    system: systemPrompt,
    temperature: 0.3,
    maxTokens: 1024,
  });

  // Parse JSON from LLM response
  let parsed: any = {
    decision: 'noop',
    reasoning: llmResult.text,
    confidence: 0.5,
    tool_calls: [],
    device_id: null,
  };
  try {
    const jsonMatch = llmResult.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch {
    parsed.reasoning = llmResult.text;
  }

  // Convert sensor snapshot to flat format for decision log (backward compatible)
  const flatSensorSnapshot: Record<string, number> = {};
  for (const [deviceId, metrics] of Object.entries(sensorSnapshot)) {
    for (const [metric, value] of Object.entries(metrics)) {
      flatSensorSnapshot[`${deviceId}_${metric}`] = value;
    }
  }

  const decision = halDecisions.log({
    device_id: parsed.device_id || undefined,
    decision: parsed.decision || 'noop',
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    sensor_snapshot: flatSensorSnapshot,
    outcome: 'pending',
  });

  // Execute tool calls
  for (const tc of parsed.tool_calls || []) {
    try {
      const { executeToolCall } = await import('./tool-executor.js');
      await executeToolCall(tc, halRegistry);
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
        triggeredBy: 'agent',
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
        await halRegistry.control(
          parsed.device_id,
          parsed.decision === 'turn_on' ? 'on' : 'off',
        );

        // Record execution in audit log
        await recordExecution(
          verifyResult.auditEntry.id,
          parsed.decision === 'turn_on' ? 'on' : 'off',
        );

        halRelays.log({
          device_id: parsed.device_id,
          state: parsed.decision === 'turn_on' ? 'on' : 'off',
          reason: 'agent_decision',
          triggered_by: 'agent',
        });
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
