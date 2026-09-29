# Repository Guidelines

> **v1.0 direction (locked):** This is a *software product* sold as a license ($299) or a pre-flashed SD card ($449).
> The Pi, smart plugs, and sensors are the customer's hardware. If a change moves the product off this direction,
> update [`DIRECTION.md`](DIRECTION.md) in the same PR. See also [`market-research-2026.md`](market-research-2026.md)
> and [`ship-gate-spec.md`](ship-gate-spec.md).

## Project Overview

FarmPal is a **software product** that ships as an SD card image for the Raspberry Pi (or any Linux box). It controls
the customer's existing Tasmota / Shelly / Kasa smart plugs, MQTT sensors, GPIO relays, and 1-Wire / serial sensors
through a verifier-gated safety policy engine. The current checkout is a hybrid:

- The full FFT_nano host still owns startup, service lifecycle, SQLite state, chat/session routing, TUI gateway, web server, scheduler, heartbeat, and legacy Pi-based agent runs.
- The FarmPal product surface is the HAL, simulator, hardware control APIs, HAL UI, and a newer lightweight farm-controller agent loop under `src/agent/`.
- The newer `src/agent/decision-loop.ts` path calls an LLM directly, reads HAL state, logs decisions, and can execute HAL tool calls without going through the full Pi/container agent loop.

Treat this as a **software product**. The moat is the verifier-gated control plane, the discovery wizard, and the operator experience — not the hardware. The Pi is the customer's hardware; we ship an SD card image and a license key. Prioritize correctness, customer out-of-box reliability, the safety policy engine, the discovery wizard, and the operator dashboard.

Current important reality:

- The local direction is host runtime, not Docker-first, for normal FarmPal development (`CONTAINER_RUNTIME=host` with `FFT_NANO_ALLOW_HOST_RUNTIME=1`).
- Docker may still appear in old release/demo scripts and the legacy Pi isolation story, but it is not the desired blocker for the simpler FarmPal host-runtime path.
- Telegram may be absent during development. The TUI is the active test surface, but the TUI still attaches to the host gateway and existing chat/session machinery.
- The simplified farm agent can be the default message path. When the farm profile is active (`FEATURE_FARM=1`, `FFT_PROFILE=farm`, or auto-detected farm signals) and `FARMPAL_PRIMARY_AGENT` is not disabled (it defaults to on), plain user messages route through `src/agent/turn.ts` (`runFarmPalTurn`) instead of the legacy Pi agent. A message starting with `/legacy` escapes to the old Pi agent loop.

## Project Structure

- `src/` — TypeScript source code. Key files:
  - `src/index.ts` — Main orchestrator logic.
  - `src/app.ts` — Startup, shutdown, WhatsApp connection, HAL initialization.
  - `src/app-state.ts` — Global mutable state and type definitions.
  - `src/message-dispatch.ts` — Message processing, session turns, queue logic.
  - `src/telegram-commands.ts` — Telegram command handling, settings panels, callback queries.
  - `src/pi-runner.ts` — Agent subprocess spawning, snapshots, runtime event emission.
  - `src/agent/` — Lightweight FarmPal agent modules:
    - `turn.ts` — `runFarmPalTurn()`, the per-message FarmPal turn orchestrator. Resolves intent (status/diagnostic/reflection/control/emergency_stop) and routes to diagnostic, reflector, generator, or verifier paths.
    - `decision-loop.ts` — Simplified farm decision cycle, wired behind HAL auto paths (`HAL_AUTO_MODE`, `HAL_AUTO_DECISIONS`).
    - `llm.ts` — Direct provider selection/calls for the simplified farm agent.
    - `tool-executor.ts` — HAL tool execution for control/sensor/camera actions.
    - `generator.ts` and `verifier.ts` — Generator/Verifier control path; wired inside `turn.ts` (and there only), not inside `decision-loop.ts`.
    - `diagnostic.ts` and `reflector.ts` — Support/self-analysis agents exposed through command paths.
  - `src/cron/` — Cron v2 compatibility, scheduling adapters, and scheduler service types.
  - `src/hal/` — Hardware abstraction layer (sensors, relays, MQTT, serial, GPIO, camera, discovery, decisions, simulator).
  - `src/web/control-center-server.ts` — Web control center server and local file APIs.
  - `src/web/hal-ui-server.ts` — Standalone HAL UI/API server, defaulting to `127.0.0.1:3392`.
  - `src/web/hal-ui/` — HAL UI TypeScript source files. Key files contain inline CSS styles that get bundled.
  - `src/web/hal-ui/dist/` — **Bundled HAL UI assets** (CSS/JS). This is what gets served to browsers. **Do not edit directly; edit source files and run `npm run hal:ui:build`.**
  - `src/tui/` — Terminal UI gateway and client.
  - `src/runtime/` — Host-local EventEmitter hub and boundary IPC.
