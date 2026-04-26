// Device types
export type DeviceType = 'smart_plug' | 'sensor' | 'camera' | 'relay';
export type DeviceProtocol = 'tasmota' | 'shelly' | 'kasa' | 'mqtt' | 'gpio' | 'serial';
export type DeviceState = 'on' | 'off' | 'unknown';

// Sensor types
export type MetricType = 'temperature' | 'humidity' | 'soil_moisture' | 'light' | 'co2' | 'water_level' | 'ph' | 'weight';
export type SensorUnit = 'c' | 'f' | '%' | 'lux' | 'ppm' | 'mm' | 'ph' | 'kg' | '';
export type SensorQuality = 'good' | 'stale' | 'error';

// Relay types
export type RelayReason = 'schedule' | 'manual' | 'auto_rule' | 'agent_decision';

// Decision types
export type DecisionType = 'turn_on' | 'turn_off' | 'adjust' | 'alert' | 'noop';
export type DecisionOutcome = 'success' | 'failure' | 'pending';

export interface HalDevice {
  id: string;
  type: DeviceType;
  protocol: DeviceProtocol;
  host: string | null;
  label: string | null;
  last_state: DeviceState;
  last_value: number | null;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface HalSensorReading {
  id: string;
  device_id: string;
  metric: MetricType;
  unit: SensorUnit;
  value: number;
  quality: SensorQuality;
  read_at: string;
  stored_at: string;
}

export interface HalRelayToggle {
  id: string;
  device_id: string;
  state: 'on' | 'off';
  reason: RelayReason;
  triggered_by: string | null;
  switched_at: string;
  stored_at: string;
}

export interface HalDecision {
  id: string;
  device_id: string | null;
  decision: DecisionType;
  confidence: number | null;
  reasoning: string | null;
  sensor_snapshot: string | null;  // JSON string
  outcome: DecisionOutcome | null;
  decided_at: string;
  completed_at: string | null;
}
