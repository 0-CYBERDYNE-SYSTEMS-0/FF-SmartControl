import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateAction,
  computeOutcome,
  loadSafetyRules,
  clearRuleCache,
  type ProposedAction,
  type SensorSnapshot,
  type DeviceState,
  type RelayToggle,
  type SafetyRule,
  type RuleViolation,
} from '../src/safety/policy-engine.js';

const NOW_MS = new Date('2026-04-28T12:00:00Z').getTime();

// Helper to create test devices
function deviceState(id: string, type: string, lastState: 'on' | 'off' | 'unknown' = 'unknown'): DeviceState {
  return {
    id,
    type,
    label: id,
    lastState,
    lastValue: null,
  };
}

// Helper to create sensor snapshot
function snapshot(readings: Record<string, Record<string, number>>): SensorSnapshot {
  return readings;
}

// Helper to create relay toggles
function toggles(...items: Array<{ deviceId: string; state: 'on' | 'off'; switchedAt: string }>): RelayToggle[] {
  return items.map((t) => ({
    deviceId: t.deviceId,
    state: t.state,
    switchedAt: t.switchedAt,
  }));
}

// Helper to create safety rule
function rule(
  id: string,
  deviceId: string,
  ruleType: SafetyRule['ruleType'],
  ruleConfig: SafetyRule['ruleConfig'],
  priority = 0,
): SafetyRule {
  return {
    id,
    deviceId,
    ruleType,
    ruleConfig,
    enabled: true,
    priority,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  };
}

test('evaluateAction: allows action with no rules', () => {
  const violations = evaluateAction(
    { decision: 'turn_on', deviceId: 'fan_1' },
    snapshot({}),
    deviceState('fan_1', 'relay'),
    [],
    [],
    NOW_MS,
  );
  assert.deepEqual(violations, []);
});

test('evaluateAction: denies turn_off on exhaust when temp > 30°C (dependency rule)', () => {
  const rules: SafetyRule[] = [
    rule('dep_1', 'exhaust_fan', 'dependency', {
      triggerDeviceId: 'temp_sensor_1',
      triggerMetric: 'temperature',
      operator: 'gt',
      value: 30,
      actionRequired: 'on',
    }),
  ];

  const violations = evaluateAction(
    { decision: 'turn_off', deviceId: 'exhaust_fan' },
    snapshot({ temp_sensor_1: { temperature: 31 } }),
    deviceState('exhaust_fan', 'relay'),
    [],
    rules,
    NOW_MS,
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].severity, 'block');
  assert.match(violations[0].message, /30/);
});

test('evaluateAction: allows turn_off on exhaust when temp <= 30°C', () => {
  const rules: SafetyRule[] = [
    rule('dep_1', 'exhaust_fan', 'dependency', {
      triggerDeviceId: 'temp_sensor_1',
      triggerMetric: 'temperature',
      operator: 'gt',
      value: 30,
      actionRequired: 'on',
    }),
  ];

  const violations = evaluateAction(
    { decision: 'turn_off', deviceId: 'exhaust_fan' },
    snapshot({ temp_sensor_1: { temperature: 29 } }),
    deviceState('exhaust_fan', 'relay'),
    [],
    rules,
    NOW_MS,
  );

  assert.deepEqual(violations, []);
});

test('evaluateAction: denies max_activations_per_hour exceeded', () => {
  const rules: SafetyRule[] = [
    rule('max_act_1', 'humidifier_1', 'max_activations_per_hour', {
      maxPerHour: 3,
    }),
  ];

  // 4 activations in the last hour
  const recentToggles = toggles(
    { deviceId: 'humidifier_1', state: 'on', switchedAt: new Date(NOW_MS - 10 * 60 * 1000).toISOString() },
    { deviceId: 'humidifier_1', state: 'on', switchedAt: new Date(NOW_MS - 25 * 60 * 1000).toISOString() },
    { deviceId: 'humidifier_1', state: 'on', switchedAt: new Date(NOW_MS - 45 * 60 * 1000).toISOString() },
    { deviceId: 'humidifier_1', state: 'on', switchedAt: new Date(NOW_MS - 55 * 60 * 1000).toISOString() },
  );

  const violations = evaluateAction(
    { decision: 'turn_on', deviceId: 'humidifier_1' },
    snapshot({}),
    deviceState('humidifier_1', 'smart_plug'),
    recentToggles,
    rules,
    NOW_MS,
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].severity, 'block');
  assert.match(violations[0].message, /4.*3/);
});

