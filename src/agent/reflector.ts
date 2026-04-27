/**
 * FarmPal Reflector Agent
 * 
 * Weekly self-learning and pattern analysis.
 * Implements Generator + Verifier pattern for validating suggestions.
 * 
 * Generator: Analyzes decision history and proposes improvements
 * Verifier: Validates suggestions before presenting to user
 */

import { callLLM } from './llm.js';
import { halDecisions } from '../hal/decisions.js';
import { halSensors } from '../hal/sensors.js';
import { halAlerts } from '../hal/alerts.js';
import { halRegistry } from '../hal/registry.js';
import { logger } from '../logger.js';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config.js';

export interface ReflectorSuggestion {
  id: string;
  type: 'threshold_adjustment' | 'timing_adjustment' | 'pattern_noted' | 'device_concern';
  category: 'temperature' | 'humidity' | 'co2' | 'timing' | 'device';
  currentValue: string;
  suggestedValue: string;
  reasoning: string;
  confidence: number;
}

export interface ReflectorReport {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  decisionCount: number;
  successRate: number;
  patterns: string[];
  suggestions: ReflectorSuggestion[];
  summary: string;
}

interface SuggestionDraft {
  type: string;
  category: string;
  current: string;
  suggested: string;
  reasoning: string;
  confidence: number;
}

/**
 * Collect decision history data for analysis
 */
function collectDecisionHistory(days = 7): {
  decisions: any[];
  alerts: any[];
  sensorTrends: Record<string, { min: number; max: number; avg: number }>;
} {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const decisions = halDecisions.recent(days * 20);
  const alerts = halAlerts.recentAlerts(days * 10);
  
  // Calculate sensor trends
  const sensorTrends: Record<string, { min: number; max: number; avg: number; count: number }> = {};
  
  // Sample sensor history (simplified - would need full history in production)
  const devices = halRegistry.list().filter((d: any) => d.type === 'sensor');
  for (const dev of devices) {
    const metrics = ['temperature', 'humidity', 'co2'];
    for (const metric of metrics) {
      const reading = halSensors.latest(dev.id, metric as any);
      if (reading) {
        const key = `${dev.label || dev.id}_${metric}`;
        if (!sensorTrends[key]) {
          sensorTrends[key] = { min: reading.value, max: reading.value, avg: reading.value, count: 1 };
        } else {
          sensorTrends[key].min = Math.min(sensorTrends[key].min, reading.value);
          sensorTrends[key].max = Math.max(sensorTrends[key].max, reading.value);
          sensorTrends[key].count++;
          sensorTrends[key].avg = (sensorTrends[key].avg * (sensorTrends[key].count - 1) + reading.value) / sensorTrends[key].count;
        }
      }
    }
  }

  return {
    decisions,
    alerts,
    sensorTrends: Object.fromEntries(
      Object.entries(sensorTrends).map(([k, v]) => [k, { min: v.min, max: v.max, avg: v.avg }])
    ) as Record<string, { min: number; max: number; avg: number }>,
  };
}

/**
 * Generator: Analyze history and propose improvements
 */
async function generateSuggestions(history: ReturnType<typeof collectDecisionHistory>): Promise<SuggestionDraft[]> {
  const successCount = history.decisions.filter((d: any) => d.outcome === 'success').length;
  const totalDecisions = history.decisions.length;
  const successRate = totalDecisions > 0 ? successCount / totalDecisions : 0;

  const systemPrompt = [
    'You are FarmPal, analyzing your own decision history for patterns and improvements.',
    '',
    'DECISION HISTORY (last 7 days):',
    `  Total decisions: ${totalDecisions}`,
    `  Success rate: ${(successRate * 100).toFixed(1)}%`,
    '',
    'Recent decisions:',
    history.decisions.slice(0, 20).map((d: any) => 
      `  - ${d.decision} on ${d.device_id || 'none'} (${d.outcome})`
    ).join('\n'),
    '',
    'ALERTS (last 7 days):',
    history.alerts.length > 0
      ? history.alerts.map((a: any) => `  - ${a.metric} ${a.operator} ${a.threshold}: ${a.value} - ${a.message}`).join('\n')
      : '  (none)',
    '',
    'SENSOR TRENDS:',
    Object.entries(history.sensorTrends).map(([k, v]) => 
      `  - ${k}: min=${v.min.toFixed(1)}, max=${v.max.toFixed(1)}, avg=${v.avg.toFixed(1)}`
    ).join('\n'),
    '',
    'Look for patterns:',
    '  1. Decisions that frequently fail or get overridden',
    '  2. Temperature/humidity thresholds that cause oscillation',
    '  3. Timing issues (e.g., humidifier runs too long)',
    '  4. Devices that repeatedly trigger alerts',
    '  5. Successful patterns to reinforce',
    '',
    'Respond ONLY with valid JSON array:',
    '[{"type":"threshold_adjustment|timing_adjustment|pattern_noted|device_concern","category":"temperature|humidity|co2|timing|device","current":"string","suggested":"string","reasoning":"string","confidence":0.0-1.0}]',
    '',
    'Return empty array [] if no meaningful improvements found.',
  ].join('\n');

  const result = await callLLM('Analyze decision history and identify patterns for improvement.', {
    system: systemPrompt,
    temperature: 0.3,
    maxTokens: 2048,
  });

  try {
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    logger.debug('Reflector: Failed to parse suggestions');
  }

  return [];
}

