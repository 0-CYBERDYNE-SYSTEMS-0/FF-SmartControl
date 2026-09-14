#!/usr/bin/env -S npx tsx
/**
 * FarmPal Efficacy COMPARISON harness — SIMULATION.
 *
 * The single-run scorecard (`sim-efficacy.ts`) reports one in-band %. That
 * number alone cannot tell controller *skill* apart from a scenario that
 * self-heals: on a transient shock, natural physics recover the zone whether
 * the controller acts or not, so "92% in-band" can mean nothing.
 *
 * This harness runs the SAME scenario + seed three ways and reports the DELTA:
 *   1. AI agent        (--mode=AUTONOMOUS) — the real decision/verifier pipeline
 *   2. No control      (--mode=OBSERVE_ONLY) — agent observes but never actuates
 *   3. Dumb thermostat (--plumbing) — the sim's built-in rule-based autopilot
 *
 * Efficacy = (AI in-band %) − (No-control in-band %). If that delta is ~0 the
 * scenario self-heals and proves nothing — use a *_sustained scenario where
 * doing nothing fails. Every report is labeled SIMULATION.
 *
 * Usage:
 *   npx tsx scripts/sim-efficacy-compare.ts --scenario=heat_sustained --seed=3 \
 *     --ticks=120 --tick-ms=30000 --decide-every=12
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

function arg(name: string, def: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
}

const SCENARIO = arg('scenario', 'heat_sustained');
const SEED = arg('seed', '3');
const TICKS = arg('ticks', '120');
const TICK_MS = arg('tick-ms', '30000');
const DECIDE_EVERY = arg('decide-every', '12');
const FORCING_CSV = arg('forcing-csv', '');

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const harness = path.join('scripts', 'sim-efficacy.ts');
const reportDir = path.join(repoRoot, 'reports', 'efficacy');

interface Grade {
  inBandPct: number;
  breaches: number;
  trueMin: number;
  trueMax: number;
}
interface PassResult {
  name: string;
  temperature: Grade;
  humidity: Grade;
  co2: Grade;
  relayActions: number | null;
}

const PASSES: Array<{ name: string; extra: string[] }> = [
  { name: 'AI agent', extra: ['--mode=AUTONOMOUS'] },
  { name: 'No control', extra: ['--mode=OBSERVE_ONLY'] },
  { name: 'Dumb thermostat', extra: ['--plumbing'] },
];

function runPass(name: string, extra: string[]): PassResult {
  const args = [
    'tsx',
    harness,
    `--scenario=${SCENARIO}`,
    `--seed=${SEED}`,
    `--ticks=${TICKS}`,
    `--tick-ms=${TICK_MS}`,
    `--decide-every=${DECIDE_EVERY}`,
    ...(FORCING_CSV ? [`--forcing-csv=${FORCING_CSV}`] : []),
    ...extra,
  ];
  process.stderr.write(`\n▶ ${name}: npx ${args.join(' ')}\n`);
  const res = spawnSync('npx', args, {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const match = out.match(/reports\/efficacy\/\S+\.json/);
  if (!match) {
    process.stderr.write(out.slice(-1500));
    throw new Error(`${name}: no report path found in harness output`);
  }
  const json = JSON.parse(fs.readFileSync(path.join(repoRoot, match[0]), 'utf-8'));
  const g = json.grading;
  const grade = (m: any): Grade => ({
    inBandPct: m.inBandPct,
    breaches: m.breaches,
    trueMin: +m.trueMin.toFixed(2),
    trueMax: +m.trueMax.toFixed(2),
  });
  return {
    name,
    temperature: grade(g.temperature),
    humidity: grade(g.humidity),
    co2: grade(g.co2),
    relayActions: json.agent?.relayActionsByAgent ?? null,
  };
}

const results = PASSES.map((p) => runPass(p.name, p.extra));
const ai = results[0];
const noControl = results[1];
const thermostat = results[2];

const tempDelta = +(ai.temperature.inBandPct - noControl.temperature.inBandPct).toFixed(1);
const breachDelta = noControl.temperature.breaches - ai.temperature.breaches;

function row(r: PassResult): string {
  return (
    `| ${r.name.padEnd(16)} | ${String(r.temperature.inBandPct).padStart(6)}% | ` +
    `${String(r.temperature.breaches).padStart(7)} | ` +
    `${r.temperature.trueMin}–${r.temperature.trueMax} | ${r.relayActions ?? '—'} |`
  );
}

const verdict =
  Math.abs(tempDelta) < 5
    ? '⚠️  DELTA ≈ 0 — scenario self-heals; this does NOT demonstrate controller efficacy. Use a *_sustained scenario.'
    : tempDelta > 0
      ? `✅ AI controller beats no-control by ${tempDelta} pts in-band` +
        (breachDelta > 0 ? ` and prevents ${breachDelta} danger breach(es).` : '.')
      : `❌ AI controller is WORSE than no-control by ${-tempDelta} pts — investigate.`;

const lines = [
  '# FarmPal Efficacy COMPARISON — SIMULATION',
  '',
  '> SIMULATION result — real software behavior on simulated physics. Not a',
  '> real-hardware result. Efficacy = AI minus no-control, never the raw %.',
  '',
  `Scenario: \`${SCENARIO}\`  ·  Seed: \`${SEED}\`  ·  Ticks: ${TICKS} @ ${TICK_MS}ms  ·  Decide every: ${DECIDE_EVERY}`,
  '',
  '## Temperature (the controlled axis)',
  '',
  '| Controller | In-band | Danger | True range °C | Relay acts |',
  '|---|---|---|---|---|',
  row(ai),
  row(noControl),
  row(thermostat),
  '',
  `**Efficacy delta (AI − no-control): ${tempDelta} pts in-band.**`,
  '',
  verdict,
  '',
  '## Humidity / CO₂ (context)',
  '',
  '| Controller | Humidity in-band | CO₂ in-band |',
  '|---|---|---|',
  ...results.map(
    (r) =>
      `| ${r.name} | ${r.humidity.inBandPct}% | ${r.co2.inBandPct}% |`,
  ),
  '',
];

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(reportDir, { recursive: true });
const outPath = path.join(reportDir, `COMPARE-${SCENARIO}-seed${SEED}-${stamp}.md`);
fs.writeFileSync(outPath, lines.join('\n'));

// Machine-readable sidecar for the scorecard aggregator.
const sidecar = {
  label: 'SIMULATION',
  scenario: SCENARIO,
  seed: SEED,
  forcingCsv: FORCING_CSV || null,
  tempDelta,
  breachDelta,
  ai: ai.temperature,
  noControl: noControl.temperature,
  thermostat: thermostat.temperature,
};
fs.writeFileSync(outPath.replace(/\.md$/, '.json'), JSON.stringify(sidecar, null, 2));

process.stdout.write('\n' + lines.join('\n') + '\n');
process.stdout.write(`\n[compare] report written: ${path.relative(repoRoot, outPath)}\n`);
