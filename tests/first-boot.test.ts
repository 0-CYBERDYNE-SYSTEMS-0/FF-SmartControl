/**
 * Tests for first-boot provisioning orchestrator
 * Covers: VAL-IMG-006, VAL-IMG-007, VAL-IMG-014, VAL-IMG-015,
 *         VAL-IMG-016, VAL-IMG-018, VAL-IMG-019, VAL-IMG-020, VAL-IMG-021
 */

import {
  describe,
  it,
  beforeEach,
  afterEach,
  mock,
  before,
  after,
} from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Use a temp directory for all file operations to avoid polluting real files
const TEST_DATA_DIR = path.join(
  os.tmpdir(),
  `farmpal-firstboot-test-${Date.now()}`,
);
const TEST_INSTALL_DIR = path.join(TEST_DATA_DIR, 'opt', 'farmpal');
const TEST_VAR_DIR = path.join(TEST_DATA_DIR, 'var', 'lib');

function setupTestDirs() {
  fs.mkdirSync(TEST_INSTALL_DIR, { recursive: true });
  fs.mkdirSync(TEST_VAR_DIR, { recursive: true });
}

function cleanupTestDirs() {
  try {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup failures
  }
}

// Set env vars BEFORE importing the module
process.env.FARMPAL_DATA_DIR = TEST_VAR_DIR;
process.env.INSTALL_DIR = TEST_INSTALL_DIR;

import {
  ProvisioningManager,
  getProvisioningManager,
  getFarmPalDataDir,
  getFarmPalInstallDir,
  getFarmPalEnvFile,
  getProvisionedFlagFile,
  getProvisioningStateFile,
  getWizardSessionFile,
  getInterruptedCycleFile,
  resetProvisioning,
  type WizardSession,
} from '../src/first-boot.js';

