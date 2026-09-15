# FF_SmartControl (FarmPal) — Engineering Spec & Mission

Two documents own different truths: **[`DIRECTION.md`](DIRECTION.md) owns the
product direction** (what we sell, who it's for, the v1.0 ship-gate — license +
SD-card image model). **This file owns the engineering mission**: the principles
the software must never violate, what is actually implemented versus planned,
and the hardware-support truth table. UI/visual design tokens live in
`DESIGN.md`; operator guides live in `docs/`. A change that violates this file's
principles is a bug even if it ships; a change that moves the product off
`DIRECTION.md` must update `DIRECTION.md` in the same PR.

| Document | What it's for |
|---|---|
| [`DIRECTION.md`](DIRECTION.md) | v1.0 product direction — offering, customer, ship-gate |
| [`DESIGN.md`](DESIGN.md) | System design (architecture, modules, data model) |
| [`ship-gate-spec.md`](ship-gate-spec.md) | The engineering calendar to v1.0 launch |
| [`market-research-2026.md`](market-research-2026.md) | Pricing rationale, competitor table |
| [`docs/QA_MATRIX.md`](docs/QA_MATRIX.md) | Formal QA matrix (rows must be executed, not blank) |
| [`README-commercialization.md`](README-commercialization.md) | Commercialization milestones and hardware-validation log |
| [`HANDOFF.md`](HANDOFF.md) | Engineering handoff notes (incidents, port policy) |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history |
| [`docs/`](docs/) | Operator guides (QUICKSTART, HARDWARE, SAFETY, DASHBOARD, AUTOMATION, TROUBLESHOOTING, BACKUP_RESTORE, FACTORY_RESET) |

## Mission

FarmPal is a local-first smart-grow controller that runs on the farmer's own
hardware (Raspberry Pi class devices). It reads real sensors, actuates real
equipment, and — only when the operator has earned it — makes autonomous
decisions with a complete, inspectable audit trail. No cloud dependency. No
subscriptions required. No telemetry leaves the farm.

Three principles govern every feature decision:

1. **Truth.** The system never shows, logs, or reasons over data that did not
   come from the operator's farm. Demo data exists only in explicitly enabled
   demo/simulator modes (`HAL_SIM_MODE=1` or `HAL_SEED_DEMO_DATA=1`).
2. **Autonomy is earned, never default.** The factory automation mode is
   `OBSERVE_ONLY`. The system proposes; the operator approves; autonomy unlocks
   only through explicit operator action after demonstrated reliability.
3. **Fail safe.** Every hardware-write path must fail to the safe state. A
   missing rule, garbage LLM output, or a crashed verifier must stop action,
   never bypass it.

## What this is / is not

- It **is** a hybrid: the FFT_nano host (startup, service lifecycle, SQLite,
  chat/session routing, TUI gateway, scheduler) plus the FarmPal product surface
  (HAL, simulator, HAL UI, lightweight farm agent under `src/agent/`).
- It **is not** cloud software with a local cache. If a feature requires the
  internet to function, it is an optional enhancement, not a dependency.
- It **is not** a certified safety device. Physical safety (enclosures, E-stop
  hardware, wire sizing) is the operator's responsibility; `docs/SAFETY.md`
  gives guidance, not certification. Do not claim compliance (CE/FCC/RoHS) in
  any user-facing material until it exists.

## Architecture (summary)

- `src/hal/` — hardware abstraction: device registry, sensor store, relays,
  telemetry model, alerts, simulator (digital twin), discovery, HTTP/MQTT/
  serial/GPIO device drivers.
- `src/agent/` — lightweight farm agent. Two entry points:
  - `turn.ts` `runFarmPalTurn()` — per-message turn path (default message
    agent when the farm profile is active; `/legacy` escapes to the Pi agent).
  - `decision-loop.ts` `runDecisionCycle()` — autonomous cycle behind
    `HAL_AUTO_MODE` (`!auto ` messages) and `HAL_AUTO_DECISIONS`.
- `src/automation/` — the automation-mode ladder
  (`OBSERVE_ONLY` → operator-approved higher modes) and pending-decision queue.
- `src/safety/` — E-stop (safe-state sweep with per-device acks, watchdog,
  farm-loop hang detection), policy engine (thresholds, schedule windows,
  per-device interlocks), execution audit.
- `src/web/` — HAL UI (`127.0.0.1:3392`, session-authenticated, CSRF-protected)
  and Control Center (`127.0.0.1:3393`).
- `src/tui/` — terminal test surface (does not bypass the host; enters through
  the gateway/session path).

## Hardware support — truth table

The supported-devices claim must never exceed validated reality. Statuses:

