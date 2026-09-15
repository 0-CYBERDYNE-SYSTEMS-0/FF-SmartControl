/**
 * FarmPal Automation Modes
 *
 * Four automation modes that control how autonomous decisions are handled:
 * - OBSERVE_ONLY: LLM sees data, zero hardware actions
 * - SUGGEST: pending_review status, no execution, persists until operator action
 * - ASSISTED_CONTROL: same interval as AUTONOMOUS, 30s operator veto window, countdown timer in UI
 * - AUTONOMOUS: approved actions execute immediately
 *
 * Mode persists to SQLite, survives restart.
 * Manual "Run Decision Now" trigger available in all modes.
 */

import { getDb } from '../hal/db.js';
import { logger } from '../logger.js';
import type { TriggeredBy } from '../safety/audit-log.js';

export type AutomationMode =
  | 'OBSERVE_ONLY'
  | 'SUGGEST'
  | 'ASSISTED_CONTROL'
  | 'AUTONOMOUS';

export const VALID_MODES: AutomationMode[] = [
  'OBSERVE_ONLY',
  'SUGGEST',
  'ASSISTED_CONTROL',
  'AUTONOMOUS',
];

export const MODE_COLORS: Record<
  AutomationMode,
  { bg: string; text: string; label: string }
> = {
  OBSERVE_ONLY: { bg: '#238636', text: '#F0F6FC', label: 'OBSERVE' },
  SUGGEST: { bg: '#388BFD', text: '#F0F6FC', label: 'SUGGEST' },
  ASSISTED_CONTROL: { bg: '#D29922', text: '#0D1117', label: 'ASSISTED' },
  AUTONOMOUS: { bg: '#F85149', text: '#F0F6FC', label: 'AUTO' },
};

// ============================================================================
// Mode Persistence
// ============================================================================

let modeCache: AutomationMode | null = null;
let modeCacheLoadedAt = 0;
const MODE_CACHE_TTL_MS = 5000;

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Get current automation mode from SQLite
 */
export function getAutomationMode(): AutomationMode {
  const now = Date.now();

  if (modeCache !== null && now - modeCacheLoadedAt < MODE_CACHE_TTL_MS) {
    return modeCache;
  }

  const db = getDb();

  const row = db
    .prepare('SELECT mode FROM hal_automation_mode WHERE id = ?')
    .get('global') as { mode: string } | undefined;

  if (!row) {
    // Safety rule: autonomy must be earned, never default. Factory default is
    // OBSERVE_ONLY; an operator must explicitly promote the mode before any
    // hardware action can execute.
    const nowIso = new Date().toISOString();
    db.prepare(
      `INSERT INTO hal_automation_mode (id, mode, updated_at) VALUES ('global', ?, ?)`,
    ).run('OBSERVE_ONLY', nowIso);
    modeCache = 'OBSERVE_ONLY';
  } else {
    modeCache = row.mode as AutomationMode;
  }

  modeCacheLoadedAt = now;
  return modeCache;
}

/**
 * Set automation mode (persists to SQLite)
 */
