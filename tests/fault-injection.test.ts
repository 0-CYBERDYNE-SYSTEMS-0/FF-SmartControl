import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FaultInjectionController,
  createFaultInjectionController,
  getFaultInjectionController,
  resetFaultInjectionController,
  interceptSensorReading,
  interceptDecision,
  interceptVerifierResult,
  interceptEstopCheck,
  type FaultInjection,
  type InjectionPoint,
  type FaultType,
} from '../src/hal/fault-injection.js';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function freshController(): FaultInjectionController {
  resetFaultInjectionController();
  return getFaultInjectionController();
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE API TESTS
// ═══════════════════════════════════════════════════════════════════════════

test('inject adds an active fault', () => {
  const fic = freshController();
  const id = fic.inject('sensor_reading_to_hal', 'value_corruption');
  const active = fic.listActive();
  assert.equal(active.length, 1);
  assert.equal(active[0].id, id);
  assert.equal(active[0].point, 'sensor_reading_to_hal');
  assert.equal(active[0].type, 'value_corruption');
  assert.equal(active[0].active, true);
});

test('clear removes a fault', () => {
  const fic = freshController();
  const id = fic.inject('relay_command', 'message_drop');
  assert.equal(fic.listActive().length, 1);
  fic.clear(id);
  assert.equal(fic.listActive().length, 0);
});

test('clearAll removes all faults', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'value_corruption');
  fic.inject('relay_command', 'message_drop');
  fic.inject('estop_check', 'estop_suppression');
  assert.equal(fic.listActive().length, 3);
  fic.clearAll();
  assert.equal(fic.listActive().length, 0);
});

test('clearPoint removes faults at a specific injection point', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'value_corruption');
  fic.inject('sensor_reading_to_hal', 'boundary_injection');
  fic.inject('relay_command', 'message_drop');
  const removed = fic.clearPoint('sensor_reading_to_hal');
  assert.equal(removed, 2);
  assert.equal(fic.listActive().length, 1);
  assert.equal(fic.listActive()[0].point, 'relay_command');
});

test('deactivate and activate toggle fault active state', () => {
  const fic = freshController();
  const id = fic.inject('relay_command', 'message_drop');
  assert.equal(fic.listActive().length, 1);

  fic.deactivate(id);
  assert.equal(fic.listActive().length, 0); // inactive = not in active list
  assert.equal(fic.listAll().length, 1); // still exists

  fic.activate(id);
  assert.equal(fic.listActive().length, 1);
});

test('injectSequence creates multiple faults', () => {
  const fic = freshController();
  const ids = fic.injectSequence([
    { point: 'sensor_reading_to_hal', type: 'value_corruption' },
    { point: 'relay_command', type: 'message_drop' },
    { point: 'estop_check', type: 'estop_suppression' },
  ]);
  assert.equal(ids.length, 3);
  assert.equal(fic.listActive().length, 3);
});

// ═══════════════════════════════════════════════════════════════════════════
// VALUE CORRUPTION TESTS
// ═══════════════════════════════════════════════════════════════════════════

test('value_corruption with probability 1.0 always corrupts numbers', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'value_corruption', { probability: 1.0 });

  let corruptedCount = 0;
  for (let i = 0; i < 100; i++) {
    const result = fic.intercept('sensor_reading_to_hal', { value: 25.5, deviceId: 's1', metric: 'temperature' });
    if (result.intercepted && result.data !== undefined) {
      const val = (result.data as { value: number }).value;
      if (val !== 25.5) corruptedCount++;
    }
  }

  // With probability 1.0, nearly all should be corrupted
  assert.ok(corruptedCount >= 80, `Expected >=80 corruptions, got ${corruptedCount}`);
});

test('value_corruption with probability 0.0 never corrupts', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'value_corruption', { probability: 0.0 });

  let corruptedCount = 0;
  for (let i = 0; i < 100; i++) {
    const result = fic.intercept('sensor_reading_to_hal', { value: 25.5, deviceId: 's1', metric: 'temperature' });
    if (result.intercepted) corruptedCount++;
  }

  assert.equal(corruptedCount, 0);
});

