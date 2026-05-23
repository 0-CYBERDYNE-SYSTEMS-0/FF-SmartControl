/**
 * Shelly device simulator — per-device mock implementing MockTransport.
 *
 * Supports both Gen-1 (classic) and Gen-2 (Plus/Pro) APIs:
 *
 *   Gen-1:
 *     GET /status            → { relays: [{ ison }], meters: [{ power }] }
 *     GET /relay/0?turn=on   → { ison: true }
 *     GET /relay/0?turn=off  → { ison: false }
 *
 *   Gen-2:
 *     POST /rpc/Shelly.GetStatus  → { "switch:0": { output, apower } }
 *     GET  /rpc/Switch.Set?id=0&on=true|false → { was_on: ... }
 *
 * All methods are async. Integrates with FaultInjectionController.
 */

import type {
  MockTransport,
  MockTransportFault,
  MockTransportConfig,
  MockDeviceState,
} from './types.js';
import { getHttpMockServer } from './http-mock-server.js';

export class ShellyMock implements MockTransport {
  private config: MockTransportConfig;
  private started = false;

  constructor(config: MockTransportConfig) {
    this.config = {
      initialState: 'off',
      wattage: 150,
      gen: 1,
      ...config,
    };
  }

  // ── MockTransport Interface ───────────────────────────────────────────

  async start(): Promise<void> {
    if (this.started) return;
    const server = getHttpMockServer();
    await server.start();
    server.registerDevice(this.config.host, 'shelly', {
      initialState: this.config.initialState,
      wattage: this.config.wattage,
      gen: this.config.gen ?? 1,
    });
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    getHttpMockServer().setDeviceFault(this.config.host, null);
    this.started = false;
  }

  getState(): MockDeviceState {
    const state = getHttpMockServer().getDeviceState(this.config.host);
    return (
      state ?? {
        on: false,
        watts: 0,
        healthy: true,
        fault: null,
      }
    );
  }

  setFault(fault: MockTransportFault): void {
    getHttpMockServer().setDeviceFault(this.config.host, fault);
  }

  clearFault(): void {
    getHttpMockServer().setDeviceFault(this.config.host, null);
  }

  isHealthy(): boolean {
    return this.getState().healthy;
  }

  getUrl(): string {
    const server = getHttpMockServer();
    return `${server.getBaseUrl()}/${this.config.host}`;
  }

  // ── Shelly-specific helpers ───────────────────────────────────────────

  /** Programmatically set power state (bypasses HTTP) */
  setPower(on: boolean): void {
    const server = getHttpMockServer();
    server.setDeviceState(this.config.host, on);
  }

  /** Get the device host identifier */
  getHost(): string {
    return this.config.host;
  }

  /** Get the Shelly generation (1 or 2) */
  getGen(): 1 | 2 {
    return this.config.gen ?? 1;
  }
}
