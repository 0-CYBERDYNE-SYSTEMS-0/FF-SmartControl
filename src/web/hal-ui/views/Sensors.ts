// Sensors view — hero multi-layer chart + advanced visualization cards
// Toggle any metric on/off to add/remove layers from the hero chart
// Cards: area, line, bar, gauge, heatmap

import { getStore, setStore, formatSensorValue, formatTimeValue, formatDateTimeValue } from '../store.js';
import { halApi, HalSensorReading } from '../api.js';

type MetricKey = 'temperature' | 'humidity' | 'soil_moisture' | 'light' | 'co2' | 'water_level' | 'ph' | 'weight';

interface MetricConfig {
  key: MetricKey;
  label: string;
  shortLabel: string;
  fallbackUnit: string;
  color: string;
  description: string;
  minAxis: number;
  maxAxis: number;
}

interface SeriesLayer {
  deviceId: string;
  deviceName: string;
  metric: MetricConfig;
  data: HalSensorReading[];
}

const metrics: MetricConfig[] = [
  { key: 'temperature', label: 'Temperature', shortLabel: 'Temp', fallbackUnit: '°C', color: '#F59E0B', description: 'Air / probe temperature', minAxis: 10, maxAxis: 40 },
  { key: 'humidity', label: 'Humidity', shortLabel: 'RH', fallbackUnit: '%', color: '#38BDF8', description: 'Relative humidity', minAxis: 0, maxAxis: 100 },
  { key: 'soil_moisture', label: 'Soil Moisture', shortLabel: 'Soil', fallbackUnit: '%', color: '#EF4444', description: 'Volumetric water content', minAxis: 0, maxAxis: 100 },
  { key: 'co2', label: 'CO₂', shortLabel: 'CO₂', fallbackUnit: 'ppm', color: '#22C55E', description: 'Carbon dioxide', minAxis: 0, maxAxis: 2000 },
  { key: 'light', label: 'Light', shortLabel: 'Light', fallbackUnit: 'lux', color: '#FACC15', description: 'PAR / illuminance', minAxis: 0, maxAxis: 100000 },
  { key: 'water_level', label: 'Water Level', shortLabel: 'Water', fallbackUnit: '%', color: '#2563EB', description: 'Reservoir level', minAxis: 0, maxAxis: 100 },
  { key: 'ph', label: 'pH', shortLabel: 'pH', fallbackUnit: '', color: '#A855F7', description: 'Acidity / alkalinity', minAxis: 0, maxAxis: 14 },
  { key: 'weight', label: 'Weight', shortLabel: 'Weight', fallbackUnit: 'kg', color: '#94A3B8', description: 'Load cell', minAxis: 0, maxAxis: 100 },
];

const viewState = {
  deviceId: 'all',
  range: '24H' as '1H' | '6H' | '24H' | '7D' | '30D',
  activeMetrics: new Set<MetricKey>(['temperature', 'humidity', 'co2']),
};

let loadSequence = 0;

