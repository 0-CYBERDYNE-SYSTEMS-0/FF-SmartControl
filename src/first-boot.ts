/**
 * FarmPal First-Boot Provisioning Orchestrator
 *
 * Detects unprovisioned state, enters provisioning mode, generates .env
 * with all required variables, sets provisioning-complete flag, and starts
 * Avahi/mDNS advertisement.
 *
 * Provisioning works headless (no HDMI/keyboard required) and via HDMI
 * console fallback. Handles power loss mid-provisioning idempotently.
 * Handles no-network scenario with HDMI console.
 *
 * VAL-IMG-006: Unprovisioned detection on first boot (no .env)
 * VAL-IMG-007: Provisioning creates complete .env atomically
 * VAL-IMG-014: Power loss mid-provisioning → clean restart
 * VAL-IMG-015: Multiple provisioning attempts handled idempotently
 * VAL-IMG-016: No network → HDMI console fallback
 * VAL-IMG-018: Wizard session timeout and auto-save
 * VAL-IMG-019: Wizard .env write is atomic
 * VAL-IMG-020: Wizard handles simultaneous duplicate provisioning attempts
 * VAL-IMG-021: Power loss mid-decision-cycle re-issues safe states
 * VAL-IMG-022: SD card speed/class handled gracefully
 */

import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Path Resolution
// ---------------------------------------------------------------------------

/**
 * Returns the FarmPal data directory path.
 * On the Pi this is /var/lib/farmpal.
 * Resolved at call time (not import time) to support test isolation.
 */
