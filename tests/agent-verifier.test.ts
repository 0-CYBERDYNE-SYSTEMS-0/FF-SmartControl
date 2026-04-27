import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateDeterministicSafety,
  resetVerifierRateLimitsForTests,
} from '../src/agent/verifier.js';
import type { HalDevice, MetricType } from '../src/hal/types.js';

function device(
  data: Partial<HalDevice> & Pick<HalDevice, 'id' | 'type'>,
): HalDevice {
  return {
    id: data.id,
    type: data.type,
    protocol: data.protocol ?? 'gpio',
    host: data.host ?? null,
    label: data.label ?? null,
    last_state: data.last_state ?? 'unknown',
    last_value: data.last_value ?? null,
    last_seen: data.last_seen ?? null,
    created_at: data.created_at ?? '2026-04-27T00:00:00.000Z',
    updated_at: data.updated_at ?? '2026-04-27T00:00:00.000Z',
  };
}

function latestFrom(
  readings: Record<string, Partial<Record<MetricType, number>>>,
) {
  return (deviceId: string, metric: MetricType) => {
    const value = readings[deviceId]?.[metric];
    return typeof value === 'number' ? { value } : undefined;
  };
}

test('deterministic verifier blocks actuator decisions without a device', () => {
  const result = evaluateDeterministicSafety(
    {
      proposedAction: {
        decision: 'turn_on',
        deviceId: null,
        reasoning: 'turn on ventilation',
        confidence: 0.95,
      },
    },
    { devices: [], latest: latestFrom({}) },
  );

  assert.equal(result.approved, false);
  assert.match(result.concerns.join('\n'), /requires a device_id/);
});

test('deterministic verifier blocks unknown actuator devices', () => {
  const result = evaluateDeterministicSafety(
    {
      proposedAction: {
        decision: 'turn_off',
        deviceId: 'missing_fan',
        reasoning: 'turn fan off',
        confidence: 0.95,
      },
    },
    { devices: [], latest: latestFrom({}) },
  );

  assert.equal(result.approved, false);
  assert.match(result.concerns.join('\n'), /not registered/);
});

test('deterministic verifier blocks exhaust shutdown when any temperature sensor is hot', () => {
  const result = evaluateDeterministicSafety(
    {
      proposedAction: {
        decision: 'turn_off',
        deviceId: 'exhaust_fan',
        reasoning: 'quiet mode',
        confidence: 0.95,
      },
    },
    {
      devices: [
        device({ id: 'exhaust_fan', type: 'relay', label: 'Exhaust fan' }),
        device({ id: 'zone_a_sensor', type: 'sensor', label: 'Zone A' }),
      ],
      latest: latestFrom({ zone_a_sensor: { temperature: 31.2 } }),
    },
  );

  assert.equal(result.approved, false);
  assert.match(result.concerns.join('\n'), /Never turn off exhaust/);
  assert.match(result.concerns.join('\n'), /31\.2C/);
});

test('deterministic verifier blocks circulation shutdown when humidity is high', () => {
  const result = evaluateDeterministicSafety(
    {
      proposedAction: {
        decision: 'turn_off',
        deviceId: 'circulation_fan',
        reasoning: 'reduce airflow',
        confidence: 0.95,
      },
    },
    {
      devices: [
        device({
          id: 'circulation_fan',
          type: 'smart_plug',
          label: 'Circulation fan',
        }),
        device({ id: 'zone_b_sensor', type: 'sensor', label: 'Zone B' }),
      ],
      latest: latestFrom({ zone_b_sensor: { humidity: 83 } }),
    },
  );

  assert.equal(result.approved, false);
  assert.match(result.concerns.join('\n'), /Never turn off circulation/);
  assert.match(result.concerns.join('\n'), /83%/);
});

test('deterministic verifier blocks low-confidence decisions', () => {
  const result = evaluateDeterministicSafety(
    {
      proposedAction: {
        decision: 'noop',
        deviceId: null,
        reasoning: 'uncertain',
        confidence: 0.42,
      },
    },
    { devices: [], latest: latestFrom({}) },
  );

  assert.equal(result.approved, false);
  assert.match(result.concerns.join('\n'), /LOW CONFIDENCE/);
});

test('deterministic verifier allows safe high-confidence noop', () => {
  resetVerifierRateLimitsForTests();

  const result = evaluateDeterministicSafety(
    {
      proposedAction: {
        decision: 'noop',
        deviceId: null,
        reasoning: 'status only',
        confidence: 0.92,
      },
    },
    { devices: [], latest: latestFrom({}) },
  );

  assert.deepEqual(result, { approved: true, concerns: [] });
});
