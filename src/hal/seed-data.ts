import { getDb } from './db.js';
import { halRegistry } from './registry.js';
import { halSensors } from './sensors.js';
import { halRelays } from './relays.js';
import { halDecisions } from './decisions.js';
import type {
  DeviceType,
  DeviceProtocol,
  MetricType,
  SensorUnit,
  DecisionType,
  RelayReason,
} from './types.js';

const DEVICES: Array<{
  id: string;
  type: DeviceType;
  protocol: DeviceProtocol;
  host: string | null;
  label: string;
}> = [
  // Sensors
  {
    id: 'tent_a_temp_1',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent A Temperature #1 (Canopy)',
  },
  {
    id: 'tent_a_temp_2',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent A Temperature #2 (Floor)',
  },
  {
    id: 'tent_a_soil_1',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent A Soil Probe #1',
  },
  {
    id: 'tent_a_co2_1',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent A CO2 Monitor',
  },
  {
    id: 'tent_a_light_1',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent A Light Sensor',
  },
  {
    id: 'tent_a_ph_1',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent A pH Probe',
  },
  {
    id: 'tent_a_water_1',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent A Water Level Sensor',
  },
  {
    id: 'tent_a_load_cell_1',
    type: 'sensor',
    protocol: 'serial',
    host: '/dev/ttyUSB0',
    label: 'Tent A Load Cell #1',
  },
  {
    id: 'tent_b_temp_1',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent B Temperature #1 (Canopy)',
  },
  {
    id: 'tent_b_temp_2',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent B Temperature #2 (Floor)',
  },
  {
    id: 'tent_b_soil_1',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent B Soil Probe #1',
  },
  {
    id: 'tent_b_co2_1',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent B CO2 Monitor',
  },
  {
    id: 'tent_b_light_1',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent B Light Sensor',
  },
  {
    id: 'tent_b_ph_1',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent B pH Probe',
  },
  {
    id: 'tent_b_water_1',
    type: 'sensor',
    protocol: 'mqtt',
    host: 'mqtt://localhost',
    label: 'Tent B Water Level Sensor',
  },
  {
    id: 'tent_b_load_cell_1',
    type: 'sensor',
    protocol: 'serial',
    host: '/dev/ttyUSB1',
    label: 'Tent B Load Cell #1',
  },
  // Relays
  {
    id: 'grow_light_main',
    type: 'relay',
    protocol: 'tasmota',
    host: '192.168.1.101',
    label: 'Grow Light (Main)',
  },
  {
    id: 'exhaust_fan',
    type: 'relay',
    protocol: 'shelly',
    host: '192.168.1.102',
    label: 'Exhaust Fan',
  },
  {
    id: 'humidifier',
    type: 'relay',
    protocol: 'shelly',
    host: '192.168.1.103',
    label: 'Humidifier',
  },
  {
    id: 'water_pump',
    type: 'relay',
    protocol: 'tasmota',
    host: '192.168.1.104',
    label: 'Water Pump',
  },
  // Smart Plugs
  {
    id: 'heater_plug',
    type: 'smart_plug',
    protocol: 'kasa',
    host: '192.168.1.105',
    label: 'Heater Plug',
  },
  {
    id: 'dehumidifier_plug',
    type: 'smart_plug',
    protocol: 'kasa',
    host: '192.168.1.106',
    label: 'Dehumidifier Plug',
  },
  // Cameras
  {
    id: 'tent_cam_a',
    type: 'camera',
    protocol: 'mqtt',
    host: '/dev/video0',
    label: 'Tent Camera A',
  },
  {
    id: 'tent_cam_b',
    type: 'camera',
    protocol: 'mqtt',
    host: '/dev/video1',
    label: 'Tent Camera B',
  },
];

