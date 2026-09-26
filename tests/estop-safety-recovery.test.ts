/**
 * FarmPal E-Stop / Farm-Loop Safety Recovery Tests
 *
 * Verifies that clearing the E-Stop also clears the latched farm-loop
 * safety mode, so the controller resumes autonomy after a hang/crash
 * recovery instead of staying stuck on `noop`.
 *
 * The watchdog latches `safety_mode = 1` and fires an E-Stop together on a
 * hang; clearing the E-Stop is the operator's "recovered" signal and must
 * drop both flags.
 */

import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Isolation via FFT_NANO_DB_PATH (no chdir): chdir + dynamic imports under
// tsx can race the pino transport worker's package resolution at teardown
// ("worker thread exited" flakiness). Same pattern as
// tests/actuation-chokepoint.test.ts: set env before any dynamic import so
// the logger binds the silent level first and getDb() binds the temp DB.
const oldEnv = { ...process.env };
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'estop-recovery-'));
process.env.LOG_LEVEL = 'silent';
process.env.FFT_NANO_DB_PATH = path.join(tmpDir, 'fft_nano.db');

after(async () => {
  const { _closeDbForTesting } = await import('../src/hal/db.js');
  _closeDbForTesting();
  for (const [key, value] of Object.entries(oldEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('E-Stop clear also clears farm-loop safety mode', () => {
  it('resumes autonomy after operator clears a hang-triggered E-Stop', async () => {
    const { getDb, runMigrations } = await import('../src/hal/db.js');
    const { clearEstop, getFarmLoopState, isAutonomousAllowed } =
      await import('../src/safety/estop.js');

    runMigrations();
    const db = getDb();
    const now = new Date().toISOString();

    // Simulate a hang: both the E-Stop and the safety latch are set together.
    db.prepare(
      `INSERT INTO hal_emergency_stop (id, active, activated_at, activated_by, reason, created_at, updated_at)
       VALUES ('global', 1, ?, 'farm_loop_hang', 'No decision made for 6 minutes', ?, ?)
       ON CONFLICT(id) DO UPDATE SET active = 1, activated_at = excluded.activated_at,
         activated_by = excluded.activated_by, reason = excluded.reason, updated_at = excluded.updated_at`,
    ).run(now, now, now);

    db.prepare(
      `INSERT INTO hal_farm_loop_state (id, hang_warnings, safety_mode, updated_at)
       VALUES ('global', 1, 1, ?)
       ON CONFLICT(id) DO UPDATE SET hang_warnings = 1, safety_mode = 1, updated_at = excluded.updated_at`,
    ).run(now);

    assert.strictEqual(
      isAutonomousAllowed(),
      false,
      'autonomy should be blocked while E-Stop + safety mode are latched',
    );

    const result = clearEstop('operator-test');
    assert.strictEqual(result.success, true);

    assert.strictEqual(
      getFarmLoopState().safetyMode,
      false,
      'safety mode must clear when the E-Stop is cleared',
    );
    assert.strictEqual(
      isAutonomousAllowed(),
      true,
      'autonomy should resume after recovery',
    );
  });

  it('drops a stale safety latch even when the E-Stop is already inactive', async () => {
    const { getDb } = await import('../src/hal/db.js');
    const { clearEstop, getFarmLoopState } =
      await import('../src/safety/estop.js');

    const db = getDb();
    const now = new Date().toISOString();

    // E-Stop already cleared, but safety_mode left latched.
    db.prepare(
      `UPDATE hal_emergency_stop SET active = 0, cleared_at = ?, cleared_by = 'prior', updated_at = ? WHERE id = 'global'`,
    ).run(now, now);
    db.prepare(
      `UPDATE hal_farm_loop_state SET safety_mode = 1, updated_at = ? WHERE id = 'global'`,
    ).run(now);

    const result = clearEstop('operator-test');
    assert.strictEqual(result.success, true);
    assert.strictEqual(
      getFarmLoopState().safetyMode,
      false,
      'a stale safety latch must clear on E-Stop clear',
    );
  });
});
