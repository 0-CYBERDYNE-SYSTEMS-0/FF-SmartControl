import type { MetricType, SensorUnit } from './types.js';

export interface MetricSpec {
  metric: MetricType;
  unit: SensorUnit;
  precision: number;
  normalMin: number;
  normalMax: number;
  hardMin: number;
  hardMax: number;
  noiseStd: number;
}

export const METRIC_SPECS: Record<MetricType, MetricSpec> = {
  temperature: {
    metric: 'temperature',
    unit: 'c',
    precision: 2,
    normalMin: 16,
    normalMax: 35,
    hardMin: -10,
    hardMax: 50,
    noiseStd: 0.3,
  },
  humidity: {
    metric: 'humidity',
    unit: '%',
    precision: 2,
    normalMin: 35,
    normalMax: 90,
    hardMin: 0,
    hardMax: 100,
    noiseStd: 1.6,
  },
  soil_moisture: {
    metric: 'soil_moisture',
    unit: '%',
    precision: 2,
    normalMin: 20,
    normalMax: 85,
    hardMin: 0,
    hardMax: 100,
    noiseStd: 1.8,
  },
  light: {
    metric: 'light',
    unit: 'lux',
    precision: 2,
    normalMin: 0,
    normalMax: 80000,
    hardMin: 0,
    hardMax: 100000,
    noiseStd: 450,
  },
  co2: {
    metric: 'co2',
    unit: 'ppm',
    precision: 2,
    normalMin: 400,
    normalMax: 1600,
    hardMin: 250,
    hardMax: 2500,
    noiseStd: 24,
  },
  water_level: {
    metric: 'water_level',
    unit: '%',
    precision: 2,
    normalMin: 15,
    normalMax: 100,
    hardMin: 0,
    hardMax: 100,
    noiseStd: 1.2,
  },
  ph: {
    metric: 'ph',
    unit: 'ph',
    precision: 2,
    normalMin: 5.5,
    normalMax: 7,
    hardMin: 4,
    hardMax: 9,
    noiseStd: 0.04,
  },
  weight: {
    metric: 'weight',
    unit: 'kg',
    precision: 2,
    normalMin: 0.1,
    normalMax: 30,
    hardMin: 0,
    hardMax: 100,
    noiseStd: 0.05,
  },
};

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function roundTo(value: number, precision: number): number {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

export function normalizeMetricValue(
  metric: MetricType,
  value: number,
): number {
  const spec = METRIC_SPECS[metric];
  return roundTo(clamp(value, spec.hardMin, spec.hardMax), spec.precision);
}

export function getMetricUnit(metric: MetricType): SensorUnit {
  return METRIC_SPECS[metric].unit;
}

export function approach(
  current: number,
  target: number,
  ratePerSecond: number,
  dtSeconds: number,
): number {
  const alpha = 1 - Math.exp(-Math.max(0, ratePerSecond) * dtSeconds);
  return current + (target - current) * alpha;
}

export function isWithinHardRange(metric: MetricType, value: number): boolean {
  const spec = METRIC_SPECS[metric];
  return value >= spec.hardMin && value <= spec.hardMax;
}
