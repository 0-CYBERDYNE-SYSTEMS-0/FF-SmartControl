/**
 * Tests for manual override feature (VAL-AUTO-030, VAL-AUTO-031, VAL-AUTO-032, VAL-AUTO-033)
 *
 * VAL-AUTO-030: Operator Can Manually Toggle Any Relay in AUTONOMOUS or ASSISTED Modes
 * VAL-AUTO-031: Manual Override Takes Effect Immediately and Bypasses Pending Queue
 * VAL-AUTO-032: Manual Override Is Logged with triggered_by: 'manual-ui'
 * VAL-AUTO-033: Manual Override Wins Over Conflicting Autonomous Decision
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { getDb } from '../src/hal/db.js';

test.describe('manual-override', () => {
  test.beforeEach(() => {
    // Clear data from existing tables (tables are already created by the app)
    const db = getDb();

    // Clear any existing data but keep table structure
    db.exec('DELETE FROM hal_automation_pending');
    db.exec('DELETE FROM hal_decision_log');
  });

  test.afterEach(() => {
    const db = getDb();
    db.exec('DELETE FROM hal_automation_pending');
    db.exec('DELETE FROM hal_decision_log');
  });

  // Helper to create a pending decision
  function createPendingDecision(
    decisionId: string,
    deviceId: string,
    mode: 'SUGGEST' | 'ASSISTED_CONTROL',
  ) {
    const db = getDb();
    const now = new Date().toISOString();
    const pendingId = `pend_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // First ensure the device exists (insert or ignore if already exists)
    db.prepare(`
      INSERT OR IGNORE INTO hal_devices (id, type, protocol, label, last_state, created_at, updated_at)
      VALUES (?, 'relay', 'gpio', ?, 'unknown', ?, ?)
    `).run(deviceId, `Device ${deviceId}`, now, now);

    // Then create the decision log entry
    db.prepare(`
      INSERT INTO hal_decision_log (id, device_id, decision, outcome, decided_at, pending_status, triggered_by)
      VALUES (?, ?, ?, 'pending', ?, ?, 'agent')
    `).run(decisionId, deviceId, 'turn_on', now, mode === 'SUGGEST' ? 'pending_review' : 'pending_veto');

    // Then create the pending entry
    const vetoDeadline = mode === 'ASSISTED_CONTROL'
      ? new Date(Date.now() + 30_000).toISOString()
      : null;

    db.prepare(`
      INSERT INTO hal_automation_pending (id, decision_id, mode, veto_deadline, vetoed, approved, executed, created_at)
      VALUES (?, ?, ?, ?, 0, 0, 0, ?)
    `).run(pendingId, decisionId, mode, vetoDeadline, now);

    return { decisionId, pendingId };
  }

  // Helper to get decision pending_status
  function getDecisionStatus(decisionId: string): string | null {
    const db = getDb();
    const row = db.prepare('SELECT pending_status FROM hal_decision_log WHERE id = ?').get(decisionId) as { pending_status: string } | undefined;
    return row?.pending_status ?? null;
  }

  // Helper to check if pending is executed
  function isPendingExecuted(decisionId: string): boolean {
    const db = getDb();
    const row = db.prepare('SELECT executed FROM hal_automation_pending WHERE decision_id = ?').get(decisionId) as { executed: number } | undefined;
    return row?.executed === 1;
  }

  // VAL-AUTO-033: Manual Override Wins Over Conflicting Autonomous Decision
  test('skipPendingDecisionForDevice marks pending decision as overridden', async () => {
    const { skipPendingDecisionForDevice } = await import('../src/automation/modes.js');

    // Create a pending decision for device 'fan_1'
    const { decisionId } = createPendingDecision('dec_fan_1_1', 'fan_1', 'ASSISTED_CONTROL');

    // Verify it's pending
    assert.equal(getDecisionStatus(decisionId), 'pending_veto');
    assert.equal(isPendingExecuted(decisionId), false);

    // Manual override for the same device
    const overriddenIds = skipPendingDecisionForDevice('fan_1', 'on');

    // Verify it was marked as overridden
    assert.equal(overriddenIds.length, 1);
    assert.equal(overriddenIds[0], 'dec_fan_1_1');
    assert.equal(getDecisionStatus(decisionId), 'overridden');
    assert.equal(isPendingExecuted(decisionId), true);
  });

  // VAL-AUTO-033: Manual Override Wins Over Conflicting Autonomous Decision
  test('skipPendingDecisionForDevice handles multiple pending decisions for same device', async () => {
    const { skipPendingDecisionForDevice } = await import('../src/automation/modes.js');

    // Create two pending decisions for device 'fan_1'
    const { decisionId: dec1 } = createPendingDecision('dec_fan_1_a', 'fan_1', 'ASSISTED_CONTROL');
    const { decisionId: dec2 } = createPendingDecision('dec_fan_1_b', 'fan_1', 'SUGGEST');

    // Verify both are pending
    assert.equal(getDecisionStatus(dec1), 'pending_veto');
    assert.equal(getDecisionStatus(dec2), 'pending_review');
    assert.equal(isPendingExecuted(dec1), false);
    assert.equal(isPendingExecuted(dec2), false);

    // Manual override for the same device
    const overriddenIds = skipPendingDecisionForDevice('fan_1', 'off');

    // Verify both were marked as overridden
    assert.equal(overriddenIds.length, 2);
    assert.ok(overriddenIds.includes(dec1));
    assert.ok(overriddenIds.includes(dec2));
    assert.equal(getDecisionStatus(dec1), 'overridden');
    assert.equal(getDecisionStatus(dec2), 'overridden');
    assert.equal(isPendingExecuted(dec1), true);
    assert.equal(isPendingExecuted(dec2), true);
  });

  // VAL-AUTO-031: Manual Override Takes Effect Immediately and Bypasses Pending Queue
  test('skipPendingDecisionForDevice only affects specified device', async () => {
    const { skipPendingDecisionForDevice } = await import('../src/automation/modes.js');

    // Create pending decisions for two different devices
    const { decisionId: dec1 } = createPendingDecision('dec_fan_1', 'fan_1', 'ASSISTED_CONTROL');
    const { decisionId: dec2 } = createPendingDecision('dec_light_1', 'light_1', 'ASSISTED_CONTROL');

    // Manual override only for fan_1
    const overriddenIds = skipPendingDecisionForDevice('fan_1', 'on');

    // Verify only fan_1 decision was overridden
    assert.equal(overriddenIds.length, 1);
    assert.equal(overriddenIds[0], dec1);
    assert.equal(getDecisionStatus(dec1), 'overridden');
    assert.equal(getDecisionStatus(dec2), 'pending_veto'); // light_1 should be unaffected
    assert.equal(isPendingExecuted(dec2), false);
  });

  // VAL-AUTO-033: Manual Override Wins Over Conflicting Autonomous Decision
  test('skipPendingDecisionForDevice skips already-overridden decisions', async () => {
    const { skipPendingDecisionForDevice } = await import('../src/automation/modes.js');

    // Create a pending decision
    const { decisionId } = createPendingDecision('dec_fan_1', 'fan_1', 'ASSISTED_CONTROL');

    // First manual override
    const firstOverride = skipPendingDecisionForDevice('fan_1', 'on');
    assert.equal(firstOverride.length, 1);
    assert.equal(getDecisionStatus(decisionId), 'overridden');

    // Second manual override for same device should not return already-overridden decision
    const secondOverride = skipPendingDecisionForDevice('fan_1', 'off');
    assert.equal(secondOverride.length, 0); // No new decisions to override
  });

  // VAL-AUTO-033: Manual Override Wins Over Conflicting Autonomous Decision
  test('skipPendingDecisionForDevice skips vetoed decisions', async () => {
    const { skipPendingDecisionForDevice } = await import('../src/automation/modes.js');

    // Create a pending decision
    const { decisionId } = createPendingDecision('dec_fan_1', 'fan_1', 'ASSISTED_CONTROL');

    // Manually mark it as vetoed
    const db = getDb();
    db.prepare('UPDATE hal_automation_pending SET vetoed = 1 WHERE decision_id = ?').run(decisionId);
    db.prepare('UPDATE hal_decision_log SET pending_status = ? WHERE id = ?').run('vetoed', decisionId);

    // Manual override should not return vetoed decisions
    const overriddenIds = skipPendingDecisionForDevice('fan_1', 'on');
    assert.equal(overriddenIds.length, 0);
  });

  // VAL-AUTO-031: Manual Override Takes Effect Immediately and Bypasses Pending Queue
  test('skipPendingDecisionForDevice returns empty array when no pending decisions exist', async () => {
    const { skipPendingDecisionForDevice } = await import('../src/automation/modes.js');

    // No pending decisions created - just call skip
    const overriddenIds = skipPendingDecisionForDevice('nonexistent_device', 'on');
    assert.equal(overriddenIds.length, 0);
  });

  // VAL-AUTO-033: Manual Override Wins Over Conflicting Autonomous Decision
  test('skipPendingDecisionForDevice marks pending decisions as failure outcome', async () => {
    const { skipPendingDecisionForDevice } = await import('../src/automation/modes.js');

    const db = getDb();
    const { decisionId } = createPendingDecision('dec_fan_1', 'fan_1', 'ASSISTED_CONTROL');

    skipPendingDecisionForDevice('fan_1', 'on');

    // Check outcome was set to failure
    const row = db.prepare('SELECT outcome, completed_at FROM hal_decision_log WHERE id = ?').get(decisionId) as { outcome: string; completed_at: string };
    assert.equal(row.outcome, 'failure');
    assert.ok(row.completed_at !== null); // Should have a completed_at timestamp
  });
});
