/**
 * Watering control tests (src/hal/watering.ts, D6 launch gate)
 *
 * (a) Flag off (default): startWatering refuses with a launch-gate error,
 *     nothing actuates, no audit row written.
 * (b) Flag on: startWatering actuates through the verifier chokepoint,
 *     the run is tracked, and the audit trail is honest.
 * (c) E-stop latched: watering is blocked by the chokepoint even with the
 *     flag on.
 * (d) Max-run interlock: a run past FARMPAL_WATERING_MAX_MIN is switched
 *     off through the same chokepoint (triggeredBy watchdog) and logged.
 * (e) Stops stay available while the gate is off; non-actuator devices
 *     are refused.
 *
 * Uses the temp-DB pattern from tests/actuation-chokepoint.test.ts:
 * FFT_NANO_DB_PATH is set before any dynamic import binds SQLite, and
 * HAL_SIM_MODE=1 makes halRegistry.control() record state instead of
 * touching real hardware.
 */

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const oldEnv = { ...process.env };
const tmpRoot = mkdtempSync(path.join(tmpdir(), 'farmpal-watering-'));

process.env.LOG_LEVEL = 'silent';
process.env.HAL_SIM_MODE = '1';
process.env.FFT_NANO_DB_PATH = path.join(tmpRoot, 'fft_nano.db');
delete process.env.FARMPAL_WATERING;
delete process.env.FARMPAL_WATERING_MAX_MIN;