export function setAutomationMode(
  mode: AutomationMode,
  operatorId = 'system',
): void {
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Invalid automation mode: ${mode}`);
  }

  const db = getDb();
  const nowIso = new Date().toISOString();

  db.prepare(
    `INSERT INTO hal_automation_mode (id, mode, updated_at) VALUES ('global', ?, ?)
     ON CONFLICT(id) DO UPDATE SET mode = excluded.mode, updated_at = excluded.updated_at`,
  ).run(mode, nowIso);

  modeCache = mode;
  modeCacheLoadedAt = Date.now();

  logger.info({ mode, operatorId }, 'Automation mode changed');
}

/**
 * Invalidate mode cache (forces re-read from DB)
 */
export function invalidateModeCache(): void {
  modeCache = null;
  modeCacheLoadedAt = 0;
}

// ============================================================================
// Mode Checks
// ============================================================================

/**
 * Check if hardware actions are allowed in the current mode
 */
export function isHardwareActionAllowed(): boolean {
  const mode = getAutomationMode();
  return mode === 'AUTONOMOUS' || mode === 'ASSISTED_CONTROL';
}

/**
 * Check if a decision should be executed immediately (vs pending review)
 */
export function isAutoExecute(): boolean {
  const mode = getAutomationMode();
  return mode === 'AUTONOMOUS';
}

/**
 * Check if a decision should wait for operator approval (SUGGEST mode)
 */
export function isSuggestMode(): boolean {
  return getAutomationMode() === 'SUGGEST';
}

/**
 * Check if ASSISTED_CONTROL mode is active (30s veto window)
 */
export function isAssistedMode(): boolean {
  return getAutomationMode() === 'ASSISTED_CONTROL';
}

/**
 * Check if OBSERVE_ONLY mode is active (no hardware actions at all)
 */
export function isObserveOnlyMode(): boolean {
  return getAutomationMode() === 'OBSERVE_ONLY';
}

// ============================================================================
// Pending Decisions (for SUGGEST and ASSISTED_CONTROL modes)
// ============================================================================

export interface PendingDecision {
  id: string;
  decision_id: string;
  mode: 'SUGGEST' | 'ASSISTED_CONTROL';
  veto_deadline: string | null;
  vetoed: boolean;
  vetoed_by: string | null;
  approved: boolean;
  approved_by: string | null;
  executed: boolean;
  created_at: string;
}

const VETO_WINDOW_MS = 30_000; // 30 seconds

/**
 * Create a pending decision entry for SUGGEST or ASSISTED_CONTROL mode
 */
export function createPendingDecision(
  decisionId: string,
  mode: 'SUGGEST' | 'ASSISTED_CONTROL',
): PendingDecision {
  const db = getDb();
  const now = new Date().toISOString();
  const id = genId('pend');

  let vetoDeadline: string | null = null;
  if (mode === 'ASSISTED_CONTROL') {
    vetoDeadline = new Date(Date.now() + VETO_WINDOW_MS).toISOString();
  }

  db.prepare(
    `INSERT INTO hal_automation_pending
     (id, decision_id, mode, veto_deadline, vetoed, approved, executed, created_at)
     VALUES (?, ?, ?, ?, 0, 0, 0, ?)`,
  ).run(id, decisionId, mode, vetoDeadline, now);

  logger.debug({ decisionId, mode, vetoDeadline }, 'Pending decision created');

  return {
    id,
    decision_id: decisionId,
    mode,
    veto_deadline: vetoDeadline,
    vetoed: false,
    vetoed_by: null,
    approved: false,
    approved_by: null,
    executed: false,
    created_at: now,
  };
}

/**
 * Get a pending decision by decision ID
 */
export function getPendingDecision(decisionId: string): PendingDecision | null {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT * FROM hal_automation_pending WHERE decision_id = ? AND executed = 0',
    )
    .get(decisionId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    decision_id: row.decision_id as string,
    mode: row.mode as 'SUGGEST' | 'ASSISTED_CONTROL',
    veto_deadline: row.veto_deadline as string | null,
    vetoed: (row.vetoed as number) === 1,
    vetoed_by: row.vetoed_by as string | null,
    approved: (row.approved as number) === 1,
    approved_by: row.approved_by as string | null,
    executed: (row.executed as number) === 1,
    created_at: row.created_at as string,
  };
}

/**
 * Get all active pending decisions
 */
export function getAllPendingDecisions(): PendingDecision[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM hal_automation_pending
       WHERE executed = 0
       ORDER BY created_at DESC`,
    )
    .all() as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    decision_id: row.decision_id as string,
    mode: row.mode as 'SUGGEST' | 'ASSISTED_CONTROL',
    veto_deadline: row.veto_deadline as string | null,
    vetoed: (row.vetoed as number) === 1,
    vetoed_by: row.vetoed_by as string | null,
    approved: (row.approved as number) === 1,
    approved_by: row.approved_by as string | null,
    executed: (row.executed as number) === 1,
    created_at: row.created_at as string,
  }));
}

/**
 * Get pending decisions with their remaining veto time in seconds
 */
export function getPendingDecisionsWithTimer(): Array<
  PendingDecision & { remainingSeconds: number }
> {
  const pending = getAllPendingDecisions();
  const now = Date.now();

  return pending
    .filter(
      (p) => p.mode === 'ASSISTED_CONTROL' && p.veto_deadline && !p.vetoed,
    )
    .map((p) => {
      const deadline = new Date(p.veto_deadline!).getTime();
      const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
      return { ...p, remainingSeconds: remaining };
    });
}

