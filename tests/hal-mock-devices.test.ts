import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createMockTransport,
  MockTasmotaTransport,
  MockShellyTransport,
} from '../src/hal/mock-devices.js';
import type {
  DeviceTransport,
  MockDeviceTransport,
  DevicePowerResponse,
} from '../src/hal/mock-devices.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function assertPowerResponse(
  actual: DevicePowerResponse,
  expectedState: 'on' | 'off' | 'unknown',
  expectedWatts?: number,
) {
  assert.equal(actual.state, expectedState);
  if (expectedWatts !== undefined) {
    assert.equal(actual.watts, expectedWatts);
  }
}

// ── MockTasmotaTransport ───────────────────────────────────────────────────

describe('MockTasmotaTransport', () => {
  it('starts in off state', async () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    const r = await m.getPower();
    assertPowerResponse(r, 'off', 0);
  });

  it('starts in on state when initialState is passed', async () => {
    const m = new MockTasmotaTransport('192.168.1.100', 'on');
    const r = await m.getPower();
    assertPowerResponse(r, 'on', 150);
  });

  it('getPower returns state + watts', async () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    m.setState('on');
    const r = await m.getPower();
    assertPowerResponse(r, 'on', 150);
  });

  it('setPower(true) turns device on', async () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    await m.setPower(true);
    const r = await m.getPower();
    assertPowerResponse(r, 'on', 150);
  });

  it('setPower(false) turns device off', async () => {
    const m = new MockTasmotaTransport('192.168.1.100', 'on');
    await m.setPower(false);
    const r = await m.getPower();
    assertPowerResponse(r, 'off', 0);
  });

  it('setState changes state without calling setPower', () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    m.setState('on');
    assert.equal(m.setPowerCallCount(), 0);
  });

  it('tracks getPower call count', async () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    assert.equal(m.getPowerCallCount(), 0);
    await m.getPower();
    assert.equal(m.getPowerCallCount(), 1);
    await m.getPower();
    await m.getPower();
    assert.equal(m.getPowerCallCount(), 3);
  });

  it('tracks setPower call count', async () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    assert.equal(m.setPowerCallCount(), 0);
    await m.setPower(true);
    assert.equal(m.setPowerCallCount(), 1);
    await m.setPower(false);
    await m.setPower(true);
    assert.equal(m.setPowerCallCount(), 3);
  });

  it('getLastSetPowerArg returns last argument', async () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    assert.equal(m.getLastSetPowerArg(), null);
    await m.setPower(true);
    assert.equal(m.getLastSetPowerArg(), true);
    await m.setPower(false);
    assert.equal(m.getLastSetPowerArg(), false);
  });

  it('reset clears all state and counters', async () => {
    const m = new MockTasmotaTransport('192.168.1.100', 'on');
    await m.setPower(false);
    await m.getPower();
    m.setLatency(500);

    m.reset();

    assert.equal(m.getPowerCallCount(), 0);
    assert.equal(m.setPowerCallCount(), 0);
    assert.equal(m.getLastSetPowerArg(), null);
    const r = await m.getPower();
    assertPowerResponse(r, 'off', 0);
  });

  it('getHost returns the configured host', () => {
    const m = new MockTasmotaTransport('10.0.0.55');
    assert.equal(m.getHost(), '10.0.0.55');
  });

  // ── Latency simulation ──────────────────────────────────────────────────

  it('setLatency adds delay to getPower', async () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    m.setLatency(50);
    const start = Date.now();
    await m.getPower();
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 45, `expected >=45ms, got ${elapsed}ms`);
  });

  it('setLatency adds delay to setPower', async () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    m.setLatency(50);
    const start = Date.now();
    await m.setPower(true);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 45, `expected >=45ms, got ${elapsed}ms`);
  });

  // ── Failure injection ───────────────────────────────────────────────────

  it('failure mode "timeout" — getPower returns unknown', async () => {
    const m = new MockTasmotaTransport('192.168.1.100', 'on');
    m.setFailureMode('timeout');
    const r = await m.getPower();
    assert.equal(r.state, 'unknown');
  });

  it('failure mode "timeout" — setPower throws', async () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    m.setFailureMode('timeout');
    await assert.rejects(() => m.setPower(true), {
      message: /simulated timeout/,
    });
  });

  it('failure mode "connection_refused" — getPower returns unknown', async () => {
    const m = new MockTasmotaTransport('192.168.1.100', 'on');
    m.setFailureMode('connection_refused');
    const r = await m.getPower();
    assert.equal(r.state, 'unknown');
  });

  it('failure mode "connection_refused" — setPower throws', async () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    m.setFailureMode('connection_refused');
    await assert.rejects(() => m.setPower(true), {
      message: /connection refused/,
    });
  });

  it('failure mode "unreachable" — getPower returns unknown', async () => {
    const m = new MockTasmotaTransport('192.168.1.100', 'on');
    m.setFailureMode('unreachable');
    const r = await m.getPower();
    assert.equal(r.state, 'unknown');
  });

  it('failure mode "unreachable" — setPower throws', async () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    m.setFailureMode('unreachable');
    await assert.rejects(() => m.setPower(true), {
      message: /unreachable/,
    });
  });

  it('failure mode "bad_response" — getPower returns unknown without throwing', async () => {
    const m = new MockTasmotaTransport('192.168.1.100', 'on');
    m.setFailureMode('bad_response');
    const r = await m.getPower();
    assert.equal(r.state, 'unknown');
    // setPower still succeeds — the command goes through, we just can't read the response
    await m.setPower(false);
    // State actually changed (command was sent), but getPower can't confirm it
    const r2 = await m.getPower();
    assert.equal(r2.state, 'unknown');
  });
});

