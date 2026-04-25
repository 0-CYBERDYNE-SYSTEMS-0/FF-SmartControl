import { getDb } from './db.js';
import { HalDevice, DeviceType, DeviceProtocol, DeviceState } from './types.js';

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
  }): HalDevice {
    const id = data.id ?? genId(data.type);
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO hal_devices (id, type, protocol, host, label, last_state, last_seen, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'unknown', NULL, ?, ?)
    `);
    stmt.run(id, data.type, data.protocol, data.host ?? null, data.label ?? null, now, now);
    return this.get(id)!;
  }

  // Get device by id
  get(id: string): HalDevice | undefined {
    const row = this.db.prepare('SELECT * FROM hal_devices WHERE id = ?').get(id) as any;
    return row;
  }

  // List all devices
  list(): HalDevice[] {
    return this.db.prepare('SELECT * FROM hal_devices ORDER BY created_at DESC').all() as any[];
  }

  // Update device state
  updateState(id: string, state: DeviceState, value?: number): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE hal_devices SET last_state = ?, last_value = ?, last_seen = ?, updated_at = ?
      WHERE id = ?
    `).run(state, value ?? null, now, now, id);
  }

  // Remove device
  remove(id: string): void {
    this.db.prepare('DELETE FROM hal_devices WHERE id = ?').run(id);
  }
}

export const halRegistry = new HalRegistry();
