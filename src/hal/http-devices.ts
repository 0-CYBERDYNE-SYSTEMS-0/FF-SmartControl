import { halRegistry } from './registry.js';

export interface DevicePowerResponse {
  state: 'on' | 'off' | 'unknown';
  watts?: number;
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
        // Wattage lives in `Status 8` under (Status)SNS.ENERGY.Power. Only
        // power-monitoring plugs report it; absence is normal.
        let watts: number | undefined;
        try {
          const s8 = await tasmotaGet(this.host, 'Status 8');
          watts =
            s8?.StatusSNS?.ENERGY?.Power ??
            s8?.ENERGY?.Power ??
            s8?.Power;
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

  // Gen2+ (Plus/Pro) speak JSON-RPC over GET /rpc/<Method>; Gen1 uses the
  // legacy REST /status + /relay/0. Try Gen2 first, fall back to Gen1.
  async getPower(): Promise<DevicePowerResponse> {
    try {
      const g2 = await shellyGet(this.host, '/rpc/Switch.GetStatus?id=0');
      if (g2 && typeof g2.output === 'boolean') {
        const watts = g2.apower;
        return {
          state: g2.output ? 'on' : 'off',
          watts: typeof watts === 'number' ? Math.round(watts) : undefined,
        };
      }
    } catch {}
    try {
      const data = await shellyGet(this.host, '/status');
      const relay = data?.relays?.[0];
      const state = relay?.ison ? 'on' : 'off';
      const watts = data?.meters?.[0]?.power;
      return { state, watts: watts ? Math.round(watts) : undefined };
    } catch {
      return { state: 'unknown' };
    }
  }

  async setPower(on: boolean): Promise<void> {
    try {
      await shellyGet(this.host, `/rpc/Switch.Set?id=0&on=${on}`);
      return;
    } catch {}
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
      const { execSync } = await import('child_process');
      const out = execSync(`kasa device ${this.host}`, {
        timeout: 5000,
      }).toString();
      const on = out.toLowerCase().includes('state: on');
      const wattsMatch = out.match(/power:\s*([\d.])\s*W/);
      return {
        state: on ? 'on' : 'off',
        watts: wattsMatch ? parseFloat(wattsMatch[1]) : undefined,
      };
    } catch {
      return { state: 'unknown' };
    }
  }

  async setPower(on: boolean): Promise<void> {
    const { execSync } = await import('child_process');
    execSync(`kasa device ${this.host} --type plug ${on ? 'on' : 'off'}`, {
      timeout: 5000,
    });
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
