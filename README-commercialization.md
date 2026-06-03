# FarmPal Commercialization

> **This is a software product.** The Pi, smart plugs, and sensors are the customer's hardware.
> See **[`DIRECTION.md`](DIRECTION.md)** for the v1.0 direction, **[`market-research-2026.md`](market-research-2026.md)** for pricing rationale, and **[`ship-gate-spec.md`](ship-gate-spec.md)** for the engineering plan.

This document summarizes the work completed during the FarmPal commercialization mission, which transformed FarmPal from a developer-centric system into a **production-ready, software product that ships as an SD card image** for Raspberry Pi (or any Linux box).

The product is sold as one of two SKUs at v1.0:

- **FarmPal Software License** — $299 one-time. Customer brings their own Pi.
- **FarmPal Edition Pre-flashed SD Card** — $449 one-time. We ship a pre-burned card.

Hardware kits (Pi 5 + Tasmotas + sensors) become a separate SKU line in Q3 2026, sold as a *fulfillment partnership* — not a core product line. The moat is the **software**, not the BOM.

---

## What Was Built

### Milestone 1: Image Pipeline

- **SD card build scripts** for Raspberry Pi OS Bookworm (via pi-gen-style configuration in `image/`)
- **First-boot provisioning state machine** (`src/first-boot.ts`) — detects unprovisioned state, enters provisioning mode, generates `.env` atomically
- **WiFi setup** (`06-wifi-setup.sh`) with WPA2-PSK validation and configurable WiFi country
- **mDNS advertisement** via Avahi — FarmPal discoverable as `farmpal.local` on LAN
- **Randomized SSH password** generated on first boot, stored with `chmod 0600`
- **Partition auto-resize** via first-boot script
- **No secrets, no demo data, no `.env` in image** — clean provisioning state on flash

### Milestone 2: First-Boot Wizard

- **6-step browser-based setup wizard** served at `farmpal.local` (or `http://localhost:3392`)
- Steps: admin password → farm name → timezone (auto-detected) → WiFi → LLM provider + API key → Telegram (optional)
- Step persistence across browser refresh (server-side via `PUT /api/provisioning/wizard-step`)
- Mobile/tablet responsive layout (768px+)
- On completion: `.env` written, provisioning flag set, redirect to dashboard
- Re-entry from Settings with current values pre-populated

### Milestone 3: Safety System

- **Safety policy engine** (`src/safety/policy-engine.ts`): per-device rules in SQLite — `max_on_duration`, `min_off_duration`, `max_activations_per_hour`, `allowed_schedule_windows`, `dependency_rules`
- **Generator/Verifier control path**: LLM proposes → Verifier evaluates against rules + sensor snapshot → `APPROVED`/`DENIED` → hardware only on `APPROVED`
- **Emergency Stop (E-Stop)**: red button in HAL UI header on all views — suspends autonomous loop, sets all relays to per-device safe states, persists to SQLite across restarts
- **Watchdog**: `sd_notify` pings systemd every 15s (`WatchdogSec=30`), farm loop hang (>5 min no decision) triggers safety mode
- **Safety UI**: per-device rule editor, safety state indicator (NORMAL/WARNING/EMERGENCY_STOP), denial messages shown in UI

### Milestone 4: Local Dashboard (HAL UI)

- **Complete HAL UI** served at `127.0.0.1:3392` (standalone) — fully functional without Telegram or TUI
- **Dashboard view**: CALM/OPERATOR/DIAGNOSTIC layouts, GROW/HARVEST/MONITOR mode accent switching, KPI strip (temperature, humidity, soil moisture, light, CO₂), decision cards
- **Devices view**: relay toggle, detail panel, filters, status borders (green=online, red=offline, slate=unknown)
- **Sensors view**: hero chart, metric toggles, zone filter, time ranges, quality indicators, CO₂ conditional rendering
- **Decisions view**: expandable rows, heatmap (7×24), trend chart, status filter, ASSISTED countdown timer
- **Cameras view**: thumbnail grid, capture button, demo mode indicator, offline indicator
- **System status**: HAL/MQTT/DB connectivity, uptime
- **Discovery wizard**: 5-step flow for GPIO, MQTT, HTTP/Tasmota, HTTP/Shelly, Serial — with pin diagram, topic subscription, connectivity validation
- **Sensor calibration**: per-device per-channel offset, reset-to-zero, persists across restarts
- **SPA routing** with hash-based navigation, tab bar wired to view rendering
- **Relay safe state configuration**: per-relay safe state (on/off/toggle/latching), shutdown sequence (100ms between relays), E-Stop simultaneous

