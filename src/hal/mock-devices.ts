// Mock Device Transport — simulation-side replacements for real HTTP device clients.
//
// Purpose:
//   Real clients (TasmotaClient, ShellyClient) make live HTTP calls to hardware.
//   Mock transports let the simulator, tests, and offline demos exercise the same
//   control paths with zero network I/O, programmable state, and failure injection.
//
// Architecture:
//   DeviceTransport           ← base contract (getPower / setPower)
//   MockDeviceTransport       ← extends with test helpers (setState, injectFailure, etc.)
//   MockTasmotaTransport      ← Tasmota-flavored mock
//   MockShellyTransport       ← Shelly-flavored mock
//   createMockTransport()     ← factory (drop-in for createHttpClient in sim mode)
//
// Usage in simulator:
//   const client = HAL_SIM_MODE
//     ? createMockTransport(host, protocol)
//     : await createHttpClient(host, protocol);

// ── Types ───────────────────────────────────────────────────────────────────

export interface DevicePowerResponse {
  state: 'on' | 'off' | 'unknown';
  watts?: number;
}

export type FailureMode =
  | 'none'
  | 'timeout'
  | 'connection_refused'
  | 'bad_response'
  | 'unreachable';

// ── DeviceTransport (base contract) ─────────────────────────────────────────

/**
 * Base contract for any device transport — real or mock.
 * Real clients (TasmotaClient, ShellyClient, KasaClient) already satisfy this
 * shape; this interface codifies it so callers can depend on the abstraction
 * instead of concrete classes.
 */
export interface DeviceTransport {
  getPower(): Promise<DevicePowerResponse>;
  setPower(on: boolean): Promise<void>;
}

// ── MockDeviceTransport (test/sim extensions) ───────────────────────────────

/**
 * Extended contract for mock transports.
 * Adds programmatic state control, latency simulation, failure injection,
 * and call tracking — all the things you need in tests and simulators that
 * don't make sense on real hardware clients.
 */
export interface MockDeviceTransport extends DeviceTransport {
  /** Programmatically set the power state returned by getPower(). */
  setState(state: 'on' | 'off'): void;

  /** Set simulated network latency in milliseconds. */
  setLatency(ms: number): void;

  /** Inject a failure mode. getPower/setPower will throw or return unknown. */
  setFailureMode(mode: FailureMode): void;

  /** Number of times getPower() has been called. */
  getPowerCallCount(): number;

  /** Number of times setPower() has been called. */
  setPowerCallCount(): number;

  /** The last argument passed to setPower(), or null if never called. */
  getLastSetPowerArg(): boolean | null;

  /** Reset all counters and failure state to defaults. */
  reset(): void;

  /** Get the current host string this mock was configured with. */
  getHost(): string;
}

// ── Base mock implementation (shared logic) ─────────────────────────────────

abstract class BaseMockTransport implements MockDeviceTransport {
  protected _state: 'on' | 'off' = 'off';
  protected _watts: number = 0;
  protected _latencyMs: number = 0;
  protected _failureMode: FailureMode = 'none';

  protected _getPowerCalls = 0;
  protected _setPowerCalls = 0;
  protected _lastSetPowerArg: boolean | null = null;

  constructor(protected host: string, initialState?: 'on' | 'off') {
    if (initialState) this._state = initialState;
    // Pick a semi-plausible wattage so demos look realistic
    this._watts = initialState === 'on' ? 150 : 0;
  }

  // ── Mock config ───────────────────────────────────────────────────────

  setState(state: 'on' | 'off'): void {
    this._state = state;
    this._watts = state === 'on' ? 150 : 0;
  }

  setLatency(ms: number): void {
    this._latencyMs = ms;
  }

  setFailureMode(mode: FailureMode): void {
    this._failureMode = mode;
  }

  reset(): void {
    this._state = 'off';
    this._watts = 0;
    this._latencyMs = 0;
    this._failureMode = 'none';
    this._getPowerCalls = 0;
    this._setPowerCalls = 0;
    this._lastSetPowerArg = null;
  }

  // ── Call tracking ─────────────────────────────────────────────────────

  getPowerCallCount(): number {
    return this._getPowerCalls;
  }