/**
 * Veto a pending decision (operator rejects)
 */
export function vetoDecision(
  decisionId: string,
  operatorId = 'operator',
): {
  success: boolean;
  error?: string;
} {
  const db = getDb();
  const pending = getPendingDecision(decisionId);

  if (!pending) {
    return { success: false, error: 'Pending decision not found' };
  }

  if (pending.executed) {
    return { success: false, error: 'Decision already executed' };
  }

  db.prepare(
    `UPDATE hal_automation_pending
     SET vetoed = 1, vetoed_by = ?, executed = 1
     WHERE id = ?`,
  ).run(operatorId, pending.id);

  // Update the decision outcome to 'failure'
  db.prepare(
    `UPDATE hal_decision_log
     SET outcome = 'failure', pending_status = 'vetoed'
     WHERE id = ?`,
  ).run(decisionId);

  logger.info({ decisionId, operatorId }, 'Decision vetoed by operator');

  return { success: true };
}

/**
 * Approve a pending decision (operator accepts)
 */
export function approveDecision(
  decisionId: string,
  operatorId = 'operator',
): {
  success: boolean;
  executed: boolean;
  error?: string;
} {
  const db = getDb();
  const pending = getPendingDecision(decisionId);

  if (!pending) {
    return {
      success: false,
      executed: false,
      error: 'Pending decision not found',
    };
  }

  if (pending.executed) {
    return {
      success: false,
      executed: true,
      error: 'Decision already executed',
    };
  }

  // Mark as approved (not yet executed - caller must execute)
  db.prepare(
    `UPDATE hal_automation_pending
     SET approved = 1, approved_by = ?
     WHERE id = ?`,
  ).run(operatorId, pending.id);

  db.prepare(
    `UPDATE hal_decision_log
     SET pending_status = 'approved'
     WHERE id = ?`,
  ).run(decisionId);

  logger.info({ decisionId, operatorId }, 'Decision approved by operator');

  return { success: true, executed: false };
}

/**
 * Mark a pending decision as executed
 */
export function markDecisionExecuted(
  decisionId: string,
  outcome: 'success' | 'failure' = 'success',
): void {
  const db = getDb();

  db.prepare(
    `UPDATE hal_automation_pending
     SET executed = 1
     WHERE decision_id = ?`,
  ).run(decisionId);

  db.prepare(
    `UPDATE hal_decision_log
     SET outcome = ?, pending_status = NULL
     WHERE id = ?`,
  ).run(outcome, decisionId);

  logger.debug({ decisionId, outcome }, 'Pending decision marked as executed');
}

/**
 * Check if a veto window has expired and auto-execute should proceed
 * Returns true if decision should auto-execute (no veto, deadline passed)
 */
export function shouldAutoExecute(decisionId: string): boolean {
  const pending = getPendingDecision(decisionId);

  if (!pending) return false;
  if (pending.mode !== 'ASSISTED_CONTROL') return false;
  if (pending.vetoed) return false;
  if (pending.approved) return true; // explicitly approved
  if (!pending.veto_deadline) return false;

  const deadline = new Date(pending.veto_deadline).getTime();
  return Date.now() >= deadline;
}

/**
 * Skip/override a pending autonomous decision when operator manually controls a device.
 * Called when user toggles a relay manually via UI.
 * Marks the pending autonomous decision as 'overridden' so it won't execute.
 * Returns the list of overridden decision IDs.
 *
 * VAL-AUTO-031: Manual override takes effect immediately and bypasses pending queue
 * VAL-AUTO-033: Manual override wins over conflicting autonomous decision
 */