export async function renderSensors(container: HTMLElement): Promise<void> {
  const store = getStore();
  const sensors = store.devices.filter(d => d.type === 'sensor');
  const validDeviceIds = new Set(['all', ...sensors.map(s => s.id)]);
  if (!validDeviceIds.has(viewState.deviceId)) viewState.deviceId = 'all';

  container.innerHTML = `
    <div class="sensors-hero">
      <div class="sensors-hero-header">
        <div class="sensors-hero-title">
          <h1 class="page-title">Sensors</h1>
          <p class="page-subtitle">Environmental telemetry</p>
        </div>
        <div class="sensors-hero-controls">
          <select class="hal-input" id="sensor-device-select">
            <option value="all" ${viewState.deviceId === 'all' ? 'selected' : ''}>All Devices</option>
            ${sensors.map(s => `<option value="${s.id}" ${viewState.deviceId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
          </select>
          <div class="time-range-group" role="group">
            ${(['1H','6H','24H','7D','30D'] as const).map(r =>
              `<button class="hal-range-btn ${r === viewState.range ? 'active' : ''}" data-range="${r}">${r}</button>`
            ).join('')}
          </div>
          <button class="hal-range-btn" id="unit-toggle">${store.unitSystem === 'metric' ? '°C' : '°F'}</button>
          <button class="hal-range-btn" id="time-format-toggle">${store.timeFormat === '24h' ? '24H' : '12H'}</button>
        </div>
      </div>

      <div class="metric-bar" id="metric-bar">
        ${metrics.map(m => {
          const active = viewState.activeMetrics.has(m.key);
          return `
            <button
              class="metric-pill ${active ? 'active' : ''}"
              data-metric="${m.key}"
              style="--metric-color:${m.color}"
              aria-pressed="${active ? 'true' : 'false'}"
            >
              <span class="pill-dot"></span>
              <span class="pill-label">${escapeHtml(m.shortLabel)}</span>
              <span class="pill-value" id="pill-${m.key}">--</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="hero-chart-wrap">
        <div id="hero-chart" class="hero-chart">
          <div class="chart-empty">Loading sensor data...</div>
        </div>
        <div class="hero-legend" id="hero-legend"></div>
      </div>
    </div>

    <div class="viz-grid" id="viz-grid"></div>

    <div class="sensor-detail-drawer" id="detail-drawer">
      <div class="detail-header">
        <h3 class="section-title">Readings</h3>
        <span class="text-xs text-secondary" id="detail-count">--</span>
      </div>
      <div class="detail-table-wrap">
        <table class="hal-table compact">
          <thead>
            <tr><th>Time</th><th>Device</th><th>Metric</th><th>Value</th></tr>
          </thead>
          <tbody id="detail-body">
            <tr><td colspan="4" class="empty-cell">Select metrics above</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  injectSensorStyles();
  attachHandlers(sensors);
  await loadData(sensors);
}

function attachHandlers(sensors: ReturnType<typeof getStore>['devices']): void {
  const deviceSelect = document.getElementById('sensor-device-select') as HTMLSelectElement | null;
  deviceSelect?.addEventListener('change', () => {
    viewState.deviceId = deviceSelect.value || 'all';
    void loadData(sensors);
  });

  document.querySelectorAll<HTMLButtonElement>('.hal-range-btn[data-range]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hal-range-btn[data-range]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      viewState.range = (btn.dataset.range as typeof viewState.range) || '24H';
      void loadData(sensors);
    });
  });

  const unitToggle = document.getElementById('unit-toggle');
  unitToggle?.addEventListener('click', () => {
    const store = getStore();
    const newSystem = store.unitSystem === 'metric' ? 'imperial' : 'metric';
    setStore({ unitSystem: newSystem });
    unitToggle.textContent = newSystem === 'metric' ? '°C' : '°F';
    void loadData(sensors);
  });

  const timeFormatToggle = document.getElementById('time-format-toggle');
  timeFormatToggle?.addEventListener('click', () => {
    const store = getStore();
    const newFormat = store.timeFormat === '24h' ? '12h' : '24h';
    setStore({ timeFormat: newFormat });
    timeFormatToggle.textContent = newFormat === '24h' ? '24H' : '12H';
    void loadData(sensors);
  });

  document.querySelectorAll<HTMLButtonElement>('.metric-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const metric = btn.dataset.metric as MetricKey;
      if (viewState.activeMetrics.has(metric)) {
        if (viewState.activeMetrics.size > 1) viewState.activeMetrics.delete(metric);
      } else {
        viewState.activeMetrics.add(metric);
      }
      // Re-render pills to update active state
      document.querySelectorAll('.metric-pill').forEach(pill => {
        const key = pill.dataset.metric as MetricKey;
        pill.classList.toggle('active', viewState.activeMetrics.has(key));
        pill.setAttribute('aria-pressed', viewState.activeMetrics.has(key) ? 'true' : 'false');
      });
      void loadData(sensors);
    });
  });
}

async function loadData(sensors: ReturnType<typeof getStore>['devices']): Promise<void> {
  const sequence = ++loadSequence;
  const selectedDevices = viewState.deviceId === 'all'
    ? sensors
    : sensors.filter(s => s.id === viewState.deviceId);
  const activeMetricConfigs = metrics.filter(m => viewState.activeMetrics.has(m.key));
  const { from, to } = getRangeBounds(viewState.range);

  const heroChart = document.getElementById('hero-chart');
  if (heroChart) heroChart.innerHTML = '<div class="chart-empty">Loading...</div>';

  try {
    const layers: SeriesLayer[] = [];
    await Promise.all(selectedDevices.flatMap(device =>
      activeMetricConfigs.map(async metric => {
        const data = await halApi.getSensorHistory(device.id, metric.key, from, to);
        if (data.length > 0) layers.push({ deviceId: device.id, deviceName: device.name, metric, data });
      })
    ));

    if (sequence !== loadSequence) return;

    renderHeroChart(layers);
    renderDetailTable(layers);
    updatePillValues(layers);
    renderVizCards(layers);
  } catch (err: any) {
    console.error('Sensor load failed:', err);
    if (heroChart) heroChart.innerHTML = '<div class="chart-empty">Failed to load</div>';
  }
}

function getRangeBounds(range: typeof viewState.range): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  switch (range) {
    case '1H': from.setHours(from.getHours() - 1); break;
    case '6H': from.setHours(from.getHours() - 6); break;
    case '7D': from.setDate(from.getDate() - 7); break;
    case '30D': from.setDate(from.getDate() - 30); break;
    default: from.setDate(from.getDate() - 1); break;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

/* ─────────────── Hero Chart (single multi-layer SVG) ─────────────── */

function renderHeroChart(layers: SeriesLayer[]): void {
  const container = document.getElementById('hero-chart');
  const legend = document.getElementById('hero-legend');
  if (!container) return;

  if (layers.length === 0) {
    container.innerHTML = '<div class="chart-empty">No data for selection</div>';
    if (legend) legend.innerHTML = '';
    return;
  }

  const store = getStore();
  const width = 900;
  const height = 320;
  const pad = { top: 24, right: 24, bottom: 36, left: 52 };

  // Determine unified time domain across all layers
  const allTimes = layers.flatMap(l => l.data.map(d => new Date(d.timestamp).getTime()));
  const tMin = Math.min(...allTimes);
  const tMax = Math.max(...allTimes);
  const tSpan = Math.max(1, tMax - tMin);

  const tx = (t: number) => pad.left + ((t - tMin) / tSpan) * (width - pad.left - pad.right);

  // Build each layer's normalized path (0-1 based on its metric's axis)
  const layerPaths = layers.map(layer => {
    const cfg = layer.metric;
    let axisMin = cfg.minAxis;
    let axisMax = cfg.maxAxis;
    if (cfg.key === 'temperature' && store.unitSystem === 'imperial') {
      axisMin = (axisMin * 9 / 5) + 32;
      axisMax = (axisMax * 9 / 5) + 32;
    }
    if (cfg.key === 'weight' && store.unitSystem === 'imperial') {
      axisMin = axisMin * 2.20462;
      axisMax = axisMax * 2.20462;
    }
    const vSpan = Math.max(1, axisMax - axisMin);

    const points = layer.data.map(d => {
      const v = formatSensorValue(d.value, cfg.key, store.unitSystem).value;
      const t = new Date(d.timestamp).getTime();
      const x = tx(t);
      const y = pad.top + ((axisMax - v) / vSpan) * (height - pad.top - pad.bottom);
      return { x, y, v, t, raw: d };
    });

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${points[points.length - 1].x.toFixed(1)},${height - pad.bottom} L${points[0].x.toFixed(1)},${height - pad.bottom} Z`;

    return { layer, points, line, area, axisMin, axisMax, vSpan };
  });

  // Grid lines (5 horizontal)
  const gridLines = [];
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (i / 5) * (height - pad.top - pad.bottom);
    gridLines.push(`<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="chart-grid" />`);
  }

  // Time axis labels
  const timeLabels = [];
  const timeSteps = 6;
  for (let i = 0; i <= timeSteps; i++) {
    const t = tMin + (i / timeSteps) * tSpan;
    const x = tx(t);
    const label = formatTimeValue(new Date(t), store.timeFormat);
    timeLabels.push(`<text x="${x}" y="${height - 8}" class="chart-label" text-anchor="middle">${label}</text>`);
  }

  // Left axis label (first active metric)
  const primary = layerPaths[0];
  const leftAxisLabels = [];
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (i / 5) * (height - pad.top - pad.bottom);
    const v = primary.axisMax - (i / 5) * primary.vSpan;
    const precision = primary.layer.metric.key === 'co2' ? 0 : 1;
    leftAxisLabels.push(`<text x="${pad.left - 8}" y="${y + 4}" class="chart-label" text-anchor="end">${v.toFixed(precision)}</text>`);
  }

  // Right axis label (if second metric differs)
  let rightAxisLabels = '';
  if (layerPaths.length > 1 && layerPaths[1].layer.metric.key !== primary.layer.metric.key) {
    const sec = layerPaths[1];
    const labels = [];
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (i / 5) * (height - pad.top - pad.bottom);
      const v = sec.axisMax - (i / 5) * sec.vSpan;
      const precision = sec.layer.metric.key === 'co2' ? 0 : 1;
      labels.push(`<text x="${width - pad.right + 8}" y="${y + 4}" class="chart-label" style="fill:${sec.layer.metric.color}">${v.toFixed(precision)}</text>`);
    }
    rightAxisLabels = labels.join('');
  }

  // SVG content
  const defs = layerPaths.map((lp, i) => {
    const gradId = `hero-grad-${i}`;
    return `
      <linearGradient id="${gradId}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${lp.layer.metric.color}" stop-opacity="0.28" />
        <stop offset="100%" stop-color="${lp.layer.metric.color}" stop-opacity="0.02" />
      </linearGradient>
    `;
  }).join('');

  const areas = layerPaths.map((lp, i) =>
    `<path d="${lp.area}" fill="url(#hero-grad-${i})" stroke="none" />`
  ).join('');

  const lines = layerPaths.map(lp =>
    `<path d="${lp.line}" fill="none" stroke="${lp.layer.metric.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`
  ).join('');

  const dots = layerPaths.flatMap(lp => {
    const last = lp.points[lp.points.length - 1];
    return [
      `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4" fill="${lp.layer.metric.color}" stroke="var(--bg-primary)" stroke-width="2" />`,
    ];
  }).join('');

  container.innerHTML = `
    <svg class="hero-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <defs>${defs}</defs>
      ${gridLines.join('')}
      ${areas}
      ${lines}
      ${dots}
      ${leftAxisLabels.join('')}
      ${rightAxisLabels}
      ${timeLabels.join('')}
    </svg>
  `;

  // Legend
  if (legend) {
    legend.innerHTML = layerPaths.map(lp => `
      <span class="legend-item" style="--metric-color:${lp.layer.metric.color}">
        <span class="legend-dot"></span>
        ${escapeHtml(lp.layer.metric.label)} (${escapeHtml(lp.layer.deviceName)})
      </span>
    `).join('');
  }
}

