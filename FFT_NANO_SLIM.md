# FFT_nano-slim — Project Overview

## What It Is

FFT_nano-slim is a lightweight, self-contained smart farm controller that runs on a single Raspberry Pi 5 with no cloud dependencies, no Docker, and no HomeAssistant. Where the original FFT_nano relies on a Docker container and HomeAssistant to talk to hardware, FFT_nano-slim puts the agent directly in charge of every device — it is the Hardware Abstraction Layer.

**Product names:**
- **FarmPal** — the consumer/standalone product (FFT_nano-slim)
- **FFT_nano** — the commercial product that runs on HomeAssistant (unchanged, stays on `main`)

They run side by side. They are not the same thing.

---

## What It Does

FarmPal autonomously monitors and controls a small farm or grow operation using commodity smart hardware:

- **Smart plugs** (Tasmota, Shelly, Kasa) — turn grow lights, fans, pumps on/off
- **Sensors** (temperature, humidity, soil moisture, CO2, light) — via MQTT or USB/serial
- **Cameras** (V4L2) — capture periodic photos of plants or tent interiors
- **GPIO relays** — generic on/off control via Raspberry Pi pins

It polls all devices, logs every reading to a local SQLite database, maintains a full decision audit trail, and can run an autonomous decision loop — checking sensor thresholds, making control decisions, and acting without being asked.

---

## How It Works

```
User (Telegram or Web UI)
        ↓
FFT_nano-slim (Node.js process, Raspberry Pi 5)
        ↓
┌─────────────────────────────────────────┐
│  Agent (FarmPal)                        │
│  • Reasons about device state           │
│  • Makes decisions (turn on, turn off)   │
│  • Logs all decisions to SQLite         │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│  HAL — Hardware Abstraction Layer        │
│  • Speaks HTTP to Tasmota/Shelly/Kasa   │
│  • Speaks MQTT to ESP32 sensor nodes    │
│  • Speaks pigpio to Raspberry Pi GPIO   │
│  • Speaks Serial to BME280/DS18B20      │
│  • Speaks V4L2+ffmpeg to cameras        │
│  • Auto-discovers devices on the network │
└─────────────────────────────────────────┘
        ↓
Actual Hardware (smart plugs, sensors, cameras, relays)
```

---

## Architecture

### HAL Layer (`src/hal/`)

| Module | What it does |
|---|---|
| `db.ts` | SQLite connection (WAL mode, foreign keys) |
| `registry.ts` | Device CRUD — register, list, get, update state, remove |
| `sensors.ts` | Time-series sensor readings — store, latest, history |
| `relays.ts` | Relay toggle log — who turned what on/off and why |
| `decisions.ts` | Agent decision audit — what it decided, confidence, reasoning, outcome |
| `http-devices.ts` | HTTP clients for Tasmota, Shelly, Kasa smart plugs |
| `gpio.ts` | Raspberry Pi GPIO via pigpio — digital read/write, DHT22 |
| `mqtt.ts` | MQTT subscriber — ESP32 sensor nodes push readings |
| `serial.ts` | Serialport reader — BME280, DS18B20, Atlas Scientific |
| `camera.ts` | V4L2 capture via ffmpeg — JPEG frame capture |
| `discovery.ts` | Network scanner — finds Tasmota/Shelly/Kasa on the LAN |

### Agent Layer (`src/agent/`)

| Module | What it does |
|---|---|
| `llm.ts` | Direct LLM API calls — OpenAI, Anthropic, Z.ai (GLM), Ollama, LM Studio |
| `decision-loop.ts` | Main loop — triggered by message, heartbeat, or scheduled task |
| `tool-executor.ts` | Executes HAL tool calls from LLM output |

### Persistence (`data/fft_nano.db`)

| Table | What it stores |
|---|---|
| `hal_devices` | Every registered device — type, protocol, host, label, last known state |
| `hal_sensors` | Time-series readings — device, metric, unit, value, quality, timestamps |
| `hal_relays` | Every toggle — device, state (on/off), reason (schedule/manual/agent_decision/auto_rule), who triggered it |
| `hal_decision_log` | Every agent decision — reasoning, confidence, sensor snapshot at decision time, outcome |

---

## How to Talk to It

### Telegram Commands

