import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
  // PRAGMA integrity_check returns one row per error, or a single 'ok' row
  const result = db.prepare('PRAGMA integrity_check').get() as
    | { integrity_check: string }
    | undefined;

  if (!result) {
    return ['Integrity check returned no result - database may be unreadable'];
  }

  if (result.integrity_check === 'ok') {
    return [];
  }

  // integrity_check returns a string with multiple lines, each containing an error
  const lines = result.integrity_check
    .split('\n')
    .filter((l) => l.trim().length > 0);
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

  // VAL-SVC-028: Check DB integrity after migrations
  // WAL mode is already enabled (pragma journal_mode = WAL above)
  // This ensures rapid restarts don't corrupt the DB (VAL-SVC-034)
  const failures = checkDbIntegrity();
  if (failures.length > 0) {
    throw new DatabaseCorruptionError(dbPath, failures);
  }

  // Security: Initialize session database tables (VAL-SEC-001, VAL-SEC-004)
  initSessionDatabase();

  // Security: Initialize rate limit database tables (VAL-SEC-010)
  initRateLimitDatabase();

  // Update System: Initialize update history table (VAL-UPDT-003, VAL-VERS-003)
  initUpdateHistoryTable();
}

// Session database tables for admin authentication
function initSessionDatabase(): void {
  const db = getDb();
  try {
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
  } catch {
    /* tables may already exist */
  }
}

// Rate limit database tables for login attempt tracking (VAL-SEC-010)
function initRateLimitDatabase(): void {
  const db = getDb();
  try {
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
  } catch {
    /* tables may already exist */
  }
}

// Update System: update history table (VAL-UPDT-003, VAL-VERS-003)
function initUpdateHistoryTable(): void {
  const db = getDb();
  try {
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
      )
    `);
  } catch {
    /* table may already exist */
  }
}
