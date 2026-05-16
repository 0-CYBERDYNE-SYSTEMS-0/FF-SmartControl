import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  METRIC_SPECS,
  isWithinHardRange,
  normalizeMetricValue,
} from '../src/hal/telemetry-model.js';
import type { MetricType } from '../src/hal/types.js';

const oldCwd = process.cwd();
const tmpRoot = mkdtempSync(path.join(tmpdir(), 'farmpal-hal-telemetry-'));

before(() => {
  process.chdir(tmpRoot);
});

after(async () => {
  const { _closeDbForTesting } = await import('../src/hal/db.js');
  _closeDbForTesting();
  process.chdir(oldCwd);
  rmSync(tmpRoot, { recursive: true, force: true });
});

test('normalizeMetricValue clamps impossible sensor values', () => {
  assert.equal(normalizeMetricValue('temperature', 719.5), 50);
  assert.equal(normalizeMetricValue('light', 930_000_000), 100_000);
  assert.equal(normalizeMetricValue('light', -400), 0);
  assert.equal(normalizeMetricValue('humidity', 125), 100);
  assert.equal(normalizeMetricValue('co2', 180.2), 250);
});

test('seedHalDemoData writes only hard-range sensor readings', async () => {
  const { runMigrations, getDb } = await import('../src/hal/db.js');
  const { seedHalDemoData } = await import('../src/hal/seed-data.js');

  runMigrations();
  seedHalDemoData();

  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT metric, MIN(value) AS minValue, MAX(value) AS maxValue, COUNT(*) AS count
      FROM hal_sensors
      GROUP BY metric
    `,
    )
    .all() as Array<{
    metric: MetricType;
    minValue: number;
    maxValue: number;
    count: number;
  }>;

  assert.ok(rows.length >= 8);
  for (const row of rows) {
    assert.ok(row.count > 0, `${row.metric} should have demo readings`);
    assert.ok(
      isWithinHardRange(row.metric, row.minValue),
      `${row.metric} min ${row.minValue} should be in range`,
    );
    assert.ok(
      isWithinHardRange(row.metric, row.maxValue),
      `${row.metric} max ${row.maxValue} should be in range`,
    );
  }
});

test('runMigrations repairs impossible historical readings', async () => {
  const { runMigrations, getDb } = await import('../src/hal/db.js');

  runMigrations();
  const db = getDb();
  db.prepare(
    `
    INSERT INTO hal_sensors (id, device_id, metric, unit, value, quality, read_at, stored_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    'sns_bad_temp',
    'tent_a_temp_1',
    'temperature',
    'c',
    719,
    'good',
    '2026-05-16T00:00:00.000Z',
    '2026-05-16T00:00:00.000Z',
  );

  runMigrations();

  const repaired = db
    .prepare('SELECT value, quality FROM hal_sensors WHERE id = ?')
    .get('sns_bad_temp') as { value: number; quality: string };

  assert.equal(repaired.value, METRIC_SPECS.temperature.hardMax);
  assert.equal(repaired.quality, 'error');
});

test('HalSimulator tick stores plausible live readings', async () => {
  const { runMigrations, getDb } = await import('../src/hal/db.js');
  const { HalSimulator } = await import('../src/hal/simulator.js');

  runMigrations();
  const sim = new HalSimulator({ tickMs: 5000, speed: 60, seed: 7 });
  sim.setDeviceState('grow_light_main', 'on');
  for (let i = 0; i < 20; i++) {
    sim.runTickForTesting();
  }

  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT metric, MIN(value) AS minValue, MAX(value) AS maxValue, COUNT(*) AS count
      FROM hal_sensors
      GROUP BY metric
    `,
    )
    .all() as Array<{
    metric: MetricType;
    minValue: number;
    maxValue: number;
    count: number;
  }>;

  for (const metric of Object.keys(METRIC_SPECS) as MetricType[]) {
    const row = rows.find((r) => r.metric === metric);
    assert.ok(row, `${metric} should have simulator readings`);
    assert.ok(
      isWithinHardRange(metric, row.minValue),
      `${metric} min ${row.minValue} should be in range`,
    );
    assert.ok(
      isWithinHardRange(metric, row.maxValue),
      `${metric} max ${row.maxValue} should be in range`,
    );
  }

  const light = rows.find((r) => r.metric === 'light');
  assert.ok(light && light.maxValue > 1000, 'lights-on sim should produce lux');
});
