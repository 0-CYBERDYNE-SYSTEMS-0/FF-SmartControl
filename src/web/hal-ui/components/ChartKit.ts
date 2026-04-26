// ChartKit — Pure SVG chart renderers extracted from options.html
// Zero dependencies, zero external libraries. All metrics, all card types.

import { getStore, formatSensorValue } from '../store.js';
import type { HalSensorReading, HalDecision } from '../api.js';

/* ═══════════════════════════════════════════════════════════════════════════
   METRIC CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */

const metricConfig: Record<string, { label: string; color: string; unit: string; minAxis: number; maxAxis: number }> = {
  temperature:   { label: 'Temperature',   color: '#F59E0B', unit: '°C',  minAxis: 10,  maxAxis: 40 },
  humidity:      { label: 'Humidity',      color: '#38BDF8', unit: '%',   minAxis: 0,   maxAxis: 100 },
  soil_moisture: { label: 'Soil Moisture', color: '#EF4444', unit: '%',   minAxis: 0,   maxAxis: 100 },
  water_level:   { label: 'Water Level',   color: '#2563EB', unit: '%',   minAxis: 0,   maxAxis: 100 },
  ph:            { label: 'pH',            color: '#A855F7', unit: '',    minAxis: 0,   maxAxis: 14 },
  co2:           { label: 'CO₂',           color: '#22C55E', unit: 'ppm', minAxis: 0,   maxAxis: 2000 },
  light:         { label: 'Light',         color: '#FACC15', unit: 'lux', minAxis: 0,   maxAxis: 100000 },
  weight:        { label: 'Weight',        color: '#94A3B8', unit: 'kg',  minAxis: 0,   maxAxis: 100 },
  vpd:           { label: 'VPD',           color: '#A855F7', unit: 'kPa', minAxis: 0,   maxAxis: 3 },
};

