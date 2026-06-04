/**
 * FarmPal Safety Verifier
 *
 * Wraps the policy engine and provides the safety gate for all autonomous decisions.
 * Verifier is the ONLY path to hardware - no bypass exists.
 *
 * Flow: LLM proposes → Verifier evaluates against rules + sensor snapshot → APPROVED/DENIED → hardware only on APPROVED
 */

import { halRegistry } from '../hal/registry.js';
import { halSensors } from '../hal/sensors.js';
import { halRelays } from '../hal/relays.js';
import { getDb } from '../hal/db.js';
import {
  loadSafetyRules,
  evaluateAction,
  computeOutcome,
  type ProposedAction,
  type SensorSnapshot,
  type DeviceState,
  type RelayToggle,
  type SafetyRule,
} from './policy-engine.js';
import {
  createAuditEntry,
  updateAuditExecution,
  type VerifierResult,
  type TriggeredBy,
  type AuditLogEntry,
} from './audit-log.js';
import { MetricType } from '../hal/types.js';

export type { VerifierResult, TriggeredBy };

export interface VerifyResult {
  approved: boolean;
  result: VerifierResult;
  reason: string | null;
  conflictingRuleIds: string[];
  auditEntry: AuditLogEntry;
  sensorSnapshot: SensorSnapshot;
}

export interface VerifyParams {
  action: ProposedAction;
  triggeredBy: TriggeredBy;
  decisionId?: string;
  sensorSnapshot?: SensorSnapshot;
}

/**
 * Capture a point-in-time sensor snapshot for audit purposes.
 * Should be called within 1s of verification.
 */
export function captureSensorSnapshot(): SensorSnapshot {
  const snapshot: SensorSnapshot = {};
  const devices = halRegistry.list().filter((d) => d.type === 'sensor');

  for (const device of devices) {
    snapshot[device.id] = {} as Record<MetricType, number>;
    for (const metric of [
      'temperature',
      'humidity',
      'soil_moisture',
      'light',
      'co2',
      'water_level',
      'ph',
      'weight',
    ] as MetricType[]) {
      const reading = halSensors.latest(device.id, metric);
      if (reading && typeof reading.value === 'number') {
        (snapshot[device.id] as Record<string, number>)[metric] = reading.value;
      }
    }
  }

  return snapshot;
}

/**
 * Get recent relay toggles for a device
 */
function getRecentToggles(deviceId: string): RelayToggle[] {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const entries = halRelays.latest(deviceId);

  if (!entries) return [];

  // Get from hal_relays table directly
  const db = getDb();
  const rows = db
    .prepare(
      `
    SELECT device_id, state, switched_at
    FROM hal_relays
    WHERE device_id = ? AND switched_at >= ?
    ORDER BY switched_at DESC
    LIMIT 100
  `,
    )
    .all(deviceId, oneHourAgo) as Array<{
    device_id: string;
    state: 'on' | 'off';
    switched_at: string;
  }>;

  return rows.map((r) => ({
    deviceId: r.device_id,
    state: r.state,
    switchedAt: r.switched_at,
  }));
}

/**
 * Get current device state
 */
function getDeviceState(deviceId: string): DeviceState | null {
  const device = halRegistry.get(deviceId);
  if (!device) return null;
  return {
    id: device.id,
    type: device.type,
    label: device.label,
    lastState: device.last_state,
    lastValue: device.last_value,
  };
}

/**
 * Verify a proposed action against safety rules.
 * Returns VERIFIER result with audit log entry.
 *
 * This is the SOLE gate to hardware - no bypass allowed.
 */
export async function verifyAction(
  params: VerifyParams,
): Promise<VerifyResult> {
  const { action, triggeredBy, decisionId } = params;
  const now = Date.now();

  // Capture sensor snapshot at verification time
  const sensorSnapshot = params.sensorSnapshot ?? captureSensorSnapshot();

  // Get device state
  const deviceState = action.deviceId ? getDeviceState(action.deviceId) : null;

  // Get recent relay toggles for this device (if it's an actuator)
  const recentToggles = action.deviceId
    ? getRecentToggles(action.deviceId)
    : [];

  // Load safety rules from SQLite
  const rules = loadSafetyRules();

  // Evaluate against policy engine
  const violations = evaluateAction(
    action,
    sensorSnapshot,
    deviceState,
    recentToggles,
    rules,
    now,
  );
  const outcome = computeOutcome(violations);

  // Determine verifier result
  let result: VerifierResult;
  if (outcome.approved) {
    result = 'APPROVED';
  } else if (outcome.deniedReason) {
    result = 'DENIED_WITH_REASON';
  } else {
    result = 'DENIED';
  }

  // Create audit entry
  const auditEntry = createAuditEntry({
    deviceId: action.deviceId ?? null,
    proposedAction: action.decision,
    verifierResult: result,
    deniedReason: outcome.deniedReason,
    conflictingRuleIds:
      outcome.conflictingRuleIds.length > 0 ? outcome.conflictingRuleIds : null,
    sensorSnapshot,
    decisionId: decisionId ?? null,
    triggeredBy,
    executed: false, // Will be updated if execution happens
  });

  return {
    approved: outcome.approved,
    result,
    reason: outcome.deniedReason,
    conflictingRuleIds: outcome.conflictingRuleIds,
    auditEntry,
    sensorSnapshot,
  };
}