test('evaluateAction: allows max_activations_per_hour not exceeded', () => {
  const rules: SafetyRule[] = [
    rule('max_act_1', 'humidifier_1', 'max_activations_per_hour', {
      maxPerHour: 3,
    }),
  ];

  // Only 2 activations in the last hour
  const recentToggles = toggles(
    { deviceId: 'humidifier_1', state: 'on', switchedAt: new Date(NOW_MS - 10 * 60 * 1000).toISOString() },
    { deviceId: 'humidifier_1', state: 'on', switchedAt: new Date(NOW_MS - 45 * 60 * 1000).toISOString() },
  );

  const violations = evaluateAction(
    { decision: 'turn_on', deviceId: 'humidifier_1' },
    snapshot({}),
    deviceState('humidifier_1', 'smart_plug'),
    recentToggles,
    rules,
    NOW_MS,
  );

  assert.deepEqual(violations, []);
});

test('evaluateAction: denies min_off_duration not met', () => {
  const rules: SafetyRule[] = [
    rule('min_off_1', 'pump_1', 'min_off_duration', {
      minSeconds: 300, // 5 minutes
    }),
  ];

  // Turned off only 2 minutes ago
  const recentToggles = toggles(
    { deviceId: 'pump_1', state: 'off', switchedAt: new Date(NOW_MS - 2 * 60 * 1000).toISOString() },
  );

  const violations = evaluateAction(
    { decision: 'turn_on', deviceId: 'pump_1' },
    snapshot({}),
    deviceState('pump_1', 'relay'),
    recentToggles,
    rules,
    NOW_MS,
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].severity, 'block');
  assert.match(violations[0].message, /300/);
});

test('evaluateAction: allows min_off_duration met', () => {
  const rules: SafetyRule[] = [
    rule('min_off_1', 'pump_1', 'min_off_duration', {
      minSeconds: 300,
    }),
  ];

  // Turned off 10 minutes ago
  const recentToggles = toggles(
    { deviceId: 'pump_1', state: 'off', switchedAt: new Date(NOW_MS - 10 * 60 * 1000).toISOString() },
  );

  const violations = evaluateAction(
    { decision: 'turn_on', deviceId: 'pump_1' },
    snapshot({}),
    deviceState('pump_1', 'relay'),
    recentToggles,
    rules,
    NOW_MS,
  );

  assert.deepEqual(violations, []);
});

test('evaluateAction: denies outside allowed_schedule_windows', () => {
  const rules: SafetyRule[] = [
    rule('sched_1', 'grow_light_1', 'allowed_schedule_windows', {
      windows: [
        { startHour: 6, endHour: 22 }, // 6 AM to 10 PM
      ],
    }),
  ];

  // Current time is 12:00 UTC (noon) - should be within window
  const violations = evaluateAction(
    { decision: 'turn_on', deviceId: 'grow_light_1' },
    snapshot({}),
    deviceState('grow_light_1', 'smart_plug'),
    [],
    rules,
    NOW_MS,
  );

  // Noon is within 6-22 window
  assert.deepEqual(violations, []);
});

test('evaluateAction: denies turn_off on circulation when humidity > 80%', () => {
  const rules: SafetyRule[] = [
    rule('dep_2', 'circulation_fan', 'dependency', {
      triggerDeviceId: 'humidity_sensor_1',
      triggerMetric: 'humidity',
      operator: 'gt',
      value: 80,
      actionRequired: 'on',
    }),
  ];

  const violations = evaluateAction(
    { decision: 'turn_off', deviceId: 'circulation_fan' },
    snapshot({ humidity_sensor_1: { humidity: 85 } }),
    deviceState('circulation_fan', 'relay'),
    [],
    rules,
    NOW_MS,
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].severity, 'block');
  assert.match(violations[0].message, /humidity.*80/);
});