const DECISION_COLORS: Record<string, string> = {
  success: '#6DFF9A',
  failure: '#FF5C6C',
  pending: '#FFC857',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ═══════════════════════════════════════════════════════════════════════════
   MONOTONE CUBIC SPLINE (Fritsch-Carlson) — from f30439d
   ═══════════════════════════════════════════════════════════════════════════ */

interface SplinePoint { x: number; y: number; }

export function monotoneCubicPath(pts: SplinePoint[]): string {
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

  const sec: number[] = [];
  for (let i = 0; i < n - 1; i++) sec.push(dy[i] / dx[i]);

  const m: number[] = new Array(n);
  m[0] = sec[0];
  m[n - 1] = sec[n - 2];

  for (let i = 1; i < n - 1; i++) {
    m[i] = sec[i - 1] * sec[i] <= 0 ? 0 : (sec[i - 1] + sec[i]) / 2;
  }

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(sec[i]) < 1e-10) { m[i] = 0; m[i + 1] = 0; continue; }
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

/* ═══════════════════════════════════════════════════════════════════════════
   #f30 — DUAL-AXIS GRADIENT LINE CARD (options.html ★ The Chart)
   Straight-line dual-axis SVG with gradient fills, KPI header, Min/Avg/Max stats.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface DualAxisLayer {
  label: string;
  color: string;
  minAxis: number;
  maxAxis: number;
  unit: string;
  data: Array<{ t: number; v: number }>;
}

export function renderDualAxisCard(
  layers: DualAxisLayer[],
  containerId: string,
  opts: {
    title?: string;
    subtitle?: string;
    deviceName?: string;
    width?: number;
    height?: number;
    showStats?: boolean;
    showGrid?: boolean;
    smooth?: boolean;
  } = {}
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (layers.length === 0) {
    container.innerHTML = '<div class="chart-empty">No data</div>';
    return;
  }

  const width = opts.width ?? 900;
  const height = opts.height ?? 320;
  const pad = { top: 24, right: 52, bottom: 36, left: 52 };

  const allTimes = layers.flatMap(l => l.data.map(d => d.t));
  const tMin = Math.min(...allTimes);
  const tMax = Math.max(...allTimes);
  const tSpan = Math.max(1, tMax - tMin);
  const tx = (t: number) => pad.left + ((t - tMin) / tSpan) * (width - pad.left - pad.right);

  const layerPaths = layers.map(layer => {
    const axisMin = layer.minAxis;
    const axisMax = layer.maxAxis;
    const vSpan = Math.max(1, axisMax - axisMin);

    const points = layer.data.map(d => {
      const x = tx(d.t);
      const y = pad.top + ((axisMax - d.v) / vSpan) * (height - pad.top - pad.bottom);
      return { x, y, v: d.v };
    });

    const lineFn = opts.smooth ? monotoneCubicPath : straightLinePath;
    const line = lineFn(points.map(p => ({ x: p.x, y: p.y })));
    const area = line
      ? `${line} L${points[points.length - 1].x.toFixed(1)},${height - pad.bottom} L${points[0].x.toFixed(1)},${height - pad.bottom} Z`
      : '';

    return { layer, points, line, area, axisMin, axisMax, vSpan };
  });

  // Grid lines
  let gridLines = '';
  if (opts.showGrid !== false) {
    gridLines = Array.from({ length: 6 }, (_, i) => {
      const y = pad.top + (i / 5) * (height - pad.top - pad.bottom);
      return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="chart-grid"/>`;
    }).join('');
  }

  // Time labels
  const timeSteps = 6;
  const timeLabels = Array.from({ length: timeSteps + 1 }, (_, i) => {
    const t = tMin + (i / timeSteps) * tSpan;
    const x = tx(t);
    const label = new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `<text x="${x.toFixed(1)}" y="${height - 8}" class="chart-label" text-anchor="middle">${label}</text>`;
  }).join('');

  // Left axis (first layer)
  const primary = layerPaths[0];
  const leftAxisLabels = Array.from({ length: 6 }, (_, i) => {
    const y = pad.top + (i / 5) * (height - pad.top - pad.bottom);
    const v = primary.axisMax - (i / 5) * primary.vSpan;
    const prec = primary.layer.label === 'CO₂' ? 0 : 1;
    return `<text x="${pad.left - 8}" y="${y + 4}" class="chart-label" text-anchor="end">${v.toFixed(prec)}</text>`;
  }).join('');

  // Right axis (second layer if exists)
  let rightAxisLabels = '';
  if (layerPaths.length > 1) {
    const sec = layerPaths[1];
    rightAxisLabels = Array.from({ length: 6 }, (_, i) => {
      const y = pad.top + (i / 5) * (height - pad.top - pad.bottom);
      const v = sec.axisMax - (i / 5) * sec.vSpan;
      return `<text x="${width - pad.right + 8}" y="${y + 4}" class="chart-label" style="fill:${sec.layer.color}">${v.toFixed(1)}</text>`;
    }).join('');
  }

  // Gradient defs
  const defs = layerPaths.map((lp, i) => `
    <linearGradient id="ck-grad-${containerId}-${i}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${lp.layer.color}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${lp.layer.color}" stop-opacity="0.02"/>
    </linearGradient>
  `).join('');

  const areas = layerPaths.map((lp, i) =>
    lp.area ? `<path d="${lp.area}" fill="url(#ck-grad-${containerId}-${i})" stroke="none"/>` : ''
  ).join('');

  const lines = layerPaths.map(lp =>
    lp.line ? `<path d="${lp.line}" fill="none" stroke="${lp.layer.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ''
  ).join('');

  const dots = layerPaths.map(lp => {
    const last = lp.points[lp.points.length - 1];
    return `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4" fill="${lp.layer.color}" stroke="var(--bg-primary)" stroke-width="2"/>`;
  }).join('');

  const svg = `
    <svg class="hero-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <defs>${defs}</defs>
      ${gridLines}${areas}${lines}${dots}${leftAxisLabels}${rightAxisLabels}${timeLabels}
    </svg>
  `;

  // Build full card HTML
  const latestValues = layers.map(l => {
    const last = l.data[l.data.length - 1];
    const prev = l.data[l.data.length - 2];
    const delta = prev ? ((last.v - prev.v) / Math.abs(prev.v) * 100) : 0;
    const values = l.data.map(d => d.v);
    return {
      ...l,
      current: last.v,
      delta,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  });

  const primaryMetric = latestValues[0];
  const kpiVal = `${primaryMetric.current.toFixed(1)}${primaryMetric.unit}`;
  const kpiDelta = `${primaryMetric.delta >= 0 ? '↑' : '↓'} ${Math.abs(primaryMetric.delta).toFixed(1)}%`;

  let statsHtml = '';
  if (opts.showStats !== false) {
    statsHtml = `<div class="ck-stats">` +
      latestValues.map(l => `
        <div class="ck-stat-metric">
          <span class="ck-stat-label" style="color:${l.color}">${escapeHtml(l.label)}</span>
          <span class="ck-stat-current" style="color:${l.color}">${l.current.toFixed(1)}${l.unit}</span>
        </div>
        <div class="ck-stat-row">
          <div class="ck-stat-item"><label>Min</label><strong>${l.min.toFixed(1)}${l.unit}</strong></div>
          <div class="ck-stat-item"><label>Avg</label><strong>${l.avg.toFixed(1)}${l.unit}</strong></div>
          <div class="ck-stat-item"><label>Max</label><strong>${l.max.toFixed(1)}${l.unit}</strong></div>
        </div>
      `).join('') +
      `</div>`;
  }

  const titleHtml = opts.title
    ? `<div class="ck-head">
         <div>
           <div class="ck-title">${escapeHtml(opts.title)}</div>
           ${opts.subtitle ? `<div class="ck-subtitle">${escapeHtml(opts.subtitle)}</div>` : ''}
           ${opts.deviceName ? `<div class="ck-device">${escapeHtml(opts.deviceName)}</div>` : ''}
         </div>
         <div class="ck-kpi">
           <div class="ck-kpi-val" style="color:${primaryMetric.color}">${kpiVal}</div>
           <div class="ck-kpi-delta">${kpiDelta}</div>
         </div>
       </div>`
    : '';

  const footHtml = `<div class="ck-foot">${layers[0].data.length} readings</div>`;

  container.innerHTML = `${titleHtml}<div class="ck-chart">${svg}</div>${statsHtml}${footHtml}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD HERO CARD — Ref Code 1 Style (FarmPal themed)
   Toggle-able temp/humidity/CO₂ with exact card structure from user HTML.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface DashboardHeroMetric {
  key: string;
  label: string;
  color: string;
  unit: string;
  data: Array<{ t: number; v: number }>;
}

export function renderDashboardHeroCard(
  metrics: DashboardHeroMetric[],
  containerId: string,
  opts: {
    title?: string;
    subtitle?: string;
    activeKeys?: Set<string>;
    onToggle?: (key: string) => void;
  } = {}
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const activeKeys = opts.activeKeys ?? new Set(metrics.map(m => m.key));
  const activeMetrics = metrics.filter(m => activeKeys.has(m.key));

  if (activeMetrics.length === 0) {
    container.innerHTML = '<div class="chart-empty">Select a metric</div>';
    return;
  }

  const w = 566;
  const h = 210;
  const pad = { l: 100, r: 80, t: 30, b: 40 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const allTimes = activeMetrics.flatMap(m => m.data.map(d => d.t));
  const tMin = Math.min(...allTimes);
  const tMax = Math.max(...allTimes);
  const tSpan = Math.max(1, tMax - tMin);

  const x = (i: number, len: number) => pad.l + (i / (len - 1)) * cw;

  // Compute min/max from actual data for each metric
  const computed = activeMetrics.map(m => {
    const values = m.data.map(d => d.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { ...m, min, max, vSpan: max - min || 1 };
  });

  // Y scale functions
  const yScales = computed.map(m => (v: number) =>
    pad.t + ((m.max - v) / m.vSpan) * ch
  );

  // Path builder (straight lines)
  function path(data: Array<{ v: number }>, yFn: (v: number) => number) {
    return data.map((d, i) => `${i ? 'L' : 'M'}${x(i, data.length)},${yFn(d.v)}`).join(' ');
  }

  // Grid lines (3 lines: max, mid, min of primary metric)
  const primary = computed[0];
  const gridValues = [primary.max, primary.min + primary.vSpan / 2, primary.min];
  const gridLines = gridValues.map(v => {
    const y = yScales[0](v);
    return `<line x1="${pad.l}" x2="${pad.l + cw}" y1="${y}" y2="${y}" stroke="color-mix(in srgb, var(--text-tertiary) 20%, var(--border))"/>`;
  }).join('');

  // Area fill under primary metric only
  const primaryPath = path(computed[0].data, yScales[0]);
  const areaPath = primaryPath +
    ` L${x(computed[0].data.length - 1, computed[0].data.length)},${pad.t + ch}` +
    ` L${x(0, computed[0].data.length)},${pad.t + ch} Z`;

  // Lines for all metrics
  const linePaths = computed.map((m, i) =>
    `<path d="${path(m.data, yScales[i])}" stroke="${m.color}" fill="none" stroke-width="${i === 0 ? 2.5 : 2}"/>`
  ).join('');

  // End dots
  const dots = computed.map((m, i) => {
    const lastIdx = m.data.length - 1;
    return `<circle cx="${x(lastIdx, m.data.length)}" cy="${yScales[i](m.data[lastIdx].v)}" r="4" fill="${m.color}"/>`;
  }).join('');

  const svg = `
    <svg class="hero-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      ${gridLines}
      <path d="${areaPath}" fill="color-mix(in srgb, ${primary.color} 15%, transparent)"/>
      ${linePaths}
      ${dots}
    </svg>
  `;

  // Stats
  const statsHtml = computed.map(m => {
    const values = m.data.map(d => d.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const current = m.data[m.data.length - 1].v;
    return `
      <div class="dhc-stats-row">
        <div class="dhc-stats-metric" style="color:${m.color}">${escapeHtml(m.label)}</div>
        <div class="dhc-stats-current">${current.toFixed(1)}${m.unit}</div>
      </div>
      <div class="dhc-stats-grid">
        <div><div class="dhc-muted">Min</div><strong>${min.toFixed(1)}${m.unit}</strong></div>
        <div><div class="dhc-muted">Avg</div><strong>${avg.toFixed(1)}${m.unit}</strong></div>
        <div><div class="dhc-muted">Max</div><strong>${max.toFixed(1)}${m.unit}</strong></div>
      </div>
    `;
  }).join('');

  // Title row with KPI
  const primaryCurrent = computed[0].data[computed[0].data.length - 1].v;
  const primaryPrev = computed[0].data[computed[0].data.length - 2]?.v ?? primaryCurrent;
  const delta = primaryPrev ? ((primaryCurrent - primaryPrev) / Math.abs(primaryPrev) * 100) : 0;

  const titleColors = computed.map(m => `<span style="color:${m.color}">${escapeHtml(m.label)}</span>`).join(' <span style="color:var(--text-secondary)">+</span> ');

  // Toggle pills
  const allMetricKeys = ['temperature', 'humidity', 'co2'] as const;
  const toggleHtml = allMetricKeys.map(k => {
    const m = metrics.find(x => x.key === k);
    if (!m) return '';
    const isActive = activeKeys.has(k);
    return `<button class="dhc-toggle ${isActive ? 'active' : ''}" data-metric="${k}" style="--toggle-color:${m.color}">${escapeHtml(m.label)}</button>`;
  }).join('');

  container.innerHTML = `
    <div class="dhc-card">
      <div class="dhc-head">
        <div>
          <div class="dhc-title">${titleColors}</div>
          ${opts.subtitle ? `<div class="dhc-subtitle">${escapeHtml(opts.subtitle)}</div>` : ''}
        </div>
        <div class="dhc-kpi">
          <div class="dhc-kpi-val" style="color:${primary.color}">${primaryCurrent.toFixed(1)}${primary.unit}</div>
          <div class="dhc-kpi-delta">${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}%</div>
        </div>
      </div>
      <div class="dhc-toggles">${toggleHtml}</div>
      <div class="dhc-chart">${svg}</div>
      <div class="dhc-stats">${statsHtml}</div>
      <div class="dhc-foot">${computed[0].data.length} readings · ${escapeHtml(opts.subtitle || '')}</div>
    </div>
  `;

  // Attach toggle handlers
  if (opts.onToggle) {
    container.querySelectorAll('.dhc-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.metric;
        if (key) opts.onToggle!(key);
      });
    });
  }
}

function straightLinePath(pts: SplinePoint[]): string {
  if (pts.length < 2) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

/* ═══════════════════════════════════════════════════════════════════════════
   #v1 — ORIGINAL SVG LINE + AREA (711eb9f exact)
   Single metric, simple area fill, no external deps.
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderOriginalAreaChart(
  data: Array<{ ts: string; value: number }>,
  containerId: string,
  opts: { color?: string; width?: number; height?: number } = {}
): void {
  const container = document.getElementById(containerId);
  if (!container || data.length < 2) return;

  const color = opts.color ?? '#6DFF9A';
  const W = opts.width ?? (container.clientWidth || 900);
  const H = opts.height ?? 240;
  const p = { t: 24, r: 24, b: 34, l: 54 };

  const vals = data.map(d => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;

  const x = (i: number) => p.l + (i / (vals.length - 1)) * (W - p.l - p.r);
  const y = (v: number) => p.t + ((max - v) / span) * (H - p.t - p.b);

  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${p.l},${H - p.b} ${pts} ${W - p.r},${H - p.b}`;

  const grids = [0, 0.25, 0.5, 0.75, 1].map(s => {
    const gy = p.t + s * (H - p.t - p.b);
    const lv = (max - s * span).toFixed(1);
    return `<line x1="${p.l}" y1="${gy}" x2="${W - p.r}" y2="${gy}" class="chart-grid"/>` +
           `<text x="${p.l - 8}" y="${gy + 4}" class="chart-label" text-anchor="end">${lv}</text>`;
  }).join('');

  const lx = x(vals.length - 1).toFixed(1);
  const ly = y(vals[vals.length - 1]).toFixed(1);
  const t0 = new Date(data[0].ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const t1 = new Date(data[data.length - 1].ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  container.innerHTML = `
    <svg class="og-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      ${grids}
      <polygon points="${area}" fill="color-mix(in srgb, ${color} 16%, transparent)"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${lx}" cy="${ly}" r="4" fill="${color}" stroke="var(--bg-primary)" stroke-width="2"/>
      <text x="${p.l}" y="${H - 10}" class="chart-label">${t0}</text>
      <text x="${W - p.r}" y="${H - 10}" class="chart-label" text-anchor="end">${t1}</text>
      <text x="${W - p.r}" y="22" fill="${color}" font-size="18" font-weight="700" font-family="var(--font-mono)" text-anchor="end">${vals[vals.length - 1].toFixed(2)}</text>
    </svg>
  `;
}

/* ═══════════════════════════════════════════════════════════════════════════
   #v4 — STACKED AREA CHART (options.html exact)
   Additive stack — total height = sum of all layers.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface StackedLayer {
  label: string;
  color: string;
  data: Array<{ t: number; v: number }>;
}

export function renderStackedAreaChart(
  layers: StackedLayer[],
  containerId: string,
  opts: { width?: number; height?: number; showLegend?: boolean } = {}
): void {
  const container = document.getElementById(containerId);
  if (!container || layers.length === 0) {
    if (container) container.innerHTML = '<div class="chart-empty">No data</div>';
    return;
  }

  const width = opts.width ?? 900;
  const height = opts.height ?? 320;
  const pad = { top: 24, right: 24, bottom: 40, left: 52 };

  // Unified time domain
  const allTimes = layers.flatMap(l => l.data.map(d => d.t));
  const tMin = Math.min(...allTimes);
  const tMax = Math.max(...allTimes);
  const tSpan = Math.max(1, tMax - tMin);
  const tx = (t: number) => pad.left + ((t - tMin) / tSpan) * (width - pad.left - pad.right);

  // Build stacked values at each time point
  const timeMap = new Map<number, number[]>();
  for (const layer of layers) {
    for (const d of layer.data) {
      if (!timeMap.has(d.t)) timeMap.set(d.t, []);
    }
  }
  const times = Array.from(timeMap.keys()).sort((a, b) => a - b);

  // For each time, compute stacked Y positions
  const stacked = times.map(t => {
    const x = tx(t);
    let y0 = 0;
    const segs: { x: number; y0: number; y1: number; v: number }[] = [];
    for (const layer of layers) {
      const pt = layer.data.find(d => d.t === t);
      const v = pt?.v ?? 0;
      y0 += v;
      segs.push({ x, y0, y1: y0 - v, v });
    }
    return { t, x, segs, total: y0 };
  });

  const maxTotal = Math.max(...stacked.map(s => s.total), 1);
  const yScale = (v: number) => pad.top + ((maxTotal - v) / maxTotal) * (height - pad.top - pad.bottom);

  // Build area paths per layer (bottom-up)
  const layerPaths = layers.map((layer, li) => {
    const topPts: SplinePoint[] = [];
    const botPts: SplinePoint[] = [];

    for (const st of stacked) {
      const seg = st.segs[li];
      topPts.push({ x: seg.x, y: yScale(seg.y0) });
      botPts.push({ x: seg.x, y: yScale(seg.y1) });
    }

    const topPath = straightLinePath(topPts);
    const botPath = straightLinePath(botPts);
    const area = topPath && botPath
      ? `${topPath} L${botPts[botPts.length - 1].x.toFixed(1)},${botPts[botPts.length - 1].y.toFixed(1)} ${botPts.slice().reverse().map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} Z`
      : '';

    return { layer, area, topPath };
  });

  // Grid lines
  const gridLines = Array.from({ length: 6 }, (_, i) => {
    const y = pad.top + (i / 5) * (height - pad.top - pad.bottom);
    const v = maxTotal * (1 - i / 5);
    return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="chart-grid"/>` +
           `<text x="${pad.left - 8}" y="${y + 4}" class="chart-label" text-anchor="end">${v.toFixed(0)}</text>`;
  }).join('');

  // Time labels
  const timeLabels = Array.from({ length: 7 }, (_, i) => {
    const t = tMin + (i / 6) * tSpan;
    const x = tx(t);
    const label = new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `<text x="${x.toFixed(1)}" y="${height - 10}" class="chart-label" text-anchor="middle">${label}</text>`;
  }).join('');

  const defs = layerPaths.map((lp, i) => `
    <linearGradient id="stack-grad-${containerId}-${i}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${lp.layer.color}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${lp.layer.color}" stop-opacity="0.08"/>
    </linearGradient>
  `).join('');

  const areas = layerPaths.map((lp, i) =>
    lp.area ? `<path d="${lp.area}" fill="url(#stack-grad-${containerId}-${i})" stroke="none"/>` : ''
  ).join('');

  const lines = layerPaths.map(lp =>
    lp.topPath ? `<path d="${lp.topPath}" fill="none" stroke="${lp.layer.color}" stroke-width="1.5" stroke-linejoin="round"/>` : ''
  ).join('');

  const svg = `
    <svg class="hero-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <defs>${defs}</defs>
      ${gridLines}${areas}${lines}${timeLabels}
    </svg>
  `;

  // Legend
  const legendHtml = opts.showLegend !== false
    ? `<div class="stack-legend">${layers.map(l => `
        <span class="legend-item" style="--metric-color:${l.color}">
          <span class="legend-dot"></span>${escapeHtml(l.label)}
        </span>`).join('')}</div>`
    : '';

  container.innerHTML = `<div class="stack-chart">${svg}</div>${legendHtml}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   #v5-v7 — CARD CHARTS (Area, Line, Bar)
   Compact tiles for viz grids.
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderAreaCard(
  data: HalSensorReading[],
  metricKey: string,
  containerId: string,
  title: string
): void {
  const container = document.getElementById(containerId);
  if (!container || data.length < 2) return;

  const store = getStore();
  const cfg = metricConfig[metricKey] || { label: metricKey, color: '#888', unit: '', minAxis: 0, maxAxis: 100 };
  const latest = formatSensorValue(data[data.length - 1].value, metricKey, store.unitSystem);
  const unit = latest.unit || cfg.unit;

  const w = 340, h = 120;
  const pad = { t: 8, r: 8, b: 20, l: 32 };

  const times = data.map(d => new Date(d.timestamp).getTime());
  const tMin = Math.min(...times), tMax = Math.max(...times);
  const tSpan = Math.max(1, tMax - tMin);
  const tx = (t: number) => pad.l + ((t - tMin) / tSpan) * (w - pad.l - pad.r);

  let axisMin = cfg.minAxis, axisMax = cfg.maxAxis;
  if (metricKey === 'temperature' && store.unitSystem === 'imperial') {
    axisMin = (axisMin * 9 / 5) + 32;
    axisMax = (axisMax * 9 / 5) + 32;
  }
  const vSpan = Math.max(1, axisMax - axisMin);

  const points = data.map(d => {
    const v = formatSensorValue(d.value, metricKey, store.unitSystem).value;
    return { x: tx(new Date(d.timestamp).getTime()), y: pad.t + ((axisMax - v) / vSpan) * (h - pad.t - pad.b) };
  });

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${h - pad.b} L${points[0].x.toFixed(1)},${h - pad.b} Z`;

  container.innerHTML = `
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml(title)}</span>
      <span class="viz-card-value text-mono" style="color:${cfg.color}">${latest.value.toFixed(1)}${unit}</span>
    </div>
    <svg viewBox="0 0 ${w} ${h}" class="viz-svg">
      <defs><linearGradient id="area-grad-${metricKey}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${cfg.color}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${cfg.color}" stop-opacity="0.02"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#area-grad-${metricKey})" stroke="none"/>
      <path d="${line}" fill="none" stroke="${cfg.color}" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>
  `;
}

export function renderLineCard(
  data: HalSensorReading[],
  metricKey: string,
  containerId: string,
  title: string
): void {
  const container = document.getElementById(containerId);
  if (!container || data.length < 2) return;

  const store = getStore();
  const cfg = metricConfig[metricKey] || { label: metricKey, color: '#888', unit: '', minAxis: 0, maxAxis: 100 };
  const latest = formatSensorValue(data[data.length - 1].value, metricKey, store.unitSystem);
  const unit = latest.unit || cfg.unit;

  const w = 340, h = 120;
  const pad = { t: 8, r: 8, b: 20, l: 32 };

  const times = data.map(d => new Date(d.timestamp).getTime());
  const tMin = Math.min(...times), tMax = Math.max(...times);
  const tSpan = Math.max(1, tMax - tMin);
  const tx = (t: number) => pad.l + ((t - tMin) / tSpan) * (w - pad.l - pad.r);

  const axisMin = cfg.minAxis, axisMax = cfg.maxAxis;
  const vSpan = Math.max(1, axisMax - axisMin);

  const pts = data.map(d => {
    const v = formatSensorValue(d.value, metricKey, store.unitSystem).value;
    return `${tx(new Date(d.timestamp).getTime()).toFixed(1)},${(pad.t + ((axisMax - v) / vSpan) * (h - pad.t - pad.b)).toFixed(1)}`;
  }).join(' ');

  container.innerHTML = `
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml(title)}</span>
      <span class="viz-card-value text-mono" style="color:${cfg.color}">${latest.value.toFixed(0)}${unit}</span>
    </div>
    <svg viewBox="0 0 ${w} ${h}" class="viz-svg">
      <polyline points="${pts}" fill="none" stroke="${cfg.color}" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>
  `;
}

export function renderBarCard(
  data: HalSensorReading[],
  metricKey: string,
  containerId: string,
  title: string
): void {
  const container = document.getElementById(containerId);
  if (!container || data.length < 2) return;

  const store = getStore();
  const cfg = metricConfig[metricKey] || { label: metricKey, color: '#888', unit: '', minAxis: 0, maxAxis: 100 };
  const latest = formatSensorValue(data[data.length - 1].value, metricKey, store.unitSystem);
  const unit = latest.unit || cfg.unit;

  const w = 340, h = 120;
  const pad = { t: 8, r: 8, b: 20, l: 32 };
  const bars = Math.min(data.length, 24);
  const step = (w - pad.l - pad.r) / bars;
  const barW = step * 0.7;

  const axisMin = cfg.minAxis, axisMax = cfg.maxAxis;
  const vSpan = Math.max(1, axisMax - axisMin);

  const rects = data.slice(-bars).map((d, i) => {
    const v = formatSensorValue(d.value, metricKey, store.unitSystem).value;
    const bh = ((v - axisMin) / vSpan) * (h - pad.t - pad.b);
    const x = pad.l + i * step + (step - barW) / 2;
    const y = h - pad.b - bh;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${cfg.color}" opacity="0.7" rx="2"/>`;
  }).join('');

  container.innerHTML = `
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml(title)}</span>
      <span class="viz-card-value text-mono" style="color:${cfg.color}">${latest.value.toFixed(0)}${unit}</span>
    </div>
    <svg viewBox="0 0 ${w} ${h}" class="viz-svg">${rects}</svg>
  `;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TINY DEVICE CHARTS — Inline area/bar trends for device cards
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderTinyAreaChart(
  data: number[],
  color: string,
  containerId: string
): void {
  const container = document.getElementById(containerId);
  if (!container || data.length < 2) return;

  const w = 200, h = 40;
  const pad = { t: 2, r: 2, b: 2, l: 2 };
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(0.001, max - min);

  const step = (w - pad.l - pad.r) / (data.length - 1);
  const points = data.map((v, i) => {
    const x = pad.l + i * step;
    const y = pad.t + ((max - v) / span) * (h - pad.t - pad.b);
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${h - pad.b} L${points[0].x.toFixed(1)},${h - pad.b} Z`;

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" class="tiny-chart-svg">
      <path d="${area}" fill="color-mix(in srgb, ${color} 20%, transparent)" stroke="none"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>
  `;
}

export function renderTinyBarChart(
  data: number[],
  color: string,
  containerId: string
): void {
  const container = document.getElementById(containerId);
  if (!container || data.length < 2) return;

  const w = 200, h = 40;
  const pad = { t: 2, r: 2, b: 2, l: 2 };
  const bars = Math.min(data.length, 20);
  const step = (w - pad.l - pad.r) / bars;
  const barW = step * 0.7;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(0.001, max - min);

  const rects = data.slice(-bars).map((v, i) => {
    const bh = ((v - min) / span) * (h - pad.t - pad.b);
    const x = pad.l + i * step + (step - barW) / 2;
    const y = h - pad.b - bh;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${color}" opacity="0.7" rx="1"/>`;
  }).join('');

  container.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="tiny-chart-svg">${rects}</svg>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   #v10 — SPARKLINES
   Inline micro charts.
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderSparkline(
  data: number[],
  color: string,
  width = 80,
  height = 24
): string {
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
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline-svg">
    <path d="${smoothPath}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   #v8 — STEP CHART
   For relay on/off states.
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderStepChart(
  data: Array<{ ts: string; value: number }>,
  containerId: string,
  opts: { color?: string; width?: number; height?: number } = {}
): void {
  const container = document.getElementById(containerId);
  if (!container || data.length < 2) return;

  const color = opts.color ?? '#FACC15';
  const W = opts.width ?? (container.clientWidth || 340);
  const H = opts.height ?? 100;
  const p = { t: 8, r: 8, b: 20, l: 32 };

  const times = data.map(d => new Date(d.ts).getTime());
  const tMin = Math.min(...times), tMax = Math.max(...times);
  const tSpan = Math.max(1, tMax - tMin);
  const tx = (t: number) => p.l + ((t - tMin) / tSpan) * (W - p.l - p.r);

  // Step-after path
  let path = '';
  for (let i = 0; i < data.length; i++) {
    const x = tx(new Date(data[i].ts).getTime());
    const y = p.t + (1 - data[i].value) * (H - p.t - p.b); // value 0=bottom, 1=top
    if (i === 0) {
      path = `M${x.toFixed(1)},${y.toFixed(1)}`;
    } else {
      const prevX = tx(new Date(data[i - 1].ts).getTime());
      const prevY = p.t + (1 - data[i - 1].value) * (H - p.t - p.b);
      path += ` L${x.toFixed(1)},${prevY.toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)}`;
    }
  }

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="viz-svg">
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
    </svg>
  `;
}

/* ═══════════════════════════════════════════════════════════════════════════
   #v13 — BULLET CHART
   Current vs target vs range.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface BulletMetric {
  label: string;
  current: number;
  target: number;
  min: number;
  max: number;
  color: string;
  unit: string;
}

export function renderBulletChart(
  metrics: BulletMetric[],
  containerId: string
): void {
  const container = document.getElementById(containerId);
  if (!container || metrics.length === 0) return;

  const W = container.clientWidth || 340;
  const H = metrics.length * 40 + 20;
  const trackH = 20;
  const pad = { t: 10, r: 16, b: 10, l: 80 };

  const rows = metrics.map((m, i) => {
    const y = pad.t + i * 40 + 10;
    const pct = (v: number) => Math.max(0, Math.min(1, (v - m.min) / (m.max - m.min)));
    const curPct = pct(m.current);
    const tgtPct = pct(m.target);
    const barW = (W - pad.l - pad.r);

    return `
      <text x="${pad.l - 8}" y="${y + 14}" text-anchor="end" fill="#9CB8AA" font-size="11" font-family="var(--font-mono)">${escapeHtml(m.label)}</text>
      <rect x="${pad.l}" y="${y}" width="${barW}" height="${trackH}" fill="#182420" rx="3"/>
      <rect x="${pad.l}" y="${y + 4}" width="${curPct * barW}" height="${trackH - 8}" fill="${m.color}" opacity="0.6" rx="2"/>
      <line x1="${pad.l + tgtPct * barW}" y1="${y - 2}" x2="${pad.l + tgtPct * barW}" y2="${y + trackH + 2}" stroke="#F59E0B" stroke-width="3"/>
      <text x="${pad.l + barW + 8}" y="${y + 14}" fill="#E8FFF2" font-size="11" font-family="var(--font-mono)">${m.current.toFixed(1)}${m.unit}</text>
    `;
  }).join('');

  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="viz-svg">${rows}</svg>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   #v11 — BOX PLOT
   Daily distribution with quartiles.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface BoxPlotDay {
  day: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export function renderBoxPlot(
  days: BoxPlotDay[],
  containerId: string,
  opts: { color?: string; width?: number; height?: number } = {}
): void {
  const container = document.getElementById(containerId);
  if (!container || days.length === 0) return;

  const color = opts.color ?? '#F59E0B';
  const W = opts.width ?? (container.clientWidth || 600);
  const H = opts.height ?? 180;
  const pad = { t: 20, r: 16, b: 40, l: 40 };

  const allValues = days.flatMap(d => [d.min, d.max]);
  const vMin = Math.min(...allValues);
  const vMax = Math.max(...allValues);
  const vSpan = Math.max(0.001, vMax - vMin);

  const barW = (W - pad.l - pad.r) / days.length * 0.6;
  const step = (W - pad.l - pad.r) / days.length;

  const vy = (v: number) => pad.t + ((vMax - v) / vSpan) * (H - pad.t - pad.b);

  const elements = days.map((d, i) => {
    const cx = pad.l + i * step + step / 2;
    const yMin = vy(d.max);
    const yMax = vy(d.min);
    const yQ1 = vy(d.q3);
    const yQ3 = vy(d.q1);
    const yMed = vy(d.median);

    return `
      <line x1="${cx}" y1="${yMin}" x2="${cx}" y2="${yMax}" stroke="#9CB8AA" stroke-width="1"/>
      <rect x="${cx - barW / 2}" y="${yQ1}" width="${barW}" height="${yQ3 - yQ1}" fill="${color}" opacity="0.55" rx="2"/>
      <line x1="${cx - barW / 2}" y1="${yMed}" x2="${cx + barW / 2}" y2="${yMed}" stroke="#fff" stroke-width="2"/>
      <text x="${cx}" y="${H - 10}" text-anchor="middle" fill="#9CB8AA" font-size="9" font-family="var(--font-mono)">${escapeHtml(d.day)}</text>
    `;
  }).join('');

  // Y-axis grid
  const grids = [0, 0.25, 0.5, 0.75, 1].map(s => {
    const y = pad.t + s * (H - pad.t - pad.b);
    const v = (vMax - s * vSpan).toFixed(1);
    return `<line x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}" stroke="#182420" stroke-width="1"/>` +
           `<text x="${pad.l - 6}" y="${y + 3}" text-anchor="end" fill="#9CB8AA" font-size="9" font-family="var(--font-mono)">${v}</text>`;
  }).join('');

  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="viz-svg">${grids}${elements}</svg>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   #v9 — HEATMAP STRIP
   Hour × day matrix.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface HeatmapCell {
  dow: string;
  hour: number;
  value: number;
}

export function renderHeatmap(
  cells: HeatmapCell[],
  containerId: string,
  opts: { width?: number; height?: number; colorRange?: string[] } = {}
): void {
  const container = document.getElementById(containerId);
  if (!container || cells.length === 0) return;

  const W = opts.width ?? (container.clientWidth || 600);
  const H = opts.height ?? 100;
  const colorRange = opts.colorRange ?? ['#0a1a12', '#1a4030', '#4aB070', '#F59E0B'];

  const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const cellW = (W - 40) / 24;
  const cellH = (H - 30) / 7;

  const allValues = cells.map(c => c.value);
  const vMin = Math.min(...allValues);
  const vMax = Math.max(...allValues);
  const vSpan = Math.max(0.001, vMax - vMin);

  const colorFor = (v: number) => {
    const t = (v - vMin) / vSpan;
    const idx = Math.min(colorRange.length - 1, Math.floor(t * colorRange.length));
    return colorRange[idx];
  };

  const rects = cells.map(c => {
    const col = c.hour;
    const row = dows.indexOf(c.dow);
    if (row < 0) return '';
    const x = 30 + col * cellW;
    const y = 20 + row * cellH;
    return `<rect x="${x}" y="${y}" width="${cellW - 1}" height="${cellH - 1}" fill="${colorFor(c.value)}" rx="1"/>`;
  }).join('');

  // Hour labels
  const hourLabels = hours.filter(h => h % 4 === 0).map(h => {
    const x = 30 + h * cellW + cellW / 2;
    return `<text x="${x}" y="${H - 4}" text-anchor="middle" fill="#9CB8AA" font-size="8">${h}</text>`;
  }).join('');

  // Day labels
  const dayLabels = dows.map((d, i) => {
    const y = 20 + i * cellH + cellH / 2 + 3;
    return `<text x="26" y="${y}" text-anchor="end" fill="#9CB8AA" font-size="8">${d}</text>`;
  }).join('');

  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="viz-svg">${rects}${hourLabels}${dayLabels}</svg>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DECISION MARKERS
   Vertical dashed lines + dots for overlay on any time-series chart.
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderDecisionMarkers(
  decisions: HalDecision[],
  tMin: number,
  tMax: number,
  tx: (t: number) => number,
  yTop: number,
  yBottom: number
): string {
  if (!decisions.length) return '';

  return decisions
    .filter(d => {
      const t = new Date(d.timestamp).getTime();
      return t >= tMin && t <= tMax;
    })
    .map(d => {
      const x = tx(new Date(d.timestamp).getTime()).toFixed(1);
      const color = DECISION_COLORS[d.status || 'pending'] ?? DECISION_COLORS.pending;
      const opacity = (0.35 + (d.confidence ?? 0.5) * 0.65).toFixed(2);
      const label = escapeAttr(d.decision.slice(0, 60));
      const conf = ((d.confidence ?? 0) * 100).toFixed(0);
      return `<line x1="${x}" y1="${yTop}" x2="${x}" y2="${yBottom}" stroke="${color}" stroke-width="1.5" stroke-dasharray="4 3" opacity="${opacity}"><title>${label} (${conf}%)</title></line>` +
             `<circle cx="${x}" cy="${yTop + 10}" r="4" fill="${color}" stroke="var(--bg-primary)" stroke-width="1.5" opacity="${opacity}"><title>${label}</title></circle>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════════════ */

export function injectChartKitStyles(): void {
  if (document.getElementById('hal-chartkit-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-chartkit-styles';
  style.textContent = `
/* ── ChartKit base ── */
.ck-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.ck-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.ck-subtitle {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 3px;
}
.ck-device {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 3px;
}
.ck-kpi {
  text-align: right;
}
.ck-kpi-val {
  font-size: 26px;
  font-weight: 700;
  font-family: var(--font-mono);
  line-height: 1;
}
.ck-kpi-delta {
  font-size: 11px;
  color: var(--success);
  margin-top: 3px;
}
.ck-chart {
  width: 100%;
}
.ck-chart svg {
  display: block;
  width: 100%;
  height: auto;
}
.ck-stats {
  border-top: 1px solid var(--border);
  margin-top: 14px;
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ck-stat-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ck-stat-label {
  font-size: 13px;
  font-weight: 600;
}
.ck-stat-current {
  font-size: 15px;
  font-weight: 700;
  font-family: var(--font-mono);
}
.ck-stat-row {
  display: flex;
  gap: 40px;
}
.ck-stat-item label {
  display: block;
  font-size: 10px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}
.ck-stat-item strong {
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--text-primary);
}
.ck-foot {
  font-size: 10px;
  color: var(--text-secondary);
  border-top: 1px solid var(--border-subtle);
  margin-top: 12px;
  padding-top: 10px;
}

/* ── SVG chart elements ── */
.hero-svg {
  display: block;
  width: 100%;
  height: auto;
}
.og-chart {
  display: block;
  width: 100%;
  height: auto;
}
.viz-svg {
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
.sparkline-svg {
  display: inline-block;
  vertical-align: middle;
}
.chart-empty {
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 13px;
}

/* ── Dashboard Hero Card (ref code 1 style) ── */
.dhc-card {
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-primary) 55%);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  color: var(--text-primary);
}
.dhc-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-3);
}
.dhc-title {
  font-weight: 700;
  font-size: 13px;
}
.dhc-subtitle {
  color: var(--text-secondary);
  font-size: 11px;
  margin-top: 2px;
}
.dhc-kpi {
  text-align: right;
}
.dhc-kpi-val {
  font-weight: 800;
  font-size: 22px;
  font-family: var(--font-mono);
  line-height: 1;
}
.dhc-kpi-delta {
  color: var(--success);
  font-size: 10px;
  margin-top: 2px;
}
.dhc-toggles {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.dhc-toggle {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--toggle-color) 30%, var(--border));
  background: color-mix(in srgb, var(--toggle-color) 8%, var(--bg-secondary));
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.dhc-toggle.active {
  background: color-mix(in srgb, var(--toggle-color) 20%, var(--bg-secondary));
  border-color: color-mix(in srgb, var(--toggle-color) 60%, var(--border));
  color: var(--text-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--toggle-color) 15%, transparent);
}
.dhc-chart {
  width: 100%;
}
.dhc-chart svg {
  display: block;
  width: 100%;
  height: auto;
}
.dhc-stats {
  border-top: 1px solid var(--border);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.dhc-stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dhc-stats-metric {
  font-weight: 700;
  font-size: 13px;
}
.dhc-stats-current {
  font-weight: 800;
  font-size: 14px;
  font-family: var(--font-mono);
}
.dhc-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  font-size: 11px;
}
.dhc-stats-grid strong {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
}
.dhc-muted {
  color: var(--text-secondary);
  font-size: 10px;
}
.dhc-foot {
  font-size: 10px;
  color: var(--text-secondary);
  border-top: 1px solid var(--border-subtle);
  margin-top: var(--space-3);
  padding-top: var(--space-2);
}

/* ── Viz card headers ── */
.viz-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.viz-card-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.viz-card-value {
  font-size: 16px;
  font-weight: 600;
}
`;
  document.head.appendChild(style);
}
