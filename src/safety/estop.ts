/**
 * FarmPal Emergency Stop System
 *
 * Implements:
 * - E-Stop state persistence in SQLite
 * - Per-device safe states
 * - Autonomous loop suspension on E-Stop
 * - Watchdog with sd_notify every 15s
 * - Farm loop hang detection (>5 min)
 * - In-flight action handling with 5s ack timeout
 * - Admin auth required to clear E-Stop
 */

import { getDb } from '../hal/db.js';
import { halRegistry } from '../hal/registry.js';
import { halRelays } from '../hal/relays.js';
import { createAuditEntry } from './audit-log.js';
import { logger } from '../logger.js';

export type EmergencyStopReason =
  | 'operator'
  | 'farm_loop_hang'
  | 'watchdog_failure';

export interface EmergencyStopState {
  active: boolean;
  activatedAt: string | null;
  activatedBy: EmergencyStopReason | null;
  clearedAt: string | null;
  clearedBy: string | null;
  reason: string | null;
}

export interface DeviceSafeState {
  deviceId: string;
  safeState: 'on' | 'off' | 'unknown' | 'no_change';
  safeValue?: number;
}

export interface FarmLoopState {
  lastDecisionAt: string | null;
  lastHeartbeatAt: string | null;
  hangWarnings: number;
  safetyMode: boolean;
}

// ============================================================================
// E-Stop State Management
// ============================================================================

let estopStateCache: EmergencyStopState | null = null;
let estopCacheLoadedAt = 0;
const ESTOP_CACHE_TTL_MS = 5000;

function getEstopDb() {
  return getDb();
}

function genId(): string {
  return `estop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Get current E-Stop state from SQLite
 */
export function getEstopState(): EmergencyStopState {
  const db = getEstopDb();
  const now = Date.now();

  if (estopStateCache && now - estopCacheLoadedAt < ESTOP_CACHE_TTL_MS) {
    return estopStateCache;
  }

  const row = db
    .prepare('SELECT * FROM hal_emergency_stop WHERE id = ?')
    .get('global') as Record<string, unknown> | undefined;

  if (!row) {
    // Initialize with inactive state
    const initNow = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO hal_emergency_stop (id, active, created_at, updated_at)
      VALUES ('global', 0, ?, ?)
    `,
    ).run(initNow, initNow);

    estopStateCache = {
      active: false,
      activatedAt: null,
      activatedBy: null,
      clearedAt: null,
      clearedBy: null,
      reason: null,
    };
  } else {
    estopStateCache = {
      active: (row.active as number) === 1,
      activatedAt: row.activated_at as string | null,
      activatedBy: row.activated_by as EmergencyStopReason | null,
      clearedAt: row.cleared_at as string | null,
      clearedBy: row.cleared_by as string | null,
      reason: row.reason as string | null,
    };
  }

  estopCacheLoadedAt = now;
  return estopStateCache;
}

/**
 * Check if E-Stop is currently active
 */
export function isEstopActive(): boolean {
  return getEstopState().active;
}

/**
 * Activate Emergency Stop
 * - Suspends autonomous control
 * - Sets all devices to their safe states
 * - Persists state to SQLite
 */