test('value_corruption with forceNaN produces NaN', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'value_corruption', { probability: 1.0, forceNaN: true });

  const result = fic.intercept('sensor_reading_to_hal', { value: 25.5, deviceId: 's1', metric: 'temperature' });
  assert.ok(result.intercepted);
  assert.ok(Number.isNaN((result.data as { value: number }).value));
});

test('value_corruption with forceInfinity produces Infinity', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'value_corruption', { probability: 1.0, forceInfinity: true });

  const result = fic.intercept('sensor_reading_to_hal', { value: 25.5, deviceId: 's1', metric: 'temperature' });
  assert.ok(result.intercepted);
  assert.equal((result.data as { value: number }).value, Infinity);
});

test('value_corruption with overrideValue replaces entirely', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'value_corruption', {
    probability: 1.0,
    overrideValue: { value: -999, deviceId: 'hacked', metric: 'evil' },
  });

  const result = fic.intercept('sensor_reading_to_hal', { value: 25.5, deviceId: 's1', metric: 'temperature' });
  assert.ok(result.intercepted);
  assert.equal((result.data as { value: number }).value, -999);
});

test('value_corruption with count triggers exactly N times', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'value_corruption', { count: 3 });

  let triggerCount = 0;
  for (let i = 0; i < 100; i++) {
    const result = fic.intercept('sensor_reading_to_hal', { value: i, deviceId: 's1', metric: 'test' });
    if (result.intercepted) triggerCount++;
  }

  assert.equal(triggerCount, 3);
});

// ═══════════════════════════════════════════════════════════════════════════
// PAYLOAD MALFORMATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

test('payload_malformation corrupts decision objects', () => {
  const fic = freshController();
  fic.inject('decision_to_verifier', 'payload_malformation', { probability: 1.0 });

  const result = fic.intercept('decision_to_verifier', {
    decision: 'turn_on',
    deviceId: 'exhaust_fan',
    reasoning: 'too hot',
    confidence: 0.95,
  });

  assert.ok(result.intercepted);
  // The modified data should differ from original
  const original = { decision: 'turn_on', deviceId: 'exhaust_fan', reasoning: 'too hot', confidence: 0.95 };
  assert.notDeepEqual(result.data, original);
});

test('payload_malformation with overrideValue replaces payload', () => {
  const fic = freshController();
  fic.inject('decision_to_verifier', 'payload_malformation', {
    probability: 1.0,
    overrideValue: { decision: 'turn_off', deviceId: 'heater_plug', reasoning: 'INJECTED', confidence: 0.01 },
  });

  const result = fic.intercept('decision_to_verifier', {
    decision: 'turn_on',
    deviceId: 'exhaust_fan',
    reasoning: 'too hot',
    confidence: 0.95,
  });

  assert.ok(result.intercepted);
  assert.equal((result.data as { decision: string }).decision, 'turn_off');
  assert.equal((result.data as { deviceId: string }).deviceId, 'heater_plug');
});

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNICATION FAULT TESTS
// ═══════════════════════════════════════════════════════════════════════════

test('message_drop returns undefined data', () => {
  const fic = freshController();
  fic.inject('relay_command', 'message_drop', { probability: 1.0 });

  const result = fic.intercept('relay_command', { deviceId: 'exhaust_fan', action: 'on' });
  assert.ok(result.intercepted);
  assert.equal(result.data, undefined);
});

test('message_delay passes data through unchanged', () => {
  const fic = freshController();
  fic.inject('relay_command', 'message_delay', { probability: 1.0, delayAmountMs: 5000 });

  const original = { deviceId: 'exhaust_fan', action: 'on' };
  const result = fic.intercept('relay_command', original);
  assert.ok(result.intercepted);
  assert.deepEqual(result.data, original);
});

test('message_duplicate passes data through unchanged', () => {
  const fic = freshController();
  fic.inject('relay_command', 'message_duplicate', { probability: 1.0 });

  const original = { deviceId: 'water_pump', action: 'off' };
  const result = fic.intercept('relay_command', original);
  assert.ok(result.intercepted);
  assert.deepEqual(result.data, original);
});

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY BYPASS ATTEMPT TESTS
// ═══════════════════════════════════════════════════════════════════════════

