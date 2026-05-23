export {
  getDb,
  runMigrations,
  checkDbIntegrity,
  DatabaseCorruptionError,
  _closeDbForTesting,
} from './db.js';
export {
  getSafetyDb,
  runSafetyMigrations,
  checkSafetyDbIntegrity,
  _closeSafetyDbForTesting,
} from './safety-db.js';
export { halRegistry, HalRegistry } from './registry.js';
export { halSensors, HalSensorStore } from './sensors.js';
export { halRelays, HalRelayStore } from './relays.js';
export { halDecisions, HalDecisionLog } from './decisions.js';
export type * from './types.js';

// Protocol clients
export {
  TasmotaClient,
  ShellyClient,
  KasaClient,
  createHttpClient,
  setMockBaseUrl,
  getMockBaseUrl,
} from './http-devices.js';
export { gpio, GPIOController } from './gpio.js';
export { mqttSubscriber, MQTTSubscriber } from './mqtt.js';
export { serialReader, SerialSensorReader } from './serial.js';
export { V4L2Camera } from './camera.js';
export { discoverDevices, autoRegisterDiscovered } from './discovery.js';

// Protocol-level fault injection
export {
  FaultInjectionController,
  getFaultInjectionController,
  createFaultInjectionController,
  resetFaultInjectionController,
  interceptSensorReading,
  interceptDecision,
  interceptVerifierResult,
  interceptEstopCheck,
} from './fault-injection.js';
export type {
  FaultType,
  InjectionPoint,
  FaultConfig,
  FaultInjection,
  FaultTriggerRecord,
  FaultStatus,
} from './fault-injection.js';

// In-process mock transports (non-HTTP)
export {
  createMockTransport,
  MockTasmotaTransport,
  MockShellyTransport,
} from './mock-devices.js';
export type {
  DeviceTransport,
  MockDeviceTransport,
  DevicePowerResponse,
  FailureMode,
} from './mock-devices.js';

// Protocol-level HTTP mock servers
export {
  HttpMockServer,
  getHttpMockServer,
  resetHttpMockServer,
  TasmotaMock,
  ShellyMock,
  GpioMock,
} from './mock-transport/index.js';
export type {
  MockTransport,
  MockTransportFault,
  MockTransportConfig,
  MockDeviceState,
} from './mock-transport/index.js';