| Path | Status | Notes |
| --- | --- | --- |
| Tasmota / Shelly-gen1 (HTTP) | Working path | Primary integration; watts + relay control |
| DS18B20 (1-Wire sysfs) | Plausible, unexercised | Reader exists; needs on-hardware validation |
| MQTT | Client only | Subscribes/parses JSON since truth-pass; needs real-broker soak |
| GPIO relays via pigpio | Scaffold | argv-array `pigs` calls, pin validation, mode-set on write; needs bench validation |
| Camera (V4L2/ffmpeg) | Snapshot only | Linux UVC; no RTSP/CSI yet |
| mDNS / USB discovery | Missing | Discovery is ping/curl-based |

A device may be advertised as supported only after it passes an unattended
soak test on real hardware. Update this table with every integration.

## Security baseline

- HAL UI: session auth (bcrypt admin password, SHA-256-indexed 256-bit tokens,
  timing-safe compares), CSRF double-submit on all mutating requests, login
  rate limiting, security audit log (stores token hashes, never raw tokens).
- Provisioning endpoints are public **only while the system is unprovisioned**;
  once provisioned they require an admin session.
- Control Center: mutating `/api/hal/*` routes require bearer auth in every
  access mode; a per-install token is generated and stored `0600` in the data
  directory when none is configured.
- `HAL_UI_AUTH_BYPASS` does not exist. Auth cannot be disabled by env var.
- All external command execution in `src/hal` uses argv arrays with input
  validation (no shell string interpolation).

## Safety baseline

- Factory mode: `OBSERVE_ONLY`. Higher autonomy is an explicit operator action.
- Chat/Telegram `emergency stop` and the dashboard E-stop both call the real
  E-stop (`activateEstop`), which sweeps actuated devices to their safe states.
- The policy engine gates hardware actions on seeded rules, schedule windows,
  and per-device interlocks. (Roadmap: single verified chokepoint for ALL
  hardware writes — see below.)
- Every autonomous decision is logged with reasoning, confidence, and the
  sensor snapshot it was based on.

## Configuration surface (key knobs)

| Var | Effect |
| --- | --- |
| `HAL_SIM_MODE=1` | Digital-twin simulator instead of real polling (seeds demo data) |
| `HAL_SEED_DEMO_DATA=1` | Explicitly seed demo data without the simulator |
| `HAL_AUTO_MODE` / `HAL_AUTO_DECISIONS` | Autonomous decision-cycle triggers |
| `FEATURE_FARM` / `FFT_PROFILE` / `FARMPAL_PRIMARY_AGENT` | Farm profile + primary agent routing (see `src/profile.ts`) |
| `HAL_UI_ENABLED` / `HAL_UI_HOST` / `HAL_UI_PORT` | HAL UI server on/off/bind |
| `LLM_PROVIDER`, provider keys | `src/agent/llm.ts` provider selection |

## Quality gates

`npm run release-check` (skills validation, typecheck, tests, secret scan,
pack check) must pass before any release candidate. HAL UI source changes
require `npm run hal:ui:build` so the served bundle matches source. Known-flaky
wall-clock-dependent tests (`heartbeat-policy`, `safety-policy-engine` schedule
windows) are tracked for conversion to injected-time tests — they are not a
pass excuse for new failures.

## Roadmap (phased)

0. **Truth pass** (this branch) — demo-data gating, `OBSERVE_ONLY` factory
   default, chat E-stop wiring, ESM fixes, provisioning guard, audit-token
   hashing, working CSRF, control-center auth gate, argv-array execution,
   secret-scan fix. ✅
1. **Golden hardware path** — one validated kit end-to-end on a real Pi
   (Tasmota plug + one sensor + camera): discover → read → decide → verified
   actuation → audit; 7-day unattended soak; flashable SD image; QA matrix
   executed for real.
2. **Safety spine** — single verified chokepoint for all hardware writes ✅
   (`executeActuation` in `src/safety/verifier.ts` is the one gate for manual
   and autonomous actuation, behind the policy engine and the E-stop gate);
   seeded safety rules per device type — not yet shipped (the
   `hal_safety_rules` table and policy engine exist, but no default rule
   seeds); enforced confidence gates, verify-before-execute for tool calls,
   persisted rate limits — pending.
3. **Product truth** — one name, one business model, real support channels,
   beta cohort (5–10 growers), decision-quality evals as a release gate.
4. **Hardware breadth** — GPIO rebuild, I²C sensors, ESPHome native,
   Modbus/RTU, mDNS discovery, RTSP/CSI cameras. Each integration passes the
   same soak bar before it is advertised.
5. **Intelligence** — real trend reflection, closed-loop setpoint tuning,
   vision-based plant monitoring, fleet learning (opt-in).