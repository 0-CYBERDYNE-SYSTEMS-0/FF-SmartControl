/**
 * FarmPal Factory Reset
 *
 * Completely resets FarmPal to first-boot provisioning state.
 * Clears: database, .env, provisioning flags, wizard session.
 * Logs reset event before deleting database, then triggers service restart.
 *
 * Used by:
 * - CLI: scripts/farmpal-reset
 * - API: POST /api/admin/factory-reset
 * - Dashboard: Settings → Factory Reset button
 *
 * VAL-SVC-022: Factory Reset — Command Resets to Provisioning State
 * VAL-SVC-023: Factory Reset — Requires Explicit Confirmation
 * VAL-SVC-024: Factory Reset — Dashboard Button Triggers Reset
 */

import fs from 'fs';
import path from 'path';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Path Resolution
// ---------------------------------------------------------------------------

/** FarmPal data directory (where fft_nano.db lives) */
export function getDataDir(): string {
  return (
    process.env.FARMPAL_DATA_DIR ||
    (process.env.INSTALL_DIR
      ? path.join(
          path.dirname(process.env.INSTALL_DIR),
          'var',
          'lib',
          'farmpal',
        )
      : path.join(process.cwd(), 'data'))
  );
}

/** Installation directory (where .env lives) */
export function getInstallDir(): string {
  return process.env.INSTALL_DIR || path.join(process.cwd());
}

/** Path to .env file */
export function getEnvFile(): string {
  return path.join(getInstallDir(), '.env');
}

/** Path to provisioning-complete flag */
export function getProvisionedFlagFile(): string {
  return path.join(getDataDir(), 'provisioned');
}

/** Path to provisioning state file */
export function getProvisioningStateFile(): string {
  return path.join(getDataDir(), 'provisioning-state.json');
}

/** Path to wizard session file */
export function getWizardSessionFile(): string {
  return path.join(getDataDir(), 'wizard-session.json');
}

/** Path to the SQLite database */
export function getDbPath(): string {
  return path.join(getDataDir(), 'fft_nano.db');
}

/** Path to FarmPal lock file */
export function getLockFile(): string {
  return path.join(getDataDir(), 'farmpal.lock');
}

// ---------------------------------------------------------------------------
// Reset Log (written before DB deletion)
// ---------------------------------------------------------------------------

function getResetLogPath(): string {
  return path.join(getDataDir(), 'factory-reset.log');
}

export interface ResetLogEntry {
  timestamp: string;
  operatorId: string;
  source: 'cli' | 'api' | 'dashboard';
  dbPath: string;
  envFile: string;
  provisioningFlag: string;
  success: boolean;
  error?: string;
}

/**
 * Write a reset event to the reset log BEFORE deleting the database.
 * This allows auditability even after the DB is gone.
 */
function writeResetLog(entry: Omit<ResetLogEntry, 'timestamp'>): void {
  try {
    const dataDir = getDataDir();
    fs.mkdirSync(dataDir, { recursive: true });
    const logPath = getResetLogPath();
    const fullEntry: ResetLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    const line = JSON.stringify(fullEntry) + '\n';
    fs.appendFileSync(logPath, line, { mode: 0o644 });
  } catch {
    // Ignore log write failures - don't block reset
  }
}

// ---------------------------------------------------------------------------
// Audit Log for HAL safety events
// We write to a separate file because we delete the DB during reset.
// The HAL audit log in DB is impermanent; the reset log is the source of truth for resets.
// ---------------------------------------------------------------------------

function getAuditLogPath(): string {
  return path.join(getDataDir(), 'reset-audit.log');
}

export interface ResetAuditEntry {
  timestamp: string;
  operatorId: string;
  action: 'factory_reset';
  source: 'cli' | 'api' | 'dashboard';
  success: boolean;
  error?: string;
}

/**
 * Write a reset audit entry to the dedicated reset audit log.
 * This is written BEFORE any destructive operations so it survives the reset.
 */
