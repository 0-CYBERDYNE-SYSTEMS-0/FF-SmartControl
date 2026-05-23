/**
 * Lightweight Node HTTP mock server for Tasmota and Shelly protocol endpoints.
 *
 * A single shared server listens on 127.0.0.1:0 (random port) and routes
 * requests to per-device state. Device host is extracted from the URL path:
 *
 *   URL format:  http://127.0.0.1:<port>/<deviceHost>/<protocolPath>
 *   Example:     http://127.0.0.1:5432/192.168.1.101/cm?cmnd=Power
 *
 * Integrates with FaultInjectionController from ../fault-injection.js.
 * All request handling is async (no blocking calls).
 */

import http from 'node:http';
import {
  getFaultInjectionController,
  type FaultInjectionController,
} from '../fault-injection.js';
import type { MockTransportFault, MockDeviceState } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL DEVICE STATE
// ═══════════════════════════════════════════════════════════════════════════

interface DeviceSimState {
  host: string;
  on: boolean;
  watts: number;
  fault: MockTransportFault | null;
  protocol: 'tasmota' | 'shelly';
  gen: 1 | 2;
  sensorValues: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP MOCK SERVER
// ═══════════════════════════════════════════════════════════════════════════

export class HttpMockServer {
  private server: http.Server | null = null;
  private port: number = 0;
  private devices: Map<string, DeviceSimState> = new Map();
  private fic: FaultInjectionController;
  private running = false;

  constructor(fic?: FaultInjectionController) {
    this.fic = fic ?? getFaultInjectionController();
  }

  // ── Device Registry ───────────────────────────────────────────────────

  /**
   * Register a simulated device. Must be called before start() or after.
   * The host string acts as the device key and URL path segment.
   */
  registerDevice(
    host: string,
    protocol: 'tasmota' | 'shelly',
    config?: {
      initialState?: 'on' | 'off';
      wattage?: number;
      gen?: 1 | 2;
      sensorValues?: Record<string, number>;
    },
  ): void {
    const isOn = config?.initialState === 'on';
    this.devices.set(host, {
      host,
      on: isOn,
      watts: isOn ? (config?.wattage ?? 150) : 0,
      fault: null,
      protocol,
      gen: config?.gen ?? 1,
      sensorValues: config?.sensorValues ?? {},
    });
  }

  /** Programmatically set a device's power state. */
  setDeviceState(host: string, on: boolean, watts?: number): void {
    const dev = this.devices.get(host);
    if (!dev) return;
    dev.on = on;
    dev.watts = watts ?? (on ? 150 : 0);
  }

  /** Inject or clear a fault for a specific device. */
  setDeviceFault(host: string, fault: MockTransportFault | null): void {
    const dev = this.devices.get(host);
    if (dev) dev.fault = fault;
  }

