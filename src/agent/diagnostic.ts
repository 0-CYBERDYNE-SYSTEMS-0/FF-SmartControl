/**
 * FarmPal Diagnostic Agent
 * 
 * Read-only troubleshooting agent for technical support.
 * Analyzes logs, config, and system state to identify issues.
 * 
 * Uses the same callLLM infrastructure as the farm agent.
 * No file editing - reports findings for human review.
 */

import { callLLM } from './llm.js';
import { halRegistry } from '../hal/registry.js';
import { halSensors } from '../hal/sensors.js';
import { halAlerts } from '../hal/alerts.js';
import { halDecisions } from '../hal/decisions.js';
import { logger } from '../logger.js';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config.js';

export interface DiagnosticResult {
  timestamp: string;
  category: 'connectivity' | 'device' | 'sensor' | 'performance' | 'configuration';
  severity: 'info' | 'warning' | 'critical';
  finding: string;
  details: string;
  recommendations: string[];
}

export interface DiagnosticReport {
  generatedAt: string;
  systemState: {
    uptime: string;
    memoryUsage: NodeJS.MemoryUsage;
    deviceCount: number;
    sensorCount: number;
    recentAlerts: number;
    recentDecisions: number;
  };
  findings: DiagnosticResult[];
  summary: string;
}

/**
 * Collect diagnostic data
 */
function collectDiagnosticData(): {
  logs: string[];
  config: Record<string, string>;
  devices: any[];
  recentAlerts: any[];
  recentDecisions: any[];
  errors: string[];
} {
  // Read recent logs
  const logs: string[] = [];
  const logPaths = [
    path.join(DATA_DIR, '..', 'farmpal.log'),
    path.join(DATA_DIR, '..', 'error.log'),
  ];
  
  for (const logPath of logPaths) {
    try {
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf-8');
        const lines = content.split('\n').slice(-100); // Last 100 lines
        logs.push(...lines.filter(l => l.trim()));
      }
    } catch {
      // Log file may not exist
    }
  }

  // Collect relevant config
  const config: Record<string, string> = {};
  const envVars = [
    'HAL_SIM_MODE', 'MQTT_BROKER_URL', 'OLLAMA_BASE_URL', 'LLM_PROVIDER',
    'HAL_AUTO_DECISIONS', 'HAL_AUTO_MODE', 'TELEGRAM_BOT_TOKEN',
    'NODE_ENV', 'PORT'
  ];
  
  for (const key of envVars) {
    const value = process.env[key];
    if (value !== undefined) {
      // Mask sensitive values
      config[key] = key.includes('TOKEN') || key.includes('KEY') || key.includes('SECRET')
        ? '***'
        : value;
    }
  }

  // Device state
  const devices = halRegistry.list();

  // Recent alerts
  const recentAlerts = halAlerts.recentAlerts(20);

  // Recent decisions
  const recentDecisions = halDecisions.recent(20);

  // Extract errors from logs
  const errors = logs.filter(l => 
    l.includes('ERROR') || l.includes('error') || l.includes('Error') ||
    l.includes('FATAL') || l.includes('CRITICAL')
  ).slice(-50);

  return { logs, config, devices, recentAlerts, recentDecisions, errors };
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  
  return parts.join(' ') || '<1m';
}

/**
 * Run diagnostic analysis
 */