/* ─────────────── Detail table ─────────────── */

function renderDetailTable(layers: SeriesLayer[]): void {
  const tbody = document.getElementById('detail-body');
  const count = document.getElementById('detail-count');
  if (!tbody) return;

  const store = getStore();
  const rows = layers.flatMap(layer =>
    layer.data.slice(-15).map(reading => {
      const converted = formatSensorValue(reading.value, layer.metric.key, store.unitSystem);
      return {
        time: reading.timestamp,
        device: layer.deviceName,
        metric: layer.metric.label,
        value: formatValue(converted.value, converted.unit || layer.metric.fallbackUnit),
        color: layer.metric.color,
      };
    })
  ).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  if (count) count.textContent = `${rows.length} readings`;

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No data</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr style="--metric-color:${r.color}">
      <td class="text-mono text-xs">${formatDateTimeValue(new Date(r.time), store.timeFormat)}</td>
      <td>${escapeHtml(r.device)}</td>
      <td><span class="history-dot"></span>${escapeHtml(r.metric)}</td>
      <td class="text-mono metric-value">${r.value}</td>
    </tr>
  `).join('');
}

/* ─────────────── Pill live values ─────────────── */

function updatePillValues(layers: SeriesLayer[]): void {
  const store = getStore();
  metrics.forEach(m => {
    const el = document.getElementById(`pill-${m.key}`);
    if (!el) return;
    const layer = layers.find(l => l.metric.key === m.key);
    if (!layer || layer.data.length === 0) {
      el.textContent = '--';
      return;
    }
    const latest = layer.data[layer.data.length - 1];
    const converted = formatSensorValue(latest.value, m.key, store.unitSystem);
    el.textContent = formatValue(converted.value, converted.unit || m.fallbackUnit);
  });
}

/* ─────────────── Viz Cards ─────────────── */

function renderVizCards(allLayers: SeriesLayer[]): void {
  const grid = document.getElementById('viz-grid');
  if (!grid) return;
  if (allLayers.length === 0) { grid.innerHTML = ''; return; }

  const store = getStore();
  const byMetric = new Map<string, SeriesLayer[]>();
  for (const layer of allLayers) {
    const list = byMetric.get(layer.metric.key) || [];
    list.push(layer);
    byMetric.set(layer.metric.key, list);
  }

  const cards: string[] = [];

  // 1. Area card — temperature
  const tempLayers = byMetric.get('temperature');
  if (tempLayers) cards.push(renderAreaCard(tempLayers[0], 'Temperature Trend'));

  // 2. Line card — humidity
  const humLayers = byMetric.get('humidity');
  if (humLayers) cards.push(renderLineCard(humLayers[0], 'Humidity Trend'));

  // 3. Bar card — CO2
  const co2Layers = byMetric.get('co2');
  if (co2Layers) cards.push(renderBarCard(co2Layers[0], 'CO₂ Levels'));

  // 4. Gauge card — latest value of any metric
  const first = allLayers[0];
  if (first) cards.push(renderGaugeCard(first, 'Latest Reading'));

  // 5. Heatmap card — all metrics x last 24h buckets
  cards.push(renderHeatmapCard(allLayers, '24h Activity'));

  grid.innerHTML = cards.join('');
}

function renderAreaCard(layer: SeriesLayer, title: string): string {
  const { data, metric } = layer;
  const store = getStore();
  const w = 340, h = 120, pad = { t: 8, r: 8, b: 20, l: 32 };
  const times = data.map(d => new Date(d.timestamp).getTime());
  const tMin = Math.min(...times), tMax = Math.max(...times);
  const tSpan = Math.max(1, tMax - tMin);
  const tx = (t: number) => pad.l + ((t - tMin) / tSpan) * (w - pad.l - pad.r);
  let axisMin = metric.minAxis, axisMax = metric.maxAxis;
  if (metric.key === 'temperature' && store.unitSystem === 'imperial') { axisMin = (axisMin * 9 / 5) + 32; axisMax = (axisMax * 9 / 5) + 32; }
  const vSpan = Math.max(1, axisMax - axisMin);
  const points = data.map(d => {
    const v = formatSensorValue(d.value, metric.key, store.unitSystem).value;
    return { x: tx(new Date(d.timestamp).getTime()), y: pad.t + ((axisMax - v) / vSpan) * (h - pad.t - pad.b) };
  });
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${h - pad.b} L${points[0].x.toFixed(1)},${h - pad.b} Z`;
  const latest = data[data.length - 1];
  const latestVal = formatSensorValue(latest.value, metric.key, store.unitSystem);
  const unit = latestVal.unit || metric.fallbackUnit;
  return `
    <div class="viz-card">
      <div class="viz-card-header">
        <span class="viz-card-title">${escapeHtml(title)}</span>
        <span class="viz-card-value text-mono" style="color:${metric.color}">${latestVal.value.toFixed(1)}${unit}</span>
      </div>
      <svg viewBox="0 0 ${w} ${h}" class="viz-svg">
        <defs><linearGradient id="area-grad-${metric.key}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${metric.color}" stop-opacity="0.25"/><stop offset="100%" stop-color="${metric.color}" stop-opacity="0.02"/></linearGradient></defs>
        <path d="${area}" fill="url(#area-grad-${metric.key})" stroke="none"/>
        <path d="${line}" fill="none" stroke="${metric.color}" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    </div>`;
}