export function writeResetAuditLog(
  operatorId: string,
  source: 'cli' | 'api' | 'dashboard',
  success: boolean,
  error?: string,
): void {
  try {
    const dataDir = getDataDir();
    fs.mkdirSync(dataDir, { recursive: true });
    const auditPath = getAuditLogPath();
    const entry: ResetAuditEntry = {
      timestamp: new Date().toISOString(),
      operatorId,
      action: 'factory_reset',
      source,
      success,
      error,
    };
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(auditPath, line, { mode: 0o644 });
  } catch {
    // Ignore audit log failures - don't block reset
  }
}

// ---------------------------------------------------------------------------
// Database close helper
// ---------------------------------------------------------------------------

/** Import path for db.ts - we do a dynamic import to get the singleton */
async function closeDbConnection(): Promise<void> {
  try {
    // Attempt to close any existing DB connection by clearing the singleton
    // This is a best-effort approach since the module may not be loaded
    const dbModule = await import('./hal/db.js').catch(() => null);
    if (dbModule) {
      try {
        // Call getDb() which returns the Database instance with a close() method
        const db = (
          dbModule as unknown as { getDb: () => { close: () => void } }
        ).getDb();
        db.close();
      } catch {
        // DB not initialized or already closed - that's fine
      }
    }
  } catch {
    // Module not available - that's fine in CLI context
  }
}

/**
 * Close DB and delete the database file.
 * Also deletes WAL and SHM files if present.
 */
async function deleteDatabase(): Promise<void> {
  await closeDbConnection();

  const dbPath = getDbPath();
  const dbDir = getDataDir();

  // Delete main DB file
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  } catch (err) {
    throw new Error(`Failed to delete database: ${err}`);
  }

  // Delete WAL and SHM files (created by better-sqlite3 in WAL mode)
  for (const suffix of ['-wal', '-shm']) {
    try {
      const extraPath = dbPath + suffix;
      if (fs.existsSync(extraPath)) {
        fs.unlinkSync(extraPath);
      }
    } catch {
      // Ignore - these files may not exist
    }
  }

  // Also clean up any backup files
  try {
    const files = fs.readdirSync(dbDir);
    for (const file of files) {
      if (
        file.startsWith('fft_nano.db') &&
        (file.endsWith('.bak') || file.endsWith('.backup'))
      ) {
        fs.unlinkSync(path.join(dbDir, file));
      }
    }
  } catch {
    // Ignore
  }
}

// ---------------------------------------------------------------------------
// Core Reset Function
// ---------------------------------------------------------------------------

export interface FactoryResetOptions {
  operatorId: string;
  source: 'cli' | 'api' | 'dashboard';
}

export interface FactoryResetResult {
  success: boolean;
  error?: string;
}

/**
 * Execute factory reset.
 * - Writes audit log BEFORE destructive operations
 * - Closes DB connection
 * - Deletes database file
 * - Removes .env, provisioning flags, wizard session
 * - Triggers service restart (via systemd or launchctl)
 *
 * Does NOT throw - all errors are captured in the result.
 */
export async function factoryReset(
  options: FactoryResetOptions,
): Promise<FactoryResetResult> {
  const { operatorId, source } = options;

  try {
    // Step 1: Write audit log BEFORE any destructive operations
    writeResetAuditLog(operatorId, source, true);

    // Step 2: Close DB connection and delete database
    await deleteDatabase();

    // Step 3: Remove .env file
    const envFile = getEnvFile();
    try {
      if (fs.existsSync(envFile)) {
        fs.unlinkSync(envFile);
      }
    } catch {
      // Non-fatal - .env may not exist
    }

    // Step 4: Remove provisioning flag
    const provisionedFlag = getProvisionedFlagFile();
    try {
      if (fs.existsSync(provisionedFlag)) {
        fs.unlinkSync(provisionedFlag);
      }
    } catch {
      // Non-fatal
    }

    // Step 5: Remove provisioning state file
    const stateFile = getProvisioningStateFile();
    try {
      if (fs.existsSync(stateFile)) {
        fs.unlinkSync(stateFile);
      }
    } catch {
      // Non-fatal
    }

    // Step 6: Remove wizard session
    const wizardSession = getWizardSessionFile();
    try {
      if (fs.existsSync(wizardSession)) {
        fs.unlinkSync(wizardSession);
      }
    } catch {
      // Non-fatal
    }

    // Step 7: Remove lock file (so new instance can start fresh)
    const lockFile = getLockFile();
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch {
      // Non-fatal
    }

    // Step 8: Trigger service restart
    triggerServiceRestart();

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    writeResetAuditLog(operatorId, source, false, error);
    return { success: false, error };
  }
}