// ── MockShellyTransport ────────────────────────────────────────────────────

describe('MockShellyTransport', () => {
  it('starts in off state', async () => {
    const m = new MockShellyTransport('192.168.1.200');
    const r = await m.getPower();
    assertPowerResponse(r, 'off', 0);
  });

  it('starts in on state when initialState is passed', async () => {
    const m = new MockShellyTransport('192.168.1.200', 'on');
    const r = await m.getPower();
    assertPowerResponse(r, 'on', 150);
  });

  it('setPower toggles state', async () => {
    const m = new MockShellyTransport('192.168.1.200');
    await m.setPower(true);
    let r = await m.getPower();
    assertPowerResponse(r, 'on', 150);

    await m.setPower(false);
    r = await m.getPower();
    assertPowerResponse(r, 'off', 0);
  });

  it('tracks getPower and setPower calls separately', async () => {
    const m = new MockShellyTransport('192.168.1.200');
    await m.getPower();
    await m.getPower();
    await m.setPower(true);
    assert.equal(m.getPowerCallCount(), 2);
    assert.equal(m.setPowerCallCount(), 1);
  });

  it('failure mode "bad_response" — getPower returns unknown', async () => {
    const m = new MockShellyTransport('192.168.1.200', 'on');
    m.setFailureMode('bad_response');
    const r = await m.getPower();
    assert.equal(r.state, 'unknown');
  });

  it('reset clears Shelly-specific state', async () => {
    const m = new MockShellyTransport('192.168.1.200', 'on');
    await m.setPower(false);
    m.setLatency(100);
    m.setFailureMode('timeout');
    m.reset();

    assert.equal(m.getPowerCallCount(), 0);
    const r = await m.getPower();
    assertPowerResponse(r, 'off', 0);
  });
});

// ── createMockTransport factory ────────────────────────────────────────────

