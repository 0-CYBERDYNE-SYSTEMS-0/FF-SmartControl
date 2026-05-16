// Hero Multi-Area Chart — ChartKit wrapper (pure SVG, zero deps)

import { halApi, type HalSensorReading, type HalDecision } from '../api.js';
import { getStore, formatSensorValue } from '../store.js';
import {
  renderDualAxisCard,
  renderSparkline,
  injectChartKitStyles,
  generateDeviceShades,
  type DualAxisLayer,
} from './ChartKit.js';

export interface HeroChartLayer {
  deviceId: string;
  deviceName: string;
  zoneName: string;
  metric: string;
  color: string;
  data: HalSensorReading[];
}

export type { HalDecision as HeroChartDecision };

export const HERO_METRIC_KEYS = [
  'temperature',
  'humidity',
  'co2',
  'light',
  'soil_moisture',
  'water_level',
  'ph',
  'weight',
] as const;

const metricConfig: Record<
  string,
  {
    label: string;
    color: string;
    unit: string;
    minAxis: number;
    maxAxis: number;
  }
> = {
  temperature: {
    label: 'Temperature',
    color: '#F59E0B',
    unit: '°C',
    minAxis: 10,
    maxAxis: 40,
  },
  humidity: {
    label: 'Humidity',
    color: '#38BDF8',
    unit: '%',
    minAxis: 0,
    maxAxis: 100,
  },
  soil_moisture: {
    label: 'Soil Moisture',
    color: '#EF4444',
    unit: '%',
    minAxis: 0,
    maxAxis: 100,
  },
  water_level: {
    label: 'Water Level',
    color: '#2563EB',
    unit: '%',
    minAxis: 0,
    maxAxis: 100,
  },
  ph: { label: 'pH', color: '#A855F7', unit: '', minAxis: 0, maxAxis: 14 },
  co2: {
    label: 'CO₂',
    color: '#22C55E',
    unit: 'ppm',
    minAxis: 0,
    maxAxis: 2000,
  },
  light: {
    label: 'Light',
    color: '#FACC15',
    unit: 'lux',
    minAxis: 0,
    maxAxis: 100000,
  },
  weight: {
    label: 'Weight',
    color: '#94A3B8',
    unit: 'kg',
    minAxis: 0,
    maxAxis: 100,
  },
  vpd: { label: 'VPD', color: '#A855F7', unit: 'kPa', minAxis: 0, maxAxis: 3 },
};

function resolveZoneName(deviceId: string, deviceName: string): string {
  if (deviceId.startsWith('tent_a_')) return 'Tent A';
  if (deviceId.startsWith('tent_b_')) return 'Tent B';
  if (/tent\s*a/i.test(deviceName)) return 'Tent A';
  if (/tent\s*b/i.test(deviceName)) return 'Tent B';
  return 'Unzoned';
}

export async function loadHeroChartData(): Promise<{
  layers: HeroChartLayer[];
  decisions: HalDecision[];
}> {
  const store = (await import('../store.js')).getStore();
  const sensors = store.devices.filter((d) => d.type === 'sensor');
  const to = new Date().toISOString();
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const layers: HeroChartLayer[] = [];

  const [decisions] = await Promise.all([
    halApi.getDecisions(50).catch(() => [] as HalDecision[]),
    ...sensors.flatMap((s) =>
      HERO_METRIC_KEYS.map(async (m) => {
        try {
          const data = await halApi.getSensorHistory(s.id, m, from, to);
          if (data.length > 0) {
            const cfg = metricConfig[m];
            layers.push({
              deviceId: s.id,
              deviceName: s.name,
              zoneName: resolveZoneName(s.id, s.name),
              metric: m,
              color: cfg?.color || '#888',
              data,
            });
          }
        } catch {
          /* skip */
        }
      }),
    ),
  ]);

  return { layers, decisions };
}

export function renderHeroChart(
  layers: HeroChartLayer[],
  containerId: string,
  decisions: HalDecision[] = [],
): void {
  if (layers.length === 0) {
    const container = document.getElementById(containerId);
    if (container)
      container.innerHTML = '<div class="chart-empty">No sensor data</div>';
    return;
  }

  // Group by base color to apply per-device shade variation
  const colorGroups = new Map<string, HeroChartLayer[]>();
  for (const l of layers) {
    const list = colorGroups.get(l.color) || [];
    list.push(l);
    colorGroups.set(l.color, list);
  }

  // Convert HeroChartLayer[] to DualAxisLayer[] for ChartKit with shade variation
  const store = getStore();
  const dualLayers: DualAxisLayer[] = layers.map((l) => {
    const cfg = metricConfig[l.metric] || {
      label: l.metric,
      color: l.color,
      unit: '',
      minAxis: 0,
      maxAxis: 100,
    };
    const group = colorGroups.get(l.color)!;
    let color = l.color;
    if (group.length > 1) {
      const idx = group.indexOf(l);
      const shades = generateDeviceShades(l.color, group.length);
      color = shades[idx];
    }
    let minAxis = cfg.minAxis;
    let maxAxis = cfg.maxAxis;
    let unit = cfg.unit;
    if (l.metric === 'temperature' && store.unitSystem === 'imperial') {
      minAxis = (minAxis * 9) / 5 + 32;
      maxAxis = (maxAxis * 9) / 5 + 32;
      unit = formatSensorValue(0, 'temperature', 'imperial').unit;
    }
    return {
      label: `${l.deviceName} — ${cfg.label}`,
      color,
      minAxis,
      maxAxis,
      unit,
      data: l.data.map((d) => ({
        t: new Date(d.timestamp).getTime(),
        v: formatSensorValue(d.value, l.metric, store.unitSystem).value,
      })),
    };
  });

  // Build title from first layer
  const title = dualLayers.map((l) => l.label).join(' + ');
  const firstDevice = layers[0]?.deviceName || '';

  renderDualAxisCard(dualLayers, containerId, {
    title,
    subtitle: '24h Overview',
    deviceName: firstDevice,
    showStats: true,
    showGrid: true,
    smooth: false,
  });
}

export { renderSparkline };

export function injectHeroChartStyles(): void {
  injectChartKitStyles();
  if (document.getElementById('hal-hero-chart-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-hero-chart-styles';
  style.textContent = `
.hero-chart-wrap {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
}
.hero-chart {
  width: 100%;
  min-height: 260px;
}
.chart-empty {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 12px;
}
`;
  document.head.appendChild(style);
}
