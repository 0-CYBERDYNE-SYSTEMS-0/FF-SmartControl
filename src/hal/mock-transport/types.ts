/**
 * MockDeviceTransport types for protocol-level HTTP simulation.
 *
 * These types define the contract for in-process mock HTTP servers that
 * simulate real IoT device protocols (Tasmota, Shelly) without real hardware.
 *
 * Consumes FaultInjectionController from ../fault-injection.js for fault behavior.
 */

// ═══════════════════════════════════════════════════════════════════════════
// MOCK TRANSPORT FAULT UNION
// ═══════════════════════════════════════════════════════════════════════════

export type MockTransportFault =
  | 'http_timeout'       // Simulate request timeout (no response)
  | 'http_5xx'           // Simulate HTTP 500-level errors
  | 'malformed_json'     // Return invalid JSON in response body
  | 'connection_reset'   // Destroy socket mid-response
  | 'device_offline';    // Simulate unreachable device (503)

// ═══════════════════════════════════════════════════════════════════════════
// DEVICE STATE
// ═══════════════════════════════════════════════════════════════════════════

export interface MockDeviceState {
  /** Whether the device power output is on */
  on: boolean;
  /** Current wattage reading */
  watts: number;
  /** Whether the device is healthy (no active fault) */
  healthy: boolean;
  /** Currently active fault, or null */
  fault: MockTransportFault | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export interface MockTransportConfig {
  /**
   * Simulated device host identifier.
   * Acts as the device key for routing within the shared HTTP mock server.
   * Example: '192.168.1.101' or 'tasmota_grow_light_main'
   */
  host: string;
  /** Initial power state (default: 'off') */
  initialState?: 'on' | 'off';
  /** Simulated wattage when device is on (default: 150) */
  wattage?: number;
  /** Shelly device generation: 1 = Gen1 (classic), 2 = Gen2 (Plus/Pro) */
  gen?: 1 | 2;
  /**
   * Simulated sensor values for Tasmota Status 8 command.
   * Example: { Temperature: 24.5, Humidity: 58.2, Pressure: 1013.2 }
   */
  sensorValues?: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK TRANSPORT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface MockTransport {
  /** Start the mock — registers with the shared HTTP server */
  start(): Promise<void>;
  /** Stop the mock — deregisters from the shared HTTP server */
  stop(): Promise<void>;
  /** Get current device state (on/off, watts, health, fault) */
  getState(): MockDeviceState;
  /** Inject a fault for this device */
  setFault(fault: MockTransportFault): void;
  /** Clear any active fault */
  clearFault(): void;
  /** Check if the device is healthy (no active fault) */
  isHealthy(): boolean;
  /** Get the base URL this mock responds at (e.g. http://127.0.0.1:5432/mydevice) */
  getUrl(): string;
}
