/**
 * Virtual serial port mock for protocol simulation.
 *
 * Simulates serial-connected sensors via EventEmitter (no real hardware).
 * Generates realistic data frames for:
 *   - BME280 (temperature, humidity, pressure CSV: "24.5,65.2,1013.25")
 *   - Atlas Scientific EZO (pH/EC/DO values)
 *
 * Fault injection:
 *   - Port open failure
 *   - Buffer overflow (garbage data between frames)
 *   - Checksum failures
 *   - Device disconnect mid-stream
 *   - Data corruption
 *
 * Events: 'data', 'open', 'close', 'error'
 * Configurable: baud rate, frame interval, protocol type.
 */

import { EventEmitter } from 'node:events';

// ── Types ───────────────────────────────────────────────────────────────────

export type SerialProtocol = 'bme280' | 'atlas' | 'ds18b20' | 'generic';

export interface SerialMockConfig {
  /** Virtual port path / identifier (e.g. '/dev/ttyUSB0') */
  path: string;
  /** Protocol to simulate */
  protocol: SerialProtocol;
  /** Baud rate (default: 9600) */
  baudRate?: number;
  /** Interval between data frames in ms (default: 2000) */
  frameIntervalMs?: number;
  /** Initial sensor values */
  initialValues?: Record<string, number>;
  /** Whether to auto-generate data with random walk */
  autoGenerate?: boolean;
}

export type SerialFault =
  | 'none'
  | 'port_open_failure'
  | 'buffer_overflow'
  | 'checksum_failure'
  | 'device_disconnect'
  | 'data_corruption';

interface SerialState {
  portOpen: boolean;
  fault: SerialFault;
  values: Record<string, number>;
}

// ── Serial Mock ─────────────────────────────────────────────────────────────

export class SerialMock extends EventEmitter {
  private config: Required<SerialMockConfig>;
  private state: SerialState;
  private frameTimer: ReturnType<typeof setInterval> | null = null;
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private overflowBuffer: string[] = [];

  constructor(config: SerialMockConfig) {
    super();
    this.config = {
      baudRate: 9600,
      frameIntervalMs: 2000,
      autoGenerate: true,
      initialValues: {},
      ...config,
    };

    this.state = {
      portOpen: false,
      fault: 'none',
      values: this.getDefaultValues(config.protocol, config.initialValues ?? {}),
    };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  /**
   * Simulate opening the serial port. Emits 'open' on success,
   * emits 'error' and rejects on port_open_failure fault.
   */
  async open(): Promise<void> {
    if (this.state.fault === 'port_open_failure') {
      const err = new Error(`SerialMock: failed to open ${this.config.path}`);
      this.emit('error', err);
      throw err;
    }

    // Simulate async port open
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    this.state.portOpen = true;
    this.emit('open', { path: this.config.path, baudRate: this.config.baudRate });

    // Start generating data frames
    this.startFrames();

    // If device_disconnect fault, schedule disconnect
    if (this.state.fault === 'device_disconnect') {
      this.scheduleDisconnect();
    }
  }

  /**
   * Simulate closing the serial port. Emits 'close'.
   */
  close(): void {
    if (!this.state.portOpen) return;

    this.stopFrames();
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }

    this.state.portOpen = false;
    this.emit('close');
  }

  /** Check if the port is currently open. */
  isOpen(): boolean {
    return this.state.portOpen;
  }

  /** Get the virtual port path. */
  getPath(): string {
    return this.config.path;
  }

  // ── Fault Injection ───────────────────────────────────────────────────

  /** Inject a fault into the serial simulation. */
  setFault(fault: SerialFault): void {
    this.state.fault = fault;

    switch (fault) {
      case 'device_disconnect':
        if (this.state.portOpen) {
          this.scheduleDisconnect();
        }
        break;
      case 'buffer_overflow':
        this.overflowBuffer = [];
        break;
      case 'port_open_failure':
        // No immediate action — takes effect on next open()
        break;
      case 'checksum_failure':
      case 'data_corruption':
      case 'none':
        break;
    }
  }

  /** Clear the active fault. */
  clearFault(): void {
    this.state.fault = 'none';
    this.overflowBuffer = [];
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
  }

  /** Get the current fault state. */
  getFault(): SerialFault {
    return this.state.fault;
  }

  // ── Values ─────────────────────────────────────────────────────────────

  /** Set sensor values directly. */
  setValues(values: Record<string, number>): void {
    this.state.values = { ...values };
  }

  /** Get current sensor values. */
  getValues(): Record<string, number> {
    return { ...this.state.values };
  }

  /** Manually emit a data frame (bypasses interval timer). */
  emitFrame(): void {
    if (!this.state.portOpen || this.state.fault === 'device_disconnect') return;
    this.generateFrame();
  }

  // ── Frame Generation ──────────────────────────────────────────────────

  private startFrames(): void {
    if (this.frameTimer) return;

    this.frameTimer = setInterval(() => {
      if (!this.state.portOpen) return;
      if (this.state.fault === 'device_disconnect') return;

      this.generateFrame();
    }, this.config.frameIntervalMs);
  }

  private stopFrames(): void {
    if (this.frameTimer) {
      clearInterval(this.frameTimer);
      this.frameTimer = null;
    }
  }

