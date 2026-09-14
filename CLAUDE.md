# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FarmPal / FFT_nano — Project Instructions

> **v1.0 direction (locked):** This is a *software product* sold as a license ($299) or a pre-flashed SD card ($449).
> The Pi, smart plugs, and sensors are the customer's hardware. If a change moves the product off this direction,
> update [`DIRECTION.md`](DIRECTION.md) in the same PR. See also [`market-research-2026.md`](market-research-2026.md) and [`ship-gate-spec.md`](ship-gate-spec.md).
>
> Other planning docs: [`SPEC.md`](SPEC.md) (product spec), [`DESIGN.md`](DESIGN.md) (design system), [`EXPERIENCE_PLAN.md`](EXPERIENCE_PLAN.md) (UX roadmap), [`AGENTS.md`](AGENTS.md) (agent contributor guide), [`HANDOFF.md`](HANDOFF.md) (session handoff notes).

## Architecture

> **Naming:** the npm package is still named `fft_nano` (v1.7.2) and `FFT_NANO_*` env vars / a leftover `launchd/com.fft_nano.plist` carry that prefix — this is lineage only. The product is **FarmPal**, a self-contained app. It does **not** require or spawn the separate `~/FFT_nano` or `nano-core` programs; the agent is the bundled `@mariozechner/pi-*` npm dependency. FF-SmartControl = the FFT_nano host runtime evolved + the HAL/safety control plane.

Single Node.js host process: receives chat messages (Telegram/WhatsApp), runs a `pi` agent subprocess inside an isolated container, returns responses. SQLite for persistence.

Additional surfaces:
- HAL (hardware abstraction layer): sensors, relays, MQTT, GPIO, serial, camera, discovery, decisions, simulator
- HAL UI: TypeScript/esbuild web dashboard served at `127.0.0.1:3392`
- Web control center: Vite/React frontend at `127.0.0.1:3393`
- TUI: terminal UI gateway/client at `127.0.0.1:3390`

### Autonomous Decision Pipeline

`src/agent/decision-loop.ts` → `runDecisionCycle()` triggers on `message | heartbeat | scheduled_task | manual`. It snapshots sensor state, calls the LLM, and proposes relay actions. Multi-agent roles in `src/agent/`:
- `generator.ts` — proposes actions
- `verifier.ts` — validates proposed actions against policy before execution
- `reflector.ts` — post-run suggestions and self-improvement
- `diagnostic.ts` — structured health/diagnostic reports

### Automation Modes

Four modes in `src/automation/modes.ts`, persisted to SQLite, survive restarts:

| Mode | Behavior |
|---|---|
| `OBSERVE_ONLY` | LLM sees sensor data; zero hardware writes |
| `SUGGEST` | Proposed actions written as `pending_review`; operator must approve |
| `ASSISTED_CONTROL` | 30-second operator veto window before execution |
| `AUTONOMOUS` | Approved actions execute immediately |

### Safety Layer

`src/safety/` is a pure deterministic gate — no LLM calls — that runs before any relay action:
- `policy-engine.ts` — evaluates rules: `max_on_duration`, `min_off_duration`, `max_activations_per_hour`, `allowed_schedule_windows`, `dependency`, `threshold`
- `estop.ts` — emergency stop flag (checked by cron service before task execution) plus the farm-loop hang watchdog. A hang latches `safety_mode` **and** fires an E-Stop together; `isAutonomousAllowed()` blocks the decision loop (returns `noop`) while either is set. Clearing the E-Stop (`clearEstop()`) also clears `safety_mode`, so recovery is operator-gated and the controller resumes after a hang/crash.
- `audit-log.ts` — append-only record of all safety decisions

## Build & Test

```bash
npm run build          # TypeScript → dist/
npm run dev            # Run src/index.ts via tsx (no build step)
npm run start          # Run compiled host from dist/index.js
npm test               # All tests; globs every tests/**/*.test.ts via find
npm run typecheck      # Type-check without emitting

# Single test file (bypass the npm test glob)
node --import tsx --test tests/<name>.test.ts

npm run format         # Prettier write
npm run format:check   # Prettier check (CI)
npm run validate:skills # Validate repo/runtime skills
npm run release-check   # Full release gate (runs typecheck, tests, secret-scan, skills, pack-check)
npm run secret-scan     # Check for personal paths, chat IDs, secrets
npm run doctor         # Diagnose runtime environment issues
npm run onboard        # Interactive operator onboarding CLI

# HAL UI (src/web/hal-ui/)
npm run hal:ui:build   # Bundle source → src/web/hal-ui/dist/
npm run hal:ui:watch   # Rebuild on changes

# Web control center (web/control-center/)
npm run web:install && npm run web:build

# TUI
npm run tui:dev        # Run from TypeScript
```

