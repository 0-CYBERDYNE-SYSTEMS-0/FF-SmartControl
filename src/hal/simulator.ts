// Digital Twin Runtime — Live simulation engine for HAL
// Writes into the same hal_* tables as real hardware for true parity.
//
// Usage:
//   HAL_SIM_MODE=1 npm run dev
//
// The simulator runs a tick loop that models zone physics, device behavior,
// sensor noise/drift/dropout, and agent decisions. All output goes through
// halRegistry, halSensors, halRelays, halDecisions.

import { halRegistry } from './registry.js';
import { halSensors } from './sensors.js';
import { halRelays } from './relays.js';
import { halDecisions } from './decisions.js';
import type {
  MetricType,
  SensorUnit,
  DeviceType,
  DeviceProtocol,
} from './types.js';
import {
  approach,
  getMetricUnit,
  normalizeMetricValue,
} from './telemetry-model.js';

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SimConfig {
  tickMs: number; // base simulation tick interval
  speed: number; // time multiplier (1 = real-time, 10 = 10x)
  seed: number; // deterministic RNG seed
  scenario: SimScenario;
}

export type SimScenario =
  | 'normal_day'
  | 'heat_wave'
  | 'cold_snap'
  | 'pump_failure'
  | 'sensor_fault'
  | 'light_cycle_fault'
  | 'recovery';

const DEFAULT_CONFIG: SimConfig = {
  tickMs: 5000,
  speed: 1,
  seed: 42,
  scenario: 'normal_day',
};

/* ═══════════════════════════════════════════════════════════════════════════
   RNG — deterministic seeded random
   ═══════════════════════════════════════════════════════════════════════════ */

