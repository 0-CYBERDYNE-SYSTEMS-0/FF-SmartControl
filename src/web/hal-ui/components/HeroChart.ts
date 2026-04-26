// Hero Multi-Area Chart — stacked area/lake chart with smooth curves, dual Y-axes, decision markers

import { getStore, formatSensorValue, type UnitSystem } from '../store.js';
import { halApi, type HalSensorReading, type HalDecision } from '../api.js';

export interface HeroChartLayer {
  deviceId: string;
  deviceName: string;
  metric: string;
  color: string;
  data: HalSensorReading[];
}

export type { HalDecision as HeroChartDecision };

const metricConfig: Record<string, { label: string; color: string; minAxis: number; maxAxis: number; unit: string; axisGroup: 'left' | 'right' }> = {
  temperature:  { label: 'Temperature',  color: '#F59E0B', minAxis: 10, maxAxis: 40,   unit: '°C',  axisGroup: 'left' },
  humidity:     { label: 'Humidity',     color: '#38BDF8', minAxis: 0,  maxAxis: 100,  unit: '%',   axisGroup: 'left' },
  soil_moisture:{ label: 'Soil Moisture',color: '#EF4444', minAxis: 0,  maxAxis: 100,  unit: '%',   axisGroup: 'left' },
  water_level:  { label: 'Water Level',  color: '#2563EB', minAxis: 0,  maxAxis: 100,  unit: '%',   axisGroup: 'left' },
  ph:           { label: 'pH',           color: '#A855F7', minAxis: 0,  maxAxis: 14,   unit: '',    axisGroup: 'left' },
  co2:          { label: 'CO₂',          color: '#22C55E', minAxis: 0,  maxAxis: 2000, unit: 'ppm', axisGroup: 'right' },
  light:        { label: 'Light',        color: '#FACC15', minAxis: 0,  maxAxis: 100000,unit: 'lux', axisGroup: 'right' },
  weight:       { label: 'Weight',       color: '#94A3B8', minAxis: 0,  maxAxis: 100,  unit: 'kg',  axisGroup: 'right' },
  vpd:          { label: 'VPD',          color: '#A855F7', minAxis: 0,  maxAxis: 3,    unit: 'kPa', axisGroup: 'left' },
};

