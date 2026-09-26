/**
 * Golden-kit device presets tests (src/hal/device-presets.ts, D3)
 *
 * The presets module is the data contract between docs/REFERENCE_BOM.md and
 * the Discovery Wizard quick-pick. Shape violations here break the wizard
 * chips or register devices under protocols the HAL does not know, so the
 * contract is pinned by these tests.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  GOLDEN_KIT_PRESETS,
  GOLDEN_KIT_REQUIRED_IDS,
  getGoldenKitPreset,
} from '../src/hal/device-presets.js';
import type {
  DeviceProtocol,
  DeviceType,
  MetricType,
} from '../src/hal/types.js';

const VALID_DEVICE_TYPES: DeviceType[] = [
  'smart_plug',
  'sensor',
  'camera',
  'relay',
];

const VALID_PROTOCOLS: DeviceProtocol[] = [
  'tasmota',
  'shelly',
  'kasa',
  'mqtt',
  'gpio',
  'serial',
];

const VALID_METRICS: MetricType[] = [
  'temperature',
  'humidity',
  'soil_moisture',
  'light',
  'co2',
  'water_level',
  'ph',
  'weight',
];

const VALID_WIZARD_PROTOCOLS = [
  'gpio',
  'mqtt',
  'http_tasmota',
  'http_shelly',
  'serial',
  'manual',
];

const WIZARD_TO_HAL: Record<string, DeviceProtocol[]> = {
  gpio: ['gpio'],
  mqtt: ['mqtt'],
  http_tasmota: ['tasmota'],
  http_shelly: ['shelly'],
  serial: ['serial'],
  // Manual add can register any protocol the HAL knows.
  manual: VALID_PROTOCOLS,
};

test('every golden-kit preset has a complete, valid shape', () => {
  assert.ok(GOLDEN_KIT_PRESETS.length >= 5, 'expected the full golden kit');

  for (const preset of GOLDEN_KIT_PRESETS) {
    assert.ok(preset.id.length > 0, `${preset.id}: id required`);
    assert.ok(preset.label.length > 0, `${preset.id}: label required`);
    assert.ok(
      preset.description.length > 0,
      `${preset.id}: description required`,
    );
    assert.ok(
      VALID_DEVICE_TYPES.includes(preset.deviceType),
      `${preset.id}: invalid deviceType ${preset.deviceType}`,
    );
    assert.ok(
      VALID_WIZARD_PROTOCOLS.includes(preset.wizardProtocol),
      `${preset.id}: invalid wizardProtocol ${preset.wizardProtocol}`,
    );
    assert.ok(
      VALID_PROTOCOLS.includes(preset.halProtocol),
      `${preset.id}: invalid halProtocol ${preset.halProtocol}`,
    );
    assert.ok(
      WIZARD_TO_HAL[preset.wizardProtocol].includes(preset.halProtocol),
      `${preset.id}: halProtocol ${preset.halProtocol} unreachable via wizardProtocol ${preset.wizardProtocol}`,
    );
    for (const metric of preset.metrics) {
      assert.ok(
        VALID_METRICS.includes(metric),
        `${preset.id}: invalid metric ${metric}`,
      );
    }
    assert.ok(
      Number.isFinite(preset.pollIntervalMs) && preset.pollIntervalMs > 0,
      `${preset.id}: pollIntervalMs must be a positive number`,
    );
    assert.ok(
      typeof preset.optional === 'boolean',
      `${preset.id}: optional must be boolean`,
    );
    assert.ok(preset.bomRef.length > 0, `${preset.id}: bomRef required`);
  }
});

test('preset ids are unique', () => {
  const ids = new Set(GOLDEN_KIT_PRESETS.map((p) => p.id));
  assert.equal(ids.size, GOLDEN_KIT_PRESETS.length, 'duplicate preset ids');
});

test('required kit covers the three plug ecosystems and the two baseline sensors', () => {
  assert.deepEqual([...GOLDEN_KIT_REQUIRED_IDS].sort(), [
    'kasa_plug',
    'shelly_plug',
    'soil_moisture_probe',
    'tasmota_plug',
    'temp_humidity_sensor',
  ]);
});

test('optional presets are exactly the CO2 sensor and the relay board', () => {
  const optionalIds = GOLDEN_KIT_PRESETS.filter((p) => p.optional)
    .map((p) => p.id)
    .sort();
  assert.deepEqual(optionalIds, ['co2_sensor', 'relay_board']);
});

test('actuator presets declare no metrics; sensor presets declare at least one', () => {
  for (const preset of GOLDEN_KIT_PRESETS) {
    if (preset.deviceType === 'sensor') {
      assert.ok(
        preset.metrics.length > 0,
        `${preset.id}: sensor preset must declare expected metrics`,
      );
    } else {
      assert.deepEqual(
        preset.metrics,
        [],
        `${preset.id}: actuator presets must not claim metrics (MetricType has no power metric)`,
      );
    }
  }
});

test('soil-moisture probe declares the watering-gate metric', () => {
  const probe = getGoldenKitPreset('soil_moisture_probe');
  assert.ok(probe, 'soil probe preset missing');
  assert.ok(probe!.metrics.includes('soil_moisture'));
  assert.equal(probe!.optional, false, 'soil probe is required golden kit');
});

test('getGoldenKitPreset returns undefined for unknown ids', () => {
  assert.equal(getGoldenKitPreset('no_such_preset'), undefined);
  assert.equal(getGoldenKitPreset(''), undefined);
});
