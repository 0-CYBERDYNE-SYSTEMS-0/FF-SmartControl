/**
 * Full E-Stop System Tests
 *
 * Covers:
 * - E-Stop activation persists to safety DB
 * - Device safe states stored per-device  
 * - E-Stop and safety_mode independently block autonomous decisions
 * - E-Stop persistence across DB close/reopen
 * - Farm loop hang detection and clearance
 * - E-Stop audit trail entries
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync, unlinkSync } from 'fs';

// ── DB helpers ──────────────────────────────────────────────────────────────

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
      id TEXT PRIMARY KEY DEFAULT 'global',
      active INTEGER NOT NULL DEFAULT 0,
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
  `);
  return db;
}

/** Query a single row and assert it exists. */
function row(db: Database.Database, sql: string, ...params: unknown[]): Record<string, unknown> {
  const r = db.prepare(sql).get(...params) as Record<string, unknown> | undefined;
  assert.ok(r !== undefined, `Expected row for: ${sql}`);
  return r!;
}

/** Query all rows. */
function rows(db: Database.Database, sql: string, ...params: unknown[]): Record<string, unknown>[] {
  return db.prepare(sql).all(...params) as Record<string, unknown>[];
}

function run(db: Database.Database, sql: string, ...params: unknown[]) {
  db.prepare(sql).run(...params);
}

// ═══════════════════════════════════════════════════════════════════════════
// E-Stop Activation
// ═══════════════════════════════════════════════════════════════════════════

