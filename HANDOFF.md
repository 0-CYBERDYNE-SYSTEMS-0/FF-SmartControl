# FarmPal — Development Handoff

**Last updated:** 2026-04-25  
**Status:** READY TO START — one port conflict to fix, then FarmPal starts clean

---

## The One Blocker: Wrong Port in fft_nano/.env

### What's happening
`com.fft_nano` (a completely separate program at `~/fft_nano/`) has its `.env` overriding its default ports to conflict with FarmPal:

```
# ~/fft_nano/.env — WRONG values squatting on FarmPal's port
FFT_NANO_TUI_PORT=3390
FFT_NANO_WEB_PORT=3391   ← blocks FarmPal
HAL_UI_PORT=3392
```

fft_nano's own defaults (from its `scripts/run-launchd.sh`) are **28989** (TUI) and **28990** (web). Restore them.

### The Fix (do this first)

**Step 1 — Fix fft_nano's port back to its own range**
```bash
# Edit ~/fft_nano/.env — change these two lines:
FFT_NANO_TUI_PORT=28989
FFT_NANO_WEB_PORT=28990
# Remove HAL_UI_PORT=3392 (not fft_nano's concern)
```

**Step 2 — Restart com.fft_nano so it releases 3391**
```bash
launchctl kickstart -k gui/$(id -u)/com.fft_nano
```

**Step 3 — Rebuild FarmPal** (control-center-server.ts was modified — adds `/` → `/hal-ui/` redirect)
```bash
cd ~/farmpal && npm run build
```

**Step 4 — Start FarmPal**
```bash
cd ~/farmpal && node dist/index.js
```

**Step 5 — Open the UI**
```
http://127.0.0.1:3391/hal-ui/
```

---

## Architecture: Three Separate Programs — Do Not Conflate

| Program | Repo | Launchd | Ports |
|---|---|---|---|
| ff-terminal-parity | `~/ff-terminal-parity/` | `com.ff_terminal_parity` | 28989 (TUI), 28990 (web) |
| fft_nano | `~/fft_nano/` | `com.fft_nano` | 28989 (TUI), 28990 (web) — **its own** |
| **FarmPal** | `~/farmpal/` | not yet installed | **3391** (web), 3392 (HAL UI) |

> FarmPal is the ONLY service in the 3390s. Do not install any other service on 3391.

---

## FarmPal Web UI

- **Dashboard:** `http://127.0.0.1:3391/hal-ui/`
- Root `/` redirects to `/hal-ui/` (code change already in source, needs rebuild per Step 3)
- Built UI files are at: `src/web/hal-ui/dist/main.js` + `main.css` (esbuild output, already compiled)
- The HAL UI is served by `src/web/control-center-server.ts` lines 1023–1047 — no separate hal-ui-server needed for static serving

---

## What Was Already Done This Session

- `src/web/control-center-server.ts` — added `302` redirect: `GET /` → `/hal-ui/` (in source, needs `npm run build`)
- `src/web/hal-ui/dist/main.js` + `main.css` — already built (esbuild)
- `farmpal/dist/index.js` — already compiled (tsc), just needs the port conflict resolved to start

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
| `src/web/hal-ui-server.ts` | Standalone HAL UI server on 3392 (optional — not needed if using control-center at 3391) |
| `src/hal/` | HAL layer: devices, sensors, decisions, relays, cameras |
