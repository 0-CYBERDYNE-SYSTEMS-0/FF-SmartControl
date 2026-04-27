# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FarmPal / FFT_nano — Project Instructions

## Architecture

Single Node.js host process: receives chat messages (Telegram/WhatsApp), runs a `pi` agent subprocess inside an isolated container, returns responses. SQLite for persistence.

Additional surfaces:
- HAL (hardware abstraction layer): sensors, relays, MQTT, GPIO, serial, camera, discovery, decisions, simulator
- HAL UI: TypeScript/esbuild web dashboard served at `127.0.0.1:3392`
- Web control center: Vite/React frontend at `127.0.0.1:3393`
- TUI: terminal UI gateway/client at `127.0.0.1:3390`

## Build & Test

```bash
npm run build          # TypeScript → dist/
npm run dev            # Run src/index.ts via tsx (no build step)
npm run start          # Run compiled host from dist/index.js
npm test               # All tests via node --test
npm run typecheck      # Type-check without emitting

# Single test file
node --import tsx --test tests/<name>.test.ts

npm run format         # Prettier write
npm run format:check   # Prettier check (CI)
npm run validate:skills # Validate repo/runtime skills
npm run release-check   # Full release gate (runs typecheck, tests, secret-scan, skills, pack-check)
npm run secret-scan     # Check for personal paths, chat IDs, secrets

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
| `src/index.ts` | Remaining orchestrator logic (~5700 lines, being decomposed) |
| `src/app-state.ts` | All global mutable state and types |
| `src/app.ts` | Startup, shutdown, WhatsApp connection, HAL initialization |
| `src/message-dispatch.ts` | Message processing, session turns, queue logic |
| `src/telegram-commands.ts` | Telegram command handling, settings panels, callback queries |
| `src/pi-runner.ts` | Agent subprocess spawning, snapshots, runtime event emission |
| `src/telegram-streaming.ts` | Visible Telegram preview registry and completion state |
| `src/runtime/host-events.ts` | `HostEventBus` — typed EventEmitter hub for host-local delivery |
| `src/config.ts` | All configuration constants |
| `src/hal/` | HAL registries, sensors, relays, MQTT, simulator |
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

- Singleton lock at `data/fft_nano.lock` — do not run a second foreground host while the installed service is active.
- **Port policy**: do not use `28995` or any `289xx` port. Use the FarmPal local block `3390`–`3399` unless explicitly told otherwise.
- Service management:
  ```bash
  ./scripts/service.sh restart
  npm run build && ./scripts/service.sh restart   # after TypeScript changes
  ```
- HAL UI env knobs: `HAL_UI_ENABLED`, `HAL_UI_HOST`, `HAL_UI_PORT`, `HAL_UI_AUTO_OPEN`
- HAL simulator env knobs: `HAL_SIM_MODE=1`, `HAL_SIM_TICK_MS`, `HAL_SIM_SPEED`, `HAL_SIM_SEED`, `HAL_SIM_SCENARIO`
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