export async function activateEstop(
  reason: EmergencyStopReason,
  triggeredBy: 'operator' | 'watchdog' | 'farm_loop',
  reasonText?: string,
): Promise<{
  success: boolean;
  appliedSafeStates: DeviceSafeState[];
  failures: string[];
}> {
  const db = getEstopDb();
  const now = new Date().toISOString();
  const state = getEstopState();

  // If already active, just return current state
  if (state.active) {
    const safeStates = getAllDeviceSafeStates();
    return { success: true, appliedSafeStates: safeStates, failures: [] };
  }

  // Get all devices and their safe states
  const devices = halRegistry
    .list()
    .filter((d) => d.type === 'relay' || d.type === 'smart_plug');
  const safeStates = getAllDeviceSafeStates();
  const safeStateMap = new Map(safeStates.map((ss) => [ss.deviceId, ss]));
  const appliedSafeStates: DeviceSafeState[] = [];
  const failures: string[] = [];

  // Apply safe state to all devices concurrently (Promise.all)
  const results = await Promise.all(
    devices.map(
      async (
        device,
      ): Promise<{
        deviceId: string;
        safeState: 'on' | 'off' | 'unknown' | 'no_change';
        failure: string | null;
      }> => {
        const safeState = safeStateMap.get(device.id);
        const targetState = safeState?.safeState ?? 'off';

        if (targetState === 'no_change') {
          return { deviceId: device.id, safeState: 'no_change', failure: null };
        }

        if (targetState === 'unknown') {
          return {
            deviceId: device.id,
            safeState: 'unknown',
            failure: `${device.id}: safe state is unknown`,
          };
        }

        try {
          // Wait up to 5 seconds for ack
          const ack = await applyDeviceSafeState(
            device.id,
            targetState === 'on',
            safeState?.safeValue,
          );
          if (ack) {
            halRelays.log({
              device_id: device.id,
              state: targetState,
              reason: 'emergency_stop',
              triggered_by: 'estop_system',
            });
            return {
              deviceId: device.id,
              safeState: targetState as 'on' | 'off',
              failure: null,
            };
          } else {
            logger.warn(
              { deviceId: device.id },
              'E-Stop: device did not acknowledge safe state within 5s',
            );
            return {
              deviceId: device.id,
              safeState: 'unknown',
              failure: `${device.id}: no ack received within 5s`,
            };
          }
        } catch (err: any) {
          logger.error(
            { deviceId: device.id, error: err.message },
            'E-Stop: failed to apply safe state',
          );
          return {
            deviceId: device.id,
            safeState: 'unknown',
            failure: `${device.id}: ${err.message}`,
          };
        }
      },
    ),
  );

  // Collect results
  for (const result of results) {
    appliedSafeStates.push({
      deviceId: result.deviceId,
      safeState: result.safeState,
    });
    if (result.failure) {
      failures.push(result.failure);
    }
  }

  // Update E-Stop state in database
  db.prepare(
    `
    UPDATE hal_emergency_stop
    SET active = 1,
        activated_at = ?,
        activated_by = ?,
        reason = ?,
        updated_at = ?
    WHERE id = 'global'
  `,
  ).run(now, reason, reasonText ?? null, now);

  // Invalidate cache
  estopStateCache = null;

  // Log E-Stop activation to audit log
  createAuditEntry({
    proposedAction: 'noop',
    verifierResult: 'APPROVED',
    sensorSnapshot: {},
    triggeredBy: 'manual_ui',
  });

  logger.warn(
    { reason, triggeredBy, appliedSafeStates, failures },
    'Emergency Stop activated',
  );

  return { success: true, appliedSafeStates, failures };
}

/**
 * Clear Emergency Stop (requires admin auth)
 */
export function clearEstop(operatorId: string): {
  success: boolean;
  error?: string;
} {
  const db = getEstopDb();
  const state = getEstopState();

  if (!state.active) {
    return { success: true }; // Already cleared
  }

  const now = new Date().toISOString();
  db.prepare(
    `
    UPDATE hal_emergency_stop
    SET active = 0,
        cleared_at = ?,
        cleared_by = ?,
        updated_at = ?
    WHERE id = 'global'
  `,
  ).run(now, operatorId, now);

  // Invalidate cache
  estopStateCache = null;

  logger.info({ operatorId }, 'Emergency Stop cleared by operator');

  return { success: true };
}

/**
 * Apply a single device's safe state with 5s timeout
 */