### Milestone 5: Automation

- **Four automation modes**: OBSERVE_ONLY (no actions), SUGGEST (UI recommendations), ASSISTED_CONTROL (30s operator veto window), AUTONOMOUS (immediate execution)
- **Mode selector** in header with color badge (green/blue/amber/red)
- **Mode persisted** to SQLite, survives restart
- **Threshold configuration**: per-device or per-zone min/max for temperature, humidity, soil_moisture, CO₂, light — threshold violations cause `DENIED` in safety engine
- **Manual override**: operator can toggle any relay in AUTONOMOUS/ASSISTED at any time, bypasses pending queue, logged with `triggered_by: 'manual-ui'`
- **LLM provider/model selection**: Ollama (default), OpenAI, Anthropic, ZAI, MiniMax, LM Studio — selectable in Settings
- **Decision display**: all decisions with timestamp, action, confidence, reasoning, sensor snapshot; status filter; DENIED shows denial reason; manual overrides distinguished with MANUAL badge

### Milestone 6: Service Reliability

- **Hardened systemd unit** (`systemd/farmpal.service`): `WatchdogSec=30`, `ProtectSystem=strict`, `NoNewPrivileges=true`, `LimitNOFILE=65536`, non-root `farmpal` user, `EnvironmentFile`
- **Health endpoint** `GET /health`: returns JSON `{ok, hal, db, mqtt, uptime_seconds}`, 503 when any component unhealthy
- **Port conflict detection**: human-readable error with PID + process name, non-zero exit
- **Singleton lock** with stale lock cleanup
- **Clean shutdown**: SIGTERM handler sets all relays to safe states before exit, completes within 30 seconds
- **Logrotate** configuration (daily, rotate 7, compress)
- **Scheduled backup** via systemd timer (daily, 7 daily + 4 weekly retention)
- **Manual backup trigger** from dashboard (admin auth)
- **Factory reset**: CLI (`farmpal-reset`) + dashboard button, requires typing `FACTORY RESET` to confirm, clears DB + `.env`, logs to audit
- **Crash recovery**: SQLite integrity check on startup, clear error on corruption, recovery mode, `Restart=always` via systemd

### Milestone 7: Security

- **HTTPS** with self-signed cert generated on first boot (stored in `data/certs/`), user-uploaded cert option, certificate fingerprint shown in UI
- **Session-based auth**: `HttpOnly Secure SameSite=Strict` cookie, bcrypt admin password (cost ≥ 10, no default)
- **Login rate limiting**: 5 failed logins in 60s → 5-minute lockout → 429 response, logged to audit
- **Session expiry** (24h), logout clears session, session fixation prevention via `crypto.randomBytes(32)` tokens
- **CSRF protection**: double-submit cookie pattern, `X-CSRF-Token` header required on POST/PUT/DELETE
- **Security headers**: HSTS, `X-Frame-Options: DENY`, CSP, Referrer-Policy
- **Network binding**: default `127.0.0.1` (localhost only), LAN binding requires explicit opt-in + admin auth + audit log, WAN access requires HTTPS + opt-in, warning banner when LAN-bound without HTTPS
- **API rate limiting**: 100 requests/min/session → 429 with `Retry-After` header
- **Security audit logging**: LOGIN_SUCCESS/FAILURE, SESSION_CREATED/DESTROYED, CSRF_FAILURE, RATE_LIMIT_HIT, ADMIN_ACTION

### Milestone 8: Updates & Licensing

- **License activation**: device-bound key (hardware ID from Pi serial/MAC), trial (14 days), cached in SQLite for 30 days for offline operation
- **Feature gates**: UNLICENSED → local only; TRIAL → all features 14d; LICENSED → all; EXPIRED → local only + banner
- **Update system**: periodic version check (daily), semver comparison, changelog display, step-by-step progress UI (Backup → Download → Verify → Install → Restart)
- **Automatic rollback** on failure (`farmpal.prev` snapshot), manual rollback button, audit log entry
- **Update history** in settings, version in footer

