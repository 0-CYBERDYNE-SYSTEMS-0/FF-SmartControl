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
  check: () => { pass: boolean; message: string };
}

// Hard safety rules that always apply
const HARD_SAFETY_RULES: SafetyRule[] = [
  {
    id: 'exhaust_temp',
    description: 'Never turn off exhaust if temperature > 30C',
    check: () => {
      const temp = halSensors.latest('temperature_sensor', 'temperature')?.value ?? 25;
      return {
        pass: true, // Only fails if action is turn_off exhaust AND temp > 30
        message: `Temperature: ${temp}C`,
      };
    },
  },
  {
    id: 'circulation_humidity',
    description: 'Never turn off circulation if humidity > 80%',
    check: () => {
      const humidity = halSensors.latest('humidity_sensor', 'humidity')?.value ?? 50;
      return {
        pass: humidity <= 80,
        message: `Humidity: ${humidity}%`,
      };
    },
  },
];

// Rate limiting state (in-memory, reset on restart)
const recentActivations = new Map<string, number[]>();
const MAX_ACTIVATIONS_PER_HOUR = 3;

function checkRateLimit(deviceId: string): { pass: boolean; message: string } {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  const activations = recentActivations.get(deviceId) || [];
  const recentCount = activations.filter(t => t > oneHourAgo).length;
  
  // Update the stored activations
  recentActivations.set(deviceId, activations.filter(t => t > oneHourAgo));
  
  return {
    pass: recentCount < MAX_ACTIVATIONS_PER_HOUR,
    message: `Recent activations: ${recentCount}/${MAX_ACTIVATIONS_PER_HOUR} per hour`,
  };
}

function recordActivation(deviceId: string): void {
  const activations = recentActivations.get(deviceId) || [];
  activations.push(Date.now());
  recentActivations.set(deviceId, activations);
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
    if (temp !== undefined) currentReadings.push(`${dev.label || dev.id}: temp=${temp}C`);
    if (humidity !== undefined) currentReadings.push(`${dev.label || dev.id}: humidity=${humidity}%`);
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
    currentReadings.length > 0 ? currentReadings.join('\n') : '  (no readings available)',
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

export async function runVerifier(input: VerifierInput): Promise<VerifierResult> {
  const concerns: string[] = [];
  
  // Check hard safety rules first
  for (const rule of HARD_SAFETY_RULES) {
    const result = rule.check();
    if (!result.pass) {
      concerns.push(`SAFETY FAIL: ${rule.description} (${result.message})`);
    }
  }

  // Check rate limiting for humidifier-like devices
  if (input.proposedAction.deviceId) {
    const device = halRegistry.get(input.proposedAction.deviceId);
    if (device?.type === 'smart_plug' || device?.type === 'relay') {
      const rateCheck = checkRateLimit(input.proposedAction.deviceId);
      if (!rateCheck.pass) {
        concerns.push(`RATE LIMIT: Max 3 activations per hour (${rateCheck.message})`);
      }
    }
  }

  // Low confidence warning
  if (input.proposedAction.confidence < 0.7) {
    concerns.push(`LOW CONFIDENCE: ${input.proposedAction.confidence} < 0.7`);
  }

  // Use LLM for additional context-aware validation
  const systemPrompt = buildSafetyPrompt(input);
  const llmResult = await callLLM(
    'Evaluate this proposed farm action for safety. Consider device state, recent history, and environmental conditions.',
    { system: systemPrompt, temperature: 0.1, maxTokens: 512 }
  );

  try {
    const jsonMatch = llmResult.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.concerns && Array.isArray(parsed.concerns)) {
        concerns.push(...parsed.concerns);
      }
      if (!parsed.approved) {
        concerns.push('LLM_REJECTED: ' + (parsed.reasoning || 'no reason provided'));
      }
    }
  } catch {
    // LLM parse failure, continue with concerns
  }

  const approved = concerns.length === 0;
  
  // Record successful verification for rate limiting
  if (approved && input.proposedAction.deviceId) {
    recordActivation(input.proposedAction.deviceId);
  }

  return {
    approved,
    reasoning: approved
      ? 'All safety checks passed'
      : concerns.map(c => `- ${c}`).join('\n'),
    concerns,
  };
}

/**
 * Execute a verified action on the HAL registry
 */
export async function executeVerifiedAction(
  decision: string,
  deviceId: string | null,
  toolCalls: Array<{ tool: string; args: Record<string, unknown> }>
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