## HAL UI Development

The HAL UI is a **two-stage esbuild build** — do not edit `dist/` directly.

```
src/web/hal-ui/views/     ← TypeScript views with inline <style> tags
src/web/hal-ui/components/ ← Reusable UI components
src/web/hal-ui/dist/      ← Bundled output served to browsers (DO NOT EDIT)
```

Workflow:
1. Edit source files in `src/web/hal-ui/views/` or `src/web/hal-ui/components/`
2. Run `npm run hal:ui:build`
3. Hard-refresh browser (`Cmd+Shift+R`)

If changes don't appear, update the cache-buster `?v=...` in `src/web/hal-ui/index.html`.

For chart toggle changes, verify both `dashboard` and `sensors` views: default zone = **All Zones**, metric toggles add/remove series, CO₂ renders when `co2_monitor` history exists.

## Key Files

| File | Role |
|---|---|
| `src/index.ts` | Remaining orchestrator logic (~6600 lines, being decomposed) |
| `src/app-state.ts` | All global mutable state and types |
| `src/app.ts` | Startup, shutdown, WhatsApp connection, HAL initialization |
| `src/message-dispatch.ts` | Message processing, session turns, queue logic |
| `src/telegram-commands.ts` | Telegram command handling, settings panels, callback queries |
| `src/pi-runner.ts` | Agent subprocess spawning, snapshots, runtime event emission |
| `src/telegram-streaming.ts` | Visible Telegram preview registry and completion state |
| `src/runtime/host-events.ts` | `HostEventBus` — typed EventEmitter hub for host-local delivery |
| `src/config.ts` | All configuration constants |
| `src/hal/` | HAL registries, sensors, relays, MQTT, simulator |
| `src/hal/db.ts` | HAL-specific SQLite (separate from main `src/db.ts`) |
| `src/agent/` | Multi-agent pipeline: generator, verifier, reflector, diagnostic, decision-loop; `turn.ts` (single agent turn execution), `tool-executor.ts` (tool dispatch) |
| `src/safety/` | Deterministic policy engine, estop, audit-log |
| `src/license/` | License key client/cache, hardware-id binding, `feature-gates.ts` (gates the $299/$449 v1.0 product tiers) |
| `src/automation/modes.ts` | Four automation modes and their transitions |
| `src/cron/service.ts` | Scheduled task runner with exponential backoff |
| `src/farm-action-gateway.ts` | Home Assistant dashboard and canvas action gateway |
| `src/web/hal-ui/` | HAL UI source (views, components, store, API) |
| `src/web/hal-ui-server.ts` | HAL UI/API server |
| `src/web/control-center-server.ts` | Web control center server and local file APIs |

## Active Refactoring (index.ts decomposition)

**Phase 1** — DONE: Extracted `app-state.ts`, `chat-preferences.ts`, `telegram-streaming.ts`, `telegram-commands.ts`, `message-dispatch.ts`, `app.ts`.

**Phase 2** — IN PROGRESS: Replace file-based IPC with EventEmitter for host-local preview/final delivery. Cross-boundary sandbox IPC files remain.

**Phase 3** — IN PROGRESS: Single-path draft streaming via `TelegramPreviewRegistry`. Legacy `telegram-draft-ipc.ts` pending cleanup.

**Phase 4** — IN PROGRESS: Completion resolves against preview/completed registry state. Final consolidation into shared message-dispatch helper pending.

### State Access Pattern

```typescript
import { state, activeChatRuns, ... } from './app-state.js';
// Reassignable vars: state.registeredGroups, state.telegramBot, etc.
// Maps: activeChatRuns.get(...), activeChatRuns.set(...)
```

## Runtime and Service Notes