after(async () => {
  const { _resetWateringForTesting } = await import('../src/hal/watering.js');
  _resetWateringForTesting();
  const { _closeDbForTesting } = await import('../src/hal/db.js');
  _closeDbForTesting();
  for (const [key, value] of Object.entries(oldEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(tmpRoot, { recursive: true, force: true });
});

async function setupDb() {
  const { runMigrations } = await import('../src/hal/db.js');
  runMigrations();
}

async function registerIrrigationPlug(deviceId: string) {
  const { halRegistry } = await import('../src/hal/registry.js');
  halRegistry.register({
    id: deviceId,
    type: 'smart_plug',
    protocol: 'tasmota',
    host: '127.0.0.1:1',
    label: `Irrigation pump ${deviceId}`,
  });
}

test('flag off: startWatering refuses with a launch-gate error and nothing actuates', async () => {
  await setupDb();
  await registerIrrigationPlug('pump_gate');

  const { isWateringEnabled, startWatering } =
    await import('../src/hal/watering.js');
  assert.equal(isWateringEnabled(), false, 'gate must default to off');

  const outcome = await startWatering({ deviceId: 'pump_gate' });
  assert.equal(outcome.started, false);
  assert.match(outcome.reason, /watering is launch-gated/i);

  // Nothing actuated: device state untouched, no audit row claimed.
  const { halRegistry } = await import('../src/hal/registry.js');
  assert.equal(halRegistry.get('pump_gate')?.last_state, 'unknown');
  const { getAuditEntriesForDevice } =
    await import('../src/safety/audit-log.js');
  assert.equal(
    getAuditEntriesForDevice('pump_gate').length,
    0,
    'gate refusal must not fabricate an audit entry',
  );
});

test('flag on: startWatering actuates through the verifier chokepoint', async () => {
  await setupDb();
  await registerIrrigationPlug('pump_run');
  process.env.FARMPAL_WATERING = '1';

  const { _resetWateringForTesting, startWatering, getActiveWateringRuns } =
    await import('../src/hal/watering.js');
  _resetWateringForTesting();

  const outcome = await startWatering({
    deviceId: 'pump_run',
    source: 'manual',
  });
  assert.equal(outcome.started, true);
  assert.equal(outcome.maxRunMinutes, 30, 'default interlock is 30 minutes');

  const { halRegistry } = await import('../src/hal/registry.js');
  assert.equal(halRegistry.get('pump_run')?.last_state, 'on');

  // Real audit row from the chokepoint, not a synthesized one.
  const { getAuditEntriesForDevice } =
    await import('../src/safety/audit-log.js');
  const entry = getAuditEntriesForDevice('pump_run')[0];
  assert.ok(entry, 'expected a chokepoint audit entry for the start');
  assert.equal(entry.triggeredBy, 'manual_ui');
  assert.equal(entry.executed, true);
  assert.equal(entry.executedState, 'on');

  const runs = getActiveWateringRuns();
  assert.equal(runs.length, 1);
  assert.equal(runs[0].deviceId, 'pump_run');
});

test('e-stop blocks watering even with the flag on', async () => {
  await setupDb();
  await registerIrrigationPlug('pump_estop');
  process.env.FARMPAL_WATERING = '1';

  const { _resetWateringForTesting } = await import('../src/hal/watering.js');
  _resetWateringForTesting();

  // Latch via the public API so the estop cache is invalidated.
  const { activateEstop, clearEstop } = await import('../src/safety/estop.js');
  await activateEstop('operator', 'operator', 'watering e-stop test');

  const { startWatering } = await import('../src/hal/watering.js');
  const outcome = await startWatering({ deviceId: 'pump_estop' });
  assert.equal(outcome.started, false);
  assert.match(outcome.reason, /emergency stop/i);

  const { halRegistry } = await import('../src/hal/registry.js');
  assert.equal(
    halRegistry.get('pump_estop')?.last_state,
    'off',
    'estop safe states, not watering, decide the device state',
  );

  assert.equal(clearEstop('watering-test').success, true);
});

test('max-run interlock turns water off through the same chokepoint and logs it', async () => {
  await setupDb();
  await registerIrrigationPlug('pump_interlock');
  process.env.FARMPAL_WATERING = '1';

  const {
    _resetWateringForTesting,
    _setWateringClockForTesting,
    startWatering,
    checkWateringInterlock,
    getActiveWateringRuns,
  } = await import('../src/hal/watering.js');
  _resetWateringForTesting();

  let fakeNow = 1_000_000;
  _setWateringClockForTesting(() => fakeNow);

  const started = await startWatering({ deviceId: 'pump_interlock' });
  assert.equal(started.started, true);

  // 5 minutes in: inside the default 30-minute limit, no trip.
  fakeNow += 5 * 60_000;
  assert.deepEqual(await checkWateringInterlock(), []);
  const { halRegistry } = await import('../src/hal/registry.js');
  assert.equal(halRegistry.get('pump_interlock')?.last_state, 'on');

  // 31 minutes in: interlock must trip and switch the device off.
  fakeNow += 26 * 60_000;
  const trips = await checkWateringInterlock();
  assert.equal(trips.length, 1);
  assert.equal(trips[0].deviceId, 'pump_interlock');
  assert.equal(trips[0].stopped, true);
  assert.equal(halRegistry.get('pump_interlock')?.last_state, 'off');

  // Run is cleared; a second check is a no-op.
  assert.deepEqual(await checkWateringInterlock(), []);
  assert.deepEqual(getActiveWateringRuns(), []);

  // The shutoff went through the chokepoint: real audit row, watchdog source.
  const { getAuditEntriesForDevice } =
    await import('../src/safety/audit-log.js');
  const offEntry = getAuditEntriesForDevice('pump_interlock').find(
    (e) => e.executedState === 'off',
  );
  assert.ok(offEntry, 'expected an audit entry for the interlock shutoff');
  assert.equal(offEntry.triggeredBy, 'watchdog');
  assert.equal(offEntry.executed, true);

  _resetWateringForTesting();
});

test('stopWatering stays available while the gate is off and honors FARMPAL_WATERING_MAX_MIN', async () => {
  await setupDb();
  await registerIrrigationPlug('pump_stop');
  process.env.FARMPAL_WATERING = '1';
  process.env.FARMPAL_WATERING_MAX_MIN = '45';

  const {
    _resetWateringForTesting,
    _setWateringClockForTesting,
    startWatering,
    stopWatering,
    getWateringMaxRunMinutes,
  } = await import('../src/hal/watering.js');
  _resetWateringForTesting();

  assert.equal(getWateringMaxRunMinutes(), 45, 'env override must win');

  const started = await startWatering({ deviceId: 'pump_stop' });
  assert.equal(started.started, true);

  // Flip the gate back off: stopping must still work.
  delete process.env.FARMPAL_WATERING;
  const stopped = await stopWatering({ deviceId: 'pump_stop' });
  assert.equal(stopped.stopped, true);

  const { halRegistry } = await import('../src/hal/registry.js');
  assert.equal(halRegistry.get('pump_stop')?.last_state, 'off');

  delete process.env.FARMPAL_WATERING_MAX_MIN;
  _resetWateringForTesting();
});

test('watering refuses non-actuator devices', async () => {
  await setupDb();
  process.env.FARMPAL_WATERING = '1';

  const { _resetWateringForTesting, startWatering } =
    await import('../src/hal/watering.js');
  _resetWateringForTesting();

  const { halRegistry } = await import('../src/hal/registry.js');
  halRegistry.register({
    id: 'probe_soil',
    type: 'sensor',
    protocol: 'serial',
    label: 'Soil moisture probe',
  });

  const outcome = await startWatering({ deviceId: 'probe_soil' });
  assert.equal(outcome.started, false);
  assert.match(outcome.reason, /smart plugs and relays only/i);

  _resetWateringForTesting();
});
