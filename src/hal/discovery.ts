import { execFile } from 'child_process';
import { promisify } from 'util';
import { halRegistry } from './registry.js';
import type { DeviceProtocol } from './types.js';

const execFileAsync = promisify(execFile);

interface DiscoveredDevice {
  host: string;
  type: DeviceProtocol;
  label?: string;
}

// Strict validators: reject anything that is not a clean IPv4 prefix / host.
// Exported as pure helpers for testing.
const SUBNET_PREFIX_RE = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}$/;
const SUBNET_PLAIN_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){2}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const HOSTNAME_RE =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidSubnetPrefix(subnet: string): boolean {
  if (typeof subnet !== 'string') return false;
  // Accept both '192.168.1.' and the existing '192.168.1' call-site form.
  return SUBNET_PREFIX_RE.test(subnet) || SUBNET_PLAIN_RE.test(subnet);
}

export function isValidHost(host: string): boolean {
  if (typeof host !== 'string' || host.length === 0 || host.length > 253) {
    return false;
  }
  return IPV4_RE.test(host) || HOSTNAME_RE.test(host);
}

async function pingScan(subnet: string): Promise<string[]> {
  const prefix = subnet.endsWith('.') ? subnet : `${subnet}.`;
  const candidates: string[] = [];
  for (let i = 1; i <= 254; i++) candidates.push(`${prefix}${i}`);

  // macOS ping takes -W in milliseconds while Linux takes seconds, so darwin
  // needs -W1000 for the same 1s per-host budget (macOS silently discovers
  // nothing with -W1).
  const waitArg = process.platform === 'darwin' ? '-W1000' : '-W1';

  // Probe in sequential batches: 254 concurrent child processes can hit
  // EAGAIN on a Pi, and the per-host catch would swallow those failures as
  // "unreachable" without this pool.
  const alive: string[] = [];
  const BATCH_SIZE = 32;
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const settled = await Promise.all(
      batch.map(async (ip) => {
        try {
          await execFileAsync('ping', ['-c1', waitArg, ip], { timeout: 3000 });
          return ip;
        } catch {
          return null; // unreachable host — skip
        }
      }),
    );
    for (const ip of settled) {
      if (ip !== null) alive.push(ip);
    }
  }
  return alive;
}

async function probeTasmota(host: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      'curl',
      ['-s', '--max-time', '2', `http://${host}/cm?cmnd=Status`],
      { timeout: 3000 },
    );
    return stdout.includes('Status') || stdout.includes('Tasmota');
  } catch {
    return false;
  }
}

async function probeShelly(host: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      'curl',
      ['-s', '--max-time', '2', `http://${host}/shelly`],
      { timeout: 3000 },
    );
    return stdout.includes('Shelly') || stdout.includes('shelly');
  } catch {
    return false;
  }
}

async function probeKasa(host: string): Promise<boolean> {
  // Kasa doesn't have a simple HTTP probe — try kasa CLI
  try {
    await execFileAsync('kasa', ['device', host, '--type', 'plug'], {
      timeout: 5000,
    });
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

  if (!isValidSubnetPrefix(subnet)) {
    console.warn(
      `[HAL/Discovery] Invalid subnet prefix '${subnet}' — skipping scan`,
    );
    return [];
  }

  console.log(`[HAL/Discovery] Scanning ${subnet}.1-254...`);
  const scanned = await pingScan(subnet);
  const hosts = scanned.filter(isValidHost);
  const results: DiscoveredDevice[] = [];

  for (const host of hosts.slice(0, maxDevices)) {
    if (types.includes('tasmota') && (await probeTasmota(host))) {
      results.push({ host, type: 'tasmota' });
      console.log(`[HAL/Discovery] Found Tasmota at ${host}`);
      continue;
    }
    if (types.includes('shelly') && (await probeShelly(host))) {
      results.push({ host, type: 'shelly' });
      console.log(`[HAL/Discovery] Found Shelly at ${host}`);
      continue;
    }
    if (types.includes('kasa') && (await probeKasa(host))) {
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
