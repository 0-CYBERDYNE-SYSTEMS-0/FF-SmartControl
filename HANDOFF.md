# FarmPal — Development Handoff

**Last updated:** 2026-04-25  
**Status:** FarmPal service installed from `~/farmpal`; Control Center moved off 3391

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
| **FarmPal** | `~/farmpal/` | `com.fft_nano` | 3390 (TUI), 3393 (web), 3392 (HAL UI) |

> FarmPal must not bind, probe, or document 3391 as an active local service port.

---

## FarmPal Web UI

- **Dashboard:** `http://127.0.0.1:3392/`
- **Control Center:** `http://127.0.0.1:3393/`
- Root `/` redirects to `/hal-ui/` (code change already in source, needs rebuild per Step 3)
- Built UI files are at: `src/web/hal-ui/dist/main.js` + `main.css` (esbuild output, already compiled)
- The standalone HAL UI is served by `src/web/hal-ui-server.ts` on 3392.

---

## What Was Already Done This Session

- `src/web/control-center-server.ts` — added `302` redirect: `GET /` → `/hal-ui/` (in source, needs `npm run build`)
- `src/web/hal-ui/dist/main.js` + `main.css` — already built (esbuild)
- `farmpal/dist/index.js` — compiled with Control Center defaulted to 3393

---

## better-sqlite3 ABI — Status

The ABI mismatch issue from the previous handoff appears resolved — both repos have the same `.node` file (1913424 bytes, Mar 13). If you hit `Error: ... compiled against ABI ...` on startup:

```bash
cp ~/ff-terminal-parity/node_modules/better-sqlite3/build/Release/better_sqlite3.node \
   ~/farmpal/node_modules/better-sqlite3/build/Release/
```

---

## FarmPal as a Persistent Service (optional, after verifying startup)

The plist templates are in `~/farmpal/launchd/`. Install with:

```bash
# Instantiate the template
sed \
  -e "s|{{NODE_PATH}}|$(node -e 'process.stdout.write(process.execPath)')|g" \
  -e "s|{{PROJECT_ROOT}}|$HOME/farmpal|g" \
  -e "s|{{HOME}}|$HOME|g" \
  ~/farmpal/launchd/com.nanoclaw.plist \
  > ~/Library/LaunchAgents/com.nanoclaw.plist

launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.nanoclaw.plist
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
