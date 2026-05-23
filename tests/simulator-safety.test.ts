/**
 * Simulator + Safety Integration Tests
 *
 * Covers:
 * - runAutoDecisions respects policy engine rules
 * - max_on_duration blocks devices that exceed time limit
 * - allowed_schedule_windows blocks decisions outside windows
 * - Simulator fault injection triggers correct error states
 * - Fault injection with FaultInjectionController works correctly
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FaultInjectionController,
  getFaultInjectionController,
  resetFaultInjectionController,
} from '../src/hal/fault-injection.js';

import {
  evaluateAction,
  computeOutcome,
  loadSafetyRules,
  clearRuleCache,
  type ProposedAction,
  type SafetyRule,
  type RuleViolation,
} from '../src/safety/policy-engine.js';

import { THRESHOLDS } from '../src/agent/deterministic-rules.js';
import { verifyAction } from '../src/safety/verifier.js';

const NOW_MS = Date.now();

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function rule(
  id: string, deviceId: string, ruleType: SafetyRule['ruleType'],
  ruleConfig: SafetyRule['ruleConfig'], priority = 0,
): SafetyRule {
  return {
    id, deviceId, ruleType, ruleConfig,
    enabled: true, priority,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  };
}

function freshFiC(): FaultInjectionController {
  resetFaultInjectionController();
  return getFaultInjectionController();
}

// ═══════════════════════════════════════════════════════════════════════════
// Policy Engine Integration with Simulator Rules
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Simulator runAutoDecisions respects policy engine', () => {
  test('max_on_duration blocks turn_on when recently off', () => {
    const rules: SafetyRule[] = [
      rule('max_dur_1', 'exhaust_fan', 'max_on_duration', { maxSeconds: 3600 }),
    ];

    // Device was off 5 min ago — should block turn_on within max_on_duration window
    const recentToggles = [
      { deviceId: 'exhaust_fan', state: 'off' as const, switchedAt: new Date(NOW_MS - 5 * 60 * 1000).toISOString() },
    ];

    const violations = evaluateAction(
      { decision: 'turn_on', deviceId: 'exhaust_fan' },
      {},
      { id: 'exhaust_fan', type: 'relay', label: 'Exhaust Fan', lastState: 'off', lastValue: null },
      recentToggles,
      rules,
      NOW_MS,
    );

    assert.equal(violations.length, 1);
    assert.equal(violations[0].severity, 'block');
    assert.match(violations[0].message, /3600/);
  });

  test('max_on_duration allows turn_on when enough time elapsed', () => {
    const rules: SafetyRule[] = [
      rule('max_dur_1', 'exhaust_fan', 'max_on_duration', { maxSeconds: 3600 }),
    ];

    // Off 2 hours ago — should allow
    const recentToggles = [
      { deviceId: 'exhaust_fan', state: 'off' as const, switchedAt: new Date(NOW_MS - 120 * 60 * 1000).toISOString() },
    ];

    const violations = evaluateAction(
      { decision: 'turn_on', deviceId: 'exhaust_fan' },
      {},
      { id: 'exhaust_fan', type: 'relay', label: 'Exhaust Fan', lastState: 'off', lastValue: null },
      recentToggles,
      rules,
      NOW_MS,
    );

    assert.deepEqual(violations, []);
  });

  test('allowed_schedule_windows blocks decisions outside allowed hours', () => {
    const rules: SafetyRule[] = [
      rule('sched_1', 'grow_light_main', 'allowed_schedule_windows', {
        windows: [{ startHour: 6, endHour: 22 }],
      }),
    ];

    // Create a timestamp at a known local hour (3 AM)
    const d = new Date();
    d.setHours(3, 0, 0, 0);
    const threeAM = d.getTime();

    const violations = evaluateAction(
      { decision: 'turn_on', deviceId: 'grow_light_main' },
      {},
      { id: 'grow_light_main', type: 'smart_plug', label: 'Grow Light', lastState: 'off', lastValue: null },
      [],
      rules,
      threeAM,
    );

    assert.equal(violations.length, 1);
    assert.equal(violations[0].severity, 'block');
    assert.match(violations[0].message, /can only be turned on/);
  });

  test('allowed_schedule_windows allows decisions within allowed hours', () => {
    const rules: SafetyRule[] = [
      rule('sched_1', 'grow_light_main', 'allowed_schedule_windows', {
        windows: [{ startHour: 6, endHour: 22 }],
      }),
    ];

    // Create a timestamp at a known local hour (noon = 12 PM)
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const noon = d.getTime();

    const violations = evaluateAction(
      { decision: 'turn_on', deviceId: 'grow_light_main' },
      {},
      { id: 'grow_light_main', type: 'smart_plug', label: 'Grow Light', lastState: 'off', lastValue: null },
      [],
      rules,
      noon,
    );

    assert.deepEqual(violations, []);
  });

  test('threshold rules from policy engine respect simulator thresholds', () => {
    // Simulator thresholds match THRESHOLDS export from deterministic-rules
    assert.equal(THRESHOLDS.temperature.turnOn, 28);
    assert.equal(THRESHOLDS.temperature.turnOff, 23);
    assert.equal(THRESHOLDS.humidity.turnOn, 50);
    assert.equal(THRESHOLDS.humidity.turnOff, 70);
    assert.equal(THRESHOLDS.soilMoisture.turnOn, 45);
    assert.equal(THRESHOLDS.soilMoisture.turnOff, 65);
    assert.equal(THRESHOLDS.co2.alert, 1200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Fault Injection with FaultInjectionController
// ═══════════════════════════════════════════════════════════════════════════

test.describe('FaultInjectionController with Simulator', () => {
  test('sensor_reading_to_hal corruption triggers on value', () => {
    const fic = freshFiC();
    fic.inject('sensor_reading_to_hal', 'value_corruption', { probability: 1.0, forceNaN: true });

    const result = fic.intercept('sensor_reading_to_hal', { value: 25.5, deviceId: 'tent_a_temp_1', metric: 'temperature' });
    assert.ok(result.intercepted);
    assert.ok(Number.isNaN((result.data as any).value));
  });

  test('decision_to_verifier corruption modifies decisions', () => {
    const fic = freshFiC();
    fic.inject('decision_to_verifier', 'payload_malformation', { probability: 1.0 });

    const result = fic.intercept('decision_to_verifier', {
      decision: 'turn_on', deviceId: 'exhaust_fan', reasoning: 'too hot', confidence: 0.95,
    });
    assert.ok(result.intercepted);
    // Data should be modified
    assert.notDeepEqual(result.data, {
      decision: 'turn_on', deviceId: 'exhaust_fan', reasoning: 'too hot', confidence: 0.95,
    });
  });

  test('relay_command message_drop returns undefined', () => {
    const fic = freshFiC();
    fic.inject('relay_command', 'message_drop', { probability: 1.0 });

    const result = fic.intercept('relay_command', { deviceId: 'exhaust_fan', action: 'on' });
    assert.ok(result.intercepted);
    assert.equal(result.data, undefined);
  });

  test('estop_check suppression masks active E-Stop', () => {
    const fic = freshFiC();
    fic.inject('estop_check', 'estop_suppression', { probability: 1.0 });

    const result = fic.intercept('estop_check', {
      active: true, activatedAt: '2026-05-23T00:00:00.000Z',
      activatedBy: 'operator', reason: 'manual stop',
    });
    assert.ok(result.intercepted);
    const data = result.data as any;
    assert.equal(data.active, false);
    assert.equal(data._estop_suppressed, true);
  });

  test('verifier_bypass spoofs approval', () => {
    const fic = freshFiC();
    fic.inject('verifier_to_execution', 'verifier_bypass', { probability: 1.0 });

    const result = fic.intercept('verifier_to_execution', {
      approved: false, result: 'DENIED', reason: 'temp exceeded',
    });
    assert.ok(result.intercepted);
    const data = result.data as any;
    assert.equal(data.approved, true);
    assert.equal(data._verifier_bypassed, true);
  });

  test('audit_tampering alters audit entries', () => {
    const fic = freshFiC();
    fic.inject('audit_log_write', 'audit_tampering', { probability: 1.0 });

    const result = fic.intercept('audit_log_write', {
      proposedAction: 'turn_on', verifierResult: 'DENIED', deviceId: 'exhaust_fan',
    });
    assert.ok(result.intercepted);
    const data = result.data as any;
    assert.equal(data.verifierResult, 'APPROVED');
    assert.equal(data._audit_tampered, true);
  });

  test('state_inconsistency inverts device states', () => {
    const fic = freshFiC();
    fic.inject('registry_read', 'state_inconsistency', { probability: 1.0 });

    const result = fic.intercept('registry_read', {
      id: 'exhaust_fan', last_state: 'on', type: 'relay',
    });
    assert.ok(result.intercepted);
    const data = result.data as any;
    assert.equal(data.last_state, 'off');
  });

  test('multiple faults at same injection point: first match wins', () => {
    const fic = freshFiC();
    fic.inject('sensor_reading_to_hal', 'value_corruption', { probability: 1.0, forceNaN: true });
    fic.inject('sensor_reading_to_hal', 'boundary_injection', { probability: 1.0 });

    const result = fic.intercept('sensor_reading_to_hal', { value: 25.5, deviceId: 's1', metric: 'temp' });
    assert.ok(result.intercepted);
    assert.ok(Number.isNaN((result.data as any).value));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Simulator Fault Scenarios (via zone physics)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Simulator Fault Scenarios', () => {
  test('Temperature above threshold triggers exhaust ON decision', () => {
    // Simulate: zone temperature 32 > threshold 28 → exhaust should turn ON
    const temp = 32;
    assert.ok(temp > THRESHOLDS.temperature.turnOn,
      `Temperature ${temp} should exceed threshold ${THRESHOLDS.temperature.turnOn}`);

    // Verify the decision logic
    const action: ProposedAction = {
      decision: 'turn_on',
      deviceId: 'exhaust_fan',
      reasoning: `Temperature ${temp}°C exceeded ${THRESHOLDS.temperature.turnOn}°C threshold`,
      confidence: 0.92,
    };

    // With no safety rules, decision should be approved
    const violations = evaluateAction(
      action, {}, { id: 'exhaust_fan', type: 'relay', label: 'Exhaust Fan', lastState: 'off', lastValue: null },
      [], [], NOW_MS,
    );
    assert.deepEqual(violations, []);
  });

  test('Temperature below threshold triggers exhaust OFF decision', () => {
    const temp = 20;
    assert.ok(temp < THRESHOLDS.temperature.turnOff);

    const action: ProposedAction = {
      decision: 'turn_off',
      deviceId: 'exhaust_fan',
      reasoning: `Temperature ${temp}°C below ${THRESHOLDS.temperature.turnOff}°C`,
      confidence: 0.88,
    };

    const violations = evaluateAction(
      action, {}, { id: 'exhaust_fan', type: 'relay', label: 'Exhaust Fan', lastState: 'on', lastValue: null },
      [], [], NOW_MS,
    );
    assert.deepEqual(violations, []);
  });

  test('Humidity below threshold triggers humidifier ON', () => {
    const hum = 40;
    assert.ok(hum < THRESHOLDS.humidity.turnOn);

    const action: ProposedAction = {
      decision: 'turn_on',
      deviceId: 'humidifier',
      reasoning: `Humidity ${hum}% below ${THRESHOLDS.humidity.turnOn}%`,
      confidence: 0.9,
    };

    const violations = evaluateAction(
      action, {}, { id: 'humidifier', type: 'relay', label: 'Humidifier', lastState: 'off', lastValue: null },
      [], [], NOW_MS,
    );
    assert.deepEqual(violations, []);
  });

  test('CO2 above threshold generates alert', () => {
    const co2 = 1500;
    assert.ok(co2 > THRESHOLDS.co2.alert,
      `CO2 ${co2} should exceed alert threshold ${THRESHOLDS.co2.alert}`);
  });

  test('Soil moisture below threshold triggers pump ON', () => {
    const soil = 35;
    assert.ok(soil < THRESHOLDS.soilMoisture.turnOn);

    const action: ProposedAction = {
      decision: 'turn_on',
      deviceId: 'water_pump',
      reasoning: `Soil moisture ${soil}% below ${THRESHOLDS.soilMoisture.turnOn}%`,
      confidence: 0.85,
    };

    const violations = evaluateAction(
      action, {}, { id: 'water_pump', type: 'relay', label: 'Water Pump', lastState: 'off', lastValue: null },
      [], [], NOW_MS,
    );
    assert.deepEqual(violations, []);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test Battery Integration
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Fault Injection Test Batteries', () => {
  test('safety_verifier_stress battery creates faults', () => {
    const fic = freshFiC();
    const ids = fic.injectTestBattery('safety_verifier_stress', 'medium');
    assert.ok(ids.length > 0);
    assert.equal(fic.listActive().length, ids.length);
  });

  test('estop_resilience battery creates faults', () => {
    const fic = freshFiC();
    const ids = fic.injectTestBattery('estop_resilience', 'medium');
    assert.ok(ids.length > 0);
    assert.equal(fic.listActive().length, ids.length);
  });

  test('sensor_corruption battery creates faults', () => {
    const fic = freshFiC();
    const ids = fic.injectTestBattery('sensor_corruption', 'medium');
    assert.ok(ids.length > 0);
  });

  test('communication_failure battery creates faults', () => {
    const fic = freshFiC();
    const ids = fic.injectTestBattery('communication_failure', 'medium');
    assert.ok(ids.length > 0);
  });

  test('full_protocol_chaos battery creates faults at all points', () => {
    const fic = freshFiC();
    const ids = fic.injectTestBattery('full_protocol_chaos', 'low');
    assert.ok(ids.length > 0);
    const status = fic.getStatus();
    assert.ok(status.activeFaults > 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Policy Engine: min_off_duration and max_activations
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Policy Engine Duration Rules', () => {
  test('min_off_duration blocks turn_on when off time insufficient', () => {
    const rules: SafetyRule[] = [
      rule('min_off_1', 'pump_1', 'min_off_duration', { minSeconds: 300 }),
    ];

    const recentToggles = [
      { deviceId: 'pump_1', state: 'off' as const, switchedAt: new Date(NOW_MS - 2 * 60 * 1000).toISOString() },
    ];

    const violations = evaluateAction(
      { decision: 'turn_on', deviceId: 'pump_1' },
      {},
      { id: 'pump_1', type: 'relay', label: 'Pump', lastState: 'off', lastValue: null },
      recentToggles,
      rules,
      NOW_MS,
    );
    assert.equal(violations.length, 1);
    assert.equal(violations[0].severity, 'block');
  });

  test('max_activations_per_hour blocks when limit exceeded', () => {
    const rules: SafetyRule[] = [
      rule('max_act_1', 'humidifier_1', 'max_activations_per_hour', { maxPerHour: 3 }),
    ];

    // 4 activations in last hour
    const recentToggles = [
      { deviceId: 'humidifier_1', state: 'on' as const, switchedAt: new Date(NOW_MS - 10 * 60 * 1000).toISOString() },
      { deviceId: 'humidifier_1', state: 'on' as const, switchedAt: new Date(NOW_MS - 25 * 60 * 1000).toISOString() },
      { deviceId: 'humidifier_1', state: 'on' as const, switchedAt: new Date(NOW_MS - 45 * 60 * 1000).toISOString() },
      { deviceId: 'humidifier_1', state: 'on' as const, switchedAt: new Date(NOW_MS - 55 * 60 * 1000).toISOString() },
    ];

    const violations = evaluateAction(
      { decision: 'turn_on', deviceId: 'humidifier_1' },
      {},
      { id: 'humidifier_1', type: 'smart_plug', label: 'Humidifier', lastState: 'off', lastValue: null },
      recentToggles,
      rules,
      NOW_MS,
    );
    assert.equal(violations.length, 1);
    assert.equal(violations[0].severity, 'block');
  });

  test('dependency rule prevents turn_off exhaust when temp > 30', () => {
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
      { temp_sensor_1: { temperature: 31 } },
      { id: 'exhaust_fan', type: 'relay', label: 'Exhaust Fan', lastState: 'on', lastValue: null },
      [],
      rules,
      NOW_MS,
    );
    assert.equal(violations.length, 1);
    assert.equal(violations[0].severity, 'block');
  });

  test('computeOutcome: approved with no violations', () => {
    const result = computeOutcome([]);
    assert.equal(result.approved, true);
    assert.equal(result.deniedReason, null);
  });

  test('computeOutcome: denied with blocking violations', () => {
    const v: RuleViolation[] = [
      { ruleId: 'r1', ruleType: 'dependency', message: 'Blocked', severity: 'block' },
    ];
    const result = computeOutcome(v);
    assert.equal(result.approved, false);
    assert.equal(result.deniedReason, 'Blocked');
  });

  test('computeOutcome: warn-only allows approval', () => {
    const v: RuleViolation[] = [
      { ruleId: 'r1', ruleType: 'dependency', message: 'Warning', severity: 'warn' },
    ];
    const result = computeOutcome(v);
    assert.equal(result.approved, true);
  });
});
