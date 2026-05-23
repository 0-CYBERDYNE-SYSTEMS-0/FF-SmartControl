import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Execute a shell command with a timeout.
 * Uses AbortController to cancel the child process if it exceeds timeoutMs.
 */
async function execWithTimeout(
  command: string,
  timeoutMs: number,
): Promise<string> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const { stdout } = await execAsync(command, {
      signal: ac.signal,
      timeout: timeoutMs, // built-in Node.js timeout (v16+)
    });
    return stdout.trim();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Async GPIO controller for Raspberry Pi via pigpio (pigs CLI).
 *
 * All hardware operations are async — they use child_process.exec
 * instead of execSync to avoid blocking the Node.js event loop.
 */
export class GPIOController {
  private _available: boolean | null = null;
  private _initPromise: Promise<boolean> | null = null;

  /**
   * Check whether pigpiod is running and GPIO is available.
   * Result is cached after first check. Async to avoid blocking.
   */
  async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      try {
        await execWithTimeout('pgrep pigpiod', 3000);
        this._available = true;
      } catch {
        this._available = false;
      }
      return this._available;
    })();

    return this._initPromise;
  }

  /**
   * Read digital pin value (0 or 1).
   * Returns true for HIGH (1), false for LOW (0).
   */
  async digitalRead(pin: number): Promise<boolean> {
    try {
      const out = await execWithTimeout(`pigs r ${pin}`, 2000);
      return parseInt(out) === 1;
    } catch {
      throw new Error(`GPIO digitalRead pin ${pin} failed`);
    }
  }

  /**
   * Write digital pin value. Pass true for HIGH, false for LOW.
   */
  async digitalWrite(pin: number, value: boolean): Promise<void> {
    try {
      await execWithTimeout(`pigs w ${pin} ${value ? 1 : 0}`, 2000);
    } catch {
      throw new Error(`GPIO digitalWrite pin ${pin} failed`);
    }
  }

  /**
   * Read DHT22 temperature/humidity sensor.
   * Uses pigpio's built-in DHT22 support via `pigs dht22 <pin>`.
   * Returns { temperature: number (C), humidity: number (%) } or null on failure.
   */
  async readDHT22(
    pin: number,
  ): Promise<{ temperature: number; humidity: number } | null> {
    try {
      const out = await execWithTimeout(`pigs dht22 ${pin}`, 5000);
      // Format: "0 24.1 48.2" = status humidity temperature
      const parts = out.split(' ').map(Number);
      if (parts[0] === 0 && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return { temperature: parts[2], humidity: parts[1] };
      }
      return null;
    } catch {
      return null;
    }
  }
}

import { GpioMock } from './mock-transport/gpio-mock.js';

/**
 * GPIO controller instance — real or mock depending on HAL_SIM_MODE.
 *
 * When HAL_SIM_MODE=1, returns a GpioMock (in-memory pin state, no execSync).
 * In production, returns a real GPIOController (pigpio via pigs CLI).
 */
function createGpio(): GPIOController {
  if (process.env.HAL_SIM_MODE === '1') {
    return new GpioMock() as unknown as GPIOController;
  }
  return new GPIOController();
}

export const gpio: GPIOController = createGpio();
