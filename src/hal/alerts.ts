import { getDb } from './db.js';
import type { MetricType } from './types.js';

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface HalAlertRule {
  id: string;
  deviceId: string;
  metric: MetricType;
  operator: 'gt' | 'lt' | 'eq';
  threshold: number;
  cooldownMs: number;
  enabled: boolean;
  createdAt: string;
}

export interface HalAlert {
  id: string;
  ruleId: string;
  deviceId: string;
  metric: MetricType;
  value: number;
  threshold: number;
  operator: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

export class HalAlertStore {
  private db = getDb();

  addRule(data: Omit<HalAlertRule, 'id' | 'createdAt'>): HalAlertRule {
    const id = genId('alr');
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO hal_alert_rules (id, device_id, metric, operator, threshold, cooldown_ms, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.deviceId, data.metric, data.operator, data.threshold, data.cooldownMs, data.enabled ? 1 : 0, now);
    return this.getRule(id)!;
  }

  getRule(id: string): HalAlertRule | undefined {
    const row = this.db.prepare('SELECT * FROM hal_alert_rules WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return this.mapRule(row);
  }

  listRules(): HalAlertRule[] {
    const rows = this.db.prepare('SELECT * FROM hal_alert_rules WHERE enabled = 1').all() as any[];
    return rows.map((r) => this.mapRule(r));
  }

  deleteRule(id: string): void {
    this.db.prepare('DELETE FROM hal_alert_rules WHERE id = ?').run(id);
  }

  private mapRule(row: any): HalAlertRule {
    return {
      id: row.id,
      deviceId: row.device_id,
      metric: row.metric,
      operator: row.operator,
      threshold: row.threshold,
      cooldownMs: row.cooldown_ms,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
    };
  }

  logAlert(data: Omit<HalAlert, 'id' | 'acknowledged' | 'createdAt'>): HalAlert {
    const id = genId('ala');
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO hal_alerts (id, rule_id, device_id, metric, value, threshold, operator, message, acknowledged, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, data.ruleId, data.deviceId, data.metric, data.value, data.threshold, data.operator, data.message, now);
    return this.getAlert(id)!;
  }

  getAlert(id: string): HalAlert | undefined {
    const row = this.db.prepare('SELECT * FROM hal_alerts WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return this.mapAlert(row);
  }

  recentAlerts(limit = 20): HalAlert[] {
    const rows = this.db.prepare('SELECT * FROM hal_alerts ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
    return rows.map((r) => this.mapAlert(r));
  }

  unacknowledgedAlerts(): HalAlert[] {
    const rows = this.db.prepare('SELECT * FROM hal_alerts WHERE acknowledged = 0 ORDER BY created_at DESC').all() as any[];
    return rows.map((r) => this.mapAlert(r));
  }

  acknowledgeAlert(id: string): void {
    this.db.prepare('UPDATE hal_alerts SET acknowledged = 1 WHERE id = ?').run(id);
  }

  private mapAlert(row: any): HalAlert {
    return {
      id: row.id,
      ruleId: row.rule_id,
      deviceId: row.device_id,
      metric: row.metric,
      value: row.value,
      threshold: row.threshold,
      operator: row.operator,
      message: row.message,
      acknowledged: row.acknowledged === 1,
      createdAt: row.created_at,
    };
  }
}

export const halAlerts = new HalAlertStore();