/**
 * Record that an action was executed (update audit entry)
 */
export async function recordExecution(
  auditId: string,
  executedState: 'on' | 'off',
): Promise<void> {
  updateAuditExecution({
    id: auditId,
    executed: true,
    executedState,
  });
}

/**
 * Record that an action was interrupted mid-execution (rollback)
 */
export async function recordInterruption(
  auditId: string,
  interruptedAtStep: number,
  revertedSteps: number,
): Promise<void> {
  updateAuditExecution({
    id: auditId,
    executed: false,
    interrupted: true,
    interruptedAtStep,
    revertedSteps,
  });
}

// ============================================================
// Legacy compatibility - original hard-coded safety rules
// These are kept as last-resort defaults before LLM fallback
// ============================================================

const HARD_SAFETY_RULES_LEGACY = [
  {
    id: 'exhaust_temp',
    description: 'Never turn off exhaust if temperature > 30C',
    check: (ctx: {
      proposedAction: ProposedAction;
      deviceState: DeviceState | null;
      sensorSnapshot: SensorSnapshot;
    }) => {
      if (
        ctx.proposedAction.decision !== 'turn_off' ||
        !ctx.deviceState ||
        !['exhaust', 'fan'].some((t) =>
          ctx.deviceState!.id.toLowerCase().includes(t),
        )
      ) {
        return { pass: true, message: 'not an exhaust fan shutdown' };
      }

      // Check all temperature sensors
      let maxTemp: number | null = null;
      for (const [deviceId, metrics] of Object.entries(ctx.sensorSnapshot)) {
        if (metrics.temperature !== undefined) {
          maxTemp =
            maxTemp === null
              ? metrics.temperature
              : Math.max(maxTemp, metrics.temperature);
        }
      }

      return {
        pass: maxTemp === null || maxTemp <= 30,
        message:
          maxTemp === null
            ? 'Temperature: unavailable'
            : `Temperature: ${maxTemp}C`,
      };
    },
  },
  {
    id: 'circulation_humidity',
    description: 'Never turn off circulation if humidity > 80%',
    check: (ctx: {
      proposedAction: ProposedAction;
      deviceState: DeviceState | null;
      sensorSnapshot: SensorSnapshot;
    }) => {
      if (
        ctx.proposedAction.decision !== 'turn_off' ||
        !ctx.deviceState ||
        !['circulation', 'fan'].some((t) =>
          ctx.deviceState!.id.toLowerCase().includes(t),
        )
      ) {
        return { pass: true, message: 'not a circulation shutdown' };
      }

      // Check all humidity sensors
      let maxHumidity: number | null = null;
      for (const [deviceId, metrics] of Object.entries(ctx.sensorSnapshot)) {
        if (metrics.humidity !== undefined) {
          maxHumidity =
            maxHumidity === null
              ? metrics.humidity
              : Math.max(maxHumidity, metrics.humidity);
        }
      }

      return {
        pass: maxHumidity === null || maxHumidity <= 80,
        message:
          maxHumidity === null
            ? 'Humidity: unavailable'
            : `Humidity: ${maxHumidity}%`,
      };
    },
  },
];

export function evaluateLegacyHardRules(
  action: ProposedAction,
  sensorSnapshot: SensorSnapshot,
  deviceState: DeviceState | null,
): string[] {
  const concerns: string[] = [];

  for (const rule of HARD_SAFETY_RULES_LEGACY) {
    const result = rule.check({
      proposedAction: action,
      deviceState,
      sensorSnapshot,
    });
    if (!result.pass) {
      concerns.push(`SAFETY FAIL: ${rule.description} (${result.message})`);
    }
  }

  return concerns;
}
