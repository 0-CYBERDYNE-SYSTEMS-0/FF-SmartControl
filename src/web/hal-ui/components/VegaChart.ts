// Vega-Lite chart renderer — declarative visualizations for hero charts and cards

import { getStore, formatSensorValue } from '../store.js';
import type { HalSensorReading, HalDecision } from '../api.js';

export interface VegaLayer {
  deviceId: string;
  deviceName: string;
  metric: string;
  color: string;
  data: HalSensorReading[];
}

const metricConfig: Record<string, { label: string; color: string; unit: string }> = {
  temperature: { label: 'Temperature', color: '#F59E0B', unit: '°C' },
  humidity:    { label: 'Humidity',    color: '#38BDF8', unit: '%' },
  soil_moisture:{ label: 'Soil Moisture',color: '#EF4444', unit: '%' },
  water_level: { label: 'Water Level',  color: '#2563EB', unit: '%' },
  ph:          { label: 'pH',           color: '#A855F7', unit: '' },
  co2:         { label: 'CO₂',          color: '#22C55E', unit: 'ppm' },
  light:       { label: 'Light',        color: '#FACC15', unit: 'lux' },
  weight:      { label: 'Weight',       color: '#94A3B8', unit: 'kg' },
  vpd:         { label: 'VPD',          color: '#A855F7', unit: 'kPa' },
};

const DECISION_COLORS: Record<string, string> = {
  success: '#6DFF9A',
  failure: '#FF5C6C',
  pending: '#FFC857',
};

/* ─────────────── Hero Chart via Vega-Lite ─────────────── */

export function renderVegaHeroChart(
  layers: VegaLayer[],
  containerId: string,
  decisions: HalDecision[] = []
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (layers.length === 0) {
    container.innerHTML = '<div class="chart-empty">No sensor data</div>';
    return;
  }

  const store = getStore();

  // Build a single flat dataset with one row per (timestamp, metric)
  // Each metric gets its own column so they can stack
  const timeMap = new Map<number, Record<string, unknown>>();
  const allMetrics = new Set<string>();

  for (const layer of layers) {
    allMetrics.add(layer.metric);
    for (const reading of layer.data) {
      const converted = formatSensorValue(reading.value, layer.metric, store.unitSystem);
      const t = new Date(reading.timestamp).getTime();
      if (!timeMap.has(t)) {
        timeMap.set(t, { timestamp: reading.timestamp, time: t });
      }
      const row = timeMap.get(t)!;
      // If multiple devices for same metric, average them
      const existing = row[layer.metric] as number | undefined;
      if (existing !== undefined) {
        row[layer.metric] = (existing + converted.value) / 2;
      } else {
        row[layer.metric] = converted.value;
      }
    }
  }

  const values = Array.from(timeMap.values()).sort((a, b) => (a.time as number) - (b.time as number));

  // Decision annotations as small point marks (dots on top), NOT vertical rules
  const allTimes = values.map(v => v.time as number);
  const tMin = Math.min(...allTimes);
  const tMax = Math.max(...allTimes);

  const decisionPoints = decisions
    .filter(d => {
      const t = new Date(d.timestamp).getTime();
      return t >= tMin && t <= tMax;
    })
    .map(d => ({
      timestamp: d.timestamp,
      decision: d.decision.slice(0, 40),
      status: d.status || 'pending',
      confidence: d.confidence ?? 0.5,
    }));

  // Build stacked area spec — each metric is a separate layer stacked on top
  const metricList = [...allMetrics];
  const colorDomain = metricList;
  const colorRange = metricList.map(m => metricConfig[m]?.color || '#888');

  // For stacked area, we need to fold the data so each metric is a row
  const foldFields = metricList;

  const spec: Record<string, unknown> = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 280,
    background: 'transparent',
    padding: { left: 10, right: 10, top: 10, bottom: 10 },
    data: { values },
    transform: [
      { fold: foldFields, as: ['metric', 'value'] },
      { filter: 'datum.value != null' },
    ],
    layer: [
      // Stacked area — solid fills, no lines between layers
      {
        mark: { type: 'area', opacity: 0.85, line: false },
        encoding: {
          x: {
            field: 'time',
            type: 'temporal',
            title: null,
            axis: {
              grid: false,
              labelColor: '#484F58',
              tickColor: '#30363D',
              format: '%H:%M',
              domain: false,
            },
          },
          y: {
            field: 'value',
            type: 'quantitative',
            title: null,
            stack: 'zero',
            axis: {
              grid: true,
              gridColor: '#30363D',
              gridDash: [2, 3],
              labelColor: '#484F58',
              tickColor: '#30363D',
              domain: false,
            },
          },
          color: {
            field: 'metric',
            type: 'nominal',
            scale: { domain: colorDomain, range: colorRange },
            legend: { orient: 'bottom', labelColor: '#8B949E', title: null, symbolType: 'circle' },
          },
          order: { field: 'metric', type: 'nominal' },
        },
      },
      // Top line stroke for each layer (subtle, not dominant)
      {
        mark: { type: 'line', strokeWidth: 1, interpolate: 'monotone' },
        encoding: {
          x: { field: 'time', type: 'temporal', title: null, axis: null },
          y: { field: 'value', type: 'quantitative', title: null, stack: 'zero', axis: null },
          color: { field: 'metric', type: 'nominal', scale: { domain: colorDomain, range: colorRange }, legend: null },
          order: { field: 'metric', type: 'nominal' },
        },
      },
      // Decision markers — small dots on top, NO vertical rules
      ...(decisionPoints.length > 0 ? [{
        data: { values: decisionPoints },
        mark: { type: 'point', shape: 'circle', size: 60, filled: true, opacity: 0.9, stroke: '#0D1117', strokeWidth: 2 },
        encoding: {
          x: { field: 'timestamp', type: 'temporal' },
          y: { datum: 0, type: 'quantitative' },
          color: {
            field: 'status',
            type: 'nominal',
            scale: {
              domain: ['success', 'failure', 'pending'],
              range: [DECISION_COLORS.success, DECISION_COLORS.failure, DECISION_COLORS.pending],
            },
            legend: null,
          },
          tooltip: [
            { field: 'decision', type: 'nominal' },
            { field: 'status', type: 'nominal' },
            { field: 'confidence', type: 'quantitative', format: '.0%' },
          ],
        },
      }] : []),
    ],
    config: {
      view: { stroke: 'transparent' },
      axis: { domain: false },
      legend: { labelFont: 'Inter, sans-serif', labelFontSize: 11 },
      area: { line: false },
    },
  };

  embedVega(container, spec, containerId);
}