export function getFarmPalDataDir(): string {
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

/** Installation directory - on the Pi this is /opt/farmpal */
export function getFarmPalInstallDir(): string {
  return process.env.INSTALL_DIR || path.join(process.cwd());
}

/** Path to the .env file */
export function getFarmPalEnvFile(): string {
  return path.join(getFarmPalInstallDir(), '.env');
}

/** Path to the provisioning state file */
export function getProvisioningStateFile(): string {
  return path.join(getFarmPalDataDir(), 'provisioning-state.json');
}

/** Path to the provisioning-complete marker */
export function getProvisionedFlagFile(): string {
  return path.join(getFarmPalDataDir(), 'provisioned');
}

/** Path to wizard session auto-save state */
export function getWizardSessionFile(): string {
  return path.join(getFarmPalDataDir(), 'wizard-session.json');
}

/** Path to interrupted-cycle marker for VAL-IMG-021 */
export function getInterruptedCycleFile(): string {
  return path.join(getFarmPalDataDir(), 'interrupted-cycle.json');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProvisioningStateValue =
  | 'unprovisioned'
  | 'in_progress'
  | 'completed'
  | 'failed';

export interface ProvisioningState {
  state: ProvisioningStateValue;
  startedAt?: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
  wizardStep?: number; // 1-7
  farmName?: string;
  timezone?: string;
  wifiConfigured?: boolean;
  llmProvider?: string;
  errorMessage?: string;
  retryCount?: number;
  adminPasswordHash?: string; // bcrypt — durable credential read by login (survives wizard-session clear)
}

export interface WizardSession {
  step: number;
  farmName: string;
  adminPasswordHash?: string; // bcrypt
  timezone: string;
  wifiSsid?: string;
  wifiPassword?: string; // will be cleared after use
  wifiConfigured?: boolean;
  llmProvider: string;
  llmEndpoint?: string;
  llmApiKey?: string; // will be cleared after use
  llmModel?: string;
  telegramEnabled: boolean;
  telegramBotToken?: string;
  savedAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp - session expires 2 hours after last save
}

export interface EnvVars {
  // Core
  FARMPAL_VERSION: string;
  FARMPAL_DATA_DIR_PATH: string;
  FARMPAL_INSTALL_DIR_PATH: string;
  FARMPAL_PROVISIONED: 'true';
  // Farm identity
  FARMPAL_FARM_NAME: string;
  // Timezone
  TZ: string;
  // Network
  WIFI_SSID?: string;
  WIFI_PSK?: string;
  // LLM
  FARMPAL_LLM_PROVIDER: string;
  FARMPAL_MODEL?: string;
  FARMPAL_OPENAI_API_KEY?: string;
  FARMPAL_ANTHROPIC_API_KEY?: string;
  FARMPAL_ZAI_API_KEY?: string;
  FARMPAL_MINIMAX_API_KEY?: string;
  OLLAMA_BASE_URL?: string;
  LMSTUDIO_BASE_URL?: string;
  // Telegram (optional)
  TELEGRAM_BOT_TOKEN?: string;
  // Security
  SESSION_SECRET: string;
  CSRF_SECRET: string;
  // Network binding
  FFT_NANO_WEB_ACCESS_MODE: 'localhost' | 'lan' | 'remote';
  // HAL
  HAL_UI_ENABLED: 'true';
  HAL_UI_PORT: '3392';
  // Host runtime
  CONTAINER_RUNTIME: 'host';
  FFT_NANO_ALLOW_HOST_RUNTIME: '1';
}

/** Required .env variables that must be non-empty after provisioning */
const REQUIRED_ENV_KEYS = [
  'FARMPAL_VERSION',
  'FARMPAL_PROVISIONED',
  'FARMPAL_FARM_NAME',
  'FARMPAL_LLM_PROVIDER',
  'SESSION_SECRET',
  'CSRF_SECRET',
  'FFT_NANO_WEB_ACCESS_MODE',
  'HAL_UI_ENABLED',
  'HAL_UI_PORT',
  'CONTAINER_RUNTIME',
] as const;

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(
  level: 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>,
): void {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  const prefix = `[${timestamp}] [first-boot] [${level.toUpperCase()}]`;
  console.log(`${prefix} ${message}${metaStr}`);
  try {
    const dataDir = getFarmPalDataDir();
    const logFile = path.join(
      dataDir || '/var/lib/farmpal',
      'provisioning.log',
    );
    fs.appendFileSync(
      logFile,
      `${timestamp} [${level}] ${message}${metaStr}\n`,
    );
  } catch {
    // Ignore log write failures
  }
}

// ---------------------------------------------------------------------------
// Provisioning Manager
// ---------------------------------------------------------------------------

export class ProvisioningManager {
  /** Resolved paths - set once at construction */
  private readonly dataDir: string;
  private readonly installDir: string;
  private readonly envFile: string;
  private readonly stateFile: string;
  private readonly provisionedFlag: string;
  private readonly wizardSessionFile: string;
  private readonly interruptedCycleFile: string;
  private readonly lockFile: string;

  private _state: ProvisioningState | null = null;

  constructor() {
    this.dataDir = getFarmPalDataDir();
    this.installDir = getFarmPalInstallDir();
    this.envFile = path.join(this.installDir, '.env');
    this.stateFile = path.join(this.dataDir, 'provisioning-state.json');
    this.provisionedFlag = path.join(this.dataDir, 'provisioned');
    this.wizardSessionFile = path.join(this.dataDir, 'wizard-session.json');
    this.interruptedCycleFile = path.join(
      this.dataDir,
      'interrupted-cycle.json',
    );
    this.lockFile = path.join(this.dataDir, 'provisioning-lock');
  }

  /**
   * Returns the current provisioning state, loaded from disk.
   * Returns null if no state file exists.
   */
  get state(): ProvisioningState | null {
    return this._state;
  }

  // -------------------------------------------------------------------------
  // State Persistence
  // -------------------------------------------------------------------------

  /**
   * Load provisioning state from disk.
   * Returns null if no state file exists.
   */
  loadState(): ProvisioningState | null {
    try {
      if (fs.existsSync(this.stateFile)) {
        const raw = fs.readFileSync(this.stateFile, 'utf-8');
        this._state = JSON.parse(raw) as ProvisioningState;
        log('info', 'Loaded provisioning state', { state: this._state.state });
        return this._state;
      }
    } catch (err) {
      log(
        'warn',
        'Failed to load provisioning state, treating as unprovisioned',
        {
          error: String(err),
        },
      );
    }
    this._state = null;
    return null;
  }

  private saveState(state: ProvisioningState): void {
    try {
      fs.mkdirSync(this.dataDir, { recursive: true });
    } catch {
      // Directory may already exist
    }
    const tmpPath = `${this.stateFile}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpPath, this.stateFile);
    this._state = state;
    log('info', 'Saved provisioning state', { state: state.state });
  }

  // -------------------------------------------------------------------------
  // Unprovisioned Detection (VAL-IMG-006)
  // -------------------------------------------------------------------------

  /**
   * Returns true if FarmPal is in an unprovisioned state.
   */
  isUnprovisioned(): boolean {
    const envExists = fs.existsSync(this.envFile);
    const provisionedFlagExists = fs.existsSync(this.provisionedFlag);
    const state = this.loadState();

    if (state?.state === 'completed' && provisionedFlagExists && envExists) {
      return false;
    }

    if (state?.state === 'in_progress') {
      // Provisioning was interrupted - treat as unprovisioned for recovery
      return true;
    }

    if (!envExists || !provisionedFlagExists) {
      return true;
    }

    // Verify .env has all required keys
    try {
      const envContent = fs.readFileSync(this.envFile, 'utf-8');
      const envVars = this.parseEnvFile(envContent);
      const missing = REQUIRED_ENV_KEYS.filter((k) => !envVars[k]);
      if (missing.length > 0) {
        log('warn', '.env missing required variables - needs reprovisioning', {
          missing,
        });
        return true;
      }
    } catch {
      return true;
    }

    return false;
  }

  // -------------------------------------------------------------------------
  // Provisioning State Machine (VAL-IMG-014, VAL-IMG-015)
  // -------------------------------------------------------------------------

  /**
   * Begin provisioning process.
   * Idempotent - if already in_progress, returns existing state.
   */
  beginProvisioning(): ProvisioningState {
    const current = this.loadState();

    if (current?.state === 'in_progress') {
      log('info', 'Provisioning already in progress, continuing');
      return current;
    }

    if (current?.state === 'completed') {
      log('info', 'Provisioning already completed');
      return current;
    }

    const newState: ProvisioningState = {
      state: 'in_progress',
      startedAt: new Date().toISOString(),
      retryCount: (current?.retryCount ?? 0) + 1,
      farmName: current?.farmName,
      timezone: current?.timezone,
      wifiConfigured: current?.wifiConfigured,
      llmProvider: current?.llmProvider,
    };

    this.saveState(newState);
    log('info', 'Started provisioning', { retryCount: newState.retryCount });
    return newState;
  }

  updateWizardStep(
    step: number,
    partialData?: Partial<WizardSession>,
  ): ProvisioningState {
    const current = this.loadState() ?? this.beginProvisioning();
    const updated: ProvisioningState = {
      ...current,
      wizardStep: step,
      ...(partialData?.farmName !== undefined && {
        farmName: partialData.farmName,
      }),
      ...(partialData?.timezone !== undefined && {
        timezone: partialData.timezone,
      }),
      ...(partialData?.wifiConfigured !== undefined && {
        wifiConfigured: partialData.wifiConfigured,
      }),
      ...(partialData?.llmProvider !== undefined && {
        llmProvider: partialData.llmProvider,
      }),
    };
    this.saveState(updated);
    return updated;
  }

  // -------------------------------------------------------------------------
  // Wizard Session Auto-Save (VAL-IMG-018)
  // -------------------------------------------------------------------------

  saveWizardSession(session: WizardSession): void {
    try {
      fs.mkdirSync(this.dataDir, { recursive: true });
      // Don't store raw passwords/tokens in session file - only hashes
      const safeSession: WizardSession = {
        ...session,
        adminPasswordHash: session.adminPasswordHash,
        wifiPassword: undefined,
        llmApiKey: undefined,
        telegramBotToken: undefined,
      };
      const tmpPath = `${this.wizardSessionFile}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(safeSession, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.wizardSessionFile);
      log('info', 'Wizard session auto-saved', { step: session.step });
    } catch (err) {
      log('warn', 'Failed to save wizard session', { error: String(err) });
    }
  }

  loadWizardSession(): WizardSession | null {
    try {
      if (!fs.existsSync(this.wizardSessionFile)) {
        return null;
      }
      const raw = fs.readFileSync(this.wizardSessionFile, 'utf-8');
      const session = JSON.parse(raw) as WizardSession;
      const expiresAt = new Date(session.expiresAt);
      if (expiresAt < new Date()) {
        log('info', 'Wizard session expired', { expiresAt: session.expiresAt });
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  clearWizardSession(): void {
    try {
      if (fs.existsSync(this.wizardSessionFile)) {
        fs.unlinkSync(this.wizardSessionFile);
      }
    } catch {
      // Ignore
    }
  }

  // -------------------------------------------------------------------------
  // Atomic .env Generation (VAL-IMG-007, VAL-IMG-019)
  // -------------------------------------------------------------------------

  generateEnv(session: WizardSession): void {
    const envVars = this.buildEnvVars(session);
    const envContent = this.serializeEnv(envVars);

    log('info', 'Generating .env file', {
      path: this.envFile,
      requiredVars: REQUIRED_ENV_KEYS.length,
    });

    // VAL-IMG-019: Atomic write - write to temp file then rename
    const tmpPath = `${this.envFile}.tmp`;

    try {
      fs.mkdirSync(this.installDir, { recursive: true });

      // Write to temp file (exclusive create - fails if exists)
      fs.writeFileSync(tmpPath, envContent, {
        mode: 0o640,
        flag: 'wx',
      });

      // Atomic rename
      fs.renameSync(tmpPath, this.envFile);

      // Verify
      const written = fs.readFileSync(this.envFile, 'utf-8');
      const writtenVars = this.parseEnvFile(written);
      const missing = [...REQUIRED_ENV_KEYS].filter((k) => !writtenVars[k]);
      if (missing.length > 0) {
        throw new Error(
          `Generated .env is missing required variables: ${missing.join(', ')}`,
        );
      }

      log('info', '.env file generated successfully');
    } catch (err) {
      try {
        if (fs.existsSync(tmpPath)) {
          fs.unlinkSync(tmpPath);
        }
      } catch {
        // Ignore
      }
      log('error', 'Failed to generate .env', { error: String(err) });
      throw err;
    }
  }

  private buildEnvVars(session: WizardSession): EnvVars {
    const sessionSecret = randomBytes(32).toString('hex');
    const csrfSecret = randomBytes(32).toString('hex');

    const vars: EnvVars = {
      FARMPAL_VERSION: '1.0.0',
      FARMPAL_DATA_DIR_PATH: this.dataDir,
      FARMPAL_INSTALL_DIR_PATH: this.installDir,
      FARMPAL_PROVISIONED: 'true',
      FARMPAL_FARM_NAME: session.farmName || 'My Farm',
      TZ: session.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      FARMPAL_LLM_PROVIDER: session.llmProvider || 'ollama',
      SESSION_SECRET: sessionSecret,
      CSRF_SECRET: csrfSecret,
      FFT_NANO_WEB_ACCESS_MODE: 'localhost',
      HAL_UI_ENABLED: 'true',
      HAL_UI_PORT: '3392',
      CONTAINER_RUNTIME: 'host',
      FFT_NANO_ALLOW_HOST_RUNTIME: '1',
    };

    if (session.wifiSsid) vars.WIFI_SSID = session.wifiSsid;
    if (session.wifiPassword) vars.WIFI_PSK = session.wifiPassword;
    if (session.llmEndpoint) {
      if (session.llmProvider === 'ollama')
        vars.OLLAMA_BASE_URL = session.llmEndpoint;
      else if (session.llmProvider === 'lmstudio')
        vars.LMSTUDIO_BASE_URL = session.llmEndpoint;
    }
    if (session.llmModel) vars.FARMPAL_MODEL = session.llmModel;
    if (session.llmApiKey) {
      if (session.llmProvider === 'openai')
        vars.FARMPAL_OPENAI_API_KEY = session.llmApiKey;
      else if (session.llmProvider === 'anthropic')
        vars.FARMPAL_ANTHROPIC_API_KEY = session.llmApiKey;
      else if (session.llmProvider === 'zai')
        vars.FARMPAL_ZAI_API_KEY = session.llmApiKey;
      else if (session.llmProvider === 'minimax')
        vars.FARMPAL_MINIMAX_API_KEY = session.llmApiKey;
    }
    if (session.telegramEnabled && session.telegramBotToken) {
      vars.TELEGRAM_BOT_TOKEN = session.telegramBotToken;
    }

    return vars;
  }

  private serializeEnv(vars: EnvVars): string {
    const lines: string[] = [
      '# FarmPal Environment Configuration',
      `# Generated at ${new Date().toISOString()}`,
      '# DO NOT EDIT MANUALLY — use the FarmPal setup wizard',
      '',
    ];

    for (const [key, value] of Object.entries(vars)) {
      if (value === undefined || value === null) continue;
      const escaped =
        typeof value === 'string' && /[ #=\n\r]/.test(value)
          ? `"${value.replace(/"/g, '\\"')}"`
          : String(value);
      lines.push(`${key}=${escaped}`);
    }

    return lines.join('\n') + '\n';
  }

  parseEnvFile(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Provisioning Completion
  // -------------------------------------------------------------------------

  completeProvisioning(adminPasswordHash?: string): ProvisioningState {
    const current = this.loadState();
    if (current?.state === 'completed') {
      return current;
    }

    log('info', 'Completing provisioning');

    const tmpFlagPath = `${this.provisionedFlag}.tmp`;
    try {
      fs.mkdirSync(this.dataDir, { recursive: true });
      fs.writeFileSync(
        tmpFlagPath,
        `provisioned at ${new Date().toISOString()}\n`,
        {
          mode: 0o644,
          flag: 'wx',
        },
      );
      fs.renameSync(tmpFlagPath, this.provisionedFlag);
    } catch (err) {
      log('error', 'Failed to create provisioned flag', { error: String(err) });
      throw err;
    }

    const updated: ProvisioningState = {
      ...(current ?? {}),
      state: 'completed',
      completedAt: new Date().toISOString(),
    };
    // Persist the admin credential durably — the wizard session (its other home)
    // is cleared below, so login must read the hash from state.
    if (adminPasswordHash) updated.adminPasswordHash = adminPasswordHash;
    this.saveState(updated);

    this.clearWizardSession();
    this.clearInterruptedCycle();

    log('info', 'Provisioning completed successfully');
    return updated;
  }

  failProvisioning(errorMessage: string): ProvisioningState {
    const current = this.loadState();
    const updated: ProvisioningState = {
      ...(current ?? {}),
      state: 'failed',
      errorMessage,
    };
    this.saveState(updated);
    log('warn', 'Provisioning failed', { error: errorMessage });
    return updated;
  }

  // -------------------------------------------------------------------------
  // Power Loss Recovery (VAL-IMG-014, VAL-IMG-021)
  // -------------------------------------------------------------------------

  checkPowerLossRecovery(): {
    provisioningInterrupted: boolean;
    cycleInterrupted: boolean;
    interruptedState?: ProvisioningState;
  } {
    const state = this.loadState();
    const provisioningInterrupted = state?.state === 'in_progress';
    const cycleInterrupted = fs.existsSync(this.interruptedCycleFile);

    if (provisioningInterrupted) {
      log(
        'info',
        'Power loss detected during provisioning — will restart provisioning',
        {
          startedAt: state?.startedAt,
          lastStep: state?.wizardStep,
        },
      );
    }

    if (cycleInterrupted) {
      log(
        'info',
        'Power loss detected during decision cycle — will re-issue safe states',
      );
    }

    return {
      provisioningInterrupted,
      cycleInterrupted,
      interruptedState: state ?? undefined,
    };
  }

  markCycleInterrupted(cycleId: string, activeRelays: string[]): void {
    try {
      const marker = {
        cycleId,
        activeRelays,
        markedAt: new Date().toISOString(),
      };
      const tmpPath = `${this.interruptedCycleFile}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(marker, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.interruptedCycleFile);
      log('info', 'Decision cycle marked as interrupted', {
        cycleId,
        activeRelays,
      });
    } catch (err) {
      log('warn', 'Failed to mark cycle as interrupted', {
        error: String(err),
      });
    }
  }

  clearInterruptedCycle(): void {
    try {
      if (fs.existsSync(this.interruptedCycleFile)) {
        fs.unlinkSync(this.interruptedCycleFile);
      }
    } catch {
      // Ignore
    }
  }

  loadInterruptedCycle(): {
    cycleId: string;
    activeRelays: string[];
    markedAt: string;
  } | null {
    try {
      if (!fs.existsSync(this.interruptedCycleFile)) return null;
      const raw = fs.readFileSync(this.interruptedCycleFile, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Network Detection (VAL-IMG-016)
  // -------------------------------------------------------------------------

  hasNetworkConnectivity(): boolean {
    try {
      const ethOutput = execSync(
        'ip -4 addr show scope global 2>/dev/null | grep inet || true',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
      );
      if (ethOutput && /inet \d+\.\d+\.\d+\.\d+/.test(ethOutput)) {
        return true;
      }
      try {
        execSync('ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1', { stdio: 'pipe' });
        return true;
      } catch {
        // No external connectivity
      }
      return false;
    } catch {
      return false;
    }
  }

  getPrimaryIpAddress(): string | null {
    try {
      const output = execSync(
        "ip -4 addr show scope global 2>/dev/null | grep inet | awk '{print $2}' | cut -d/ -f1 | head -1",
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
      );
      const ip = output.trim();
      return ip || null;
    } catch {
      return null;
    }
  }

  /**
   * Display IP address on HDMI console (VAL-IMG-011)
   * Writes to all available TTYs
   */
  displayIpOnConsole(ip: string, hostname = 'farmpal'): void {
    try {
      const message = `
==============================================
  FarmPal Network Configuration
==============================================

  Hostname: ${hostname}
  IP Address: ${ip}

  Access FarmPal:
    - Web UI: http://${hostname}.local:3392
    - Or directly: http://${ip}:3392

  Subnet scan (if mDNS doesn't work):
    nmap -sn 192.168.1.0/24 | grep FarmPal

  SSH access:
    ssh farmpal@${ip}

==============================================
`;

      // Try to write to common TTY devices
      const ttys = [
        '/dev/tty1',
        '/dev/tty2',
        '/dev/tty3',
        '/dev/tty4',
        '/dev/tty5',
        '/dev/tty6',
        '/dev/tty',
      ];

      for (const tty of ttys) {
        try {
          if (fs.existsSync(tty)) {
            fs.writeFileSync(tty, message);
          }
        } catch {
          // Ignore individual TTY failures
        }
      }

      log('info', 'Displayed IP on HDMI console', { ip, hostname });
    } catch (err) {
      log('warn', 'Failed to display IP on console', { error: String(err) });
    }
  }

  /**
   * Log network info to network.log for discovery (VAL-IMG-011)
   */
  logNetworkInfo(ip: string, connectionType: string): void {
    try {
      const logFile = path.join(this.dataDir, 'network.log');
      const entry = `${new Date().toISOString()} ${connectionType} ${ip}\n`;
      fs.appendFileSync(logFile, entry);
      log('info', 'Network info logged', { ip, connectionType });
    } catch (err) {
      log('warn', 'Failed to log network info', { error: String(err) });
    }
  }

  /**
   * Get current network state as structured info
   */
  getNetworkInfo(): {
    state: 'connected' | 'disconnected' | 'wifi_available';
    connectionType: 'ethernet' | 'wifi' | 'none';
    primaryIp: string | null;
    hostname: string;
  } {
    const ip = this.getPrimaryIpAddress();
    const hostname = execSync('hostname', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (ip) {
      if (this.isEthernetConnected()) {
        return {
          state: 'connected',
          connectionType: 'ethernet',
          primaryIp: ip,
          hostname,
        };
      }
      if (this.isWifiConnected()) {
        return {
          state: 'connected',
          connectionType: 'wifi',
          primaryIp: ip,
          hostname,
        };
      }
      return {
        state: 'connected',
        connectionType: 'none',
        primaryIp: ip,
        hostname,
      };
    }

    if (this.isWifiInterfaceAvailable()) {
      return {
        state: 'wifi_available',
        connectionType: 'none',
        primaryIp: null,
        hostname,
      };
    }

    return {
      state: 'disconnected',
      connectionType: 'none',
      primaryIp: null,
      hostname,
    };
  }

  isAvahiRunning(): boolean {
    try {
      execSync('pgrep -x avahi-daemon', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Network Detection - Ethernet/WiFi (VAL-IMG-009, VAL-IMG-012)
  // -------------------------------------------------------------------------

  /**
   * Check if Ethernet is connected with a global scope IP (VAL-IMG-009)
   */
  isEthernetConnected(): boolean {
    try {
      const output = execSync(
        'ip -4 addr show scope global 2>/dev/null | grep -E "eth|en|lan" | grep "inet" || true',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
      );
      return /inet \d+\.\d+\.\d+\.\d+/.test(output);
    } catch {
      return false;
    }
  }

  /**
   * Check if WiFi interface exists and is available
   */
  isWifiInterfaceAvailable(): boolean {
    try {
      const output = execSync(
        'ip link show 2>/dev/null | grep -E "wlan|wl" || true',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
      );
      return output.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if WiFi is configured and connected (has global IP)
   */
  isWifiConnected(): boolean {
    try {
      const output = execSync(
        'ip -4 addr show scope global 2>/dev/null | grep -E "wlan|wl" | grep "inet" || true',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
      );
      return /inet \d+\.\d+\.\d+\.\d+/.test(output);
    } catch {
      return false;
    }
  }

  /**
   * Get WiFi interface name (e.g., wlan0)
   */
  getWifiInterface(): string | null {
    try {
      const output = execSync(
        'ip link show 2>/dev/null | grep -E "wlan|wl" | head -1 | awk -F": " \'{print $2}\' || true',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
      );
      const iface = output.trim();
      return iface || null;
    } catch {
      return null;
    }
  }

  /**
   * Scan for available WiFi networks (VAL-IMG-009)
   */
  scanWifiNetworks(): Array<{ ssid: string; signal?: number }> {
    try {
      const iface = this.getWifiInterface();
      if (!iface) {
        log('warn', 'No WiFi interface found for scanning');
        return [];
      }

      // Bring interface up if not already
      try {
        execSync(`ip link set ${iface} up`, { stdio: 'pipe' });
      } catch {
        // May fail if already up
      }

      // Scan using iw
      let scanOutput: string;
      try {
        scanOutput = execSync(`iw dev ${iface} scan 2>/dev/null`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 10000,
        });
      } catch {
        log('warn', 'iw scan failed, trying iwlist');
        scanOutput = execSync(`iwlist ${iface} scan 2>/dev/null`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 10000,
        });
      }

      const networks: Array<{ ssid: string; signal?: number }> = [];

      // Parse SSIDs from iw output
      const ssidRegex = /SSID: (.+)/g;
      let match;
      while ((match = ssidRegex.exec(scanOutput)) !== null) {
        const ssid = match[1].trim();
        if (ssid && ssid.length > 0 && ssid.length <= 32) {
          // Avoid duplicates
          if (!networks.some((n) => n.ssid === ssid)) {
            networks.push({ ssid });
          }
        }
      }

      // Try to extract signal strength if available
      const signalRegex = /signal: (-?\d+)/g;
      let signalIndex = 0;
      while ((match = signalRegex.exec(scanOutput)) !== null) {
        if (signalIndex < networks.length) {
          networks[signalIndex].signal = parseInt(match[1], 10);
          signalIndex++;
        }
      }

      log('info', `WiFi scan found ${networks.length} networks`, {
        networks: networks.map((n) => n.ssid),
      });
      return networks;
    } catch (err) {
      log('warn', 'WiFi scan failed', { error: String(err) });
      return [];
    }
  }

  /**
   * Validate WiFi PSK encoding (VAL-IMG-017)
   * Returns: { valid: true } | { valid: false; error: 'TOO_SHORT' | 'INVALID_CHARS' | 'INVALID_LENGTH' }
   */
  validateWifiPsk(psk: string): { valid: boolean; error?: string } {
    if (!psk || psk.length === 0) {
      return { valid: false, error: 'TOO_SHORT' };
    }

    // WPA2-PSK must be 8-63 ASCII characters OR exactly 64 hex characters
    if (psk.length >= 8 && psk.length <= 63) {
      // Check for valid ASCII printable characters
      const asciiRegex = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;':",./<>?`~\-]+$/;
      if (asciiRegex.test(psk)) {
        return { valid: true };
      } else {
        log(
          'warn',
          'WiFi PSK contains non-ASCII or unsupported special characters',
        );
        return { valid: false, error: 'INVALID_CHARS' };
      }
    } else if (psk.length === 64 && /^[a-fA-F0-9]+$/.test(psk)) {
      // 64 hex characters - raw PSK
      return { valid: true };
    } else if (psk.length < 8) {
      return { valid: false, error: 'TOO_SHORT' };
    } else {
      return { valid: false, error: 'INVALID_CHARS' };
    }
  }

  /**
   * Validate WiFi credentials and test connection (VAL-IMG-012, VAL-IMG-017, VAL-IMG-018)
   * Returns: { success: true, ip: string } | { success: false; error: 'INVALID_SSID' | 'INVALID_PSK' | 'WRONG_PASSWORD' | 'CONNECTION_FAILED' | 'NO_INTERNET' }
   */
  async validateWifiCredentials(
    ssid: string,
    psk: string,
  ): Promise<{
    success: boolean;
    ip?: string;
    error?: string;
  }> {
    log('info', 'Validating WiFi credentials', { ssid });

    // Validate PSK encoding first
    const pskValidation = this.validateWifiPsk(psk);
    if (!pskValidation.valid) {
      if (pskValidation.error === 'INVALID_CHARS') {
        return { success: false, error: 'INVALID_PSK' };
      }
      return { success: false, error: 'INVALID_PSK' };
    }

    // Validate SSID
    if (!ssid || ssid.length === 0 || ssid.length > 32) {
      return { success: false, error: 'INVALID_SSID' };
    }

    const iface = this.getWifiInterface();
    if (!iface) {
      log('error', 'No WiFi interface available');
      return { success: false, error: 'CONNECTION_FAILED' };
    }

    try {
      // Write wpa_supplicant config
      const wpaConfigPath = `/tmp/wpa_test_${Date.now()}.conf`;
      const escapedSsid = ssid.replace(/"/g, '\\"');
      const escapedPsk = psk.replace(/"/g, '\\"');
      // WiFi country code - configurable via env var (default: US)
      const wifiCountry = process.env.WIFI_COUNTRY || 'US';

      const config = `ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=${wifiCountry}

network={
    ssid="${escapedSsid}"
    psk="${escapedPsk}"
    key_mgmt=WPA-PSK
    proto=RSN
    pairwise=CCMP
    group=CCMP
}`;

      fs.writeFileSync(wpaConfigPath, config, { mode: 0o600 });

      // Kill any existing wpa_supplicant for this interface
      try {
        execSync(`pkill -f "wpa_supplicant.*${iface}" 2>/dev/null || true`, {
          stdio: 'pipe',
        });
      } catch {
        // Ignore
      }

      // Bring interface up
      execSync(`ip link set ${iface} up`, { stdio: 'pipe' });

      // Start wpa_supplicant
      try {
        execSync(
          `wpa_supplicant -B -D nl80211,wext -i ${iface} -c ${wpaConfigPath} 2>/dev/null`,
          { stdio: 'pipe', timeout: 10000 },
        );
      } catch (err) {
        log('warn', 'wpa_supplicant start failed', { error: String(err) });
        fs.unlinkSync(wpaConfigPath);
        return { success: false, error: 'CONNECTION_FAILED' };
      }

      // Wait for connection (max 30 seconds)
      let connected = false;
      let ip: string | null = null;
      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check for IP
        try {
          const ipOutput = execSync(
            `ip -4 addr show ${iface} 2>/dev/null | grep "inet" | awk '{print $2}' | cut -d/ -f1 || true`,
            { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
          );
          ip = ipOutput.trim() || null;
          if (ip) {
            connected = true;
            break;
          }
        } catch {
          // No IP yet
        }

        // Check wpa_supplicant status
        try {
          const status = execSync(
            `wpa_cli -i ${iface} status 2>/dev/null | grep wpa_state || true`,
            {
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );
          if (status.includes('COMPLETED')) {
            connected = true;
            break;
          }
          if (status.includes('WRONG_PSK')) {
            execSync(
              `pkill -f "wpa_supplicant.*${iface}" 2>/dev/null || true`,
              {
                stdio: 'pipe',
              },
            );
            fs.unlinkSync(wpaConfigPath);
            log('warn', 'Wrong WiFi password detected');
            return { success: false, error: 'WRONG_PASSWORD' };
          }
        } catch {
          // Status check failed
        }
      }

      // Cleanup
      execSync(`pkill -f "wpa_supplicant.*${iface}" 2>/dev/null || true`, {
        stdio: 'pipe',
      });
      try {
        fs.unlinkSync(wpaConfigPath);
      } catch {
        // Ignore
      }

      if (!connected || !ip) {
        log('warn', 'WiFi connection timeout');
        return { success: false, error: 'CONNECTION_FAILED' };
      }

      // Test internet connectivity
      try {
        execSync('ping -c 2 -W 3 8.8.8.8 >/dev/null 2>&1', {
          stdio: 'pipe',
          timeout: 10000,
        });
      } catch {
        // No internet - could be captive portal
        log('warn', 'WiFi connected but no internet access');
        return { success: false, error: 'NO_INTERNET' };
      }

      log('info', 'WiFi credentials validated successfully', { ssid, ip });
      return { success: true, ip };
    } catch (err) {
      log('error', 'WiFi validation failed', { error: String(err) });
      return { success: false, error: 'CONNECTION_FAILED' };
    }
  }

  // -------------------------------------------------------------------------
  // Concurrent Provisioning Guard (VAL-IMG-020)
  // -------------------------------------------------------------------------

  acquireProvisioningLock(): () => void {
    const pid = process.pid;
    const lockContent = JSON.stringify({
      pid,
      startedAt: new Date().toISOString(),
    });

    try {
      fs.writeFileSync(this.lockFile, lockContent, { mode: 0o644, flag: 'wx' });
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
        try {
          const existing = JSON.parse(fs.readFileSync(this.lockFile, 'utf-8'));
          try {
            process.kill(existing.pid, 0);
            throw new Error('PROVISIONING_ALREADY_IN_PROGRESS');
          } catch {
            // Stale lock - remove and retry
            fs.unlinkSync(this.lockFile);
            fs.writeFileSync(this.lockFile, lockContent, {
              mode: 0o644,
              flag: 'wx',
            });
          }
        } catch (retryErr: unknown) {
          if (
            (retryErr as Error).message === 'PROVISIONING_ALREADY_IN_PROGRESS'
          ) {
            throw retryErr;
          }
        }
      } else {
        throw err;
      }
    }

    log('info', 'Provisioning lock acquired', { pid });
    return () => {
      try {
        fs.unlinkSync(this.lockFile);
        log('info', 'Provisioning lock released', { pid });
      } catch {
        // Ignore release failures
      }
    };
  }

  // -------------------------------------------------------------------------
  // Reset Provisioning (VAL-IMG-015)
  // -------------------------------------------------------------------------

  resetProvisioning(): void {
    try {
      for (const file of [this.envFile, this.provisionedFlag, this.stateFile]) {
        try {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        } catch {
          /* ignore */
        }
      }
      this.clearWizardSession();
      log('info', 'Provisioning state reset — ready for re-provisioning');
    } catch (err) {
      log('error', 'Failed to reset provisioning state', {
        error: String(err),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

let _instance: ProvisioningManager | null = null;

export function getProvisioningManager(): ProvisioningManager {
  if (!_instance) {
    _instance = new ProvisioningManager();
  }
  return _instance;
}

// ---------------------------------------------------------------------------
// Convenience Functions
// ---------------------------------------------------------------------------

export function needsProvisioning(): boolean {
  return getProvisioningManager().isUnprovisioned();
}

export function handleStartupRecovery(): {
  provisioningInterrupted: boolean;
  cycleInterrupted: boolean;
  provisioningState?: ProvisioningState;
} {
  const mgr = getProvisioningManager();
  const result = mgr.checkPowerLossRecovery();
  return result;
}

export function resetProvisioning(): void {
  getProvisioningManager().resetProvisioning();
}
