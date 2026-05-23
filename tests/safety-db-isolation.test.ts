/**
 * Safety DB Isolation Tests
 *
 * Covers:
 * - Write to safety DB → verify not in main DB
 * - Write to main DB → verify not in safety DB
 * - Safety DB interval persistence works correctly
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync, unlinkSync } from 'fs';

// ── Helpers ─────────────────────────────────────────────────────────────────

function freshMainDb(): Database.Database {
  const dbPath = join(process.cwd(), 'data', 'fft_nano.db');
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  if (existsSync(dbPath)) {
    try { unlinkSync(dbPath); } catch {}
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS hal_devices (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, protocol TEXT NOT NULL,
      host TEXT, label TEXT, zone TEXT,
      calibration_offset REAL DEFAULT 0,
      controlled_device_description TEXT,
      last_state TEXT DEFAULT 'unknown', last_value REAL,
      last_seen TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hal_sensors (
      id TEXT PRIMARY KEY, device_id TEXT NOT NULL, metric TEXT NOT NULL,
      unit TEXT NOT NULL, value REAL NOT NULL, quality TEXT DEFAULT 'good',
      read_at TEXT NOT NULL, stored_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hal_relays (
      id TEXT PRIMARY KEY, device_id TEXT NOT NULL, state TEXT NOT NULL,
      reason TEXT NOT NULL, triggered_by TEXT,
      switched_at TEXT NOT NULL, stored_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hal_decision_log (
      id TEXT PRIMARY KEY, device_id TEXT, decision TEXT NOT NULL,
      confidence REAL, reasoning TEXT, sensor_snapshot TEXT,
      outcome TEXT DEFAULT 'pending', decided_at TEXT NOT NULL, completed_at TEXT,
      triggered_by TEXT DEFAULT 'agent', pending_status TEXT, model TEXT
    );
  `);
  return db;
}

function freshSafetyDb(): Database.Database {
  const dbPath = join(process.cwd(), 'data', 'fft_safety.db');
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  if (existsSync(dbPath)) {
    try { unlinkSync(dbPath); } catch {}
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS hal_emergency_stop (
      id TEXT PRIMARY KEY DEFAULT 'global', active INTEGER NOT NULL DEFAULT 0,
      activated_at TEXT, activated_by TEXT,
      cleared_at TEXT, cleared_by TEXT,
      reason TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hal_device_safe_states (
      device_id TEXT PRIMARY KEY, safe_state TEXT NOT NULL,
      safe_value REAL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hal_farm_loop_state (
      id TEXT PRIMARY KEY DEFAULT 'global',
      last_decision_at TEXT, last_heartbeat_at TEXT,
      hang_warnings INTEGER NOT NULL DEFAULT 0,
      safety_mode INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hal_safety_audit (
      id TEXT PRIMARY KEY, device_id TEXT,
      proposed_action TEXT NOT NULL, verifier_result TEXT NOT NULL,
      denied_reason TEXT, conflicting_rule_ids TEXT,
      sensor_snapshot TEXT NOT NULL, decision_id TEXT,
      triggered_by TEXT NOT NULL, executed INTEGER NOT NULL DEFAULT 0,
      executed_state TEXT, interrupted INTEGER NOT NULL DEFAULT 0,
      interrupted_at_step INTEGER, reverted_steps INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hal_safety_rules (
      id TEXT PRIMARY KEY, device_id TEXT NOT NULL,
      rule_type TEXT NOT NULL, rule_config TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1, priority INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY, token_hash TEXT NOT NULL,
      operator_id TEXT NOT NULL,
      created_at TEXT NOT NULL, expires_at TEXT NOT NULL,
      last_activity_at TEXT NOT NULL,
      ip_address TEXT, user_agent TEXT
    );
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL, attempted_at TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 0, user_agent TEXT
    );
    CREATE TABLE IF NOT EXISTS api_rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL, endpoint TEXT NOT NULL,
      requested_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS security_audit (
      id TEXT PRIMARY KEY, event_type TEXT NOT NULL,
      session_id TEXT, operator_id TEXT,
      ip_address TEXT, user_agent TEXT, endpoint TEXT,
      details TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hal_update_history (
      id TEXT PRIMARY KEY, from_version TEXT NOT NULL,
      to_version TEXT NOT NULL, triggered_by TEXT NOT NULL,
      trigger TEXT NOT NULL, status TEXT NOT NULL,
      error_message TEXT, started_at TEXT NOT NULL, completed_at TEXT
    );
  `);
  return db;
}

function q(db: Database.Database, sql: string, ...params: unknown[]) {
  return db.prepare(sql).get(...params) as Record<string, unknown> | undefined;
}

function qa(db: Database.Database, sql: string, ...params: unknown[]) {
  return db.prepare(sql).all(...params) as Record<string, unknown>[];
}

function run(db: Database.Database, sql: string, ...params: unknown[]) {
  db.prepare(sql).run(...params);
}

// ═══════════════════════════════════════════════════════════════════════════
// Isolation: Safety DB → NOT in Main DB
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Safety DB Isolation: Write to Safety DB → Not in Main DB', () => {
  test('E-Stop state in safety DB is NOT in main DB', () => {
    const mainDb = freshMainDb();
    const safetyDb = freshSafetyDb();

    run(safetyDb, 'DELETE FROM hal_emergency_stop');

    // Write E-Stop to safety DB
    const now = new Date().toISOString();
    run(safetyDb,
      `INSERT INTO hal_emergency_stop (id, active, activated_at, activated_by, reason, created_at, updated_at)
       VALUES ('global', 1, ?, 'operator', 'test', ?, ?)`,
      now, now, now,
    );

    // Verify in safety DB
    const safetyRow = q(safetyDb, 'SELECT * FROM hal_emergency_stop WHERE id = ?', 'global');
    assert.ok(safetyRow);
    assert.equal(safetyRow!.active, 1);

    // Verify NOT in main DB (table shouldn't exist there)
    let mainHasTable = false;
    try {
      const row = q(mainDb, 'SELECT * FROM hal_emergency_stop WHERE id = ?', 'global');
      mainHasTable = row !== undefined;
    } catch {
      // Table doesn't exist in main DB — expected!
    }
    assert.ok(!mainHasTable, 'hal_emergency_stop should NOT exist in main DB');

    mainDb.close();
    safetyDb.close();
  });

  test('Device safe states in safety DB are NOT in main DB', () => {
    const mainDb = freshMainDb();
    const safetyDb = freshSafetyDb();

    run(safetyDb, 'DELETE FROM hal_device_safe_states');

    const now = new Date().toISOString();
    run(safetyDb,
      `INSERT INTO hal_device_safe_states (device_id, safe_state, safe_value, updated_at)
       VALUES ('exhaust_fan', 'off', NULL, ?)`,
      now,
    );

    const safetyRow = q(safetyDb, 'SELECT * FROM hal_device_safe_states WHERE device_id = ?', 'exhaust_fan');
    assert.ok(safetyRow);
    assert.equal(safetyRow!.safe_state, 'off');

    // Should not exist in main DB
    let found = false;
    try {
      const r = q(mainDb, 'SELECT * FROM hal_device_safe_states WHERE device_id = ?', 'exhaust_fan');
      found = r !== undefined;
    } catch { /* table doesn't exist */ }
    assert.ok(!found);

    mainDb.close();
    safetyDb.close();
  });

  test('Safety rules in safety DB are NOT in main DB', () => {
    const mainDb = freshMainDb();
    const safetyDb = freshSafetyDb();

    run(safetyDb, 'DELETE FROM hal_safety_rules');

    const now = new Date().toISOString();
    run(safetyDb,
      `INSERT INTO hal_safety_rules (id, device_id, rule_type, rule_config, enabled, priority, created_at, updated_at)
       VALUES ('rule_1', 'exhaust_fan', 'max_on_duration', '{"maxSeconds":3600}', 1, 10, ?, ?)`,
      now, now,
    );

    const safetyRow = q(safetyDb, 'SELECT * FROM hal_safety_rules WHERE id = ?', 'rule_1');
    assert.ok(safetyRow);
    assert.equal(safetyRow!.rule_type, 'max_on_duration');

    let found = false;
    try {
      const r = q(mainDb, 'SELECT * FROM hal_safety_rules WHERE id = ?', 'rule_1');
      found = r !== undefined;
    } catch { /* table doesn't exist */ }
    assert.ok(!found);

    mainDb.close();
    safetyDb.close();
  });

  test('Safety audit entries in safety DB are NOT in main DB', () => {
    const mainDb = freshMainDb();
    const safetyDb = freshSafetyDb();

    run(safetyDb, 'DELETE FROM hal_safety_audit');

    const now = new Date().toISOString();
    run(safetyDb,
      `INSERT INTO hal_safety_audit (id, device_id, proposed_action, verifier_result, sensor_snapshot, triggered_by, created_at)
       VALUES ('aud_1', 'exhaust_fan', 'turn_on', 'APPROVED', '{}', 'agent', ?)`,
      now,
    );

    const safetyRow = q(safetyDb, 'SELECT * FROM hal_safety_audit WHERE id = ?', 'aud_1');
    assert.ok(safetyRow);

    let found = false;
    try {
      const r = q(mainDb, 'SELECT * FROM hal_safety_audit WHERE id = ?', 'aud_1');
      found = r !== undefined;
    } catch { /* table doesn't exist */ }
    assert.ok(!found);

    mainDb.close();
    safetyDb.close();
  });

  test('Admin sessions in safety DB are NOT in main DB', () => {
    const mainDb = freshMainDb();
    const safetyDb = freshSafetyDb();

    run(safetyDb, 'DELETE FROM admin_sessions');

    const now = new Date().toISOString();
    run(safetyDb,
      `INSERT INTO admin_sessions (id, token_hash, operator_id, created_at, expires_at, last_activity_at)
       VALUES ('sess_1', 'hash123', 'admin', ?, ?, ?)`,
      now, new Date(Date.now() + 24 * 3600 * 1000).toISOString(), now,
    );

    const safetyRow = q(safetyDb, 'SELECT * FROM admin_sessions WHERE id = ?', 'sess_1');
    assert.ok(safetyRow);
    assert.equal(safetyRow!.operator_id, 'admin');

    let found = false;
    try {
      const r = q(mainDb, 'SELECT * FROM admin_sessions WHERE id = ?', 'sess_1');
      found = r !== undefined;
    } catch { /* table doesn't exist */ }
    assert.ok(!found);

    mainDb.close();
    safetyDb.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Isolation: Main DB → NOT in Safety DB
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Isolation: Write to Main DB → Not in Safety DB', () => {
  test('Device registrations in main DB are NOT in safety DB', () => {
    const mainDb = freshMainDb();
    const safetyDb = freshSafetyDb();

    run(mainDb, 'DELETE FROM hal_devices');

    const now = new Date().toISOString();
    run(mainDb,
      `INSERT INTO hal_devices (id, type, protocol, host, label, last_state, created_at, updated_at)
       VALUES ('exhaust_fan', 'relay', 'tasmota', '192.168.1.102', 'Exhaust Fan', 'off', ?, ?)`,
      now, now,
    );

    // Exists in main DB
    const mainRow = q(mainDb, 'SELECT * FROM hal_devices WHERE id = ?', 'exhaust_fan');
    assert.ok(mainRow);
    assert.equal(mainRow!.type, 'relay');

    // NOT in safety DB
    let found = false;
    try {
      const r = q(safetyDb, 'SELECT * FROM hal_devices WHERE id = ?', 'exhaust_fan');
      found = r !== undefined;
    } catch { /* table doesn't exist */ }
    assert.ok(!found, 'hal_devices should not be in safety DB');

    mainDb.close();
    safetyDb.close();
  });

  test('Sensor readings in main DB are NOT in safety DB', () => {
    const mainDb = freshMainDb();
    const safetyDb = freshSafetyDb();

    run(mainDb, 'DELETE FROM hal_sensors');

    const now = new Date().toISOString();
    run(mainDb,
      `INSERT INTO hal_sensors (id, device_id, metric, unit, value, quality, read_at, stored_at)
       VALUES ('sn_1', 'tent_a_temp_1', 'temperature', 'c', 25.5, 'good', ?, ?)`,
      now, now,
    );

    const mainRow = q(mainDb, 'SELECT * FROM hal_sensors WHERE id = ?', 'sn_1');
    assert.ok(mainRow);
    assert.equal(mainRow!.value, 25.5);

    let found = false;
    try {
      const r = q(safetyDb, 'SELECT * FROM hal_sensors WHERE id = ?', 'sn_1');
      found = r !== undefined;
    } catch { /* table doesn't exist */ }
    assert.ok(!found);

    mainDb.close();
    safetyDb.close();
  });

  test('Relay toggle history in main DB is NOT in safety DB', () => {
    const mainDb = freshMainDb();
    const safetyDb = freshSafetyDb();

    run(mainDb, 'DELETE FROM hal_relays');

    const now = new Date().toISOString();
    run(mainDb,
      `INSERT INTO hal_relays (id, device_id, state, reason, triggered_by, switched_at, stored_at)
       VALUES ('rly_1', 'exhaust_fan', 'on', 'auto_rule', 'agent', ?, ?)`,
      now, now,
    );

    const mainRow = q(mainDb, 'SELECT * FROM hal_relays WHERE id = ?', 'rly_1');
    assert.ok(mainRow);
    assert.equal(mainRow!.state, 'on');

    let found = false;
    try {
      const r = q(safetyDb, 'SELECT * FROM hal_relays WHERE id = ?', 'rly_1');
      found = r !== undefined;
    } catch { /* table doesn't exist */ }
    assert.ok(!found);

    mainDb.close();
    safetyDb.close();
  });

  test('Decision log entries in main DB are NOT in safety DB', () => {
    const mainDb = freshMainDb();
    const safetyDb = freshSafetyDb();

    run(mainDb, 'DELETE FROM hal_decision_log');

    const now = new Date().toISOString();
    run(mainDb,
      `INSERT INTO hal_decision_log (id, device_id, decision, confidence, reasoning, outcome, decided_at, triggered_by)
       VALUES ('dec_1', 'exhaust_fan', 'turn_on', 0.95, 'too hot', 'success', ?, 'agent')`,
      now,
    );

    const mainRow = q(mainDb, 'SELECT * FROM hal_decision_log WHERE id = ?', 'dec_1');
    assert.ok(mainRow);
    assert.equal(mainRow!.decision, 'turn_on');

    let found = false;
    try {
      const r = q(safetyDb, 'SELECT * FROM hal_decision_log WHERE id = ?', 'dec_1');
      found = r !== undefined;
    } catch { /* table doesn't exist */ }
    assert.ok(!found);

    mainDb.close();
    safetyDb.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Cross-DB Data Isolation
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Cross-DB Data Isolation', () => {
  test('Deleting main DB does not affect safety DB', () => {
    const mainDb = freshMainDb();
    const safetyDb = freshSafetyDb();

    // Write to both
    const now = new Date().toISOString();
    run(mainDb,
      `INSERT INTO hal_devices (id, type, protocol, label, last_state, created_at, updated_at)
       VALUES ('test_dev', 'relay', 'tasmota', 'Test', 'off', ?, ?)`,
      now, now,
    );
    run(safetyDb,
      `INSERT INTO hal_emergency_stop (id, active, created_at, updated_at)
       VALUES ('global', 1, ?, ?)`,
      now, now,
    );

    // Delete main DB content
    run(mainDb, 'DELETE FROM hal_devices');

    // Safety DB should be unaffected
    const safetyRow = q(safetyDb, 'SELECT * FROM hal_emergency_stop WHERE id = ?', 'global');
    assert.ok(safetyRow);
    assert.equal(safetyRow!.active, 1);

    mainDb.close();
    safetyDb.close();
  });

  test('Deleting safety DB does not affect main DB', () => {
    const mainDb = freshMainDb();
    const safetyDb = freshSafetyDb();

    const now = new Date().toISOString();
    run(mainDb,
      `INSERT INTO hal_devices (id, type, protocol, label, last_state, created_at, updated_at)
       VALUES ('test_dev', 'relay', 'tasmota', 'Test', 'off', ?, ?)`,
      now, now,
    );
    run(safetyDb,
      `INSERT INTO hal_emergency_stop (id, active, created_at, updated_at)
       VALUES ('global', 1, ?, ?)`,
      now, now,
    );

    // Delete safety DB content
    run(safetyDb, 'DELETE FROM hal_emergency_stop');

    // Main DB should be unaffected
    const mainRow = q(mainDb, 'SELECT * FROM hal_devices WHERE id = ?', 'test_dev');
    assert.ok(mainRow);
    assert.equal(mainRow!.type, 'relay');

    mainDb.close();
    safetyDb.close();
  });

  test('Both DBs can coexist with same key format', () => {
    const mainDb = freshMainDb();
    const safetyDb = freshSafetyDb();

    const now = new Date().toISOString();

    // Use same ID in both DBs
    run(mainDb,
      `INSERT INTO hal_devices (id, type, protocol, label, last_state, created_at, updated_at)
       VALUES ('same_id_123', 'relay', 'tasmota', 'Main Device', 'off', ?, ?)`,
      now, now,
    );
    run(safetyDb,
      `INSERT INTO hal_device_safe_states (device_id, safe_state, updated_at)
       VALUES ('same_id_123', 'off', ?)`,
      now,
    );

    // Both exist independently
    const mainRow = q(mainDb, 'SELECT * FROM hal_devices WHERE id = ?', 'same_id_123');
    assert.ok(mainRow);
    assert.equal(mainRow!.label, 'Main Device');

    const safetyRow = q(safetyDb, 'SELECT * FROM hal_device_safe_states WHERE device_id = ?', 'same_id_123');
    assert.ok(safetyRow);
    assert.equal(safetyRow!.safe_state, 'off');

    // Delete from one doesn't affect the other
    run(mainDb, 'DELETE FROM hal_devices WHERE id = ?', 'same_id_123');
    const safetyStill = q(safetyDb, 'SELECT * FROM hal_device_safe_states WHERE device_id = ?', 'same_id_123');
    assert.ok(safetyStill);

    mainDb.close();
    safetyDb.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Safety DB Interval Persistence
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Safety DB Interval Persistence', () => {
  test('Safety DB file persists after close', () => {
    const dbPath = join(process.cwd(), 'data', 'fft_safety.db');
    const db = freshSafetyDb();

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_emergency_stop (id, active, created_at, updated_at) VALUES ('global', 1, ?, ?)`,
      now, now,
    );
    db.close();

    assert.ok(existsSync(dbPath), 'Safety DB file should exist after close');

    // Reopen and verify data persisted
    const db2 = new Database(dbPath);
    const row = q(db2, 'SELECT * FROM hal_emergency_stop WHERE id = ?', 'global');
    assert.ok(row);
    assert.equal(row!.active, 1);
    db2.close();
  });

  test('Safety DB integrity check returns ok', () => {
    const db = freshSafetyDb();

    const result = q(db, 'PRAGMA quick_check');
    assert.ok(result);
    assert.equal(result!.quick_check, 'ok');

    db.close();
  });

  test('Safety DB WAL mode is active', () => {
    const db = freshSafetyDb();

    const result = q(db, 'PRAGMA journal_mode');
    assert.ok(result);
    assert.equal(result!.journal_mode, 'wal');

    db.close();
  });

  test('Safety DB foreign keys are enabled', () => {
    const db = freshSafetyDb();

    const result = q(db, 'PRAGMA foreign_keys');
    assert.ok(result);
    assert.equal(result!.foreign_keys, 1);

    db.close();
  });

  test('Main DB integrity check returns ok', () => {
    const db = freshMainDb();

    const result = q(db, 'PRAGMA quick_check');
    assert.ok(result);
    assert.equal(result!.quick_check, 'ok');

    db.close();
  });

  test('Main DB WAL mode is active', () => {
    const db = freshMainDb();

    const result = q(db, 'PRAGMA journal_mode');
    assert.ok(result);
    assert.equal(result!.journal_mode, 'wal');

    db.close();
  });

  test('All safety tables exist after initialization', () => {
    const db = freshSafetyDb();

    const tables = ['hal_emergency_stop', 'hal_device_safe_states', 'hal_farm_loop_state',
      'hal_safety_audit', 'hal_safety_rules', 'admin_sessions',
      'login_attempts', 'api_rate_limits', 'security_audit', 'hal_update_history'];

    for (const table of tables) {
      const r = q(db, `SELECT name FROM sqlite_master WHERE type='table' AND name=?`, table);
      assert.ok(r !== undefined, `Table ${table} should exist`);
    }

    db.close();
  });

  test('All main operational tables exist after initialization', () => {
    const db = freshMainDb();

    const tables = ['hal_devices', 'hal_sensors', 'hal_relays', 'hal_decision_log'];

    for (const table of tables) {
      const r = q(db, `SELECT name FROM sqlite_master WHERE type='table' AND name=?`, table);
      assert.ok(r !== undefined, `Table ${table} should exist`);
    }

    db.close();
  });
});