/* ─────────────── Single-metric card charts ─────────────── */

export function renderVegaAreaCard(
  data: HalSensorReading[],
  metricKey: string,
  containerId: string,
  title: string
): void {
  const container = document.getElementById(containerId);
  if (!container || data.length < 2) return;

  const store = getStore();
  const cfg = metricConfig[metricKey] || { label: metricKey, color: '#888', unit: '' };

  const values = data.map(d => {
    const converted = formatSensorValue(d.value, metricKey, store.unitSystem);
    return { time: new Date(d.timestamp).getTime(), value: converted.value };
  });

  const latest = formatSensorValue(data[data.length - 1].value, metricKey, store.unitSystem);

  const spec: Record<string, unknown> = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 100,
    background: 'transparent',
    padding: 0,
    data: { values },
    mark: { type: 'area', line: { color: cfg.color, strokeWidth: 1.5 }, color: cfg.color, opacity: 0.2, interpolate: 'monotone' },
    encoding: {
      x: { field: 'time', type: 'temporal', title: null, axis: null },
      y: { field: 'value', type: 'quantitative', title: null, axis: null },
    },
    config: { view: { stroke: 'transparent' } },
  };

  container.innerHTML = `
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml(title)}</span>
      <span class="viz-card-value text-mono" style="color:${cfg.color}">${latest.value.toFixed(1)}${latest.unit || cfg.unit}</span>
    </div>
    <div id="${containerId}-chart"></div>
  `;

  const chartEl = document.getElementById(`${containerId}-chart`);
  if (chartEl) embedVega(chartEl, spec, containerId);
}

