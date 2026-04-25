import { getDb } from './db.js';
import { HalSensorReading, MetricType, SensorUnit, SensorQuality } from './types.js';

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class HalSensorStore {
  private db = getDb();

  // Store a sensor reading
  store(data: {
    device_id: string;
    metric: MetricType;
    unit: SensorUnit;
    value: number;
    quality?: SensorQuality;
    read_at?: string;
  }): HalSensorReading {
    const id = genId('sns');
    const now = new Date().toISOString();
    const readAt = data.read_at ?? now;
    this.db.prepare(`
      INSERT INTO hal_sensors (id, device_id, metric, unit, value, quality, read_at, stored_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.device_id, data.metric, data.unit, data.value, data.quality ?? 'good', readAt, now);
    return this.get(id)!;
  }

  get(id: string): HalSensorReading | undefined {
    return this.db.prepare('SELECT * FROM hal_sensors WHERE id = ?').get(id) as any;
  }

  // Get latest reading for a device+metric
  latest(deviceId: string, metric: MetricType): HalSensorReading | undefined {
    return this.db.prepare(`
      SELECT * FROM hal_sensors
      WHERE device_id = ? AND metric = ?
      ORDER BY read_at DESC LIMIT 1
    `).get(deviceId, metric) as any;
  }

  // Get readings for a device within a time range
  history(deviceId: string, metric: MetricType, from: string, to: string): HalSensorReading[] {
    return this.db.prepare(`
      SELECT * FROM hal_sensors
      WHERE device_id = ? AND metric = ? AND read_at BETWEEN ? AND ?
      ORDER BY read_at ASC
    `).all(deviceId, metric, from, to) as any[];
  }
}

export const halSensors = new HalSensorStore();
