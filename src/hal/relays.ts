import { getDb } from './db.js';
import { HalRelayToggle, RelayReason } from './types.js';

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class HalRelayStore {
  private db = getDb();

  log(data: {
    device_id: string;
    state: 'on' | 'off';
    reason: RelayReason;
    triggered_by?: string;
    switched_at?: string;
  }): HalRelayToggle {
    const id = genId('rly');
    const now = new Date().toISOString();
    const switchedAt = data.switched_at ?? now;
    this.db.prepare(`
      INSERT INTO hal_relays (id, device_id, state, reason, triggered_by, switched_at, stored_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.device_id, data.state, data.reason, data.triggered_by ?? null, switchedAt, now);
    return this.get(id)!;
  }

  get(id: string): HalRelayToggle | undefined {
    return this.db.prepare('SELECT * FROM hal_relays WHERE id = ?').get(id) as any;
  }

  // Get latest toggle for a device
  latest(deviceId: string): HalRelayToggle | undefined {
    return this.db.prepare(`
      SELECT * FROM hal_relays WHERE device_id = ? ORDER BY switched_at DESC LIMIT 1
    `).get(deviceId) as any;
  }
}

export const halRelays = new HalRelayStore();
