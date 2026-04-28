-- HAL Devices: the device registry
CREATE TABLE IF NOT EXISTS hal_devices (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,       -- 'smart_plug' | 'sensor' | 'camera' | 'relay'
  protocol    TEXT NOT NULL,       -- 'tasmota' | 'shelly' | 'kasa' | 'mqtt' | 'gpio'
  host        TEXT,                -- IP/hostname or null for gpio
  label       TEXT,                -- farmer-assigned name: "grow light", "tent fan"
  last_state  TEXT DEFAULT 'unknown',  -- 'on' | 'off' | 'unknown'
  last_value  REAL,                -- sensor reading
  last_seen   TEXT,                -- ISO timestamp
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- HAL Sensors: time-series readings from sensor devices
CREATE TABLE IF NOT EXISTS hal_sensors (
  id          TEXT PRIMARY KEY,
  device_id   TEXT NOT NULL REFERENCES hal_devices(id) ON DELETE CASCADE,
  metric      TEXT NOT NULL,       -- 'temperature' | 'humidity' | 'soil_moisture' | 'light' | 'co2' | 'water_level' | 'ph' | 'weight'
  unit        TEXT NOT NULL,       -- 'c' | 'f' | '%' | 'lux' | 'ppm' | 'mm' | 'ph' | 'kg'
  value       REAL NOT NULL,
  quality     TEXT DEFAULT 'good', -- 'good' | 'stale' | 'error'
  read_at     TEXT NOT NULL,       -- ISO timestamp of the actual reading
  stored_at   TEXT NOT NULL        -- ISO timestamp when row was inserted
);

-- HAL Relays: toggle log for relay/switch devices
CREATE TABLE IF NOT EXISTS hal_relays (
  id          TEXT PRIMARY KEY,
  device_id   TEXT NOT NULL REFERENCES hal_devices(id) ON DELETE CASCADE,
  state       TEXT NOT NULL,       -- 'on' | 'off'
  reason      TEXT,                -- 'schedule' | 'manual' | 'auto_rule' | 'agent_decision'
  triggered_by TEXT,               -- agent session id or 'manual'
  switched_at TEXT NOT NULL,
  stored_at   TEXT NOT NULL
);

-- HAL Decision Log: agent reasoning + action audit trail
CREATE TABLE IF NOT EXISTS hal_decision_log (
  id              TEXT PRIMARY KEY,
  device_id       TEXT REFERENCES hal_devices(id) ON DELETE SET NULL,
  decision        TEXT NOT NULL,       -- 'turn_on' | 'turn_off' | 'adjust' | 'alert' | 'noop'
  confidence      REAL,                -- 0.0–1.0
  reasoning       TEXT,                -- free-text why
  sensor_snapshot TEXT,                -- JSON snapshot of relevant sensor values at decision time
  outcome         TEXT,                -- 'success' | 'failure' | 'pending'
  decided_at      TEXT NOT NULL,
  completed_at    TEXT,
  triggered_by    TEXT DEFAULT 'agent', -- 'agent' | 'manual_ui' | 'schedule' (VAL-AUTO-023)
  pending_status  TEXT                  -- 'pending_review' | 'pending_veto' | 'vetoed' | 'approved' | null (VAL-AUTO-022, VAL-AUTO-051)
);

-- HAL Alert Rules: threshold-based alerting
CREATE TABLE IF NOT EXISTS hal_alert_rules (
  id          TEXT PRIMARY KEY,
  device_id   TEXT NOT NULL REFERENCES hal_devices(id) ON DELETE CASCADE,
  metric      TEXT NOT NULL,       -- 'temperature' | 'humidity' | 'co2' | ...
  operator    TEXT NOT NULL,       -- 'gt' | 'lt' | 'eq'
  threshold   REAL NOT NULL,
  cooldown_ms INTEGER NOT NULL DEFAULT 300000,
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);

-- HAL Alerts: fired alert instances
CREATE TABLE IF NOT EXISTS hal_alerts (
  id          TEXT PRIMARY KEY,
  rule_id     TEXT NOT NULL REFERENCES hal_alert_rules(id) ON DELETE CASCADE,
  device_id   TEXT NOT NULL REFERENCES hal_devices(id) ON DELETE CASCADE,
  metric      TEXT NOT NULL,
  value       REAL NOT NULL,
  threshold   REAL NOT NULL,
  operator    TEXT NOT NULL,
  message     TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

-- Safety Rules: per-device safety policies for deterministic enforcement
CREATE TABLE IF NOT EXISTS hal_safety_rules (
  id                TEXT PRIMARY KEY,
  device_id         TEXT NOT NULL REFERENCES hal_devices(id) ON DELETE CASCADE,
  rule_type         TEXT NOT NULL,  -- 'max_on_duration' | 'min_off_duration' | 'max_activations_per_hour' | 'allowed_schedule_windows' | 'dependency'
  rule_config       TEXT NOT NULL,  -- JSON: threshold, condition, sensor_metric, operator, value
  enabled           INTEGER NOT NULL DEFAULT 1,
  priority          INTEGER NOT NULL DEFAULT 0,  -- higher = more restrictive (checked later)
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

-- Safety Audit Log: append-only log of all safety decisions
CREATE TABLE IF NOT EXISTS hal_safety_audit (
  id                  TEXT PRIMARY KEY,
  device_id           TEXT REFERENCES hal_devices(id) ON DELETE SET NULL,
  proposed_action     TEXT NOT NULL,  -- 'turn_on' | 'turn_off' | 'adjust' | 'noop'
  verifier_result     TEXT NOT NULL,  -- 'APPROVED' | 'DENIED' | 'DENIED_WITH_REASON'
  denied_reason       TEXT,
  conflicting_rule_ids TEXT,           -- JSON array of rule IDs that caused denial
  sensor_snapshot     TEXT NOT NULL,  -- JSON snapshot of relevant sensor values at verification time
  decision_id         TEXT,           -- references hal_decision_log.id if applicable
  triggered_by        TEXT NOT NULL,   -- 'agent' | 'manual_ui' | 'schedule'
  executed            INTEGER NOT NULL DEFAULT 0,  -- 1 if hardware action was executed
  executed_state      TEXT,           -- 'on' | 'off' | null - actual state applied
  interrupted         INTEGER NOT NULL DEFAULT 0,   -- 1 if action was interrupted mid-execution
  interrupted_at_step INTEGER,         -- step number where interrupted
  reverted_steps      INTEGER,         -- number of steps reverted after interruption
  created_at          TEXT NOT NULL
);

-- Emergency Stop: persistent E-Stop state
CREATE TABLE IF NOT EXISTS hal_emergency_stop (
  id                TEXT PRIMARY KEY DEFAULT 'global',
  active           INTEGER NOT NULL DEFAULT 0,  -- 1 = E-Stop active, 0 = cleared
  activated_at      TEXT,                        -- ISO timestamp when E-Stop was activated
  activated_by      TEXT,                        -- 'operator' | 'farm_loop_hang' | 'watchdog_failure'
  cleared_at        TEXT,                        -- ISO timestamp when cleared (NULL if active)
  cleared_by        TEXT,                        -- operator ID who cleared (NULL if active)
  reason            TEXT,                        -- optional human-readable reason
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

-- Device Safe States: per-device safe states for E-Stop
CREATE TABLE IF NOT EXISTS hal_device_safe_states (
  device_id         TEXT PRIMARY KEY REFERENCES hal_devices(id) ON DELETE CASCADE,
  safe_state        TEXT NOT NULL,  -- 'on' | 'off' | 'unknown' | 'no_change'
  safe_value        REAL,           -- optional safe value for dimmers/adjustable devices
  updated_at        TEXT NOT NULL
);

-- Farm Loop Hang Detection: track last decision time for hang detection
CREATE TABLE IF NOT EXISTS hal_farm_loop_state (
  id                TEXT PRIMARY KEY DEFAULT 'global',
  last_decision_at  TEXT,                        -- ISO timestamp of last completed decision
  last_heartbeat_at TEXT,                        -- ISO timestamp of last decision cycle start
  hang_warnings     INTEGER NOT NULL DEFAULT 0,  -- count of hang warnings issued
  safety_mode       INTEGER NOT NULL DEFAULT 0,  -- 1 = safety mode active due to hang
  updated_at        TEXT NOT NULL
);

-- Automation Mode: persistent automation mode (VAL-AUTO-001, VAL-AUTO-002, VAL-AUTO-003)
CREATE TABLE IF NOT EXISTS hal_automation_mode (
  id                TEXT PRIMARY KEY DEFAULT 'global',
  mode              TEXT NOT NULL DEFAULT 'AUTONOMOUS',  -- 'OBSERVE_ONLY' | 'SUGGEST' | 'ASSISTED_CONTROL' | 'AUTONOMOUS'
  updated_at        TEXT NOT NULL
);

-- Automation Pending Decisions: tracks ASSISTED_CONTROL veto window and SUGGEST pending decisions (VAL-AUTO-021, VAL-AUTO-022)
CREATE TABLE IF NOT EXISTS hal_automation_pending (
  id                TEXT PRIMARY KEY,
  decision_id       TEXT NOT NULL,               -- references hal_decision_log.id
  mode              TEXT NOT NULL,               -- 'SUGGEST' | 'ASSISTED_CONTROL'
  veto_deadline     TEXT,                        -- ISO timestamp when veto window closes (for ASSISTED_CONTROL)
  vetoed            INTEGER NOT NULL DEFAULT 0,   -- 1 = operator vetoed
  vetoed_by         TEXT,                        -- operator ID if vetoed
  approved          INTEGER NOT NULL DEFAULT 0,  -- 1 = operator approved explicitly
  approved_by       TEXT,                        -- operator ID if approved
  executed          INTEGER NOT NULL DEFAULT 0,   -- 1 = action was executed (auto or approved)
  created_at        TEXT NOT NULL
);
