// Hero Multi-Area Chart — Vega-Lite wrapper for declarative visualizations

import { halApi, type HalSensorReading, type HalDecision } from '../api.js';
import { renderVegaHeroChart, renderVegaSparkline } from './VegaChart.js';

export interface HeroChartLayer {
  deviceId: string;
  deviceName: string;
  metric: string;
  color: string;
  data: HalSensorReading[];
}

export type { HalDecision as HeroChartDecision };

const metricConfig: Record<string, { label: string; color: string }> = {
  temperature:  { label: 'Temperature',  color: '#F59E0B' },
  humidity:     { label: 'Humidity',     color: '#38BDF8' },
  soil_moisture:{ label: 'Soil Moisture',color: '#EF4444' },
  water_level:  { label: 'Water Level',  color: '#2563EB' },
  ph:           { label: 'pH',           color: '#A855F7' },
  co2:          { label: 'CO₂',          color: '#22C55E' },
  light:        { label: 'Light',        color: '#FACC15' },
  weight:       { label: 'Weight',       color: '#94A3B8' },
  vpd:          { label: 'VPD',          color: '#A855F7' },
};

export async function loadHeroChartData(): Promise<{ layers: HeroChartLayer[]; decisions: HalDecision[] }> {
  const store = (await import('../store.js')).getStore();
  const sensors = store.devices.filter(d => d.type === 'sensor');
  const to = new Date().toISOString();
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const layers: HeroChartLayer[] = [];
  const metricKeys = ['temperature', 'humidity', 'co2'];

  const [decisions] = await Promise.all([
    halApi.getDecisions(50).catch(() => [] as HalDecision[]),
    ...sensors.flatMap(s =>
      metricKeys.map(async m => {
        try {
          const data = await halApi.getSensorHistory(s.id, m, from, to);
          if (data.length > 0) {
            const cfg = metricConfig[m];
            layers.push({ deviceId: s.id, deviceName: s.name, metric: m, color: cfg?.color || '#888', data });
          }
        } catch { /* skip */ }
      })
    ),
  ]);

  return { layers, decisions };
}

export function renderHeroChart(layers: HeroChartLayer[], containerId: string, decisions: HalDecision[] = []): void {
  renderVegaHeroChart(layers, containerId, decisions);
}

export function renderSparkline(data: number[], color: string, _width = 80, _height = 24): string {
  if (data.length < 2) return '<span class="text-xs text-secondary">--</span>';
  // Return a placeholder div that Vega-Lite will render into
  const id = `spark-${Math.random().toString(36).slice(2, 9)}`;
  // Schedule Vega render after DOM insertion
  setTimeout(() => renderVegaSparkline(data, color, id), 0);
  return `<span id="${id}" class="sparkline-svg" style="display:inline-block;width:80px;height:24px;"></span>`;
}

export function injectHeroChartStyles(): void {
  if (document.getElementById('hal-hero-chart-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-hero-chart-styles';
  style.textContent = `
.hero-chart-wrap {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  overflow: hidden;
}
.hero-chart {
  width: 100%;
  min-height: 280px;
}
.hero-chart .vega-embed {
  width: 100% !important;
}
.hero-chart .vega-embed svg {
  display: block;
  width: 100%;
  height: auto;
}
.chart-empty {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 13px;
}
.sparkline-svg {
  display: inline-block;
}
`;
  document.head.appendChild(style);
}
