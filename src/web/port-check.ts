import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface PortInfo {
  pid: number | null;
  name: string;
}

/**
 * Check if a port is available for binding
 * Returns true if the port is free, false if it's already in use
 */
export function isPortAvailable(
  port: number,
  host: string = '127.0.0.1',
): boolean {
  try {
    const platform = os.platform();
    let cmd: string;

    if (platform === 'darwin') {
      // macOS: use lsof to check if port is in use
      cmd = `lsof -i :${port} -sTCP:LISTEN -P -n 2>/dev/null | grep LISTEN | awk '{print $2}' | head -1`;
    } else {
      // Linux: use ss or netstat
      cmd = `ss -tlpn 'sport = :${port}' 2>/dev/null | grep LISTEN | awk '{print $5}' | grep -oP '(?<=pid=)\d+' | head -1 || true`;
    }

    const output = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim();
    return output === '' || output === 'true';
  } catch {
    // If the command fails, assume port is available
    return true;
  }
}

/**
 * Get information about the process using a port
 * Returns PID and process name
 */
export function getPortInfo(
  port: number,
  host: string = '127.0.0.1',
): PortInfo {
  const platform = os.platform();

  try {
    if (platform === 'darwin') {
      // macOS: use lsof to get PID and process name
      const cmd = `lsof -i :${port} -sTCP:LISTEN -P -n 2>/dev/null | grep LISTEN | head -1`;
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim();

      if (output) {
        const parts = output.split(/\s+/);
        const pid = parts.length > 1 ? parseInt(parts[1], 10) : null;
        const name = parts.length > 0 ? parts[0] : 'unknown';
        return {
          pid: Number.isFinite(pid) ? pid : null,
          name: name || 'unknown',
        };
      }
    } else {
      // Linux: use ss to get PID and process name
      // Try to get PID first
      const pidCmd = `ss -tlpn 'sport = :${port}' 2>/dev/null | grep LISTEN | grep -oP 'pid=\K\d+' | head -1`;
      const pidOutput = execSync(pidCmd, {
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
      const pid = pidOutput ? parseInt(pidOutput, 10) : null;

      // Try to get process name from /proc
      let name = 'unknown';
      if (pid && Number.isFinite(pid) && pid > 0) {
        try {
          const commPath = path.join('/proc', String(pid), 'comm');
          if (fs.existsSync(commPath)) {
            name = fs.readFileSync(commPath, 'utf-8').trim();
          }
        } catch {
          // ignore
        }
      }

      if (pid) {
        return { pid, name };
      }
    }
  } catch {
    // ignore errors
  }

  return { pid: null, name: 'unknown' };
}