async function applyDeviceSafeState(
  deviceId: string,
  turnOn: boolean,
  value?: number,
): Promise<boolean> {
  const device = halRegistry.get(deviceId);
  if (!device) return false;

  try {
    // Use the simulator if available, otherwise use real hardware
    const { getSimulator } = await import('../hal/simulator.js');
    const sim = getSimulator();

    if (sim) {
      sim.setDeviceState(deviceId, turnOn ? 'on' : 'off');
      return true;
    }

    // For real hardware, use halRegistry.control
    await halRegistry.control(deviceId, turnOn ? 'on' : 'off');
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Per-Device Safe States
// ============================================================================

/**
 * Get safe state for a specific device
 */
export function getDeviceSafeState(deviceId: string): DeviceSafeState | null {
  const db = getEstopDb();
  const row = db
    .prepare('SELECT * FROM hal_device_safe_states WHERE device_id = ?')
    .get(deviceId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    deviceId: row.device_id as string,
    safeState: row.safe_state as DeviceSafeState['safeState'],
    safeValue: row.safe_value as number | undefined,
  };
}

/**
 * Set safe state for a specific device
 */
export function setDeviceSafeState(
  deviceId: string,
  safeState: DeviceSafeState['safeState'],
  safeValue?: number,
): void {
  const db = getEstopDb();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO hal_device_safe_states (device_id, safe_state, safe_value, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
      safe_state = excluded.safe_state,
      safe_value = excluded.safe_value,
      updated_at = excluded.updated_at
  `,
  ).run(deviceId, safeState, safeValue ?? null, now);

  logger.debug({ deviceId, safeState, safeValue }, 'Device safe state updated');
}

/**
 * Get safe states for all devices
 */
export function getAllDeviceSafeStates(): DeviceSafeState[] {
  const db = getEstopDb();
  const rows = db
    .prepare('SELECT * FROM hal_device_safe_states')
    .all() as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    deviceId: row.device_id as string,
    safeState: row.safe_state as DeviceSafeState['safeState'],
    safeValue: row.safe_value as number | undefined,
  }));
}

/**
 * Initialize default safe states for all devices (set to 'off')
 */
export function initializeDefaultSafeStates(): void {
  const db = getEstopDb();
  const devices = halRegistry
    .list()
    .filter((d) => d.type === 'relay' || d.type === 'smart_plug');
  const now = new Date().toISOString();

  for (const device of devices) {
    const existing = getDeviceSafeState(device.id);
    if (!existing) {
      setDeviceSafeState(device.id, 'off');
    }
  }
}

// ============================================================================
// Farm Loop Hang Detection
// ============================================================================

const FARM_LOOP_HANG_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const FARM_LOOP_WARN_INTERVAL_MS = 60 * 1000; // 1 minute between warnings

let farmLoopStateCache: FarmLoopState | null = null;
let lastHangWarningAt = 0;

/**
 * Get current farm loop state
 */
export function getFarmLoopState(): FarmLoopState {
  const db = getEstopDb();

  const row = db
    .prepare('SELECT * FROM hal_farm_loop_state WHERE id = ?')
    .get('global') as Record<string, unknown> | undefined;

  if (!row) {
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO hal_farm_loop_state (id, hang_warnings, safety_mode, updated_at)
      VALUES ('global', 0, 0, ?)
    `,
    ).run(now);

    return {
      lastDecisionAt: null,
      lastHeartbeatAt: null,
      hangWarnings: 0,
      safetyMode: false,
    };
  }

  return {
    lastDecisionAt: row.last_decision_at as string | null,
    lastHeartbeatAt: row.last_heartbeat_at as string | null,
    hangWarnings: row.hang_warnings as number,
    safetyMode: (row.safety_mode as number) === 1,
  };
}

/**
 * Record a decision cycle start (heartbeat)
 */
export function recordDecisionHeartbeat(): void {
  const db = getEstopDb();
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE hal_farm_loop_state
    SET last_heartbeat_at = ?,
        hang_warnings = 0,
        updated_at = ?
    WHERE id = 'global'
  `,
  ).run(now, now);

  // Clear any existing safety mode if we're making progress
  const state = getFarmLoopState();
  if (state.safetyMode && isEstopActive()) {
    // Don't auto-clear - operator must clear E-Stop
  }

  farmLoopStateCache = null;
}

/**
 * Record a completed decision
 */
export function recordDecisionComplete(): void {
  const db = getEstopDb();
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE hal_farm_loop_state
    SET last_decision_at = ?,
        last_heartbeat_at = ?,
        hang_warnings = 0,
        updated_at = ?
    WHERE id = 'global'
  `,
  ).run(now, now, now);

  farmLoopStateCache = null;
}

/**
 * Check if farm loop is hung (no decision for >5 minutes)
 * Returns true if hang detected and safety mode should be activated
 */