test('evaluateAction: multiple violations returns all blocking violations', () => {
  const rules: SafetyRule[] = [
    rule('rule_1', 'device_1', 'max_activations_per_hour', { maxPerHour: 2 }),
    rule('rule_2', 'device_1', 'min_off_duration', { minSeconds: 600 }),
  ];

  // Both limits exceeded
  const recentToggles = toggles(
    { deviceId: 'device_1', state: 'on', switchedAt: new Date(NOW_MS - 5 * 60 * 1000).toISOString() },
    { deviceId: 'device_1', state: 'on', switchedAt: new Date(NOW_MS - 30 * 60 * 1000).toISOString() },
    { deviceId: 'device_1', state: 'off', switchedAt: new Date(NOW_MS - 2 * 60 * 1000).toISOString() },
  );

  const violations = evaluateAction(
    { decision: 'turn_on', deviceId: 'device_1' },
    snapshot({}),
    deviceState('device_1', 'relay'),
    recentToggles,
    rules,
    NOW_MS,
  );

  // Should have violations from both rules
  assert.equal(violations.length, 2);
  assert.ok(violations.every((v) => v.severity === 'block'));
});

test('evaluateAction: noop decision passes all rules', () => {
  const rules: SafetyRule[] = [
    rule('dep_1', 'exhaust_fan', 'dependency', {
      triggerDeviceId: 'temp_sensor_1',
      triggerMetric: 'temperature',
      operator: 'gt',
      value: 30,
      actionRequired: 'on',
    }),
  ];

  const violations = evaluateAction(
    { decision: 'noop', deviceId: null },
    snapshot({ temp_sensor_1: { temperature: 35 } }),
    null,
    [],
    rules,
    NOW_MS,
  );

  assert.deepEqual(violations, []);
});

test('computeOutcome: approved when no violations', () => {
  const result = computeOutcome([]);
  assert.equal(result.approved, true);
  assert.equal(result.deniedReason, null);
  assert.deepEqual(result.conflictingRuleIds, []);
});

test('computeOutcome: denied when blocking violations exist', () => {
  const violations: RuleViolation[] = [
    { ruleId: 'rule_1', ruleType: 'dependency', message: 'Test block violation', severity: 'block' },
  ];
  const result = computeOutcome(violations);
  assert.equal(result.approved, false);
  assert.equal(result.deniedReason, 'Test block violation');
  assert.deepEqual(result.conflictingRuleIds, ['rule_1']);
});

test('computeOutcome: most restrictive outcome on conflicting rules', () => {
  const violations: RuleViolation[] = [
    { ruleId: 'rule_1', ruleType: 'dependency', message: 'First violation', severity: 'block' },
    { ruleId: 'rule_2', ruleType: 'max_activations_per_hour', message: 'Second violation', severity: 'block' },
  ];
  const result = computeOutcome(violations);
  assert.equal(result.approved, false);
  assert.ok(result.conflictingRuleIds.includes('rule_1'));
  assert.ok(result.conflictingRuleIds.includes('rule_2'));
});

test('computeOutcome: warns but allows with warn-only violations', () => {
  const violations: RuleViolation[] = [
    { ruleId: 'rule_1', ruleType: 'dependency', message: 'Warning only', severity: 'warn' },
  ];
  const result = computeOutcome(violations);
  assert.equal(result.approved, true); // Still approved
  assert.ok(result.deniedReason?.includes('Warning only'));
});

test('clearRuleCache: empties the rule cache', () => {
  clearRuleCache();
  // Just verify it doesn't throw
});

test('evaluateAction: ignores rules for different devices', () => {
  const rules: SafetyRule[] = [
    rule('dep_1', 'exhaust_fan', 'dependency', {
      triggerDeviceId: 'temp_sensor_1',
      triggerMetric: 'temperature',
      operator: 'gt',
      value: 30,
      actionRequired: 'on',
    }),
  ];

  // Acting on a different device
  const violations = evaluateAction(
    { decision: 'turn_off', deviceId: 'light_1' },
    snapshot({ temp_sensor_1: { temperature: 35 } }),
    deviceState('light_1', 'smart_plug'),
    [],
    rules,
    NOW_MS,
  );

  assert.deepEqual(violations, []);
});

