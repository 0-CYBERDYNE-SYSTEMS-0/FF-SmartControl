// HAL API client — all calls to /api/hal/*

const BASE = '/api/hal';

async function halGet<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  let url = BASE + path;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += '?' + qs;
  }
  const res = await fetch(url);
  if (res.status === 401) {
    redirectToLogin();
  }
  if (!res.ok)
    throw new Error(`HAL API ${url} failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function halPost<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    redirectToLogin();
  }
  if (!res.ok)
    throw new Error(`HAL API ${path} failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function halPut<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    redirectToLogin();
  }
  if (!res.ok)
    throw new Error(`HAL API ${path} failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

const SETTINGS_BASE = '/api/settings';

async function settingsGet<T>(path: string): Promise<T> {
  const res = await fetch(SETTINGS_BASE + path);
  if (res.status === 401) {
    redirectToLogin();
  }
  if (!res.ok)
    throw new Error(
      `Settings API ${path} failed: ${res.status} ${res.statusText}`,
    );
  return res.json() as Promise<T>;
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/login') return;
  window.location.href = '/login';
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
  zone?: string | null; // VAL-DISC-050
  calibration_offset?: number;
  controlled_device_description?: string | null; // VAL-DISC-070: what this relay controls
  safe_state?: 'on' | 'off' | 'unknown' | 'no_change'; // VAL-DISC-071: safe state for E-Stop/shutdown
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
  // Extended fields for decision-display feature
  reasoning?: string;
  deviceId?: string;
  sensorSnapshot?: Record<string, number>;
  triggeredBy?: string;
  pendingStatus?: string;
  model?: string;
  completedAt?: string;
}

export type SensorMetricSnapshot = Partial<
  Record<
    | 'temperature'
    | 'humidity'
    | 'co2'
    | 'light'
    | 'soil_moisture'
    | 'water_level'
    | 'ph'
    | 'weight',
    HalSensorReading
  >
>;

export interface HalState {
  devices: HalDevice[];
  sensorSnapshots: Record<string, SensorMetricSnapshot>;
  recentDecisions: HalDecision[];
}

export interface HalStateStreamEvent {
  emittedAt: string;
  state: HalState;
}

type RawHalDevice = Partial<HalDevice> & {
  label?: string;
  last_state?: string | null;
  last_seen?: string | null;
  zone?: string | null;
  calibration_offset?: number;
  controlled_device_description?: string | null;
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
  sensor_snapshot?: string | Record<string, number>;
  triggered_by?: string;
  pending_status?: string;
  model?: string;
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
    online:
      typeof device.online === 'boolean' ? device.online : state !== 'unknown',
    lastSeen: device.lastSeen || device.last_seen || undefined,
    zone: device.zone ?? undefined,
    calibration_offset: device.calibration_offset,
    controlled_device_description:
      device.controlled_device_description ?? undefined,
  };
}

function normalizeSensorReading(
  reading?: RawHalSensorReading,
): HalSensorReading | undefined {
  if (!reading || typeof reading.value !== 'number') return undefined;
  return {
    timestamp:
      reading.timestamp ||
      reading.read_at ||
      reading.stored_at ||
      new Date().toISOString(),
    value: reading.value,
    unit: reading.unit,
  };
}

function normalizeSensorSnapshots(
  snapshots:
    | HalState['sensorSnapshots']
    | Record<string, Record<string, RawHalSensorReading>>
    | undefined,
): HalState['sensorSnapshots'] {
  const normalized: HalState['sensorSnapshots'] = {};
  for (const [deviceId, snapshot] of Object.entries(snapshots || {})) {
    normalized[deviceId] = {};
    for (const [metric, reading] of Object.entries(snapshot)) {
      if (reading && typeof reading === 'object') {
        const normalizedReading = normalizeSensorReading(
          reading as RawHalSensorReading,
        );
        if (normalizedReading) {
          (normalized[deviceId] as Record<string, HalSensorReading>)[metric] =
            normalizedReading;
        }
      }
    }
  }
  return normalized;
}

function normalizeDecision(decision: RawHalDecision): HalDecision {
  const outcome = decision.outcome;
  const status =
    decision.status ||
    (outcome === 'success' || outcome === 'failure' ? outcome : 'pending');

  // Parse sensor_snapshot if it's a JSON string
  let sensorSnapshot: Record<string, number> | undefined;
  if (decision.sensor_snapshot) {
    if (typeof decision.sensor_snapshot === 'string') {
      try {
        sensorSnapshot = JSON.parse(decision.sensor_snapshot);
      } catch {
        sensorSnapshot = undefined;
      }
    } else if (typeof decision.sensor_snapshot === 'object') {
      sensorSnapshot = decision.sensor_snapshot;
    }
  }

  return {
    id: decision.id || 'unknown',
    timestamp:
      decision.timestamp ||
      decision.decided_at ||
      decision.completed_at ||
      new Date().toISOString(),
    trigger: decision.trigger || decision.device_id || 'HAL',
    decision: decision.decision || 'No decision text',
    confidence: Math.max(0, Math.min(1, Number(decision.confidence ?? 0))),
    status,
    outcome,
    // Extended fields
    reasoning: decision.reasoning ?? undefined,
    deviceId: decision.device_id ?? undefined,
    sensorSnapshot,
    triggeredBy: decision.triggered_by ?? undefined,
    pendingStatus: decision.pending_status ?? undefined,
    model: decision.model ?? undefined,
    completedAt: decision.completed_at ?? undefined,
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

  openStateStream(
    onState: (state: HalState, event: HalStateStreamEvent) => void,
    onError?: (error: Event) => void,
  ): EventSource | null {
    if (typeof EventSource === 'undefined') return null;
    const source = new EventSource(`${BASE}/stream`);
    source.addEventListener('state', (event) => {
      const parsed = JSON.parse((event as MessageEvent<string>).data) as
        | HalStateStreamEvent
        | HalState;
      const state =
        'state' in parsed
          ? normalizeState(parsed.state)
          : normalizeState(parsed as HalState);
      const streamEvent =
        'state' in parsed
          ? { ...parsed, state }
          : { emittedAt: new Date().toISOString(), state };
      onState(state, streamEvent);
    });
    source.onerror = (error) => onError?.(error);
    return source;
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

  // GET /api/hal/sensors/latest — returns all sensor metrics (not just temperature/humidity)
  async getSensorsLatest(): Promise<
    Array<
      {
        device: HalDevice;
      } & SensorMetricSnapshot
    >
  > {
    const readings = await halGet<
      Array<
        {
          device: RawHalDevice;
        } & Partial<Record<string, RawHalSensorReading>>
      >
    >('/sensors/latest');
    return readings.map((reading) => {
      const result: ReturnType<typeof halApi.getSensorsLatest>[number] = {
        device: normalizeDevice(reading.device),
      };
      for (const [metric, r] of Object.entries(reading)) {
        if (metric !== 'device' && r) {
          (result as Record<string, HalSensorReading>)[metric] =
            normalizeSensorReading(r as RawHalSensorReading)!;
        }
      }
      return result;
    });
  },

  // GET /api/hal/sensors/history
  async getSensorHistory(
    device: string,
    metric: string,
    from?: string,
    to?: string,
  ): Promise<HalSensorReading[]> {
    const readings = await halGet<RawHalSensorReading[]>('/sensors/history', {
      device,
      metric,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
    return readings
      .map(normalizeSensorReading)
      .filter((reading): reading is HalSensorReading => Boolean(reading));
  },

  // GET /api/hal/sensors/history-batch — many device/metric series in one call.
  // Returns a map keyed by `${device}|${metric}` so callers can avoid firing one
  // request per series (which trips the 100/min rate limit and 429s the views).
  async getSensorHistoryBatch(
    devices: string[],
    metrics: string[],
    from?: string,
    to?: string,
  ): Promise<Map<string, HalSensorReading[]>> {
    const result = new Map<string, HalSensorReading[]>();
    if (devices.length === 0 || metrics.length === 0) return result;
    const series = await halGet<
      Array<{ device_id: string; metric: string; points: RawHalSensorReading[] }>
    >('/sensors/history-batch', {
      devices: devices.join(','),
      metrics: metrics.join(','),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
    for (const s of series) {
      result.set(
        `${s.device_id}|${s.metric}`,
        s.points
          .map(normalizeSensorReading)
          .filter((r): r is HalSensorReading => Boolean(r)),
      );
    }
    return result;
  },

  // GET /api/hal/decisions
  async getDecisions(limit = 20): Promise<HalDecision[]> {
    const decisions = await halGet<RawHalDecision[]>('/decisions', {
      limit: String(limit),
    });
    return decisions.map(normalizeDecision);
  },

  // GET /api/hal/cameras
  async getCameras(): Promise<HalDevice[]> {
    const cameras = await halGet<RawHalDevice[]>('/cameras');
    return cameras.map(normalizeDevice);
  },

  // POST /api/hal/cameras/:id/capture
  captureCamera(
    id: string,
  ): Promise<{ ok: boolean; path: string; size_bytes: number }> {
    return halPost(`/cameras/${id}/capture`);
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // E-Stop API
  // ══════════════════════════════════════════════════════════════════════════════

  // GET /api/hal/estop/status
  async getEstopStatus(): Promise<{
    estop: {
      active: boolean;
      activatedAt: string | null;
      activatedBy: string | null;
      clearedAt: string | null;
      clearedBy: string | null;
      reason: string | null;
    };
    farmLoop: {
      lastDecisionAt: string | null;
      lastHeartbeatAt: string | null;
      hangWarnings: number;
      safetyMode: boolean;
    };
    watchdog: {
      running: boolean;
      uptimeSeconds: number;
    };
  }> {
    return halGet('/estop/status');
  },

  // POST /api/hal/estop — activate emergency stop
  async activateEstop(
    reason?: string,
    reasonText?: string,
  ): Promise<{
    success: boolean;
    appliedSafeStates: Array<{ deviceId: string; safeState: string }>;
    failures: string[];
  }> {
    return halPost('/estop', { reason: reason || 'operator', reasonText });
  },

  // POST /api/hal/estop/clear — clear emergency stop (requires auth)
  async clearEstop(operatorId: string): Promise<{ ok: boolean }> {
    return halPost('/estop/clear', { operatorId });
  },

  // GET /api/hal/estop/safe-states
  async getEstopSafeStates(): Promise<
    Array<{
      deviceId: string;
      safeState: 'on' | 'off' | 'unknown' | 'no_change';
      safeValue?: number;
    }>
  > {
    return halGet('/estop/safe-states');
  },

  // PUT /api/hal/estop/safe-states/:deviceId
  async setEstopSafeState(
    deviceId: string,
    safeState: 'on' | 'off' | 'unknown' | 'no_change',
    safeValue?: number,
  ): Promise<{ ok: boolean }> {
    return halPut(`/estop/safe-states/${deviceId}`, { safeState, safeValue });
  },

  // GET /api/hal/farm-loop/status
  async getFarmLoopStatus(): Promise<{
    farmLoop: {
      lastDecisionAt: string | null;
      lastHeartbeatAt: string | null;
      hangWarnings: number;
      safetyMode: boolean;
    };
    watchdog: {
      running: boolean;
      uptimeSeconds: number;
    };
  }> {
    return halGet('/farm-loop/status');
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // Safety Rules API
  // ══════════════════════════════════════════════════════════════════════════════

  // GET /api/hal/safety/rules — list all safety rules
  async getSafetyRules(): Promise<
    Array<{
      id: string;
      deviceId: string;
      ruleType: string;
      ruleConfig: Record<string, unknown>;
      enabled: boolean;
      priority: number;
      createdAt: string;
      updatedAt: string;
    }>
  > {
    return halGet('/safety/rules');
  },

  // GET /api/hal/safety/rules/:id — get a specific rule
  async getSafetyRule(id: string): Promise<{
    id: string;
    deviceId: string;
    ruleType: string;
    ruleConfig: Record<string, unknown>;
    enabled: boolean;
    priority: number;
    createdAt: string;
    updatedAt: string;
  }> {
    return halGet(`/safety/rules/${id}`);
  },

  // POST /api/hal/safety/rules — create a new rule
  async createSafetyRule(rule: {
    deviceId: string;
    ruleType: string;
    ruleConfig: Record<string, unknown>;
    enabled?: boolean;
    priority?: number;
  }): Promise<{
    id: string;
    deviceId: string;
    ruleType: string;
    ruleConfig: Record<string, unknown>;
    enabled: boolean;
    priority: number;
    createdAt: string;
    updatedAt: string;
  }> {
    return halPost('/safety/rules', rule);
  },

  // PUT /api/hal/safety/rules/:id — update a rule
  async updateSafetyRule(
    id: string,
    updates: {
      ruleConfig?: Record<string, unknown>;
      enabled?: boolean;
      priority?: number;
    },
  ): Promise<{
    id: string;
    deviceId: string;
    ruleType: string;
    ruleConfig: Record<string, unknown>;
    enabled: boolean;
    priority: number;
    createdAt: string;
    updatedAt: string;
  }> {
    return halPut(`/safety/rules/${id}`, updates);
  },

  // DELETE /api/hal/safety/rules/:id — delete a rule
  async deleteSafetyRule(id: string): Promise<{ ok: boolean }> {
    const res = await fetch(BASE + `/safety/rules/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete rule: ${res.status}`);
    return { ok: true };
  },

  // GET /api/hal/safety/audit — get recent audit log entries
  async getSafetyAudit(params?: {
    limit?: number;
    deviceId?: string;
    triggeredBy?: string;
    result?: string;
  }): Promise<
    Array<{
      id: string;
      deviceId: string | null;
      proposedAction: string;
      verifierResult: string;
      deniedReason: string | null;
      conflictingRuleIds: string[];
      sensorSnapshot: Record<string, unknown>;
      decisionId: string | null;
      triggeredBy: string;
      executed: boolean;
      executedState: string | null;
      interrupted: boolean;
      interruptedAtStep: number | null;
      revertedSteps: number | null;
      createdAt: string;
    }>
  > {
    return halGet('/safety/audit', params as Record<string, string>);
  },

  // GET /api/hal/safety/state — get current safety state
  async getSafetyState(): Promise<{
    safetyState: 'NORMAL' | 'WARNING' | 'EMERGENCY_STOP_ACTIVE';
    activeRulesCount: number;
    warningDevicesCount: number;
    deniedLast24h: number;
    estopActive: boolean;
    farmLoopSafetyMode: boolean;
    lastDecisionAt: string | null;
    lastHeartbeatAt: string | null;
  }> {
    return halGet('/safety/state');
  },

  // GET /api/hal/safety/summary — get safety dashboard summary
  async getSafetySummary(): Promise<{
    activeRulesCount: number;
    deniedLast24h: number;
    recentDenied: Array<{
      id: string;
      deviceId: string | null;
      deviceName: string | null;
      proposedAction: string;
      deniedReason: string | null;
      triggeredBy: string;
      createdAt: string;
    }>;
    estopActive: boolean;
    estopActivatedAt: string | null;
    estopReason: string | null;
    farmLoopSafetyMode: boolean;
    lastDecisionAt: string | null;
    rulesPerDevice: Array<{ deviceId: string; ruleCount: number }>;
  }> {
    return halGet('/safety/summary');
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // Threshold API (VAL-AUTO-010, VAL-AUTO-011, VAL-AUTO-012)
  // ══════════════════════════════════════════════════════════════════════════════

  // GET /api/hal/thresholds — list all thresholds
  async getThresholds(params?: {
    deviceId?: string;
    zone?: string;
    metric?: string;
  }): Promise<
    Array<{
      id: string;
      deviceId: string | null;
      zone: string | null;
      metric: string;
      minValue: number | null;
      maxValue: number | null;
      enabled: boolean;
      createdAt: string;
      updatedAt: string;
    }>
  > {
    return halGet('/thresholds', params as Record<string, string>);
  },

  // GET /api/hal/thresholds/:id — get a specific threshold
  async getThreshold(id: string): Promise<{
    id: string;
    deviceId: string | null;
    zone: string | null;
    metric: string;
    minValue: number | null;
    maxValue: number | null;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  }> {
    return halGet(`/thresholds/${id}`);
  },

  // POST /api/hal/thresholds — create a new threshold
  async createThreshold(data: {
    deviceId?: string;
    zone?: string;
    metric: string;
    minValue?: number;
    maxValue?: number;
    enabled?: boolean;
  }): Promise<{
    id: string;
    deviceId: string | null;
    zone: string | null;
    metric: string;
    minValue: number | null;
    maxValue: number | null;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  }> {
    return halPost('/thresholds', data);
  },

  // PUT /api/hal/thresholds/:id — update a threshold
  async updateThreshold(
    id: string,
    updates: {
      deviceId?: string;
      zone?: string;
      metric?: string;
      minValue?: number;
      maxValue?: number;
      enabled?: boolean;
    },
  ): Promise<{
    id: string;
    deviceId: string | null;
    zone: string | null;
    metric: string;
    minValue: number | null;
    maxValue: number | null;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  }> {
    return halPut(`/thresholds/${id}`, updates);
  },

  // DELETE /api/hal/thresholds/:id — delete a threshold
  async deleteThreshold(id: string): Promise<{ ok: boolean }> {
    const res = await fetch(BASE + `/thresholds/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete threshold: ${res.status}`);
    return { ok: true };
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // Discovery API (VAL-DISC-001 to VAL-DISC-052)
  // ══════════════════════════════════════════════════════════════════════════════

  // GET /api/hal/discovery/gpio/status — check pigpiod availability (VAL-DISC-010)
  async getGpioStatus(): Promise<{ available: boolean; error: string }> {
    return halGet('/discovery/gpio/status');
  },

  // GET /api/hal/discovery/gpio/pins — get BCM pin status (VAL-DISC-011)
  async getGpioPins(): Promise<{
    pins: Array<{
      bcm: number;
      state: string;
      physicalPin: number | null;
      altFunctions: string[];
      description: string;
      registeredTo: string | null;
    }>;
  }> {
    return halGet('/discovery/gpio/pins');
  },

  // POST /api/hal/discovery/gpio/register — register a GPIO device (VAL-DISC-012)
  async registerGpioDevice(data: {
    bcmPin: number;
    label?: string;
    zone?: string;
  }): Promise<HalDevice> {
    return halPost('/discovery/gpio/register', data);
  },

  // GET /api/hal/discovery/mqtt/devices — MQTT auto-discovery (VAL-DISC-020, VAL-DISC-021)
  async getMqttDevices(): Promise<{
    devices: Array<{
      host: string;
      protocol: string;
      type: string;
      label: string;
      online: boolean;
      discoveryType?: string;
      manufacturer?: string;
      model?: string;
      sensorType?: string;
    }>;
    note: string;
    topics: string[];
    error?: string;
  }> {
    return halGet('/discovery/mqtt/devices');
  },

  // POST /api/hal/discovery/mqtt/register — register MQTT device (VAL-DISC-022)
  async registerMqttDevice(data: {
    topic: string;
    label?: string;
    type?: string;
    zone?: string;
  }): Promise<HalDevice> {
    return halPost('/discovery/mqtt/register', data);
  },

  // GET /api/hal/discovery/http/scan — scan subnet for HTTP devices (VAL-DISC-003, VAL-DISC-005)
  async scanHttpDevices(params: {
    subnet?: string;
    protocol?: string;
  }): Promise<{
    devices: Array<{
      host: string;
      protocol: string;
      type: string;
      label: string;
      online: boolean;
    }>;
    scanned: number;
    timeout: number;
  }> {
    return halGet('/discovery/http/scan', params);
  },

  // POST /api/hal/discovery/http/register — register HTTP device (VAL-DISC-007)
  async registerHttpDevice(data: {
    host: string;
    protocol: string;
    type?: string;
    label?: string;
    zone?: string;
  }): Promise<HalDevice> {
    return halPost('/discovery/http/register', data);
  },

  // GET /api/hal/discovery/serial/ports — enumerate serial ports (VAL-DISC-030)
  async getSerialPorts(): Promise<{
    ports: Array<{ path: string; description: string }>;
  }> {
    return halGet('/discovery/serial/ports');
  },

  // POST /api/hal/discovery/serial/probe — probe a serial port (VAL-DISC-031, VAL-DISC-032)
  async probeSerialPort(port: string): Promise<{
    port: string;
    detected: boolean;
    type: string;
    protocol: string;
    label: string;
    channels?: string[];
    note?: string;
  }> {
    return halPost('/discovery/serial/probe', { port });
  },

  // POST /api/hal/discovery/serial/register — register serial device (VAL-DISC-032)
  async registerSerialDevice(data: {
    port: string;
    type?: string;
    label?: string;
    zone?: string;
  }): Promise<HalDevice> {
    return halPost('/discovery/serial/register', data);
  },

  // POST /api/hal/discovery/manual — manually add device (VAL-DISC-040)
  async manualAddDevice(data: {
    host: string;
    port?: string;
    protocol: string;
    type?: string;
    label?: string;
    zone?: string;
  }): Promise<HalDevice> {
    return halPost('/discovery/manual', data);
  },

  // PUT /api/hal/devices/:id — update device label, zone, and/or description (VAL-DISC-050, VAL-DISC-052, VAL-DISC-070)
  async updateDevice(
    id: string,
    data: {
      label?: string;
      zone?: string;
      controlled_device_description?: string;
    },
  ): Promise<HalDevice> {
    return halPut(`/devices/${id}`, data);
  },

  // PUT /api/hal/devices/:id/calibration — update calibration offset (VAL-DISC-060, VAL-DISC-061)
  async updateDeviceCalibration(
    id: string,
    offset: number,
  ): Promise<HalDevice> {
    return halPut(`/devices/${id}/calibration`, { offset });
  },

  // DELETE /api/hal/devices/:id — remove device
  async removeDevice(id: string): Promise<{ ok: boolean }> {
    const res = await fetch(BASE + `/devices/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to remove device: ${res.status}`);
    return { ok: true };
  },

  // GET /api/hal/zones — list all zones (VAL-DISC-050, VAL-DISC-051)
  async getZones(): Promise<
    Array<{ id: string; name: string; deviceCount: number }>
  > {
    return halGet('/zones');
  },

  // PUT /api/hal/zones/:id — rename a zone
  async renameZone(
    oldName: string,
    newName: string,
  ): Promise<{ ok: boolean; updated: number }> {
    const encodedId = oldName ? encodeURIComponent(oldName) : '_none';
    return halPut(`/zones/${encodedId}`, { name: newName });
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // Automation Mode API (VAL-AUTO-001 to VAL-AUTO-003)
  // ══════════════════════════════════════════════════════════════════════════════

  // GET /api/hal/automation/mode — get current automation mode
  async getAutomationMode(): Promise<{
    mode: string;
    color: { bg: string; text: string; label: string };
  }> {
    return halGet('/automation/mode');
  },

  // PUT /api/hal/automation/mode — set automation mode
  async setAutomationMode(
    mode: string,
    operatorId?: string,
  ): Promise<{ mode: string; ok: boolean }> {
    return halPut('/automation/mode', { mode, operatorId });
  },

  // GET /api/hal/automation/pending — get all pending decisions
  async getAutomationPending(): Promise<
    Array<{
      id: string;
      decision_id: string;
      mode: string;
      veto_deadline: string | null;
      vetoed: boolean;
      approved: boolean;
      executed: boolean;
      created_at: string;
      remainingSeconds: number | null;
      decision: {
        id: string;
        device_id: string | null;
        decision: string;
        confidence: number | null;
        reasoning: string | null;
        sensor_snapshot: string | null;
        outcome: string | null;
        decided_at: string;
        completed_at: string | null;
        triggered_by: string | null;
        pending_status: string | null;
      } | null;
    }>
  > {
    return halGet('/automation/pending');
  },

  // POST /api/hal/automation/veto — veto a pending decision
  async vetoDecision(
    decisionId: string,
    operatorId?: string,
  ): Promise<{ ok: boolean; vetoed: boolean }> {
    return halPost('/automation/veto', { decisionId, operatorId });
  },

  // POST /api/hal/automation/approve — approve a pending decision
  async approveDecision(
    decisionId: string,
    operatorId?: string,
  ): Promise<{ ok: boolean; approved: boolean }> {
    return halPost('/automation/approve', { decisionId, operatorId });
  },

  // POST /api/hal/automation/trigger — manually trigger a decision cycle
  async triggerDecisionCycle(): Promise<{
    ok: boolean;
    decisionId: string;
    reasoning: string;
  }> {
    return halPost('/automation/trigger');
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // LLM Settings API
  // ══════════════════════════════════════════════════════════════════════════════

  // GET /api/settings/llm — get saved LLM provider settings
  async getLlmSettings(): Promise<{
    llmProvider: string;
    llmEndpoint: string;
    llmApiKey: string;
    llmModel: string;
  }> {
    return settingsGet('/llm');
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // Backup API (VAL-SVC-033)
  // ══════════════════════════════════════════════════════════════════════════════

  // POST /api/hal/backup — trigger a manual backup
  async triggerBackup(): Promise<{
    ok: boolean;
    archive: string;
    path: string;
    files: string[];
    timestamp: string;
  }> {
    return halPost('/backup');
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // License API (VAL-LIC-001 through VAL-LIC-016)
  // ══════════════════════════════════════════════════════════════════════════════

  // GET /api/license/status — get current license status
  async getLicenseStatus(): Promise<{
    status: string;
    expiresAt: string | null;
    hardwareId: string;
    activatedAt: string | null;
    trialStartedAt: string | null;
    daysRemaining?: number;
    lastCheckedAt: string | null;
    isOffline: boolean;
    offlineExpiresAt?: string;
  }> {
    const res = await fetch('/api/license/status');
    if (!res.ok) throw new Error(`License status failed: ${res.status}`);
    return res.json();
  },

  // GET /api/license/hardware-id — get hardware ID for this device
  async getHardwareId(): Promise<{
    hardwareId: string;
    hardwareIdDisplay: string;
  }> {
    const res = await fetch('/api/license/hardware-id');
    if (!res.ok) throw new Error(`Hardware ID failed: ${res.status}`);
    return res.json();
  },

  // POST /api/license/activate — activate a license key
  async activateLicense(licenseKey: string): Promise<{
    status: string;
    expiresAt: string | null;
    error?: string;
    errorCode?: string;
  }> {
    const res = await fetch('/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `License activation failed: ${res.status}`);
    }
    return data;
  },

  // POST /api/license/deactivate — deactivate license
  async deactivateLicense(): Promise<{ ok: boolean }> {
    const res = await fetch('/api/license/deactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`License deactivation failed: ${res.status}`);
    return res.json();
  },

  // GET /api/license/feature-gates — get feature gates based on license
  async getFeatureGates(): Promise<{
    localControl: boolean;
    cloudFeatures: boolean;
    aiFeatures: boolean;
    remoteAccess: boolean;
    allFeatures: boolean;
  }> {
    const res = await fetch('/api/license/feature-gates');
    if (!res.ok) throw new Error(`Feature gates failed: ${res.status}`);
    return res.json();
  },
};