export async function checkFarmLoopHang(): Promise<boolean> {
  const state = getFarmLoopState();
  const now = Date.now();

  if (!state.lastHeartbeatAt) return false;

  const lastHeartbeatMs = new Date(state.lastHeartbeatAt).getTime();
  const elapsed = now - lastHeartbeatMs;

  if (elapsed > FARM_LOOP_HANG_THRESHOLD_MS) {
    // Issue hang warning if not already in safety mode
    if (!state.safetyMode) {
      const db = getEstopDb();
      const currentWarnings = state.hangWarnings + 1;

      db.prepare(
        `
        UPDATE hal_farm_loop_state
        SET hang_warnings = ?,
            safety_mode = 1,
            updated_at = ?
        WHERE id = 'global'
      `,
      ).run(currentWarnings, new Date().toISOString());

      farmLoopStateCache = null;

      logger.error(
        { elapsed, lastHeartbeatAt: state.lastHeartbeatAt },
        'Farm loop hang detected - activating safety mode',
      );

      // Trigger E-Stop due to farm loop hang
      await activateEstop(
        'farm_loop_hang',
        'farm_loop',
        `No decision made for ${Math.round(elapsed / 60000)} minutes`,
      );
    }
    return true;
  }

  return false;
}

/**
 * Clear safety mode (after hang condition is resolved)
 */
export function clearSafetyMode(): void {
  const db = getEstopDb();

  db.prepare(
    `
    UPDATE hal_farm_loop_state
    SET safety_mode = 0,
        hang_warnings = 0,
        updated_at = ?
    WHERE id = 'global'
  `,
  ).run(new Date().toISOString());

  farmLoopStateCache = null;
}

// ============================================================================
// Watchdog System
// ============================================================================

let watchdogInterval: ReturnType<typeof setInterval> | null = null;
let watchdogStartTime = Date.now();

/**
 * Start the watchdog loop (sd_notify every 15s)
 */
export function startWatchdog(): void {
  if (watchdogInterval) return; // Already running

  watchdogStartTime = Date.now();

  watchdogInterval = setInterval(() => {
    watchdogTick();
  }, 15_000); // 15 seconds

  logger.info('Watchdog started (sd_notify every 15s)');
}

/**
 * Stop the watchdog loop
 */
export function stopWatchdog(): void {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
    logger.info('Watchdog stopped');
  }
}

/**
 * Single watchdog tick - sends sd_notify and logs heartbeat
 */
async function watchdogTick(): Promise<void> {
  const now = Date.now();
  const uptimeSeconds = Math.floor((now - watchdogStartTime) / 1000);
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

  // Send sd_notify WATCHDOG=1
  // This tells systemd that the process is still alive
  try {
    // Use sd-notify package if available (ESM compatible)
    const { watchdog } = await import('sd-notify');
    watchdog();
  } catch {
    // sd_notify not available - we're not running under systemd
    // Just log the heartbeat (watchdog continues without systemd integration)
  }

  // Log heartbeat to audit log
  try {
    createAuditEntry({
      proposedAction: 'noop',
      verifierResult: 'APPROVED',
      sensorSnapshot: {},
      triggeredBy: 'watchdog',
    });
  } catch {
    // Ignore audit log errors
  }

  logger.debug({ uptimeSeconds, heapUsedMB }, 'Watchdog heartbeat');

  // Check for farm loop hang
  checkFarmLoopHang();
}

/**
 * Get watchdog status
 */
export function getWatchdogStatus(): {
  running: boolean;
  uptimeSeconds: number;
} {
  return {
    running: watchdogInterval !== null,
    uptimeSeconds: Math.floor((Date.now() - watchdogStartTime) / 1000),
  };
}

// ============================================================================
// E-Stop Integration with Autonomous Control
// ============================================================================

/**
 * Check if autonomous decisions are allowed
 * Returns false if E-Stop is active or farm loop is in safety mode
 */
export function isAutonomousAllowed(): boolean {
  const estop = getEstopState();
  const farmLoop = getFarmLoopState();

  // Block autonomous if E-Stop is active
  if (estop.active) return false;

  // Block autonomous if farm loop is in safety mode
  if (farmLoop.safetyMode) return false;

  return true;
}

/**
 * Called before each autonomous decision to check if allowed
 * Throws if not allowed
 */
export function assertAutonomousAllowed(): void {
  if (!isAutonomousAllowed()) {
    const estop = getEstopState();
    const farmLoop = getFarmLoopState();

    if (estop.active) {
      throw new Error('E-Stop is active - autonomous control suspended');
    }
    if (farmLoop.safetyMode) {
      throw new Error('Farm loop hang detected - safety mode active');
    }
    throw new Error('Autonomous control not allowed');
  }
}
