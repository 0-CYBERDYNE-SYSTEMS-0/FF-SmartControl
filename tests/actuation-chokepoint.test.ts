/**
 * Unified actuation chokepoint tests (src/safety/verifier.ts executeActuation)
 *
 * (a) E-stop active → manual actuation denied with an estop reason + DENIED audit row
 * (b) Manual actuation with a blocking policy rule → still executes (violations are
 *     advisory), violations returned, honest audit row with triggered_by 'manual_ui'
 * (c) Autonomous actuation with a blocking policy rule → denied, no hardware change
 *
 * Uses the temp-DB pattern: chdir into a fresh tmpdir before importing any module
 * that binds the SQLite database, and runMigrations() to build the schema.
 */

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const oldEnv = { ...process.env };
const tmpRoot = mkdtempSync(path.join(tmpdir(), 'farmpal-actuation-'));

// Isolation via FFT_NANO_DB_PATH (no chdir): chdir + dynamic imports under
// tsx can race the pino transport worker's package resolution at teardown.
// Set before any dynamic import so the logger binds the silent level first.
process.env.LOG_LEVEL = 'silent';
// Simulated hardware: halRegistry.control() records state instead of
// attempting a real HTTP/GPIO call.
process.env.HAL_SIM_MODE = '1';
process.env.FFT_NANO_DB_PATH = path.join(tmpRoot, 'fft_nano.db');

after(async () => {
  const { _closeDbForTesting } = await import('../src/hal/db.js');
  _closeDbForTesting();
  for (const [key, value] of Object.entries(oldEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(tmpRoot, { recursive: true, force: true });
});

async function setupDb() {
  const { runMigrations, getDb } = await import('../src/hal/db.js');
  runMigrations();
  return getDb();
}

async function registerDevice(deviceId: string) {
  const { halRegistry } = await import('../src/hal/registry.js');
  halRegistry.register({
    id: deviceId,
    type: 'smart_plug',
    protocol: 'tasmota',
    host: '127.0.0.1:1',
    label: `Plug ${deviceId}`,
  });
}

/** Insert an always-blocking rule: turn_on allowed 0 times per hour. */
async function insertBlockingRule(ruleId: string, deviceId: string) {
  const { getDb } = await import('../src/hal/db.js');
  const { clearRuleCache } = await import('../src/safety/policy-engine.js');
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `
      INSERT INTO hal_safety_rules (id, device_id, rule_type, rule_config, enabled, priority, created_at, updated_at)
      VALUES (?, ?, 'max_activations_per_hour', '{"maxPerHour":0}', 1, 1, ?, ?)
    `,
    )
    .run(ruleId, deviceId, now, now);
  clearRuleCache();
}

test('executeActuation denies manual control while E-stop is active', async () => {
  const db = await setupDb();
  await registerDevice('plug_estop');

  // Latch the E-stop directly (cache is cold: no getEstopState call yet).
  const now = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO hal_emergency_stop (id, active, activated_at, activated_by, reason, created_at, updated_at)
    VALUES ('global', 1, ?, 'operator', 'chokepoint test', ?, ?)
    ON CONFLICT(id) DO UPDATE SET active = 1, activated_at = excluded.activated_at,
      activated_by = excluded.activated_by, reason = excluded.reason, updated_at = excluded.updated_at
  `,
  ).run(now, now, now);

  const { executeActuation } = await import('../src/safety/verifier.js');
  const outcome = await executeActuation({
    deviceId: 'plug_estop',
    action: 'on',
    triggeredBy: 'manual_ui',
    source: 'manual',
  });

  assert.equal(outcome.executed, false);
  assert.equal(outcome.result, 'unchanged');
  assert.match(outcome.reason, /emergency stop/i);

  // Denial is auditable
  const { getAuditEntriesForDevice } =
    await import('../src/safety/audit-log.js');
  const entries = getAuditEntriesForDevice('plug_estop');
  const denial = entries.find((e) => e.verifierResult === 'DENIED');
  assert.ok(denial, 'expected a DENIED audit entry for the estop block');
  assert.equal(denial.triggeredBy, 'manual_ui');
  assert.equal(denial.executed, false);
  assert.match(denial.deniedReason ?? '', /emergency stop/i);

  // Device was not actuated
  const { halRegistry } = await import('../src/hal/registry.js');
  assert.equal(halRegistry.get('plug_estop')?.last_state, 'unknown');

  // Clean up for the remaining tests (also invalidates the estop cache).
  const { clearEstop } = await import('../src/safety/estop.js');
  assert.equal(clearEstop('chokepoint-test').success, true);
});

test('executeActuation manual source executes despite a blocking rule and audits honestly', async () => {
  await setupDb();
  await registerDevice('plug_manual');
  await insertBlockingRule('rule_block_manual', 'plug_manual');

  const { executeActuation } = await import('../src/safety/verifier.js');
  const outcome = await executeActuation({
    deviceId: 'plug_manual',
    action: 'on',
    triggeredBy: 'manual_ui',
    source: 'manual',
  });

  // Manual overrides are advisory-checked: violations reported, action executes
  assert.equal(outcome.executed, true);
  assert.equal(outcome.result, 'on');
  assert.ok(outcome.violations, 'expected advisory violations in the result');
  assert.deepEqual(outcome.violations.ruleIds, ['rule_block_manual']);
  assert.match(outcome.violations.reason ?? '', /maximum allowed/i);

  // Device state changed
  const { halRegistry } = await import('../src/hal/registry.js');
  assert.equal(halRegistry.get('plug_manual')?.last_state, 'on');

  // Audit row written with the real triggered_by and honest verifier result
  const { getAuditEntriesForDevice } =
    await import('../src/safety/audit-log.js');
  const entry = getAuditEntriesForDevice('plug_manual')[0];
  assert.ok(entry, 'expected an audit entry for the manual actuation');
  assert.equal(entry.triggeredBy, 'manual_ui');
  assert.equal(entry.executed, true);
  assert.equal(entry.executedState, 'on');
  assert.equal(entry.verifierResult, 'DENIED_WITH_REASON');
  assert.deepEqual(entry.conflictingRuleIds, ['rule_block_manual']);
});

test('executeActuation autonomous source is denied by a blocking rule', async () => {
  await setupDb();
  await registerDevice('plug_auto');
  await insertBlockingRule('rule_block_auto', 'plug_auto');

  const { executeActuation } = await import('../src/safety/verifier.js');
  const outcome = await executeActuation({
    deviceId: 'plug_auto',
    action: 'on',
    triggeredBy: 'agent',
    source: 'autonomous',
  });

  assert.equal(outcome.executed, false);
  assert.equal(outcome.result, 'unchanged');
  assert.match(outcome.reason ?? '', /maximum allowed/i);

  // Device was not actuated
  const { halRegistry } = await import('../src/hal/registry.js');
  assert.equal(halRegistry.get('plug_auto')?.last_state, 'unknown');

  // Denial audited with executed = 0
  const { getAuditEntriesForDevice } =
    await import('../src/safety/audit-log.js');
  const entry = getAuditEntriesForDevice('plug_auto')[0];
  assert.ok(
    entry,
    'expected an audit entry for the denied autonomous actuation',
  );
  assert.equal(entry.triggeredBy, 'agent');
  assert.equal(entry.executed, false);
  assert.equal(entry.verifierResult, 'DENIED_WITH_REASON');
});
