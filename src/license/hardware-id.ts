/**
 * Hardware ID detection for device-bound licensing
 * Uses Pi serial number or MAC address as unique device identifier
 * VAL-LIC-012
 */

import { createHash } from 'crypto';
import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { logger } from '../logger.js';

/**
 * Get the hardware ID for this device.
 * Priority: Raspberry Pi serial > MAC address
 */
export function getHardwareId(): string {
  // Try Raspberry Pi serial first
  const piSerial = getPiSerial();
  if (piSerial) {
    logger.debug({ hardwareId: piSerial }, 'Using Pi serial as hardware ID');
    return piSerial;
  }

  // Fall back to MAC address
  const mac = getMacAddress();
  if (mac) {
    logger.debug({ hardwareId: mac }, 'Using MAC address as hardware ID');
    return mac;
  }

  // Last resort: generate a stable ID based on hostname + user info
  const fallback = generateFallbackId();
  logger.warn({ hardwareId: fallback }, 'Using fallback hardware ID');
  return fallback;
}

/**
 * Get Raspberry Pi serial number from /proc/cpuinfo
 */
function getPiSerial(): string | null {
  try {
    // Try reading from /proc/cpuinfo
    const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf-8');
    const serialMatch = cpuinfo.match(/^Serial\s*:\s*([0-9a-f]{16})$/im);
    if (
      serialMatch &&
      serialMatch[1] &&
      serialMatch[1] !== '0000000000000000'
    ) {
      return 'PI-' + serialMatch[1].toUpperCase();
    }

    // Try /sys/firmware/devicetree/base/serial-number (Pi 5)
    const dtSerialPath = '/sys/firmware/devicetree/base/serial-number';
    if (fs.existsSync(dtSerialPath)) {
      const dtSerial = fs
        .readFileSync(dtSerialPath, 'utf-8')
        .replace(/\0/g, '')
        .trim();
      if (dtSerial && dtSerial !== '00000000') {
        return 'PI-' + dtSerial.toUpperCase();
      }
    }

    // Try vcgencmd on Raspberry Pi OS
    try {
      const vcGenCmd = execSync('/usr/bin/vcgencmd otp_dump | grep 28:', {
        encoding: 'utf-8',
      });
      const otpMatch = vcGenCmd.match(/28:([[:xdigit:]]+)/);
      if (otpMatch && otpMatch[1]) {
        const serial = otpMatch[1].toUpperCase();
        if (serial !== '0000000000000000') {
          return 'PI-' + serial;
        }
      }
    } catch {
      // vcgencmd not available or failed
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Patterns for virtual/non-persistent interfaces that should be excluded
 * from hardware ID computation. These interfaces come and go and are not
 * suitable for stable machine fingerprinting.
 */
const VIRTUAL_INTERFACE_PATTERNS: RegExp[] = [
  /^lo/,       // loopback
  /^docker/,   // Docker bridge
  /^veth/,     // virtual Ethernet (Docker containers)
  /^br/,       // Linux bridge (br0, br-bridge)
  /^tun/,      // tunnel
  /^tap/,      // tunnel
  /^utun/,     // macOS user tunnel
  /^utap/,     // macOS user tunnel
  /^awdl/,     // Apple Wireless Direct Link (transient peer-to-peer)
  /^llw/,      // macOS low-latency WLAN (transient)
  /^anpi/,     // macOS Apple Neural Processing Interface
  /^vmnet/,    // VMware virtual network
];

/**
 * Check if an interface name matches known virtual/transient patterns.
 * Exported for testing.
 */
export function isVirtualInterface(name: string): boolean {
  return VIRTUAL_INTERFACE_PATTERNS.some((p) => p.test(name));
}

/**
 * Given the raw os.networkInterfaces() result, extract the deterministic
 * primary MAC address. Sorts interfaces alphabetically and filters out
 * virtual interfaces so the same MAC is always selected across reboots.
 * Exported for testing.
 */
export function selectPrimaryMac(
  interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>,
): string | null {
  const candidates: Array<{ name: string; mac: string }> = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    if (isVirtualInterface(name)) continue;

    for (const addr of addrs) {
      if (addr.mac && addr.mac !== '00:00:00:00:00:00') {
        // Normalize MAC address (remove colons, uppercase)
        const normalized = addr.mac.replace(/:/g, '').toUpperCase();
        candidates.push({ name, mac: normalized });
        break; // Only need one address per interface
      }
    }
  }

  if (candidates.length === 0) return null;

  // Sort by interface name for deterministic selection across reboots
  candidates.sort((a, b) => a.name.localeCompare(b.name));

  return 'MAC-' + candidates[0].mac;
}

/**
 * Get the primary MAC address of the device.
 * Deterministic: sorts interfaces alphabetically so the same interface
 * is always chosen across reboots. Excludes known virtual interfaces.
 */
function getMacAddress(): string | null {
  try {
    const networkInterfaces = os.networkInterfaces();
    return selectPrimaryMac(networkInterfaces);
  } catch {
    return null;
  }
}

/**
 * Generate a stable fallback ID based on hardware characteristics.
 * Uses only properties that survive reboots and process restarts:
 * hostname, platform, architecture, and total system memory.
 * Does NOT use per-user identifiers (uid/gid) which change per process.
 */
function generateFallbackId(): string {
  // Use hardware-bound properties that don't change across reboots or users
  // totalmem() provides hardware uniqueness (RAM size varies per device)
  const input = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.totalmem().toString(),
  ].join('-');
  const hash = createHash('sha256').update(input).digest('hex').slice(0, 16).toUpperCase();
  return 'FW-' + hash;
}

/**
 * Get a display-friendly version of the hardware ID
 */
export function getHardwareIdDisplay(): string {
  const id = getHardwareId();
  // Format as XXXX-XXXX-XXXX-XXXX for display if longer
  if (id.length > 12) {
    return (
      id.slice(0, 4).toUpperCase() +
      '-' +
      id.slice(4, 8).toUpperCase() +
      '-' +
      id.slice(8, 12).toUpperCase() +
      '-' +
      id.slice(12, 16).toUpperCase()
    );
  }
  return id.toUpperCase();
}
