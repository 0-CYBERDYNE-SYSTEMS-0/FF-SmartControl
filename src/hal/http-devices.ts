import { halRegistry } from './registry.js';
import type { DevicePowerResponse } from './kasa-client.js';

// Re-export for downstream consumers
export type { DevicePowerResponse };

// ── Mock URL resolution ─────────────────────────────────────────────────

/** Base URL of the shared HTTP mock server (set when HAL_SIM_MODE=1). */
let mockBaseUrl: string | null = null;

/**
 * Set the mock HTTP server base URL. When set, all Tasmota/Shelly clients
 * will route requests through the mock server instead of real hardware.
 */
export function setMockBaseUrl(url: string | null): void {
  mockBaseUrl = url;
}

/** Get the current mock base URL (for debugging). */
export function getMockBaseUrl(): string | null {
  return mockBaseUrl;
}

/**
 * Resolve a device URL. When mockBaseUrl is set, the URL is rewritten to
 * target the mock server with the original host as a path prefix.
 *
 *   Real:  http://192.168.1.101/cm?cmnd=Power
 *   Mock:  http://127.0.0.1:5432/192.168.1.101/cm?cmnd=Power
 */
function resolveUrl(host: string, path: string, queryParams?: Record<string, string>): string {
  if (mockBaseUrl) {
    const url = new URL(`${mockBaseUrl}/${host}${path}`);
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }
  // Real device URL
  const url = new URL(`http://${host}${path}`);
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

// ── Tasmota HTTP API ─────────────────────────────────────────────────────

async function tasmotaGet(host: string, command: string): Promise<any> {
  const url = resolveUrl(host, '/cm', { cmnd: command });
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Tasmota ${host} unreachable`);
  return res.json();
}

export class TasmotaClient {
  constructor(private host: string) {}

  async getPower(): Promise<DevicePowerResponse> {
    try {
      const data = await tasmotaGet(this.host, 'Power');
      const state = data?.POWER?.toLowerCase();
      if (state === 'on' || state === 'off') {
        // Try to get wattage
        let watts: number | undefined;
        try {
          const energy = await tasmotaGet(this.host, 'EnergyConfig');
          watts = energy?.ENERGY?.Power;
        } catch {}
        return { state, watts };
      }
      return { state: 'unknown' };
    } catch {
      return { state: 'unknown' };
    }
  }

  async setPower(on: boolean): Promise<void> {
    await tasmotaGet(this.host, on ? 'Power ON' : 'Power OFF');
  }
}

// ── Shelly HTTP API ──────────────────────────────────────────────────────

async function shellyGet(host: string, path: string = '/status'): Promise<any> {
  const url = resolveUrl(host, path);
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Shelly ${host} unreachable`);
  return res.json();
}

export class ShellyClient {
  constructor(private host: string) {}

  async getPower(): Promise<DevicePowerResponse> {
    try {
      const data = await shellyGet(this.host);
      const relay = data?.relays?.[0];
      const state = relay?.ison ? 'on' : 'off';
      const watts = data?.meters?.[0]?.power;
      return { state, watts: watts ? Math.round(watts) : undefined };
    } catch {
      return { state: 'unknown' };
    }
  }

  async setPower(on: boolean): Promise<void> {
    await shellyGet(this.host, `/relay/0?turn=${on ? 'on' : 'off'}`);
  }
}

// ── Kasa (TP-Link) ───────────────────────────────────────────────────────

import { KasaClient } from './kasa-client.js';
export { KasaClient };

// ── Factory ──────────────────────────────────────────────────────────────

export async function createHttpClient(
  host: string,
  protocol: 'tasmota' | 'shelly' | 'kasa',
) {
  switch (protocol) {
    case 'tasmota':
      return new TasmotaClient(host);
    case 'shelly':
      return new ShellyClient(host);
    case 'kasa':
      return new KasaClient(host);
  }
}