export async function runDiagnostic(): Promise<DiagnosticReport> {
  logger.info('Diagnostic: Starting system analysis');

  const data = collectDiagnosticData();
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  // Count device types
  const sensorCount = data.devices.filter((d: any) => d.type === 'sensor').length;
  const actuatorCount = data.devices.filter((d: any) => 
    d.type === 'smart_plug' || d.type === 'relay' || d.type === 'gpio'
  ).length;

  // Build diagnostic prompt
  const systemPrompt = [
    'You are FarmPal, a farm controller diagnostic technician.',
    'Analyze the system data and identify any issues.',
    '',
    'SYSTEM STATE:',
    `  Uptime: ${formatUptime(uptime)}`,
    `  Memory RSS: ${(memUsage.rss / 1024 / 1024).toFixed(1)} MB`,
    `  Memory Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`,
    `  Devices: ${data.devices.length} total (${sensorCount} sensors, ${actuatorCount} actuators)`,
    `  Recent Alerts: ${data.recentAlerts.length}`,
    `  Recent Decisions: ${data.recentDecisions.length}`,
    '',
    'CONFIGURATION:',
    Object.entries(data.config).map(([k, v]) => `  ${k}: ${v}`).join('\n'),
    '',
    'DEVICES:',
    data.devices.length > 0
      ? data.devices.map((d: any) => `  - ${d.label || d.id}: ${d.type} (${d.protocol}) state=${d.last_state || 'unknown'}`).join('\n')
      : '  (no devices registered)',
    '',
    'RECENT ALERTS:',
    data.recentAlerts.length > 0
      ? data.recentAlerts.map((a: any) => `  - [${a.acknowledged ? 'ACK' : 'NEW'}] ${a.message}`).join('\n')
      : '  (none)',
    '',
    'RECENT ERRORS:',
    data.errors.length > 0
      ? data.errors.slice(0, 20).map(e => `  ${e.slice(0, 200)}`).join('\n')
      : '  (none)',
    '',
    'Respond ONLY with valid JSON:',
    '{',
    '  "findings": [',
    '    {',
    '      "category": "connectivity|device|sensor|performance|configuration",',
    '      "severity": "info|warning|critical",',
    '      "finding": "brief description",',
    '      "details": "detailed explanation",',
    '      "recommendations": ["step 1", "step 2"]',
    '    }',
    '  ],',
    '  "summary": "overall assessment"',
    '}',
    '',
    'Return empty findings [] if no issues found.',
  ].join('\n');

  const result = await callLLM('Analyze system data and identify issues.', {
    system: systemPrompt,
    temperature: 0.2,
    maxTokens: 2048,
  });

  let findings: DiagnosticResult[] = [];
  let summary = 'Diagnostic analysis complete.';

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      findings = parsed.findings || [];
      summary = parsed.summary || summary;
    }
  } catch {
    logger.debug('Diagnostic: Failed to parse LLM response');
  }

  // Add basic system checks
  if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
    findings.push({
      timestamp: new Date().toISOString(),
      category: 'performance',
      severity: 'warning',
      finding: 'High memory usage',
      details: `Heap usage at ${(memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(1)}%`,
      recommendations: ['Consider restarting FarmPal', 'Check for memory leaks'],
    });
  }

  if (data.recentAlerts.filter((a: any) => !a.acknowledged).length > 5) {
    findings.push({
      timestamp: new Date().toISOString(),
      category: 'device',
      severity: 'warning',
      finding: 'Multiple unacknowledged alerts',
      details: `${data.recentAlerts.filter((a: any) => !a.acknowledged).length} alerts need attention`,
      recommendations: ['Review and acknowledge alerts', 'Check device configurations'],
    });
  }

  const report: DiagnosticReport = {
    generatedAt: new Date().toISOString(),
    systemState: {
      uptime: formatUptime(uptime),
      memoryUsage: memUsage,
      deviceCount: data.devices.length,
      sensorCount,
      recentAlerts: data.recentAlerts.length,
      recentDecisions: data.recentDecisions.length,
    },
    findings,
    summary,
  };

  logger.info({ findings: findings.length }, 'Diagnostic: Analysis complete');

  return report;
}

/**
 * Format diagnostic report for display
 */
export function formatDiagnosticReport(report: DiagnosticReport): string {
  const lines: string[] = [
    '🔧 FarmPal Diagnostic Report',
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    '',
    '📊 System Status:',
    `  Uptime: ${report.systemState.uptime}`,
    `  Memory: ${(report.systemState.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB / ${(report.systemState.memoryUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`,
    `  Devices: ${report.systemState.deviceCount} (${report.systemState.sensorCount} sensors)`,
    `  Recent alerts: ${report.systemState.recentAlerts}`,
    '',
  ];

  if (report.findings.length > 0) {
    lines.push('🔍 Findings:');
    for (const f of report.findings) {
      const icon = f.severity === 'critical' ? '🔴' : f.severity === 'warning' ? '🟡' : '🔵';
      lines.push(`  ${icon} [${f.category.toUpperCase()}] ${f.finding}`);
      lines.push(`     ${f.details}`);
      if (f.recommendations.length > 0) {
        lines.push(`     Recommendations: ${f.recommendations.join(', ')}`);
      }
    }
  } else {
    lines.push('✅ No issues detected.');
  }

  lines.push('');
  lines.push('📝 Summary:');
  lines.push(`  ${report.summary}`);

  return lines.join('\n');
}