  private generateFrame(): void {
    if (this.config.autoGenerate) {
      this.walkValues();
    }

    const line = this.formatFrame();

    // Handle buffer overflow: inject garbage between frames
    if (this.state.fault === 'buffer_overflow') {
      this.overflowBuffer.push(line);
      if (this.overflowBuffer.length > 5) {
        // Flush garbage data
        const garbage = this.generateGarbage();
        this.emit('data', garbage);
        this.overflowBuffer = [];
      }
    }

    // Handle checksum failure: corrupt the frame
    if (this.state.fault === 'checksum_failure') {
      const corrupted = this.corruptFrame(line);
      this.emit('data', corrupted);
      return;
    }

    // Handle data corruption: inject random garbage
    if (this.state.fault === 'data_corruption') {
      if (Math.random() < 0.3) {
        const garbage = this.generateGarbage();
        this.emit('data', garbage);
        return;
      }
    }

    this.emit('data', line);
  }

  // ── Frame Formatting ──────────────────────────────────────────────────

  private formatFrame(): string {
    const vals = this.state.values;

    switch (this.config.protocol) {
      case 'bme280':
        // Format: "temp,humidity,pressure"
        return `${vals.temperature ?? 24.5},${vals.humidity ?? 58.2},${vals.pressure ?? 1013.25}`;

      case 'atlas':
        // Atlas Scientific EZO format: "value" with optional prefix
        // e.g. pH: "7.12", EC: "1.45", DO: "8.32"
        return `${vals.value ?? 7.0}`;

      case 'ds18b20':
        // DS18B20 1-Wire format: temperature in Celsius
        return `${vals.temperature ?? 22.5}`;

      case 'generic':
      default:
        // Generic key=value format
        return Object.entries(vals)
          .map(([k, v]) => `${k}=${v}`)
          .join(',');
    }
  }

  // ── Value Generation ──────────────────────────────────────────────────

  private getDefaultValues(
    protocol: SerialProtocol,
    overrides: Record<string, number>,
  ): Record<string, number> {
    switch (protocol) {
      case 'bme280':
        return {
          temperature: overrides.temperature ?? 24.5,
          humidity: overrides.humidity ?? 58.2,
          pressure: overrides.pressure ?? 1013.25,
        };
      case 'atlas':
        return {
          value: overrides.value ?? 7.0,
        };
      case 'ds18b20':
        return {
          temperature: overrides.temperature ?? 22.5,
        };
      default:
        return { ...overrides };
    }
  }

  private walkValues(): void {
    const v = this.state.values;

    switch (this.config.protocol) {
      case 'bme280':
        v.temperature = this.walk(v.temperature ?? 24.5, 0.3, 15, 35);
        v.humidity = this.walk(v.humidity ?? 58.2, 1.0, 20, 95);
        v.pressure = this.walk(v.pressure ?? 1013.25, 0.3, 980, 1040);
        break;
      case 'atlas':
        v.value = this.walk(v.value ?? 7.0, 0.05, 0, 14);
        break;
      case 'ds18b20':
        v.temperature = this.walk(v.temperature ?? 22.5, 0.5, -10, 50);
        break;
    }
  }

  private walk(current: number, step: number, min: number, max: number): number {
    const delta = (Math.random() - 0.5) * step;
    const next = +(current + delta).toFixed(2);
    return Math.max(min, Math.min(max, next));
  }

  // ── Fault Simulation Helpers ──────────────────────────────────────────

  private scheduleDisconnect(): void {
    this.disconnectTimer = setTimeout(() => {
      this.emit('error', new Error(`SerialMock: device disconnected mid-stream (${this.config.path})`));
      this.state.portOpen = false;
      this.stopFrames();
      this.emit('close');
    }, 5000 + Math.random() * 5000);
  }

  private generateGarbage(): string {
    const garbageChars = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`\x00\xff\xfe\xfd';
    let result = '';
    const length = Math.floor(Math.random() * 40) + 10;
    for (let i = 0; i < length; i++) {
      result += garbageChars[Math.floor(Math.random() * garbageChars.length)];
    }
    return result;
  }

  private corruptFrame(line: string): string {
    // Introduce random corruption: replace characters, flip bits, inject null bytes
    const chars = line.split('');
    const pos = Math.floor(Math.random() * chars.length);
    const corruptions = ['\x00', '\xff', '?', 'NaN', 'inf', '-999'];
    chars[pos] = corruptions[Math.floor(Math.random() * corruptions.length)];
    return chars.join('');
  }
}

// ── Serial Mock Manager ─────────────────────────────────────────────────────

const serialMocks: Map<string, SerialMock> = new Map();

/** Get or create a SerialMock for a given path. */
export function getSerialMock(config: SerialMockConfig): SerialMock {
  const existing = serialMocks.get(config.path);
  if (existing) return existing;

  const mock = new SerialMock(config);
  serialMocks.set(config.path, mock);
  return mock;
}

/** Get an existing SerialMock (returns undefined if not found). */
export function findSerialMock(path: string): SerialMock | undefined {
  return serialMocks.get(path);
}

/** Remove and close a SerialMock. */
export function removeSerialMock(path: string): void {
  const mock = serialMocks.get(path);
  if (mock) {
    mock.close();
    serialMocks.delete(path);
  }
}

/** Reset all serial mocks. */
export function resetSerialMocks(): void {
  for (const [path, mock] of serialMocks) {
    mock.close();
  }
  serialMocks.clear();
}