### Milestone 9: Documentation

- **8 operator guides** in `docs/`:
  - `QUICKSTART.md` — flash → boot → browser → wizard → dashboard in 15 min
  - `HARDWARE.md` — GPIO pinout, relay/sensor wiring, electrical safety, enclosure specs
  - `SAFETY.md` — disclaimers, fire hazards, grounding, IP rating, support URL
  - `DASHBOARD.md` — all views, controls, chart interpretation, mode switching
  - `AUTOMATION.md` — autonomous control, four modes, threshold config, safety policies
  - `TROUBLESHOOTING.md` — 5+ common issues with 3+ fix steps each
  - `BACKUP_RESTORE.md` — manual/auto backup, storage location, restore steps
  - `FACTORY_RESET.md` — how to, what erased, what preserved, confirmation required
- **Formal QA test matrix** at `docs/QA_MATRIX.md`: 40+ rows covering Installation & Boot, Network & Discovery, First-Boot Wizard, Dashboard, Device Discovery, Safety, Automation, Service, Security, Updates, Recovery
- All docs accessible from HAL UI Settings → Help/Documentation, responsive (1024×768, ≥14px body), offline (bundled locally)

---

## Hardware-Only Validations

The following require testing on real Raspberry Pi hardware and cannot be validated in a macOS build environment:

- SD card flashing and boot to clean provisioning state
- WiFi provisioning with real WiFi network
- mDNS discovery (`farmpal.local`) from browser on same LAN
- HDMI console IP display when no network
- E-Stop hardware button (physical GPIO button triggering safety mode)
- Watchdog systemd integration (`sd_notify` → systemd `WatchdogSec=30`)
- Real relay/sensor control via GPIO and serial
- Real MQTT device discovery
- Real Tasmota/Shelly HTTP device discovery
- Factory reset from physical console
- Backup/restore with real storage media
- License activation server communication
- Update download and install on real hardware

---

## Running Tests

```bash
npm test                     # All unit tests (node --test)
npm run typecheck           # TypeScript type check (tsc --noEmit)
npm run hal:ui:build        # Rebuild HAL UI bundle (esbuild)
npm run format:check        # Prettier format check
npm run secret-scan         # Check for committed secrets
npm run validate:skills     # Validate repo/runtime skills
npm run release-check        # Full release gate (typecheck + tests + secret-scan + skills)
```

---

## Key Files

| File/Directory | Role |
|---|---|
| `systemd/farmpal.service` | Production hardened systemd unit |
| `image/` | Pi-gen configuration for SD card image build |
| `src/first-boot.ts` | First-boot provisioning state machine |
| `src/safety/` | Safety policy engine, E-Stop, watchdog, verifier |
| `src/web/hal-ui/` | HAL UI TypeScript source (views, components, store) |
| `src/web/hal-ui/dist/` | Bundled HAL UI output (CSS/JS, served to browser) |
| `src/automation/modes.ts` | Four automation modes with veto window |
| `src/license/` | License activation, cache, offline operation |
| `src/update/` | Update system with rollback support |
| `src/web/hal-ui-server.ts` | HAL UI/API standalone server |
| `src/cron/service.ts` | Cron v2 scheduler and scheduled task runner |
| `src/hal/` | HAL registries, sensors, relays, discovery |
| `docs/QA_MATRIX.md` | Formal QA test matrix (40+ test cases) |
| `docs/*.md` | 8 operator guides (QUICKSTART, HARDWARE, SAFETY, etc.) |
| `data/` | Runtime data, SQLite databases, certs, locks |

---

## Architecture Highlights

- **Host runtime first**: `CONTAINER_RUNTIME=host` + `FFT_NANO_ALLOW_HOST_RUNTIME=1`; no Docker required for FarmPal hardware development
- **Generator/Verifier as only autonomous path**: all hardware actions go through LLM → Verifier → APPROVED → hardware; no bypass
- **Singleton lock** at `data/farmpal.lock` (not `fft_nano.lock`)
- **FarmPal local surfaces**: HAL UI `127.0.0.1:3392`, TUI `127.0.0.1:3390`, Web control center `127.0.0.1:3393`
- **Two-stage HAL UI build**: source in `src/web/hal-ui/views/` → bundled to `src/web/hal-ui/dist/` → served by `hal-ui-server.ts`
