import { execSync } from 'child_process';
import { halRegistry } from './registry.js';
import type { DeviceType, DeviceProtocol } from './types.js';

interface DiscoveredDevice {
  host: string;
  type: DeviceProtocol;
  label?: string;
}

function pingScan(subnet: string, _timeout = 1000): string[] {
  try {
    const out = execSync(
      `for i in $(seq 1 254); do ping -c1 -W1 ${subnet}.$i 2>/dev/null & done; wait`,
      { timeout: 30000 },
    ).toString();
    const ips = new Set<string>();
    const re = /(\d+\.\d+\.\d+\.\d+)/g;
    let m;
    while ((m = re.exec(out)) !== null) ips.add(m[1]);
    return [...ips];
  } catch {
    return [];
  }
}

function probeTasmota(host: string): boolean {
  try {
    const out = execSync(`curl -s --max-time 2 http://${host}/cm?cmnd=Status`, {
      timeout: 3000,
    }).toString();
    return out.includes('Status') || out.includes('Tasmota');
  } catch {
    return false;
  }
}

function probeShelly(host: string): boolean {
  try {
    const out = execSync(`curl -s --max-time 2 http://${host}/shelly`, {
      timeout: 3000,
    }).toString();
    return out.includes('Shelly') || out.includes('shelly');
  } catch {
    return false;
  }
}

function probeKasa(host: string): boolean {
  // Kasa doesn't have a simple HTTP probe — try UDP 9999 or kasa CLI
  try {
    execSync(`kasa device ${host} --type plug`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export interface DiscoveryOptions {
  subnet?: string; // e.g. '192.168.1' (pings .1-.254)
  types?: DeviceProtocol[];
  maxDevices?: number;
}

export async function discoverDevices(
  options: DiscoveryOptions = {},
): Promise<DiscoveredDevice[]> {
  const {
    subnet = '192.168.1',
    types = ['tasmota', 'shelly', 'kasa'],
    maxDevices = 50,
  } = options;

  console.log(`[HAL/Discovery] Scanning ${subnet}.1-254...`);
  const hosts = pingScan(subnet);
  const results: DiscoveredDevice[] = [];

  for (const host of hosts.slice(0, maxDevices)) {
    if (types.includes('tasmota') && probeTasmota(host)) {
      results.push({ host, type: 'tasmota' });
      console.log(`[HAL/Discovery] Found Tasmota at ${host}`);
      continue;
    }
    if (types.includes('shelly') && probeShelly(host)) {
      results.push({ host, type: 'shelly' });
      console.log(`[HAL/Discovery] Found Shelly at ${host}`);
      continue;
    }
    if (types.includes('kasa') && probeKasa(host)) {
      results.push({ host, type: 'kasa' });
      console.log(`[HAL/Discovery] Found Kasa at ${host}`);
    }
  }

  return results;
}

export async function autoRegisterDiscovered(
  devices: DiscoveredDevice[],
): Promise<void> {
  for (const dev of devices) {
    halRegistry.register({
      type: 'smart_plug',
      protocol: dev.type,
      host: dev.host,
      label: dev.label,
    });
  }
}