- `web/control-center/` — Vite/React control-center frontend package.
- `tests/` — Test files named `*.test.ts`, run with `node --test`.
- `skills/` — Agent skills. `skills/runtime/` is repo-tracked agent runtime skills; `skills/setup/` contains operator-facing guides.
- `scripts/` — Shell scripts for setup, onboarding, backup, release checks, and secret scanning.
- `bin/` — CLI entry points (`fft`, `fft-nano`).
- `dist/` — Compiled JavaScript output (do not edit directly).
- `data/` — Runtime data, SQLite databases, and per-group agent state.
- `groups/` — Per-group memory files (`MEMORY.md`) and logs.
- `docs/` — Operator docs, cron v2 notes, release docs, reference templates, and technical paper material.

## Build, Test, and Development Commands

```bash
npm run build          # Compile TypeScript to dist/
npm run dev            # Run src/index.ts via tsx (no build step)
npm run start          # Run the compiled host from dist/index.js
npm run auth           # Run WhatsApp auth flow
npm test               # Run all tests via node --test
npm run typecheck      # Type-check without emitting
npm run format         # Format src/**/*.ts with Prettier
npm run format:check   # Prettier check (CI gate)
npm run validate:skills # Validate repo/runtime skills
npm run release-check   # Full release gate
npm run doctor          # Runtime diagnostics
npm run farm:doctor     # Farm/HAL-oriented diagnostics
npm run onboard         # Interactive onboarding CLI
npm run hal:ui:build    # Bundle src/web/hal-ui into src/web/hal-ui/dist
npm run hal:ui:watch    # Rebuild HAL UI on changes
npm run hal:ui:open     # Open the HAL UI default URL
npm run web:install     # Install web/control-center dependencies
npm run web:dev         # Run web/control-center frontend dev server
npm run web:build       # Build web/control-center frontend
npm run tui             # Run compiled TUI launcher
npm run tui:dev         # Run the TUI from TypeScript
```

Run a single test file:

```bash
node --import tsx --test tests/<name>.test.ts
```

## Coding Style and Naming Conventions

- ESM modules with `"type": "module"` in package.json.
- Import paths use `.js` extensions (TypeScript ESM convention).
- Prettier for formatting; no additional linter is configured.
- Use `camelCase` for variables/functions and `PascalCase` for types/classes.
- Keep code self-documenting; avoid unnecessary comments.
- Prefer existing helpers and boundaries over adding parallel abstractions. For example, use the HAL registries/services for farm state, `runtime/host-events.ts` for host event emission, and existing Telegram formatting/splitting helpers for outbound chat text.

## Testing Guidelines

- Framework: Node.js built-in test runner (`node --test`).
- Tests live in `tests/` and are named `*.test.ts`.
- Run tests after every extraction or refactor step to catch regressions immediately.
- For scheduler changes, check both legacy scheduled task payloads and cron v2 payloads. See `docs/CRON_V2.md`.
- For HAL changes, cover database persistence and the affected registry/service behavior when practical. If UI-only behavior changes, run `npm run hal:ui:build`.
- For HAL UI chart toggle changes, verify both `dashboard` and `sensors` views with a live click-through:
  default zone should be **All Zones**, metric toggles must add/remove chart series, and CO₂ should render when `co2_monitor` history exists.
