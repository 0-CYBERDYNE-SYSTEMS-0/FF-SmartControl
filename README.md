![FF_SmartControl Logo](logo.png)

# FF_SmartControl

[![Release](https://img.shields.io/github/v/release/0-CYBERDYNE-SYSTEMS-0/FFT_nano)](https://github.com/0-CYBERDYNE-SYSTEMS-0/FFT_nano/releases)
[![Release Readiness](https://img.shields.io/github/actions/workflow/status/0-CYBERDYNE-SYSTEMS-0/FFT_nano/release-readiness.yml?branch=main&label=release%20readiness)](https://github.com/0-CYBERDYNE-SYSTEMS-0/FFT_nano/actions/workflows/release-readiness.yml)
[![License: MIT](https://img.shields.io/github/license/0-CYBERDYNE-SYSTEMS-0/FFT_nano)](LICENSE)

> **This is a software product.** The Raspberry Pi, smart plugs, and sensors are the *customer's* hardware.
> We sell a license ($299) or a pre-flashed SD card ($449). See **[`DIRECTION.md`](DIRECTION.md)** for the v1.0 direction.

**FF_SmartControl** is the local-first, autonomous farm control plane that runs on a Raspberry Pi 5 (or any Linux box) and turns a customer's existing smart plugs, MQTT sensors, and GPIO relays into a verifier-gated, AI-controlled farm. Operator brand: **FarmPal**. Parent host: **FFT_nano**.

It discovers Tasmota / Shelly / Kasa smart plugs on the LAN, subscribes to MQTT sensor topics, evaluates LLM-proposed actions against a deterministic safety policy engine, and only ever flips a relay when the **verifier** approves. Operator gets a Telegram chat surface, a HAL UI dashboard at `farmpal.local`, four automation modes, and an emergency stop.

No subscriptions. No cloud dependency. MIT licensed core, commercial license for the autonomous control plane.

## What we sell

| SKU | Price | What's in the box | Buy it because… |
|---|---|---|---|
| **FarmPal Software License** | **$299** one-time | License key, full source access, MIT core + commercial license for the verifier-gated control plane. Customer brings their own Pi. | You already have a Pi and you're comfortable flashing a card. |
| **FarmPal Edition Pre-flashed SD Card** | **$449** one-time | 64GB SanDisk Industrial card with the image pre-burned, boot wizard waiting, license pre-registered. | You want to plug, browse to `farmpal.local`, and start using it. |
| **FarmPal Pro Kit** *(Q3 2026)* | **$899** one-time | Pi 5 8GB + case + PSU + 2× Tasmota + 1× BME280 + 1× soil moisture sensor + pre-flashed card + license | You want one cart, one shipping box, zero soldering. |

Pricing rationale and competitor comparison: see **[`market-research-2026.md`](market-research-2026.md)**. Ship-gate plan and the 1-week engineering calendar: see **[`ship-gate-spec.md`](ship-gate-spec.md)**.

## Key Capabilities

| Local-First Control | Verifier-Gated Safety | Multi-Provider AI |
|---|---|---|
| Discovers Tasmota / Shelly / Kasa smart plugs, MQTT sensors, and 1-Wire / serial sensors on the LAN. No cloud roundtrip. Every relay flip is on the operator's own network. | A pure deterministic policy engine (`max_on_duration`, `min_off_duration`, `max_activations_per_hour`, `allowed_schedule_windows`, `dependency`, `threshold`) is the **only** path to hardware. LLM proposes → verifier approves/denies → hardware only on `APPROVED`. Emergency stop sets per-device safe states. | OpenAI, Anthropic, Gemini, OpenRouter, Ollama, LM Studio, ZAI, MiniMax, Kimi. The Pi can run a local Ollama model offline; cloud providers are optional. |

## Farm-Proven

Built by a farmer with 24 years of field experience and 3+ years of real operational testing on a working farm. Designed for real equipment running real loads — not a marketing demo.

**Links:** [Releases](https://github.com/0-CYBERDYNE-SYSTEMS-0/FFT_nano/releases) · [Security](.github/SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Operator Docs](docs/) · [Direction](DIRECTION.md) · [Market Research](market-research-2026.md) · [Ship Gate](ship-gate-spec.md)
- Support: `SUPPORT.md`
- Changelog: `CHANGELOG.md`

## Quick Start

The product ships in two ways. Pick the one that matches your hardware situation.

### A. You already have a Raspberry Pi 5 (or a Linux box)

```bash
# 1. Get the image
# Either download the latest .img.xz from
#   https://github.com/0-CYBERDYNE-SYSTEMS-0/FFT_nano/releases
# Or, from this repo, build the image yourself:
./build-docker.sh

# 2. Flash it
#   - Raspberry Pi Imager → "Use custom image" → select the .img.xz
#   - Or:  balenaEtcher
#   - Or:  dd if=image.img of=/dev/rdiskN bs=4m

# 3. Boot the Pi, plug it into your LAN, then from any device on the same LAN:
#    Browse to  http://farmpal.local
#    (or  http://<pi-ip-address>  if mDNS doesn't resolve)

# 4. Walk through the 6-step wizard:
#    admin password → farm name → timezone → WiFi → LLM provider + API key → Telegram (optional)
```

The wizard is where you do everything. By the end of it you have a working dashboard and a license activation.

### B. You're starting from this repository (developer / customizer)

```bash
git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/FFT_nano.git
cd FFT_nano
npm ci
./scripts/onboard-all.sh
```

`./scripts/onboard-all.sh` performs:

- safety backup (`~/nano`, `.env`, `data/`, `groups/`)
- dependency install (`npm ci` when lockfile exists)
- `npm run typecheck`
- `npm run build`
- global CLI link (`npm link`) so `fft ...` commands are available
- runtime prep:
  - Docker runtime: build agent image
  - Host runtime: prepare host `pi` runner deps (no image build)
- `.env` scaffold from `.env.example` (if missing)
- mount allowlist scaffold at `~/.config/fft_nano/mount-allowlist.json` (if missing)
- onboarding wizard (`risk gate`, `quickstart|advanced`, `local|remote`, provider/channel/hatch)
- host service step (`install/start` by default, with `--no-install-daemon` support)
- workspace onboarding/bootstrap seed (`NANO.md`, `SOUL.md`, `TODOS.md`, `HEARTBEAT.md`, `MEMORY.md`; preserves `BOOTSTRAP.md` for first-run ritual and `BOOT.md` when enabled)
- doctor health check

Profile defaults:
- fresh installs default to `core` profile
- existing farm-oriented installs auto-preserve to `farm` profile when farm signals/artifacts are detected

If you are upgrading an existing install and want to preserve all local state (`~/nano`, `.env`, `data/`, `groups/`) before changes:

```bash
npm run backup:state
# dry-run preview:
npm run backup:state -- --dry-run
```

Backups are written to `./backups/` by default.

Choose runtime at install time:

```bash
# default/recommended isolated runtime
./scripts/onboard-all.sh --runtime docker

# unisolated host runtime (advanced)
./scripts/onboard-all.sh --runtime host
```

### All Setup Options

`./scripts/onboard-all.sh` accepts the following options:

| Option | Description |
|--------|-------------|
| `--workspace <dir>` | Main workspace path (default: ~/nano) |
| `--env-path <file>` | Path to .env file |
| `--operator <name>` | Primary operator name |
| `--assistant-name <name>` | Assistant name |
| `--accept-risk` | Acknowledge risk before onboarding |
| `--flow <flow>` | quickstart, advanced, or manual |
| `--mode <mode>` | local or remote |
| `--runtime <runtime>` | auto, docker, or host |
| `--auth-choice <choice>` | openai, lm-studio, anthropic, gemini, openrouter, zai, minimax, kimi-coding, ollama, or skip |
| `--model <id>` | Model ID (e.g. gpt-4o-mini, claude-3-5-sonnet-20241022) |
| `--api-key <token>` | Provider API key |
| `--remote-url <url>` | Remote gateway URL (remote mode) |
| `--gateway-port <port>` | Gateway/TUI port hint |
| `--telegram-token <token>` | Telegram bot token |
| `--telegram-main-chat-id <id>` | Pre-set Telegram main chat ID (skips /main claim) |
| `--whatsapp-enabled <0\|1>` | Enable or disable WhatsApp channel |
| `--hatch <choice>` | tui, web, or later |
| `--install-daemon` | Install/start host service after onboarding |
| `--no-install-daemon` | Skip service install/start |
| `--skip-channels` | Skip Telegram/WhatsApp channel prompts |
| `--skip-skills` | Skip skills prompts |
| `--skip-health` | Skip health prompts and checks |
| `--skip-ui` | Skip hatch (TUI/Web) prompts |
| `--skip-setup` | Skip deps/build/image/service install |
| `--skip-restart` | Skip service restart after onboarding |
| `--skip-doctor` | Skip doctor health check at end |
| `--no-backup` | Skip safety backup step |
| `--backup-out-dir <dir>` | Custom backup output directory |
| `--non-interactive` | Require explicit --operator and --assistant-name |
| `--force` | Force rewrite of onboarding identity files |
| `--help, -h` | Show full help |

### 2. Configure `.env` (minimum required)

At minimum set provider runtime values plus Telegram credentials.

Example (OpenAI + Telegram):

```dotenv
FFT_NANO_RUNTIME_PROVIDER_PRESET=openai
PI_API=openai
PI_MODEL=gpt-4o-mini
OPENAI_API_KEY=replace-me
TELEGRAM_BOT_TOKEN=replace-me
TELEGRAM_ADMIN_SECRET=replace-me
```

Recommended provider paths:

- OpenAI: `PI_API=openai`, `PI_MODEL=...`, `OPENAI_API_KEY=...`
- LM Studio (local): `FFT_NANO_RUNTIME_PROVIDER_PRESET=lm-studio`, `PI_API=openai`, `PI_MODEL=...`, `OPENAI_BASE_URL=http://127.0.0.1:1234/v1`, `PI_API_KEY=lm-studio`
- Ollama (local): `FFT_NANO_RUNTIME_PROVIDER_PRESET=ollama`, `PI_API=ollama`, `PI_MODEL=...`, `OPENAI_BASE_URL=http://localhost:11434/v1`, `PI_API_KEY=ollama`
- Anthropic: `PI_API=anthropic`, `PI_MODEL=...`, `ANTHROPIC_API_KEY=...`
- Gemini: `PI_API=gemini`, `PI_MODEL=...`, `GEMINI_API_KEY=...`
- OpenRouter: `PI_API=openrouter`, `PI_MODEL=...`, `OPENROUTER_API_KEY=...`

After editing `.env`, apply it by restarting the host:

```bash
./scripts/service.sh restart
# or, after `npm link`: fft service restart
```

### 3. Verify service health

```bash
./scripts/service.sh status
./scripts/service.sh logs
# or, after `npm link`: fft service status && fft service logs
```

If you disabled auto-service during setup (`FFT_NANO_AUTO_SERVICE=0`), install/start it manually:

```bash
./scripts/service.sh install
# or, after `npm link`: fft service install
```

### 4. Attach the TUI

`fft` CLI should already be linked globally by onboarding setup.
If needed, relink manually:

```bash
npm link
```

Attach the terminal UI:

```bash
fft tui
# or: ./scripts/start.sh tui
```

Important: `fft tui` is an attach client. The host process must already be running.
`fft` auto-detects the repo from your current directory; use `--repo` to target another checkout:

```bash
fft --repo /absolute/path/to/FFT_nano tui
```

If you prefer the linked CLI form, use:

```bash
fft onboard
```

### 4b. Open FFT CONTROL CENTER (Web UI)

The web dashboard is served by the same running host process.

```bash
fft web
# or: ./scripts/web.sh
```

By default it listens on `http://127.0.0.1:3393`.

### 5. Claim Telegram as main/admin

In the bot DM:

1. Run `/id` to confirm chat id.
2. Run `/main <secret>` using `TELEGRAM_ADMIN_SECRET`.
   - First-claim shortcut: if no main chat exists yet, and `TELEGRAM_ADMIN_SECRET` is unset, a direct Telegram DM can claim main with `/main`. Set `TELEGRAM_ADMIN_SECRET` afterward and restart.

Once claimed:

- main chat responds to all messages
- non-main chats require trigger `@<ASSISTANT_NAME>`
- admin controls (`/gateway`, `/tasks`, `/coder`, `/freechat`) are main-only

### Unified Command Reference

The `fft` CLI is the primary interface after install. When CLI linking is unavailable (`FFT_NANO_AUTO_LINK=0`), substitute `./scripts/start.sh ...` and `./scripts/service.sh ...` equivalents.

**fft subcommands:**

| Command | Description |
|---------|-------------|
| `fft onboard [options]` | Run the full guided onboarding flow |
| `fft profile <status\|set\|apply> [core\|farm]` | Show or switch operator/assistant profile |
| `fft start [telegram-only]` | Start the host service |
| `fft dev [telegram-only]` | Start in development mode |
| `fft tui [--url ws://127.0.0.1:3390] [--session main] [--deliver]` | Attach the terminal UI |
| `fft web [--open]` | Open the FFT Control Center web UI |
| `fft doctor [--json]` | Run health diagnostics |
| `fft service <install\|uninstall\|start\|stop\|restart\|status\|logs>` | Manage the host service |

**fft onboard options** (same as `./scripts/onboard-all.sh`):

| Option | Description |
|--------|-------------|
| `--workspace <dir>` | Main workspace path |
| `--env-path <file>` | Path to .env file |
| `--operator <name>` | Primary operator name |
| `--assistant-name <name>` | Assistant name |
| `--non-interactive` | Require explicit operator/assistant-name |
| `--accept-risk` | Acknowledge risk before onboarding |
| `--flow <flow>` | quickstart, advanced, or manual |
| `--mode <mode>` | local or remote |
| `--runtime <runtime>` | auto, docker, or host |
| `--auth-choice <choice>` | openai, lm-studio, anthropic, gemini, openrouter, zai, minimax, kimi-coding, ollama, skip |
| `--model <id>` | Model ID |
| `--api-key <token>` | Provider API key |
| `--remote-url <url>` | Remote gateway URL (remote mode) |
| `--gateway-port <port>` | Gateway/TUI port hint |
| `--telegram-token <token>` | Telegram bot token |
| `--telegram-main-chat-id <id>` | Pre-set main chat ID |
| `--whatsapp-enabled <0\|1>` | Enable/disable WhatsApp |
| `--hatch <choice>` | tui, web, or later |
| `--install-daemon` | Install/start service after onboarding |
| `--no-install-daemon` | Skip service install/start |
| `--skip-channels` | Skip channel prompts |
| `--skip-skills` | Skip skills prompts |
| `--skip-health` | Skip health prompts and checks |
| `--skip-ui` | Skip hatch prompts |
| `--skip-setup` | Skip deps/build/image install |
| `--skip-restart` | Skip service restart after onboarding |
| `--skip-doctor` | Skip doctor health check at end |
| `--no-backup` | Skip safety backup |
| `--backup-out-dir <dir>` | Custom backup directory |
| `--force` | Force rewrite of identity files |
| `--help, -h` | Show full help |

**Maintenance:**

```bash
# Full onboard with explicit args
./scripts/onboard-all.sh --workspace /abs/path --env-path /abs/path/.env \
  --operator "Name" --assistant-name "AssistantName" \
  --non-interactive --accept-risk \
  --runtime docker --auth-choice openai --model gpt-4o-mini \
  --api-key "sk-..." --telegram-token "..." \
  --install-daemon

# Backup state before upgrades
npm run backup:state -- --workspace ~/nano --out-dir ./backups --dry-run
npm run backup:state -- --workspace ~/nano --out-dir ./backups

# Restore from backup
npm run restore:state -- --archive ./backups/backup-YYYYMMDD-HHMMSS.tar.gz
```

Config edit note:

- There is no separate `fft config` command in this repo.
- `fft onboard` runs the full guided wrapper (`onboard-all` path).
- Use `./scripts/onboard.sh` for wizard-only edits.

TUI slash commands:

- `/help`
- `/status`
- `/sessions`
- `/session <key>`
- `/history [limit]`
- `/model <provider/model|model>`
- `/think <off|minimal|low|medium|high|xhigh>`
- `/reasoning <off|on|stream>`
- `/verbose [off|new|all|verbose]`
- `/deliver <on|off>`
- `/gateway <status|restart|doctor>`
- `/new` (or `/reset`)
- `/abort`
- `/exit`

Telegram commands (main/admin subset):

- `/help`
- `/status`
- `/id`
- `/models [query]`
- `/main <secret>`
- `/gateway <status|restart|doctor>`
- `/restart` (alias for `/gateway restart`)
- `/coder <task>`
- `/coder-plan <task>`
- `/tasks [list|due|detail <id>|runs <id> [limit]]`

Model selection note:

- `/models` without a query opens the model provider picker panel directly.
- `/models <query>` searches and lists models matching the query text.

Tool progress notes:

- `/verbose` cycles `off -> new -> all -> verbose`.
- `/verbose <off|new|all|verbose>` sets the mode explicitly.
- Telegram uses a separate progress bubble that is edited as tool calls arrive.

Service-control note:

- Linux may require elevated privileges for some service actions.
- Runtime `/gateway` commands are non-interactive and cannot prompt for sudo/password.
- If privilege escalation is required, run `./scripts/service.sh ...` (or `fft service ...`) directly in a shell with sufficient permissions.

TUI keybinds:

- `Esc`: abort active run
- `Ctrl+C`: clear input (press twice quickly to exit)
- `Ctrl+D`: exit
- `Ctrl+T`: quick status
- `Ctrl+P`: quick sessions

TUI gateway env:

- `FFT_NANO_TUI_PORT` (default `3390`)
- `FFT_NANO_TUI_HOST` (default `127.0.0.1`, uses `0.0.0.0` in LAN/remote web modes)
- `FFT_NANO_TUI_ENABLED` (`1` default, set `0` to disable)
- `FFT_NANO_TUI_AUTH_TOKEN` (optional, defaults to `FFT_NANO_WEB_AUTH_TOKEN` when set)

FFT CONTROL CENTER env:

- `FFT_NANO_WEB_ENABLED` (`1` default)
- `FFT_NANO_WEB_ACCESS_MODE` (`localhost|lan|remote`, default `localhost`)
- `FFT_NANO_WEB_HOST` (default `127.0.0.1` for localhost mode, else `0.0.0.0`)
- `FFT_NANO_WEB_PORT` (default `3393`)
- `FFT_NANO_WEB_AUTH_TOKEN` (required for `lan` and `remote` modes)

TUI troubleshooting:

- `connect ECONNREFUSED 127.0.0.1:3390`: host is not running, wrong `FFT_NANO_TUI_PORT`, or gateway disabled.
- `EADDRINUSE` in host logs: selected TUI port is already in use; change `FFT_NANO_TUI_PORT`.
- `unknown session: main`: no main chat is registered yet; use `/sessions` and switch to an available session.

If WhatsApp is enabled, authenticate once before first full run:

```bash
npm run auth
```

## Platform Notes

### macOS

- Docker is the default runtime.
- Ensure daemon health before start:

```bash
docker info
```

- Optional advanced mode: unisolated host runtime (explicit opt-in)
  - `CONTAINER_RUNTIME=host`
  - `FFT_NANO_ALLOW_HOST_RUNTIME=1`
  - for production use additionally set `FFT_NANO_ALLOW_HOST_RUNTIME_IN_PROD=1`

### Linux

- Docker is used by default.
- Ensure daemon health before start:

```bash
docker info
```

## Raspberry Pi Startup (Raspberry Pi OS 64-bit)

FFT_nano runs on Pi as a Linux Docker deployment.

Canonical Pi guide (full runbook):
- `docs/RASPBERRY_PI.md`

Pi summary (aligned with the primary flow):

```bash
sudo apt update
sudo apt install -y git curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
# log out/in (or reboot), then:
sudo systemctl enable --now docker
docker info
git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/FFT_nano.git
cd FFT_nano
./scripts/onboard-all.sh --runtime docker
./scripts/service.sh status
./scripts/service.sh logs
```

For Pi, `./scripts/onboard-all.sh` is the recommended install path. `./scripts/setup.sh` remains the lower-level setup/build helper if you intentionally want setup without the full onboarding flow.

## Farm Onboarding (Demo vs Production)

Farm onboarding uses four scripts:

- `scripts/farm-bootstrap.sh`
- `scripts/farm-demo.sh`
- `scripts/farm-onboarding.sh`
- `scripts/farm-validate.sh`

Bootstrap contract:

```bash
./scripts/farm-bootstrap.sh \
  --mode demo|production \
  --dash-path /abs/path \
  --ha-url http://localhost:8123 \
  --open-browser yes|no \
  --token <optional> \
  --companion-repo https://github.com/0-CYBERDYNE-SYSTEMS-0/FFT_demo_dash.git \
  --companion-ref <branch-or-commit>
```

Behavior:

- `demo`: starts HA + telemetry simulator and validates demo path.
- `production`: discovers entities, builds mapping profile, validates readiness.
- Companion dashboard repo is auto-cloned/pulled if missing/clean.
- Production control actions are blocked until validation status is `pass`.

Pre-demo health check (PASS/FAIL):

```bash
npm run farm:doctor
```

Checks include Docker daemon, HA reachability/auth, `com.fft_nano` runtime status, and fresh `data/farm-state/current.json` with `haConnected=true`.

Details: `docs/FARM_ONBOARDING.md`

## Telegram Operations

Telegram is enabled when `TELEGRAM_BOT_TOKEN` is set.

Attached TUI still requires the host process to be running (for example `fft start`), even when Telegram is not configured.

Recommended Telegram-only local/dev mode:

```bash
export WHATSAPP_ENABLED=0
export TELEGRAM_BOT_TOKEN="..."
./scripts/start.sh telegram-only
```

Main/admin chat setup:

1. DM the bot and run `/id`
2. Set `TELEGRAM_ADMIN_SECRET` on host
3. Run `/main <secret>` in the bot DM
   - If no main chat exists yet and `TELEGRAM_ADMIN_SECRET` is unset, direct DM `/main` can first-claim main. Set secret afterward and restart.

Alternative: set `TELEGRAM_MAIN_CHAT_ID` and restart.

Behavior:

- main chat responds to all messages
- non-main chats require trigger prefix `@<ASSISTANT_NAME>`
- admin and coder delegation commands are main-chat only
- main/admin can query or restart host service with `/gateway status` and `/gateway restart`

## Coding Delegation (`/coder`)

Main/admin chat supports explicit delegation triggers:

- `/coder <task>`: execute
- `/coder-plan <task>`: plan only
- aliases: `use coding agent`, `use your coding agent skill`

Main/admin chat normal-language runs can auto-delegate to coding worker when the model determines deep engineering work is needed (and can ask for clarification when ambiguous).
Delegation behavior is the same in both `start` and `dev` runtime modes.

## Main Workspace and Heartbeat

- Main/admin chat container CWD maps to `~/nano` by default.
- Override with `FFT_NANO_MAIN_WORKSPACE_DIR=/absolute/path`.
- Default main memory and context files live outside this git repo (`~/nano`), which helps keep personal notes out of commits.
- `groups/main/` is intentionally kept as an empty placeholder in-repo; if you point main workspace into the repo, treat it as local-only and never commit personal memory/state files.
- Workspace bootstrap files are auto-seeded when missing: `NANO.md`, `SOUL.md`, `TODOS.md`, `HEARTBEAT.md`, `MEMORY.md`, and `BOOTSTRAP.md`; optional `BOOT.md` is seeded when enabled. Legacy files can be preserved as compatibility snapshots, but they are not the active contract.
- Main chat bootstrap interview is host-enforced by default for fresh installs while `BOOTSTRAP.md` is pending.
- During enforced bootstrap, normal tasks are redirected into onboarding interview flow and `/coder` commands are blocked until completion.
- Completion marker token: `ONBOARDING_COMPLETE` (host strips token and finalizes onboarding state).
- Soft rollout default: existing installs are not retroactively gated unless explicitly enabled.
- Gate controls:
  - `FFT_NANO_WORKSPACE_ENFORCE_BOOTSTRAP_GATE=1|0`
  - `FFT_NANO_WORKSPACE_ENFORCE_BOOTSTRAP_GATE_EXISTING=1|0`
- Optional startup ritual file: `BOOT.md` (enable with `FFT_NANO_WORKSPACE_ENABLE_BOOT_MD=1` or parity config).
- Heartbeat loop is enabled by default (`30m`) and runs a main-session check using `HEARTBEAT.md`.
- Override cadence with `FFT_NANO_HEARTBEAT_EVERY` (e.g. `15m`, `1h`).
- If `HEARTBEAT.md` exists but is effectively empty (headers/comments only), heartbeat runs are skipped.
- Heartbeat acknowledgements are normalized with token stripping and max-ack gating (`FFT_NANO_HEARTBEAT_ACK_MAX_CHARS`, default `300`).
- Optional active-hours gate: `FFT_NANO_HEARTBEAT_ACTIVE_HOURS` (format: `HH:MM-HH:MM` or `Mon-Fri@HH:MM-HH:MM`).
- Optional parity config file: `config/runtime.parity.json` (override path via `FFT_NANO_PARITY_CONFIG_PATH`).

Onboarding command options:

- `fft onboard --workspace /abs/path --env-path /abs/path/.env --operator "Name" --assistant-name "AssistantName" --non-interactive --accept-risk --auth-choice skip`
- `./scripts/onboard-all.sh --workspace /abs/path --env-path /abs/path/.env --operator "Name" --assistant-name "AssistantName" --non-interactive --accept-risk --auth-choice skip`
- `npm run onboard -- --workspace /abs/path --env-path /abs/path/.env --operator "Name" --assistant-name "AssistantName" --non-interactive --accept-risk --auth-choice skip`
- `./scripts/onboard.sh --workspace /abs/path --env-path /abs/path/.env --operator "Name" --assistant-name "AssistantName" --non-interactive --accept-risk --auth-choice skip`
- `--force` rewrites generated `SOUL.md` and `TODOS.md` onboarding content when you want to reset the main workspace defaults.

## Pi-Native Project Skills

Two skill types are supported:

- Setup-only skills:
  - `skills/setup/`
- Runtime skills used by the Pi agent:
  - `skills/runtime/`
- User-created runtime skills in main workspace:
  - `~/nano/skills/`

Runtime skills are mirrored into each group Pi home at runtime:

- host: `data/pi/<group>/.pi/skills/`
- container: `/home/node/.pi/skills/`

Merge rules:

- Main/admin runs: project runtime skills + `~/nano/skills/`
- Non-main runs: project runtime skills only
- If names collide, later source wins (`~/nano/skills/` overrides project on main)
- Only skills previously managed by FFT_nano are pruned on sync; manually installed skills are preserved.

Detailed skill spec: `docs/PI_SKILLS.md`

Validate skill metadata/frontmatter:

```bash
npm run validate:skills
```

## Operations and Debugging

Useful env vars:

- `LOG_LEVEL=debug` for verbose host/container mount tracing
- `FFT_NANO_DRY_RUN=1` to bypass LLM calls and verify routing end-to-end

Useful paths:

- Host logs: `logs/fft_nano.log`, `logs/fft_nano.error.log`
- Group container logs: `groups/<group>/logs/`
- Group registry: `data/registered_groups.json`
- Router state: `data/router_state.json`
- Per-group Pi state: `data/pi/<group>/.pi/`

Common issues:

- Missing provider key -> Pi reports no models available
- Wrong provider/model combo -> model/provider not found
- Multiple bot instances -> Telegram polling conflict
- Docker daemon `EOF` / `Cannot connect` / `no space left on device` -> run `./scripts/docker-recover.sh` (backs up old `Docker.raw` and rebuilds Docker VM disk when needed)

## Development Checks

```bash
npm run validate:skills
npm run typecheck
npm test
```

## Release Checks

Run the release gate locally before tagging:

```bash
npm run release-check
```

This runs skills validation, typecheck, tests, and secret scanning over tracked files.

Versioning and official release flow are documented in `docs/RELEASE.md`.

## Distribution Policy

- Official distribution is **GitHub Releases** (source archives + checksums).
- npm publish is intentionally deferred until this repo ships a dedicated end-user CLI packaging path.

## Architecture (Short)

```text
Telegram/WhatsApp -> SQLite -> host router/scheduler -> containerized Pi runtime -> chat response
```

Core files:

- `src/index.ts` - channel ingestion, routing, admin command policy
- `src/pi-runner.ts` - Pi subprocess launch, sandbox wiring, snapshots, runtime event emission
- `src/sandbox.ts` - optional `bwrap`/Docker wrapping for Pi runs
- `src/task-scheduler.ts` - scheduler mode switch (`v2` default, `legacy` fallback)
- `src/cron/` - cron v2 adapters and timer-based scheduler service
- `src/db.ts` - persistence

## Q&A

### Why does non-main chat not respond unless I mention `@<ASSISTANT_NAME>`?

That is intentional. Only main responds to all messages; non-main requires trigger prefix.

### Why is `/coder` rejected in some chats?

Coder delegation is intentionally restricted to main/admin chat for safety.

### Where is long-term memory stored?

Per-group in `groups/<group>/MEMORY.md` (plus `groups/<group>/memory/*.md`);
global memory in `groups/global/MEMORY.md`.

### Where does Pi session/auth state live?

Per group at `data/pi/<group>/.pi/`, mounted into container as `/home/node/.pi`.

### Do I need legacy skill directories?

No. Use `skills/setup` and `skills/runtime` in this repo.

## Security Model

- Default runtime is Linux container isolation.
- Optional host runtime exists as an explicit unsafe opt-in (`CONTAINER_RUNTIME=host` + allow flags).
- Mounts define visibility boundaries.
- Additional mounts are validated against external allowlist at:
  - `~/.config/fft_nano/mount-allowlist.json`

See `.github/SECURITY.md` and `docs-site/developer/11-security-model.md` for details.
