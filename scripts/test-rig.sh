#!/bin/bash
# Rung-1 virtual device rig: stand up faithful software devices on this machine
# so the controller's REAL driver code can talk to them (no hardware, no $100).
#   HTTP smart plug (Tasmota/Shelly) — works with zero extra installs.
#   MQTT sensors  — needs:  brew install mosquitto
#   Serial sensor — needs:  brew install socat
#
# Usage: bash scripts/test-rig.sh
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
PIDS=()
cleanup() { for p in "${PIDS[@]:-}"; do kill "$p" 2>/dev/null || true; done; echo "[rig] stopped."; }
trap cleanup EXIT

echo "=== FF-SmartControl rung-1 device rig ==="

# 1. Mock HTTP plug — always available (pure Node).
MOCK_HTTP_PORT=8888 node "$DIR/mock-http-device.js" & PIDS+=($!)
sleep 1

# 2. MQTT broker + faithful sensors — optional.
if command -v mosquitto >/dev/null 2>&1; then
  pkill mosquitto 2>/dev/null || true; sleep 1
  mosquitto -p 1883 & PIDS+=($!)
  sleep 1
  MQTT_BROKER=mqtt://localhost:1883 node "$DIR/fake-iot-rig.js" & PIDS+=($!)
else
  echo "[rig] mosquitto not found — skipping MQTT sensors. Install: brew install mosquitto"
fi

# 3. Virtual serial pair — optional.
if command -v socat >/dev/null 2>&1; then
  pkill socat 2>/dev/null || true; sleep 1
  socat -d -d pty,raw,echo=0,link=/tmp/virt_sensor pty,raw,echo=0,link=/tmp/virt_reader & PIDS+=($!)
  echo "[rig] serial pair: write /tmp/virt_sensor  ->  read /tmp/virt_reader"
else
  echo "[rig] socat not found — skipping virtual serial. Install: brew install socat"
fi

cat <<EOF

=== rig ready ===
  HTTP plug:   http://127.0.0.1:8888   (Tasmota /cm?cmnd=Power  ·  Shelly /rpc/Switch.GetStatus?id=0)
  MQTT broker: mqtt://localhost:1883   (topics: tele/<name>/SENSOR, faithful Tasmota JSON)

Verify (another terminal):
  curl 'http://127.0.0.1:8888/cm?cmnd=Power'
  curl 'http://127.0.0.1:8888/rpc/Switch.GetStatus?id=0'
  mosquitto_sub -h localhost -t 'tele/+/SENSOR' -v   # if mosquitto installed

Ctrl+C to stop.
EOF
wait