- For web control center or TUI changes, verify the relevant package/script in addition to TypeScript.

## HAL UI Development (src/web/hal-ui/)

The HAL UI has a **two-stage build**:

1. **Source files** (`src/web/hal-ui/views/`, `src/web/hal-ui/components/`, `src/web/hal-ui/tokens.css`)
   - TypeScript/TSX files with **inline CSS styles** (styles are injected via `<style>` tags)
   - These files contain all UI logic and styling

2. **Bundled output** (`src/web/hal-ui/dist/main.js`, `src/web/hal-ui/dist/main.css`)
   - Bundled by esbuild via `npm run hal:ui:build`
   - This is what the HAL UI server serves to browsers
   - Cache-busted via query string (e.g., `?v=20260427-t`)

**Development workflow for HAL UI changes:**

```bash
# 1. Edit source files in src/web/hal-ui/
vim src/web/hal-ui/views/Dashboard.ts

# 2. Rebuild the bundle
npm run hal:ui:build

# 3. Refresh browser (hard refresh with Cmd+Shift+R)
# The HAL UI server serves from src/web/hal-ui/ which reads dist/ for JS/CSS
```

**Why it works this way:**

- The esbuild bundle (`dist/`) contains minified JS + CSS extracted from inline `<style>` tags in source files
- The HAL UI server (`hal-ui-server.ts`) serves static files from `src/web/hal-ui/`
- For JS/CSS assets, it reads from `src/web/hal-ui/dist/`
- HTML templates are served directly from source files

**Important notes:**

- **Always rebuild** (`npm run hal:ui:build`) after editing HAL UI source files
- If changes don't appear, hard-refresh the browser or restart FarmPal
- Update the cache-buster in `src/web/hal-ui/index.html` if needed (the `?v=...` query string)
- `npm run hal:ui:watch` enables watch mode for automatic rebuilds during development

### HAL UI SVG Visuals

- The current HAL UI dashboard/sensor/system/safety visualizations are intentionally implemented as first-party SVG renderers in `src/web/hal-ui/components/` — `EnvironmentCharts.ts` and `LakeTankChart.ts` for per-view environment/tank charts, plus the newer `HeroChart.ts` (dashboard/sensors hero charts), `FarmPalCharts.ts`, and `VegaChart.ts`.
- Keep new FarmPal telemetry visuals in source components, not in `src/web/hal-ui/dist/`. Rebuild with `npm run hal:ui:build` after edits so the served bundle matches source.
- Dashboard environmental overview state lives in `src/web/hal-ui/views/Dashboard.ts`: active metrics default to temperature, humidity, and CO₂, and the default zone is **All Zones** until a zone row is selected.
- Live HAL UI state is streamed from `GET /api/hal/stream` as server-sent events and falls back to `GET /api/hal/state` polling when the stream is unavailable.
- The overview chart should never imply missing sensor data by drawing zero-value fallback readings. Preserve the existing clean-data behavior when adding chart types.
- Prefer compact, inspection-grade SVG controls and charts for operators: metric toggles must stay clickable, zone selection must keep working, and mobile layouts must avoid overlapping labels.
- When debugging blank or slow HAL UI pages, measure authenticated endpoint latency. `hal_sensors` must keep indexes for latest/history lookups:
  - `idx_hal_sensors_latest ON hal_sensors(device_id, metric, read_at DESC)`
  - `idx_hal_sensors_history ON hal_sensors(device_id, metric, read_at ASC)`
  Missing these indexes causes repeated full-table scans from `/api/hal/state`, `/api/hal/sensors/latest`, and chart history calls, which can block the single Node process long enough for pages to appear unloaded.
- HAL UI session tokens are high-entropy random values and should use deterministic indexed hashes, not bcrypt scans per request. If every authenticated endpoint takes seconds even for tiny responses, inspect `admin_sessions` and `src/security/session.ts`.

## Runtime and Service Notes