test('verifier_bypass spoofs approved verifier result', () => {
  const fic = freshController();
  fic.inject('verifier_to_execution', 'verifier_bypass', { probability: 1.0 });

  const result = fic.intercept('verifier_to_execution', {
    approved: false,
    result: 'DENIED',
    reason: 'Temperature exceeded 30C',
    conflictingRuleIds: ['exhaust_temp'],
  });

  assert.ok(result.intercepted);
  const data = result.data as { approved: boolean; _verifier_bypassed: boolean };
  assert.equal(data.approved, true);
  assert.equal(data._verifier_bypassed, true);
});

test('estop_suppression masks active E-Stop', () => {
  const fic = freshController();
  fic.inject('estop_check', 'estop_suppression', { probability: 1.0 });

  const result = fic.intercept('estop_check', {
    active: true,
    activatedAt: '2026-05-23T00:00:00.000Z',
    activatedBy: 'operator',
    reason: 'manual emergency stop',
  });

  assert.ok(result.intercepted);
  const data = result.data as { active: boolean; _estop_suppressed: boolean };
  assert.equal(data.active, false);
  assert.equal(data._estop_suppressed, true);
});

test('audit_tampering alters audit entries', () => {
  const fic = freshController();
  fic.inject('audit_log_write', 'audit_tampering', { probability: 1.0 });

  const result = fic.intercept('audit_log_write', {
    proposedAction: 'turn_on',
    verifierResult: 'DENIED',
    deniedReason: 'safety violation',
    deviceId: 'exhaust_fan',
  });

  assert.ok(result.intercepted);
  const data = result.data as { verifierResult: string; _audit_tampered: boolean };
  assert.equal(data.verifierResult, 'APPROVED');
  assert.equal(data._audit_tampered, true);
});

// ═══════════════════════════════════════════════════════════════════════════
// EDGE CASE TESTS
// ═══════════════════════════════════════════════════════════════════════════

test('boundary_injection replaces numbers with boundary values', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'boundary_injection', { probability: 1.0 });

  let hitBoundary = false;
  for (let i = 0; i < 50; i++) {
    const result = fic.intercept('sensor_reading_to_hal', { value: 25.5, deviceId: 's1', metric: 'temp' });
    const val = (result.data as { value: number }).value;
    if (!Number.isFinite(val) || val === Number.MAX_VALUE || val === Number.MIN_VALUE) {
      hitBoundary = true;
      break;
    }
  }
  assert.ok(hitBoundary, 'Expected at least one boundary value injection');
});

test('resource_exhaustion produces error objects', () => {
  const fic = freshController();
  fic.inject('relay_command', 'resource_exhaustion', { probability: 1.0 });

  const result = fic.intercept('relay_command', { deviceId: 'exhaust_fan', action: 'on' });

  assert.ok(result.intercepted);
  // Should produce an error object, null, or undefined
  assert.ok(
    result.data === null ||
    result.data === undefined ||
    (typeof result.data === 'object' && result.data !== null && 'error' in (result.data as object)),
    `Unexpected data: ${JSON.stringify(result.data)}`,
  );
});

test('type_confusion changes types', () => {
  const fic = freshController();
  fic.inject('decision_to_verifier', 'type_confusion', { probability: 1.0 });

  const result = fic.intercept('decision_to_verifier', {
    decision: 'turn_on',
    deviceId: 'exhaust_fan',
    confidence: 0.95,
  });

  assert.ok(result.intercepted);
  // The data should be different from original
  const original = { decision: 'turn_on', deviceId: 'exhaust_fan', confidence: 0.95 };
  assert.notDeepEqual(result.data, original);
});

test('state_inconsistency inverts device states', () => {
  const fic = freshController();
  fic.inject('registry_read', 'state_inconsistency', { probability: 1.0 });

  const result = fic.intercept('registry_read', {
    id: 'exhaust_fan',
    last_state: 'on',
    type: 'relay',
  });

  assert.ok(result.intercepted);
  const data = result.data as { last_state: string };
  assert.equal(data.last_state, 'off');
});

