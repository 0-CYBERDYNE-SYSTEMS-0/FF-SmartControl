/**
 * Deterministic rule-based decision engine
 *
 * Provides a failover path when the LLM is unavailable — evaluates
 * sensor thresholds against device state and produces decisions
 * without any LLM dependency.
 *
 * Rules are simple threshold comparisons:
 * - Temperature > 28°C → turn_on exhaust (cooling)
 * - Temperature < 23°C → turn_off exhaust
 * - Humidity < 50%   → turn_on humidifier
 * - Humidity > 70%    → turn_off humidifier
 * - Soil moisture < 45% → turn_on water_pump
 * - Soil moisture > 65% → turn_off water_pump
 * - CO₂ > 1200ppm     → alert (rate-limited)
 *
 * All decisions still flow through the safety verifier before
 * hardware execution — deterministic rules do NOT bypass safety.
 */

import { halRegistry } from '../hal/registry.js';
import { halSensors } from '../hal/sensors.js';
import type { HalDevice, HalSensorReading, MetricType } from '../hal/types.js';

export interface DeterministicDecision {
  deviceId: string;
  decision: 'turn_on' | 'turn_off' | 'alert';
  reasoning: string;
  confidence: number;
}

export interface DeterministicRulesConfig {
  /** Consecutive LLM failures before deterministic failover activates */
  failoverThreshold: number;
  /** Minimum interval between deterministic alert decisions (ticks) */
  alertCooldownTicks: number;
}

export const DEFAULT_DETERMINISTIC_CONFIG: DeterministicRulesConfig = {
  failoverThreshold: 3,
  alertCooldownTicks: 12,
};

/**
 * Rule-based decision thresholds.
 * Stored separately from the evaluation logic so the simulator
 * and decision loop share identical thresholds.
 */
export const THRESHOLDS = {
  temperature: {
    turnOn: 28, // °C — above this, turn ON exhaust
    turnOff: 23, // °C — below this, turn OFF exhaust
  },
  humidity: {
    turnOn: 50, // % — below this, turn ON humidifier
    turnOff: 70, // % — above this, turn OFF humidifier
  },
  soilMoisture: {
    turnOn: 45, // % — below this, turn ON water pump
    turnOff: 65, // % — above this, turn OFF water pump
  },
  co2: {
    alert: 1200, // ppm — above this, generate alert
  },
};

/**
 * Device ID conventions matched by the simulator's default device set.
 * Real hardware may use different IDs — matching is done by
 * scanning device labels and IDs for known keywords.
 */
const DEVICE_PATTERNS: Record<
  string,
  { keywords: string[]; type: string }
> = {
  exhaust: { keywords: ['exhaust', 'fan'], type: 'exhaust_fan' },
  humidifier: {
    keywords: ['humidifier', 'mist', 'fogger', 'mister'],
    type: 'humidifier',
  },
  waterPump: { keywords: ['water', 'pump', 'irrigation'], type: 'water_pump' },
};

function matchesDevice(device: HalDevice, keywords: string[]): boolean {
  const haystack = `${device.id} ${device.label || ''}`.toLowerCase();
  return keywords.some((kw) => haystack.includes(kw));
}

function findDevice(devices: HalDevice[], patternKey: string): HalDevice | null {
  const pattern = DEVICE_PATTERNS[patternKey];
  return devices.find((d) => matchesDevice(d, pattern.keywords)) || null;
}

function getSensorSnapshot(
  devices: HalDevice[],
): Map<string, Record<string, number>> {
  const snapshot = new Map<string, Record<string, number>>();
  for (const dev of devices.filter((d) => d.type === 'sensor')) {
    const metrics: Record<string, number> = {};
    for (const metric of [
      'temperature',
      'humidity',
      'co2',
      'soil_moisture',
    ] as MetricType[]) {
      const reading = halSensors.latest(dev.id, metric);
      if (reading && typeof reading.value === 'number') {
        metrics[metric] = reading.value;
      }
    }
    if (Object.keys(metrics).length > 0) {
      snapshot.set(dev.id, metrics);
    }
  }
  return snapshot;
}

/**
 * Aggregate sensor readings across all sensor devices.
 * Returns the max, min, or average depending on the metric.
 */
