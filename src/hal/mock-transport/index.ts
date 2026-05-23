/**
 * Barrel export for mock-transport — protocol-level HTTP mock servers.
 *
 * Provides:
 *   - Types: MockTransport, MockTransportFault, MockTransportConfig, MockDeviceState
 *   - HttpMockServer: shared HTTP server that routes to per-device state
 *   - TasmotaMock: per-device Tasmota simulator
 *   - ShellyMock: per-device Shelly simulator (gen-1 and gen-2)
 *   - GpioMock: in-memory GPIO controller
 */

export type {
  MockTransport,
  MockTransportFault,
  MockTransportConfig,
  MockDeviceState,
} from './types.js';

export {
  HttpMockServer,
  getHttpMockServer,
  resetHttpMockServer,
} from './http-mock-server.js';

export { TasmotaMock } from './tasmota-mock.js';
export { ShellyMock } from './shelly-mock.js';
export { GpioMock } from './gpio-mock.js';
