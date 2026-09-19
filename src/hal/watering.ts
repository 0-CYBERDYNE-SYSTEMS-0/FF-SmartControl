/**
 * FarmPal Watering Control (D6, launch-gated)
 *
 * Watering means switching the customer's EXISTING irrigation hardware —
 * pumps and valves on smart plugs or relays. There is no new hardware
 * category: the same registry devices, driven through the same safety
 * chokepoint as every other actuation.
 *
 * Launch gate (DIRECTION.md D6): watering ships in v1.0 only if the
 * soil-probe golden kit passes its 7-day soak test. `FARMPAL_WATERING=1`
 * is how launch flips the gate. While off, start requests fail with a
 * clear "watering is launch-gated" error and nothing actuates.
 *
 * Safety model:
 * - Every actuation — manual or autonomous, start, stop, or interlock
 *   trip — flows through `executeActuation()` in src/safety/verifier.ts
 *   so the E-stop gate, policy rules, and audit trail all apply. There is
 *   no other path to water.
 * - The gate blocks turning water ON. Turning it OFF (operator stop or
 *   interlock trip) stays available in every state — the launch gate
 *   exists to keep an unsoaked feature from switching water on, never to
 *   prevent it being switched off.
 * - Max-run interlock: a watering run still on past
 *   `FARMPAL_WATERING_MAX_MIN` (default 30) is switched off through the
 *   same chokepoint with `triggeredBy: 'watchdog'` and source 'manual'
 *   (violations on the way OFF are advisory, so a stuck policy rule can
 *   never keep water running) and logged to the audit trail.
 */

import { halRegistry } from './registry.js';
import { executeActuation } from '../safety/verifier.js';
import type { TriggeredBy } from '../safety/audit-log.js';
import { logger } from '../logger.js';

export type WateringSource = 'manual' | 'autonomous';

export interface WateringRun {
  deviceId: string;
  /** Epoch ms when the run started (injectable clock, for tests). */
  startedAt: number;
  triggeredBy: TriggeredBy;
  source: WateringSource;
  decisionId?: string;
}

export interface WateringStartResult {
  started: boolean;
  reason: string;
  run?: WateringRun;
  maxRunMinutes?: number;
  violations?: { ruleIds: string[]; reason: string | null };
  auditEntryId?: string;
}

export interface WateringStopResult {
  stopped: boolean;
  reason: string;
  auditEntryId?: string;
}

export interface InterlockTrip {
  deviceId: string;
  ranForMinutes: number;
  stopped: boolean;
  reason: string;
}

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);
const DEFAULT_WATERING_MAX_MIN = 30;

/** Live watering runs keyed by device id. */
const activeRuns = new Map<string, WateringRun>();

let nowFn: () => number = () => Date.now();

export function isWateringEnabled(): boolean {
  return TRUTHY.has((process.env.FARMPAL_WATERING ?? '').trim().toLowerCase());
}

export function getWateringMaxRunMinutes(): number {
  const raw = Number(process.env.FARMPAL_WATERING_MAX_MIN);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_WATERING_MAX_MIN;
}

export function getActiveWateringRuns(): WateringRun[] {
  return [...activeRuns.values()];
}

/**
 * Start watering on an irrigation device (pump/valve on a smart plug or
 * relay). Gated by FARMPAL_WATERING; actuates only through the verifier
 * chokepoint.
 */
export async function startWatering(params: {
  deviceId: string;
  source?: WateringSource;
  triggeredBy?: TriggeredBy;
  decisionId?: string;
}): Promise<WateringStartResult> {
  const { deviceId } = params;
  const source: WateringSource = params.source ?? 'manual';
  const triggeredBy: TriggeredBy =
    params.triggeredBy ?? (source === 'manual' ? 'manual_ui' : 'agent');

  // 1. Launch gate (D6). Blocks the actuation before anything is verified.
  if (!isWateringEnabled()) {
    return {
      started: false,
      reason:
        'watering is launch-gated (D6): it ships only after the soil-probe golden kit passes its 7-day soak. Set FARMPAL_WATERING=1 to enable. Nothing actuated.',
    };
  }

  // 2. The device must exist and be something water can plausibly run
  //    through: smart plugs and relays only, never sensors or cameras.
  const device = halRegistry.get(deviceId);
  if (!device) {
    return { started: false, reason: `device ${deviceId} not found` };
  }
  if (device.type !== 'smart_plug' && device.type !== 'relay') {
    return {
      started: false,
      reason: `device ${deviceId} is a ${device.type}; watering drives smart plugs and relays only`,
    };
  }

  // 3. One tracked run per device.
  const existing = activeRuns.get(deviceId);
  if (existing) {
    return {
      started: false,
      reason: `watering is already running for ${deviceId}`,
      run: existing,
      maxRunMinutes: getWateringMaxRunMinutes(),
    };
  }

  // 4. The chokepoint: e-stop gate, policy verification, execution,
  //    re-verification, audit.
  const outcome = await executeActuation({
    deviceId,
    action: 'on',
    triggeredBy,
    source,
    decisionId: params.decisionId,
  });

  if (!outcome.executed) {
    return {
      started: false,
      reason: outcome.reason,
      violations: outcome.violations,
      auditEntryId: outcome.auditEntry?.id,
    };
  }

  const run: WateringRun = {
    deviceId,
    startedAt: nowFn(),
    triggeredBy,
    source,
    decisionId: params.decisionId,
  };
  activeRuns.set(deviceId, run);
  logger.info(
    {
      deviceId,
      source,
      triggeredBy,
      maxRunMinutes: getWateringMaxRunMinutes(),
    },
    'watering started',
  );
  ensureInterlockTimer();

  return {
    started: true,
    reason: outcome.reason,
    run,
    maxRunMinutes: getWateringMaxRunMinutes(),
    violations: outcome.violations,
    auditEntryId: outcome.auditEntry?.id,
  };
}

