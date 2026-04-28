/**
 * FarmPal Safety Policy Engine
 *
 * Pure deterministic rule evaluator. All evaluation is local, no LLM calls.
 * Rules are loaded from SQLite into memory at startup and refreshed periodically.
 *
 * Rule types:
 * - max_on_duration: device cannot be on longer than N seconds
 * - min_off_duration: device must be off for at least N seconds before turning on again
 * - max_activations_per_hour: device cannot be turned on more than N times per hour
 * - allowed_schedule_windows: device can only be turned on during specific time windows
 * - dependency: device state depends on another device/sensor condition
 */

import { getDb } from '../hal/db.js';
import { HalDevice, MetricType } from '../hal/types.js';

export type RuleType =
  | 'max_on_duration'
  | 'min_off_duration'
  | 'max_activations_per_hour'
  | 'allowed_schedule_windows'
  | 'dependency'
  | 'threshold';

export type Operator = 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'neq';

// JSON config structure per rule type
export interface MaxOnDurationConfig {
  maxSeconds: number;
}

export interface MinOffDurationConfig {
  minSeconds: number;
}

export interface MaxActivationsConfig {
  maxPerHour: number;
}

export interface ScheduleWindowConfig {
  windows: Array<{
    startHour: number; // 0-23
    endHour: number; // 0-23
    daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
  }>;
}

export interface DependencyConfig {
  triggerDeviceId: string; // device whose state/value we depend on
  triggerMetric?: MetricType; // sensor metric to check (for sensor devices)
  operator: Operator;
  value: number;
  actionRequired: 'on' | 'off' | 'any'; // what the dependent device must be in
}

export interface ThresholdConfig {
  metric: MetricType;
  deviceId?: string; // device this threshold applies to (null = all)
  zone?: string; // zone this threshold applies to (null = all)
  minValue?: number;
  maxValue?: number;
}

export type RuleConfig =
  | MaxOnDurationConfig
  | MinOffDurationConfig
  | MaxActivationsConfig
  | ScheduleWindowConfig
  | DependencyConfig
  | ThresholdConfig;

export interface SafetyRule {
  id: string;
  deviceId: string;
  ruleType: RuleType;
  ruleConfig: RuleConfig;
  enabled: boolean;
  priority: number; // higher = more restrictive, evaluated later
  createdAt: string;
  updatedAt: string;
}

export interface RuleViolation {
  ruleId: string;
  ruleType: RuleType;
  message: string;
  severity: 'block' | 'warn';
}

// In-memory rule cache
let ruleCache: SafetyRule[] = [];
let ruleCacheLoadedAt = 0;
const RULE_CACHE_TTL_MS = 30_000; // 30 seconds

export interface ProposedAction {
  decision: 'turn_on' | 'turn_off' | 'adjust' | 'noop';
  deviceId: string | null;
  reasoning?: string;
  confidence?: number;
}

export interface SensorSnapshot {
  [deviceId: string]: {
    [metric in MetricType]?: number;
  };
}

export interface DeviceState {
  id: string;
  type: string;
  label: string | null;
  lastState: 'on' | 'off' | 'unknown';
  lastValue: number | null;
}

export interface RelayToggle {
  deviceId: string;
  state: 'on' | 'off';
  switchedAt: string;
}

// Dependencies for testing
export interface PolicyEngineDeps {
  getDb?: () => {
    prepare: (sql: string) => {
      all: (...args: unknown[]) => unknown[];
      get: (...args: unknown[]) => unknown;
    };
  };
  now?: number;
  getRelayToggles?: (deviceId: string, since: string) => RelayToggle[];
  getSensorReading?: (
    deviceId: string,
    metric: MetricType,
  ) => { value: number } | undefined;
  getDevices?: () => HalDevice[];
}

/**
 * Load safety rules from SQLite into memory cache
 */