// ═══════════════════════════════════════════════════════════════════════════
// MULTIPLE FAULTS / SCHEDULING
// ═══════════════════════════════════════════════════════════════════════════

test('multiple faults at same injection point — first match wins', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'value_corruption', { probability: 1.0, forceNaN: true });
  fic.inject('sensor_reading_to_hal', 'boundary_injection', { probability: 1.0 });

  // Both would trigger, but first match should win (value_corruption with NaN)
  const result = fic.intercept('sensor_reading_to_hal', { value: 25.5, deviceId: 's1', metric: 'temp' });
  assert.ok(result.intercepted);
  assert.ok(Number.isNaN((result.data as { value: number }).value));
});

test('everyNth triggers only on Nth interceptions', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'value_corruption', {
    probability: 1.0,
    forceNaN: true,
    everyNth: 5,
  });

  let triggerCount = 0;
  const triggeredAt: number[] = [];
  for (let i = 1; i <= 25; i++) {
    const result = fic.intercept('sensor_reading_to_hal', { value: i, deviceId: 's1', metric: 'test' });
    if (result.intercepted) {
      triggerCount++;
      triggeredAt.push(i);
    }
  }

  assert.equal(triggerCount, 5); // 5, 10, 15, 20, 25
  assert.deepEqual(triggeredAt, [5, 10, 15, 20, 25]);
});

test('delayMs prevents triggering before delay elapses', async () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'value_corruption', {
    probability: 1.0,
    forceNaN: true,
    delayMs: 100,
  });

  // Immediate interception should NOT trigger (delay hasn't elapsed)
  const immediate = fic.intercept('sensor_reading_to_hal', { value: 25.5, deviceId: 's1', metric: 'temp' });
  assert.equal(immediate.intercepted, false);

  // Wait for delay and try again
  await new Promise((resolve) => setTimeout(resolve, 150));
  const delayed = fic.intercept('sensor_reading_to_hal', { value: 25.5, deviceId: 's1', metric: 'temp' });
  assert.ok(delayed.intercepted);
});

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER TRACKING
// ═══════════════════════════════════════════════════════════════════════════

test('getTriggeredFaults returns trigger records', () => {
  const fic = freshController();
  const id = fic.inject('sensor_reading_to_hal', 'value_corruption', { probability: 1.0, count: 3 });

  for (let i = 0; i < 3; i++) {
    fic.intercept('sensor_reading_to_hal', { value: i, deviceId: 's1', metric: 'test' });
  }

  const triggers = fic.getTriggeredFaults();
  assert.equal(triggers.length, 3);
  assert.equal(triggers[0].faultId, id);
  assert.equal(triggers[0].type, 'value_corruption');
  assert.equal(triggers[0].point, 'sensor_reading_to_hal');
  assert.equal(triggers[0].intercepted, true);
});

test('verifyFaultTriggered confirms fault activation', () => {
  const fic = freshController();
  const id = fic.inject('relay_command', 'message_drop', { probability: 1.0 });

  assert.equal(fic.verifyFaultTriggered(id), false);

  fic.intercept('relay_command', { deviceId: 'f1', action: 'on' });

  assert.equal(fic.verifyFaultTriggered(id), true);
});

test('verifyFaultTriggeredCount checks minimum triggers', () => {
  const fic = freshController();
  const id = fic.inject('sensor_reading_to_hal', 'value_corruption', { probability: 1.0 });

  for (let i = 0; i < 10; i++) {
    fic.intercept('sensor_reading_to_hal', { value: i, deviceId: 's1', metric: 'test' });
  }

  assert.ok(fic.verifyFaultTriggeredCount(id, 10));
  assert.ok(fic.verifyFaultTriggeredCount(id, 5));
  assert.equal(fic.verifyFaultTriggeredCount(id, 11), false);
});

// ═══════════════════════════════════════════════════════════════════════════
// INTERCEPTION COUNTING
// ═══════════════════════════════════════════════════════════════════════════