export async function loadHeroChartData(): Promise<{ layers: HeroChartLayer[]; decisions: HalDecision[] }> {
  const store = getStore();
  const sensors = store.devices.filter(d => d.type === 'sensor');
  const to = new Date().toISOString();
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const layers: HeroChartLayer[] = [];
  const metricKeys = ['temperature', 'humidity', 'co2', 'light'];

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

const DECISION_COLORS: Record<string, string> = {
  success: '#6DFF9A',
  failure: '#FF5C6C',
  pending: '#FFC857',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ─────────────── Monotone Cubic Spline (Fritsch-Carlson) ─────────────── */

interface SplinePoint { x: number; y: number; }

function monotoneCubicPath(pts: SplinePoint[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  }

  const n = pts.length;
  const dx: number[] = [];
  const dy: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    dy.push(pts[i + 1].y - pts[i].y);
  }

  const m: number[] = new Array(n);
  const sec: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    sec.push(dy[i] / dx[i]);
  }

  m[0] = sec[0];
  m[n - 1] = sec[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (sec[i - 1] * sec[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (sec[i - 1] + sec[i]) / 2;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(sec[i]) < 1e-10) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const alpha = m[i] / sec[i];
    const beta = m[i + 1] / sec[i];
    const tau = alpha * alpha + beta * beta;
    if (tau > 9) {
      const t = 3 / Math.sqrt(tau);
      m[i] = t * alpha * sec[i];
      m[i + 1] = t * beta * sec[i];
    }
  }

  const parts: string[] = [`M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`];
  for (let i = 0; i < n - 1; i++) {
    const x1 = pts[i].x + dx[i] / 3;
    const y1 = pts[i].y + m[i] * dx[i] / 3;
    const x2 = pts[i + 1].x - dx[i] / 3;
    const y2 = pts[i + 1].y - m[i + 1] * dx[i] / 3;
    parts.push(`C${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`);
  }
  return parts.join(' ');
}

export function renderHeroChart(layers: HeroChartLayer[], containerId: string, decisions: HalDecision[] = []): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (layers.length === 0) {
    container.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'chart-empty';
    empty.textContent = 'No sensor data';
    container.appendChild(empty);
    return;
  }

  const store = getStore();
  const width = 960;
  const height = 320;
  const pad = { top: 24, right: 52, bottom: 40, left: 52 };

  const allTimes = layers.flatMap(l => l.data.map(d => new Date(d.timestamp).getTime()));
  const tMin = Math.min(...allTimes);
  const tMax = Math.max(...allTimes);
  const tSpan = Math.max(1, tMax - tMin);
  const tx = (t: number) => pad.left + ((t - tMin) / tSpan) * (width - pad.left - pad.right);

  type LayerPath = {
    layer: HeroChartLayer;
    points: { x: number; y: number; v: number; t: number }[];
    smoothLine: string;
    area: string;
    color: string;
    axisMin: number;
    axisMax: number;
    vSpan: number;
    axisGroup: 'left' | 'right';
  };

  const leftLayers: LayerPath[] = [];
  const rightLayers: LayerPath[] = [];

  const layerPaths = layers.map(layer => {
    const cfg = metricConfig[layer.metric] || { minAxis: 0, maxAxis: 100, axisGroup: 'left' as const };
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

    const smoothLine = monotoneCubicPath(points.map(p => ({ x: p.x, y: p.y })));
    const area = smoothLine
      ? `${smoothLine} L${points[points.length - 1].x.toFixed(1)},${height - pad.bottom} L${points[0].x.toFixed(1)},${height - pad.bottom} Z`
      : '';

    const lp: LayerPath = { layer, points, smoothLine, area, color: layer.color, axisMin, axisMax, vSpan, axisGroup: cfg.axisGroup };
    if (cfg.axisGroup === 'right') rightLayers.push(lp);
    else leftLayers.push(lp);
    return lp;
  });

  const gridLines: string[] = [];
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (i / 5) * (height - pad.top - pad.bottom);
    gridLines.push(`<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="chart-grid" />`);
  }

  const timeLabels: string[] = [];
  for (let i = 0; i <= 6; i++) {
    const t = tMin + (i / 6) * tSpan;
    const x = tx(t);
    const label = new Date(t).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    timeLabels.push(`<text x="${x}" y="${height - 10}" class="chart-label" text-anchor="middle">${label}</text>`);
  }

  // Left axis (first left-group layer)
  const primary = leftLayers[0] || layerPaths[0];
  const leftAxisLabels: string[] = [];
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (i / 5) * (height - pad.top - pad.bottom);
    const v = primary.axisMax - (i / 5) * primary.vSpan;
    const precision = primary.layer.metric === 'co2' ? 0 : 1;
    leftAxisLabels.push(`<text x="${pad.left - 8}" y="${y + 4}" class="chart-label" text-anchor="end">${v.toFixed(precision)}</text>`);
  }

  // Right axis (first right-group layer)
  let rightAxisLabels = '';
  if (rightLayers.length > 0) {
    const sec = rightLayers[0];
    const labels: string[] = [];
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (i / 5) * (height - pad.top - pad.bottom);
      const v = sec.axisMax - (i / 5) * sec.vSpan;
      const precision = sec.layer.metric === 'co2' ? 0 : 1;
      labels.push(`<text x="${width - pad.right + 8}" y="${y + 4}" class="chart-label" style="fill:${sec.color}">${v.toFixed(precision)}</text>`);
    }
    rightAxisLabels = labels.join('');
  }

  const defs = layerPaths.map((lp, i) => {
    const gradId = `hero-grad-${i}`;
    return `<linearGradient id="${gradId}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${lp.color}" stop-opacity="0.28"/><stop offset="100%" stop-color="${lp.color}" stop-opacity="0.02"/></linearGradient>`;
  }).join('');

  const areas = layerPaths.map((lp, i) => lp.area ? `<path d="${lp.area}" fill="url(#hero-grad-${i})" stroke="none"/>` : '').join('');
  const lines = layerPaths.map(lp => lp.smoothLine ? `<path d="${lp.smoothLine}" fill="none" stroke="${lp.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : '').join('');
  const dots = layerPaths.map(lp => {
    const last = lp.points[lp.points.length - 1];
    return `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4" fill="${lp.color}" stroke="var(--bg-primary)" stroke-width="2"/>`;
  }).join('');

  // Decision markers — vertical rules + top dots, colored by outcome
  const decisionMarkers = decisions
    .filter(d => {
      const t = new Date(d.timestamp).getTime();
      return t >= tMin && t <= tMax;
    })
    .map(d => {
      const x = tx(new Date(d.timestamp).getTime()).toFixed(1);
      const color = DECISION_COLORS[d.status || 'pending'] ?? DECISION_COLORS.pending;
      const opacity = (0.35 + (d.confidence ?? 0.5) * 0.65).toFixed(2);
      const label = escapeHtml(d.decision.slice(0, 60));
      const conf = ((d.confidence ?? 0) * 100).toFixed(0);
      return [
        `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${height - pad.bottom}" stroke="${color}" stroke-width="1.5" stroke-dasharray="4 3" opacity="${opacity}"><title>${label} (${conf}%)</title></line>`,
        `<circle cx="${x}" cy="${pad.top + 10}" r="4" fill="${color}" stroke="var(--bg-primary)" stroke-width="1.5" opacity="${opacity}"><title>${label}</title></circle>`,
      ].join('');
    }).join('');

  // Build SVG as a controlled string — all user data is escaped above
  const svgParts = [
    `<svg class="hero-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">`,
    `<defs>${defs}</defs>`,
    gridLines.join(''),
    areas,
    decisionMarkers,
    lines,
    dots,
    leftAxisLabels.join(''),
    rightAxisLabels,
    timeLabels.join(''),
    '</svg>',
  ].join('');

  container.innerHTML = svgParts;
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
    return { x, y };
  });
  const smoothPath = monotoneCubicPath(points);
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline-svg"><path d="${smoothPath}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
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