| Command | What it does |
|---|---|
| `/hal list` | Show all registered devices and their current state |
| `/hal discover` | Scan the network for Tasmota/Shelly/Kasa devices and register them |
| `/hal on <device>` | Turn a specific device on |
| `/hal off <device>` | Turn a specific device off |
| `/hal sensors` | Read current values from all sensors |
| `/hal history <device>` | Get last 24h of sensor readings for a device |

### Auto Mode

- `HAL_AUTO_MODE=true` + message `!auto <instruction>` — fires the full decision loop on a Telegram message
- `HAL_AUTO_DECISIONS=true` — runs the decision loop every 5 minutes automatically (heartbeat)

### Web UI

A browser-based control center showing:
- Device grid with on/off state
- Live sensor readings with 24h chart
- Decision log (what FarmPal decided and why)
- Camera feed snapshots

---

## Key Design Decisions

1. **Agent-as-HAL** — the AI agent is not calling HomeAssistant; it *is* the hardware layer. No translation step.
2. **No Docker** — one Node.js process, bare metal on Raspi 5. Lower latency, lower RAM, no container overhead.
3. **No HomeAssistant** — commodity smart hardware (Tasmota/Shelly/Kasa) is directly controlled via HTTP. HomeAssistant is a commercial product dependency that FFT_nano retains; FarmPal does not need it.
4. **SQLite-only persistence** — all state in one local file. No cloud, no external database.
5. **Decision audit log** — every decision is stored with reasoning, confidence, sensor snapshot, and outcome. The farmer can review what FarmPal did and why.
6. **Parallel product, not replacement** — FarmPal (FFT_nano-slim) and FFT_nano are siblings. FFT_nano stays on HomeAssistant for commercial deployments; FarmPal is for standalone/consumer use.

---

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `HAL_SUBNET` | Subnet to scan for device discovery | `192.168.1` |
| `HAL_AUTO_MODE` | Enable `!auto` Telegram prefix for autonomous decisions | `false` |
| `HAL_AUTO_DECISIONS` | Run decision loop every 5 minutes on heartbeat | `false` |
| `MQTT_BROKER_URL` | MQTT broker URL for sensor nodes | (empty) |
| `MQTT_USERNAME` | MQTT auth username | (empty) |
| `MQTT_PASSWORD` | MQTT auth password | (empty) |
| `PI_API` | LLM provider: `openai` \| `anthropic` \| `zai` \| `ollama` \| `lm-studio` | `openai` |
| `PI_MODEL` | Model name | provider default |

---

## Repository Structure

```
fft_nano/
├── src/
│   ├── hal/           # Hardware Abstraction Layer (NEW)
│   ├── agent/         # Native LLM agent loop (NEW)
│   ├── web/           # Web UI control center (NEW — in progress)
│   ├── cron/          # Existing cron/scheduling
│   ├── telegram.ts    # Existing Telegram bot
│   └── [core]         # Existing FFT_nano app (unchanged)
├── skills/runtime/hal/ # Agent skills for HAL tools (NEW)
├── data/
│   └── fft_nano.db    # SQLite — includes HAL tables (NEW)
└── FFT_NANO_SLIM.md   # This document
```

---

## What Was Removed vs. FFT_nano (main)

FFT_nano-slim removes all Docker/HomeAssistant dependencies while keeping the rest of FFT_nano intact:

```
REMOVED (FFT_nano-slim):
  src/pi-runner.ts         — Docker container lifecycle
  src/container-runtime.ts  — Docker detection
  src/home-assistant.ts    — HA HTTP adapter
  src/farm-state-collector.ts — HA polling (replaced by HAL polling)
  src/farm-action-gateway.ts — HA service calls (replaced by HAL calls)
  src/sandbox.ts           — container sandboxing
  src/mount-security.ts    — container mount rules
  src/pi-executable.ts     — container exec wrapper
  src/pi-stream-parser.ts   — container output parser
  src/pi-skills.ts         — container skill sync

KEPT (both products share):
  src/index.ts, src/app.ts  — main process
  src/telegram.ts           — Telegram bot
  src/db.ts                 — SQLite
  src/system-prompt.ts      — prompt construction
  src/memory-*.ts           — memory/knowledge
  src/task-scheduler.ts     — scheduling
  skills/                   — skill system
  web/                      — web UI (shared)
  cron/                     — cron jobs (shared)
```
