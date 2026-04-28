import { getDb } from './db.js';
import { HalDevice, DeviceType, DeviceProtocol, DeviceState } from './types.js';
import { createHttpClient } from './http-devices.js';
import { gpio } from './gpio.js';

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class HalRegistry {
  private db = getDb();

  // Register a new device
  register(data: {
    id?: string;
    type: DeviceType;
    protocol: DeviceProtocol;
    host?: string | null;
    label?: string | null;
    zone?: string | null;
  }): HalDevice {
    const id = data.id ?? genId(data.type);
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO hal_devices (id, type, protocol, host, label, zone, last_state, last_seen, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'unknown', NULL, ?, ?)
    `);
    stmt.run(
      id,
      data.type,
      data.protocol,
      data.host ?? null,
      data.label ?? null,
      data.zone ?? null,
      now,
      now,
    );
    return this.get(id)!;
  }

  // Update device label and/or zone (VAL-DISC-050, VAL-DISC-052)
  updateDevice(
    id: string,
    data: {
      label?: string | null;
      zone?: string | null;
      calibration_offset?: number | null;
    },
  ): HalDevice {
    const existing = this.get(id);
    if (!existing) throw new Error(`Device ${id} not found`);
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
      UPDATE hal_devices
      SET label = ?, zone = ?, calibration_offset = ?, updated_at = ?
      WHERE id = ?
    `,
      )
      .run(
        data.label !== undefined ? data.label : existing.label,
        data.zone !== undefined ? data.zone : existing.zone,
        data.calibration_offset !== undefined
          ? data.calibration_offset
          : existing.calibration_offset,
        now,
        id,
      );
    return this.get(id)!;
  }

  // Update device calibration offset (VAL-DISC-060, VAL-DISC-061)
  updateDeviceCalibration(id: string, offset: number): HalDevice {
    const existing = this.get(id);
    if (!existing) throw new Error(`Device ${id} not found`);
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
      UPDATE hal_devices
      SET calibration_offset = ?, updated_at = ?
      WHERE id = ?
    `,
      )
      .run(offset, now, id);
    return this.get(id)!;
  }

  // Get device by id
  get(id: string): HalDevice | undefined {
    const row = this.db
      .prepare('SELECT * FROM hal_devices WHERE id = ?')
      .get(id) as any;
    return row;
  }

  // List all devices
  list(): HalDevice[] {
    return this.db
      .prepare('SELECT * FROM hal_devices ORDER BY created_at DESC')
      .all() as any[];
  }

  // Update device state
  updateState(id: string, state: DeviceState, value?: number): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
      UPDATE hal_devices SET last_state = ?, last_value = ?, last_seen = ?, updated_at = ?
      WHERE id = ?
    `,
      )
      .run(state, value ?? null, now, now, id);
  }

  // Remove device
  remove(id: string): void {
    this.db.prepare('DELETE FROM hal_devices WHERE id = ?').run(id);
  }

  // Poll all registered HTTP devices and update their state in DB
  async poll(): Promise<void> {
    const devices = this.list();
    for (const dev of devices) {
      if (!dev.host || dev.protocol === 'gpio') continue;
      try {
        const client = await createHttpClient(dev.host, dev.protocol as any);
        const result = await client.getPower();
        this.updateState(dev.id, result.state, result.watts);
      } catch {
        this.updateState(dev.id, 'unknown');
      }
    }
  }

  // Control a device (on/off)
  async control(id: string, action: 'on' | 'off'): Promise<void> {
    const dev = this.get(id);
    if (!dev) throw new Error(`Device ${id} not found`);

    if (dev.protocol === 'gpio') {
      // Map device id to GPIO pin number (stored in device metadata or use default)
      const pin = parseInt(dev.host || '0');
      gpio.digitalWrite(pin, action === 'on');
      this.updateState(id, action);
      return;
    }

    if (!dev.host) throw new Error(`No host for device ${id}`);
    const client = await createHttpClient(dev.host, dev.protocol as any);
    await client.setPower(action === 'on');
    this.updateState(id, action);
  }
}

export const halRegistry = new HalRegistry();