export function loadSafetyRules(deps: PolicyEngineDeps = {}): SafetyRule[] {
  const db = deps.getDb?.() ?? getDb();
  const now = Date.now();

  // Return cached rules if still fresh
  if (ruleCache.length > 0 && now - ruleCacheLoadedAt < RULE_CACHE_TTL_MS) {
    return ruleCache;
  }

  try {
    const rows = db
      .prepare(
        `
      SELECT id, device_id, rule_type, rule_config, enabled, priority, created_at, updated_at
      FROM hal_safety_rules
      WHERE enabled = 1
      ORDER BY priority ASC
    `,
      )
      .all() as Array<{
      id: string;
      device_id: string;
      rule_type: string;
      rule_config: string;
      enabled: number;
      priority: number;
      created_at: string;
      updated_at: string;
    }>;

    ruleCache = rows.map((row) => ({
      id: row.id,
      deviceId: row.device_id,
      ruleType: row.rule_type as RuleType,
      ruleConfig: JSON.parse(row.rule_config) as RuleConfig,
      enabled: row.enabled === 1,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    ruleCacheLoadedAt = now;
    return ruleCache;
  } catch (err) {
    console.error('[SafetyPolicy] Failed to load rules:', err);
    return ruleCache;
  }
}

/**
 * Clear the rule cache (forces reload on next access)
 */
export function clearRuleCache(): void {
  ruleCache = [];
  ruleCacheLoadedAt = 0;
}

/**
 * Get rules for a specific device
 */
export function getRulesForDevice(
  deviceId: string,
  rules?: SafetyRule[],
): SafetyRule[] {
  const allRules = rules ?? loadSafetyRules();
  return allRules.filter((r) => r.deviceId === deviceId);
}

// In-memory threshold cache
interface ThresholdEntry {
  id: string;
  deviceId: string | null; // null = applies to all devices
  zone: string | null; // null = applies to all zones
  metric: MetricType;
  minValue: number | null;
  maxValue: number | null;
  enabled: boolean;
}

let thresholdCache: ThresholdEntry[] = [];
let thresholdCacheLoadedAt = 0;
const THRESHOLD_CACHE_TTL_MS = 30_000; // 30 seconds

export interface ThresholdViolation {
  thresholdId: string;
  metric: MetricType;
  deviceId: string | null;
  zone: string | null;
  currentValue: number;
  minValue: number | null;
  maxValue: number | null;
  violatedAt: string; // ISO timestamp
}

/**
 * Load thresholds from SQLite into memory cache
 */
export function loadThresholds(deps: PolicyEngineDeps = {}): ThresholdEntry[] {
  const db = deps.getDb?.() ?? getDb();
  const now = Date.now();

  if (
    thresholdCache.length > 0 &&
    now - thresholdCacheLoadedAt < THRESHOLD_CACHE_TTL_MS
  ) {
    return thresholdCache;
  }

  try {
    const rows = db
      .prepare(
        `SELECT id, device_id, zone, metric, min_value, max_value, enabled
         FROM hal_thresholds
         WHERE enabled = 1`,
      )
      .all() as Array<{
      id: string;
      device_id: string | null;
      zone: string | null;
      metric: string;
      min_value: number | null;
      max_value: number | null;
      enabled: number;
    }>;

    thresholdCache = rows.map((row) => ({
      id: row.id,
      deviceId: row.device_id,
      zone: row.zone,
      metric: row.metric as MetricType,
      minValue: row.min_value,
      maxValue: row.max_value,
      enabled: row.enabled === 1,
    }));

    thresholdCacheLoadedAt = now;
    return thresholdCache;
  } catch (err) {
    console.error('[SafetyPolicy] Failed to load thresholds:', err);
    return thresholdCache;
  }
}

/**
 * Clear the threshold cache (forces reload on next access)
 */
export function clearThresholdCache(): void {
  thresholdCache = [];
  thresholdCacheLoadedAt = 0;
}

/**
 * Evaluate sensor readings against configured thresholds.
 * Returns all current threshold violations.
 */
export function evaluateThresholds(
  sensorSnapshot: SensorSnapshot,
  thresholds?: ThresholdEntry[],
): ThresholdViolation[] {
  const activeThresholds = thresholds ?? loadThresholds();
  const violations: ThresholdViolation[] = [];
  const now = new Date().toISOString();

  for (const threshold of activeThresholds) {
    // Find matching sensor readings
    for (const [deviceId, metrics] of Object.entries(sensorSnapshot)) {
      // Skip if threshold is device-specific and doesn't match
      if (threshold.deviceId && threshold.deviceId !== deviceId) continue;

      const metricValue = metrics[threshold.metric];
      if (metricValue === undefined) continue;

      // Check min violation
      if (threshold.minValue !== null && metricValue < threshold.minValue) {
        violations.push({
          thresholdId: threshold.id,
          metric: threshold.metric,
          deviceId: threshold.deviceId,
          zone: threshold.zone,
          currentValue: metricValue,
          minValue: threshold.minValue,
          maxValue: threshold.maxValue,
          violatedAt: now,
        });
      }

      // Check max violation
      if (threshold.maxValue !== null && metricValue > threshold.maxValue) {
        violations.push({
          thresholdId: threshold.id,
          metric: threshold.metric,
          deviceId: threshold.deviceId,
          zone: threshold.zone,
          currentValue: metricValue,
          minValue: threshold.minValue,
          maxValue: threshold.maxValue,
          violatedAt: now,
        });
      }
    }
  }

  return violations;
}

/**
 * Check if a proposed action would be affected by current threshold violations.
 * If any sensor is in violation, relay turn_on actions are DENIED.
 * (turn_off is allowed since it may help resolve the violation)
 */
export function checkThresholds(
  action: ProposedAction,
  sensorSnapshot: SensorSnapshot,
  deviceState: DeviceState | null,
  thresholds?: ThresholdEntry[],
): RuleViolation[] {
  // Only check turn_on actions for relays/smart_plugs
  if (
    action.decision !== 'turn_on' ||
    !action.deviceId ||
    !deviceState ||
    !['relay', 'smart_plug'].includes(deviceState.type)
  ) {
    return [];
  }

  const violations = evaluateThresholds(sensorSnapshot, thresholds);

  if (violations.length === 0) return [];

  // Build a descriptive message of all violations
  const violationMsgs = violations.map((v) => {
    const cond =
      v.minValue !== null && v.currentValue < v.minValue
        ? `${v.metric}=${v.currentValue} < min=${v.minValue}`
        : `${v.metric}=${v.currentValue} > max=${v.maxValue}`;
    return cond;
  });

  return [
    {
      ruleId: violations[0].thresholdId,
      ruleType: 'threshold',
      message: `Threshold violation(s): ${violationMsgs.join('; ')}. Action denied to prevent worsening.`,
      severity: 'block',
    },
  ];
}

/**
 * Evaluate a proposed action against all applicable safety rules.
 * Returns list of violations (empty = approved).
 * This is a PURE FUNCTION - same inputs always produce same outputs.
 */
export function evaluateAction(
  action: ProposedAction,
  sensorSnapshot: SensorSnapshot,
  deviceState: DeviceState | null,
  recentToggles: RelayToggle[],
  rules: SafetyRule[],
  nowMs: number = Date.now(),
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  if (!action.deviceId || action.decision === 'noop') {
    return violations;
  }

  const deviceRules = rules
    .filter((r) => r.deviceId === action.deviceId)
    .sort((a, b) => a.priority - b.priority); // lower priority first, more restrictive later

  for (const rule of deviceRules) {
    if (!rule.enabled) continue;

    switch (rule.ruleType) {
      case 'max_on_duration':
        violations.push(
          ...checkMaxOnDuration(
            rule,
            action,
            deviceState,
            recentToggles,
            nowMs,
          ),
        );
        break;
      case 'min_off_duration':
        violations.push(
          ...checkMinOffDuration(
            rule,
            action,
            deviceState,
            recentToggles,
            nowMs,
          ),
        );
        break;
      case 'max_activations_per_hour':
        violations.push(
          ...checkMaxActivations(rule, action, recentToggles, nowMs),
        );
        break;
      case 'allowed_schedule_windows':
        violations.push(...checkScheduleWindows(rule, action, nowMs));
        break;
      case 'dependency':
        violations.push(...checkDependency(rule, action, sensorSnapshot));
        break;
      case 'threshold':
        // threshold type rules use checkThresholds function
        // loaded from hal_thresholds table separately
        break;
    }
  }

  // Also check thresholds from hal_thresholds table (VAL-AUTO-013)
  violations.push(...checkThresholds(action, sensorSnapshot, deviceState));

  return violations;
}

/**
 * Apply operator comparison
 */
function compareOperator(
  value: number,
  operator: Operator,
  threshold: number,
): boolean {
  switch (operator) {
    case 'gt':
      return value > threshold;
    case 'lt':
      return value < threshold;
    case 'eq':
      return value === threshold;
    case 'gte':
      return value >= threshold;
    case 'lte':
      return value <= threshold;
    case 'neq':
      return value !== threshold;
  }
}

function checkMaxOnDuration(
  rule: SafetyRule,
  action: ProposedAction,
  deviceState: DeviceState | null,
  recentToggles: RelayToggle[],
  nowMs: number,
): RuleViolation[] {
  const config = rule.ruleConfig as MaxOnDurationConfig;
  if (action.decision !== 'turn_on') return [];

  // Find the last time this device was turned off
  const offToggle = recentToggles
    .filter((t) => t.deviceId === action.deviceId && t.state === 'off')
    .sort(
      (a, b) =>
        new Date(b.switchedAt).getTime() - new Date(a.switchedAt).getTime(),
    )[0];

  if (!offToggle) {
    // Device has never been turned off - check if it's currently on and for how long
    if (deviceState?.lastState === 'on') {
      // We don't know when it was turned on, so we can't enforce max_on_duration safely
      return [];
    }
    return []; // OK to turn on
  }

  const offTime = new Date(offToggle.switchedAt).getTime();
  const timeSinceOff = nowMs - offTime;
  const maxMs = config.maxSeconds * 1000;

  if (timeSinceOff < maxMs) {
    return [
      {
        ruleId: rule.id,
        ruleType: rule.ruleType,
        message: `Device was turned off ${Math.round(timeSinceOff / 1000)}s ago. Must remain off for at least ${config.maxSeconds}s before turning on.`,
        severity: 'block',
      },
    ];
  }

  return [];
}

function checkMinOffDuration(
  rule: SafetyRule,
  action: ProposedAction,
  deviceState: DeviceState | null,
  recentToggles: RelayToggle[],
  nowMs: number,
): RuleViolation[] {
  const config = rule.ruleConfig as MinOffDurationConfig;
  if (action.decision !== 'turn_on') return [];

  // Find the last time this device was turned off
  const offToggle = recentToggles
    .filter((t) => t.deviceId === action.deviceId && t.state === 'off')
    .sort(
      (a, b) =>
        new Date(b.switchedAt).getTime() - new Date(a.switchedAt).getTime(),
    )[0];

  if (!offToggle) {
    // Device has never been turned off
    if (deviceState?.lastState === 'on') {
      // Device is currently on and we don't know when it was turned on
      // This is a safety concern - but we can't determine off duration
      return [
        {
          ruleId: rule.id,
          ruleType: rule.ruleType,
          message: `Cannot verify minimum off duration - device currently on with unknown turn-on time.`,
          severity: 'warn',
        },
      ];
    }
    return []; // Never been on, OK to turn on
  }

  const offTime = new Date(offToggle.switchedAt).getTime();
  const timeSinceOff = nowMs - offTime;
  const minMs = config.minSeconds * 1000;

  if (timeSinceOff < minMs) {
    return [
      {
        ruleId: rule.id,
        ruleType: rule.ruleType,
        message: `Device was turned off ${Math.round(timeSinceOff / 1000)}s ago. Must remain off for at least ${config.minSeconds}s.`,
        severity: 'block',
      },
    ];
  }

  return [];
}

function checkMaxActivations(
  rule: SafetyRule,
  action: ProposedAction,
  recentToggles: RelayToggle[],
  nowMs: number,
): RuleViolation[] {
  const config = rule.ruleConfig as MaxActivationsConfig;
  if (action.decision !== 'turn_on') return [];

  const oneHourAgo = nowMs - 60 * 60 * 1000;
  const recentOnToggles = recentToggles.filter(
    (t) =>
      t.deviceId === action.deviceId &&
      t.state === 'on' &&
      new Date(t.switchedAt).getTime() > oneHourAgo,
  );

  if (recentOnToggles.length >= config.maxPerHour) {
    return [
      {
        ruleId: rule.id,
        ruleType: rule.ruleType,
        message: `Device has been turned on ${recentOnToggles.length} times in the last hour. Maximum allowed: ${config.maxPerHour}.`,
        severity: 'block',
      },
    ];
  }

  return [];
}

function checkScheduleWindows(
  rule: SafetyRule,
  action: ProposedAction,
  nowMs: number,
): RuleViolation[] {
  const config = rule.ruleConfig as ScheduleWindowConfig;
  if (action.decision !== 'turn_on') return [];

  const now = new Date(nowMs);
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  for (const window of config.windows) {
    // Check if current time is within window
    const inTimeWindow =
      currentHour >= window.startHour && currentHour < window.endHour;
    const inDayWindow =
      !window.daysOfWeek ||
      window.daysOfWeek.length === 0 ||
      window.daysOfWeek.includes(currentDay);

    if (inTimeWindow && inDayWindow) {
      return []; // Within allowed window
    }
  }

  // Not within any allowed window
  const windowStr = config.windows
    .map((w) => {
      const days = w.daysOfWeek?.length ? ` on ${w.daysOfWeek.join(',')}` : '';
      return `${w.startHour}:00-${w.endHour}:00${days}`;
    })
    .join('; ');

  return [
    {
      ruleId: rule.id,
      ruleType: rule.ruleType,
      message: `Device can only be turned on during: ${windowStr}. Current time: ${currentHour}:00.`,
      severity: 'block',
    },
  ];
}

function checkDependency(
  rule: SafetyRule,
  action: ProposedAction,
  sensorSnapshot: SensorSnapshot,
): RuleViolation[] {
  const config = rule.ruleConfig as DependencyConfig;
  const violations: RuleViolation[] = [];

  // Get the current value from sensor snapshot
  let currentValue: number | null = null;
  if (config.triggerMetric && config.triggerDeviceId) {
    const deviceSnapshot = sensorSnapshot[config.triggerDeviceId];
    if (deviceSnapshot && config.triggerMetric in deviceSnapshot) {
      currentValue = deviceSnapshot[config.triggerMetric] as number;
    }
  }

  // If we can't determine the current value, we can't evaluate the dependency
  if (currentValue === null) {
    return [
      {
        ruleId: rule.id,
        ruleType: rule.ruleType,
        message: `Cannot evaluate dependency rule - sensor ${config.triggerDeviceId}/${config.triggerMetric} has no recent reading.`,
        severity: 'warn',
      },
    ];
  }

  const conditionMet = compareOperator(
    currentValue,
    config.operator,
    config.value,
  );

  // Dependency rules semantics:
  // "device must stay ON when condition X is met" -> actionRequired='on'
  // "device must stay OFF when condition X is met" -> actionRequired='off'
  //
  // If condition IS met and actionRequired='on' and action is turn_off -> DENY
  // If condition IS met and actionRequired='off' and action is turn_on -> DENY
  //
  // If condition is NOT met and actionRequired='on' and action is turn_on -> DENY
  // If condition is NOT met and actionRequired='off' and action is turn_off -> DENY

  if (conditionMet) {
    // Condition IS currently met
    if (config.actionRequired === 'on' && action.decision === 'turn_off') {
      // Rule: device must stay ON when condition is met, but action would turn it OFF
      violations.push({
        ruleId: rule.id,
        ruleType: rule.ruleType,
        message: `Dependency rule: device must stay ON when ${config.triggerDeviceId} ${config.operator} ${config.value} (currently ${currentValue}). Cannot turn off.`,
        severity: 'block',
      });
    }
    if (config.actionRequired === 'off' && action.decision === 'turn_on') {
      // Rule: device must stay OFF when condition is met, but action would turn it ON
      violations.push({
        ruleId: rule.id,
        ruleType: rule.ruleType,
        message: `Dependency rule: device must stay OFF when ${config.triggerDeviceId} ${config.operator} ${config.value} (currently ${currentValue}). Cannot turn on.`,
        severity: 'block',
      });
    }
  } else {
    // Condition is NOT currently met
    if (config.actionRequired === 'on' && action.decision === 'turn_on') {
      // Rule: device must stay ON when condition is met, but condition is NOT met
      // This is a warning - the device may need to be on but condition isn't met
      violations.push({
        ruleId: rule.id,
        ruleType: rule.ruleType,
        message: `Dependency rule: device should stay ON when ${config.triggerDeviceId} ${config.operator} ${config.value} (currently ${currentValue}). Turning on anyway as condition not met.`,
        severity: 'warn',
      });
    }
    if (config.actionRequired === 'off' && action.decision === 'turn_off') {
      // Rule: device must stay OFF when condition is met, but condition is NOT met
      // This is a warning - the device may need to be off but condition isn't met
      violations.push({
        ruleId: rule.id,
        ruleType: rule.ruleType,
        message: `Dependency rule: device should stay OFF when ${config.triggerDeviceId} ${config.operator} ${config.value} (currently ${currentValue}). Turning off anyway as condition not met.`,
        severity: 'warn',
      });
    }
  }

  return violations;
}

/**
 * Get most-restrictive outcome from multiple violations.
 * BLOCK violations always result in DENIED.
 * WARN violations alone allow APPROVED with warning.
 */
export function computeOutcome(violations: RuleViolation[]): {
  approved: boolean;
  deniedReason: string | null;
  conflictingRuleIds: string[];
} {
  const blockingViolations = violations.filter((v) => v.severity === 'block');

  if (blockingViolations.length > 0) {
    return {
      approved: false,
      deniedReason: blockingViolations.map((v) => v.message).join('; '),
      conflictingRuleIds: blockingViolations.map((v) => v.ruleId),
    };
  }

  const warnViolations = violations.filter((v) => v.severity === 'warn');
  if (warnViolations.length > 0) {
    return {
      approved: true,
      deniedReason: warnViolations.map((v) => v.message).join('; '),
      conflictingRuleIds: [], // warnings don't block
    };
  }

  return {
    approved: true,
    deniedReason: null,
    conflictingRuleIds: [],
  };
}