describe('createMockTransport', () => {
  it('returns MockTasmotaTransport for tasmota protocol', () => {
    const m = createMockTransport('10.0.0.1', 'tasmota');
    assert.ok(m instanceof MockTasmotaTransport);
  });

  it('returns MockShellyTransport for shelly protocol', () => {
    const m = createMockTransport('10.0.0.2', 'shelly');
    assert.ok(m instanceof MockShellyTransport);
  });

  it('passes host to the created transport', () => {
    const m = createMockTransport('192.168.50.10', 'tasmota');
    assert.equal(m.getHost(), '192.168.50.10');
  });

  it('passes initialState when provided', async () => {
    const m = createMockTransport('10.0.0.1', 'tasmota', 'on');
    const r = await m.getPower();
    assertPowerResponse(r, 'on', 150);
  });

  it('throws on unsupported protocol', () => {
    // @ts-expect-error — testing runtime guard
    assert.throws(() => createMockTransport('10.0.0.1', 'kasa'));
  });

  it('created transport is callable as DeviceTransport', async () => {
    // Structural typing test: the factory returns MockDeviceTransport,
    // which must satisfy DeviceTransport (the base interface).
    const dt: DeviceTransport = createMockTransport('10.0.0.1', 'tasmota');
    const r = await dt.getPower();
    assert.equal(r.state, 'off');
    await dt.setPower(true);
    const r2 = await dt.getPower();
    assert.equal(r2.state, 'on');
  });
});

// ── Interface contract (structural typing) ─────────────────────────────────

describe('DeviceTransport interface contract', () => {
  it('MockTasmotaTransport satisfies DeviceTransport', () => {
    const dt: DeviceTransport = new MockTasmotaTransport('10.0.0.1');
    assert.ok(typeof dt.getPower === 'function');
    assert.ok(typeof dt.setPower === 'function');
  });

  it('MockShellyTransport satisfies DeviceTransport', () => {
    const dt: DeviceTransport = new MockShellyTransport('10.0.0.1');
    assert.ok(typeof dt.getPower === 'function');
    assert.ok(typeof dt.setPower === 'function');
  });

  it('MockDeviceTransport extends DeviceTransport', () => {
    const m: MockDeviceTransport = new MockTasmotaTransport('10.0.0.1');
    // Base contract methods
    assert.ok(typeof m.getPower === 'function');
    assert.ok(typeof m.setPower === 'function');
    // Extended mock methods
    assert.ok(typeof m.setState === 'function');
    assert.ok(typeof m.setLatency === 'function');
    assert.ok(typeof m.setFailureMode === 'function');
    assert.ok(typeof m.getPowerCallCount === 'function');
    assert.ok(typeof m.setPowerCallCount === 'function');
    assert.ok(typeof m.getLastSetPowerArg === 'function');
    assert.ok(typeof m.reset === 'function');
    assert.ok(typeof m.getHost === 'function');
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('rapid setPower toggles track all calls', async () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    await m.setPower(true);
    await m.setPower(false);
    await m.setPower(true);
    await m.setPower(false);
    assert.equal(m.setPowerCallCount(), 4);
    assert.equal(m.getLastSetPowerArg(), false);
  });

  it('failure mode "none" has no effect', async () => {
    const m = new MockTasmotaTransport('192.168.1.100', 'on');
    m.setFailureMode('none');
    const r = await m.getPower();
    assertPowerResponse(r, 'on', 150);
    await m.setPower(false); // should not throw
  });

  it('switching failure modes mid-session works', async () => {
    const m = new MockTasmotaTransport('192.168.1.100', 'on');

    // Normal operation
    let r = await m.getPower();
    assert.equal(r.state, 'on');

    // Inject failure
    m.setFailureMode('timeout');
    r = await m.getPower();
    assert.equal(r.state, 'unknown');

    // Recover
    m.setFailureMode('none');
    r = await m.getPower();
    assert.equal(r.state, 'on');
  });

  it('latency persists across calls until cleared', async () => {
    const m = new MockTasmotaTransport('192.168.1.100');
    m.setLatency(30);

    let start = Date.now();
    await m.getPower();
    assert.ok(Date.now() - start >= 28);

    start = Date.now();
    await m.setPower(true);
    assert.ok(Date.now() - start >= 28);

    // Clear latency
    m.setLatency(0);
    start = Date.now();
    await m.getPower();
    assert.ok(Date.now() - start < 20);
  });
});