function renderLineCard(layer: SeriesLayer, title: string): string {
  const { data, metric } = layer;
  const store = getStore();
  const w = 340, h = 120, pad = { t: 8, r: 8, b: 20, l: 32 };
  const times = data.map(d => new Date(d.timestamp).getTime());
  const tMin = Math.min(...times), tMax = Math.max(...times);
  const tSpan = Math.max(1, tMax - tMin);
  const tx = (t: number) => pad.l + ((t - tMin) / tSpan) * (w - pad.l - pad.r);
  const axisMin = metric.minAxis, axisMax = metric.maxAxis;
  const vSpan = Math.max(1, axisMax - axisMin);
  const pts = data.map(d => {
    const v = formatSensorValue(d.value, metric.key, store.unitSystem).value;
    return `${tx(new Date(d.timestamp).getTime()).toFixed(1)},${(pad.t + ((axisMax - v) / vSpan) * (h - pad.t - pad.b)).toFixed(1)}`;
  }).join(' ');
  const latest = data[data.length - 1];
  const latestVal = formatSensorValue(latest.value, metric.key, store.unitSystem);
  const unit = latestVal.unit || metric.fallbackUnit;
  return `
    <div class="viz-card">
      <div class="viz-card-header">
        <span class="viz-card-title">${escapeHtml(title)}</span>
        <span class="viz-card-value text-mono" style="color:${metric.color}">${latestVal.value.toFixed(0)}${unit}</span>
      </div>
      <svg viewBox="0 0 ${w} ${h}" class="viz-svg">
        <polyline points="${pts}" fill="none" stroke="${metric.color}" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    </div>`;
}

