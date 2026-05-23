/**
 * FarmPal Safety Database — Isolated SQLite store for safety-critical data.
 *
 * Separated from fft_nano.db (HAL operational data) and messages.db (chat messages)
 * so that:
 *   - Safety tables survive operational DB resets
 *   - Corruption in one DB doesn't affect the other
 *   - Security audit trail is independently auditable
 *   - E-Stop state persists through HAL DB failures
 *
 * Tables managed here:
 *   hal_safety_rules       — per-device safety policies
 *   hal_safety_audit       — append-only audit log of all safety decisions
 *   hal_emergency_stop     — persistent E-Stop state
 *   hal_device_safe_states — per-device safe states for E-Stop
 *   hal_farm_loop_state    — farm loop hang detection
 *   admin_sessions         — admin auth sessions
 *   login_attempts         — rate limiting for auth
 *   api_rate_limits        — API rate limiting
 *   security_audit         — security event audit log
 *   hal_update_history     — update system history
 */

import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

let _safetyDb: Database.Database | null = null;

const SAFETY_DB_FILENAME = 'fft_safety.db';

/**
 * Get (or create) the safety database singleton.
 * Database lives at data/fft_safety.db alongside fft_nano.db.
 */
export function getSafetyDb(): Database.Database {
  if (!_safetyDb) {
    const dbPath = join(process.cwd(), 'data', SAFETY_DB_FILENAME);
    mkdirSync(dirname(dbPath), { recursive: true });
    _safetyDb = new Database(dbPath);
    _safetyDb.pragma('journal_mode = WAL');
    _safetyDb.pragma('foreign_keys = ON');
  }
  return _safetyDb;
}

/**
 * Check safety database integrity.
 * Returns list of corruption errors (empty = OK).
 */
export function checkSafetyDbIntegrity(): string[] {
  const db = getSafetyDb();
  const result = db.prepare('PRAGMA quick_check').get() as
    | { quick_check: string }
    | undefined;

  if (!result) {
    return ['Safety DB integrity check returned no result — database may be unreadable'];
  }

  if (result.quick_check === 'ok') {
    return [];
  }

  const lines = result.quick_check
    .split('\n')
    .filter((line) => line.trim().length > 0);
  return lines.length > 0 ? lines : ['Unknown safety DB integrity check failure'];
}

/**
 * Close the safety database connection and reset the singleton.
 * For testing only.
 */
export function _closeSafetyDbForTesting(): void {
  if (_safetyDb) {
    try {
      _safetyDb.close();
    } catch {
      /* ignore */
    }
    _safetyDb = null;
  }
}

/**
 * Run safety database migrations and integrity check.
 * Called during startup after HAL DB initialization.
 */