- The long-running host uses a singleton lock at `data/farmpal.lock`; do not run a second foreground host while the installed service is active.
- Port policy: do not use `28995` or any higher `289xx` port for local previews, service defaults, or fallback servers. This machine has many services in that range. Prefer the FarmPal local block `3390`-`3399` (never `3391`) unless the user explicitly provides a different port.
- Current FarmPal local surfaces:
  - TUI websocket default: `127.0.0.1:3390`
  - Web control center default: `127.0.0.1:3393`
  - HAL UI default/standalone fallback: `127.0.0.1:3392`
- FarmPal should be the only local service using the `3390`-`3399` block. If another checkout/service is squatting on those ports, fix the other service rather than moving FarmPal into the reserved `289xx` range.
- Host runtime is the current target for FarmPal hardware development:
  - `CONTAINER_RUNTIME=host`
  - `FFT_NANO_ALLOW_HOST_RUNTIME=1`
  - In production-like Node environments, `FFT_NANO_ALLOW_HOST_RUNTIME_IN_PROD=1` may also be required.
- With host runtime, `src/app.ts` skips the Docker daemon requirement. Legacy scripts such as `npm run farm:doctor` may still check Docker/Home Assistant demo assumptions and should not be treated as the sole readiness signal for the simplified host-runtime architecture.
- Normal installed-service restart:
  ```bash
  ./scripts/service.sh restart
  ```
- On older installs the macOS LaunchAgent may still be named `com.fft_nano` and may point at a different checkout. `scripts/service.sh` can discover that legacy label for status/restart/logs, but use `./scripts/service.sh install` from this checkout to create the current `com.farmpal` service when you need this checkout to own runtime.
- Rebuild and restart after TypeScript changes:
  ```bash
  npm run build && ./scripts/service.sh restart
  ```
- Local source-level debug path:
  ```bash
  npm run dev
  ```
- HAL UI environment knobs:
  - `HAL_UI_ENABLED=0` disables the standalone HAL UI server.
  - `HAL_UI_HOST` and `HAL_UI_PORT` override host/port.
  - `HAL_UI_AUTO_OPEN=0` prevents automatic browser opening.
- HAL simulator environment knobs:
  - `HAL_SIM_MODE=1` enables the HAL simulator loop instead of periodic HAL polling.
  - `HAL_SENSOR_RETENTION_DAYS` (default 30, `0` disables) prunes `hal_sensors` rows with `read_at` older than the cutoff; the prune runs once shortly after startup and then every 6h.
  - `HAL_SIM_TICK_MS`, `HAL_SIM_SPEED`, `HAL_SIM_SEED`, and `HAL_SIM_SCENARIO` tune simulator runtime behavior.
  - Demo seeding (`seedHalDemoData()`) runs only when `HAL_SIM_MODE=1` or `HAL_SEED_DEMO_DATA=1`. Real deployments must never contain seeded "Tent A" demo rows; treat their presence as a bug.
  - `HAL_SIM_AUTOPILOT=0` disables the simulator's internal rule-based controller and its light-schedule actuation, so the real agent (`runDecisionCycle`, via `HAL_AUTO_DECISIONS=true`) is the sole decision-maker driving the twin. Default (`1`) preserves the legacy self-playing twin. Sim-only — the real-hardware path is unaffected. In sim mode the simulator mirrors relay state from `halRegistry` each tick, and `halRegistry.control()` short-circuits the real HTTP/GPIO call (records state only) so agent/manual actuation closes the physics loop without hardware.
