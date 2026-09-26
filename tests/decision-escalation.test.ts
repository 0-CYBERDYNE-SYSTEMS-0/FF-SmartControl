/**
 * D5 hybrid LLM posture — decision escalation tests
 *
 * (a) Pure escalation-decision logic: off by default, threshold parsing and
 *     boundary, alert-class and anomaly triggers.
 * (b) End-to-end through runDecisionCycle with a stubbed global fetch (no
 *     network): DECISION_ESCALATION=auto escalates a low-confidence local
 *     answer to the configured cloud provider and logs the cloud model in
 *     hal_decision_log; escalation off makes exactly one LLM call.
 */

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getEscalationThreshold,
  isEscalationEnabled,
  shouldEscalateToCloud,
} from '../src/agent/decision-loop.js';
import { getCloudProvider } from '../src/agent/llm.js';

const oldEnv = { ...process.env };
const tmpRoot = mkdtempSync(path.join(tmpdir(), 'farmpal-escalation-'));

process.env.LOG_LEVEL = 'silent';
process.env.HAL_SIM_MODE = '1';
process.env.FFT_NANO_DB_PATH = path.join(tmpRoot, 'fft_nano.db');

after(async () => {
  const { _closeDbForTesting } = await import('../src/hal/db.js');
  _closeDbForTesting();
  for (const [key, value] of Object.entries(oldEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(tmpRoot, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Pure decision logic (no network, no DB)
// ---------------------------------------------------------------------------

const OFF_ENV = { DECISION_ESCALATION: '' } as NodeJS.ProcessEnv;
const AUTO_ENV = { DECISION_ESCALATION: 'auto' } as NodeJS.ProcessEnv;

const HEALTHY_SNAPSHOT = { sensor_1: { temperature: 24.2, humidity: 55 } };
const SILENT_SNAPSHOT = { sensor_1: {} };
const NON_FINITE_SNAPSHOT = { sensor_1: { temperature: NaN } };

test('escalation is off unless DECISION_ESCALATION=auto', () => {
  const ctx = {
    decision: 'alert',
    confidence: 0.1,
    snapshot: SILENT_SNAPSHOT,
  };
  assert.equal(isEscalationEnabled(OFF_ENV), false);
  assert.equal(isEscalationEnabled({} as NodeJS.ProcessEnv), false);
  assert.equal(isEscalationEnabled(AUTO_ENV), true);
  assert.equal(
    shouldEscalateToCloud(ctx, OFF_ENV).escalate,
    false,
    'off must never escalate',
  );
  assert.equal(
    shouldEscalateToCloud(ctx, {} as NodeJS.ProcessEnv).escalate,
    false,
    'default (unset) must never escalate',
  );
  assert.equal(shouldEscalateToCloud(ctx, AUTO_ENV).escalate, true);
});

test('threshold defaults to 0.7 and honors FARMPAL_ESCALATION_CONF', () => {
  assert.equal(getEscalationThreshold(AUTO_ENV), 0.7);
  assert.equal(
    getEscalationThreshold({
      DECISION_ESCALATION: 'auto',
      FARMPAL_ESCALATION_CONF: '0.55',
    } as NodeJS.ProcessEnv),
    0.55,
  );
  // Invalid values fall back to the default rather than exploding.
  assert.equal(
    getEscalationThreshold({
      DECISION_ESCALATION: 'auto',
      FARMPAL_ESCALATION_CONF: 'banana',
    } as NodeJS.ProcessEnv),
    0.7,
  );
  assert.equal(
    getEscalationThreshold({
      DECISION_ESCALATION: 'auto',
      FARMPAL_ESCALATION_CONF: '1.5',
    } as NodeJS.ProcessEnv),
    0.7,
  );
});

test('low confidence escalates below the threshold, not at or above it', () => {
  const reasonsAt = (confidence: number) =>
    shouldEscalateToCloud(
      { decision: 'noop', confidence, snapshot: HEALTHY_SNAPSHOT },
      AUTO_ENV,
    );
  assert.equal(reasonsAt(0.69).escalate, true);
  assert.equal(reasonsAt(0.7).escalate, false);
  assert.equal(reasonsAt(0.95).escalate, false);
  assert.match(reasonsAt(0.69).reasons[0], /confidence/);
});

test('alert-class decisions escalate regardless of confidence', () => {
  const result = shouldEscalateToCloud(
    { decision: 'alert', confidence: 0.99, snapshot: HEALTHY_SNAPSHOT },
    AUTO_ENV,
  );
  assert.equal(result.escalate, true);
  assert.deepEqual(
    result.reasons.filter((r) => r.includes('alert')),
    ['alert-class decision'],
  );
});

test('anomalous snapshots escalate; healthy and empty ones do not', () => {
  assert.equal(
    shouldEscalateToCloud(
      { decision: 'noop', confidence: 0.99, snapshot: SILENT_SNAPSHOT },
      AUTO_ENV,
    ).escalate,
    true,
    'registered sensor with zero readings is an anomaly',
  );
  assert.equal(
    shouldEscalateToCloud(
      { decision: 'noop', confidence: 0.99, snapshot: NON_FINITE_SNAPSHOT },
      AUTO_ENV,
    ).escalate,
    true,
    'non-finite reading is an anomaly',
  );
  assert.equal(
    shouldEscalateToCloud(
      { decision: 'noop', confidence: 0.99, snapshot: HEALTHY_SNAPSHOT },
      AUTO_ENV,
    ).escalate,
    false,
  );
  assert.equal(
    shouldEscalateToCloud(
      { decision: 'noop', confidence: 0.99, snapshot: {} },
      AUTO_ENV,
    ).escalate,
    false,
    'no registered sensors is a setup state, not an anomaly',
  );
});

test('cloud provider selection reuses existing keys in chain order', () => {
  const withEnv = (env: Record<string, string>) => {
    const saved = {
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      pi: process.env.PI_API_KEY,
      zai: process.env.ZAI_API_KEY,
    };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.PI_API_KEY;
    delete process.env.ZAI_API_KEY;
    Object.assign(process.env, env);
    try {
      return getCloudProvider();
    } finally {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.PI_API_KEY;
      delete process.env.ZAI_API_KEY;
      Object.assign(process.env, saved);
    }
  };
  assert.equal(withEnv({ ANTHROPIC_API_KEY: 'k' }), 'anthropic');
  assert.equal(withEnv({ OPENAI_API_KEY: 'k' }), 'openai');
  assert.equal(withEnv({ PI_API_KEY: 'k' }), 'openai');
  assert.equal(withEnv({ ZAI_API_KEY: 'k' }), 'zai');
  assert.equal(
    withEnv({ ANTHROPIC_API_KEY: 'a', ZAI_API_KEY: 'z' }),
    'anthropic',
  );
  assert.equal(withEnv({}), null);
});

// ---------------------------------------------------------------------------
// End-to-end through runDecisionCycle with a stubbed global.fetch
// ---------------------------------------------------------------------------

type FetchCall = { url: string; body: any };

function stubFetch(handlers: {
  local: (body: any) => { text: string; model: string };
  cloud?: (body: any) => { text: string; model: string };
}): { calls: FetchCall[]; restore: () => void } {
  const calls: FetchCall[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(init.body) : {};
    calls.push({ url, body });
    if (url.includes('11434')) {
      return new Response(
        JSON.stringify({
          response: handlers.local(body).text,
          model: 'local-sim',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (url.includes('anthropic.com') && handlers.cloud) {
      return new Response(
        JSON.stringify({
          content: [{ type: 'text', text: handlers.cloud(body).text }],
          model: handlers.cloud(body).model,
          stop_reason: 'end_turn',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ error: 'unexpected call' }), {
      status: 500,
    });
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

async function setupDb() {
  const { runMigrations } = await import('../src/hal/db.js');
  runMigrations();
}

async function registerFarm() {
  const { halRegistry } = await import('../src/hal/registry.js');
  const { halSensors } = await import('../src/hal/sensors.js');
  halRegistry.register({
    id: 'sensor_temp',
    type: 'sensor',
    protocol: 'serial',
    host: '/dev/ttyUSB0',
    label: 'Temp sensor',
  });
  // Healthy snapshot: escalation must be driven by confidence, not anomaly.
  halSensors.store({
    device_id: 'sensor_temp',
    metric: 'temperature',
    unit: 'c',
    value: 24.5,
  });
}

async function lastDecisionRow() {
  const { getDb } = await import('../src/hal/db.js');
  return getDb()
    .prepare(
      'SELECT * FROM hal_decision_log ORDER BY decided_at DESC, id DESC LIMIT 1',
    )
    .get() as Record<string, unknown> | undefined;
}

test('runDecisionCycle escalates a low-confidence local answer to the cloud and logs the deciding model', async () => {
  await setupDb();
  await registerFarm();
  process.env.DECISION_ESCALATION = 'auto';
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.OLLAMA_BASE_URL = 'http://localhost:11434';

  const stub = stubFetch({
    local: () => ({
      text: JSON.stringify({
        decision: 'noop',
        confidence: 0.3,
        reasoning: 'not sure',
        device_id: null,
        tool_calls: [],
      }),
      model: 'local-sim',
    }),
    cloud: () => ({
      text: JSON.stringify({
        decision: 'alert',
        confidence: 0.9,
        reasoning: 'temperature trend needs attention',
        device_id: null,
        tool_calls: [],
      }),
      model: 'cloud-sim',
    }),
  });
  try {
    const { runDecisionCycle } = await import('../src/agent/decision-loop.js');
    const result = await runDecisionCycle({ trigger: 'heartbeat' });

    assert.equal(stub.calls.length, 2, 'exactly one local + one cloud call');
    assert.ok(stub.calls[1].url.includes('anthropic.com'));
    assert.equal(result.decision, 'alert');

    const row = await lastDecisionRow();
    assert.ok(row, 'decision row exists');
    assert.equal(
      row!['model'],
      'cloud-sim',
      'hal_decision_log.model records the model that actually decided',
    );
    assert.match(String(row!['reasoning']), /escalated to cloud/);
    assert.match(String(row!['reasoning']), /confidence/);
  } finally {
    stub.restore();
    delete process.env.DECISION_ESCALATION;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
  }
});

test('runDecisionCycle with escalation off makes exactly one local call', async () => {
  await setupDb();
  await registerFarm();
  delete process.env.DECISION_ESCALATION;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.OLLAMA_BASE_URL = 'http://localhost:11434';

  const stub = stubFetch({
    local: () => ({
      text: JSON.stringify({
        decision: 'noop',
        confidence: 0.3,
        reasoning: 'not sure',
        device_id: null,
        tool_calls: [],
      }),
      model: 'local-sim',
    }),
    cloud: () => ({
      text: JSON.stringify({ decision: 'alert', confidence: 0.9 }),
      model: 'cloud-sim',
    }),
  });
  try {
    const { runDecisionCycle } = await import('../src/agent/decision-loop.js');
    await runDecisionCycle({ trigger: 'heartbeat' });

    assert.equal(stub.calls.length, 1, 'no cloud call when escalation is off');
    const row = await lastDecisionRow();
    assert.equal(row!['model'], 'local-sim');
  } finally {
    stub.restore();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
  }
});

test('failed cloud escalation keeps the local answer and the cycle alive', async () => {
  await setupDb();
  await registerFarm();
  process.env.DECISION_ESCALATION = 'auto';
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.OLLAMA_BASE_URL = 'http://localhost:11434';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any) => {
    const url = String(input);
    if (url.includes('11434')) {
      return new Response(
        JSON.stringify({
          response: JSON.stringify({
            decision: 'noop',
            confidence: 0.2,
            reasoning: 'local guess',
            device_id: null,
            tool_calls: [],
          }),
          model: 'local-sim',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    // Cloud endpoint errors.
    return new Response(JSON.stringify({ error: 'cloud down' }), {
      status: 503,
    });
  }) as typeof fetch;
  try {
    const { runDecisionCycle } = await import('../src/agent/decision-loop.js');
    const result = await runDecisionCycle({ trigger: 'heartbeat' });
    assert.equal(result.decision, 'noop', 'local answer survives');
    const row = await lastDecisionRow();
    assert.equal(row!['model'], 'local-sim');
    assert.match(String(row!['reasoning']), /cloud escalation failed/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DECISION_ESCALATION;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
  }
});
