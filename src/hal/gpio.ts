import { execSync } from 'child_process';

export class GPIOController {
  private pigpioRunning = false;

  constructor() {
    try {
      execSync('pgrep pigpiod', { timeout: 3000 });
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
    try {
      const out = execSync(`pigs r ${pin}`, { timeout: 2000 })
        .toString()
        .trim();
      return parseInt(out) === 1;
    } catch {
      throw new Error(`GPIO digitalRead pin ${pin} failed`);
    }
  }

  // Write digital pin
  digitalWrite(pin: number, value: boolean): void {
    try {
      execSync(`pigs w ${pin} ${value ? 1 : 0}`, { timeout: 2000 });
    } catch {
      throw new Error(`GPIO digitalWrite pin ${pin} failed`);
    }
  }

  // Read DHT22 temperature/humidity sensor
  // Returns { temperature: number (C), humidity: number (%) }
  // Uses pigpio's built-in DHT22 support via `pigs dht22 <pin>`
  readDHT22(pin: number): { temperature: number; humidity: number } | null {
    try {
      const out = execSync(`pigs dht22 ${pin}`, { timeout: 5000 })
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
