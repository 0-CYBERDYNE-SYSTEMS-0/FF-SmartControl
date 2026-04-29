/**
 * Hardware ID detection for device-bound licensing
 * Uses Pi serial number or MAC address as unique device identifier
 * VAL-LIC-012
 */

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
 * Get the primary MAC address of the device
 */
function getMacAddress(): string | null {
  try {
    const networkInterfaces = os.networkInterfaces();

    // Look for a non-internal MAC address
    for (const [, addrs] of Object.entries(networkInterfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.mac && addr.mac !== '00:00:00:00:00:00') {
          // Normalize MAC address (remove colons, uppercase)
          const normalized = addr.mac.replace(/:/g, '').toUpperCase();
          return 'MAC-' + normalized;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a stable fallback ID based on system characteristics
 */
function generateFallbackId(): string {
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const userInfo = os.userInfo();

  // Create a simple hash from these values
  const input = `${hostname}-${platform}-${arch}-${userInfo.uid}-${userInfo.gid}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to hex and pad
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
  const randomHex = Math.abs(Math.floor(Math.random() * 0xffffffff))
    .toString(16)
    .padStart(8, '0')
    .toUpperCase();

  return 'FW-' + hashHex.slice(0, 8) + randomHex.slice(0, 8);
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