- Efficacy scorecard (`scripts/sim-efficacy.ts`): runs the real agent against the twin, grades against ground truth (`HalSimulator.getGroundTruth()`), and writes a SIMULATION-labeled report to `reports/efficacy/` (gitignored). `--plumbing` validates the pipeline with no LLM cost. Reports are real software behavior on simulated physics — never present them as real-hardware results.
- Safety defaults (see SPEC.md): the factory automation mode is `OBSERVE_ONLY`; autonomy is an explicit operator action. The chat `emergency_stop` intent trips the real E-stop (`src/safety/estop.ts` `activateEstop`), same as the dashboard button.
- HAL UI security invariants: `HAL_UI_AUTH_BYPASS` no longer exists (auth cannot be disabled by env var); mutating HAL UI requests require a CSRF double-submit token (frontend obtains it from the session/login response and sends `X-CSRF-Token`); `/api/provisioning/*` is public only while the system is unprovisioned; Control Center mutating `/api/hal/*` routes require bearer auth in every access mode (per-install token stored `0600` in the data dir when unset); `security_audit` stores session-token hashes, never raw tokens; all `src/hal` external command execution uses argv arrays with validated inputs.
- Simplified FarmPal agent knobs:
  - `HAL_AUTO_MODE=true` plus a message starting with `!auto ` triggers `src/agent/decision-loop.ts` from message dispatch.
  - `HAL_AUTO_DECISIONS=true` triggers the decision loop from periodic HAL heartbeat/poll paths.
  - `FEATURE_FARM` / `FFT_PROFILE` enable the farm profile; `FARMPAL_PRIMARY_AGENT=0` (or `false`/`no`/`off`) forces the legacy Pi agent back as the primary message path. Profile detection lives in `src/profile.ts`.
  - `LLM_PROVIDER`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `LMSTUDIO_BASE_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `ZAI_API_KEY` affect `src/agent/llm.ts`.
  - `ANTHROPIC_BASE_URL` and `ANTHROPIC_MODEL` override the Anthropic provider endpoint/model, enabling any Anthropic-compatible provider (e.g. MiniMax `https://api.minimax.io/anthropic` + model `MiniMax-M3`, Kimi, etc.). The provider appends `/v1/messages` — do not include it. The Anthropic response parser concatenates `text` blocks and skips `thinking` blocks, so reasoning models (MiniMax-M3, Claude extended thinking) return their answer rather than empty output.
- Telegram is enabled when `TELEGRAM_BOT_TOKEN` is set. WhatsApp auth uses `npm run auth`.
- Avoid starting foreground host commands when Telegram polling is already active in the service; polling conflicts can occur before the lock or upstream channel state makes the issue obvious.

## Simplified Farm Agent State

- There are two FarmPal agent entry points, do not conflate them:
  - `runFarmPalTurn()` in `src/agent/turn.ts` — the per-message turn path. Gated by `farmPalPrimaryAgent` (see `src/index.ts`): enabled when `FEATURE_FARM` is active and `FARMPAL_PRIMARY_AGENT` is not disabled. When enabled, it is the default message path and `/legacy` escapes to the Pi agent.
  - `runDecisionCycle()` in `src/agent/decision-loop.ts` — the autonomous decision cycle behind `HAL_AUTO_MODE` (`!auto ` messages) and `HAL_AUTO_DECISIONS` (heartbeat/poll paths).
- `runDecisionCycle()` reads devices from `halRegistry`, sensor readings from `halSensors`, recent decisions from `halDecisions`, then asks the LLM for a strict JSON decision. The device list in the prompt includes each device's exact `id="..."`, and the model is instructed to emit `device_id` matching one of those ids (not the human label) — otherwise the `hal_decision_log` foreign key rejects it.
- A guard in `runDecisionCycle` nulls an unregistered `device_id` (treats it as a safe no-op) before logging, so a hallucinated id cannot throw a foreign-key error and kill the cycle.
- The decision cycle can execute HAL tool calls through `src/agent/tool-executor.ts` and, for `turn_on`/`turn_off` decisions with a valid `device_id`, actuates via `halRegistry.control()` **through the safety verifier** (`src/safety/verifier.ts`): the action is verified, executed, re-verified for mid-action violations, and logged to `halRelays`/audit. Actuation does not require `tool_calls`.
- Do not conflate the two verifiers: `src/safety/verifier.ts` gates decision-loop actuation (policy engine + audit), while the Generator/Verifier pattern (`src/agent/generator.ts`, `src/agent/verifier.ts`) runs only inside the `turn.ts` path.
- The TUI does not bypass the host. TUI messages still enter through the gateway/session/message-dispatch path. For no-Telegram development, verify the TUI session/bootstrap path before assuming a message can reach the farm agent.
- The old Pi runner still exists and is used by the `/legacy` escape hatch, non-farm profiles, and routes the farm turn does not claim (e.g. coding worker). Host runtime means that path spawns local `pi`.

