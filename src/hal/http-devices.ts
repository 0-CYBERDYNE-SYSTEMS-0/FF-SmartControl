import { execFile } from 'child_process';
import { promisify } from 'util';
import { halRegistry } from './registry.js';

const execFileAsync = promisify(execFile);

export interface DevicePowerResponse {
  state: 'on' | 'off' | 'unknown';
  watts?: number;
}

// Strict hostname/IPv4 validator (replicated from discovery.ts — importing it
// would create an import cycle through registry.js). No whitespace, no shell
// metacharacters; execFile argv arrays prevent injection regardless.
const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const HOSTNAME_RE =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidHost(host: string): boolean {
  if (typeof host !== 'string' || host.length === 0 || host.length > 253) {
    return false;
  }
  return IPV4_RE.test(host) || HOSTNAME_RE.test(host);
}

// Pure parser: kasa CLI power line, e.g. "Power: 12.34 W". Returns null when absent.
export function parseKasaPower(output: string): number | null {
  // Strip thousands separators ("1,234.5 W" -> "1234.5 W") before matching so
  // grouped digits are not truncated at the comma by the [\d.]+ capture.
  const normalized = output.replace(/,(?=\d{3})/g, '');
  const match = normalized.match(/power:\s*([\d.]+)\s*W/i);
  if (!match) return null;
  const watts = Number.parseFloat(match[1]);
  return Number.isFinite(watts) ? watts : null;
}

// Pure parser: Tasmota 'Status 8' (StatusSNS.ENERGY) with fallback to a bare
// ENERGY shape. Returns null when no finite numeric power is present.
export function parseTasmotaEnergy(data: unknown): number | null {
  const envelope = data as {
    StatusSNS?: { ENERGY?: { Power?: unknown } };
    ENERGY?: { Power?: unknown };
  };
  const energy = envelope?.StatusSNS?.ENERGY ?? envelope?.ENERGY;
  const power = energy?.Power;
  return typeof power === 'number' && Number.isFinite(power) ? power : null;
}

// Tasmota HTTP API (GET http://<host>/cm?cmnd=Power)
async function tasmotaGet(host: string, command: string): Promise<any> {
  const url = `http://${host}/cm?cmnd=${encodeURIComponent(command)}`;
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
        // Status 8 = StatusSNS with ENERGY readings ('EnergyConfig' is unreliable)
        let watts: number | undefined;
        try {
          const energy = await tasmotaGet(this.host, 'Status 8');
          watts = parseTasmotaEnergy(energy) ?? undefined;
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

// Shelly HTTP API (GET http://<host>/status)
async function shellyGet(host: string, path: string = '/status'): Promise<any> {
  const url = `http://${host}${path}`;
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

// Kasa (TP-Link) HTTP API — requires auth token approach
// For simplicity: use the unencrypted UDP protocol or cloud API
// Fallback: use kasa CLI tool if available
export class KasaClient {
  constructor(private host: string) {}

  async getPower(): Promise<DevicePowerResponse> {
    try {
      // Try kasa CLI tool (available via `npm install -g kasa` or system install)
      if (!isValidHost(this.host)) return { state: 'unknown' };
      const { stdout } = await execFileAsync('kasa', ['device', this.host], {
        timeout: 5000,
      });
      const on = stdout.toLowerCase().includes('state: on');
      const watts = parseKasaPower(stdout);
      return {
        state: on ? 'on' : 'off',
        watts: watts ?? undefined,
      };
    } catch {
      return { state: 'unknown' };
    }
  }

  async setPower(on: boolean): Promise<void> {
    if (!isValidHost(this.host)) {
      throw new Error(`Invalid Kasa host: ${this.host}`);
    }
    await execFileAsync(
      'kasa',
      ['device', this.host, '--type', 'plug', on ? 'on' : 'off'],
      { timeout: 5000 },
    );
  }
}

// Factory
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
