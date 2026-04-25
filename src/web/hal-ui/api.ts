// HAL API client — all calls to /api/hal/*

const BASE = '/api/hal';

async function halGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  let url = BASE + path;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += '?' + qs;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HAL API ${url} failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function halPost<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HAL API ${path} failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// Types
export interface HalDevice {
  id: string;
  name: string;
  type: 'relay' | 'smart_plug' | 'sensor' | 'camera';
  protocol: string;
  host?: string;
  state?: 'on' | 'off' | 'unknown';
  online: boolean;
  lastSeen?: string;
}

export interface HalSensorReading {
  timestamp: string;
  value: number;
  unit?: string;
}

export interface HalDecision {
  id: string;
  timestamp: string;
  trigger: string;
  decision: string;
  confidence: number;
  status?: 'pending' | 'success' | 'failure';
  outcome?: string;
}

export interface HalState {
  devices: HalDevice[];
  sensorSnapshots: Record<string, { temperature?: HalSensorReading; humidity?: HalSensorReading }>;
  recentDecisions: HalDecision[];
}

type RawHalDevice = Partial<HalDevice> & {
  label?: string;
  last_state?: string | null;
  last_seen?: string | null;
};

type RawHalSensorReading = Partial<HalSensorReading> & {
  read_at?: string;
  stored_at?: string;
};

type RawHalDecision = Partial<HalDecision> & {
  device_id?: string;
  reasoning?: string;
  decided_at?: string;
  completed_at?: string;
  outcome?: string;
};

function normalizeDevice(device: RawHalDevice): HalDevice {
  const rawState = device.state ?? device.last_state ?? 'unknown';
  const state = rawState === 'on' || rawState === 'off' ? rawState : 'unknown';
  return {
    id: device.id || 'unknown',
    name: device.name || device.label || device.id || 'Unknown device',
    type: (device.type || 'relay') as HalDevice['type'],
    protocol: device.protocol || 'unknown',
    host: device.host,
    state,
    online: typeof device.online === 'boolean' ? device.online : state !== 'unknown',
    lastSeen: device.lastSeen || device.last_seen || undefined,
  };
}

function normalizeSensorReading(reading?: RawHalSensorReading): HalSensorReading | undefined {
  if (!reading || typeof reading.value !== 'number') return undefined;
  return {
    timestamp: reading.timestamp || reading.read_at || reading.stored_at || new Date().toISOString(),
    value: reading.value,
    unit: reading.unit,
  };
}

function normalizeSensorSnapshots(
  snapshots: HalState['sensorSnapshots'] | Record<string, { temperature?: RawHalSensorReading; humidity?: RawHalSensorReading }> | undefined,
): HalState['sensorSnapshots'] {
  const normalized: HalState['sensorSnapshots'] = {};
  for (const [deviceId, snapshot] of Object.entries(snapshots || {})) {
    normalized[deviceId] = {
      temperature: normalizeSensorReading(snapshot.temperature),
      humidity: normalizeSensorReading(snapshot.humidity),
    };
  }
  return normalized;
}

function normalizeDecision(decision: RawHalDecision): HalDecision {
  const outcome = decision.outcome;
  const status =
    decision.status ||
    (outcome === 'success' || outcome === 'failure' ? outcome : 'pending');
  return {
    id: decision.id || 'unknown',
    timestamp: decision.timestamp || decision.decided_at || decision.completed_at || new Date().toISOString(),
    trigger: decision.trigger || decision.device_id || 'HAL',
    decision: decision.reasoning || decision.decision || 'No decision text',
    confidence: Math.max(0, Math.min(1, Number(decision.confidence ?? 0))),
    status,
    outcome,
  };
}

function normalizeState(state: HalState): HalState {
  return {
    devices: (state.devices || []).map(normalizeDevice),
    sensorSnapshots: normalizeSensorSnapshots(state.sensorSnapshots),
    recentDecisions: (state.recentDecisions || []).map(normalizeDecision),
  };
}

// API surface
export const halApi = {
  // GET /api/hal/state
  async getState(): Promise<HalState> {
    return normalizeState(await halGet<HalState>('/state'));
  },

  // GET /api/hal/devices
  async getDevices(): Promise<HalDevice[]> {
    const devices = await halGet<RawHalDevice[]>('/devices');
    return devices.map(normalizeDevice);
  },

  // POST /api/hal/devices/:id/control
  controlDevice(id: string, action: 'on' | 'off'): Promise<{ ok: boolean }> {
    return halPost<{ ok: boolean }>(`/devices/${id}/control`, { action });
  },

  // GET /api/hal/sensors/latest
  async getSensorsLatest(): Promise<Array<{
    device: HalDevice;
    temperature?: HalSensorReading;
    humidity?: HalSensorReading;
  }>> {
    const readings = await halGet<Array<{
      device: RawHalDevice;
      temperature?: RawHalSensorReading;
      humidity?: RawHalSensorReading;
    }>>('/sensors/latest');
    return readings.map(reading => ({
      device: normalizeDevice(reading.device),
      temperature: normalizeSensorReading(reading.temperature),
      humidity: normalizeSensorReading(reading.humidity),
    }));
  },

  // GET /api/hal/sensors/history
  async getSensorHistory(device: string, metric: string, from?: string, to?: string): Promise<HalSensorReading[]> {
    const readings = await halGet<RawHalSensorReading[]>('/sensors/history', {
      device,
      metric,
      ...(from ? { from } : {}),
      ...(to   ? { to }   : {}),
    });
    return readings
      .map(normalizeSensorReading)
      .filter((reading): reading is HalSensorReading => Boolean(reading));
  },

  // GET /api/hal/decisions
  async getDecisions(limit = 20): Promise<HalDecision[]> {
    const decisions = await halGet<RawHalDecision[]>('/decisions', { limit: String(limit) });
    return decisions.map(normalizeDecision);
  },

  // GET /api/hal/cameras
  async getCameras(): Promise<HalDevice[]> {
    const cameras = await halGet<RawHalDevice[]>('/cameras');
    return cameras.map(normalizeDevice);
  },

  // POST /api/hal/cameras/:id/capture
  captureCamera(id: string): Promise<{ ok: boolean; path: string; size_bytes: number }> {
    return halPost(`/cameras/${id}/capture`);
  },
};
