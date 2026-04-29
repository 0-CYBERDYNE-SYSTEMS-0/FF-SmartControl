export {
  getDb,
  runMigrations,
  checkDbIntegrity,
  DatabaseCorruptionError,
  _closeDbForTesting,
} from './db.js';
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
} from './http-devices.js';
export { gpio, GPIOController } from './gpio.js';
export { mqttSubscriber, MQTTSubscriber } from './mqtt.js';
export { serialReader, SerialSensorReader } from './serial.js';
export { V4L2Camera } from './camera.js';
export { discoverDevices, autoRegisterDiscovered } from './discovery.js';