function aggregateReadings(
  snapshot: Map<string, Record<string, number>>,
  metric: string,
  strategy: 'max' | 'min' | 'avg' = 'avg',
): number | null {
  const values: number[] = [];
  for (const [, metrics] of snapshot) {
    if (typeof metrics[metric] === 'number') {
      values.push(metrics[metric]);
    }
  }
  if (values.length === 0) return null;
  if (strategy === 'max') return Math.max(...values);
  if (strategy === 'min') return Math.min(...values);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ── Alert cooldown tracking (in-memory) ──

let lastAlertTick = 0;
let alertSentThisCycle = false;

export function resetDeterministicAlertState_forTest(): void {
  lastAlertTick = 0;
  alertSentThisCycle = false;
}

/**
 * Run deterministic rule-based decision evaluation.
 *
 * Returns a list of proposed actions based on current sensor
 * readings and device states. These decisions still need to pass
 * through the safety verifier before hardware execution.
 *
 * @param tickCount  Monotonically increasing tick counter for cooldowns
 * @param config     Optional configuration overrides
 */
export function evaluateDeterministicDecisions(
  tickCount: number,
  config: DeterministicRulesConfig = DEFAULT_DETERMINISTIC_CONFIG,
): DeterministicDecision[] {
  const decisions: DeterministicDecision[] = [];
  alertSentThisCycle = false;

  const devices = halRegistry.list();
  const snapshot = getSensorSnapshot(devices);

  // Aggregate readings across all sensors
  const temp = aggregateReadings(snapshot, 'temperature', 'max');
  const humidity = aggregateReadings(snapshot, 'humidity', 'avg');
  const soil = aggregateReadings(snapshot, 'soil_moisture', 'avg');
  const co2 = aggregateReadings(snapshot, 'co2', 'max');

  const exhaust = findDevice(devices, 'exhaust');
  const humidifier = findDevice(devices, 'humidifier');
  const waterPump = findDevice(devices, 'waterPump');

  // ── Temperature → exhaust fan ──
  if (temp !== null && exhaust) {
    if (temp > THRESHOLDS.temperature.turnOn && exhaust.last_state === 'off') {
      decisions.push({
        deviceId: exhaust.id,
        decision: 'turn_on',
        reasoning: `Temperature ${temp.toFixed(1)}°C exceeded ${THRESHOLDS.temperature.turnOn}°C threshold`,
        confidence: 0.92,
      });
    } else if (
      temp < THRESHOLDS.temperature.turnOff &&
      exhaust.last_state === 'on'
    ) {
      decisions.push({
        deviceId: exhaust.id,
        decision: 'turn_off',
        reasoning: `Temperature ${temp.toFixed(1)}°C below ${THRESHOLDS.temperature.turnOff}°C`,
        confidence: 0.88,
      });
    }
  }

  // ── Humidity → humidifier ──
  if (humidity !== null && humidifier) {
    if (
      humidity < THRESHOLDS.humidity.turnOn &&
      humidifier.last_state === 'off'
    ) {
      decisions.push({
        deviceId: humidifier.id,
        decision: 'turn_on',
        reasoning: `Humidity ${humidity.toFixed(1)}% below ${THRESHOLDS.humidity.turnOn}%`,
        confidence: 0.9,
      });
    } else if (
      humidity > THRESHOLDS.humidity.turnOff &&
      humidifier.last_state === 'on'
    ) {
      decisions.push({
        deviceId: humidifier.id,
        decision: 'turn_off',
        reasoning: `Humidity ${humidity.toFixed(1)}% above ${THRESHOLDS.humidity.turnOff}%`,
        confidence: 0.85,
      });
    }
  }

  // ── Soil moisture → water pump ──
  if (soil !== null && waterPump) {
    if (
      soil < THRESHOLDS.soilMoisture.turnOn &&
      waterPump.last_state === 'off'
    ) {
      decisions.push({
        deviceId: waterPump.id,
        decision: 'turn_on',
        reasoning: `Soil moisture ${soil.toFixed(1)}% below ${THRESHOLDS.soilMoisture.turnOn}%`,
        confidence: 0.85,
      });
    } else if (
      soil > THRESHOLDS.soilMoisture.turnOff &&
      waterPump.last_state === 'on'
    ) {
      decisions.push({
        deviceId: waterPump.id,
        decision: 'turn_off',
        reasoning: `Soil moisture ${soil.toFixed(1)}% above ${THRESHOLDS.soilMoisture.turnOff}%`,
        confidence: 0.82,
      });
    }
  }

  // ── CO₂ → alert (rate-limited) ──
  if (co2 !== null && co2 > THRESHOLDS.co2.alert) {
    const cooldownPassed =
      tickCount - lastAlertTick >= config.alertCooldownTicks;
    if (cooldownPassed && !alertSentThisCycle) {
      decisions.push({
        deviceId: 'system',
        decision: 'alert',
        reasoning: `CO₂ ${co2.toFixed(0)}ppm above optimal range (>${THRESHOLDS.co2.alert}ppm)`,
        confidence: 0.93,
      });
      lastAlertTick = tickCount;
      alertSentThisCycle = true;
    }
  }

  return decisions;
}

/**
 * Convert deterministic decisions into the format expected by
 * the decision loop and verifier pipeline.
 */
export function deterministicDecisionsToLoopFormat(
  decisions: DeterministicDecision[],
): {
  decision: 'turn_on' | 'turn_off' | 'alert' | 'noop';
  reasoning: string;
  deviceId: string | null;
  toolCalls: Array<{ tool: string; args: Record<string, unknown> }>;
  confidence: number;
} {
  if (decisions.length === 0) {
    return {
      decision: 'noop',
      reasoning: 'Deterministic rules: no thresholds exceeded. All systems nominal.',
      deviceId: null,
      toolCalls: [],
      confidence: 0.95,
    };
  }

  // Take the first actionable decision (prioritized by order in evaluateDeterministicDecisions)
  const first = decisions[0];

  return {
    decision: first.decision,
    reasoning: `[DETERMINISTIC] ${first.reasoning}`,
    deviceId: first.deviceId === 'system' ? null : first.deviceId,
    toolCalls: [],
    confidence: first.confidence,
  };
}