test('getInterceptionCount tracks all interceptions (even without faults)', () => {
  const fic = freshController();

  // No faults injected
  for (let i = 0; i < 5; i++) {
    fic.intercept('sensor_reading_to_hal', { value: i, deviceId: 's1', metric: 'test' });
  }

  assert.equal(fic.getInterceptionCount('sensor_reading_to_hal'), 5);
  assert.equal(fic.getInterceptionCount('relay_command'), 0);
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST BATTERIES
// ═══════════════════════════════════════════════════════════════════════════

test('injectTestBattery creates multiple faults per battery type', () => {
  const batteries = [
    'safety_verifier_stress',
    'estop_resilience',
    'sensor_corruption',
    'communication_failure',
    'full_protocol_chaos',
  ] as const;

  for (const battery of batteries) {
    const fic = freshController();
    const ids = fic.injectTestBattery(battery, 'medium');
    assert.ok(ids.length > 0, `Battery '${battery}' should create at least 1 fault`);
    assert.equal(fic.listActive().length, ids.length);

    // Verify each fault is active
    for (const id of ids) {
      assert.ok(fic.listAll().find((f) => f.id === id)?.active);
    }
  }
});

test('injectTestBattery intensity affects probability', () => {
  const ficLow = freshController();
  ficLow.injectTestBattery('safety_verifier_stress', 'low');
  const probsLow = ficLow.listActive().map((f) => f.config.probability);

  // Low should be ~0.2
  assert.ok(probsLow.every((p) => p !== undefined && p <= 0.3));

  resetFaultInjectionController();
  const ficHigh = getFaultInjectionController();
  ficHigh.injectTestBattery('safety_verifier_stress', 'high');
    const probsHigh = ficHigh.listActive().map((f) => f.config.probability);

    // High intensity: base probability 1.0, some specific faults intentionally scaled
    // down (verifier_bypass=0.3, race_condition=0.5). At least 1 should be high.
    const highOnes = probsHigh.filter((p) => p !== undefined && p >= 0.9);
    assert.ok(highOnes.length >= 1, `Expected at least 1 high-prob fault, got ${highOnes.length}: ${probsHigh}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// STATUS REPORTING
// ═══════════════════════════════════════════════════════════════════════════

test('getStatus returns comprehensive fault system state', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'value_corruption', { probability: 1.0 });
  fic.inject('relay_command', 'message_drop', { probability: 1.0 });

  // Trigger one fault
  fic.intercept('sensor_reading_to_hal', { value: 25.5, deviceId: 's1', metric: 'temp' });

  const status = fic.getStatus();
  assert.equal(status.activeFaults, 2);
  assert.equal(status.totalTriggers, 1);
  assert.ok(status.faultsByPoint['sensor_reading_to_hal'] !== undefined);
  assert.ok(status.faultsByPoint['relay_command'] !== undefined);
  assert.ok(status.faultsByType['value_corruption'] !== undefined);
  assert.ok(status.faultsByType['message_drop'] !== undefined);
  assert.equal(status.recentTriggers.length, 1);
});

// ═══════════════════════════════════════════════════════════════════════════
// ISOLATED CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════

test('createFaultInjectionController produces independent instances', () => {
  const fic1 = createFaultInjectionController();
  const fic2 = createFaultInjectionController();

  fic1.inject('sensor_reading_to_hal', 'value_corruption');
  assert.equal(fic1.listActive().length, 1);
  assert.equal(fic2.listActive().length, 0); // Independent

  fic2.inject('relay_command', 'message_drop');
  assert.equal(fic1.listActive().length, 1);
  assert.equal(fic2.listActive().length, 1);
});

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

test('interceptSensorReading applies faults to sensor data', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'value_corruption', {
    probability: 1.0,
    overrideValue: { value: 99.9, deviceId: 'hacked', metric: 'evil' },
  });

  const result = interceptSensorReading('s1', 'temperature', 25.5);
  assert.ok(result);
  assert.equal(result.value, 99.9);
});

test('interceptSensorReading returns undefined when message dropped', () => {
  const fic = freshController();
  fic.inject('sensor_reading_to_hal', 'message_drop', { probability: 1.0 });

  const result = interceptSensorReading('s1', 'temperature', 25.5);
  assert.equal(result, undefined);
});

test('interceptDecision applies faults to decisions', () => {
  const fic = freshController();
  fic.inject('decision_to_verifier', 'verifier_bypass', { probability: 1.0 });

  const result = interceptDecision({
    decision: 'turn_on',
    deviceId: 'exhaust_fan',
    confidence: 0.95,
  });

  assert.ok(result.intercepted);
});

test('interceptVerifierResult applies faults to verifier responses', () => {
  const fic = freshController();
  fic.inject('verifier_to_execution', 'verifier_bypass', { probability: 1.0 });

  const result = interceptVerifierResult({
    approved: false,
    result: 'DENIED',
    reason: 'too hot',
    conflictingRuleIds: ['exhaust_temp'],
  } as { approved: boolean });

  assert.ok(result.intercepted);
  assert.equal((result.result as { approved: boolean }).approved, true);
});

test('interceptEstopCheck applies faults to E-Stop state', () => {
  const fic = freshController();
  fic.inject('estop_check', 'estop_suppression', { probability: 1.0 });

  const result = interceptEstopCheck({ active: true });
  assert.ok(result.intercepted);
  assert.equal(result.state.active, false);
});

// ═══════════════════════════════════════════════════════════════════════════
// NO FAULTS = PASSTHROUGH
// ═══════════════════════════════════════════════════════════════════════════

test('no faults at injection point passes data through unchanged', () => {
  const fic = freshController();
  const original = { value: 25.5, deviceId: 's1', metric: 'temperature' };
  const result = fic.intercept('sensor_reading_to_hal', original);
  assert.equal(result.intercepted, false);
  assert.deepEqual(result.data, original);
});

test('all injection points can be intercepted', () => {
  const points: InjectionPoint[] = [
    'sensor_reading_to_hal',
    'hal_to_snapshot',
    'decision_loop_input',
    'decision_to_verifier',
    'verifier_to_execution',
    'relay_command',
    'estop_check',
    'audit_log_write',
    'registry_read',
    'registry_write',
  ];

  const fic = freshController();

  for (const point of points) {
    fic.clearAll();
    // Inject a value_corruption with count 1
    fic.inject(point, 'value_corruption', { probability: 1.0, count: 1 });

    const result = fic.intercept(point, { value: 42 });
    assert.ok(result.intercepted, `Injection point '${point}' should intercept`);
    assert.notDeepEqual(result.data, { value: 42 }, `Injection point '${point}' should modify data`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CONCURRENT SAFETY (basic — no actual threading, just many faults)
// ═══════════════════════════════════════════════════════════════════════════

test('handles many faults without errors', () => {
  const fic = freshController();
  const points: InjectionPoint[] = [
    'sensor_reading_to_hal',
    'hal_to_snapshot',
    'decision_loop_input',
    'decision_to_verifier',
    'verifier_to_execution',
    'relay_command',
    'estop_check',
    'audit_log_write',
    'registry_read',
    'registry_write',
  ];
  const types: FaultType[] = [
    'value_corruption',
    'payload_malformation',
    'type_confusion',
    'message_drop',
    'message_delay',
  ];

  // Inject 100 faults
  for (let i = 0; i < 100; i++) {
    const point = points[i % points.length];
    const type = types[i % types.length];
    fic.inject(point, type, { probability: 0.3 });
  }

  assert.equal(fic.listActive().length, 100);

  // Run 1000 interceptions across all points
  let totalIntercepts = 0;
  for (let i = 0; i < 1000; i++) {
    const point = points[i % points.length];
    const result = fic.intercept(point, { value: i, deviceId: 'test', metric: 'test' });
    if (result.intercepted) totalIntercepts++;
  }

  // Should have intercepted some but not all (probability 0.3)
  assert.ok(totalIntercepts > 0, 'Expected some interceptions');
  assert.ok(totalIntercepts < 1000, 'Expected not all to be intercepted');

  // Status should be coherent
  const status = fic.getStatus();
  assert.equal(status.activeFaults, 100);
});