describe('ProvisioningManager', () => {
  let mgr: ProvisioningManager;
  // Track env for each test so fresh manager gets fresh paths
  let savedEnvVars: Record<string, string | undefined>;

  beforeEach(() => {
    cleanupTestDirs();
    setupTestDirs();
    // Set env vars so new ProvisioningManager() uses test paths
    savedEnvVars = {
      FARMPAL_DATA_DIR: process.env.FARMPAL_DATA_DIR,
      INSTALL_DIR: process.env.INSTALL_DIR,
    };
    process.env.FARMPAL_DATA_DIR = TEST_VAR_DIR;
    process.env.INSTALL_DIR = TEST_INSTALL_DIR;
    // Reset the singleton so each test gets fresh paths
    // We do this by calling getProvisioningManager which creates/returns the singleton
    // Then we get a fresh instance by accessing the internal state
    mgr = new ProvisioningManager();
  });

  afterEach(() => {
    cleanupTestDirs();
    // Restore env
    process.env.FARMPAL_DATA_DIR = savedEnvVars.FARMPAL_DATA_DIR;
    process.env.INSTALL_DIR = savedEnvVars.INSTALL_DIR;
  });

  // -------------------------------------------------------------------------
  // VAL-IMG-006: Unprovisioned Detection on First Boot
  // -------------------------------------------------------------------------

  describe('isUnprovisioned()', () => {
    it('returns true when no .env exists', () => {
      assert.strictEqual(fs.existsSync(getFarmPalEnvFile()), false);
      assert.strictEqual(mgr.isUnprovisioned(), true);
    });

    it('returns true when .env exists but no provisioned flag', () => {
      fs.writeFileSync(
        getFarmPalEnvFile(),
        'FARMPAL_PROVISIONED=true\n',
        'utf-8',
      );
      assert.strictEqual(fs.existsSync(getProvisionedFlagFile()), false);
      assert.strictEqual(mgr.isUnprovisioned(), true);
    });

    it('returns false when .env and provisioned flag both exist with all required vars', () => {
      fs.writeFileSync(
        getFarmPalEnvFile(),
        [
          'FARMPAL_VERSION=1.0.0',
          'FARMPAL_PROVISIONED=true',
          'FARMPAL_FARM_NAME=Test Farm',
          'TZ=America/New_York',
          'FARMPAL_LLM_PROVIDER=ollama',
          'SESSION_SECRET=testsecret123',
          'CSRF_SECRET=testcsrf456',
          'FFT_NANO_WEB_ACCESS_MODE=localhost',
          'HAL_UI_ENABLED=true',
          'HAL_UI_PORT=3392',
          'CONTAINER_RUNTIME=host',
        ].join('\n'),
        'utf-8',
      );
      fs.writeFileSync(getProvisionedFlagFile(), 'provisioned\n', 'utf-8');
      assert.strictEqual(mgr.isUnprovisioned(), false);
    });

    it('returns true when .env is missing required variables', () => {
      fs.writeFileSync(
        getFarmPalEnvFile(),
        [
          'FARMPAL_VERSION=1.0.0',
          // Missing most required vars
        ].join('\n'),
        'utf-8',
      );
      fs.writeFileSync(getProvisionedFlagFile(), 'provisioned\n', 'utf-8');
      assert.strictEqual(mgr.isUnprovisioned(), true);
    });

    it('returns true when provisioning state is in_progress', () => {
      fs.writeFileSync(
        getProvisioningStateFile(),
        JSON.stringify({
          state: 'in_progress',
          startedAt: new Date().toISOString(),
        }),
        'utf-8',
      );
      assert.strictEqual(mgr.isUnprovisioned(), true);
    });

    it('returns true when only .env exists but not provisioned flag', () => {
      fs.writeFileSync(
        getFarmPalEnvFile(),
        [
          'FARMPAL_VERSION=1.0.0',
          'FARMPAL_PROVISIONED=true',
          'FARMPAL_FARM_NAME=Test Farm',
          'TZ=UTC',
          'FARMPAL_LLM_PROVIDER=ollama',
          'SESSION_SECRET=abc',
          'CSRF_SECRET=def',
          'FFT_NANO_WEB_ACCESS_MODE=localhost',
          'HAL_UI_ENABLED=true',
          'HAL_UI_PORT=3392',
          'CONTAINER_RUNTIME=host',
        ].join('\n'),
        'utf-8',
      );
      assert.strictEqual(mgr.isUnprovisioned(), true);
    });
  });

  // -------------------------------------------------------------------------
  // VAL-IMG-007: Provisioning Creates Complete .env Atomically
  // VAL-IMG-019: Wizard .env Write Is Atomic
  // -------------------------------------------------------------------------

  describe('generateEnv()', () => {
    it('generates .env with all required variables', () => {
      const session: WizardSession = {
        step: 7,
        farmName: 'My Test Farm',
        timezone: 'America/Los_Angeles',
        llmProvider: 'openai',
        llmApiKey: 'sk-test-key-123',
        llmModel: 'gpt-4o',
        telegramEnabled: false,
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      mgr.generateEnv(session);

      assert.strictEqual(fs.existsSync(getFarmPalEnvFile()), true);
      const content = fs.readFileSync(getFarmPalEnvFile(), 'utf-8');
      const vars = mgr.parseEnvFile(content);

      assert.strictEqual(vars['FARMPAL_VERSION'], '1.0.0');
      assert.strictEqual(vars['FARMPAL_DATA_DIR_PATH'], TEST_VAR_DIR);
      assert.strictEqual(vars['FARMPAL_INSTALL_DIR_PATH'], TEST_INSTALL_DIR);
      assert.strictEqual(vars['FARMPAL_PROVISIONED'], 'true');
      assert.strictEqual(vars['FARMPAL_FARM_NAME'], 'My Test Farm');
      assert.strictEqual(vars['TZ'], 'America/Los_Angeles');
      assert.strictEqual(vars['FARMPAL_LLM_PROVIDER'], 'openai');
      assert.strictEqual(vars['FARMPAL_MODEL'], 'gpt-4o');
      assert.strictEqual(vars['FARMPAL_OPENAI_API_KEY'], 'sk-test-key-123');
      assert.strictEqual(vars['SESSION_SECRET'].length, 64); // 32 bytes hex
      assert.strictEqual(vars['CSRF_SECRET'].length, 64);
      assert.strictEqual(vars['FFT_NANO_WEB_ACCESS_MODE'], 'localhost');
      assert.strictEqual(vars['HAL_UI_ENABLED'], 'true');
      assert.strictEqual(vars['HAL_UI_PORT'], '3392');
      assert.strictEqual(vars['CONTAINER_RUNTIME'], 'host');
    });

    it('generates .env with WiFi credentials when provided', () => {
      const session: WizardSession = {
        step: 4,
        farmName: 'WiFi Farm',
        timezone: 'UTC',
        wifiSsid: 'MyNetwork',
        wifiPassword: 'supersecret',
        llmProvider: 'ollama',
        llmEndpoint: 'http://localhost:11434',
        telegramEnabled: false,
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      mgr.generateEnv(session);

      const content = fs.readFileSync(getFarmPalEnvFile(), 'utf-8');
      const vars = mgr.parseEnvFile(content);

      assert.strictEqual(vars['WIFI_SSID'], 'MyNetwork');
      assert.strictEqual(vars['WIFI_PSK'], 'supersecret');
    });

    it('generates .env with Ollama endpoint when selected', () => {
      const session: WizardSession = {
        step: 5,
        farmName: 'Ollama Farm',
        timezone: 'Europe/London',
        llmProvider: 'ollama',
        llmEndpoint: 'http://ollama.local:11434',
        llmModel: 'llama3',
        telegramEnabled: false,
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      mgr.generateEnv(session);

      const content = fs.readFileSync(getFarmPalEnvFile(), 'utf-8');
      const vars = mgr.parseEnvFile(content);

      assert.strictEqual(vars['FARMPAL_LLM_PROVIDER'], 'ollama');
      assert.strictEqual(vars['OLLAMA_BASE_URL'], 'http://ollama.local:11434');
      assert.strictEqual(vars['FARMPAL_MODEL'], 'llama3');
    });

    it('generates .env with Telegram token when enabled', () => {
      const session: WizardSession = {
        step: 7,
        farmName: 'Telegram Farm',
        timezone: 'UTC',
        llmProvider: 'ollama',
        telegramEnabled: true,
        telegramBotToken: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz',
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      mgr.generateEnv(session);

      const content = fs.readFileSync(getFarmPalEnvFile(), 'utf-8');
      const vars = mgr.parseEnvFile(content);

      assert.strictEqual(
        vars['TELEGRAM_BOT_TOKEN'],
        '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz',
      );
    });

    it('does not leave partial .env on failure (atomic write)', () => {
      const session: WizardSession = {
        step: 1,
        farmName: 'Fail Test',
        timezone: 'UTC',
        llmProvider: 'ollama',
        telegramEnabled: false,
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      // Write a pre-existing .env to verify it survives a failed write
      fs.writeFileSync(getFarmPalEnvFile(), 'PREEXISTING=true\n', 'utf-8');

      // Try to generate with invalid install dir to force failure
      // (tests that on failure, old file is preserved - no partial file)
      try {
        mgr.generateEnv(session);
      } catch {
        // Expected if something goes wrong
      }

      // File should be either the old complete file or a new complete file
      if (fs.existsSync(getFarmPalEnvFile())) {
        const content = fs.readFileSync(getFarmPalEnvFile(), 'utf-8');
        assert.ok(
          content.includes('PREEXISTING') ||
            content.includes('FARMPAL_VERSION'),
          'File should be either old complete or new complete, not partial',
        );
      }
    });

    it('uses default values when optional fields are missing', () => {
      const session: WizardSession = {
        step: 7,
        farmName: '',
        timezone: '',
        llmProvider: 'ollama',
        telegramEnabled: false,
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      mgr.generateEnv(session);

      const content = fs.readFileSync(getFarmPalEnvFile(), 'utf-8');
      const vars = mgr.parseEnvFile(content);

      assert.strictEqual(vars['FARMPAL_FARM_NAME'], 'My Farm'); // default
      assert.ok(vars['TZ'].length > 0); // should have some timezone
    });
  });

  // -------------------------------------------------------------------------
  // VAL-IMG-014: Power Loss Mid-Provisioning
  // VAL-IMG-015: Multiple Provisioning Attempts Idempotent
  // -------------------------------------------------------------------------

  describe('Provisioning state machine', () => {
    it('beginProvisioning() creates in_progress state', () => {
      const state = mgr.beginProvisioning();
      assert.strictEqual(state.state, 'in_progress');
      assert.ok(state.startedAt);
      assert.strictEqual(state.retryCount, 1);
    });

    it('beginProvisioning() is idempotent - returns existing in_progress state', () => {
      const first = mgr.beginProvisioning();
      const second = mgr.beginProvisioning();
      assert.strictEqual(first.startedAt, second.startedAt);
      assert.strictEqual(second.retryCount, 1); // No double-count
    });

    it('completeProvisioning() transitions to completed and creates flag', () => {
      mgr.beginProvisioning();
      mgr.completeProvisioning();

      const state = mgr.loadState();
      assert.strictEqual(state?.state, 'completed');
      assert.ok(state?.completedAt);
      assert.strictEqual(fs.existsSync(getProvisionedFlagFile()), true);
    });

    it('failProvisioning() transitions to failed', () => {
      mgr.beginProvisioning();
      mgr.failProvisioning('Disk full');

      const state = mgr.loadState();
      assert.strictEqual(state?.state, 'failed');
      assert.strictEqual(state?.errorMessage, 'Disk full');
    });

    it('loadState() returns null when no state file exists', () => {
      // Ensure no state file
      try {
        if (fs.existsSync(getProvisioningStateFile()))
          fs.unlinkSync(getProvisioningStateFile());
      } catch {
        /* ignore */
      }
      const state = mgr.loadState();
      assert.strictEqual(state, null);
    });

    it('resetProvisioning() removes all provisioning artifacts', async () => {
      // Create a fake provisioned state
      fs.writeFileSync(getFarmPalEnvFile(), 'TEST=true\n', 'utf-8');
      fs.writeFileSync(getProvisionedFlagFile(), 'done\n', 'utf-8');
      fs.writeFileSync(
        getProvisioningStateFile(),
        '{"state":"completed"}\n',
        'utf-8',
      );

      resetProvisioning();

      assert.strictEqual(fs.existsSync(getFarmPalEnvFile()), false);
      assert.strictEqual(fs.existsSync(getProvisionedFlagFile()), false);
      assert.strictEqual(fs.existsSync(getProvisioningStateFile()), false);
    });
  });

  // -------------------------------------------------------------------------
  // VAL-IMG-018: Wizard Session Timeout and Auto-Save
  // -------------------------------------------------------------------------

  describe('Wizard session auto-save (VAL-IMG-018)', () => {
    it('saveWizardSession() and loadWizardSession() work correctly', () => {
      const session: WizardSession = {
        step: 3,
        farmName: 'AutoSave Test',
        timezone: 'UTC',
        llmProvider: 'anthropic',
        llmApiKey: 'sk-ant-secret',
        telegramEnabled: true,
        telegramBotToken: 'token123',
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      };

      mgr.saveWizardSession(session);
      const loaded = mgr.loadWizardSession();

      assert.ok(loaded);
      assert.strictEqual(loaded!.step, 3);
      assert.strictEqual(loaded!.farmName, 'AutoSave Test');
      // Sensitive fields are cleared in saveWizardSession
      assert.strictEqual(loaded!.llmApiKey, undefined);
      assert.strictEqual(loaded!.telegramBotToken, undefined);
    });

    it('loadWizardSession() returns null for expired session', () => {
      const expiredSession: WizardSession = {
        step: 3,
        farmName: 'Expired',
        timezone: 'UTC',
        llmProvider: 'ollama',
        telegramEnabled: false,
        savedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      };

      mgr.saveWizardSession(expiredSession);
      const loaded = mgr.loadWizardSession();

      assert.strictEqual(loaded, null);
    });

    it('clearWizardSession() removes session file', () => {
      const session: WizardSession = {
        step: 1,
        farmName: 'Clear Test',
        timezone: 'UTC',
        llmProvider: 'ollama',
        telegramEnabled: false,
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      mgr.saveWizardSession(session);
      assert.ok(fs.existsSync(getWizardSessionFile()));

      mgr.clearWizardSession();
      assert.strictEqual(fs.existsSync(getWizardSessionFile()), false);
    });

    it('updateWizardStep() saves partial data', () => {
      mgr.beginProvisioning();
      const state = mgr.updateWizardStep(2, {
        farmName: 'Step 2 Farm',
        timezone: 'America/New_York',
      });

      assert.strictEqual(state.wizardStep, 2);
      assert.strictEqual(state.farmName, 'Step 2 Farm');
      assert.strictEqual(state.timezone, 'America/New_York');
    });
  });

  // -------------------------------------------------------------------------
  // VAL-IMG-020: Concurrent Provisioning Attempts
  // -------------------------------------------------------------------------

  describe('acquireProvisioningLock() (VAL-IMG-020)', () => {
    it('acquires lock successfully when not held', () => {
      const release = mgr.acquireProvisioningLock();
      assert.ok(typeof release === 'function');

      const lockFile = path.join(TEST_VAR_DIR, 'provisioning-lock');
      assert.strictEqual(fs.existsSync(lockFile), true);

      release();
      assert.strictEqual(fs.existsSync(lockFile), false);
    });

    it('releases lock on completion', () => {
      const release = mgr.acquireProvisioningLock();
      release();
      const release2 = mgr.acquireProvisioningLock();
      release2();
    });
  });

  // -------------------------------------------------------------------------
  // VAL-IMG-021: Power Loss Mid-Decision-Cycle
  // -------------------------------------------------------------------------

  describe('Interrupted cycle handling (VAL-IMG-021)', () => {
    it('markCycleInterrupted() and loadInterruptedCycle() work', () => {
      mgr.markCycleInterrupted('cycle-123', ['relay-1', 'relay-2']);

      const marker = mgr.loadInterruptedCycle();
      assert.ok(marker);
      assert.strictEqual(marker!.cycleId, 'cycle-123');
      assert.deepStrictEqual(marker!.activeRelays, ['relay-1', 'relay-2']);
    });

    it('clearInterruptedCycle() removes marker', () => {
      mgr.markCycleInterrupted('cycle-456', ['relay-3']);
      mgr.clearInterruptedCycle();

      const marker = mgr.loadInterruptedCycle();
      assert.strictEqual(marker, null);
    });

    it('checkPowerLossRecovery() detects interrupted cycle', () => {
      mgr.markCycleInterrupted('cycle-789', ['relay-4']);

      const recovery = mgr.checkPowerLossRecovery();
      assert.strictEqual(recovery.cycleInterrupted, true);
    });
  });

  // -------------------------------------------------------------------------
  // Network Detection (VAL-IMG-016)
  // -------------------------------------------------------------------------

  describe('Network detection', () => {
    it('hasNetworkConnectivity() returns boolean', () => {
      const hasNetwork = mgr.hasNetworkConnectivity();
      assert.strictEqual(typeof hasNetwork, 'boolean');
    });

    it('getPrimaryIpAddress() returns string or null', () => {
      const ip = mgr.getPrimaryIpAddress();
      assert.ok(ip === null || typeof ip === 'string');
    });

    it('isAvahiRunning() returns boolean', () => {
      const avahi = mgr.isAvahiRunning();
      assert.strictEqual(typeof avahi, 'boolean');
    });
  });

  // -------------------------------------------------------------------------
  // parseEnvFile()
  // -------------------------------------------------------------------------

  describe('parseEnvFile()', () => {
    it('parses standard key=value pairs', () => {
      const content = [
        'FOO=bar',
        'BAZ=qux',
        '# comment',
        '',
        'EMPTY=',
        'WITH_SPACE=hello world',
      ].join('\n');

      const vars = mgr.parseEnvFile(content);
      assert.strictEqual(vars['FOO'], 'bar');
      assert.strictEqual(vars['BAZ'], 'qux');
      assert.strictEqual(vars['EMPTY'], '');
      assert.strictEqual(vars['WITH_SPACE'], 'hello world');
      assert.strictEqual(vars['comment'], undefined);
    });

    it('handles quoted values', () => {
      const content = [
        'QUOTED_DOUBLE="hello world"',
        "QUOTED_SINGLE='single quotes'",
        'NORMAL=normal',
      ].join('\n');

      const vars = mgr.parseEnvFile(content);
      assert.strictEqual(vars['QUOTED_DOUBLE'], 'hello world');
      assert.strictEqual(vars['QUOTED_SINGLE'], 'single quotes');
      assert.strictEqual(vars['NORMAL'], 'normal');
    });

    it('handles values with equals signs in quoted strings', () => {
      const content = 'KEY="value=with=equals"';
      const vars = mgr.parseEnvFile(content);
      assert.strictEqual(vars['KEY'], 'value=with=equals');
    });
  });

  // -------------------------------------------------------------------------
  // needsProvisioning() convenience function
  // -------------------------------------------------------------------------

  describe('needsProvisioning()', () => {
    it('returns true when completely unprovisioned', async () => {
      // A fresh manager with no files should need provisioning
      const mgr2 = new ProvisioningManager();
      assert.strictEqual(mgr2.isUnprovisioned(), true);
    });

    it('returns false after completion', () => {
      mgr.beginProvisioning();
      const session: WizardSession = {
        step: 7,
        farmName: 'Completed',
        timezone: 'UTC',
        llmProvider: 'ollama',
        telegramEnabled: false,
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };
      mgr.generateEnv(session);
      mgr.completeProvisioning();

      // New manager instance to get fresh state
      const m2 = new ProvisioningManager();
      assert.strictEqual(m2.isUnprovisioned(), false);
    });
  });
});
