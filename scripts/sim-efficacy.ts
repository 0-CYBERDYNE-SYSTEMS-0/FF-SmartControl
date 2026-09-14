#!/usr/bin/env -S npx tsx
/**
 * FarmPal Efficacy Scorecard — SIMULATION harness.
 *
 * Runs the REAL agent (src/agent/decision-loop.ts → the LLM + verifier-gated
 * safety pipeline) against the digital twin and grades it against ground
 * truth that the agent never sees. The twin holds both the exact physical
 * state and the noisy/drifted sensor reading; this harness uses the former as
 * an answer key.
 *
 * The numbers produced here are REAL software behavior on SIMULATED physics.
 * Every report is labeled SIMULATION. This is NOT a real-hardware result and
 * must never be presented as one.
 *
 * Usage:
 *   npx tsx scripts/sim-efficacy.ts [options]
 *
 * Options:
 *   --scenario=normal_day|heat_wave|cold_snap|pump_failure|sensor_fault|recovery
 *   --seed=42            deterministic RNG seed
 *   --ticks=180          number of simulation ticks to run
 *   --tick-ms=5000       simulated milliseconds per tick (for time math)
 *   --speed=1            sim-time multiplier per tick
 *   --decide-every=3     run the agent every N ticks (lower = more LLM calls)
 *   --mode=AUTONOMOUS    OBSERVE_ONLY|SUGGEST|ASSISTED_CONTROL|AUTONOMOUS
 *   --fault=             optional fault to inject after warmup
 *                        (sensor_stuck|device_offline|network_flap|bad_calibration)
 *   --plumbing           run the twin's own autopilot with NO agent/LLM
 *                        (validates the report pipeline at zero cost; the
 *                         report is labeled PLUMBING, not an agent result)
 */

import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';
import fs from 'fs';

// ── CLI parsing ───────────────────────────────────────────────────────────
function arg(name: string, def: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const SCENARIO = arg('scenario', 'normal_day');
const SEED = parseInt(arg('seed', '42'), 10);
const TICKS = parseInt(arg('ticks', '180'), 10);
const TICK_MS = parseInt(arg('tick-ms', '5000'), 10);
const SPEED = parseFloat(arg('speed', '1'));
const DECIDE_EVERY = Math.max(1, parseInt(arg('decide-every', '3'), 10));
const MODE = arg('mode', 'AUTONOMOUS');
const FAULT = arg('fault', '');
const PLUMBING = flag('plumbing');

// Historical replay: a recorded real-world ambient-temperature trace (CSV) that
// drives the enclosure forcing each tick, so the controller fights REAL weather
// instead of a procedural scenario. Resolve + load BEFORE the harness chdirs to
// its sandbox (relative paths would otherwise break). Column 2 if present, else
// column 1; a non-numeric header row is skipped automatically.
const FORCING_CSV = arg('forcing-csv', '');
const FORCING_CSV_ABS = FORCING_CSV
  ? path.resolve(process.cwd(), FORCING_CSV)
  : '';
function loadForcingTrace(file: string): number[] {
  const out: number[] = [];
  for (const line of fs.readFileSync(file, 'utf-8').trim().split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    const v = parseFloat(cols.length > 1 ? cols[1] : cols[0]);
    if (!Number.isNaN(v)) out.push(v);
  }
  return out;
}
const forcingTrace = FORCING_CSV_ABS ? loadForcingTrace(FORCING_CSV_ABS) : null;

// ── Safe bands + danger thresholds graded against ground truth ──────────────
// Bands = "in spec" for a controlled grow tent. Danger = the line a competent
// controller must never let the TRUE value cross.
const BANDS = {
  temperature: { min: 20, max: 28, dangerHigh: 32, dangerLow: 15 },
  humidity: { min: 50, max: 70, dangerHigh: 85, dangerLow: 30 },
  co2: { min: 400, max: 1200, dangerHigh: 1600, dangerLow: 350 },
} as const;
type BandedMetric = keyof typeof BANDS;

// ── Provider preflight (real efficacy needs a model) ───────────────────────
async function llmConfigured(): Promise<boolean> {
  if (process.env.LLM_PROVIDER) return true;
  if (
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.PI_API_KEY ||
    process.env.ZAI_API_KEY ||
    process.env.OLLAMA_BASE_URL
  )
    return true;
  // ESM-native probe for a local Ollama at the documented default endpoint.
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Environment + DB isolation ──────────────────────────────────────────────
// Resolve the report directory in the REAL repo before we chdir away.
const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const reportDir = path.join(repoRoot, 'reports', 'efficacy');

// Sim mode + (unless plumbing) hand control to the real agent.
process.env.HAL_SIM_MODE = '1';
process.env.HAL_SIM_AUTOPILOT = PLUMBING ? '1' : '0';

// Isolate the database in a throwaway dir so the operator's real
// data/fft_nano.db is never touched. getDb() resolves cwd/data, and several
// HAL modules open it at import time — so chdir BEFORE any dynamic import.
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'farmpal-efficacy-'));
process.chdir(sandbox);