class SeededRng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    // xorshift32
    this.state ^= this.state << 13;
    this.state ^= this.state >>> 17;
    this.state ^= this.state << 5;
    return (this.state >>> 0) / 4294967296;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  normal(mean = 0, std = 1): number {
    // Box-Muller
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  }
  bool(prob = 0.5): boolean {
    return this.next() < prob;
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   ZONE PHYSICS MODEL
   ═══════════════════════════════════════════════════════════════════════════ */

interface ZoneState {
  name: string;
  temperature: number; // °C
  humidity: number; // %
  co2: number; // ppm
  light: number; // lux
  soilMoisture: number; // %
  waterLevel: number; // %
  ph: number;
  weight: number; // kg
  vpd: number; // kPa (computed)
}

interface ZoneTarget {
  temp: number;
  humidity: number;
  co2: number;
  soilMoisture: number;
  waterLevel: number;
  ph: number;
}

interface SimDevice {
  id: string;
  type: DeviceType;
  protocol: DeviceProtocol;
  label: string;
  host: string | null;
  state: 'on' | 'off';
  powerWatts: number;
  effect: Partial<Record<keyof ZoneState, number>>;
}

interface SimSensor {
  deviceId: string;
  metric: MetricType;
  unit: SensorUnit;
  noiseStd: number;
  driftRate: number; // units per hour bias drift
  lagMs: number; // smoothing lag
  dropoutProb: number; // chance of missing reading
  stuckProb: number; // chance of stuck value
  stuckValue: number | null;
  lastValue: number;
  buffer: number[]; // for lag smoothing
}

const ZONES: ZoneState[] = [
  {
    name: 'Tent A',
    temperature: 24,
    humidity: 60,
    co2: 800,
    light: 0,
    soilMoisture: 55,
    waterLevel: 75,
    ph: 6.2,
    weight: 12.5,
    vpd: 1.2,
  },
  {
    name: 'Tent B',
    temperature: 23,
    humidity: 62,
    co2: 750,
    light: 0,
    soilMoisture: 58,
    waterLevel: 70,
    ph: 6.0,
    weight: 11.8,
    vpd: 1.1,
  },
];

const ZONE_TARGETS: ZoneTarget = {
  temp: 24,
  humidity: 60,
  co2: 800,
  soilMoisture: 55,
  waterLevel: 75,
  ph: 6.2,
};

const SIM_DEVICES: SimDevice[] = [
  {
    id: 'grow_light_main',
    type: 'relay',
    protocol: 'tasmota',
    label: 'Grow Light (Main)',
    host: '192.168.1.101',
    state: 'off',
    powerWatts: 600,
    effect: { light: 45000, temperature: 2.5 },
  },
  {
    id: 'exhaust_fan',
    type: 'relay',
    protocol: 'shelly',
    label: 'Exhaust Fan',
    host: '192.168.1.102',
    state: 'off',
    powerWatts: 80,
    effect: { temperature: -1.8, humidity: -8, co2: -120 },
  },
  {
    id: 'humidifier',
    type: 'relay',
    protocol: 'shelly',
    label: 'Humidifier',
    host: '192.168.1.103',
    state: 'off',
    powerWatts: 200,
    effect: { humidity: 12 },
  },
  {
    id: 'water_pump',
    type: 'relay',
    protocol: 'tasmota',
    label: 'Water Pump',
    host: '192.168.1.104',
    state: 'off',
    powerWatts: 45,
    effect: { soilMoisture: 3, waterLevel: -2 },
  },
  {
    id: 'heater_plug',
    type: 'smart_plug',
    protocol: 'kasa',
    label: 'Heater Plug',
    host: '192.168.1.105',
    state: 'off',
    powerWatts: 1500,
    effect: { temperature: 4.5 },
  },
  {
    id: 'dehumidifier_plug',
    type: 'smart_plug',
    protocol: 'kasa',
    label: 'Dehumidifier Plug',
    host: '192.168.1.106',
    state: 'off',
    powerWatts: 300,
    effect: { humidity: -15 },
  },
];

const SENSOR_DEVICE_DEFS: Array<{
  id: string;
  label: string;
  protocol: DeviceProtocol;
  host: string | null;
}> = [
  {
    id: 'tent_a_temp_1',
    label: 'Tent A Temperature #1 (Canopy)',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_a_temp_2',
    label: 'Tent A Temperature #2 (Floor)',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_a_soil_1',
    label: 'Tent A Soil Probe #1',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_a_co2_1',
    label: 'Tent A CO2 Monitor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_a_light_1',
    label: 'Tent A Light Sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_a_ph_1',
    label: 'Tent A pH Probe',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_a_water_1',
    label: 'Tent A Water Level Sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_a_load_cell_1',
    label: 'Tent A Load Cell #1',
    protocol: 'serial',
    host: '/dev/ttyUSB0',
  },
  {
    id: 'tent_b_temp_1',
    label: 'Tent B Temperature #1 (Canopy)',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_b_temp_2',
    label: 'Tent B Temperature #2 (Floor)',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_b_soil_1',
    label: 'Tent B Soil Probe #1',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_b_co2_1',
    label: 'Tent B CO2 Monitor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_b_light_1',
    label: 'Tent B Light Sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_b_ph_1',
    label: 'Tent B pH Probe',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_b_water_1',
    label: 'Tent B Water Level Sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
  },
  {
    id: 'tent_b_load_cell_1',
    label: 'Tent B Load Cell #1',
    protocol: 'serial',
    host: '/dev/ttyUSB1',
  },
];

const SIM_SENSORS: SimSensor[] = [
  {
    deviceId: 'tent_a_temp_1',
    metric: 'temperature',
    unit: 'c',
    noiseStd: 0.28,
    driftRate: 0.02,
    lagMs: 2800,
    dropoutProb: 0.02,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 24.6,
    buffer: [],
  },
  {
    deviceId: 'tent_a_temp_1',
    metric: 'humidity',
    unit: '%',
    noiseStd: 1.3,
    driftRate: 0.05,
    lagMs: 4600,
    dropoutProb: 0.02,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 58,
    buffer: [],
  },
  {
    deviceId: 'tent_a_temp_2',
    metric: 'temperature',
    unit: 'c',
    noiseStd: 0.34,
    driftRate: 0.02,
    lagMs: 3000,
    dropoutProb: 0.02,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 23.4,
    buffer: [],
  },
  {
    deviceId: 'tent_a_temp_2',
    metric: 'humidity',
    unit: '%',
    noiseStd: 1.7,
    driftRate: 0.05,
    lagMs: 5200,
    dropoutProb: 0.02,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 62,
    buffer: [],
  },
  {
    deviceId: 'tent_a_co2_1',
    metric: 'co2',
    unit: 'ppm',
    noiseStd: 20,
    driftRate: 1.0,
    lagMs: 8000,
    dropoutProb: 0.02,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 820,
    buffer: [],
  },
  {
    deviceId: 'tent_a_soil_1',
    metric: 'soil_moisture',
    unit: '%',
    noiseStd: 1.9,
    driftRate: 0.1,
    lagMs: 9800,
    dropoutProb: 0.03,
    stuckProb: 0.002,
    stuckValue: null,
    lastValue: 56,
    buffer: [],
  },
  {
    deviceId: 'tent_a_soil_1',
    metric: 'temperature',
    unit: 'c',
    noiseStd: 0.35,
    driftRate: 0.02,
    lagMs: 3200,
    dropoutProb: 0.03,
    stuckProb: 0.002,
    stuckValue: null,
    lastValue: 22.0,
    buffer: [],
  },
  {
    deviceId: 'tent_a_light_1',
    metric: 'light',
    unit: 'lux',
    noiseStd: 420,
    driftRate: 45,
    lagMs: 2200,
    dropoutProb: 0.01,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 0,
    buffer: [],
  },
  {
    deviceId: 'tent_a_ph_1',
    metric: 'ph',
    unit: '',
    noiseStd: 0.04,
    driftRate: 0.001,
    lagMs: 5000,
    dropoutProb: 0.02,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 6.2,
    buffer: [],
  },
  {
    deviceId: 'tent_a_water_1',
    metric: 'water_level',
    unit: '%',
    noiseStd: 1.2,
    driftRate: 0.05,
    lagMs: 8200,
    dropoutProb: 0.03,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 74,
    buffer: [],
  },
  {
    deviceId: 'tent_a_load_cell_1',
    metric: 'weight',
    unit: 'kg',
    noiseStd: 0.04,
    driftRate: 0.01,
    lagMs: 3000,
    dropoutProb: 0.02,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 12.8,
    buffer: [],
  },
  {
    deviceId: 'tent_b_temp_1',
    metric: 'temperature',
    unit: 'c',
    noiseStd: 0.3,
    driftRate: 0.02,
    lagMs: 3000,
    dropoutProb: 0.02,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 22.8,
    buffer: [],
  },
  {
    deviceId: 'tent_b_temp_1',
    metric: 'humidity',
    unit: '%',
    noiseStd: 1.6,
    driftRate: 0.05,
    lagMs: 5000,
    dropoutProb: 0.02,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 64,
    buffer: [],
  },
  {
    deviceId: 'tent_b_temp_2',
    metric: 'temperature',
    unit: 'c',
    noiseStd: 0.38,
    driftRate: 0.02,
    lagMs: 3300,
    dropoutProb: 0.02,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 21.9,
    buffer: [],
  },
  {
    deviceId: 'tent_b_temp_2',
    metric: 'humidity',
    unit: '%',
    noiseStd: 1.9,
    driftRate: 0.05,
    lagMs: 5500,
    dropoutProb: 0.02,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 67,
    buffer: [],
  },
  {
    deviceId: 'tent_b_co2_1',
    metric: 'co2',
    unit: 'ppm',
    noiseStd: 28,
    driftRate: 1.0,
    lagMs: 8200,
    dropoutProb: 0.03,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 900,
    buffer: [],
  },
  {
    deviceId: 'tent_b_soil_1',
    metric: 'soil_moisture',
    unit: '%',
    noiseStd: 2.1,
    driftRate: 0.1,
    lagMs: 10200,
    dropoutProb: 0.03,
    stuckProb: 0.002,
    stuckValue: null,
    lastValue: 53,
    buffer: [],
  },
  {
    deviceId: 'tent_b_soil_1',
    metric: 'temperature',
    unit: 'c',
    noiseStd: 0.37,
    driftRate: 0.02,
    lagMs: 3200,
    dropoutProb: 0.03,
    stuckProb: 0.002,
    stuckValue: null,
    lastValue: 21.1,
    buffer: [],
  },
  {
    deviceId: 'tent_b_light_1',
    metric: 'light',
    unit: 'lux',
    noiseStd: 520,
    driftRate: 50,
    lagMs: 2400,
    dropoutProb: 0.01,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 0,
    buffer: [],
  },
  {
    deviceId: 'tent_b_ph_1',
    metric: 'ph',
    unit: '',
    noiseStd: 0.05,
    driftRate: 0.001,
    lagMs: 5200,
    dropoutProb: 0.02,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 6.0,
    buffer: [],
  },
  {
    deviceId: 'tent_b_water_1',
    metric: 'water_level',
    unit: '%',
    noiseStd: 1.4,
    driftRate: 0.05,
    lagMs: 8200,
    dropoutProb: 0.03,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 68,
    buffer: [],
  },
  {
    deviceId: 'tent_b_load_cell_1',
    metric: 'weight',
    unit: 'kg',
    noiseStd: 0.05,
    driftRate: 0.01,
    lagMs: 3100,
    dropoutProb: 0.02,
    stuckProb: 0.001,
    stuckValue: null,
    lastValue: 11.9,
    buffer: [],
  },
];

function zoneIndexForDevice(deviceId: string): number {
  if (deviceId.startsWith('tent_b_')) return 1;
  return 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIMULATOR ENGINE
   ═══════════════════════════════════════════════════════════════════════════ */

export class HalSimulator {
  private rng: SeededRng;
  private zones: ZoneState[];
  private devices: SimDevice[];
  private sensors: SimSensor[];
  private config: SimConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;
  private simTimeMs = Date.now();
  private lightScheduleOn = false;
  // When false (HAL_SIM_AUTOPILOT=0), the simulator stops making control
  // decisions and stops its internal light-schedule actuation. The twin
  // becomes a pure world (physics + sensor emission), and relay state is
  // driven by whatever wrote halRegistry — i.e. the real agent or manual UI.
  // Default true preserves legacy self-playing behavior exactly.
  private autopilot = process.env.HAL_SIM_AUTOPILOT !== '0';
  private faultState: {
    sensorStuck: Set<string>; // deviceId:metric
    deviceOffline: Set<string>; // deviceId
    networkFlap: boolean;
    delayedTelemetry: boolean;
    badCalibration: Set<string>; // deviceId:metric
  } = {
    sensorStuck: new Set(),
    deviceOffline: new Set(),
    networkFlap: false,
    delayedTelemetry: false,
    badCalibration: new Set(),
  };

  constructor(config: Partial<SimConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = new SeededRng(this.config.seed);
    this.zones = ZONES.map((z) => ({ ...z }));
    this.devices = SIM_DEVICES.map((d) => ({ ...d, state: 'off' as const }));
    this.sensors = SIM_SENSORS.map((s) => ({
      ...s,
      stuckValue: null as number | null,
      lastValue: s.lastValue,
      buffer: [] as number[],
    }));
    this.applyScenario();
  }

  start(): void {
    if (this.timer) return;
    // Register all simulated devices in HAL registry
    for (const dev of this.devices) {
      if (!halRegistry.get(dev.id)) {
        halRegistry.register({
          id: dev.id,
          type: dev.type,
          protocol: dev.protocol,
          host: dev.host,
          label: dev.label,
        });
      }
    }
    // Register sensor devices too
    const sensorDeviceIds = new Set(this.sensors.map((s) => s.deviceId));
    for (const sid of sensorDeviceIds) {
      if (!halRegistry.get(sid)) {
        const meta = SENSOR_DEVICE_DEFS.find((d) => d.id === sid);
        halRegistry.register({
          id: sid,
          type: 'sensor',
          protocol: meta?.protocol ?? 'mqtt',
          host: meta?.host ?? 'mqtt://localhost',
          label: meta?.label ?? `Sim ${sid}`,
        });
      }
    }
    // Register cameras
    const cameras = [
      { id: 'tent_cam_a', label: 'Tent Camera A' },
      { id: 'tent_cam_b', label: 'Tent Camera B' },
    ];
    for (const cam of cameras) {
      if (!halRegistry.get(cam.id)) {
        halRegistry.register({
          id: cam.id,
          type: 'camera',
          protocol: 'mqtt',
          host: '/dev/video0',
          label: cam.label,
        });
      }
    }

    this.timer = setInterval(() => this.tick(), this.config.tickMs);
    console.log(
      `[HAL Sim] Started — scenario: ${this.config.scenario}, speed: ${this.config.speed}x, tick: ${this.config.tickMs}ms`,
    );
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[HAL Sim] Stopped');
  }

  setScenario(scenario: SimScenario): void {
    this.config.scenario = scenario;
    this.applyScenario();
    console.log(`[HAL Sim] Scenario changed to: ${scenario}`);
  }

  setSpeed(speed: number): void {
    this.config.speed = Math.max(0.1, Math.min(100, speed));
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = setInterval(() => this.tick(), this.config.tickMs);
    }
  }

  runTickForTesting(): void {
    this.tick();
  }

  injectFault(
    fault:
      | 'sensor_stuck'
      | 'device_offline'
      | 'network_flap'
      | 'delayed_telemetry'
      | 'bad_calibration'
      | 'clear',
  ): void {
    switch (fault) {
      case 'sensor_stuck': {
        const s = this.rng.pick(this.sensors);
        this.faultState.sensorStuck.add(`${s.deviceId}:${s.metric}`);
        console.log(`[HAL Sim] FAULT: sensor stuck ${s.deviceId}:${s.metric}`);
        break;
      }
      case 'device_offline': {
        const d = this.rng.pick(this.devices);
        this.faultState.deviceOffline.add(d.id);
        console.log(`[HAL Sim] FAULT: device offline ${d.id}`);
        break;
      }
      case 'network_flap':
        this.faultState.networkFlap = true;
        console.log('[HAL Sim] FAULT: network flapping');
        break;
      case 'delayed_telemetry':
        this.faultState.delayedTelemetry = true;
        console.log('[HAL Sim] FAULT: delayed telemetry');
        break;
      case 'bad_calibration': {
        const s = this.rng.pick(this.sensors);
        this.faultState.badCalibration.add(`${s.deviceId}:${s.metric}`);
        console.log(
          `[HAL Sim] FAULT: bad calibration ${s.deviceId}:${s.metric}`,
        );
        break;
      }
      case 'clear':
        this.faultState.sensorStuck.clear();
        this.faultState.deviceOffline.clear();
        this.faultState.networkFlap = false;
        this.faultState.delayedTelemetry = false;
        this.faultState.badCalibration.clear();
        console.log('[HAL Sim] All faults cleared');
        break;
    }
  }

  getStatus() {
    return {
      running: !!this.timer,
      tickCount: this.tickCount,
      scenario: this.config.scenario,
      speed: this.config.speed,
      simTime: new Date(this.simTimeMs).toISOString(),
      zones: this.zones.map((z) => ({
        name: z.name,
        temperature: z.temperature,
        humidity: z.humidity,
        co2: z.co2,
      })),
      devices: this.devices.map((d) => ({
        id: d.id,
        state: d.state,
        power: d.powerWatts,
      })),
      faults: {
        sensorStuck: Array.from(this.faultState.sensorStuck),
        deviceOffline: Array.from(this.faultState.deviceOffline),
        networkFlap: this.faultState.networkFlap,
        delayedTelemetry: this.faultState.delayedTelemetry,
        badCalibration: Array.from(this.faultState.badCalibration),
      },
    };
  }

  // Read-only full ground-truth zone vector. The twin knows the EXACT physical
  // state; sensors only ever report a noisy/drifted/lagged view of it. The
  // efficacy scorecard grades the agent against this oracle. Sim-only.
  getGroundTruth(): Array<ZoneState & { name: string }> {
    return this.zones.map((z) => ({ ...z }));
  }

  // Agent-driven mode: pull authoritative relay state from halRegistry into the
  // sim's device model so physics responds to the real agent / manual UI.
  private syncDeviceStatesFromRegistry(): void {
    for (const dev of this.devices) {
      if (this.faultState.deviceOffline.has(dev.id)) continue;
      const reg = halRegistry.get(dev.id);
      const regState = reg?.last_state;
      if (regState === 'on' || regState === 'off') {
        dev.state = regState;
      }
    }
    this.lightScheduleOn =
      this.devices.find((d) => d.id === 'grow_light_main')?.state === 'on';
  }

  private applyScenario(): void {
    switch (this.config.scenario) {
      case 'heat_wave':
        this.zones.forEach((z) => {
          z.temperature += 8;
          z.humidity -= 15;
        });
        break;
      case 'cold_snap':
        this.zones.forEach((z) => {
          z.temperature -= 10;
          z.humidity += 20;
        });
        break;
      case 'pump_failure':
        this.devices.find((d) => d.id === 'water_pump')!.state = 'off';
        break;
      case 'sensor_fault':
        this.faultState.sensorStuck.add('tent_a_temp_1:temperature');
        break;
      case 'light_cycle_fault':
        this.lightScheduleOn = true;
        break;
      case 'recovery':
        this.zones = ZONES.map((z) => ({ ...z }));
        this.faultState.sensorStuck.clear();
        this.faultState.deviceOffline.clear();
        break;
      case 'normal_day':
      default:
        break;
    }
  }

  private tick(): void {
    const dtSeconds = (this.config.tickMs / 1000) * this.config.speed;
    this.simTimeMs += this.config.tickMs * this.config.speed;
    this.tickCount++;

    // 0. Agent-driven mode: relay state lives in halRegistry (written by the
    //    real agent or manual UI). Mirror it into the sim's device model so
    //    physics responds to whoever is actually in control.
    if (!this.autopilot) {
      this.syncDeviceStatesFromRegistry();
    }

    // 1. Update light schedule (18/6 cycle) — internal actuation, autopilot only
    if (this.autopilot) {
      const simDate = new Date(this.simTimeMs);
      const hour = simDate.getHours() + simDate.getMinutes() / 60;
      const shouldBeLightOn = hour >= 6 && hour < 24; // 18h on, 6h off
      if (
        shouldBeLightOn !== this.lightScheduleOn &&
        !this.faultState.deviceOffline.has('grow_light_main')
      ) {
        this.lightScheduleOn = shouldBeLightOn;
        const lightDev = this.devices.find((d) => d.id === 'grow_light_main')!;
        lightDev.state = shouldBeLightOn ? 'on' : 'off';
        halRegistry.updateState(
          lightDev.id,
          lightDev.state,
          lightDev.powerWatts,
        );
        halRelays.log({
          device_id: lightDev.id,
          state: lightDev.state,
          reason: 'schedule',
          triggered_by: 'simulator',
          switched_at: new Date(this.simTimeMs).toISOString(),
        });
      }
    }

    // 2. Apply device effects to zone physics
    this.applyDeviceEffects(dtSeconds);

    // 3. Natural physics (convection, evaporation, plant respiration)
    this.zones.forEach((zone, zoneIndex) => {
      const zoneTempOffset = zoneIndex === 0 ? 0.7 : -0.9;
      const zoneHumOffset = zoneIndex === 0 ? -2 : 3.5;
      const zoneCo2Offset = zoneIndex === 0 ? -40 : 70;
      const zoneSoilEvaporation = zoneIndex === 0 ? 0.005 : 0.0042;
      const zoneWaterDrain = zoneIndex === 0 ? 0.0022 : 0.0017;

      // Temperature drifts toward ambient (20°C) + light heat
      const ambientTemp = 20 + (this.lightScheduleOn ? 2 : 0) + zoneTempOffset;
      zone.temperature += (ambientTemp - zone.temperature) * 0.001 * dtSeconds;

      // Humidity drifts toward ambient (50%) + plant transpiration
      const ambientHum = 50 + (this.lightScheduleOn ? 10 : 0) + zoneHumOffset;
      zone.humidity += (ambientHum - zone.humidity) * 0.0008 * dtSeconds;
      zone.humidity = Math.max(10, Math.min(95, zone.humidity));

      // CO2: plants consume during light, respire during dark
      const co2Ambient = 420;
      const co2Target =
        (this.lightScheduleOn ? 800 : co2Ambient) + zoneCo2Offset;
      zone.co2 += (co2Target - zone.co2) * 0.0005 * dtSeconds;

      // Soil moisture evaporates
      zone.soilMoisture -= zoneSoilEvaporation * dtSeconds;

      // Water level slowly drops
      zone.waterLevel -= zoneWaterDrain * dtSeconds;

      // pH drifts slowly
      zone.ph += (ZONE_TARGETS.ph - zone.ph) * 0.0001 * dtSeconds;

      // Weight grows slowly (plant growth)
      zone.weight += 0.0001 * dtSeconds;

      // VPD computation
      const satVaporPressure =
        0.6108 *
        Math.exp((17.27 * zone.temperature) / (zone.temperature + 237.3));
      const actualVaporPressure = satVaporPressure * (zone.humidity / 100);
      zone.vpd = satVaporPressure - actualVaporPressure;
      this.clampZone(zone);
    });

    // 4. Agent-style auto decisions — internal controller, autopilot only.
    //    With HAL_SIM_AUTOPILOT=0 the real agent is the sole decision-maker.
    if (this.autopilot) {
      this.runAutoDecisions();
    }

    // 5. Read sensors and store to HAL
    this.readAndStoreSensors();

    // 6. Update device registry states
    for (const dev of this.devices) {
      if (this.faultState.deviceOffline.has(dev.id)) {
        halRegistry.updateState(dev.id, 'unknown');
      } else {
        halRegistry.updateState(
          dev.id,
          dev.state,
          dev.state === 'on' ? dev.powerWatts : 0,
        );
      }
    }
  }

  private applyDeviceEffects(dtSeconds: number): void {
    const lightOn =
      this.devices.find((d) => d.id === 'grow_light_main')?.state === 'on' &&
      !this.faultState.deviceOffline.has('grow_light_main');
    const exhaustOn =
      this.devices.find((d) => d.id === 'exhaust_fan')?.state === 'on' &&
      !this.faultState.deviceOffline.has('exhaust_fan');
    const humidifierOn =
      this.devices.find((d) => d.id === 'humidifier')?.state === 'on' &&
      !this.faultState.deviceOffline.has('humidifier');
    const pumpOn =
      this.devices.find((d) => d.id === 'water_pump')?.state === 'on' &&
      !this.faultState.deviceOffline.has('water_pump');
    const heaterOn =
      this.devices.find((d) => d.id === 'heater_plug')?.state === 'on' &&
      !this.faultState.deviceOffline.has('heater_plug');
    const dehumidifierOn =
      this.devices.find((d) => d.id === 'dehumidifier_plug')?.state === 'on' &&
      !this.faultState.deviceOffline.has('dehumidifier_plug');

    this.zones.forEach((zone, zoneIndex) => {
      const lightTarget = lightOn ? (zoneIndex === 0 ? 62000 : 56000) : 0;
      zone.light = approach(
        zone.light,
        lightTarget,
        lightOn ? 0.08 : 0.18,
        dtSeconds,
      );

      if (lightOn) {
        const canopyTarget = zoneIndex === 0 ? 27.5 : 26.4;
        zone.temperature = approach(
          zone.temperature,
          canopyTarget,
          0.0009,
          dtSeconds,
        );
      }

      if (heaterOn) {
        zone.temperature = approach(zone.temperature, 25.5, 0.0014, dtSeconds);
      }

      if (exhaustOn) {
        const intakeTemp = 21 + (zoneIndex === 0 ? 0.2 : -0.3);
        zone.temperature = approach(
          zone.temperature,
          intakeTemp,
          0.0018,
          dtSeconds,
        );
        zone.humidity = approach(zone.humidity, 52, 0.0015, dtSeconds);
        zone.co2 = approach(zone.co2, 430, 0.0024, dtSeconds);
      }

      if (humidifierOn) {
        zone.humidity = approach(zone.humidity, 68, 0.0018, dtSeconds);
      }

      if (dehumidifierOn) {
        zone.humidity = approach(zone.humidity, 48, 0.0018, dtSeconds);
      }

      if (pumpOn) {
        zone.soilMoisture = approach(zone.soilMoisture, 72, 0.006, dtSeconds);
        zone.waterLevel -= 0.012 * dtSeconds;
      }

      this.clampZone(zone);
    });
  }

  private clampZone(zone: ZoneState): void {
    zone.temperature = normalizeMetricValue('temperature', zone.temperature);
    zone.humidity = normalizeMetricValue('humidity', zone.humidity);
    zone.co2 = normalizeMetricValue('co2', zone.co2);
    zone.light = normalizeMetricValue('light', zone.light);
    zone.soilMoisture = normalizeMetricValue(
      'soil_moisture',
      zone.soilMoisture,
    );
    zone.waterLevel = normalizeMetricValue('water_level', zone.waterLevel);
    zone.ph = normalizeMetricValue('ph', zone.ph);
    zone.weight = normalizeMetricValue('weight', zone.weight);
  }

  private runAutoDecisions(): void {
    // Simple rule-based agent decisions
    const zone = this.zones[0];
    const now = new Date(this.simTimeMs).toISOString();

    // Temperature control
    if (
      zone.temperature > 28 &&
      this.devices.find((d) => d.id === 'exhaust_fan')!.state === 'off'
    ) {
      if (!this.faultState.deviceOffline.has('exhaust_fan')) {
        this.setDeviceState('exhaust_fan', 'on');
        halDecisions.log({
          device_id: 'exhaust_fan',
          decision: 'turn_on',
          confidence: 0.92,
          reasoning: `Temperature ${zone.temperature.toFixed(1)}°C exceeded 28°C threshold`,
          sensor_snapshot: {
            temperature: zone.temperature,
            humidity: zone.humidity,
          },
          outcome: 'success',
        });
      }
    } else if (
      zone.temperature < 23 &&
      this.devices.find((d) => d.id === 'exhaust_fan')!.state === 'on'
    ) {
      this.setDeviceState('exhaust_fan', 'off');
      halDecisions.log({
        device_id: 'exhaust_fan',
        decision: 'turn_off',
        confidence: 0.88,
        reasoning: `Temperature ${zone.temperature.toFixed(1)}°C below 23°C`,
        sensor_snapshot: { temperature: zone.temperature },
        outcome: 'success',
      });
    }

    // Humidity control
    if (
      zone.humidity < 50 &&
      this.devices.find((d) => d.id === 'humidifier')!.state === 'off'
    ) {
      if (!this.faultState.deviceOffline.has('humidifier')) {
        this.setDeviceState('humidifier', 'on');
        halDecisions.log({
          device_id: 'humidifier',
          decision: 'turn_on',
          confidence: 0.9,
          reasoning: `Humidity ${zone.humidity.toFixed(1)}% below 50%`,
          sensor_snapshot: { humidity: zone.humidity },
          outcome: 'success',
        });
      }
    } else if (
      zone.humidity > 70 &&
      this.devices.find((d) => d.id === 'humidifier')!.state === 'on'
    ) {
      this.setDeviceState('humidifier', 'off');
      halDecisions.log({
        device_id: 'humidifier',
        decision: 'turn_off',
        confidence: 0.85,
        reasoning: `Humidity ${zone.humidity.toFixed(1)}% above 70%`,
        sensor_snapshot: { humidity: zone.humidity },
        outcome: 'success',
      });
    }

    // Soil moisture → water pump
    if (
      zone.soilMoisture < 45 &&
      this.devices.find((d) => d.id === 'water_pump')!.state === 'off'
    ) {
      if (!this.faultState.deviceOffline.has('water_pump')) {
        this.setDeviceState('water_pump', 'on');
        halDecisions.log({
          device_id: 'water_pump',
          decision: 'turn_on',
          confidence: 0.85,
          reasoning: `Soil moisture ${zone.soilMoisture.toFixed(1)}% below 45%`,
          sensor_snapshot: { soil_moisture: zone.soilMoisture },
          outcome: 'success',
        });
      }
    } else if (
      zone.soilMoisture > 65 &&
      this.devices.find((d) => d.id === 'water_pump')!.state === 'on'
    ) {
      this.setDeviceState('water_pump', 'off');
      halDecisions.log({
        device_id: 'water_pump',
        decision: 'turn_off',
        confidence: 0.82,
        reasoning: `Soil moisture ${zone.soilMoisture.toFixed(1)}% above 65%`,
        sensor_snapshot: { soil_moisture: zone.soilMoisture },
        outcome: 'success',
      });
    }

    // CO2 alert
    if (zone.co2 > 1200 && this.tickCount % 12 === 0) {
      halDecisions.log({
        decision: 'alert',
        confidence: 0.93,
        reasoning: `CO2 ${zone.co2.toFixed(0)}ppm above optimal range`,
        sensor_snapshot: { co2: zone.co2 },
        outcome: 'pending',
      });
    }
  }

  setDeviceState(deviceId: string, state: 'on' | 'off'): void {
    const dev = this.devices.find((d) => d.id === deviceId);
    if (!dev) return;
    dev.state = state;
    halRegistry.updateState(dev.id, state, state === 'on' ? dev.powerWatts : 0);
    halRelays.log({
      device_id: dev.id,
      state,
      reason: 'auto_rule',
      triggered_by: 'simulator',
      switched_at: new Date(this.simTimeMs).toISOString(),
    });
  }

  private readAndStoreSensors(): void {
    const now = new Date(this.simTimeMs).toISOString();

    for (const sensor of this.sensors) {
      const zoneIndex = zoneIndexForDevice(sensor.deviceId);
      const zone = this.zones[zoneIndex] || this.zones[0];
      let trueValue: number;

      switch (sensor.metric) {
        case 'temperature':
          trueValue = zone.temperature;
          break;
        case 'humidity':
          trueValue = zone.humidity;
          break;
        case 'co2':
          trueValue = zone.co2;
          break;
        case 'light':
          trueValue = zone.light;
          break;
        case 'soil_moisture':
          trueValue = zone.soilMoisture;
          break;
        case 'water_level':
          trueValue = zone.waterLevel;
          break;
        case 'ph':
          trueValue = zone.ph;
          break;
        case 'weight':
          trueValue = zone.weight;
          break;
        default:
          trueValue = 0;
      }

      // Fault: stuck sensor
      const stuckKey = `${sensor.deviceId}:${sensor.metric}`;
      if (this.faultState.sensorStuck.has(stuckKey)) {
        if (sensor.stuckValue === null) sensor.stuckValue = sensor.lastValue;
        trueValue = sensor.stuckValue;
      } else {
        sensor.stuckValue = null;
      }

      // Fault: bad calibration (offset bias)
      if (this.faultState.badCalibration.has(stuckKey)) {
        trueValue +=
          sensor.metric === 'temperature'
            ? 5
            : sensor.metric === 'co2'
              ? 300
              : 10;
      }

      // Fault: dropout
      if (this.rng.bool(sensor.dropoutProb)) continue;

      // Noise + drift
      const drift = sensor.driftRate * (this.tickCount / 720); // drift over time
      const noise = this.rng.normal(0, sensor.noiseStd);
      let reading = trueValue + drift + noise;

      // Lag smoothing
      sensor.buffer.push(reading);
      if (sensor.buffer.length > 5) sensor.buffer.shift();
      reading = sensor.buffer.reduce((a, b) => a + b, 0) / sensor.buffer.length;

      reading = normalizeMetricValue(sensor.metric, reading);

      sensor.lastValue = reading;

      // Fault: delayed telemetry (store with past timestamp)
      const readAt =
        this.faultState.delayedTelemetry && this.rng.bool(0.3)
          ? new Date(this.simTimeMs - this.rng.int(5000, 30000)).toISOString()
          : now;

      // Network flap: skip storing occasionally
      if (this.faultState.networkFlap && this.rng.bool(0.2)) continue;

      halSensors.store({
        device_id: sensor.deviceId,
        metric: sensor.metric,
        unit: getMetricUnit(sensor.metric),
        value: reading,
        quality: this.faultState.sensorStuck.has(stuckKey) ? 'error' : 'good',
        read_at: readAt,
      });
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SINGLETON INSTANCE
   ═══════════════════════════════════════════════════════════════════════════ */

let simulator: HalSimulator | null = null;

export function startSimulator(config?: Partial<SimConfig>): HalSimulator {
  if (simulator) simulator.stop();
  simulator = new HalSimulator(config);
  simulator.start();
  return simulator;
}

export function stopSimulator(): void {
  simulator?.stop();
  simulator = null;
}

export function getSimulator(): HalSimulator | null {
  return simulator;
}
