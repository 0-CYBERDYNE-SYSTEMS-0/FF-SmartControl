import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { logger } from '../src/logger.js';

// DB isolation WITHOUT process.chdir: FFT_NANO_DB_PATH (honored by
// src/hal/db.ts) isolates the database instead.
const dbDir = mkdtempSync(path.join(tmpdir(), 'farmpal-sensor-retention-'));
const oldDbPath = process.env.FFT_NANO_DB_PATH;

before(() => {
  logger.level = 'silent';
  process.env.FFT_NANO_DB_PATH = path.join(dbDir, 'data', 'fft_nano.db');
});

after(async () => {
  const { _closeDbForTesting } = await import('../src/hal/db.js');
  _closeDbForTesting();
  if (oldDbPath === undefined) delete process.env.FFT_NANO_DB_PATH;
  else process.env.FFT_NANO_DB_PATH = oldDbPath;
  rmSync(dbDir, { recursive: true, force: true });
});

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

async function seedReading(id: string, readAt: string): Promise<void> {
  const { getDb } = await import('../src/hal/db.js');
  const db = getDb();
  db.prepare(
    `
    INSERT OR IGNORE INTO hal_devices (id, type, protocol, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run('sensor_dev_1', 'sensor', 'mqtt', daysAgo(500), daysAgo(500));
  db.prepare(
    `
    INSERT INTO hal_sensors (id, device_id, metric, unit, value, quality, read_at, stored_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(id, 'sensor_dev_1', 'temperature', 'c', 21.5, 'good', readAt, readAt);
}

test('pruneSensorReadings deletes only readings older than the cutoff', async () => {
  const { runMigrations } = await import('../src/hal/db.js');
  const { pruneSensorReadings } = await import('../src/hal/sensors.js');

  runMigrations();
  await seedReading('sns_now', daysAgo(0));
  await seedReading('sns_40d', daysAgo(40));
  await seedReading('sns_400d', daysAgo(400));

  const deleted = pruneSensorReadings(daysAgo(30));
  assert.equal(deleted, 2);

  const { halSensors } = await import('../src/hal/sensors.js');
  assert.ok(halSensors.get('sns_now'), 'fresh reading must survive');
  assert.equal(halSensors.get('sns_40d'), undefined);
  assert.equal(halSensors.get('sns_400d'), undefined);
});

test('pruneSensorReadings is a zero-row no-op when nothing is old enough', async () => {
  const { pruneSensorReadings } = await import('../src/hal/sensors.js');

  const deleted = pruneSensorReadings(daysAgo(30));
  assert.equal(deleted, 0);
});