export function runSafetyMigrations(): void {
  const db = getSafetyDb();
  const dbPath = join(process.cwd(), 'data', SAFETY_DB_FILENAME);

  // ── Safety rules ────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS hal_safety_rules (
      id                TEXT PRIMARY KEY,
      device_id         TEXT NOT NULL,
      rule_type         TEXT NOT NULL,
      rule_config       TEXT NOT NULL,
      enabled           INTEGER NOT NULL DEFAULT 1,
      priority          INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL
    );
  `);

  // ── Safety audit log ────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS hal_safety_audit (
      id                  TEXT PRIMARY KEY,
      device_id           TEXT,
      proposed_action     TEXT NOT NULL,
      verifier_result     TEXT NOT NULL,
      denied_reason       TEXT,
      conflicting_rule_ids TEXT,
      sensor_snapshot     TEXT NOT NULL,
      decision_id         TEXT,
      triggered_by        TEXT NOT NULL,
      executed            INTEGER NOT NULL DEFAULT 0,
      executed_state      TEXT,
      interrupted         INTEGER NOT NULL DEFAULT 0,
      interrupted_at_step INTEGER,
      reverted_steps      INTEGER,
      created_at          TEXT NOT NULL
    );
  `);

  // ── Emergency stop ──────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS hal_emergency_stop (
      id                TEXT PRIMARY KEY DEFAULT 'global',
      active            INTEGER NOT NULL DEFAULT 0,
      activated_at      TEXT,
      activated_by      TEXT,
      cleared_at        TEXT,
      cleared_by        TEXT,
      reason            TEXT,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL
    );
  `);

  // ── Device safe states ──────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS hal_device_safe_states (
      device_id         TEXT PRIMARY KEY,
      safe_state        TEXT NOT NULL,
      safe_value        REAL,
      updated_at        TEXT NOT NULL
    );
  `);

  // ── Farm loop state ─────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS hal_farm_loop_state (
      id                TEXT PRIMARY KEY DEFAULT 'global',
      last_decision_at  TEXT,
      last_heartbeat_at TEXT,
      hang_warnings     INTEGER NOT NULL DEFAULT 0,
      safety_mode       INTEGER NOT NULL DEFAULT 0,
      updated_at        TEXT NOT NULL
    );
  `);

  // ── Admin sessions ──────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL,
      operator_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_activity_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON admin_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at);
  `);

  // ── Login attempts (rate limiting) ──────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL,
      attempted_at TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 0,
      user_agent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, attempted_at);
  `);

  // ── API rate limits ─────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      requested_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_api_rate_limits_session
      ON api_rate_limits(session_id, requested_at);
  `);

  // ── Security audit log ──────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_audit (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      session_id TEXT,
      operator_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      endpoint TEXT,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_security_audit_session
      ON security_audit(session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_security_audit_ip
      ON security_audit(ip_address, created_at);
    CREATE INDEX IF NOT EXISTS idx_security_audit_type
      ON security_audit(event_type, created_at);
  `);

  // ── Update history ──────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS hal_update_history (
      id TEXT PRIMARY KEY,
      from_version TEXT NOT NULL,
      to_version TEXT NOT NULL,
      triggered_by TEXT NOT NULL,
      trigger TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );
  `);

  // ── Migrate existing data from fft_nano.db (one-time) ───────────────────
  try {
    migrateFromOperationalDb();
  } catch (err) {
    // If the operational DB doesn't have these tables yet, or migration
    // already ran, that's fine — the safety DB is the source of truth now.
    console.warn(
      '[safety-db] Migration from fft_nano.db skipped or already complete:',
      (err as Error).message,
    );
  }

  // ── Integrity check ─────────────────────────────────────────────────────
  const failures = checkSafetyDbIntegrity();
  if (failures.length > 0) {
    throw new Error(
      `Safety database corruption detected at ${dbPath}. ` +
        `Integrity check failed with ${failures.length} error(s). ` +
        `First error: ${failures[0] ?? 'unknown'}. ` +
        `Recovery: restore from backup or factory reset.`,
    );
  }
}

/**
 * One-time migration: copy safety/security tables from fft_nano.db
 * to the new fft_safety.db, then drop them from the operational DB.
 */
function migrateFromOperationalDb(): void {
  const safetyDb = getSafetyDb();

  // Check if migration already ran
  const migrated = safetyDb
    .prepare(
      `SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='_safety_migration_done'`,
    )
    .get() as { present: number } | undefined;

  if (migrated) return;

  const operationalPath = join(process.cwd(), 'data', 'fft_nano.db');
  if (!existsSync(operationalPath)) return;

  const tablesToMigrate = [
    'hal_safety_rules',
    'hal_safety_audit',
    'hal_emergency_stop',
    'hal_device_safe_states',
    'hal_farm_loop_state',
    'admin_sessions',
    'login_attempts',
    'api_rate_limits',
    'security_audit',
    'hal_update_history',
  ];

  // Attach operational DB and copy data table by table
  safetyDb.exec(`ATTACH DATABASE '${operationalPath}' AS operational`);

  const migrateOne = safetyDb.transaction(() => {
    for (const table of tablesToMigrate) {
      // Check if the source table exists in the operational DB
      const exists = safetyDb
        .prepare(
          `SELECT 1 FROM operational.sqlite_master WHERE type='table' AND name=?`,
        )
        .get(table);

      if (!exists) continue;

      // Only copy if the safety table is empty (idempotent)
      const safetyCount = (
        safetyDb.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as {
          c: number;
        }
      ).c;
      if (safetyCount > 0) continue;

      try {
        safetyDb.exec(`
          INSERT INTO ${table}
          SELECT * FROM operational.${table}
        `);
      } catch {
        // Column mismatch? Skip this table silently.
        continue;
      }
    }
  });

  migrateOne();

  // Drop migrated tables from the operational DB
  safetyDb.transaction(() => {
    for (const table of tablesToMigrate) {
      try {
        safetyDb.exec(`DROP TABLE IF EXISTS operational.${table}`);
      } catch {
        /* skip */
      }
    }
  })();

  safetyDb.exec('DETACH DATABASE operational');

  // Mark migration as done
  safetyDb.exec(`
    CREATE TABLE IF NOT EXISTS _safety_migration_done (
      migrated_at TEXT NOT NULL
    );
    INSERT INTO _safety_migration_done (migrated_at)
    VALUES ('${new Date().toISOString()}');
  `);
}
