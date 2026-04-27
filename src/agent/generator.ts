/**
 * FarmPal Generator Agent
 * 
 * Proposes farm control decisions based on sensor data, device states,
 * and user messages. Uses lightweight callLLM with structured output.
 */

import { callLLM } from './llm.js';
import { halRegistry } from '../hal/registry.js';
import { halSensors } from '../hal/sensors.js';
import { halDecisions } from '../hal/decisions.js';
import { halRelays } from '../hal/relays.js';

export interface GeneratorResult {
  decision: 'turn_on' | 'turn_off' | 'adjust' | 'alert' | 'noop';
  reasoning: string;
  confidence: number;
  deviceId: string | null;
  toolCalls: Array<{ tool: string; args: Record<string, unknown> }>;
}

export interface GeneratorContext {
  trigger: 'message' | 'heartbeat' | 'scheduled_task';
  message?: string;
  chatId?: string;
}

function buildSystemPrompt(): string {
  const devices = halRegistry.list();
  const recentDecisions = halDecisions.recent(5);
  
  const sensorSnapshot: Record<string, number> = {};
  for (const dev of devices.filter((d: any) => d.type === 'sensor')) {
    const reading = halSensors.latest(dev.id, 'temperature');
    if (reading) sensorSnapshot[`${dev.label || dev.id}_temp`] = reading.value;
    const humReading = halSensors.latest(dev.id, 'humidity');
    if (humReading) sensorSnapshot[`${dev.label || dev.id}_humidity`] = humReading.value;
    const co2Reading = halSensors.latest(dev.id, 'co2');
    if (co2Reading) sensorSnapshot[`${dev.label || dev.id}_co2`] = co2Reading.value;
  }

  return [
    'You are FarmPal, an autonomous smart farm controller.',
    'You control: smart plugs, sensors, cameras, GPIO devices, relays.',
    '',
    'Available devices:',
    devices.map((d: any) => `  - ${d.label || d.id}: ${d.type} (${d.protocol}) state=${d.last_state}`).join('\n'),
    '',
    'Recent decisions:',
    recentDecisions.length > 0 
      ? recentDecisions.slice(0, 5).map((d: any) => `  - ${d.decision} (${d.outcome})${d.reasoning ? ': ' + d.reasoning : ''}`).join('\n')
      : '  (none)',
    '',
    'Current sensor readings:',
    Object.entries(sensorSnapshot).map(([k, v]) => `  - ${k}: ${v}`).join('\n'),
    '',
    'Respond ONLY with valid JSON in this exact format:',
    '{"reasoning":"string","decision":"turn_on|turn_off|adjust|alert|noop","device_id":"string|null","confidence":0.0-1.0,"tool_calls":[]}',
  ].join('\n');
}

export async function runGenerator(ctx: GeneratorContext): Promise<GeneratorResult> {
  const systemPrompt = buildSystemPrompt();
  
  const userPrompt = ctx.message
    ? `User message: ${ctx.message}\nChat: ${ctx.chatId}\n\nDecide what to do based on current farm state.`
    : `No user message. Run autonomous monitoring. Trigger: ${ctx.trigger}`;

  const llmResult = await callLLM(userPrompt, {
    system: systemPrompt,
    temperature: 0.3,
    maxTokens: 1024,
  });

  // Parse JSON from LLM response
  let parsed = {
    decision: 'noop' as const,
    reasoning: llmResult.text,
    confidence: 0.5,
    device_id: null as string | null,
    tool_calls: [] as Array<{ tool: string; args: Record<string, unknown> }>,
  };

  try {
    const jsonMatch = llmResult.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedJson = JSON.parse(jsonMatch[0]);
      parsed = {
        decision: parsedJson.decision || 'noop',
        reasoning: parsedJson.reasoning || llmResult.text,
        confidence: parsedJson.confidence ?? 0.5,
        device_id: parsedJson.device_id || null,
        tool_calls: parsedJson.tool_calls || [],
      };
    }
  } catch {
    // Keep defaults on parse failure
  }

  // Log the decision
  const decisionLog = halDecisions.log({
    device_id: parsed.device_id || undefined,
    decision: parsed.decision,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    sensor_snapshot: {},
    outcome: 'pending',
  });

  return {
    decision: parsed.decision,
    reasoning: parsed.reasoning,
    confidence: parsed.confidence,
    deviceId: parsed.device_id,
    toolCalls: parsed.tool_calls,
  };
}
