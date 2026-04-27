import { halRegistry } from './registry.js';
import { halSensors } from './sensors.js';
import { halAlerts, type HalAlert } from './alerts.js';
import { hostEventBus } from '../app-state.js';
import type { MetricType } from './types.js';

const lastFiredAt = new Map<string, number>();

function ruleKey(deviceId: string, metric: MetricType): string {
  return `${deviceId}:${metric}`;
}

function evaluate(value: number, threshold: number, operator: 'gt' | 'lt' | 'eq'): boolean {
  if (operator === 'gt') return value > threshold;
  if (operator === 'lt') return value < threshold;
  return Math.abs(value - threshold) < 0.001;
}

function buildMessage(
  deviceLabel: string,
  metric: string,
  value: number,
  threshold: number,
  operator: string,
): string {
  const opText = operator === 'gt' ? '>' : operator === 'lt' ? '<' : '=';
  return `🚨 ${deviceLabel} ${metric} ${value} ${opText} ${threshold}`;
}

export async function evaluateHalAlerts(): Promise<HalAlert[]> {
  const rules = halAlerts.listRules();
  const fired: HalAlert[] = [];
  const now = Date.now();

  for (const rule of rules) {
    const reading = halSensors.latest(rule.deviceId, rule.metric);
    if (!reading) continue;

    const key = ruleKey(rule.deviceId, rule.metric);
    const lastFired = lastFiredAt.get(key) ?? 0;
    if (now - lastFired < rule.cooldownMs) continue;

    if (!evaluate(reading.value, rule.threshold, rule.operator)) continue;

    const device = halRegistry.get(rule.deviceId);
    const label = device?.label || rule.deviceId;
    const message = buildMessage(label, rule.metric, reading.value, rule.threshold, rule.operator);

    const alert = halAlerts.logAlert({
      ruleId: rule.id,
      deviceId: rule.deviceId,
      metric: rule.metric,
      value: reading.value,
      threshold: rule.threshold,
      operator: rule.operator,
      message,
    });

    hostEventBus.publish({
      kind: 'hal_alert',
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      source: 'hal_alert_evaluator',
      alertId: alert.id,
      deviceId: alert.deviceId,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      operator: alert.operator,
      message: alert.message,
    });

    lastFiredAt.set(key, now);
    fired.push(alert);
  }

  return fired;
}