function renderBarCard(layer: SeriesLayer, title: string): string {
  const { data, metric } = layer;
  const store = getStore();
  const w = 340, h = 120, pad = { t: 8, r: 8, b: 20, l: 32 };
  const bars = Math.min(data.length, 24);
  const step = (w - pad.l - pad.r) / bars;
  const barW = step * 0.7;
  const axisMin = metric.minAxis, axisMax = metric.maxAxis;
  const vSpan = Math.max(1, axisMax - axisMin);
  const rects = data.slice(-bars).map((d, i) => {
    const v = formatSensorValue(d.value, metric.key, store.unitSystem).value;
    const bh = ((v - axisMin) / vSpan) * (h - pad.t - pad.b);
    const x = pad.l + i * step + (step - barW) / 2;
    const y = h - pad.b - bh;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${metric.color}" opacity="0.7" rx="2"/>`;
  }).join('');
  const latest = data[data.length - 1];
  const latestVal = formatSensorValue(latest.value, metric.key, store.unitSystem);
  const unit = latestVal.unit || metric.fallbackUnit;
  return `
    <div class="viz-card">
      <div class="viz-card-header">
        <span class="viz-card-title">${escapeHtml(title)}</span>
        <span class="viz-card-value text-mono" style="color:${metric.color}">${latestVal.value.toFixed(0)}${unit}</span>
      </div>
      <svg viewBox="0 0 ${w} ${h}" class="viz-svg">${rects}</svg>
    </div>`;
}