/**
 * Trigger service restart via systemd or launchctl.
 * This is async and non-blocking - we exit immediately after triggering.
 */
function triggerServiceRestart(): void {
  const platform = process.platform;

  try {
    if (platform === 'linux') {
      // Use systemd to restart the service
      execSync('systemctl restart farmpal', {
        stdio: 'pipe',
        timeout: 5000,
      });
    } else if (platform === 'darwin') {
      // Use launchctl to restart the service
      execSync('launchctl kickstart -k gui/current/com.farmpal', {
        stdio: 'pipe',
        timeout: 5000,
      });
    }
  } catch {
    // If restart fails, that's okay - the user can manually restart
    // The system is now in unprovisioned state regardless
  }
}

// ---------------------------------------------------------------------------
// CLI Confirmation Prompt
// ---------------------------------------------------------------------------

export function promptConfirmation(): Promise<boolean> {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n');
    console.log(
      '╔══════════════════════════════════════════════════════════════╗',
    );
    console.log(
      '║              ⚠️  FACTORY RESET WARNING ⚠️                      ║',
    );
    console.log(
      '╠══════════════════════════════════════════════════════════════╣',
    );
    console.log(
      '║                                                              ║',
    );
    console.log(
      '║  This will PERMANENTLY DELETE all FarmPal data:              ║',
    );
    console.log(
      '║                                                              ║',
    );
    console.log(
      '║  • All sensor readings and history                            ║',
    );
    console.log(
      '║  • All device registrations and configuration                 ║',
    );
    console.log(
      '║  • All automation rules and decisions                        ║',
    );
    console.log(
      '║  • All safety rules and audit logs                           ║',
    );
    console.log(
      '║  • Your .env configuration                                   ║',
    );
    console.log(
      '║  • Admin password and session data                           ║',
    );
    console.log(
      '║                                                              ║',
    );
    console.log(
      '║  This action CANNOT be undone.                               ║',
    );
    console.log(
      '║                                                              ║',
    );
    console.log(
      '║  After reset, FarmPal will restart in first-boot mode.       ║',
    );
    console.log(
      '║                                                              ║',
    );
    console.log(
      '╚══════════════════════════════════════════════════════════════╝',
    );
    console.log('\n');

    const question = () => {
      rl.question(
        'Type "FACTORY RESET" exactly to confirm: ',
        (answer: string) => {
          rl.close();
          if (answer.trim().toUpperCase() === 'FACTORY RESET') {
            resolve(true);
          } else {
            console.log('\nConfirmation rejected. Factory reset aborted.\n');
            resolve(false);
          }
        },
      );
    };

    question();
  });
}

// ---------------------------------------------------------------------------
// CLI Entry Point
// ---------------------------------------------------------------------------

export async function runCliReset(): Promise<void> {
  const confirmed = await promptConfirmation();
  if (!confirmed) {
    process.exit(1);
  }

  console.log('\nInitiating factory reset...\n');

  const operatorId = process.env.USER || process.env.USERNAME || 'cli';

  const result = await factoryReset({
    operatorId,
    source: 'cli',
  });

  if (result.success) {
    console.log('Factory reset complete.');
    console.log('FarmPal will now restart in first-boot provisioning mode.\n');
  } else {
    console.error('Factory reset failed:', result.error);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Direct execution
// ---------------------------------------------------------------------------

// If run directly (node dist/reset.js), execute CLI reset
if (process.argv[1]?.endsWith('reset.js')) {
  runCliReset().catch((err) => {
    console.error('Reset error:', err);
    process.exit(1);
  });
}
