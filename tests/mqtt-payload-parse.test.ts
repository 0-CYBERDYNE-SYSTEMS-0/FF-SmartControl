import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractMetricValue } from '../src/hal/mqtt.js';

test('bare numeric payload (ESPHome style)', () => {
  assert.equal(extractMetricValue('22.5', 'temperature'), 22.5);
});

test('Tasmota SENSOR JSON with nested sensor object', () => {
  const p = '{"Time":"2025-06-04T14:30:00","BME280":{"Temperature":23.4,"Humidity":48.2,"Pressure":1013}}';
  assert.equal(extractMetricValue(p, 'temperature'), 23.4);
  assert.equal(extractMetricValue(p, 'humidity'), 48.2);
  assert.equal(extractMetricValue(p, 'pressure'), 1013);
});

test('Tasmota ENERGY power JSON', () => {
  const p = '{"ENERGY":{"Power":45,"Voltage":230}}';
  // (no metric maps to power here; ensure nested numeric lookups work for co2)
  assert.equal(extractMetricValue('{"SCD40":{"CarbonDioxide":812}}', 'co2'), 812);
});

test('separators in keys are tolerated (Soil_Moisture)', () => {
  assert.equal(extractMetricValue('{"sensor":{"Soil_Moisture":31.5}}', 'soil_moisture'), 31.5);
});

test('non-numeric / unrelated payload returns null', () => {
  assert.equal(extractMetricValue('{"POWER":"ON"}', 'temperature'), null);
  assert.equal(extractMetricValue('garbage', 'temperature'), null);
});
