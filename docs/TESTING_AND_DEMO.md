# Testing & Demo Runbook

Everything here runs on your laptop — **no Pi, no smart plugs, no $100 of hardware.**
Four things you can show, in order of demo impact.

> All efficacy output is labeled **SIMULATION** — real software behavior on simulated
> physics, graded against hidden ground truth. Never present it as a real-hardware result.

Prereq for anything that runs the agent (LLM): load the provider env first.
```bash
set -a && . ./.env && set +a     # provider key/model (MiniMax via the Anthropic path)
```

---

## 1. The efficacy proof (the investor/partner artifact)

Shows the controller keeps a greenhouse in band when **doing nothing would not** —
proven against a no-control baseline so the number can't be self-healing.

**One scenario, three-way comparison:**
```bash
npx tsx scripts/sim-efficacy-compare.ts \
  --scenario=heat_sustained --seed=3 --ticks=120 --tick-ms=30000 --decide-every=12
```
Output: AI vs No-control vs Dumb-thermostat, with the efficacy delta. Writes
`reports/efficacy/COMPARE-*.md` (+ a `.json` sidecar).

**Full scorecard (all stress scenarios × seeds → one document):**
```bash
npx tsx scripts/efficacy-scorecard.ts
```
Writes `reports/efficacy/SCORECARD-*.md` — the consolidated artifact to hand someone.

Available stress scenarios: `heat_sustained`, `cold_sustained` (these are *winnable only
with control*). Transient `heat_wave`/`cold_snap` self-heal and are for safety checks, not
efficacy claims.

---

## 2. The live dashboard (the visual demo)

Boots the twin + the HAL UI dashboard with no real hardware and no LLM cost — the agent's
decisions stream into the UI as the simulated greenhouse reacts.
```bash
CONTAINER_RUNTIME=host FFT_NANO_ALLOW_HOST_RUNTIME=1 \
  HAL_UI_ENABLED=1 HAL_UI_PORT=3392 HAL_SIM_MODE=1 HAL_SIM_TICK_MS=400 \
  HAL_SIM_SCENARIO=heat_wave npm run dev
```
Then open `http://127.0.0.1:3392`. (First run is unprovisioned — complete the short wizard.)

---

## 3. The rung-1 device rig (proof the real device code works)

Proves the controller's **real driver code** talks to real device protocols. The HTTP plug
path needs zero extra installs; MQTT/serial are optional.
```bash
bash scripts/test-rig.sh        # mock Tasmota+Shelly plug on :8888 (+ MQTT if mosquitto present)
```
Verify the real driver controls them (no hardware) — this is also a CI test:
```bash
node --import tsx --test tests/device-rig-http.test.ts
```
Optional live MQTT sensors:  `brew install mosquitto` then re-run the rig.

---

## 4. Historical replay (real recorded weather)

Drives the twin from a **real recorded outdoor-temperature trace** (a real Eugene, OR heat
event ships in `assets/replay/`). Fetch more with `scripts/fetch-openmeteo.ts`.
```bash
npx tsx scripts/sim-efficacy-compare.ts --scenario=normal_day \
  --forcing-csv=assets/replay/eugene-heat-2024.csv --ticks=120 --tick-ms=30000 --decide-every=12
```
Note: multi-day replay is currently damped by the enclosure time-constant (a faithful
multi-day version needs physics sub-stepping). Use the sustained scenarios for rigorous
efficacy; replay is a real-data stress test.

---

## Sanity checks
```bash
npm run typecheck
npm test                 # full suite
node --import tsx --test tests/decision-json-extract.test.ts tests/mqtt-payload-parse.test.ts
```
