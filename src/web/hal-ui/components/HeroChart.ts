// Hero Multi-Area Chart — stacked area/lake chart with decision markers

import { getStore, formatSensorValue, type UnitSystem } from '../store.js';
import { halApi, type HalSensorReading } from '../api.js';

export interface HeroChartLayer {
  deviceId: string;
  deviceName: string;
  metric: string;
  color: string;
  data: HalSensorReading[];
}

const metricConfig: Record<string, { label: string; color: string; minAxis: number; maxAxis: number; unit: string }> = {
  temperature: { label: 'Temperature', color: '#F59E0B', minAxis: 10, maxAxis: 40, unit: '°C' },
  humidity:    { label: 'Humidity',    color: '#38BDF8', minAxis: 0,  maxAxis: 100, unit: '%' },
  co2:         { label: 'CO₂',         color: '#22C55E', minAxis: 0,  maxAxis: 2000, unit: 'ppm' },
  light:       { label: 'Light',       color: '#FACC15', minAxis: 0,  maxAxis: 100000, unit: 'lux' },
  vpd:         { label: 'VPD',         color: '#A855F7', minAxis: 0,  maxAxis: 3, unit: 'kPa' },
};

export async function loadHeroChartData(): Promise<HeroChartLayer[]> {
  const store = getStore();
  const sensors = store.devices.filter(d => d.type === 'sensor');
  const to = new Date().toISOString();
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const layers: HeroChartLayer[] = [];
  const metrics = ['temperature', 'humidity', 'co2', 'light'];

  await Promise.all(sensors.flatMap(s =>
    metrics.map(async m => {
      try {
        const data = await halApi.getSensorHistory(s.id, m, from, to);
        if (data.length > 0) {
          const cfg = metricConfig[m];
          layers.push({
            deviceId: s.id,
            deviceName: s.name,
            metric: m,
            color: cfg?.color || '#888',
            data,
          });
        }
      } catch { /* skip */ }
    })
  ));

  return layers;
}

export function renderHeroChart(layers: HeroChartLayer[], containerId: string): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (layers.length === 0) {
    container.innerHTML = '<div class="chart-empty">No sensor data</div>';
    return;
  }

  const store = getStore();
  const width = 960;
  const height = 320;
  const pad = { top: 24, right: 24, bottom: 40, left: 52 };

  const allTimes = layers.flatMap(l => l.data.map(d => new Date(d.timestamp).getTime()));
  const tMin = Math.min(...allTimes);
  const tMax = Math.max(...allTimes);
  const tSpan = Math.max(1, tMax - tMin);
  const tx = (t: number) => pad.left + ((t - tMin) / tSpan) * (width - pad.left - pad.right);

  // Build paths for each layer
  const layerPaths = layers.map(layer => {
    const cfg = metricConfig[layer.metric] || { minAxis: 0, maxAxis: 100 };
    let axisMin = cfg.minAxis;
    let axisMax = cfg.maxAxis;
    if (layer.metric === 'temperature' && store.unitSystem === 'imperial') {
      axisMin = (axisMin * 9 / 5) + 32;
      axisMax = (axisMax * 9 / 5) + 32;
    }
    const vSpan = Math.max(1, axisMax - axisMin);

    const points = layer.data.map(d => {
      const v = formatSensorValue(d.value, layer.metric, store.unitSystem).value;
      const t = new Date(d.timestamp).getTime();
      const x = tx(t);
      const y = pad.top + ((axisMax - v) / vSpan) * (height - pad.top - pad.bottom);
      return { x, y, v, t };
    });

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${points[points.length - 1].x.toFixed(1)},${height - pad.bottom} L${points[0].x.toFixed(1)},${height - pad.bottom} Z`;

    return { layer, points, line, area, color: layer.color, axisMin, axisMax, vSpan };
  });

  // Grid lines
  const gridLines = [];
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (i / 5) * (height - pad.top - pad.bottom);
    gridLines.push(`<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="chart-grid" />`);
  }

  // Time labels
  const timeLabels = [];
  for (let i = 0; i <= 6; i++) {
    const t = tMin + (i / 6) * tSpan;
    const x = tx(t);
    const label = new Date(t).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    timeLabels.push(`<text x="${x}" y="${height - 10}" class="chart-label" text-anchor="middle">${label}</text>`);
  }

  // Left axis (primary metric)
  const primary = layerPaths[0];
  const leftAxisLabels = [];
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (i / 5) * (height - pad.top - pad.bottom);
    const v = primary.axisMax - (i / 5) * primary.vSpan;
    const precision = primary.layer.metric === 'co2' ? 0 : 1;
    leftAxisLabels.push(`<text x="${pad.left - 8}" y="${y + 4}" class="chart-label" text-anchor="end">${v.toFixed(precision)}</text>`);
  }

  // Gradients
  const defs = layerPaths.map((lp, i) => {
    const gradId = `hero-grad-${i}`;
    return `<linearGradient id="${gradId}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${lp.color}" stop-opacity="0.28"/><stop offset="100%" stop-color="${lp.color}" stop-opacity="0.02"/></linearGradient>`;
  }).join('');

  const areas = layerPaths.map((lp, i) => `<path d="${lp.area}" fill="url(#hero-grad-${i})" stroke="none"/>`).join('');
  const lines = layerPaths.map(lp => `<path d="${lp.line}" fill="none" stroke="${lp.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
  const dots = layerPaths.map(lp => {
    const last = lp.points[lp.points.length - 1];
    return `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4" fill="${lp.color}" stroke="var(--bg-primary)" stroke-width="2"/>`;
  }).join('');

  container.innerHTML = `
    <svg class="hero-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <defs>${defs}</defs>
      ${gridLines.join('')}
      ${areas}
      ${lines}
      ${dots}
      ${leftAxisLabels.join('')}
      ${timeLabels.join('')}
    </svg>
  `;
}

export function renderSparkline(data: number[], color: string, width = 80, height = 24): string {
  if (data.length < 2) return '<span class="text-xs text-secondary">--</span>';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(0.001, max - min);
  const pad = 2;
  const step = (width - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * step;
    const y = pad + ((max - v) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline-svg"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
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
.hero-svg {
  display: block;
  width: 100%;
  height: auto;
}
.chart-grid {
  stroke: color-mix(in srgb, var(--text-tertiary) 30%, var(--border));
  stroke-width: 1;
  stroke-dasharray: 2 3;
}
.chart-label {
  fill: var(--text-tertiary);
  font-size: 10px;
  font-family: var(--font-mono);
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
  display: block;
}
`;
  document.head.appendChild(style);
}