/**
 * Stop watering on a device. Always allowed — including while the launch
 * gate is off — because switching water OFF can only reduce risk. Still
 * goes through the chokepoint, so an E-stop (whose own safe states handle
 * shutoff) or a hard failure is reported honestly instead of pretending.
 */
export async function stopWatering(params: {
  deviceId: string;
  source?: WateringSource;
  triggeredBy?: TriggeredBy;
  decisionId?: string;
}): Promise<WateringStopResult> {
  const { deviceId } = params;
  const run = activeRuns.get(deviceId);
  const source: WateringSource = params.source ?? run?.source ?? 'manual';
  const triggeredBy: TriggeredBy =
    params.triggeredBy ?? run?.triggeredBy ?? 'manual_ui';

  const outcome = await executeActuation({
    deviceId,
    action: 'off',
    triggeredBy,
    source,
    decisionId: params.decisionId ?? run?.decisionId,
  });

  if (!outcome.executed) {
    return {
      stopped: false,
      reason: outcome.reason,
      auditEntryId: outcome.auditEntry?.id,
    };
  }

  activeRuns.delete(deviceId);
  logger.info({ deviceId, source, triggeredBy }, 'watering stopped');
  stopInterlockTimerIfIdle();

  return {
    stopped: true,
    reason: run
      ? outcome.reason
      : `no tracked watering run for ${deviceId}; off issued through the safety chokepoint`,
    auditEntryId: outcome.auditEntry?.id,
  };
}

/**
 * Max-run interlock check. Trips every tracked run that has been on for
 * at least FARMPAL_WATERING_MAX_MIN and switches it off through the
 * chokepoint. Safe to call any number of times; called automatically by
 * the internal 15s poll and usable from external watchdogs/tests with an
 * injected clock.
 */
export async function checkWateringInterlock(
  nowMs: number = nowFn(),
): Promise<InterlockTrip[]> {
  const maxMs = getWateringMaxRunMinutes() * 60_000;
  const trips: InterlockTrip[] = [];

  for (const run of [...activeRuns.values()]) {
    const ranMs = nowMs - run.startedAt;
    if (ranMs < maxMs) continue;

    const outcome = await executeActuation({
      deviceId: run.deviceId,
      action: 'off',
      triggeredBy: 'watchdog',
      source: 'manual',
      decisionId: run.decisionId,
    });

    // Drop the run either way: on success it is finished; on refusal
    // (E-stop latched) the E-stop safe states own shutoff from here.
    activeRuns.delete(run.deviceId);

    const trip: InterlockTrip = {
      deviceId: run.deviceId,
      ranForMinutes: Math.round((ranMs / 60_000) * 10) / 10,
      stopped: outcome.executed,
      reason: outcome.reason,
    };
    trips.push(trip);
    logger.warn(trip, 'watering max-run interlock tripped');
  }

  stopInterlockTimerIfIdle();
  return trips;
}

// ============================================================
// Internal 15s poll so the interlock enforces itself in the
// running host without any wiring in the caller. Unref'd so it
// never holds the process open; cleared when no runs remain.
// ============================================================

const INTERLOCK_POLL_MS = 15_000;
let interlockTimer: ReturnType<typeof setInterval> | null = null;

function ensureInterlockTimer(): void {
  if (interlockTimer) return;
  interlockTimer = setInterval(() => {
    void checkWateringInterlock();
  }, INTERLOCK_POLL_MS);
  interlockTimer.unref();
}

function stopInterlockTimerIfIdle(): void {
  if (interlockTimer && activeRuns.size === 0) {
    clearInterval(interlockTimer);
    interlockTimer = null;
  }
}

// ============================================================
// Test hooks (same style as _closeDbForTesting)
// ============================================================

export function _setWateringClockForTesting(fn: () => number): void {
  nowFn = fn;
}

export function _resetWateringForTesting(): void {
  activeRuns.clear();
  nowFn = () => Date.now();
  if (interlockTimer) {
    clearInterval(interlockTimer);
    interlockTimer = null;
  }
}
