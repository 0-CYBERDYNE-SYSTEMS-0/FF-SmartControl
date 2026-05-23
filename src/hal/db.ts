import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { METRIC_SPECS } from './telemetry-model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let _db: Database.Database | null = null;

/**
 * Database corruption error with recovery information.
 * Thrown when PRAGMA integrity_check detects corruption.
 */
export class DatabaseCorruptionError extends Error {
  public readonly dbPath: string;
  public readonly integrityFailures: string[];

  constructor(dbPath: string, integrityFailures: string[]) {
    super(
      `Database corruption detected at ${dbPath}. ` +
        `Integrity check failed with ${integrityFailures.length} error(s). ` +
        `Recovery options: ` +
        `1) Restore from backup: farmpal-backup.timer or manual backup in /opt/farmpal/backups/, ` +
        `2) Factory reset: farmpal-reset (irreversible - removes all data). ` +
        `First error: ${integrityFailures[0] ?? 'unknown'}`,
    );
    this.name = 'DatabaseCorruptionError';
    this.dbPath = dbPath;
    this.integrityFailures = integrityFailures;
  }
}

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = join(process.cwd(), 'data', 'fft_nano.db');
    mkdirSync(dirname(dbPath), { recursive: true });
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

/**
 * Close the database connection and reset the singleton.
 * For testing only - allows creating fresh DB instances between tests.
 */
export function _closeDbForTesting(): void {
  if (_db) {
    try {
      _db.close();
    } catch {
      /* ignore */
    }
    _db = null;
  }
}

/**
 * Check database integrity using SQLite's PRAGMA integrity_check.
 * Returns list of corruption errors (empty = OK).
 * Called automatically during runMigrations() on startup.
 */
export function checkDbIntegrity(): string[] {
  const db = getDb();
  // PRAGMA quick_check is fast on large DBs; catches structural corruption without full traversal
  const result = db.prepare('PRAGMA quick_check').get() as
    | { quick_check: string }
    | undefined;

  if (!result) {
    return ['Integrity check returned no result - database may be unreadable'];
  }

  if (result.quick_check === 'ok') {
    return [];
  }

  const lines = result.quick_check
    .split('\n')
    .filter((line) => line.trim().length > 0);
  return lines.length > 0 ? lines : ['Unknown integrity check failure'];
}

export function runMigrations(): void {
  const db = getDb();
  const dbPath = join(process.cwd(), 'data', 'fft_nano.db');
  const migrationPath = join(__dirname, 'migration.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  db.exec(sql);

  // Migration: add zone column to hal_devices (VAL-DISC-050)
  try {
    db.exec(`ALTER TABLE hal_devices ADD COLUMN zone TEXT`);
  } catch {
    /* column already exists */
  }

  // Migration: add calibration_offset column to hal_devices for per-device calibration
  try {
    db.exec(
      `ALTER TABLE hal_devices ADD COLUMN calibration_offset REAL DEFAULT 0`,
    );
  } catch {
    /* column already exists */
  }

  // Migration: add controlled_device_description column to hal_devices (VAL-DISC-070)
  try {
    db.exec(
      `ALTER TABLE hal_devices ADD COLUMN controlled_device_description TEXT`,
    );
  } catch {
    /* column already exists */
  }

  // Migration: add missing columns to hal_decision_log (VAL-AUTO-030)
  try {
    db.exec(`ALTER TABLE hal_decision_log ADD COLUMN pending_status TEXT`);
  } catch {
    /* column already exists */
  }
  try {
    db.exec(
      `ALTER TABLE hal_decision_log ADD COLUMN triggered_by TEXT DEFAULT 'agent'`,
    );
  } catch {
    /* column already exists */
  }
  try {
    db.exec(`ALTER TABLE hal_decision_log ADD COLUMN model TEXT`);
  } catch {
    /* column already exists */
  }

  repairImpossibleSensorReadings(db);

  // VAL-SVC-028: Check DB integrity after migrations
  // WAL mode is already enabled (pragma journal_mode = WAL above)
  // This ensures rapid restarts don't corrupt the DB (VAL-SVC-034)
  const failures = checkDbIntegrity();
  if (failures.length > 0) {
    throw new DatabaseCorruptionError(dbPath, failures);
  }

  // Note: Safety/security tables (admin_sessions, login_attempts,
  // api_rate_limits, security_audit, hal_emergency_stop, hal_safety_rules,
  // hal_safety_audit, hal_device_safe_states, hal_farm_loop_state,
  // hal_update_history) are now managed in src/hal/safety-db.ts
  // in a separate fft_safety.db database.
}

function repairImpossibleSensorReadings(db: Database.Database): void {
  const repairLow = db.prepare(`
    UPDATE hal_sensors
    SET value = ?, quality = 'error'
    WHERE metric = ? AND value < ?
  `);
  const repairHigh = db.prepare(`
    UPDATE hal_sensors
    SET value = ?, quality = 'error'
    WHERE metric = ? AND value > ?
  `);

  const repairMany = db.transaction(() => {
    for (const spec of Object.values(METRIC_SPECS)) {
      repairLow.run(spec.hardMin, spec.metric, spec.hardMin);
      repairHigh.run(spec.hardMax, spec.metric, spec.hardMax);
    }
  });

  repairMany();
}