function renderGaugeCard(layer: SeriesLayer, title: string): string {
  const { data, metric } = layer;
  const store = getStore();
  const latest = formatSensorValue(data[data.length - 1].value, metric.key, store.unitSystem);
  const unit = latest.unit || metric.fallbackUnit;
  const pct = Math.max(0, Math.min(1, (latest.value - metric.minAxis) / (metric.maxAxis - metric.minAxis)));
  const r = 42, cx = 80, cy = 56;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return `
    <div class="viz-card">
      <div class="viz-card-header">
        <span class="viz-card-title">${escapeHtml(title)}</span>
        <span class="viz-card-value text-mono" style="color:${metric.color}">${latest.value.toFixed(1)}${unit}</span>
      </div>
      <svg viewBox="0 0 160 100" class="viz-svg gauge-svg">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="8"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${metric.color}" stroke-width="8" stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" stroke-dashoffset="0" transform="rotate(-90 ${cx} ${cy})"/>
        <text x="${cx}" y="${cy + 6}" text-anchor="middle" fill="${metric.color}" font-size="18" font-weight="600" font-family="var(--font-mono)">${(pct * 100).toFixed(0)}%</text>
      </svg>
    </div>`;
}

function renderHeatmapCard(layers: SeriesLayer[], title: string): string {
  const store = getStore();
  const buckets = 12;
  const now = Date.now();
  const bucketMs = (24 * 60 * 60 * 1000) / buckets;
  const cells: string[] = [];
  for (let b = 0; b < buckets; b++) {
    const bStart = now - (buckets - b) * bucketMs;
    const bEnd = bStart + bucketMs;
    let sum = 0, count = 0;
    for (const layer of layers) {
      for (const d of layer.data) {
        const t = new Date(d.timestamp).getTime();
        if (t >= bStart && t < bEnd) {
          const v = formatSensorValue(d.value, layer.metric.key, store.unitSystem).value;
          sum += v; count++;
        }
      }
    }
    const avg = count > 0 ? sum / count : 0;
    const intensity = count > 0 ? Math.min(1, avg / 100) : 0;
    const color = count === 0 ? 'var(--bg-tertiary)' : `color-mix(in srgb, var(--accent) ${(intensity * 100).toFixed(0)}%, var(--bg-tertiary))`;
    cells.push(`<div class="hm-cell" style="background:${color}" title="${count} readings, avg ${avg.toFixed(1)}"></div>`);
  }
  return `
    <div class="viz-card wide">
      <div class="viz-card-header">
        <span class="viz-card-title">${escapeHtml(title)}</span>
        <span class="viz-card-value text-mono text-secondary">${layers.length} layers</span>
      </div>
      <div class="hm-grid">${cells.join('')}</div>
      <div class="hm-labels">
        <span class="text-xs text-secondary">-24h</span>
        <span class="text-xs text-secondary">-12h</span>
        <span class="text-xs text-secondary">now</span>
      </div>
    </div>`;
}