export function renderVegaLineCard(
  data: HalSensorReading[],
  metricKey: string,
  containerId: string,
  title: string
): void {
  const container = document.getElementById(containerId);
  if (!container || data.length < 2) return;

  const store = getStore();
  const cfg = metricConfig[metricKey] || { label: metricKey, color: '#888', unit: '' };

  const values = data.map(d => {
    const converted = formatSensorValue(d.value, metricKey, store.unitSystem);
    return { time: new Date(d.timestamp).getTime(), value: converted.value };
  });

  const latest = formatSensorValue(data[data.length - 1].value, metricKey, store.unitSystem);

  const spec: Record<string, unknown> = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 100,
    background: 'transparent',
    padding: 0,
    data: { values },
    mark: { type: 'line', color: cfg.color, strokeWidth: 1.5, interpolate: 'monotone' },
    encoding: {
      x: { field: 'time', type: 'temporal', title: null, axis: null },
      y: { field: 'value', type: 'quantitative', title: null, axis: null },
    },
    config: { view: { stroke: 'transparent' } },
  };

  container.innerHTML = `
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml(title)}</span>
      <span class="viz-card-value text-mono" style="color:${cfg.color}">${latest.value.toFixed(0)}${latest.unit || cfg.unit}</span>
    </div>
    <div id="${containerId}-chart"></div>
  `;

  const chartEl = document.getElementById(`${containerId}-chart`);
  if (chartEl) embedVega(chartEl, spec, containerId);
}

export function renderVegaBarCard(
  data: HalSensorReading[],
  metricKey: string,
  containerId: string,
  title: string
): void {
  const container = document.getElementById(containerId);
  if (!container || data.length < 2) return;

  const store = getStore();
  const cfg = metricConfig[metricKey] || { label: metricKey, color: '#888', unit: '' };

  const values = data.slice(-24).map((d, i) => {
    const converted = formatSensorValue(d.value, metricKey, store.unitSystem);
    return { bucket: i, value: converted.value };
  });

  const latest = formatSensorValue(data[data.length - 1].value, metricKey, store.unitSystem);

  const spec: Record<string, unknown> = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 100,
    background: 'transparent',
    padding: 0,
    data: { values },
    mark: { type: 'bar', color: cfg.color, opacity: 0.7, cornerRadiusEnd: 2 },
    encoding: {
      x: { field: 'bucket', type: 'ordinal', title: null, axis: null },
      y: { field: 'value', type: 'quantitative', title: null, axis: null },
    },
    config: { view: { stroke: 'transparent' } },
  };

  container.innerHTML = `
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml(title)}</span>
      <span class="viz-card-value text-mono" style="color:${cfg.color}">${latest.value.toFixed(0)}${latest.unit || cfg.unit}</span>
    </div>
    <div id="${containerId}-chart"></div>
  `;

  const chartEl = document.getElementById(`${containerId}-chart`);
  if (chartEl) embedVega(chartEl, spec, containerId);
}

/* ─────────────── Sparkline via Vega-Lite ─────────────── */

export function renderVegaSparkline(
  data: number[],
  color: string,
  containerId: string
): void {
  const container = document.getElementById(containerId);
  if (!container || data.length < 2) {
    if (container) container.innerHTML = '<span class="text-xs text-secondary">--</span>';
    return;
  }

  const values = data.map((v, i) => ({ x: i, y: v }));

  const spec: Record<string, unknown> = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 80,
    height: 24,
    background: 'transparent',
    padding: 0,
    data: { values },
    mark: { type: 'line', color, strokeWidth: 1.5, interpolate: 'monotone' },
    encoding: {
      x: { field: 'x', type: 'quantitative', title: null, axis: null },
      y: { field: 'y', type: 'quantitative', title: null, axis: null },
    },
    config: { view: { stroke: 'transparent' } },
  };

  embedVega(container, spec, containerId);
}

/* ─────────────── Vega-Embed wrapper ─────────────── */

function embedVega(
  el: HTMLElement,
  spec: Record<string, unknown>,
  id: string
): void {
  const embedId = `vega-${id}`;
  el.id = embedId;

  // Wait for Vega libraries to load
  if (typeof (window as unknown as Record<string, unknown>).vegaEmbed === 'undefined') {
    el.innerHTML = '<div class="chart-empty">Loading chart library...</div>';
    // Retry after 500ms
    setTimeout(() => embedVega(el, spec, id), 500);
    return;
  }

  const vegaEmbed = (window as unknown as Record<string, unknown>).vegaEmbed as (
    selector: string,
    spec: Record<string, unknown>,
    opts?: Record<string, unknown>
  ) => Promise<unknown>;

  void vegaEmbed(`#${embedId}`, spec, {
    actions: false,
    renderer: 'svg',
    logLevel: 0,
  }).catch((err: Error) => {
    console.error('Vega embed failed:', err);
    el.innerHTML = '<div class="chart-empty">Chart failed to render</div>';
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
