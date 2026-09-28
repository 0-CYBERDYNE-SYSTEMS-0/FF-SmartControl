# FarmPal — Development Handoff

**Last updated:** 2026-09-28
**Status:** v1.0 direction locked in. See [`DIRECTION.md`](DIRECTION.md).

> **Direction for v1.0:** this is a *software product* sold as a license ($299) or a pre-flashed SD card ($449).
> The Pi, smart plugs, and sensors are the customer's hardware. Hardware kits (Pro Kit, $899) become a Q3 2026
> fulfillment-partnership SKU, not a core product line. Pricing, ship-gate spec, and 1-week engineering calendar:
> **[`market-research-2026.md`](market-research-2026.md)**, **[`ship-gate-spec.md`](ship-gate-spec.md)**.

---

## Current State (2026-09-28)

`main` is at PR #7 (`7ea97dc`). Merged since the last handoff:

- **PR #5 — truth pass (P0 fixes):** command-injection sinks closed (argv-array execution), working CSRF, provisioning guard, hashed audit tokens, control-center auth gate; chat e-stop trips the real E-stop; unknown modes fail closed; factory-default automation mode is `OBSERVE_ONLY`.
- **PR #6 — safety spine:** `executeActuation()` in `src/safety/verifier.ts` is the single actuation chokepoint with an e-stop gate; control-center mutations bearer-gated; `hal_sensors` retention pruning; `describe_camera` feeds camera frames to the LLM.
- **PR #7 — v1 launch specs:** launch decision record D1–D8 in `DIRECTION.md`/`ship-gate-spec.md`; one-click SUGGEST offer in the setup wizard (D2); reference BOM + golden-kit presets (D3); hybrid LLM posture with cloud escalation (D5); launch-gated watering with verifier interlock (D6).

Before any release: `npm run release-check && npm run secret-scan`.

---

## Port Policy

Do not use port `3391` for FarmPal or helper scripts. Current local FarmPal ports:

```
FFT_NANO_TUI_PORT=3390
FFT_NANO_WEB_PORT=3393
HAL_UI_PORT=3392
```

Control Center: `http://127.0.0.1:3393/`
HAL UI: `http://127.0.0.1:3392/`
TUI gateway: `ws://127.0.0.1:3390`

---

## Architecture: Three Separate Programs — Do Not Conflate

| Program | Repo | Launchd | Ports |
|---|---|---|---|
| ff-terminal-parity | `~/ff-terminal-parity/` | `com.ff_terminal_parity` | 28989 (TUI), 28990 (web) |
| fft_nano | `~/fft_nano/` | `com.fft_nano` | 28989 (TUI), 28990 (web) — **its own** |
| **FarmPal** | `~/farmpal/` | `com.farmpal` | 3390 (TUI), 3393 (web), 3392 (HAL UI) |

> FarmPal must not bind, probe, or document 3391 as an active local service port.
> Older `com.fft_nano` LaunchAgents may still exist and point at `~/fft_nano`; do not assume that label owns this checkout.

---

## FarmPal Web UI

- **Dashboard:** `http://127.0.0.1:3392/`
- **Control Center:** `http://127.0.0.1:3393/`
- Built UI files are at: `src/web/hal-ui/dist/main.js` + `main.css` (esbuild output)
- The standalone HAL UI is served by `src/web/hal-ui-server.ts` on 3392.
- HAL UI APIs are protected by admin session auth. If charts show no data, verify `/api/auth/session` before assuming telemetry is missing.
- Live HAL UI state uses `GET /api/hal/stream` with polling fallback to `GET /api/hal/state`.

---

## 2026-05-01 Incident Notes

Symptoms observed:

- HAL UI initially showed **No data** even though the DB had sensor rows.
- After login, Dashboard/Sensors/System/Safety/Settings could appear briefly, then blank or stall.
- Local HTTP ports could listen while requests took seconds or appeared hung.

Root causes found:

- **Auth/session UI gap:** HAL APIs returned `401` without a proper frontend login/session gate, leaving the store empty.
- **Missing SQLite indexes:** `hal_sensors` had no index for `WHERE device_id = ? AND metric = ? ORDER BY read_at DESC LIMIT 1`. `/api/hal/state`, `/api/hal/sensors/latest`, and chart history calls repeatedly scanned the full sensor table.
- **Slow session validation:** `admin_sessions.token_hash` used bcrypt. Every authenticated request scanned active sessions and ran bcrypt comparisons instead of doing an indexed lookup.
- **Runtime mismatch earlier:** launchd initially used Homebrew Node 25, which did not match the `better-sqlite3` native module ABI. `scripts/run-launchd.sh` now prefers the packaged Pocket Server Node binary when available.

Remedies applied/in progress:

- HAL UI login/session gate added.
- `GET /api/hal/stream` SSE live state endpoint added and frontend wired.
- Live DB has indexes created manually:
  - `idx_hal_sensors_latest ON hal_sensors(device_id, metric, read_at DESC)`
  - `idx_hal_sensors_history ON hal_sensors(device_id, metric, read_at ASC)`
- Source and dist migration SQL updated so future restarts recreate those indexes.
- `src/security/session.ts` updated to use deterministic `sha256:` token hashes with legacy bcrypt fallback/upgrade.

After changes, run:

```bash
npm run hal:ui:build
npm run build
./scripts/service.sh restart
```

Then verify:

```bash
curl -i http://127.0.0.1:3392/
curl -i http://127.0.0.1:3392/api/auth/session
```

---

## better-sqlite3 ABI — Status

The ABI mismatch issue can return if launchd runs Homebrew Node 25. Current service startup should use the packaged Pocket Server Node binary via `scripts/run-launchd.sh`. If you hit `Error: ... compiled against ABI ...` on startup, first confirm the Node binary in launchd logs/status before rebuilding native modules.

FarmPal service commands:

```bash
./scripts/service.sh status
./scripts/service.sh logs
./scripts/service.sh restart
```

---

## Key Files

| File | Purpose |
|---|---|
| `src/web/control-center-server.ts` | Main web server — serves both the ops UI and `/hal-ui/` static files |
| `src/web/hal-ui/index.html` | FarmPal dashboard entry point |
| `src/web/hal-ui/dist/main.js` | Compiled dashboard bundle (esbuild) |
| `src/web/hal-ui-server.ts` | Standalone HAL UI server on 3392 |
| `src/hal/` | HAL layer: devices, sensors, decisions, relays, cameras |


## index.ts Decomposition Phases

**Phase 1** — DONE: Extracted `app-state.ts`, `chat-preferences.ts`, `telegram-streaming.ts`, `telegram-commands.ts`, `message-dispatch.ts`, `app.ts`.

**Phase 2** — IN PROGRESS: Replace file-based IPC with EventEmitter for host-local preview/final delivery. Cross-boundary sandbox IPC files remain.

**Phase 3** — IN PROGRESS: Single-path draft streaming via `TelegramPreviewRegistry`. Legacy `telegram-draft-ipc.ts` pending cleanup.

**Phase 4** — IN PROGRESS: Completion resolves against preview/completed registry state. Final consolidation into shared message-dispatch helper pending.