- Singleton lock at `data/farmpal.lock` — do not run a second foreground host while the installed service is active.
- **Port policy**: do not use `28995` or any `289xx` port. Use the FarmPal local block `3390`–`3399` unless explicitly told otherwise.
- **Container runtime required to boot**: `npm run dev`/`start` exits at startup with `No supported runtime found` unless Docker is present. For local dev on macOS (no Pi/Docker), run the agent unisolated on the host: prefix with `CONTAINER_RUNTIME=host FFT_NANO_ALLOW_HOST_RUNTIME=1`. (Note: provisioning bakes these same two vars into the generated `.env` — i.e. the shipped default runs the agent **on the host, not isolated**.)
- **Provisioning gate**: a fresh checkout is unprovisioned — HAL UI data APIs return `{"error":"System not provisioned"}` and redirect to `/login` until setup completes. Setup runs via the HAL UI wizard or `npm run onboard`; it writes `.env`, `data/provisioned`, and `data/provisioning-state.json` (see `src/first-boot.ts` `generateEnv`/`completeProvisioning`). Admin login user is always `admin`; the password is set during setup (bcrypt hash, no default). If the wizard hangs on "Saving…", the host process isn't running to receive the POST (often the container-runtime exit above) — verify a listener on `3392` and that no `.env`/`provisioned` marker means `/complete` never ran.
- **HAL UI smoke test (no LLM cost)**: boot the twin and serve the dashboard without real hardware:
  ```bash
  CONTAINER_RUNTIME=host FFT_NANO_ALLOW_HOST_RUNTIME=1 \
    HAL_UI_ENABLED=1 HAL_UI_PORT=3392 HAL_SIM_MODE=1 HAL_SIM_TICK_MS=400 HAL_SIM_SCENARIO=heat_wave npm run dev
  ```
  The sim autopilot logs real decisions (with reasoning) into `hal_decision_log`; WhatsApp connection errors in the log are unrelated (no auth).
- Service management:
  ```bash
  ./scripts/service.sh restart
  npm run build && ./scripts/service.sh restart   # after TypeScript changes
  ```
- HAL UI env knobs: `HAL_UI_ENABLED`, `HAL_UI_HOST`, `HAL_UI_PORT`, `HAL_UI_AUTO_OPEN`
- HAL simulator env knobs: `HAL_SIM_MODE=1`, `HAL_SIM_TICK_MS`, `HAL_SIM_SPEED`, `HAL_SIM_SEED`, `HAL_SIM_SCENARIO`
  - `HAL_SIM_AUTOPILOT=0` disables the simulator's *internal* rule-based controller and light-schedule actuation, so the real agent (`runDecisionCycle`, via `HAL_AUTO_DECISIONS=true`) is the sole decision-maker driving the twin. Default (`1`) keeps the legacy self-playing behavior. Sim-only; the real-hardware path is unaffected.
  - Efficacy scorecard: `npx tsx scripts/sim-efficacy.ts [--scenario --seed --ticks --decide-every --mode --fault | --plumbing]` runs the real agent against the twin, grades it against ground truth, and writes a SIMULATION-labeled report to `reports/efficacy/` (gitignored). `--plumbing` validates the pipeline with no LLM cost.
- Agent LLM provider (`src/agent/llm.ts`): `LLM_PROVIDER` selects ollama/anthropic/openai/zai/lm-studio. `ANTHROPIC_BASE_URL` + `ANTHROPIC_MODEL` override the Anthropic endpoint/model for any Anthropic-compatible provider (e.g. MiniMax: `LLM_PROVIDER=anthropic ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic ANTHROPIC_MODEL=MiniMax-M3`). The provider appends `/v1/messages` — do not include it. Reasoning-model responses (thinking + text blocks) are parsed correctly.
- Telegram enabled when `TELEGRAM_BOT_TOKEN` is set; WhatsApp auth via `npm run auth`

## Development Workflow

Two-checkout model:
1. Implement in a dev worktree.
2. Merge via PR to `origin/main`.
3. Fast-forward the runtime checkout to `main`.
4. `npm run build && ./scripts/service.sh restart` from that checkout.

Runtime debugging always starts from the active service checkout (`.env`, logs, launchd state), then fixes go into the dev checkout via PR.

## CI/CD

Required before any release/tag:
```bash
npm run release-check
npm run secret-scan
```

GitHub Actions:
- `release-readiness.yml` — typecheck, tests, secret-scan, validate:skills, release-check (runs on PR/push to `main`)
- `skills-only.yml` — validate:skills only (faster, for skills-only changes)

## Conventions

- ESM modules (`"type": "module"`); import paths use `.js` extensions
- `camelCase` for variables/functions, `PascalCase` for types/classes
- Tests in `tests/`, named `*.test.ts`
- No unnecessary comments — code should be self-documenting
- Use existing HAL registries/services for farm state; use `runtime/host-events.ts` for host event emission
- Repo runtime skills: `skills/runtime/`; operator setup guides: `skills/setup/`
