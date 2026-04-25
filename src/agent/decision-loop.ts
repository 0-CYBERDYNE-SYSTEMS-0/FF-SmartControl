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

async function getSensorSnapshot(halSensors: any, halRegistry: any): Promise<Record<string, number>> {
  const snapshot: Record<string, number> = {};
  const devices = halRegistry.list().filter((d: any) => d.type === 'sensor');
  for (const dev of devices) {
    const reading = halSensors.latest(dev.id, 'temperature');
    if (reading) snapshot[`${dev.label || dev.id}_temp`] = reading.value;
  }
  return snapshot;
}

export async function runDecisionCycle(ctx: DecisionCycleContext): Promise<{
  decision: string;
  reasoning: string;
  toolCalls: any[];
}> {
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
    devices.map((d: any) => `  - ${d.label || d.id}: ${d.type} (${d.protocol}) at ${d.host || 'gpio'}, state=${d.last_state}, value=${d.last_value}`).join('\n'),
    '',
    'Recent decisions:',
    recentDecisions.slice(0, 5).map((d: any) => `  - ${d.decision} (${d.outcome})${d.reasoning ? ': ' + d.reasoning : ''}`).join('\n'),
    '',
    'Current sensor readings:',
    Object.entries(sensorSnapshot).map(([k, v]) => `  - ${k}: ${v}`).join('\n'),
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
  let parsed: any = { decision: 'noop', reasoning: llmResult.text, confidence: 0.5, tool_calls: [], device_id: null };
  try {
    const jsonMatch = llmResult.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch {
    parsed.reasoning = llmResult.text;
  }

  const decision = halDecisions.log({
    device_id: parsed.device_id || undefined,
    decision: parsed.decision || 'noop',
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    sensor_snapshot: sensorSnapshot,
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

  // Direct device control
  if (parsed.decision === 'turn_on' || parsed.decision === 'turn_off') {
    if (parsed.device_id) {
      try {
        await halRegistry.control(parsed.device_id, parsed.decision === 'turn_on' ? 'on' : 'off');
        halRelays.log({
          device_id: parsed.device_id,
          state: parsed.decision === 'turn_on' ? 'on' : 'off',
          reason: 'agent_decision',
          triggered_by: 'agent',
        });
        halDecisions.complete(decision.id, 'success');
      } catch {
        halDecisions.complete(decision.id, 'failure');
      }
    }
  } else {
    halDecisions.complete(decision.id, parsed.tool_calls?.length > 0 ? 'success' : 'pending');
  }

  return {
    decision: parsed.decision,
    reasoning: parsed.reasoning,
    toolCalls: parsed.tool_calls || [],
  };
}