/**
 * Verifier: Validate suggestions before presenting to user
 */
async function verifySuggestion(suggestion: SuggestionDraft): Promise<{ valid: boolean; concerns: string[] }> {
  const verifyPrompt = [
    'You are a farm safety verifier. Evaluate this proposed adjustment.',
    '',
    'PROPOSED CHANGE:',
    `  Type: ${suggestion.type}`,
    `  Category: ${suggestion.category}`,
    `  Current: ${suggestion.current}`,
    `  Suggested: ${suggestion.suggested}`,
    `  Reasoning: ${suggestion.reasoning}`,
    '',
    'Check for:',
    '  1. Would this change introduce new risks?',
    '  2. Is the change supported by sufficient data?',
    '  3. Is the confidence high enough (>= 0.6)?',
    '  4. Could this harm plants if wrong?',
    '',
    'Respond ONLY with JSON:',
    '{"valid":true|false,"concerns":["string"]}',
  ].join('\n');

  const result = await callLLM('Evaluate this farm adjustment suggestion for safety.', {
    system: verifyPrompt,
    temperature: 0.1,
    maxTokens: 256,
  });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Default to invalid on parse failure
  }

  return { valid: false, concerns: ['Failed to verify suggestion'] };
}

/**
 * Run the full reflector cycle
 */
export async function runReflector(): Promise<ReflectorReport> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  logger.info('Reflector: Starting weekly analysis');

  const history = collectDecisionHistory(7);
  
  const successCount = history.decisions.filter((d: any) => d.outcome === 'success').length;
  const totalDecisions = history.decisions.length;
  
  // Generate suggestions using the Generator
  const drafts = await generateSuggestions(history);
  
  // Verify each suggestion using the Verifier (Generator + Verifier pattern)
  const suggestions: ReflectorSuggestion[] = [];
  
  for (const draft of drafts) {
    const verification = await verifySuggestion(draft);
    
    if (verification.valid) {
      suggestions.push({
        id: `suggestion_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: draft.type as ReflectorSuggestion['type'],
        category: draft.category as ReflectorSuggestion['category'],
        currentValue: draft.current,
        suggestedValue: draft.suggested,
        reasoning: draft.reasoning,
        confidence: draft.confidence,
      });
    } else {
      logger.debug({ suggestion: draft, concerns: verification.concerns }, 'Reflector: Suggestion rejected by verifier');
    }
  }

  // Build summary
  const summaryLines = [
    `Week of ${weekAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`,
    `Decisions: ${totalDecisions} | Success rate: ${totalDecisions > 0 ? (successCount / totalDecisions * 100).toFixed(1) : 0}%`,
    `Alerts: ${history.alerts.length}`,
    `Suggestions: ${suggestions.length}`,
  ];

  if (suggestions.length > 0) {
    summaryLines.push('');
    summaryLines.push('Suggestions:');
    for (const s of suggestions) {
      summaryLines.push(`  [${s.category}] ${s.currentValue} → ${s.suggestedValue} (${(s.confidence * 100).toFixed(0)}% confident)`);
    }
  } else {
    summaryLines.push('');
    summaryLines.push('No actionable suggestions this week.');
  }

  const report: ReflectorReport = {
    generatedAt: now.toISOString(),
    periodStart: weekAgo.toISOString(),
    periodEnd: now.toISOString(),
    decisionCount: totalDecisions,
    successRate: totalDecisions > 0 ? successCount / totalDecisions : 0,
    patterns: [], // Could extract patterns from LLM analysis
    suggestions,
    summary: summaryLines.join('\n'),
  };

  // Save report to disk
  saveReflectorReport(report);

  logger.info({ 
    decisions: totalDecisions, 
    successRate: report.successRate,
    suggestions: suggestions.length 
  }, 'Reflector: Analysis complete');

  return report;
}

/**
 * Save reflector report to disk
 */
function saveReflectorReport(report: ReflectorReport): void {
  const reportsDir = path.join(DATA_DIR, 'reflector');
  fs.mkdirSync(reportsDir, { recursive: true });
  
  const filename = `report_${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(
    path.join(reportsDir, filename),
    JSON.stringify(report, null, 2)
  );
}

/**
 * Get pending suggestions for user approval
 */
export function getPendingSuggestions(): ReflectorSuggestion[] {
  // In production, this would load from a database
  // For now, return empty - suggestions are presented immediately
  return [];
}

/**
 * Apply approved suggestion
 */
export async function applySuggestion(suggestion: ReflectorSuggestion): Promise<{ success: boolean; message: string }> {
  // Save approved suggestion to config
  const prefsPath = path.join(DATA_DIR, 'farm_preferences.json');
  let prefs: Record<string, unknown> = {};
  
  try {
    if (fs.existsSync(prefsPath)) {
      prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    }
  } catch {
    // Start fresh
  }

  const key = `threshold_${suggestion.category}`;
  prefs[key] = {
    value: suggestion.suggestedValue,
    approvedAt: new Date().toISOString(),
    reasoning: suggestion.reasoning,
  };

  try {
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
    return { success: true, message: `Applied: ${suggestion.category} threshold set to ${suggestion.suggestedValue}` };
  } catch (err) {
    return { success: false, message: `Failed to save: ${err}` };
  }
}
