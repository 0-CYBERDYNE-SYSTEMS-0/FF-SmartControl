import { execFileSync } from 'child_process';

// BCM GPIO pins are 0-31. Pins 2/3 (I2C) and 14/15 (UART) are reserved and
// rejected for writes to avoid bus conflicts.
const RESERVED_WRITE_PINS = new Set([2, 3, 14, 15]);

export function isValidGpioPin(pin: number): boolean {
  return Number.isInteger(pin) && pin >= 0 && pin <= 31;
}

export function isWritableGpioPin(pin: number): boolean {
  return isValidGpioPin(pin) && !RESERVED_WRITE_PINS.has(pin);
}

export class GPIOController {
  private pigpioRunning = false;

  constructor() {
    try {
      execFileSync('pgrep', ['pigpiod'], { timeout: 3000 });
      this.pigpioRunning = true;
    } catch {
      this.pigpioRunning = false;
    }
  }

  isAvailable(): boolean {
    return this.pigpioRunning;
  }

  // Read digital pin (0 or 1)
  digitalRead(pin: number): boolean {
    if (!isValidGpioPin(pin)) {
      throw new Error(`Invalid GPIO pin: ${pin}`);
    }
    try {
      const out = execFileSync('pigs', ['r', String(pin)], { timeout: 2000 })
        .toString()
        .trim();
      return parseInt(out) === 1;
    } catch {
      throw new Error(`GPIO digitalRead pin ${pin} failed`);
    }
  }

  // Write digital pin
  digitalWrite(pin: number, value: boolean): void {
    if (!isValidGpioPin(pin)) {
      throw new Error(`Invalid GPIO pin: ${pin}`);
    }
    if (!isWritableGpioPin(pin)) {
      throw new Error(`GPIO pin ${pin} is reserved and cannot be written`);
    }
    try {
      // Set pin mode to output first — 'pigs w' silently does nothing on a
      // pin still in input mode.
      execFileSync('pigs', ['m', String(pin), 'w'], { timeout: 2000 });
      execFileSync('pigs', ['w', String(pin), value ? '1' : '0'], {
        timeout: 2000,
      });
    } catch {
      throw new Error(`GPIO digitalWrite pin ${pin} failed`);
    }
  }

  // Read DHT22 temperature/humidity sensor
  // Returns { temperature: number (C), humidity: number (%) }
  // Uses pigpio's built-in DHT22 support via `pigs dht22 <pin>`
  readDHT22(pin: number): { temperature: number; humidity: number } | null {
    if (!isValidGpioPin(pin)) return null;
    try {
      const out = execFileSync('pigs', ['dht22', String(pin)], {
        timeout: 5000,
      })
        .toString()
        .trim();
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

export const gpio = new GPIOController();