// Always remove the throwaway sandbox on exit (incl. errors) — these are full
// SQLite DBs and pile up fast across batch runs, exhausting a small /tmp.
function cleanupSandbox() {
  try {
    process.chdir(repoRoot);
    fs.rmSync(sandbox, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}
process.on('exit', cleanupSandbox);
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    cleanupSandbox();
    process.exit(1);
  });
}

async function main() {
  if (!PLUMBING && !(await llmConfigured())) {
    console.error(
      '\n[efficacy] No LLM provider configured. Real efficacy numbers require\n' +
        '           a model (set LLM_PROVIDER + key, or run Ollama). To validate\n' +
        '           the report pipeline at zero cost instead, run with --plumbing.\n',
    );
    process.exit(2);
  }

  // Dynamic imports (post-chdir) so DB-at-import lands in the sandbox.
  const { runMigrations } = await import('../src/hal/db.js');
  runMigrations();

  const { setAutomationMode } = await import('../src/automation/modes.js');
  const { initializeDefaultSafeStates } = await import('../src/safety/estop.js');
  const { HalSimulator } = await import('../src/hal/simulator.js');
  const { halDecisions } = await import('../src/hal/decisions.js');
  const { getRecentAuditEntries } = await import('../src/safety/audit-log.js');

  initializeDefaultSafeStates();
  setAutomationMode(MODE as any, 'efficacy-harness');

  const sim = new HalSimulator({
    tickMs: TICK_MS,
    speed: SPEED,
    seed: SEED,
    scenario: SCENARIO as any,
  });
  // start() registers devices + opens a timer; we stop the timer immediately
  // and step deterministically ourselves so the agent and physics interleave.
  sim.start();
  sim.stop();

  let runDecisionCycle:
    | ((ctx: { trigger: 'heartbeat' }) => Promise<any>)
    | null = null;
  if (!PLUMBING) {
    ({ runDecisionCycle } = await import('../src/agent/decision-loop.js'));
  }

  // DB handle for in-loop counting (already created in the sandbox).
  const db = (await import('../src/hal/db.js')).getDb();
  const agentRelayCount = () =>
    (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM hal_relays WHERE triggered_by = 'agent'`,
        )
        .get() as { c: number }
    ).c;

  // Per-tick ground-truth samples (zone 0 = Tent A, the controlled zone).
  type Sample = Record<BandedMetric, number> & { tick: number; simMs: number };
  const samples: Sample[] = [];
  const warmup = Math.min(5, Math.floor(TICKS * 0.1));
  let faultInjectedAtTick: number | null = null;
  let llmErrors = 0;
  let agentCalls = 0;
  let firstDangerTick: number | null = null;
  let firstAgentActionAfterDangerTick: number | null = null;

  const isDanger = (s: { temperature: number; humidity: number; co2: number }) =>
    s.temperature > BANDS.temperature.dangerHigh ||
    s.humidity > BANDS.humidity.dangerHigh ||
    s.co2 > BANDS.co2.dangerHigh;

  const simStartMs = Date.now();
  for (let t = 0; t < TICKS; t++) {
    // 0) Historical replay: drive ambient from the recorded trace, spread
    //    evenly across the run so the whole trace is traversed.
    if (forcingTrace && forcingTrace.length) {
      const idx = Math.min(
        forcingTrace.length - 1,
        Math.floor((t / TICKS) * forcingTrace.length),
      );
      sim.setExternalAmbient(forcingTrace[idx]);
    }

    // 1) Advance physics + emit sensor readings.
    sim.runTickForTesting();

    // 2) Inject the requested fault once, after warmup.
    if (FAULT && faultInjectedAtTick === null && t === warmup && !PLUMBING) {
      sim.injectFault(FAULT as any);
      faultInjectedAtTick = t;
    }

    // 3) Let the real agent sense → decide → actuate.
    const actionsBefore = agentRelayCount();
    if (runDecisionCycle && t % DECIDE_EVERY === 0) {
      agentCalls++;
      try {
        const r = await runDecisionCycle({ trigger: 'heartbeat' });
        if (
          typeof r?.reasoning === 'string' &&
          /LLM (error|unavailable)/i.test(r.reasoning)
        )
          llmErrors++;
      } catch {
        llmErrors++;
      }
    }

    // 4) Record ground truth (the answer key the agent never saw).
    const gt = sim.getGroundTruth()[0];
    const sample: Sample = {
      tick: t,
      simMs: (t + 1) * TICK_MS * SPEED,
      temperature: gt.temperature,
      humidity: gt.humidity,
      co2: gt.co2,
    };
    samples.push(sample);

    // 5) Track response latency honestly: first danger crossing, then the
    //    first tick at which the agent actually actuated a relay afterwards.
    if (t >= warmup) {
      if (firstDangerTick === null && isDanger(sample)) firstDangerTick = t;
      if (
        firstDangerTick !== null &&
        firstAgentActionAfterDangerTick === null &&
        agentRelayCount() > actionsBefore
      ) {
        firstAgentActionAfterDangerTick = t;
      }
    }
  }

  // ── Metrics ──────────────────────────────────────────────────────────────
  const graded = samples.filter((s) => s.tick >= warmup);
  const n = graded.length || 1;

  function bandStats(metric: BandedMetric) {
    const b = BANDS[metric];
    let inBand = 0;
    let breaches = 0;
    let min = Infinity;
    let max = -Infinity;
    for (const s of graded) {
      const v = s[metric];
      if (v >= b.min && v <= b.max) inBand++;
      if (v > b.dangerHigh || v < b.dangerLow) breaches++;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return {
      inBandPct: +((inBand / n) * 100).toFixed(1),
      breaches,
      trueMin: +min.toFixed(2),
      trueMax: +max.toFixed(2),
    };
  }

  // Response latency: ticks from first danger crossing to the first agent
  // relay actuation afterwards (both tracked in-loop above). Null if the
  // danger line was never crossed or the agent never acted after it.
  const agentRelayActions = agentRelayCount();
  const responseTicks =
    firstDangerTick !== null && firstAgentActionAfterDangerTick !== null
      ? firstAgentActionAfterDangerTick - firstDangerTick
      : null;
  const responseMinutes =
    responseTicks !== null
      ? +((responseTicks * TICK_MS * SPEED) / 60000).toFixed(1)
      : null;

  // Decision + safety stats.
  const decisions = halDecisions.recent(10000);
  const agentDecisions = decisions.filter(
    (d: any) => d.triggered_by === 'agent',
  );
  const modelsUsed = Array.from(
    new Set(agentDecisions.map((d: any) => d.model).filter(Boolean)),
  );
  const audit = getRecentAuditEntries(10000);
  const denials = audit.filter(
    (a: any) => a.verifierResult === 'DENIED' || a.verifierResult === 'DENIED_WITH_REASON',
  );

  // Bad-sensor robustness: divergence between measured and ground truth on the
  // faulted metric (only meaningful when a sensor fault was injected).
  let badSensorNote = 'no sensor fault injected';
  if (FAULT === 'sensor_stuck' || FAULT === 'bad_calibration') {
    const errReadings = db
      .prepare(`SELECT COUNT(*) AS c FROM hal_sensors WHERE quality = 'error'`)
      .get() as { c: number };
    badSensorNote = `${errReadings.c} readings flagged quality=error after fault at tick ${faultInjectedAtTick}`;
  }

  const report = {
    label: PLUMBING ? 'PLUMBING (sim autopilot, NOT agent)' : 'SIMULATION',
    generatedAt: new Date().toISOString(),
    config: {
      scenario: SCENARIO,
      seed: SEED,
      ticks: TICKS,
      tickMs: TICK_MS,
      speed: SPEED,
      decideEvery: DECIDE_EVERY,
      mode: MODE,
      fault: FAULT || null,
      plumbing: PLUMBING,
      simulatedDurationHours: +((TICKS * TICK_MS * SPEED) / 3_600_000).toFixed(2),
      wallClockSeconds: +((Date.now() - simStartMs) / 1000).toFixed(1),
    },
    grading: {
      gradedSamples: graded.length,
      warmupTicks: warmup,
      temperature: bandStats('temperature'),
      humidity: bandStats('humidity'),
      co2: bandStats('co2'),
    },
    agent: {
      decisionCycles: agentCalls,
      decisionsLogged: agentDecisions.length,
      modelsUsed,
      llmErrors,
      relayActionsByAgent: agentRelayActions,
      firstDangerTick,
      responseTicks,
      responseMinutes,
    },
    safety: {
      verifierDenials: denials.length,
      totalLimitBreaches:
        bandStats('temperature').breaches +
        bandStats('humidity').breaches +
        bandStats('co2').breaches,
    },
    robustness: { badSensorNote },
  };

  // ── Write artifacts ────────────────────────────────────────────────────────
  fs.mkdirSync(reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${SCENARIO}-seed${SEED}-${stamp}`;
  const jsonPath = path.join(reportDir, `${base}.json`);
  const mdPath = path.join(reportDir, `${base}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, renderMarkdown(report));

  console.log(`\n[efficacy] ${report.label} report written:`);
  console.log(`  ${path.relative(repoRoot, jsonPath)}`);
  console.log(`  ${path.relative(repoRoot, mdPath)}`);
  console.log(
    `\n  temp in-band ${report.grading.temperature.inBandPct}% | ` +
      `breaches ${report.safety.totalLimitBreaches} | ` +
      `agent decisions ${report.agent.decisionsLogged} | ` +
      `denials ${report.safety.verifierDenials}\n`,
  );

  // Clean the throwaway DB sandbox.
  try {
    fs.rmSync(sandbox, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}

function renderMarkdown(r: any): string {
  const c = r.config;
  const g = r.grading;
  const row = (m: string, s: any) =>
    `| ${m} | ${s.inBandPct}% | ${s.trueMin} | ${s.trueMax} | ${s.breaches} |`;
  return [
    `# FarmPal Efficacy Report — ${r.label}`,
    '',
    `> **This is a ${r.label} result.** Numbers are real software behavior on`,
    `> simulated physics. This is not a real-hardware deployment result.`,
    '',
    `Generated: ${r.generatedAt}`,
    '',
    '## Run',
    '',
    `- Scenario: \`${c.scenario}\`  ·  Seed: \`${c.seed}\`  ·  Mode: \`${c.mode}\``,
    `- Ticks: ${c.ticks} (${c.simulatedDurationHours}h simulated in ${c.wallClockSeconds}s wall-clock)`,
    `- Agent cadence: every ${c.decideEvery} ticks${c.fault ? `  ·  Fault: \`${c.fault}\`` : ''}`,
    '',
    '## Environmental control (graded vs ground truth)',
    '',
    '| Metric | In-band % | True min | True max | Danger breaches |',
    '|---|---|---|---|---|',
    row('Temperature (°C)', g.temperature),
    row('Humidity (%)', g.humidity),
    row('CO₂ (ppm)', g.co2),
    '',
    '## Agent',
    '',
    `- Decision cycles run: ${r.agent.decisionCycles}`,
    `- Decisions logged (agent): ${r.agent.decisionsLogged}`,
    `- Models used: ${r.agent.modelsUsed.join(', ') || '—'}`,
    `- Relay actions by agent: ${r.agent.relayActionsByAgent}`,
    `- Response to danger: ${
      r.agent.responseMinutes !== null
        ? `${r.agent.responseMinutes} min (${r.agent.responseTicks} ticks)`
        : 'no danger crossing, or agent did not act'
    }`,
    `- LLM errors: ${r.agent.llmErrors}`,
    '',
    '## Safety',
    '',
    `- Verifier denials: ${r.safety.verifierDenials}`,
    `- Total danger-line breaches: ${r.safety.totalLimitBreaches}`,
    '',
    '## Robustness',
    '',
    `- ${r.robustness.badSensorNote}`,
    '',
  ].join('\n');
}

main().catch((err) => {
  console.error('[efficacy] fatal:', err);
  process.exit(1);
});
