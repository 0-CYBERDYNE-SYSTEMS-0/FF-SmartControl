#!/usr/bin/env node
/**
 * Faithful software emulator of a real Tasmota smart plug AND a Shelly relay
 * (Gen1 + Gen2), for rung-1 testing: it lets the controller's REAL driver code
 * (src/hal/http-devices.ts) talk to a "device" that responds exactly like the
 * hardware does — so a passing test means the driver works against reality, not
 * against a mock that mirrors the driver's bugs.
 *
 * Emulated endpoints (match the official APIs):
 *   Tasmota:    GET /cm?cmnd=Power            -> {"POWER":"ON"|"OFF"}
 *               GET /cm?cmnd=Power%20ON/OFF   -> sets relay
 *               GET /cm?cmnd=Status%208       -> {"StatusSNS":{"ENERGY":{"Power":W,...}}}
 *   Shelly G2+: GET /rpc/Switch.Set?id=0&on=true|false
 *               GET /rpc/Switch.GetStatus?id=0 -> {"output":bool,"apower":W}
 *   Shelly G1:  GET /status                    -> {"relays":[{"ison":bool}],"meters":[{"power":W}]}
 *               GET /relay/0?turn=on|off
 *
 * Run standalone:  node scripts/mock-http-device.js   (PORT env or 8888)
 * Import in tests: import { createMockDevice } from './mock-http-device.js'
 */
import http from 'http';

export function createMockDevice({ wattsWhenOn = 1234, startOn = true } = {}) {
  const state = { power: startOn, watts: wattsWhenOn };
  const json = (res, obj) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://localhost');
    const p = u.pathname;
    const q = u.searchParams;

    // ── Tasmota ──────────────────────────────────────────────────────────
    if (p === '/cm') {
      const cmnd = (q.get('cmnd') || '').trim();
      const lc = cmnd.toLowerCase();
      if (lc === 'power') return json(res, { POWER: state.power ? 'ON' : 'OFF' });
      if (lc === 'power on') {
        state.power = true;
        return json(res, { POWER: 'ON' });
      }
      if (lc === 'power off') {
        state.power = false;
        return json(res, { POWER: 'OFF' });
      }
      if (lc === 'status 8') {
        return json(res, {
          StatusSNS: {
            Time: new Date().toISOString(),
            ENERGY: {
              Power: state.power ? state.watts : 0,
              Voltage: 230,
              Current: state.power ? +(state.watts / 230).toFixed(3) : 0,
            },
          },
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ Command: 'Unknown' }));
    }

    // ── Shelly Gen2+ (JSON-RPC over GET) ─────────────────────────────────
    if (p === '/rpc/Switch.Set') {
      const was = state.power;
      state.power = q.get('on') === 'true';
      return json(res, { was_on: was });
    }
    if (p === '/rpc/Switch.GetStatus') {
      return json(res, {
        id: 0,
        output: state.power,
        apower: state.power ? state.watts : 0,
        voltage: 230,
      });
    }

    // ── Shelly Gen1 (legacy REST) ────────────────────────────────────────
    if (p === '/status') {
      return json(res, {
        relays: [{ ison: state.power }],
        meters: [{ power: state.power ? state.watts : 0 }],
      });
    }
    if (p === '/relay/0') {
      const turn = (q.get('turn') || '').toLowerCase();
      if (turn === 'on') state.power = true;
      else if (turn === 'off') state.power = false;
      return json(res, { ison: state.power });
    }

    res.writeHead(404);
    res.end('Not found');
  });

  return { server, state };
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = Number(process.env.MOCK_HTTP_PORT || process.env.PORT || 8888);
  const { server } = createMockDevice();
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[mock-device] faithful Tasmota+Shelly on http://127.0.0.1:${PORT}`);
    console.log('  Tasmota: /cm?cmnd=Power | Power%20ON | Power%20OFF | Status%208');
    console.log('  ShellyG2: /rpc/Switch.Set?id=0&on=true | /rpc/Switch.GetStatus?id=0');
    console.log('  ShellyG1: /status | /relay/0?turn=on');
  });
}
