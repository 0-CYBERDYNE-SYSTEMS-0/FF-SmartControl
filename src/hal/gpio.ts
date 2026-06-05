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

  // DHT22 is NOT readable through the `pigs` CLI (no such command). The DHT
  // 1-wire protocol needs microsecond pulse-width capture via the pigpio C
  // library (gpioSetAlertFunc) or a dedicated daemon. The supported sensor
  // paths in this HAL are MQTT, serial (BME280/Atlas), and 1-Wire DS18B20.
  // Returning null keeps callers honest instead of shipping a bad command.
  readDHT22(_pin: number): { temperature: number; humidity: number } | null {
    return null;
  }
}

export const gpio = new GPIOController();