## Agent, Memory, and Skills Notes

- Canonical memory files are `groups/<group>/MEMORY.md` and `groups/global/MEMORY.md`.
- `SOUL.md`/identity templates are stable policy/context files, not compaction log targets.
- Repo runtime skills live under `skills/runtime/`; operator setup guides live under `skills/setup/`.
- Main/admin runs may also sync personal workspace skills from the configured main workspace. Do not commit personal skills, chat IDs, or local operator paths.
- `/coder`, `/coding`, `/coder-plan`, and `/subagents` are host-managed coding flows. Execute-mode coder work should stay in isolated worktrees and report changed files plus test commands.

## Commit and Pull Request Guidelines

- Keep `main` clean and release-ready at all times.
- Do not push directly to `origin/main`; use reviewed PRs.
- Commit messages follow conventional style (e.g., `feat:`, `fix:`, `refactor:`).
- Before promoting a release candidate, run:
  ```bash
  npm run release-check   # validate:skills, typecheck, tests, secret-scan, pack-check
  npm run secret-scan     # verify no personal paths, chat ids, or secrets
  git diff --check        # no merge markers or whitespace breakage
  git status --short      # clean release candidate
  ```

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

- `release-readiness.yml` — Runs on PR/push to `main`:
  - TypeScript type check
  - All tests
  - Secret scan
  - Skills validation
  - Full release gate (`npm run release-check`)
- `skills-only.yml` — Runs when only skills change:
  - Skills validation only (faster, skips full test suite)

## Development Workflow

Use a two-checkout model:

1. Do implementation in a dev checkout/worktree (for example `fft_nano-dev`).
2. Merge via PR to `origin/main`.
3. Fast-forward the local runtime/release checkout on `main`.
4. Build/restart the installed service from that local `main` checkout.

Runtime/service management:

```bash
./scripts/service.sh restart   # Restart the long-running OS service
npm run build && ./scripts/service.sh restart  # Rebuild and restart
```

When investigating runtime behavior, first identify which checkout the active service is using, inspect that checkout's `.env` and logs, then map findings back to the dev checkout for fixes.

## Current Local State Notes

- This checkout may be on a HAL UI feature branch even when `main` points at the same commit. Check `git status --short --branch` before assuming local state.
- Recent local work has focused on HAL UI environment charts (including the `HeroChart` hero visualizations), SVG visual systems, and multi-agent farm-controller commits.
- Current local HAL UI incident findings:
  - "No data" was caused by HAL UI auth/session handling, not absent telemetry.
  - "Pages not loading" was caused by slow authenticated request handling: missing `hal_sensors` indexes plus bcrypt-scanning active admin sessions on every request.
  - `com.farmpal` is the current LaunchAgent for this checkout; old `com.fft_nano` may still exist for another checkout and should not be treated as this runtime unless explicitly selected.
- `HANDOFF.md` tracks local service port-conflict investigation and `better-sqlite3` ABI fallback notes; treat it as machine-local handoff state, not release documentation.
- Current architecture should be described as hybrid: full FFT_nano host plus simplified FarmPal HAL agent modules.
- For customer/OOTB readiness reviews, explicitly check the host-runtime path, TUI/no-Telegram path, HAL hardware path, demo-data behavior, the active agent route (`FFT_PROFILE`/`FEATURE_FARM`/`FARMPAL_PRIMARY_AGENT`), and whether `HAL_AUTO_MODE`/`HAL_AUTO_DECISIONS` are actually enabled.
- `node_modules_old/`, `compiled/`, `store/`, `data/`, `groups/`, and other generated/runtime artifacts should not be committed.
- Before treating the checkout as release-ready, run `npm run typecheck`, `npm test`, `npm run secret-scan`, `npm run validate:skills`, `npm run pack-check`, and `git diff --check`.

## Security and Configuration Tips

- Never commit secrets. `.env` is gitignored and used for local runtime configuration.
- Avoid committing personal paths, local data, or dev-only files to `main`.
- The host acquires a singleton lock at `data/farmpal.lock` to prevent multiple instances.