  setPowerCallCount(): number {
    return this._setPowerCalls;
  }

  getLastSetPowerArg(): boolean | null {
    return this._lastSetPowerArg;
  }

  getHost(): string {
    return this.host;
  }

  // ── Shared request simulation ──────────────────────────────────────────

  /** Simulate network latency if configured. */
  protected async _delay(): Promise<void> {
    if (this._latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this._latencyMs));
    }
  }

  /** Check failure mode and throw/return appropriately. */
  protected _checkFailure(): void {
    switch (this._failureMode) {
      case 'timeout':
        throw new Error(`Mock ${this.host}: simulated timeout`);
      case 'connection_refused':
        throw new Error(`Mock ${this.host}: connection refused`);
      case 'unreachable':
        throw new Error(`Mock ${this.host}: unreachable`);
      case 'bad_response':
        // handled by caller — they return { state: 'unknown' }
        break;
    }
  }

  // ── DeviceTransport ────────────────────────────────────────────────────

  abstract getPower(): Promise<DevicePowerResponse>;
  abstract setPower(on: boolean): Promise<void>;
}

// ── MockTasmotaTransport ────────────────────────────────────────────────────

/**
 * Simulates a Tasmota-flashed smart plug/relay.
 *
 * Real protocol:  GET http://<host>/cm?cmnd=Power
 *                 GET http://<host>/cm?cmnd=EnergyConfig
 *                 GET http://<host>/cm?cmnd=Power%20ON  (or OFF)
 *
 * Mock faithfully returns the same response shapes the real client expects.
 */
export class MockTasmotaTransport extends BaseMockTransport {
  async getPower(): Promise<DevicePowerResponse> {
    this._getPowerCalls++;
    await this._delay();

    if (this._failureMode === 'bad_response') {
      return { state: 'unknown' };
    }

    // On error modes, the real client catches and returns { state: 'unknown' }
    try {
      this._checkFailure();
    } catch {
      return { state: 'unknown' };
    }

    return {
      state: this._state,
      watts: this._watts,
    };
  }

  async setPower(on: boolean): Promise<void> {
    this._setPowerCalls++;
    this._lastSetPowerArg = on;
    await this._delay();
    this._checkFailure();

    this._state = on ? 'on' : 'off';
    this._watts = on ? 150 : 0;
  }
}

// ── MockShellyTransport ─────────────────────────────────────────────────────

/**
 * Simulates a Shelly-flashed smart plug/relay (Gen1 API).
 *
 * Real protocol:  GET http://<host>/status         → { relays: [{ ison }], meters: [{ power }] }
 *                 GET http://<host>/relay/0?turn=on (or off)
 *
 * Mock faithfully returns the same response shapes the real client expects.
 */
export class MockShellyTransport extends BaseMockTransport {
  async getPower(): Promise<DevicePowerResponse> {
    this._getPowerCalls++;
    await this._delay();

    if (this._failureMode === 'bad_response') {
      return { state: 'unknown' };
    }

    try {
      this._checkFailure();
    } catch {
      return { state: 'unknown' };
    }

    return {
      state: this._state,
      watts: this._watts,
    };
  }

  async setPower(on: boolean): Promise<void> {
    this._setPowerCalls++;
    this._lastSetPowerArg = on;
    await this._delay();
    this._checkFailure();

    this._state = on ? 'on' : 'off';
    this._watts = on ? 150 : 0;
  }
}

// ── Factory ─────────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for createHttpClient() when running in simulation mode.
 *
 *   HAL_SIM_MODE=1  →  createMockTransport(host, protocol)
 *   production       →  await createHttpClient(host, protocol)
 *
 * Both return an object satisfying DeviceTransport, so callers don't care
 * whether they're talking to real hardware or a mock.
 */
export function createMockTransport(
  host: string,
  protocol: 'tasmota' | 'shelly',
  initialState?: 'on' | 'off',
): MockDeviceTransport {
  switch (protocol) {
    case 'tasmota':
      return new MockTasmotaTransport(host, initialState);
    case 'shelly':
      return new MockShellyTransport(host, initialState);
    default:
      throw new Error(`Unsupported mock protocol: ${protocol}`);
  }
}