const SENSORS: Array<{
  deviceId: string;
  metric: MetricType;
  unit: SensorUnit;
  baseValue: number;
  amplitude: number;
  period: number;
}> = [
  {
    deviceId: 'tent_a_temp_1',
    metric: 'temperature',
    unit: 'c',
    baseValue: 24.8,
    amplitude: 3.4,
    period: 86400,
  },
  {
    deviceId: 'tent_a_temp_1',
    metric: 'humidity',
    unit: '%',
    baseValue: 58,
    amplitude: 10,
    period: 86400,
  },
  {
    deviceId: 'tent_a_temp_2',
    metric: 'temperature',
    unit: 'c',
    baseValue: 23.6,
    amplitude: 2.7,
    period: 86400,
  },
  {
    deviceId: 'tent_a_temp_2',
    metric: 'humidity',
    unit: '%',
    baseValue: 62,
    amplitude: 8,
    period: 86400,
  },
  {
    deviceId: 'tent_a_soil_1',
    metric: 'soil_moisture',
    unit: '%',
    baseValue: 57,
    amplitude: 15,
    period: 43200,
  },
  {
    deviceId: 'tent_a_soil_1',
    metric: 'temperature',
    unit: 'c',
    baseValue: 22.1,
    amplitude: 1.6,
    period: 86400,
  },
  {
    deviceId: 'tent_a_co2_1',
    metric: 'co2',
    unit: 'ppm',
    baseValue: 840,
    amplitude: 280,
    period: 86400,
  },
  {
    deviceId: 'tent_a_light_1',
    metric: 'light',
    unit: 'lux',
    baseValue: 34000,
    amplitude: 28000,
    period: 86400,
  },
  {
    deviceId: 'tent_a_ph_1',
    metric: 'ph',
    unit: '',
    baseValue: 6.2,
    amplitude: 0.4,
    period: 86400,
  },
  {
    deviceId: 'tent_a_water_1',
    metric: 'water_level',
    unit: '%',
    baseValue: 74,
    amplitude: 8,
    period: 86400,
  },
  {
    deviceId: 'tent_a_load_cell_1',
    metric: 'weight',
    unit: 'kg',
    baseValue: 12.8,
    amplitude: 1.8,
    period: 86400,
  },
  {
    deviceId: 'tent_b_temp_1',
    metric: 'temperature',
    unit: 'c',
    baseValue: 22.7,
    amplitude: 3.0,
    period: 86400,
  },
  {
    deviceId: 'tent_b_temp_1',
    metric: 'humidity',
    unit: '%',
    baseValue: 64,
    amplitude: 11,
    period: 86400,
  },
  {
    deviceId: 'tent_b_temp_2',
    metric: 'temperature',
    unit: 'c',
    baseValue: 21.9,
    amplitude: 2.2,
    period: 86400,
  },
  {
    deviceId: 'tent_b_temp_2',
    metric: 'humidity',
    unit: '%',
    baseValue: 67,
    amplitude: 9,
    period: 86400,
  },
  {
    deviceId: 'tent_b_soil_1',
    metric: 'soil_moisture',
    unit: '%',
    baseValue: 53,
    amplitude: 13,
    period: 43200,
  },
  {
    deviceId: 'tent_b_soil_1',
    metric: 'temperature',
    unit: 'c',
    baseValue: 21.2,
    amplitude: 1.2,
    period: 86400,
  },
  {
    deviceId: 'tent_b_co2_1',
    metric: 'co2',
    unit: 'ppm',
    baseValue: 910,
    amplitude: 360,
    period: 86400,
  },
  {
    deviceId: 'tent_b_light_1',
    metric: 'light',
    unit: 'lux',
    baseValue: 30000,
    amplitude: 24000,
    period: 86400,
  },
  {
    deviceId: 'tent_b_ph_1',
    metric: 'ph',
    unit: '',
    baseValue: 6.0,
    amplitude: 0.5,
    period: 86400,
  },
  {
    deviceId: 'tent_b_water_1',
    metric: 'water_level',
    unit: '%',
    baseValue: 68,
    amplitude: 10,
    period: 86400,
  },
  {
    deviceId: 'tent_b_load_cell_1',
    metric: 'weight',
    unit: 'kg',
    baseValue: 11.9,
    amplitude: 1.6,
    period: 86400,
  },
];

