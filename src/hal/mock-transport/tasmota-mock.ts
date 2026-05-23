/**
 * Tasmota device simulator — per-device mock implementing MockTransport.
 *
 * Wraps a shared HttpMockServer entry for a single Tasmota-flashed device.
 * Responds to Tasmota HTTP API:
 *   GET /cm?cmnd=Power        → {POWER: "ON"} or {POWER: "OFF"}
 *   GET /cm?cmnd=Status       → {Status: {Power: 1, ...}}
 *   GET /cm?cmnd=Status 8     → {StatusSNS: {Temperature: 24.5, ...}}
 *   GET /cm?cmnd=Power ON/OFF → Toggles relay
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

export class TasmotaMock implements MockTransport {
  private config: MockTransportConfig;
  private started = false;

  constructor(config: MockTransportConfig) {
    this.config = {
      initialState: 'off',
      wattage: 150,
      sensorValues: {},
      ...config,
    };
  }

  // ── MockTransport Interface ───────────────────────────────────────────

  async start(): Promise<void> {
    if (this.started) return;
    const server = getHttpMockServer();
    // Ensure the HTTP server is running
    await server.start();
    // Register this device
    server.registerDevice(this.config.host, 'tasmota', {
      initialState: this.config.initialState,
      wattage: this.config.wattage,
      sensorValues: this.config.sensorValues,
    });
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    // Clear any active fault for cleanup
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

  // ── Tasmota-specific helpers ──────────────────────────────────────────

  /** Programmatically set power state (bypasses HTTP) */
  setPower(on: boolean): void {
    const server = getHttpMockServer();
    server.setDeviceState(this.config.host, on);
  }

  /** Get the device host identifier */
  getHost(): string {
    return this.config.host;
  }
}
