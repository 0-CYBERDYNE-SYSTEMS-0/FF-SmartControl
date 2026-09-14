import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { logger } from '../src/logger.js';

// DB isolation WITHOUT process.chdir: the pino pretty transport spawns a
// worker whose async loader registration races chdir and can fail the file
// after tests end (worker resolves modules relative to the changed cwd).
// FFT_NANO_DB_PATH (honored by src/hal/db.ts) isolates the database instead.
const dbDir = mkdtempSync(path.join(tmpdir(), 'farmpal-truth-pass-'));
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

test('parseKasaPower extracts watts case-insensitively and returns null without a power line', async () => {
  const { parseKasaPower } = await import('../src/hal/http-devices.js');

  assert.equal(parseKasaPower('power: 23.5 W'), 23.5);
  // The regex uses the /i flag, so uppercase CLI output parses too.
  assert.equal(parseKasaPower('POWER: 100 W'), 100);
  assert.equal(parseKasaPower('State: ON\npower:0.75W'), 0.75);
  assert.equal(parseKasaPower('State: ON'), null);
  assert.equal(parseKasaPower(''), null);
});

test('parseTasmotaEnergy reads StatusSNS.ENERGY with legacy ENERGY fallback', async () => {
  const { parseTasmotaEnergy } = await import('../src/hal/http-devices.js');

  assert.equal(
    parseTasmotaEnergy({ StatusSNS: { ENERGY: { Power: 45.2 } } }),
    45.2,
  );
  assert.equal(parseTasmotaEnergy({ ENERGY: { Power: 12 } }), 12);
  assert.equal(parseTasmotaEnergy({ StatusSNS: {} }), null);
  assert.equal(
    parseTasmotaEnergy({ StatusSNS: { ENERGY: { Power: '45.2' } } }),
    null,
  );
  assert.equal(parseTasmotaEnergy(null), null);
  assert.equal(parseTasmotaEnergy('garbage'), null);
});

test('discovery validators accept clean prefixes/hosts and reject injection payloads', async () => {
  const { isValidHost, isValidSubnetPrefix } =
    await import('../src/hal/discovery.js');

  assert.equal(isValidSubnetPrefix('192.168.1.'), true);
  assert.equal(isValidSubnetPrefix('192.168.1'), true);
  assert.equal(isValidSubnetPrefix('192.168.1; rm -rf /'), false);
  assert.equal(isValidSubnetPrefix(''), false);
  assert.equal(isValidSubnetPrefix('$(touch /tmp/pwned)'), false);

  assert.equal(isValidHost('192.168.1.50'), true);
  assert.equal(isValidHost('tasmota-01.lan'), true);
  assert.equal(isValidHost('192.168.1; rm -rf /'), false);
  assert.equal(isValidHost(''), false);
  assert.equal(isValidHost('a b'), false);
  assert.equal(isValidHost('$(touch /tmp/pwned)'), false);
  assert.equal(isValidHost('host;curl evil'), false);
});

test('gpio validators bound pins to 0-31 and reserve I2C/UART write pins', async () => {
  const { isValidGpioPin, isWritableGpioPin } =
    await import('../src/hal/gpio.js');

  assert.equal(isValidGpioPin(0), true);
  assert.equal(isValidGpioPin(31), true);
  assert.equal(isValidGpioPin(-1), false);
  assert.equal(isValidGpioPin(32), false);
  assert.equal(isValidGpioPin(2.5), false);
  assert.equal(isValidGpioPin(Number.NaN), false);

  // 2/3 are I2C, 14/15 are UART — readable but never writable.
  assert.equal(isWritableGpioPin(2), false);
  assert.equal(isWritableGpioPin(3), false);
  assert.equal(isWritableGpioPin(14), false);
  assert.equal(isWritableGpioPin(15), false);
  assert.equal(isWritableGpioPin(17), true);
  assert.equal(isWritableGpioPin(26), true);
});

test('fresh DB defaults automation mode to OBSERVE_ONLY (no row until first read)', async () => {
  const { runMigrations, getDb } = await import('../src/hal/db.js');
  const { getAutomationMode, invalidateModeCache } =
    await import('../src/automation/modes.js');

  runMigrations();

  const countBefore = (
    getDb().prepare('SELECT COUNT(*) AS n FROM hal_automation_mode').get() as {
      n: number;
    }
  ).n;
  assert.equal(countBefore, 0, 'fresh DB should have no mode row yet');

  // Modes module caches reads for 5s; force a fresh-DB read for this test.
  invalidateModeCache();
  assert.equal(getAutomationMode(), 'OBSERVE_ONLY');

  const row = getDb()
    .prepare('SELECT mode FROM hal_automation_mode WHERE id = ?')
    .get('global') as { mode: string };
  assert.equal(row.mode, 'OBSERVE_ONLY');
});

test('logLoginSuccess stores sha256 token hash, never the raw session token', async () => {
  const { runMigrations, getDb } = await import('../src/hal/db.js');
  const {
    initSecurityAuditDatabase,
    getSecurityAuditEntriesByType,
    logLoginSuccess,
  } = await import('../src/security/security-audit.js');

  runMigrations();
  initSecurityAuditDatabase();

  const rawToken = 'raw-secret-token-abc';
  logLoginSuccess(rawToken, 'admin', '127.0.0.1');

  const entries = getSecurityAuditEntriesByType('LOGIN_SUCCESS', 10);
  const entry = entries.find((e) => e.operatorId === 'admin');
  assert.ok(entry, 'LOGIN_SUCCESS entry for admin should exist');
  assert.notEqual(entry.sessionId, rawToken);
  assert.ok(
    entry.sessionId?.startsWith('sha256:'),
    'stored session_id must be a sha256-prefixed hash',
  );
  const expectedHash = `sha256:${createHash('sha256').update(rawToken).digest('hex')}`;
  assert.equal(entry.sessionId, expectedHash);
  assert.equal(entry.ipAddress, '127.0.0.1');

  const rawColumn = getDb()
    .prepare('SELECT COUNT(*) AS n FROM security_audit WHERE session_id = ?')
    .get(rawToken) as { n: number };
  assert.equal(rawColumn.n, 0, 'raw token must never appear in session_id');
});
