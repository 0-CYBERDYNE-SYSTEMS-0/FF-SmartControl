/**
 * Mock GPIO controller — in-memory pin state, no execSync.
 *
 * Replaces the real GPIOController (which uses pigpio/pigs CLI) when
 * HAL_SIM_MODE=1. Stores pin states in a Map, supports digitalRead,
 * digitalWrite, and readDHT22 with simulated values.
 *
 * All methods are async (matches GPIOController signature).
 * Integrates with FaultInjectionController.
 */

import type {
  MockTransport,
  MockTransportFault,
  MockDeviceState,
} from './types.js';

interface GPIOPinState {
  mode: 'in' | 'out';
  value: boolean;
}

export class GpioMock implements MockTransport {
  private pins: Map<number, GPIOPinState> = new Map();
  private fault: MockTransportFault | null = null;
  private started = false;
  private simulatedTemp = 24.5;
  private simulatedHumidity = 58.2;

  // ── MockTransport Interface ───────────────────────────────────────────

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.started = false;
  }

  getState(): MockDeviceState {
    return {
      on: false,
      watts: 0,
      healthy: this.fault === null,
      fault: this.fault,
    };
  }

  setFault(fault: MockTransportFault): void {
    this.fault = fault;
  }

  clearFault(): void {
    this.fault = null;
  }

  isHealthy(): boolean {
    return this.fault === null;
  }

  getUrl(): string {
    return 'mock-gpio://local';
  }

  // ── GPIO-Specific Methods ─────────────────────────────────────────────

  /**
   * Check whether the mock GPIO is available (always true).
   * Matches GPIOController.isAvailable() signature.
   */
  async isAvailable(): Promise<boolean> {
    if (this.fault === 'device_offline') return false;
    return true;
  }

  /**
   * Read a digital pin value. Returns true for HIGH, false for LOW.
   * Matches GPIOController.digitalRead() signature.
   */
  async digitalRead(pin: number): Promise<boolean> {
    if (this.fault === 'device_offline') {
      throw new Error('GPIO mock digitalRead: device offline');
    }
    return this.pins.get(pin)?.value ?? false;
  }

  /**
   * Write a digital pin value. true = HIGH, false = LOW.
   * Matches GPIOController.digitalWrite() signature.
   */
  async digitalWrite(pin: number, value: boolean): Promise<void> {
    if (this.fault === 'device_offline') {
      throw new Error('GPIO mock digitalWrite: device offline');
    }
    this.pins.set(pin, { mode: 'out', value });
  }

  /**
   * Read a simulated DHT22 sensor.
   * Returns { temperature, humidity } or null on failure.
   * Matches GPIOController.readDHT22() signature.
   */
  async readDHT22(
    pin: number,
  ): Promise<{ temperature: number; humidity: number } | null> {
    if (this.fault === 'device_offline') return null;
    return {
      temperature: this.simulatedTemp,
      humidity: this.simulatedHumidity,
    };
  }

  // ── Test Helpers ───────────────────────────────────────────────────────

  /** Set the simulated DHT22 temperature. */
  setSimulatedTemperature(temp: number): void {
    this.simulatedTemp = temp;
  }

  /** Set the simulated DHT22 humidity. */
  setSimulatedHumidity(humidity: number): void {
    this.simulatedHumidity = humidity;
  }

  /** Directly set a pin's input state (for simulating sensor inputs). */
  setPinState(pin: number, value: boolean): void {
    this.pins.set(pin, { mode: 'in', value });
  }

  /** Get a pin's current state. */
  getPinState(pin: number): boolean {
    return this.pins.get(pin)?.value ?? false;
  }

  /** Reset all pin states. */
  resetPins(): void {
    this.pins.clear();
  }
}