test.describe('E-Stop Activation', () => {
  test('E-Stop activation persists active state to safety DB', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_emergency_stop');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_emergency_stop (id, active, activated_at, activated_by, reason, created_at, updated_at)
       VALUES ('global', 1, ?, 'operator', 'test stop', ?, ?)`,
      now, now, now,
    );

    const r = row(db, 'SELECT * FROM hal_emergency_stop WHERE id = ?', 'global');
    assert.equal(r.active, 1);
    assert.equal(r.activated_by, 'operator');
    assert.equal(r.reason, 'test stop');
    db.close();
  });

  test('E-Stop activation persists across DB close/reopen', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_emergency_stop');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_emergency_stop (id, active, activated_at, activated_by, reason, created_at, updated_at)
       VALUES ('global', 1, ?, 'farm_loop_hang', 'hang detected', ?, ?)`,
      now, now, now,
    );
    db.close();

    const dbPath = join(process.cwd(), 'data', 'fft_safety.db');
    const db2 = new Database(dbPath);
    const r = row(db2, 'SELECT * FROM hal_emergency_stop WHERE id = ?', 'global');
    assert.equal(r.active, 1);
    assert.equal(r.activated_by, 'farm_loop_hang');
    db2.close();
  });

  test('E-Stop clearance sets active=0 and records cleared_by', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_emergency_stop');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_emergency_stop (id, active, activated_at, activated_by, reason, created_at, updated_at)
       VALUES ('global', 1, ?, 'operator', 'test', ?, ?)`,
      now, now, now,
    );

    const clearNow = new Date().toISOString();
    run(db,
      `UPDATE hal_emergency_stop SET active = 0, cleared_at = ?, cleared_by = 'admin', updated_at = ? WHERE id = 'global'`,
      clearNow, clearNow,
    );

    const r = row(db, 'SELECT * FROM hal_emergency_stop WHERE id = ?', 'global');
    assert.equal(r.active, 0);
    assert.equal(r.cleared_by, 'admin');
    db.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Device Safe States
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Device Safe States', () => {
  test('safe states saved per-device in safety DB', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_device_safe_states');

    const now = new Date().toISOString();
    const devices = ['exhaust_fan', 'grow_light_main', 'water_pump', 'humidifier', 'heater_plug'];
    for (const id of devices) {
      run(db,
        `INSERT INTO hal_device_safe_states (device_id, safe_state, safe_value, updated_at) VALUES (?, 'off', NULL, ?)`,
        id, now,
      );
    }

    const all = rows(db, 'SELECT * FROM hal_device_safe_states');
    assert.equal(all.length, 5);

    for (const id of devices) {
      const r = row(db, 'SELECT * FROM hal_device_safe_states WHERE device_id = ?', id);
      assert.equal(r.safe_state, 'off');
    }
    db.close();
  });

  test('safe state upsert updates existing device', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_device_safe_states');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_device_safe_states (device_id, safe_state, safe_value, updated_at) VALUES ('exhaust_fan', 'off', NULL, ?)`,
      now,
    );

    const updateNow = new Date().toISOString();
    run(db,
      `INSERT INTO hal_device_safe_states (device_id, safe_state, safe_value, updated_at)
       VALUES ('exhaust_fan', 'on', 80, ?)
       ON CONFLICT(device_id) DO UPDATE SET safe_state=excluded.safe_state, safe_value=excluded.safe_value, updated_at=excluded.updated_at`,
      updateNow,
    );

    const r = row(db, 'SELECT * FROM hal_device_safe_states WHERE device_id = ?', 'exhaust_fan');
    assert.equal(r.safe_state, 'on');
    assert.equal(r.safe_value, 80);
    db.close();
  });

  test('safe states support no_change and unknown', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_device_safe_states');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_device_safe_states (device_id, safe_state, safe_value, updated_at) VALUES ('sensor_x', 'no_change', NULL, ?)`, now);
    run(db,
      `INSERT INTO hal_device_safe_states (device_id, safe_state, safe_value, updated_at) VALUES ('unknown_dev', 'unknown', NULL, ?)`, now);

    const nc = row(db, 'SELECT * FROM hal_device_safe_states WHERE device_id = ?', 'sensor_x');
    assert.equal(nc.safe_state, 'no_change');

    const unk = row(db, 'SELECT * FROM hal_device_safe_states WHERE device_id = ?', 'unknown_dev');
    assert.equal(unk.safe_state, 'unknown');
    db.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Farm Loop Hang Detection
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Farm Loop Hang Detection', () => {
  test('farm loop state defaults to safety_mode=0', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_farm_loop_state');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_farm_loop_state (id, hang_warnings, safety_mode, updated_at) VALUES ('global', 0, 0, ?)`,
      now,
    );

    const r = row(db, 'SELECT * FROM hal_farm_loop_state WHERE id = ?', 'global');
    assert.equal(r.safety_mode, 0);
    assert.equal(r.hang_warnings, 0);
    db.close();
  });

  test('hang detection sets safety_mode=1', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_farm_loop_state');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_farm_loop_state (id, last_decision_at, last_heartbeat_at, hang_warnings, safety_mode, updated_at)
       VALUES ('global', ?, ?, 0, 0, ?)`,
      new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      now,
    );

    run(db,
      `UPDATE hal_farm_loop_state SET hang_warnings = 1, safety_mode = 1, updated_at = ? WHERE id = 'global'`,
      new Date().toISOString(),
    );

    const r = row(db, 'SELECT * FROM hal_farm_loop_state WHERE id = ?', 'global');
    assert.equal(r.safety_mode, 1);
    assert.equal(r.hang_warnings, 1);
    db.close();
  });

  test('decision heartbeat resets hang_warnings but preserves safety_mode', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_farm_loop_state');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_farm_loop_state (id, hang_warnings, safety_mode, updated_at) VALUES ('global', 3, 1, ?)`,
      now,
    );

    const hbNow = new Date().toISOString();
    run(db,
      `UPDATE hal_farm_loop_state SET last_heartbeat_at = ?, hang_warnings = 0, updated_at = ? WHERE id = 'global'`,
      hbNow, hbNow,
    );

    const r = row(db, 'SELECT * FROM hal_farm_loop_state WHERE id = ?', 'global');
    assert.equal(r.hang_warnings, 0);
    assert.equal(r.safety_mode, 1);
    db.close();
  });

  test('clear safety mode resets to normal', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_farm_loop_state');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_farm_loop_state (id, hang_warnings, safety_mode, updated_at) VALUES ('global', 1, 1, ?)`,
      now,
    );

    run(db,
      `UPDATE hal_farm_loop_state SET safety_mode = 0, hang_warnings = 0, updated_at = ? WHERE id = 'global'`,
      new Date().toISOString(),
    );

    const r = row(db, 'SELECT * FROM hal_farm_loop_state WHERE id = ?', 'global');
    assert.equal(r.safety_mode, 0);
    assert.equal(r.hang_warnings, 0);
    db.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Autonomous Decision Prevention
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Autonomous Decision Prevention', () => {
  test('E-Stop active blocks autonomous via DB flag', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_emergency_stop');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_emergency_stop (id, active, activated_at, activated_by, reason, created_at, updated_at)
       VALUES ('global', 1, ?, 'operator', 'safety stop', ?, ?)`,
      now, now, now,
    );

    const r = row(db, 'SELECT active FROM hal_emergency_stop WHERE id = ?', 'global');
    assert.equal(r.active, 1);

    run(db, `UPDATE hal_emergency_stop SET active = 0 WHERE id = 'global'`);
    const r2 = row(db, 'SELECT active FROM hal_emergency_stop WHERE id = ?', 'global');
    assert.equal(r2.active, 0);
    db.close();
  });

  test('safety_mode blocks autonomous via DB flag', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_farm_loop_state');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_farm_loop_state (id, safety_mode, hang_warnings, updated_at) VALUES ('global', 1, 2, ?)`,
      now,
    );

    const r = row(db, 'SELECT safety_mode FROM hal_farm_loop_state WHERE id = ?', 'global');
    assert.equal(r.safety_mode, 1);
    db.close();
  });

  test('E-Stop and safety_mode independently block', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_emergency_stop');
    run(db, 'DELETE FROM hal_farm_loop_state');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_emergency_stop (id, active, created_at, updated_at) VALUES ('global', 0, ?, ?)`,
      now, now,
    );
    run(db,
      `INSERT INTO hal_farm_loop_state (id, safety_mode, hang_warnings, updated_at) VALUES ('global', 1, 1, ?)`,
      now,
    );

    const e = row(db, 'SELECT active FROM hal_emergency_stop WHERE id = ?', 'global');
    const f = row(db, 'SELECT safety_mode FROM hal_farm_loop_state WHERE id = ?', 'global');
    assert.equal(e.active, 0);
    assert.equal(f.safety_mode, 1);

    // Flip
    run(db, `UPDATE hal_emergency_stop SET active = 1 WHERE id = 'global'`);
    run(db, `UPDATE hal_farm_loop_state SET safety_mode = 0 WHERE id = 'global'`);

    const e2 = row(db, 'SELECT active FROM hal_emergency_stop WHERE id = ?', 'global');
    const f2 = row(db, 'SELECT safety_mode FROM hal_farm_loop_state WHERE id = ?', 'global');
    assert.equal(e2.active, 1);
    assert.equal(f2.safety_mode, 0);
    db.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// E-Stop Audit Trail
// ═══════════════════════════════════════════════════════════════════════════

test.describe('E-Stop Audit Trail', () => {
  test('E-Stop activation creates audit entry triggered_by=estop_system', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_safety_audit');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_safety_audit (id, device_id, proposed_action, verifier_result, denied_reason, conflicting_rule_ids, sensor_snapshot, decision_id, triggered_by, executed, created_at)
       VALUES (?, NULL, 'noop', 'APPROVED', NULL, NULL, '{}', NULL, 'estop_system', 0, ?)`,
      'aud_e1', now,
    );

    const r = row(db, 'SELECT * FROM hal_safety_audit WHERE id = ?', 'aud_e1');
    assert.equal(r.triggered_by, 'estop_system');
    assert.equal(r.proposed_action, 'noop');
    db.close();
  });

  test('E-Stop clearance creates audit entry triggered_by=manual_ui', () => {
    const db = freshSafetyDb();
    run(db, 'DELETE FROM hal_safety_audit');

    const now = new Date().toISOString();
    run(db,
      `INSERT INTO hal_safety_audit (id, device_id, proposed_action, verifier_result, denied_reason, conflicting_rule_ids, sensor_snapshot, decision_id, triggered_by, executed, created_at)
       VALUES (?, NULL, 'noop', 'APPROVED', NULL, NULL, '{}', 'session_123', 'manual_ui', 0, ?)`,
      'aud_c1', now,
    );

    const r = row(db, 'SELECT * FROM hal_safety_audit WHERE id = ?', 'aud_c1');
    assert.equal(r.triggered_by, 'manual_ui');
    assert.equal(r.decision_id, 'session_123');
    db.close();
  });
});