/* ─────────────── Helpers ─────────────── */

function formatValue(value: number, unit: string): string {
  const precision = Math.abs(value) >= 100 ? 0 : value % 1 === 0 ? 0 : 1;
  return `${value.toFixed(precision)}${unit}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ─────────────── Styles ─────────────── */

function injectSensorStyles(): void {
  if (document.getElementById('hal-sensors-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-sensors-styles';
  style.textContent = `
.sensors-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.sensors-hero-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.sensors-hero-title .page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}
.sensors-hero-title .page-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 2px 0 0;
}
.sensors-hero-controls {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.hal-input {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 32px;
  padding: 0 var(--space-3);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}
.hal-input:focus { border-color: var(--accent); }
.time-range-group {
  display: flex;
  gap: 2px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px;
}
.hal-range-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.hal-range-btn.active,
.hal-range-btn:hover {
  background: var(--accent);
  color: var(--on-accent);
}
.metric-bar {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding: var(--space-2) 0;
}
.metric-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--metric-color) 25%, var(--border));
  background: color-mix(in srgb, var(--metric-color) 6%, var(--bg-secondary));
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all var(--transition-fast);
  user-select: none;
}
.metric-pill.active {
  background: color-mix(in srgb, var(--metric-color) 18%, var(--bg-secondary));
  border-color: color-mix(in srgb, var(--metric-color) 60%, var(--border));
  color: var(--text-primary);
  box-shadow: 0 0 12px color-mix(in srgb, var(--metric-color) 20%, transparent);
}
.metric-pill:hover {
  border-color: color-mix(in srgb, var(--metric-color) 50%, var(--border));
}
.pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--metric-color);
}
.pill-label {
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.pill-value {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--metric-color);
  margin-left: 2px;
}
.hero-chart-wrap {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  overflow: hidden;
}
.hero-chart {
  width: 100%;
  min-height: 260px;
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
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 13px;
}
.hero-legend {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-subtle);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--metric-color);
}
/* Viz cards */
.viz-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-top: var(--space-6);
}
.viz-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.viz-card.wide {
  grid-column: span 2;
}
.viz-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
.viz-svg {
  display: block;
  width: 100%;
  height: auto;
}
.gauge-svg {
  max-height: 100px;
}
.hm-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 3px;
  height: 40px;
}
.hm-cell {
  border-radius: var(--radius-sm);
  min-height: 8px;
}
.hm-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
}
.sensor-detail-drawer {
  margin-top: var(--space-4);
}
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}
.detail-table-wrap {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.hal-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.hal-table th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  color: var(--text-tertiary);
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--bg-tertiary);
}
.hal-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
}
.hal-table tr:last-child td { border-bottom: none; }
.hal-table tr:hover td { background: var(--bg-tertiary); }
.metric-value { color: var(--metric-color); }
.history-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--metric-color);
  margin-right: 6px;
}
.empty-cell {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
}
@media (max-width: 1023px) {
  .viz-grid { grid-template-columns: repeat(2, 1fr); }
  .viz-card.wide { grid-column: span 2; }
}
@media (max-width: 768px) {
  .sensors-hero-header { flex-direction: column; align-items: flex-start; }
  .hero-chart { min-height: 200px; }
  .metric-bar { gap: var(--space-1); }
  .metric-pill { height: 32px; padding: 0 10px; font-size: 11px; }
  .viz-grid { grid-template-columns: 1fr; }
  .viz-card.wide { grid-column: span 1; }
}
`;
  document.head.appendChild(style);
}
