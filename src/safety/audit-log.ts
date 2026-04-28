/**
 * FarmPal Safety Audit Log
 *
 * Append-only audit log for all safety decisions.
 * No UPDATE or DELETE operations are exposed.
 */

import { getDb } from '../hal/db.js';

export type VerifierResult = 'APPROVED' | 'DENIED' | 'DENIED_WITH_REASON';
export type TriggeredBy = 'agent' | 'manual_ui' | 'schedule';

export interface AuditLogEntry {
  id: string;
  deviceId: string | null;
  proposedAction: 'turn_on' | 'turn_off' | 'adjust' | 'noop';
  verifierResult: VerifierResult;
  deniedReason: string | null;
  conflictingRuleIds: string[] | null;
  sensorSnapshot: Record<string, Record<string, number>>;
  decisionId: string | null;
  triggeredBy: TriggeredBy;
  executed: boolean;
  executedState: 'on' | 'off' | null;
  interrupted: boolean;
  interruptedAtStep: number | null;
  revertedSteps: number | null;
  createdAt: string;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

let auditDb: ReturnType<typeof getDb> | null = null;

function getAuditDb() {
  if (!auditDb) {
    auditDb = getDb();
  }
  return auditDb;
}

export interface CreateAuditEntry {
  deviceId?: string | null;
  proposedAction: 'turn_on' | 'turn_off' | 'adjust' | 'noop';
  verifierResult: VerifierResult;
  deniedReason?: string | null;
  conflictingRuleIds?: string[] | null;
  sensorSnapshot: Record<string, Record<string, number>>;
  decisionId?: string | null;
  triggeredBy: TriggeredBy;
  executed?: boolean;
  executedState?: 'on' | 'off' | null;
  interrupted?: boolean;
  interruptedAtStep?: number | null;
  revertedSteps?: number | null;
}

export function createAuditEntry(entry: CreateAuditEntry): AuditLogEntry {
  const db = getAuditDb();
  const id = genId('aud');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO hal_safety_audit (
      id, device_id, proposed_action, verifier_result, denied_reason,
      conflicting_rule_ids, sensor_snapshot, decision_id, triggered_by,
      executed, executed_state, interrupted, interrupted_at_step, reverted_steps, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entry.deviceId ?? null,
    entry.proposedAction,
    entry.verifierResult,
    entry.deniedReason ?? null,
    entry.conflictingRuleIds ? JSON.stringify(entry.conflictingRuleIds) : null,
    JSON.stringify(entry.sensorSnapshot),
    entry.decisionId ?? null,
    entry.triggeredBy,
    entry.executed ? 1 : 0,
    entry.executedState ?? null,
    entry.interrupted ? 1 : 0,
    entry.interruptedAtStep ?? null,
    entry.revertedSteps ?? null,
    now,
  );

  return {
    id,
    deviceId: entry.deviceId ?? null,
    proposedAction: entry.proposedAction,
    verifierResult: entry.verifierResult,
    deniedReason: entry.deniedReason ?? null,
    conflictingRuleIds: entry.conflictingRuleIds ?? null,
    sensorSnapshot: entry.sensorSnapshot,
    decisionId: entry.decisionId ?? null,
    triggeredBy: entry.triggeredBy,
    executed: entry.executed ?? false,
    executedState: entry.executedState ?? null,
    interrupted: entry.interrupted ?? false,
    interruptedAtStep: entry.interruptedAtStep ?? null,
    revertedSteps: entry.revertedSteps ?? null,
    createdAt: now,
  };
}

export interface UpdateAuditExecution {
  id: string;
  executed: boolean;
  executedState?: 'on' | 'off' | null;
  interrupted?: boolean;
  interruptedAtStep?: number | null;
  revertedSteps?: number | null;
}

export function updateAuditExecution(update: UpdateAuditExecution): void {
  const db = getAuditDb();
  db.prepare(`
    UPDATE hal_safety_audit
    SET executed = ?, executed_state = ?, interrupted = ?, interrupted_at_step = ?, reverted_steps = ?
    WHERE id = ?
  `).run(
    update.executed ? 1 : 0,
    update.executedState ?? null,
    update.interrupted ? 1 : 0,
    update.interruptedAtStep ?? null,
    update.revertedSteps ?? null,
    update.id,
  );
}

export function getAuditEntry(id: string): AuditLogEntry | undefined {
  const db = getAuditDb();
  const row = db.prepare('SELECT * FROM hal_safety_audit WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return parseAuditRow(row);
}

export function getRecentAuditEntries(limit = 100): AuditLogEntry[] {
  const db = getAuditDb();
  const rows = db.prepare(`
    SELECT * FROM hal_safety_audit ORDER BY created_at DESC LIMIT ?
  `).all(limit) as Record<string, unknown>[];
  return rows.map(parseAuditRow);
}

export function getAuditEntriesForDevice(deviceId: string, limit = 50): AuditLogEntry[] {
  const db = getAuditDb();
  const rows = db.prepare(`
    SELECT * FROM hal_safety_audit WHERE device_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(deviceId, limit) as Record<string, unknown>[];
  return rows.map(parseAuditRow);
}

export function getDeniedEntriesSince(since: string, limit = 100): AuditLogEntry[] {
  const db = getAuditDb();
  const rows = db.prepare(`
    SELECT * FROM hal_safety_audit
    WHERE verifier_result IN ('DENIED', 'DENIED_WITH_REASON') AND created_at >= ?
    ORDER BY created_at DESC LIMIT ?
  `).all(since, limit) as Record<string, unknown>[];
  return rows.map(parseAuditRow);
}

function parseAuditRow(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as string,
    deviceId: row.device_id as string | null,
    proposedAction: row.proposed_action as 'turn_on' | 'turn_off' | 'adjust' | 'noop',
    verifierResult: row.verifier_result as VerifierResult,
    deniedReason: row.denied_reason as string | null,
    conflictingRuleIds: row.conflicting_rule_ids ? JSON.parse(row.conflicting_rule_ids as string) : null,
    sensorSnapshot: JSON.parse(row.sensor_snapshot as string),
    decisionId: row.decision_id as string | null,
    triggeredBy: row.triggered_by as TriggeredBy,
    executed: (row.executed as number) === 1,
    executedState: row.executed_state as 'on' | 'off' | null,
    interrupted: (row.interrupted as number) === 1,
    interruptedAtStep: row.interrupted_at_step as number | null,
    revertedSteps: row.reverted_steps as number | null,
    createdAt: row.created_at as string,
  };
}

/**
 * Export audit log as CSV or JSON
 */
export function exportAuditLog(
  format: 'csv' | 'json',
  options: {
    since?: string;
    until?: string;
    deviceId?: string;
    triggeredBy?: TriggeredBy;
    verifierResult?: VerifierResult;
  } = {},
): string {
  const entries = getFilteredAuditEntries(options);

  if (format === 'json') {
    return JSON.stringify(entries, null, 2);
  }

  // CSV format
  const headers = [
    'id', 'device_id', 'proposed_action', 'verifier_result', 'denied_reason',
    'conflicting_rule_ids', 'sensor_snapshot', 'decision_id', 'triggered_by',
    'executed', 'executed_state', 'interrupted', 'created_at',
  ];

  const rows = entries.map((e) => [
    e.id,
    e.deviceId ?? '',
    e.proposedAction,
    e.verifierResult,
    (e.deniedReason ?? '').replace(/"/g, '""'),
    (e.conflictingRuleIds ?? []).join(';'),
    JSON.stringify(e.sensorSnapshot).replace(/"/g, '""'),
    e.decisionId ?? '',
    e.triggeredBy,
    e.executed ? '1' : '0',
    e.executedState ?? '',
    e.interrupted ? '1' : '0',
    e.createdAt,
  ].map((v) => `"${v}"`).join(','));

  return [headers.join(','), ...rows].join('\n');
}

function getFilteredAuditEntries(options: {
  since?: string;
  until?: string;
  deviceId?: string;
  triggeredBy?: TriggeredBy;
  verifierResult?: VerifierResult;
}): AuditLogEntry[] {
  const db = getAuditDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.since) {
    conditions.push('created_at >= ?');
    params.push(options.since);
  }
  if (options.until) {
    conditions.push('created_at <= ?');
    params.push(options.until);
  }
  if (options.deviceId) {
    conditions.push('device_id = ?');
    params.push(options.deviceId);
  }
  if (options.triggeredBy) {
    conditions.push('triggered_by = ?');
    params.push(options.triggeredBy);
  }
  if (options.verifierResult) {
    conditions.push('verifier_result = ?');
    params.push(options.verifierResult);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT * FROM hal_safety_audit ${where} ORDER BY created_at DESC LIMIT 10000
  `).all(...params) as Record<string, unknown>[];

  return rows.map(parseAuditRow);
}
