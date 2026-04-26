# Repository Guidelines

## Project Overview

FFT_nano (also branded as FarmPal) is a single Node.js host process that receives chat messages via Telegram and/or WhatsApp, stores chat metadata and messages in SQLite, runs an agent inside an isolated container via `pi`, and sends the agent response back to the originating chat.

Current product surface also includes:

- A farm hardware abstraction layer (HAL) for devices, relays, sensors, cameras, MQTT, serial, GPIO, discovery, decisions, and demo seed data.
- A web control center and a separate HAL UI served by the host process.
- A terminal UI gateway/client.
- Cron v2 task scheduling, heartbeat, memory retrieval/search, knowledge wiki maintenance, file delivery, and coder orchestration flows.

## Project Structure

- `src/` — TypeScript source code. Key files:
  - `src/index.ts` — Main orchestrator logic.
  - `src/app.ts` — Startup, shutdown, WhatsApp connection, HAL initialization.
  - `src/app-state.ts` — Global mutable state and type definitions.
  - `src/message-dispatch.ts` — Message processing, session turns, queue logic.
  - `src/telegram-commands.ts` — Telegram command handling, settings panels, callback queries.
  - `src/pi-runner.ts` — Agent subprocess spawning, snapshots, runtime event emission.
  - `src/cron/` — Cron v2 compatibility, scheduling adapters, and scheduler service types.
  - `src/hal/` — Hardware abstraction layer (sensors, relays, MQTT, serial, GPIO, camera, discovery, decisions).
  - `src/web/control-center-server.ts` — Web control center server and local file APIs.
  - `src/web/hal-ui-server.ts` — Standalone HAL UI/API server, defaulting to `127.0.0.1:3392`.
  - `src/web/hal-ui/` — HAL UI source and built browser assets.
  - `src/tui/` — Terminal UI gateway and client.
  - `src/agent/` — Agent decision loop, LLM interface, and tool executor.
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
npm test               # Run all tests via node --test
npm run typecheck      # Type-check without emitting
npm run format         # Format src/**/*.ts with Prettier
npm run format:check   # Prettier check (CI gate)
npm run validate:skills # Validate repo/runtime skills
npm run release-check   # Full release gate
npm run doctor          # Runtime diagnostics
npm run farm:doctor     # Farm/HAL-oriented diagnostics
npm run hal:ui:build    # Bundle src/web/hal-ui into src/web/hal-ui/dist
npm run hal:ui:watch    # Rebuild HAL UI on changes
npm run hal:ui:open     # Open the HAL UI default URL
npm run web:dev         # Run web/control-center frontend dev server
npm run web:build       # Build web/control-center frontend
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
- For web control center or TUI changes, verify the relevant package/script in addition to TypeScript.

## Runtime and Service Notes

- The long-running host uses a singleton lock at `data/fft_nano.lock`; do not run a second foreground host while the installed service is active.
- Port policy: do not use `28995` or any higher `289xx` port for local previews, service defaults, or fallback servers. This machine has many services in that range. Prefer the FarmPal local block `3390`-`3399` unless the user explicitly provides a different port.
- Normal installed-service restart:
  ```bash
  ./scripts/service.sh restart
  ```
- Rebuild and restart after TypeScript changes:
  ```bash
  npm run build && ./scripts/service.sh restart
  ```
- Local source-level debug path:
  ```bash
  npm run dev
  ```
- The host can serve multiple local surfaces:
  - TUI websocket default: `127.0.0.1:3390`
  - Web control center default: `127.0.0.1:3391`
  - HAL UI default: `127.0.0.1:3392`
- HAL UI environment knobs:
  - `HAL_UI_ENABLED=0` disables the standalone HAL UI server.
  - `HAL_UI_HOST` and `HAL_UI_PORT` override host/port.
  - `HAL_UI_AUTO_OPEN=0` prevents automatic browser opening.
- Telegram is enabled when `TELEGRAM_BOT_TOKEN` is set. WhatsApp auth uses `npm run auth`.
- Avoid starting foreground host commands when Telegram polling is already active in the service; polling conflicts can occur before the lock or upstream channel state makes the issue obvious.

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

- This checkout currently has in-progress HAL UI/server work and related package/script changes.
- `HANDOFF.md` describes a local native-module ABI blocker involving `better-sqlite3` and the local Node runtime. Treat that as local machine state, not release documentation.
- `node_modules_old/`, `compiled/`, `data/`, `groups/`, and other generated/runtime artifacts should not be committed.
- Before treating the checkout as release-ready, run `npm run typecheck`, `npm test`, `npm run secret-scan`, `npm run validate:skills`, `npm run pack-check`, and `git diff --check`.

## Security and Configuration Tips

- Never commit secrets. `.env` is gitignored and used for local runtime configuration.
- Avoid committing personal paths, local data, or dev-only files to `main`.
- The host acquires a singleton lock at `data/fft_nano.lock` to prevent multiple instances.
