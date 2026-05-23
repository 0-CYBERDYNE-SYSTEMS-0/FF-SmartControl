/**
 * Tests for E-Stop Clearance Admin Authentication
 *
 * VAL-SEC: E-Stop clearance requires validated admin session token.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, randomBytes } from 'crypto';
import { clearEstop, getEstopState } from '../src/safety/estop.js';
import { createSession, initSessionDatabase } from '../src/security/session.js';
import { getSafetyDb, runSafetyMigrations } from '../src/hal/safety-db.js';

test.describe('E-Stop Clearance Authentication', () => {
  test.beforeEach(() => {
    const db = getSafetyDb();

    // Ensure tables exist
    runSafetyMigrations();
    initSessionDatabase();

    // Clean up test data
    db.exec('DELETE FROM hal_emergency_stop');
    db.exec('DELETE FROM admin_sessions');
  });

  test('unauthorized clearance rejected', () => {
    const result = clearEstop('invalid-token');
    assert.strictEqual(result.success, false);
    assert.ok(result.error !== undefined);
  });

  test('admin clearance accepted', async () => {
    // Create a valid admin session
    const { cookie } = await createSession('admin');
    const validToken = cookie.value;

    // Activate E-Stop directly in the safety database
    const db = getSafetyDb();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO hal_emergency_stop (id, active, activated_at, activated_by, reason, created_at, updated_at)
      VALUES ('global', 1, ?, 'operator', 'test activation', ?, ?)
    `,
    ).run(now, now, now);

    // Clear E-Stop with valid admin token
    const result = clearEstop(validToken);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.clearedBy, 'admin');

    // Verify E-Stop state was updated
    const state = getEstopState();
    assert.strictEqual(state.active, false);
    assert.ok(state.clearedAt !== null);
    assert.strictEqual(state.clearedBy, 'admin');
  });

  test('expired token rejected', () => {
    // Insert an already-expired session directly into the safety database
    const db = getSafetyDb();
    const token = randomBytes(32).toString('hex');
    const tokenHash = `sha256:${createHash('sha256').update(token).digest('hex')}`;
    const pastDate = new Date(
      Date.now() - 48 * 60 * 60 * 1000,
    ).toISOString(); // 48 hours ago

    db.prepare(
      `
      INSERT INTO admin_sessions (id, token_hash, operator_id, created_at, expires_at, last_activity_at)
      VALUES (?, ?, 'admin', ?, ?, ?)
    `,
    ).run('expired-session', tokenHash, pastDate, pastDate, pastDate);

    const result = clearEstop(token);
    assert.strictEqual(result.success, false);
    assert.ok(result.error !== undefined);
  });
});