  /** Get a snapshot of a device's state. */
  getDeviceState(host: string): MockDeviceState | null {
    const dev = this.devices.get(host);
    if (!dev) return null;
    return {
      on: dev.on,
      watts: dev.watts,
      healthy: dev.fault === null,
      fault: dev.fault,
    };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  /**
   * Start the HTTP server on a random port (port 0).
   * Idempotent — safe to call multiple times.
   */
  async start(): Promise<void> {
    if (this.running) return;

    return new Promise<void>((resolve, reject) => {
      this.server = http.createServer((req, res) =>
        this.handleRequest(req, res),
      );

      this.server.on('error', (err) => {
        this.running = false;
        reject(err);
      });

      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server!.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
        }
        this.running = true;
        resolve();
      });
    });
  }

  /**
   * Stop the HTTP server.
   * Idempotent — safe to call multiple times.
   */
  async stop(): Promise<void> {
    if (!this.server || !this.running) return;

    return new Promise<void>((resolve) => {
      this.server!.close(() => {
        this.running = false;
        this.server = null;
        resolve();
      });
    });
  }

  /** Get the assigned port (only valid after start()). */
  getPort(): number {
    return this.port;
  }

  /** Get the base URL for this mock server. */
  getBaseUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  // ── Request Handling ──────────────────────────────────────────────────

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    // Parse URL to extract device host from first path segment
    // Format: /<deviceHost>/<protocolPath>
    const rawUrl = req.url ?? '/';
    const url = new URL(rawUrl, `http://127.0.0.1:${this.port}`);

    // Strip the leading slash and split
    const pathParts = url.pathname.split('/').filter(Boolean);
    const deviceHost = pathParts[0] ?? '';
    const protocolPath = '/' + pathParts.slice(1).join('/');

    const device = this.devices.get(deviceHost);
    if (!device) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'device not found', host: deviceHost }));
      return;
    }

    // Apply fault injection if a fault is active for this device
    if (device.fault) {
      this.applyFault(device.fault, res);
      return;
    }

    // Also check global fault injection controller for this device
    const ficResult = this.fic.intercept('relay_command', {
      deviceHost,
      url: rawUrl,
      protocol: device.protocol,
    });
    if (ficResult.intercepted) {
      // If fault injection intercepted, simulate an error
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'fault_injected',
          faultType: ficResult.faultType,
          faultId: ficResult.faultId,
        }),
      );
      return;
    }

    // Route to protocol handler
    try {
      if (device.protocol === 'tasmota') {
        await this.handleTasmota(device, url, res);
      } else {
        await this.handleShelly(device, req, url, protocolPath, res);
      }
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'internal server error' }));
      }
    }
  }

  // ── Fault Simulation ──────────────────────────────────────────────────

  private applyFault(
    fault: MockTransportFault,
    res: http.ServerResponse,
  ): void {
    switch (fault) {
      case 'http_timeout':
        // Simulate timeout by never responding
        // (Connection will be closed after 30s by client timeout)
        break;

      case 'http_5xx':
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'internal server error (mock)' }));
        break;

      case 'malformed_json':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{NOT VALID JSON{{{broken:true,');
        break;

      case 'connection_reset':
        res.destroy();
        break;

      case 'device_offline':
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'device offline' }));
        break;
    }
  }

  // ── Tasmota Protocol Handler ──────────────────────────────────────────

  /**
   * Handle Tasmota HTTP API requests.
   *
   * Real Tasmota firmware responds to:
   *   GET /cm?cmnd=Power        → {"POWER":"ON"} or {"POWER":"OFF"}
   *   GET /cm?cmnd=Power%20ON   → {"POWER":"ON"}   (turns relay on)
   *   GET /cm?cmnd=Power%20OFF  → {"POWER":"OFF"}  (turns relay off)
   *   GET /cm?cmnd=Status       → {"Status":{...}}
   *   GET /cm?cmnd=Status%208   → {"StatusSNS":{...}}
   *   GET /cm?cmnd=EnergyConfig → {"ENERGY":{...}}
   */
  private async handleTasmota(
    device: DeviceSimState,
    url: URL,
    res: http.ServerResponse,
  ): Promise<void> {
    const cmnd = url.searchParams.get('cmnd') ?? '';

    // Normalize for URL-encoded spaces and plus signs
    const normalized = cmnd.replace(/\+/g, ' ');

    let response: Record<string, unknown>;

    if (
      normalized === 'Power' ||
      normalized === 'Power ON' ||
      normalized === 'Power OFF'
    ) {
      // Power get/set
      if (normalized.includes('ON')) {
        device.on = true;
        device.watts = device.watts || 150;
      } else if (normalized.includes('OFF')) {
        device.on = false;
        device.watts = 0;
      }
      // For bare 'Power' command, just return current state
      response = { POWER: device.on ? 'ON' : 'OFF' };
    } else if (normalized === 'Power ON' || normalized === 'Power OFF') {
      // Already handled above
      response = { POWER: device.on ? 'ON' : 'OFF' };
    } else if (normalized === 'Status') {
      response = {
        Status: {
          Module: 18,
          FriendlyName: [device.host],
          Topic: device.host,
          ButtonTopic: '0',
          Power: device.on ? 1 : 0,
          PowerOnState: 3,
          LedState: 1,
          LedMask: 'FFFF',
          SaveData: 1,
          SaveState: 1,
          SwitchTopic: '0',
          ButtonRetain: 0,
          SwitchRetain: 0,
          SensorRetain: 0,
          PowerRetain: 0,
          InfoRetain: 0,
          StateRetain: 0,
        },
      };
    } else if (
      normalized.startsWith('Status 8') ||
      normalized.startsWith('Status%208')
    ) {
      // Status 8 = sensor data
      response = {
        StatusSNS: {
          Time: new Date().toISOString(),
          Temperature: device.sensorValues.Temperature ?? 24.5,
          Humidity: device.sensorValues.Humidity ?? 58.2,
          Pressure: device.sensorValues.Pressure ?? 1013.2,
          ...device.sensorValues,
        },
      };
    } else if (normalized === 'EnergyConfig') {
      response = {
        ENERGY: {
          Power: device.watts,
          Total: device.watts * 3600,
          Yesterday: device.watts * 3600 * 0.8,
          Today: device.watts * 3600 * 0.3,
          Period: 0,
          ApparentPower: Math.round(device.watts * 1.05),
          ReactivePower: Math.round(device.watts * 0.1),
          Factor: 0.95,
          Voltage: 230,
          Current: +(device.watts / 230).toFixed(3),
        },
      };
    } else {
      // Generic command — log and return OK
      response = { [normalized || 'Unknown']: 'OK' };
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  // ── Shelly Protocol Handler ───────────────────────────────────────────

  /**
   * Handle Shelly HTTP API requests.
   *
   * Gen-1 (classic):
   *   GET /status                  → { relays: [{ ison }], meters: [{ power }] }
   *   GET /relay/0?turn=on|off     → { ison: true/false }
   *
   * Gen-2 (Plus/Pro):
   *   POST /rpc/Shelly.GetStatus   → { "switch:0": { output, apower } }
   *   GET  /rpc/Switch.Set?id=0&on=true|false → { was_on: ... }
   */
  private async handleShelly(
    device: DeviceSimState,
    req: http.IncomingMessage,
    url: URL,
    protocolPath: string,
    res: http.ServerResponse,
  ): Promise<void> {
    if (device.gen === 2) {
      return this.handleShellyGen2(device, req, url, res);
    }
    return this.handleShellyGen1(device, url, protocolPath, res);
  }

  /** Shelly Gen-1 API handler */
  private async handleShellyGen1(
    device: DeviceSimState,
    url: URL,
    protocolPath: string,
    res: http.ServerResponse,
  ): Promise<void> {
    if (
      protocolPath === '/status' ||
      url.pathname.endsWith('/status')
    ) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          wifi_sta: {
            connected: true,
            ssid: 'MockNetwork',
            ip: device.host,
            rssi: -42,
          },
          relays: [
            {
              ison: device.on,
              has_timer: false,
              timer_started: 0,
              timer_duration: 0,
              timer_remaining: 0,
              overpower: false,
              source: 'http',
            },
          ],
          meters: [
            {
              power: device.watts,
              overpower: 0,
              is_valid: true,
              timestamp: Math.floor(Date.now() / 1000),
              counters: [0, 0, 0],
              total: device.watts * 100,
            },
          ],
          serial: 1,
          has_update: false,
          mac: 'AABBCCDDEEFF',
          cfg_changed_cnt: 0,
          actions_stats: { skipped: 0 },
        }),
      );
    } else if (
      protocolPath === '/relay/0' ||
      protocolPath.startsWith('/relay/0')
    ) {
      const turn = url.searchParams.get('turn');
      if (turn === 'on') {
        device.on = true;
        device.watts = device.watts || 150;
      } else if (turn === 'off') {
        device.on = false;
        device.watts = 0;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ison: device.on }));
    } else if (protocolPath === '/settings' || url.pathname.includes('/settings')) {
      // Return basic settings
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          device: {
            type: 'SHSW-1',
            mac: 'AABBCCDDEEFF',
            hostname: device.host,
            num_outputs: 1,
          },
          name: device.host,
          relay: [{ name: 'relay0', default_state: 'off' }],
        }),
      );
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          relays: [{ ison: device.on }],
          meters: [{ power: device.watts }],
        }),
      );
    }
  }

  /** Shelly Gen-2 (Plus/Pro) API handler */
  private async handleShellyGen2(
    device: DeviceSimState,
    req: http.IncomingMessage,
    url: URL,
    res: http.ServerResponse,
  ): Promise<void> {
    if (req.method === 'POST') {
      // Read request body
      let body = '';
      try {
        for await (const chunk of req) {
          body += chunk;
        }
      } catch {
        // Continue with empty body
      }

      if (url.pathname.includes('/rpc/Shelly.GetStatus')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            'switch:0': {
              id: 0,
              source: 'http',
              output: device.on,
              apower: device.watts,
              voltage: 230.0,
              current: +(device.watts / 230).toFixed(3),
              aenergy: {
                total: device.watts * 100,
                by_minute: [0, 0, 0],
                minute_ts: Math.floor(Date.now() / 1000),
              },
              temperature: { tC: 42.5, tF: 108.5 },
            },
            sys: {
              mac: 'AABBCCDDEEFF',
              restart_required: false,
              time: new Date().toISOString(),
              unixtime: Math.floor(Date.now() / 1000),
              uptime: 36000,
              ram_size: 256000,
              ram_free: 128000,
              fs_size: 512000,
              fs_free: 256000,
              cfg_rev: 1,
              kvs_rev: 0,
              schedule_rev: 0,
              webhook_rev: 0,
              available_updates: {},
            },
            wifi: {
              sta_ip: device.host,
              status: 'got ip',
              ssid: 'MockNetwork',
              rssi: -42,
            },
          }),
        );
      } else if (url.pathname.includes('/rpc/Shelly.GetConfig')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            'switch:0': {
              id: 0,
              name: device.host,
              in_mode: 'flip',
              initial_state: 'off',
              auto_on: false,
              auto_off: false,
            },
          }),
        );
      } else {
        // Unknown RPC method
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({}));
      }
      return;
    }

    // GET requests for Gen-2
    if (url.pathname.includes('/rpc/Switch.Set')) {
      const on = url.searchParams.get('on') === 'true';
      const wasOn = device.on;
      device.on = on;
      device.watts = on ? (device.watts || 150) : 0;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          was_on: wasOn,
          id: url.searchParams.get('id') ?? '0',
        }),
      );
    } else if (url.pathname.includes('/rpc/')) {
      // Unknown RPC — return empty
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
    } else {
      // Generic fallback
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          'switch:0': { output: device.on, apower: device.watts },
        }),
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let globalMockServer: HttpMockServer | null = null;

/** Get or create the shared HTTP mock server singleton. */
export function getHttpMockServer(): HttpMockServer {
  if (!globalMockServer) {
    globalMockServer = new HttpMockServer();
  }
  return globalMockServer;
}

/** Stop and clear the global HTTP mock server (for test teardown). */
export async function resetHttpMockServer(): Promise<void> {
  if (globalMockServer) {
    await globalMockServer.stop();
    globalMockServer = null;
  }
}