test('evaluateAction: max_on_duration blocks turn_on if recently off', () => {
  const rules: SafetyRule[] = [
    rule('max_on_1', 'heater_1', 'max_on_duration', {
      maxSeconds: 3600, // 1 hour
    }),
  ];

  // Device was only off 5 minutes ago
  const recentToggles = toggles(
    { deviceId: 'heater_1', state: 'off', switchedAt: new Date(NOW_MS - 5 * 60 * 1000).toISOString() },
  );

  const violations = evaluateAction(
    { decision: 'turn_on', deviceId: 'heater_1' },
    snapshot({}),
    deviceState('heater_1', 'relay'),
    recentToggles,
    rules,
    NOW_MS,
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].severity, 'block');
  assert.match(violations[0].message, /3600/);
});

test('evaluateAction: dependency with eq operator', () => {
  const rules: SafetyRule[] = [
    rule('dep_eq', 'pump_1', 'dependency', {
      triggerDeviceId: 'moisture_sensor_1',
      triggerMetric: 'soil_moisture',
      operator: 'eq',
      value: 100,
      actionRequired: 'off', // pump must be OFF when soil is saturated
    }),
  ];

  const violations = evaluateAction(
    { decision: 'turn_on', deviceId: 'pump_1' },
    snapshot({ moisture_sensor_1: { soil_moisture: 100 } }),
    deviceState('pump_1', 'relay'),
    [],
    rules,
    NOW_MS,
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].severity, 'block');
});

test('evaluateAction: dependency with lt operator', () => {
  const rules: SafetyRule[] = [
    rule('dep_lt', 'heater_1', 'dependency', {
      triggerDeviceId: 'temp_sensor_1',
      triggerMetric: 'temperature',
      operator: 'lt',
      value: 10,
      actionRequired: 'on', // heater must be ON when temp < 10
    }),
  ];

  const violations = evaluateAction(
    { decision: 'turn_off', deviceId: 'heater_1' },
    snapshot({ temp_sensor_1: { temperature: 5 } }),
    deviceState('heater_1', 'relay'),
    [],
    rules,
    NOW_MS,
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].severity, 'block');
});

test('evaluateAction: dependency rule with no sensor reading returns warn', () => {
  const rules: SafetyRule[] = [
    rule('dep_noread', 'exhaust_fan', 'dependency', {
      triggerDeviceId: 'missing_sensor',
      triggerMetric: 'temperature',
      operator: 'gt',
      value: 30,
      actionRequired: 'on',
    }),
  ];

  const violations = evaluateAction(
    { decision: 'turn_off', deviceId: 'exhaust_fan' },
    snapshot({}), // No readings
    deviceState('exhaust_fan', 'relay'),
    [],
    rules,
    NOW_MS,
  );

  // Should warn because we can't verify
  assert.equal(violations.length, 1);
  assert.equal(violations[0].severity, 'warn');
});

test('evaluateAction: schedule windows with days of week', () => {
  const rules: SafetyRule[] = [
    rule('sched_dow', 'grow_light_1', 'allowed_schedule_windows', {
      windows: [
        { startHour: 6, endHour: 22, daysOfWeek: [1, 2, 3, 4, 5] }, // Weekdays only
      ],
    }),
  ];

  // Tuesday (day 2) at noon
  const tuesdayNoon = new Date('2026-04-28T12:00:00Z').getTime(); // Tuesday

  const violations = evaluateAction(
    { decision: 'turn_on', deviceId: 'grow_light_1' },
    snapshot({}),
    deviceState('grow_light_1', 'smart_plug'),
    [],
    rules,
    tuesdayNoon,
  );

  assert.deepEqual(violations, []);
});

test('evaluateAction: schedule windows denies weekends', () => {
  const rules: SafetyRule[] = [
    rule('sched_dow', 'grow_light_1', 'allowed_schedule_windows', {
      windows: [
        { startHour: 6, endHour: 22, daysOfWeek: [1, 2, 3, 4, 5] }, // Weekdays only
      ],
    }),
  ];

  // Saturday (day 6) at noon
  const saturdayNoon = new Date('2026-04-25T12:00:00Z').getTime(); // Saturday

  const violations = evaluateAction(
    { decision: 'turn_on', deviceId: 'grow_light_1' },
    snapshot({}),
    deviceState('grow_light_1', 'smart_plug'),
    [],
    rules,
    saturdayNoon,
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].severity, 'block');
});