const DECISIONS: Array<{
  deviceId: string | null;
  decision: DecisionType;
  confidence: number;
  reasoning: string;
}> = [
  {
    deviceId: 'exhaust_fan',
    decision: 'turn_on',
    confidence: 0.95,
    reasoning:
      'Tent A canopy temperature exceeded 26°C. Exhaust fan activated.',
  },
  {
    deviceId: 'exhaust_fan',
    decision: 'turn_off',
    confidence: 0.88,
    reasoning:
      'Tent A temperature dropped below 24°C. Exhaust fan deactivated.',
  },
  {
    deviceId: 'humidifier',
    decision: 'turn_on',
    confidence: 0.91,
    reasoning: 'Tent B humidity dropped below 55%. Humidifier activated.',
  },
  {
    deviceId: 'humidifier',
    decision: 'turn_off',
    confidence: 0.85,
    reasoning: 'Tent B humidity stabilized near 65%. Humidifier deactivated.',
  },
  {
    deviceId: 'grow_light_main',
    decision: 'turn_on',
    confidence: 0.97,
    reasoning: 'Scheduled 18/6 light cycle — lights activated at 06:00.',
  },
  {
    deviceId: 'grow_light_main',
    decision: 'turn_off',
    confidence: 0.96,
    reasoning: 'End of light cycle at 00:00. Grow lights deactivated.',
  },
  {
    deviceId: 'water_pump',
    decision: 'turn_on',
    confidence: 0.82,
    reasoning: 'Tent A soil moisture hit 40% — irrigation cycle triggered.',
  },
  {
    deviceId: 'water_pump',
    decision: 'turn_off',
    confidence: 0.79,
    reasoning: 'Tent A irrigation complete. Soil moisture target reached.',
  },
  {
    deviceId: 'tent_b_co2_1',
    decision: 'alert',
    confidence: 0.93,
    reasoning: 'Tent B CO2 levels reached 1200ppm. Check ventilation balance.',
  },
  {
    deviceId: 'dehumidifier_plug',
    decision: 'noop',
    confidence: 0.7,
    reasoning: 'Humidity within acceptable range 55-70%. No action required.',
  },
  {
    deviceId: 'heater_plug',
    decision: 'turn_on',
    confidence: 0.88,
    reasoning:
      'Night temperature dropping below 18°C. Supplemental heating activated.',
  },
  {
    deviceId: 'heater_plug',
    decision: 'turn_off',
    confidence: 0.9,
    reasoning: 'Temperature stabilized above 20°C. Heating deactivated.',
  },
  {
    deviceId: null,
    decision: 'adjust',
    confidence: 0.76,
    reasoning:
      'Drift detected between Tent A temp sensors. Recalibrating tent baseline.',
  },
  {
    deviceId: 'exhaust_fan',
    decision: 'turn_on',
    confidence: 0.94,
    reasoning: 'Tent B CO2 remained above 1050ppm after light cycle start.',
  },
  {
    deviceId: 'humidifier',
    decision: 'turn_on',
    confidence: 0.89,
    reasoning: 'Post-ventilation humidity drop detected in Tent A.',
  },
];

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function demoId(prefix: string, ...parts: Array<string | number>): string {
  return `${prefix}_demo_${parts.join('_').replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function hashPhase(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return (hash % 360) * (Math.PI / 180);
}

export function seedHalDemoData(): void {
  const db = getDb();

  const now = Math.floor(Date.now() / 3600000) * 3600000;
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  const startTime = now - sixtyDaysMs;
  const readIntervalMs = 60 * 60 * 1000; // hourly samples for a dense 60-day demo

  // Register missing devices without replacing existing real state.
  for (const dev of DEVICES) {
    if (!halRegistry.get(dev.id)) {
      halRegistry.register({
        id: dev.id,
        type: dev.type,
        protocol: dev.protocol,
        host: dev.host,
        label: dev.label,
      });
    }
    db.prepare(
      `
      UPDATE hal_devices SET last_seen = COALESCE(last_seen, ?), updated_at = ?
      WHERE id = ?
    `,
    ).run(new Date(now).toISOString(), new Date(now).toISOString(), dev.id);
  }

  // Seed sensor readings for 60 days. IDs are deterministic so restarts backfill
  // missing demo data without duplicating rows.
  const sensorInserts = db.prepare(`
    INSERT OR IGNORE INTO hal_sensors (id, device_id, metric, unit, value, quality, read_at, stored_at)
    VALUES (?, ?, ?, ?, ?, 'good', ?, ?)
  `);

  const sensorInsertMany = db.transaction(
    (
      readings: Array<{
        id: string;
        device_id: string;
        metric: string;
        unit: string;
        value: number;
        read_at: string;
        stored_at: string;
      }>,
    ) => {
      for (const r of readings) {
        sensorInserts.run(
          r.id,
          r.device_id,
          r.metric,
          r.unit,
          r.value,
          r.read_at,
          r.stored_at,
        );
      }
    },
  );

  const readings: Array<{
    id: string;
    device_id: string;
    metric: string;
    unit: string;
    value: number;
    read_at: string;
    stored_at: string;
  }> = [];
  const storedAt = new Date(now).toISOString();

  for (const sensor of SENSORS) {
    const phase = hashPhase(`${sensor.deviceId}:${sensor.metric}`);
    const secondaryPhase = hashPhase(
      `${sensor.metric}:${sensor.deviceId}:secondary`,
    );
    for (let t = startTime; t <= now; t += readIntervalMs) {
      const hourOfDay = ((t % 86400000) / 86400000) * 24;
      const primaryWave =
        Math.sin((hourOfDay / 24) * 2 * Math.PI - Math.PI / 2 + phase) *
        sensor.amplitude;
      const secondaryWave =
        Math.sin((hourOfDay / 24) * 4 * Math.PI + secondaryPhase) *
        (sensor.amplitude * 0.22);
      const weeklyWave =
        Math.sin((t / (7 * 86400000)) * 2 * Math.PI + phase * 0.7) *
        (sensor.amplitude * 0.14);
      const noise = randBetween(
        -sensor.amplitude * 0.11,
        sensor.amplitude * 0.11,
      );
      const value =
        Math.round(
          (sensor.baseValue +
            primaryWave +
            secondaryWave +
            weeklyWave +
            noise) *
            100,
        ) / 100;
      const readAt = new Date(t).toISOString();
      readings.push({
        id: demoId('sns', sensor.deviceId, sensor.metric, t),
        device_id: sensor.deviceId,
        metric: sensor.metric,
        unit: sensor.unit,
        value,
        read_at: readAt,
        stored_at: storedAt,
      });
    }
  }
  sensorInsertMany(readings);

  // Seed relay toggles (~200 events)
  const relayInserts = db.prepare(`
    INSERT OR IGNORE INTO hal_relays (id, device_id, state, reason, triggered_by, switched_at, stored_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const lightSchedule = [
    6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
  ]; // lights on 6am-midnight
  const dayMs = 86400000;
  let relayCount = 0;

  for (let day = 0; day < 60 && relayCount < 200; day++) {
    const dayStart = startTime + day * dayMs;

    // Grow light — scheduled on/off
    for (const hour of lightSchedule) {
      const onTime = dayStart + hour * 3600000;
      if (onTime > now) break;
      relayInserts.run(
        demoId('rly', 'grow_light_main', 'on', onTime),
        'grow_light_main',
        'on',
        'schedule',
        'cron',
        new Date(onTime).toISOString(),
        storedAt,
      );
      relayCount++;
      const offTime = onTime + 5 * 60 * 1000; // off 5 min later for demo toggle events
      if (offTime <= now && relayCount < 200) {
        relayInserts.run(
          demoId('rly', 'grow_light_main', 'off', offTime),
          'grow_light_main',
          'off',
          'schedule',
          'cron',
          new Date(offTime).toISOString(),
          storedAt,
        );
        relayCount++;
      }
    }

    // Random manual overrides
    if (Math.random() < 0.3 && relayCount < 200) {
      const manualTime = dayStart + randBetween(0, dayMs);
      if (manualTime <= now) {
        const reason: RelayReason =
          Math.random() < 0.5 ? 'manual' : 'auto_rule';
        relayInserts.run(
          genId('rly'),
          'exhaust_fan',
          Math.random() < 0.5 ? 'on' : 'off',
          reason,
          'manual',
          new Date(manualTime).toISOString(),
          storedAt,
        );
        relayCount++;
      }
    }
  }

  // Seed decisions
  const decisionInserts = db.prepare(`
    INSERT OR IGNORE INTO hal_decision_log (id, device_id, decision, confidence, reasoning, sensor_snapshot, outcome, decided_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const outcomes: Array<'success' | 'failure' | 'pending'> = [
    'success',
    'success',
    'success',
    'success',
    'success',
    'success',
    'success',
    'success',
    'success',
    'failure',
    'pending',
  ];

  for (let i = 0; i < 150; i++) {
    const dec = DECISIONS[i % DECISIONS.length];
    const decidedAtMs = now - Math.floor((i / 150) * sixtyDaysMs);
    const decidedAt = new Date(decidedAtMs);
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    const completedAt =
      outcome === 'pending'
        ? null
        : new Date(
            decidedAt.getTime() + randBetween(1000, 30000),
          ).toISOString();

    decisionInserts.run(
      demoId('dec', i, decidedAtMs),
      dec.deviceId,
      dec.decision,
      dec.confidence + randBetween(-0.05, 0.05),
      dec.reasoning,
      JSON.stringify({
        temperature: randBetween(20, 28),
        humidity: randBetween(45, 75),
      }),
      outcome,
      decidedAt.toISOString(),
      completedAt,
    );
  }

  console.log(
    `[HAL Seed] Seeded ${DEVICES.length} devices, ~${readings.length} sensor readings, ${relayCount} relay toggles, 150 decisions`,
  );
}