export function skipPendingDecisionForDevice(
  deviceId: string,
  manualAction: 'on' | 'off',
): string[] {
  const db = getDb();
  const now = new Date().toISOString();

  // Find all pending (non-executed) decisions for this device
  const pendingDecisions = db
    .prepare(
      `SELECT p.id as pend_id, p.decision_id, d.decision, d.pending_status
       FROM hal_automation_pending p
       JOIN hal_decision_log d ON d.id = p.decision_id
       WHERE d.device_id = ? AND p.executed = 0 AND p.vetoed = 0`,
    )
    .all(deviceId) as Array<{
    pend_id: string;
    decision_id: string;
    decision: string;
    pending_status: string | null;
  }>;

  const overriddenIds: string[] = [];

  for (const pend of pendingDecisions) {
    // Skip if already overridden or vetoed
    if (
      pend.pending_status === 'overridden' ||
      pend.pending_status === 'vetoed'
    ) {
      continue;
    }

    // Mark the pending decision as overridden
    db.prepare(
      `UPDATE hal_automation_pending SET executed = 1 WHERE id = ?`,
    ).run(pend.pend_id);

    // Update decision log: mark as overridden
    db.prepare(
      `UPDATE hal_decision_log
       SET pending_status = 'overridden', outcome = 'failure', completed_at = ?
       WHERE id = ?`,
    ).run(now, pend.decision_id);

    overriddenIds.push(pend.decision_id);
    logger.info(
      {
        deviceId,
        manualAction,
        decisionId: pend.decision_id,
        originalDecision: pend.decision,
      },
      'Manual override: pending autonomous decision marked as overridden',
    );
  }

  return overriddenIds;
}

/**
 * Delete expired pending decisions (cleanup)
 */
export function cleanupExpiredPendingDecisions(): number {
  const db = getDb();
  const now = new Date().toISOString();

  // Delete entries where veto deadline has passed AND not vetoed AND not approved AND not executed
  // (These are ASSISTED decisions where the veto window expired without veto)
  const result = db
    .prepare(
      `DELETE FROM hal_automation_pending
     WHERE veto_deadline IS NOT NULL
       AND veto_deadline < ?
       AND vetoed = 0
       AND approved = 0
       AND executed = 0`,
    )
    .run(now);

  return result.changes;
}

// ============================================================================
// Decision Cycle Integration
// ============================================================================

export interface DecisionCycleModeResult {
  mode: AutomationMode;
  decisionId: string;
  executed: boolean;
  pendingDecisionId?: string;
  reason: string;
}

/**
 * Called by the decision loop to determine what to do with a decision
 * based on the current automation mode.
 *
 * Returns what action to take:
 * - OBSERVE_ONLY: returns with executed=false, reason="observe_only"
 * - SUGGEST: creates pending entry, returns with executed=false
 * - ASSISTED: creates pending entry with 30s deadline, returns with executed=false
 * - AUTONOMOUS: returns with executed=true so decision loop proceeds
 */
export function handleDecisionBasedOnMode(
  decisionId: string,
  decision: string,
  deviceId: string | null,
): DecisionCycleModeResult {
  const mode = getAutomationMode();

  switch (mode) {
    case 'OBSERVE_ONLY':
      return {
        mode,
        decisionId,
        executed: false,
        reason: 'observe_only - no hardware actions in OBSERVE_ONLY mode',
      };

    case 'SUGGEST':
      createPendingDecision(decisionId, 'SUGGEST');
      // Update decision status to pending_review
      getDb()
        .prepare(
          `UPDATE hal_decision_log SET pending_status = 'pending_review' WHERE id = ?`,
        )
        .run(decisionId);
      return {
        mode,
        decisionId,
        executed: false,
        pendingDecisionId: decisionId,
        reason: 'suggest - pending operator review',
      };

    case 'ASSISTED_CONTROL':
      createPendingDecision(decisionId, 'ASSISTED_CONTROL');
      getDb()
        .prepare(
          `UPDATE hal_decision_log SET pending_status = 'pending_veto' WHERE id = ?`,
        )
        .run(decisionId);
      return {
        mode,
        decisionId,
        executed: false,
        pendingDecisionId: decisionId,
        reason: 'assisted - pending 30s veto window',
      };

    case 'AUTONOMOUS':
      return {
        mode,
        decisionId,
        executed: true,
        reason: 'autonomous - executing immediately',
      };

    default:
      // Fail closed: unknown/legacy mode strings must never execute hardware.
      return {
        mode,
        decisionId,
        executed: false,
        reason: 'unknown automation mode',
      };
  }
}

/**
 * Execute a pending decision's hardware action.
 * Retrieves decision details from hal_decision_log and executes through the
 * unified actuation chokepoint (executeActuation).
 * Returns true if execution succeeded, false otherwise.
 */
export async function executePendingDecision(
  decisionId: string,
): Promise<boolean> {
  const db = getDb();
  const decisionRow = db
    .prepare('SELECT * FROM hal_decision_log WHERE id = ?')
    .get(decisionId) as Record<string, unknown> | undefined;

  if (!decisionRow) {
    logger.warn({ decisionId }, 'executePendingDecision: decision not found');
    return false;
  }

  const deviceId = decisionRow.device_id as string | null;
  const decision = decisionRow.decision as string;

  // Only execute turn_on/turn_off decisions with a valid device
  if (!deviceId || (decision !== 'turn_on' && decision !== 'turn_off')) {
    logger.debug(
      { decisionId, deviceId, decision },
      'executePendingDecision: skipping non-control decision',
    );
    return false;
  }

  // The pending decision only reaches execution after operator approval
  // (explicit review approval, or an expired 30s veto window), so the
  // chokepoint treats it as manual; triggeredBy preserves the originating
  // actor recorded on the decision row (falling back to 'schedule').
  const VALID_TRIGGERED_BY = new Set<string>([
    'agent',
    'manual_ui',
    'schedule',
    'watchdog',
    // 'estop_system' deliberately excluded: it must never arrive from a DB row —
    // the actuation chokepoint allow-lists it to let the E-stop sweep actuate.
    'web-ui',
    'telegram',
    'gateway',
  ]);
  const rowTriggeredBy =
    typeof decisionRow.triggered_by === 'string'
      ? decisionRow.triggered_by
      : '';
  const triggeredBy = (
    VALID_TRIGGERED_BY.has(rowTriggeredBy) ? rowTriggeredBy : 'schedule'
  ) as TriggeredBy;

  try {
    const { executeActuation } = await import('../safety/verifier.js');
    const action = decision === 'turn_on' ? 'on' : 'off';
    const outcome = await executeActuation({
      deviceId,
      action,
      triggeredBy,
      source: 'manual',
      decisionId,
    });

    if (!outcome.executed) {
      logger.warn(
        { decisionId, deviceId, reason: outcome.reason },
        'executePendingDecision: actuation denied by safety chokepoint',
      );
      db.prepare(
        `UPDATE hal_automation_pending SET executed = 1 WHERE decision_id = ?`,
      ).run(decisionId);
      db.prepare(
        `UPDATE hal_decision_log SET pending_status = NULL, outcome = 'failure' WHERE id = ?`,
      ).run(decisionId);
      return false;
    }

    // Mark as executed in pending table
    db.prepare(
      `UPDATE hal_automation_pending SET executed = 1 WHERE decision_id = ?`,
    ).run(decisionId);

    // Update decision log
    db.prepare(
      `UPDATE hal_decision_log SET pending_status = NULL, outcome = 'success' WHERE id = ?`,
    ).run(decisionId);

    logger.info(
      { decisionId, deviceId, action },
      'executePendingDecision: hardware action executed',
    );
    return true;
  } catch (err) {
    logger.error(
      { decisionId, deviceId, error: err },
      'executePendingDecision: hardware action failed',
    );
    // Mark as failure
    db.prepare(
      `UPDATE hal_automation_pending SET executed = 1 WHERE decision_id = ?`,
    ).run(decisionId);
    db.prepare(
      `UPDATE hal_decision_log SET pending_status = NULL, outcome = 'failure' WHERE id = ?`,
    ).run(decisionId);
    return false;
  }
}

/**
 * Process veto window expirations - called periodically by the heartbeat/decision loop
 * Auto-executes any ASSISTED decisions whose veto window has expired
 */
export async function processExpiredVetoWindows(): Promise<{
  autoExecuted: string[];
  cleanedUp: number;
}> {
  cleanupExpiredPendingDecisions(); // Clean up stale entries

  const pending = getAllPendingDecisions();
  const now = Date.now();
  const autoExecuted: string[] = [];

  for (const p of pending) {
    if (
      p.mode === 'ASSISTED_CONTROL' &&
      !p.vetoed &&
      !p.approved &&
      p.veto_deadline &&
      !p.executed
    ) {
      const deadline = new Date(p.veto_deadline).getTime();
      if (now >= deadline) {
        // Execute the hardware action
        const executed = await executePendingDecision(p.decision_id);
        if (executed) {
          autoExecuted.push(p.decision_id);
          logger.info(
            { decisionId: p.decision_id },
            'ASSISTED decision auto-executed after veto window expired',
          );
        }
      }
    }
  }

  const cleanedUp = cleanupExpiredPendingDecisions();

  return { autoExecuted, cleanedUp };
}
