// Environment chart helpers for FF_SmartControl HAL UI.
// Pure SVG renderers; no runtime chart dependencies.

import { formatTimeValue, getStore } from '../store.js';

export type EnvironmentMetricKey =
  | 'temperature'
  | 'humidity'
  | 'co2'
  | 'soil_moisture'
  | 'light'
  | 'water_level'
  | 'ph'
  | 'weight';

export interface EnvironmentMetric {
  key: string;
  label: string;
  color: string;
  unit: string;
  data: Array<{ t: number; v: number }>;
}

export interface EnvironmentZone {
  zoneName: string;
  metrics: EnvironmentMetric[];
}

export interface SafetyDenialPoint {
  createdAt: string;
}

export interface SafetyThresholdBar {
  id: string;
  label: string;
  scope: string;
  metric: string;
  color: string;
  unit: string;
  currentValue: number | null;
  minValue: number | null;
  maxValue: number | null;
  axisMin: number;
  axisMax: number;
  enabled: boolean;
}

interface MetricMeta {
  key: EnvironmentMetricKey;
  label: string;
  shortLabel: string;
  color: string;
  unit: string;
  minAxis: number;
  maxAxis: number;
  targetMin?: number;
  targetMax?: number;
}

const METRIC_META: Record<string, MetricMeta> = {
  temperature: {
    key: 'temperature',
    label: 'Temperature',
    shortLabel: 'Temp',
    color: '#F59E0B',
    unit: '°C',
    minAxis: 10,
    maxAxis: 40,
    targetMin: 20,
    targetMax: 28,
  },
  humidity: {
    key: 'humidity',
    label: 'Humidity',
    shortLabel: 'RH',
    color: '#38BDF8',
    unit: '%',
    minAxis: 0,
    maxAxis: 100,
    targetMin: 45,
    targetMax: 65,
  },
  co2: {
    key: 'co2',
    label: 'CO₂',
    shortLabel: 'CO₂',
    color: '#22C55E',
    unit: 'ppm',
    minAxis: 400,
    maxAxis: 1600,
    targetMin: 700,
    targetMax: 1200,
  },
  soil_moisture: {
    key: 'soil_moisture',
    label: 'Soil Moisture',
    shortLabel: 'Soil',
    color: '#EF4444',
    unit: '%',
    minAxis: 0,
    maxAxis: 100,
  },
  light: {
    key: 'light',
    label: 'Light',
    shortLabel: 'Light',
    color: '#FACC15',
    unit: 'lux',
    minAxis: 0,
    maxAxis: 100000,
  },
  water_level: {
    key: 'water_level',
    label: 'Water Level',
    shortLabel: 'Water',
    color: '#2563EB',
    unit: '%',
    minAxis: 0,
    maxAxis: 100,
  },
  ph: {
    key: 'ph',
    label: 'pH',
    shortLabel: 'pH',
    color: '#A855F7',
    unit: '',
    minAxis: 0,
    maxAxis: 14,
  },
  weight: {
    key: 'weight',
    label: 'Weight',
    shortLabel: 'Weight',
    color: '#94A3B8',
    unit: 'kg',
    minAxis: 0,
    maxAxis: 100,
  },
};

export const DEFAULT_OVERVIEW_METRICS = [
  'temperature',
  'humidity',
  'co2',
] as const;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function metricMeta(key: string): MetricMeta {
  return (
    METRIC_META[key] ?? {
      key: key as EnvironmentMetricKey,
      label: key,
      shortLabel: key,
      color: '#94A3B8',
      unit: '',
      minAxis: 0,
      maxAxis: 100,
    }
  );
}

function isDrawableValue(value: number): boolean {
  // Environmental charts should never imply missing sensor data by drawing zero.
  return Number.isFinite(value) && value !== 0;
}

function cleanData(
  data: Array<{ t: number; v: number }>,
): Array<{ t: number; v: number }> {
  return data
    .filter((point) => Number.isFinite(point.t) && isDrawableValue(point.v))
    .sort((a, b) => a.t - b.t);
}

function formatMetricValue(metric: EnvironmentMetric, value: number): string {
  const precision = metric.key === 'co2' || Math.abs(value) >= 100 ? 0 : 1;
  return `${value.toFixed(precision)}${metric.unit}`;
}

function normalizeValue(metric: EnvironmentMetric, value: number): number {
  const meta = metricMeta(metric.key);
  let minAxis = meta.minAxis;
  let maxAxis = meta.maxAxis;
  if (metric.key === 'temperature' && getStore().unitSystem === 'imperial') {
    minAxis = (minAxis * 9) / 5 + 32;
    maxAxis = (maxAxis * 9) / 5 + 32;
  }
  const span = Math.max(1, maxAxis - minAxis);
  return Math.max(0, Math.min(1, (value - minAxis) / span));
}

function monotonePath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} L${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`;
  }

  let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    path += ` C${midX.toFixed(1)},${current.y.toFixed(1)} ${midX.toFixed(1)},${next.y.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`;
  }
  return path;
}

function aggregateZones(zones: EnvironmentZone[]): EnvironmentZone {
  const metricKeys = Array.from(
    new Set(zones.flatMap((zone) => zone.metrics.map((metric) => metric.key))),
  );

  const metrics = metricKeys.map((key) => {
    const meta = metricMeta(key);
    const buckets = new Map<number, { sum: number; count: number }>();

    for (const zone of zones) {
      const metric = zone.metrics.find((candidate) => candidate.key === key);
      if (!metric) continue;
      for (const point of cleanData(metric.data)) {
        const bucket = buckets.get(point.t) ?? { sum: 0, count: 0 };
        bucket.sum += point.v;
        bucket.count++;
        buckets.set(point.t, bucket);
      }
    }

    const unitFromZones =
      zones.flatMap((z) => z.metrics).find((m) => m.key === key)?.unit ??
      meta.unit;
    return {
      key,
      label: meta.label,
      color: meta.color,
      unit: unitFromZones,
      data: Array.from(buckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([t, bucket]) => ({
          t,
          v: bucket.count > 0 ? bucket.sum / bucket.count : 0,
        }))
        .filter((point) => isDrawableValue(point.v)),
    };
  });

  return { zoneName: 'All Zones', metrics };
}

function getActiveMetrics(
  zone: EnvironmentZone,
  activeKeys: Set<string>,
): EnvironmentMetric[] {
  return DEFAULT_OVERVIEW_METRICS.map((key) =>
    zone.metrics.find((metric) => metric.key === key),
  )
    .filter((metric): metric is EnvironmentMetric => Boolean(metric))
    .filter((metric) => activeKeys.has(metric.key))
    .map((metric) => ({ ...metric, data: cleanData(metric.data) }))
    .filter((metric) => metric.data.length > 0);
}

function latestValue(metric: EnvironmentMetric): number | null {
  const data = cleanData(metric.data);
  return data.length > 0 ? data[data.length - 1].v : null;
}

function formatChartTime(t: number): string {
  return formatTimeValue(new Date(t), getStore().timeFormat);
}

function renderPrecisionSvg(metrics: EnvironmentMetric[]): string {
  const width = 920;
  const height = 300;
  const pad = { l: 42, r: 32, t: 24, b: 34 };
  const chartW = width - pad.l - pad.r;
  const chartH = height - pad.t - pad.b;
  const allTimes = metrics.flatMap((metric) =>
    metric.data.map((point) => point.t),
  );
  const minT = Math.min(...allTimes);
  const maxT = Math.max(...allTimes);
  const tSpan = Math.max(1, maxT - minT);
  const x = (t: number) => pad.l + ((t - minT) / tSpan) * chartW;
  const y = (norm: number) => pad.t + (1 - norm) * chartH;

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((step) => {
      const gy = pad.t + step * chartH;
      return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}" class="env-grid"/>`;
    })
    .join('');

  const labels = [minT, minT + tSpan / 2, maxT]
    .map((t, index) => {
      const label = formatChartTime(t);
      return `<text class="env-axis-label" x="${x(t).toFixed(1)}" y="${height - 8}" text-anchor="${index === 0 ? 'start' : index === 2 ? 'end' : 'middle'}">${escapeHtml(label)}</text>`;
    })
    .join('');

  const defs = metrics
    .map(
      (metric) => `
      <linearGradient id="env-precision-${metric.key}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${metric.color}" stop-opacity="0.26"/>
        <stop offset="100%" stop-color="${metric.color}" stop-opacity="0.02"/>
      </linearGradient>
    `,
    )
    .join('');

  const shapes = metrics
    .map((metric) => {
      const points = metric.data.map((point) => ({
        x: x(point.t),
        y: y(normalizeValue(metric, point.v)),
      }));
      const line = monotonePath(points);
      if (!line) return '';
      const first = points[0];
      const last = points[points.length - 1];
      const area = `${line} L${last.x.toFixed(1)},${(height - pad.b).toFixed(1)} L${first.x.toFixed(1)},${(height - pad.b).toFixed(1)} Z`;
      return `
        <path d="${area}" fill="url(#env-precision-${metric.key})"/>
        <path d="${line}" fill="none" stroke="${metric.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4" fill="${metric.color}" stroke="var(--bg-primary)" stroke-width="1.5"/>
      `;
    })
    .join('');

  return `
    <svg class="env-precision-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Environmental precision chart">
      <defs>${defs}</defs>
      ${grid}
      ${shapes}
      ${labels}
    </svg>
  `;
}

function renderRadialGaugeSvg(metrics: EnvironmentMetric[]): string {
  const width = 260;
  const height = 230;
  const cx = width / 2;
  const cy = 122;
  const start = -Math.PI * 0.72;
  const end = Math.PI * 0.72;

  const rings = metrics
    .map((metric, index) => {
      const value = latestValue(metric);
      if (value == null) return '';
      const progress = normalizeValue(metric, value);
      const radius = 86 - index * 18;
      const bg = describeArc(cx, cy, radius, start, end);
      const fg = describeArc(
        cx,
        cy,
        radius,
        start,
        start + (end - start) * progress,
      );
      return `
        <path d="${bg}" fill="none" stroke="var(--border)" stroke-width="10" stroke-linecap="round"/>
        <path d="${fg}" fill="none" stroke="${metric.color}" stroke-width="10" stroke-linecap="round"/>
      `;
    })
    .join('');

  const legend = metrics
    .map((metric, index) => {
      const value = latestValue(metric);
      return `
        <div class="env-gauge-row">
          <span class="env-gauge-dot" style="background:${metric.color}"></span>
          <span>${escapeHtml(metricMeta(metric.key).shortLabel)}</span>
          <strong style="color:${metric.color}">${value == null ? 'No data' : escapeHtml(formatMetricValue(metric, value))}</strong>
        </div>
      `;
    })
    .join('');

  return `
    <div class="env-radial">
      <svg class="env-radial-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Environmental radial gauge">
        ${rings}
        <text x="${cx}" y="${cy - 3}" text-anchor="middle" class="env-gauge-main">LIVE</text>
        <text x="${cx}" y="${cy + 17}" text-anchor="middle" class="env-gauge-sub">active metrics</text>
      </svg>
      <div class="env-gauge-legend">${legend}</div>
    </div>
  `;
}

function renderFarmTelemetrySvg(
  metrics: EnvironmentMetric[],
  zoneName: string,
): string {
  const width = 920;
  const height = 238;
  const pad = { l: 50, r: 46, t: 26, b: 34 };
  const chartW = width - pad.l - pad.r;
  const chartH = height - pad.t - pad.b;
  const allTimes = metrics.flatMap((metric) =>
    metric.data.map((point) => point.t),
  );
  const minT = Math.min(...allTimes);
  const maxT = Math.max(...allTimes);
  const tSpan = Math.max(1, maxT - minT);
  const x = (t: number) => pad.l + ((t - minT) / tSpan) * chartW;
  const y = (metric: EnvironmentMetric, value: number, lane: number) => {
    const laneHeight = chartH / Math.max(1, metrics.length);
    const laneTop = pad.t + lane * laneHeight;
    const laneMid = laneTop + laneHeight / 2;
    return laneMid + (0.5 - normalizeValue(metric, value)) * laneHeight * 0.62;
  };

  const defs = metrics
    .map(
      (metric) => `
      <linearGradient id="env-field-grad-${metric.key}" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="${metric.color}" stop-opacity="0.1"/>
        <stop offset="52%" stop-color="${metric.color}" stop-opacity="0.44"/>
        <stop offset="100%" stop-color="${metric.color}" stop-opacity="0.1"/>
      </linearGradient>
      <filter id="env-field-glow-${metric.key}" x="-40%" y="-80%" width="180%" height="260%">
        <feGaussianBlur stdDeviation="5" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `,
    )
    .join('');

  const canopy = Array.from({ length: 9 }, (_, index) => {
    const x1 = pad.l + index * (chartW / 8);
    const x2 = pad.l + (index + 0.5) * (chartW / 8);
    const top = 42 + (index % 2) * 10;
    return `<path d="M${x1.toFixed(1)} ${height - pad.b} Q${x2.toFixed(1)} ${top} ${(x1 + chartW / 8).toFixed(1)} ${height - pad.b}" class="env-field-arch"/>`;
  }).join('');

  const lanes = metrics
    .map((metric, index) => {
      const laneHeight = chartH / Math.max(1, metrics.length);
      const y1 = pad.t + index * laneHeight + laneHeight / 2;
      return `
        <line x1="${pad.l}" x2="${width - pad.r}" y1="${y1.toFixed(1)}" y2="${y1.toFixed(1)}" class="env-field-lane"/>
        <text x="${pad.l + 8}" y="${(y1 - 9).toFixed(1)}" class="env-field-label" fill="${metric.color}">${escapeHtml(metricMeta(metric.key).shortLabel)}</text>
      `;
    })
    .join('');

  const ribbons = metrics
    .map((metric, index) => {
      const points = metric.data.map((point) => ({
        x: x(point.t),
        y: y(metric, point.v, index),
      }));
      const line = monotonePath(points);
      if (!line) return '';
      const last = points[points.length - 1];
      const value = latestValue(metric);
      return `
        <path d="${line}" class="env-field-ribbon-shadow" stroke="${metric.color}"/>
        <path d="${line}" class="env-field-ribbon" stroke="url(#env-field-grad-${metric.key})" filter="url(#env-field-glow-${metric.key})"/>
        <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="5.5" fill="${metric.color}" stroke="var(--bg-secondary)" stroke-width="2"/>
        <text x="${(last.x - 8).toFixed(1)}" y="${(last.y - 12).toFixed(1)}" text-anchor="end" class="env-field-value" fill="${metric.color}">${value == null ? '' : escapeHtml(formatMetricValue(metric, value))}</text>
      `;
    })
    .join('');

  const tickLabels = [minT, minT + tSpan / 2, maxT]
    .map((t, index) => {
      const label = formatChartTime(t);
      return `<text class="env-field-time" x="${x(t).toFixed(1)}" y="${height - 10}" text-anchor="${index === 0 ? 'start' : index === 2 ? 'end' : 'middle'}">${escapeHtml(label)}</text>`;
    })
    .join('');

  return `
    <svg class="env-field-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Farm telemetry field for ${escapeAttr(zoneName)}">
      <defs>${defs}</defs>
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="18" class="env-field-bg"/>
      <path d="M42 ${height - 38} C180 ${height - 96} 295 ${height - 3} 430 ${height - 52} S718 ${height - 112} 878 ${height - 44}" class="env-field-bed"/>
      ${canopy}
      ${lanes}
      ${ribbons}
      <text x="${pad.l}" y="23" class="env-field-title">${escapeHtml(zoneName)}</text>
      <text x="${width - pad.r}" y="23" text-anchor="end" class="env-field-caption">live environmental ribbons</text>
      ${tickLabels}
    </svg>
  `;
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
): string {
  const startPoint = {
    x: cx + Math.cos(start) * radius,
    y: cy + Math.sin(start) * radius,
  };
  const endPoint = {
    x: cx + Math.cos(end) * radius,
    y: cy + Math.sin(end) * radius,
  };
  const large = Math.abs(end - start) > Math.PI ? 1 : 0;
  const sweep = end > start ? 1 : 0;
  return `M${startPoint.x.toFixed(1)},${startPoint.y.toFixed(1)} A${radius},${radius} 0 ${large} ${sweep} ${endPoint.x.toFixed(1)},${endPoint.y.toFixed(1)}`;
}

function renderMetricSummary(metrics: EnvironmentMetric[]): string {
  const rows = metrics
    .map((metric) => {
      const values = metric.data.map((point) => point.v);
      if (values.length === 0) {
        return `
          <tr>
            <td><span class="env-table-dot" style="background:${metric.color}"></span>${escapeHtml(metric.label)}</td>
            <td colspan="4" class="env-muted-cell">No data</td>
          </tr>
        `;
      }
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      const current = values[values.length - 1];
      return `
        <tr>
          <td><span class="env-table-dot" style="background:${metric.color}"></span>${escapeHtml(metric.label)}</td>
          <td>${escapeHtml(formatMetricValue(metric, current))}</td>
          <td>${escapeHtml(formatMetricValue(metric, min))}</td>
          <td>${escapeHtml(formatMetricValue(metric, avg))}</td>
          <td>${escapeHtml(formatMetricValue(metric, max))}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table class="env-metric-table">
      <thead><tr><th>Metric</th><th>Now</th><th>Min</th><th>Avg</th><th>Max</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderZoneTable(zones: EnvironmentZone[], activeZone: string): string {
  const rows = zones
    .map((zone) => {
      const values = DEFAULT_OVERVIEW_METRICS.map((key) => {
        const metric = zone.metrics.find((candidate) => candidate.key === key);
        const value = metric ? latestValue(metric) : null;
        return { key, metric, value };
      });
      const onlineMetrics = values.filter(
        (value) => value.value != null,
      ).length;
      const state =
        onlineMetrics === values.length
          ? 'Good'
          : onlineMetrics > 0
            ? 'Partial'
            : 'No data';
      const cells = values
        .map(({ key, metric, value }) => {
          const meta = metricMeta(key);
          const display =
            metric && value != null
              ? formatMetricValue(metric, value)
              : 'No data';
          return `<td style="color:${metric?.color ?? meta.color}">${escapeHtml(display)}</td>`;
        })
        .join('');
      return `
        <tr class="${activeZone === zone.zoneName ? 'active' : ''}" data-zone="${escapeAttr(zone.zoneName)}">
          <td>${escapeHtml(zone.zoneName)}</td>
          ${cells}
          <td><span class="env-zone-state ${state.toLowerCase().replace(/\s+/g, '-')}">${state}</span></td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="env-zone-table-wrap">
      <div class="env-zone-table-head">
        <span>Zones</span>
        <button class="env-zone-reset ${activeZone ? '' : 'active'}" data-zone="__all__">All Zones</button>
      </div>
      <table class="env-zone-table">
        <thead><tr><th>Zone</th><th>Temp</th><th>RH</th><th>CO₂</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export function renderOverviewEnvironmentHero(
  zones: EnvironmentZone[],
  containerId: string,
  opts: {
    activeKeys: Set<string>;
    activeZone?: string;
    onMetricToggle?: (key: string) => void;
    onZoneSelect?: (zoneName: string) => void;
  },
): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  injectEnvironmentChartStyles();

  if (zones.length === 0) {
    container.innerHTML = '<div class="chart-empty">No sensor data</div>';
    return;
  }

  const activeZoneName = opts.activeZone || '';
  const selectedZone =
    zones.find((zone) => zone.zoneName === activeZoneName) ??
    aggregateZones(zones);

  const availableKeys = new Set(
    zones
      .flatMap((zone) => zone.metrics)
      .filter((metric) => cleanData(metric.data).length > 0)
      .map((metric) => metric.key),
  );
  const activeKeys = new Set(
    DEFAULT_OVERVIEW_METRICS.filter(
      (key) => opts.activeKeys.has(key) && availableKeys.has(key),
    ),
  );
  if (activeKeys.size === 0) {
    const fallback = DEFAULT_OVERVIEW_METRICS.find((key) =>
      availableKeys.has(key),
    );
    if (fallback) activeKeys.add(fallback);
  }

  const activeMetrics = getActiveMetrics(selectedZone, activeKeys);
  if (activeMetrics.length === 0) {
    container.innerHTML =
      '<div class="chart-empty">No data for selected zone</div>';
    return;
  }

  const toggleHtml = DEFAULT_OVERVIEW_METRICS.map((key) => {
    const meta = metricMeta(key);
    const enabled = availableKeys.has(key);
    const active = activeKeys.has(key);
    return `<button class="env-toggle ${active ? 'active' : ''}" ${enabled ? '' : 'disabled'} data-metric="${key}" style="--toggle-color:${meta.color}">${escapeHtml(meta.label)}</button>`;
  }).join('');

  container.innerHTML = `
    <section class="env-overview-card">
      <div class="env-overview-head">
        <div>
          <div class="env-title">Environmental Overview</div>
          <div class="env-subtitle">${escapeHtml(selectedZone.zoneName)} · SVG telemetry field plus precision traces</div>
        </div>
        <div class="env-toggles">${toggleHtml}</div>
      </div>
      <div class="env-field-panel">
        ${renderFarmTelemetrySvg(activeMetrics, selectedZone.zoneName)}
      </div>
      <div class="env-overview-grid">
        <div class="env-chart-panel">
          ${renderPrecisionSvg(activeMetrics)}
          ${renderMetricSummary(activeMetrics)}
        </div>
        <aside class="env-gauge-panel">
          ${renderRadialGaugeSvg(activeMetrics)}
        </aside>
      </div>
      ${renderZoneTable(zones, activeZoneName)}
    </section>
  `;

  if (opts.onMetricToggle) {
    container
      .querySelectorAll<HTMLButtonElement>('.env-toggle')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.metric;
          if (key) opts.onMetricToggle?.(key);
        });
      });
  }

  if (opts.onZoneSelect) {
    container.querySelectorAll<HTMLElement>('[data-zone]').forEach((el) => {
      el.addEventListener('click', () => {
        const zone = el.dataset.zone;
        opts.onZoneSelect?.(zone === '__all__' ? '' : zone || '');
      });
    });
  }
}

function renderHorizonBandsSvg(metrics: EnvironmentMetric[]): string {
  const width = 920;
  const rowHeight = 48;
  const height = Math.max(150, metrics.length * rowHeight + 28);
  const pad = { l: 74, r: 18, t: 16, b: 18 };
  const chartW = width - pad.l - pad.r;
  const allTimes = metrics.flatMap((metric) =>
    metric.data.map((point) => point.t),
  );
  const minT = Math.min(...allTimes);
  const maxT = Math.max(...allTimes);
  const tSpan = Math.max(1, maxT - minT);
  const x = (t: number) => pad.l + ((t - minT) / tSpan) * chartW;

  const rows = metrics
    .map((metric, metricIndex) => {
      const yBase = pad.t + metricIndex * rowHeight;
      const values = cleanData(metric.data);
      const cellW = Math.max(2, chartW / Math.max(1, values.length) - 1);
      const cells = values
        .map((point) => {
          const n = normalizeValue(metric, point.v);
          const barH = Math.max(3, n * (rowHeight - 17));
          const y = yBase + rowHeight - 8 - barH;
          return `<rect x="${x(point.t).toFixed(1)}" y="${y.toFixed(1)}" width="${cellW.toFixed(1)}" height="${barH.toFixed(1)}" rx="1.5" fill="${metric.color}" opacity="${(0.2 + n * 0.72).toFixed(2)}"/>`;
        })
        .join('');
      const latest = latestValue(metric);
      return `
        <g>
          <text x="8" y="${(yBase + 24).toFixed(1)}" class="env-axis-label">${escapeHtml(metricMeta(metric.key).shortLabel)}</text>
          ${cells}
          <line x1="${pad.l}" x2="${width - pad.r}" y1="${(yBase + rowHeight - 6).toFixed(1)}" y2="${(yBase + rowHeight - 6).toFixed(1)}" class="env-grid"/>
          <text x="${width - pad.r}" y="${(yBase + 24).toFixed(1)}" class="env-axis-label" text-anchor="end">${latest == null ? 'No data' : escapeHtml(formatMetricValue(metric, latest))}</text>
        </g>
      `;
    })
    .join('');

  return `
    <svg class="env-horizon-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Environmental horizon bands">
      ${rows}
    </svg>
  `;
}

function renderStackedAreaSvg(metrics: EnvironmentMetric[]): string {
  const width = 920;
  const height = 285;
  const pad = { l: 34, r: 22, t: 22, b: 30 };
  const chartW = width - pad.l - pad.r;
  const chartH = height - pad.t - pad.b;
  const times = Array.from(
    new Set(metrics.flatMap((metric) => metric.data.map((point) => point.t))),
  ).sort((a, b) => a - b);
  const minT = times[0] ?? 0;
  const maxT = times[times.length - 1] ?? minT + 1;
  const tSpan = Math.max(1, maxT - minT);
  const x = (t: number) => pad.l + ((t - minT) / tSpan) * chartW;

  const normalizedSeries = metrics.map((metric) => {
    const exact = new Map(metric.data.map((point) => [point.t, point.v]));
    let carry = metric.data[0]?.v ?? 0;
    return {
      metric,
      values: times.map((t) => {
        const found = exact.get(t);
        if (typeof found === 'number') carry = found;
        return normalizeValue(metric, carry) * 100;
      }),
    };
  });

  const stacks = times.map((t, index) => {
    let total = 0;
    const segments = normalizedSeries.map((series) => {
      const y0 = total;
      total += series.values[index] ?? 0;
      return { metric: series.metric, y0, y1: total };
    });
    return { t, index, total, segments };
  });
  const maxTotal = Math.max(1, ...stacks.map((stack) => stack.total));
  const y = (value: number) => pad.t + (1 - value / maxTotal) * chartH;

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((step) => {
      const gy = pad.t + step * chartH;
      return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}" class="env-grid"/>`;
    })
    .join('');

  const defs = normalizedSeries
    .map(
      (series, index) => `
      <linearGradient id="env-stack-${series.metric.key}-${index}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${series.metric.color}" stop-opacity="0.66"/>
        <stop offset="100%" stop-color="${series.metric.color}" stop-opacity="0.12"/>
      </linearGradient>
    `,
    )
    .join('');

  const layers = normalizedSeries
    .map((series, layerIndex) => {
      const top = stacks.map((stack) => {
        const segment = stack.segments[layerIndex];
        return { x: x(stack.t), y: y(segment?.y1 ?? 0) };
      });
      const bottom = stacks.map((stack) => {
        const segment = stack.segments[layerIndex];
        return { x: x(stack.t), y: y(segment?.y0 ?? 0) };
      });
      const topLine = top
        .map(
          (point, index) =>
            `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`,
        )
        .join(' ');
      const bottomLine = bottom
        .slice()
        .reverse()
        .map((point) => `L${point.x.toFixed(1)},${point.y.toFixed(1)}`)
        .join(' ');
      const edge = monotonePath(top);
      return `
        <path d="${topLine} ${bottomLine} Z" fill="url(#env-stack-${series.metric.key}-${layerIndex})"/>
        <path d="${edge}" fill="none" stroke="${series.metric.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      `;
    })
    .join('');

  const labels = [minT, minT + tSpan / 2, maxT]
    .map((t, index) => {
      const label = formatChartTime(t);
      return `<text class="env-axis-label" x="${x(t).toFixed(1)}" y="${height - 8}" text-anchor="${index === 0 ? 'start' : index === 2 ? 'end' : 'middle'}">${escapeHtml(label)}</text>`;
    })
    .join('');

  return `
    <svg class="env-stack-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Stacked environmental pressure chart">
      <defs>${defs}</defs>
      ${grid}
      ${layers}
      ${labels}
    </svg>
  `;
}

function renderBulletRangeBars(metrics: EnvironmentMetric[]): string {
  const rows = metrics
    .map((metric) => {
      const meta = metricMeta(metric.key);
      const current = latestValue(metric);
      let targetMin = meta.targetMin ?? meta.minAxis;
      let targetMax = meta.targetMax ?? meta.maxAxis;
      if (
        metric.key === 'temperature' &&
        getStore().unitSystem === 'imperial'
      ) {
        targetMin = (targetMin * 9) / 5 + 32;
        targetMax = (targetMax * 9) / 5 + 32;
      }
      const currentPct =
        current == null ? 0 : normalizeValue(metric, current) * 100;
      const targetStart = normalizeValue(metric, targetMin) * 100;
      const targetWidth = Math.max(
        2,
        normalizeValue(metric, targetMax) * 100 - targetStart,
      );
      return `
        <div class="env-bullet-row">
          <div>
            <div class="env-bullet-label">${escapeHtml(meta.label)}</div>
            <div class="env-bullet-target">${escapeHtml(formatMetricValue(metric, targetMin))} - ${escapeHtml(formatMetricValue(metric, targetMax))}</div>
          </div>
          <div class="env-bullet-track">
            <span class="env-bullet-target-band" style="left:${targetStart.toFixed(1)}%;width:${targetWidth.toFixed(1)}%;background:${metric.color}"></span>
            <span class="env-bullet-value" style="width:${currentPct.toFixed(1)}%;background:${metric.color}"></span>
          </div>
          <strong style="color:${metric.color}">${current == null ? 'No data' : escapeHtml(formatMetricValue(metric, current))}</strong>
        </div>
      `;
    })
    .join('');
  return `<div class="env-bullet-list">${rows}</div>`;
}

export function renderSensorEnvironmentHero(
  metrics: EnvironmentMetric[],
  containerId: string,
  opts: { subtitle?: string } = {},
): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  injectEnvironmentChartStyles();

  const drawableMetrics = metrics
    .map((metric) => ({ ...metric, data: cleanData(metric.data) }))
    .filter((metric) => metric.data.length > 0);

  if (drawableMetrics.length === 0) {
    container.innerHTML =
      '<div class="chart-empty">No data for selection</div>';
    return;
  }

  const title = drawableMetrics
    .map(
      (metric) =>
        `<span style="color:${metric.color}">${escapeHtml(metric.label)}</span>`,
    )
    .join(' <span style="color:var(--text-secondary)">+</span> ');

  container.innerHTML = `
    <section class="env-sensor-stack">
      <div class="env-sensor-panel">
        <div class="env-sensor-panel-head">
          <div>
            <div class="env-title">${title}</div>
            <div class="env-subtitle">${escapeHtml(opts.subtitle ?? 'Selected sensor history')}</div>
          </div>
          <span class="env-panel-kicker">Multi-line focus</span>
        </div>
        ${renderPrecisionSvg(drawableMetrics)}
        ${renderMetricSummary(drawableMetrics)}
      </div>
      <div class="env-sensor-panel">
        <div class="env-sensor-panel-head">
          <div>
            <div class="env-title">Horizon Bands</div>
            <div class="env-subtitle">Dense scan of the same selected metrics</div>
          </div>
          <span class="env-panel-kicker">Normalized</span>
        </div>
        ${renderHorizonBandsSvg(drawableMetrics)}
      </div>
    </section>
  `;
}

export function renderSystemEnvironmentHero(
  metrics: EnvironmentMetric[],
  containerId: string,
): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  injectEnvironmentChartStyles();

  const drawableMetrics = metrics
    .map((metric) => ({ ...metric, data: cleanData(metric.data) }))
    .filter((metric) => metric.data.length > 0);

  if (drawableMetrics.length === 0) {
    container.innerHTML = '<div class="chart-empty">No sensor data</div>';
    return;
  }

  container.innerHTML = `
    <section class="env-system-stack">
      <div class="env-sensor-panel">
        <div class="env-sensor-panel-head">
          <div>
            <div class="env-title">Environmental Pressure</div>
            <div class="env-subtitle">Stacked normalized history for active system metrics</div>
          </div>
          <span class="env-panel-kicker">Stacked area</span>
        </div>
        ${renderStackedAreaSvg(drawableMetrics)}
      </div>
      <div class="env-sensor-panel">
        <div class="env-sensor-panel-head">
          <div>
            <div class="env-title">Grow Targets</div>
            <div class="env-subtitle">Display defaults only; not safety policy</div>
          </div>
          <span class="env-panel-kicker">Bullet ranges</span>
        </div>
        ${renderBulletRangeBars(drawableMetrics)}
      </div>
    </section>
  `;
}

export function renderSafetyDenialCalendarHeatmap(
  denials: SafetyDenialPoint[],
  containerId: string,
): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  injectEnvironmentChartStyles();

  const width = 920;
  const height = 190;
  const pad = { l: 54, r: 16, t: 22, b: 24 };
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cellGap = 3;
  const cellW = (width - pad.l - pad.r - 23 * cellGap) / 24;
  const cellH = (height - pad.t - pad.b - 6 * cellGap) / 7;
  const counts = new Map<string, number>();

  for (const denial of denials) {
    const date = new Date(denial.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getDay()}:${date.getHours()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const max = Math.max(1, ...counts.values());
  const cells = days
    .flatMap((day, dayIndex) =>
      Array.from({ length: 24 }, (_, hour) => {
        const value = counts.get(`${dayIndex}:${hour}`) ?? 0;
        const opacity = value === 0 ? 0.12 : 0.25 + (value / max) * 0.7;
        const color =
          value === 0
            ? 'var(--bg-tertiary)'
            : value >= max
              ? 'var(--danger)'
              : value > max / 2
                ? 'var(--warning)'
                : 'var(--accent-bright)';
        return `<rect x="${(pad.l + hour * (cellW + cellGap)).toFixed(1)}" y="${(pad.t + dayIndex * (cellH + cellGap)).toFixed(1)}" width="${cellW.toFixed(1)}" height="${cellH.toFixed(1)}" rx="2" fill="${color}" opacity="${opacity.toFixed(2)}"><title>${day} ${hour}:00 · ${value} denied</title></rect>`;
      }),
    )
    .join('');

  const dayLabels = days
    .map(
      (day, index) =>
        `<text class="env-axis-label" x="8" y="${(pad.t + index * (cellH + cellGap) + cellH * 0.68).toFixed(1)}">${day}</text>`,
    )
    .join('');

  const hourLabels = [0, 6, 12, 18, 23]
    .map(
      (hour) =>
        `<text class="env-axis-label" x="${(pad.l + hour * (cellW + cellGap)).toFixed(1)}" y="${height - 7}" text-anchor="middle">${hour}</text>`,
    )
    .join('');

  container.innerHTML = `
    <div class="env-safety-card">
      <div class="env-sensor-panel-head">
        <div>
          <div class="env-title">Denied Action Calendar</div>
          <div class="env-subtitle">Denied safety actions by day and hour</div>
        </div>
        <span class="env-panel-kicker">${denials.length} events</span>
      </div>
      <svg class="env-safety-heatmap-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Safety denial calendar heatmap">
        ${cells}
        ${dayLabels}
        ${hourLabels}
      </svg>
    </div>
  `;
}

export function renderSafetyThresholdBulletBars(
  thresholds: SafetyThresholdBar[],
  containerId: string,
): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  injectEnvironmentChartStyles();

  const active = thresholds.filter((threshold) => threshold.enabled);
  if (active.length === 0) {
    container.innerHTML = `
      <div class="env-safety-card">
        <div class="chart-empty">No enabled thresholds</div>
      </div>
    `;
    return;
  }

  const rows = active
    .map((threshold) => {
      const span = Math.max(1, threshold.axisMax - threshold.axisMin);
      const pct = (value: number | null) =>
        value == null
          ? 0
          : Math.max(
              0,
              Math.min(100, ((value - threshold.axisMin) / span) * 100),
            );
      const minPct = pct(threshold.minValue);
      const maxPct =
        threshold.maxValue == null
          ? 100
          : Math.max(minPct + 2, pct(threshold.maxValue));
      const currentPct = pct(threshold.currentValue);
      const current = threshold.currentValue;
      const lowBreach =
        current != null &&
        threshold.minValue != null &&
        current < threshold.minValue;
      const highBreach =
        current != null &&
        threshold.maxValue != null &&
        current > threshold.maxValue;
      const state =
        current == null ? 'No data' : lowBreach || highBreach ? 'Out' : 'In';
      return `
        <div class="env-bullet-row env-threshold-row" data-threshold-id="${escapeAttr(threshold.id)}">
          <div>
            <div class="env-bullet-label">${escapeHtml(threshold.label)}</div>
            <div class="env-bullet-target">${escapeHtml(threshold.scope)}</div>
          </div>
          <div class="env-bullet-track">
            <span class="env-bullet-target-band" style="left:${minPct.toFixed(1)}%;width:${(maxPct - minPct).toFixed(1)}%;background:${threshold.color}"></span>
            <span class="env-bullet-value" style="width:${currentPct.toFixed(1)}%;background:${threshold.color}"></span>
          </div>
          <strong style="color:${threshold.color}">${current == null ? 'No data' : `${current.toFixed(Math.abs(current) >= 100 ? 0 : 1)}${escapeHtml(threshold.unit)}`}</strong>
          <span class="env-zone-state ${state === 'Out' ? 'partial' : state === 'No data' ? 'no-data' : ''}">${state}</span>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `
    <div class="env-safety-card">
      <div class="env-sensor-panel-head">
        <div>
          <div class="env-title">Threshold Range Bars</div>
          <div class="env-subtitle">Current readings against enabled safety thresholds</div>
        </div>
        <span class="env-panel-kicker">${active.length} thresholds</span>
      </div>
      <div class="env-bullet-list">${rows}</div>
    </div>
  `;
}

// ── Devices force graph ──────────────────────────────────────────────────────────

export interface ForceNode {
  id: string;
  label: string;
  type: 'sensor' | 'relay' | 'camera' | 'smart_plug' | 'unknown';
  online: boolean;
  zone?: string | null;
}

export interface ForceEdge {
  source: string;
  target: string;
  kind: 'zone' | 'dependency';
}

export interface ForceGraphResult {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    online: boolean;
    zone: string;
    x: number;
    y: number;
    color: string;
  }>;
  edges: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    kind: string;
  }>;
}

function deviceTypeColor(type: string): string {
  switch (type) {
    case 'sensor':
      return '#F59E0B';
    case 'relay':
      return '#22C55E';
    case 'camera':
      return '#38BDF8';
    case 'smart_plug':
      return '#A855F7';
    default:
      return '#6C7278';
  }
}

function runForceSimulation(
  nodes: ForceNode[],
  edges: ForceEdge[],
  width: number,
  height: number,
): ForceGraphResult['nodes'] {
  const ITERATIONS = 120;
  const REPULSION = 8000;
  const ATTRACTION = 0.06;
  const IDEAL_EDGE = 120;
  const DAMPING = 0.82;
  const PAD = 48;

  const simNodes = nodes.map((n) => ({
    ...n,
    x: PAD + Math.random() * (width - PAD * 2),
    y: PAD + Math.random() * (height - PAD * 2),
    vx: 0,
    vy: 0,
  }));

  const nodeById = new Map(simNodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const a = simNodes[i];
        const b = simNodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist2 = Math.max(1, dx * dx + dy * dy);
        const dist = Math.sqrt(dist2);
        const force = REPULSION / dist2;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = nodeById.get(edge.source);
      const b = nodeById.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(Math.max(1, dx * dx + dy * dy));
      const force = (dist - IDEAL_EDGE) * ATTRACTION;
      const fx = (dx / Math.max(1, dist)) * force;
      const fy = (dy / Math.max(1, dist)) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Velocity damping + position update + boundary
    const cool = DAMPING + (1 - DAMPING) * (iter / ITERATIONS);
    for (const n of simNodes) {
      n.vx *= cool;
      n.vy *= cool;
      n.x = Math.max(PAD, Math.min(width - PAD, n.x + n.vx));
      n.y = Math.max(PAD, Math.min(height - PAD, n.y + n.vy));
    }
  }

  return simNodes.map((n) => ({
    id: n.id,
    label: n.label,
    type: n.type,
    online: n.online,
    zone: n.zone || 'Unzoned',
    x: n.x,
    y: n.y,
    color: deviceTypeColor(n.type),
  }));
}

export function renderDeviceForceGraphSvg(
  nodes: ForceNode[],
  edges: ForceEdge[],
  containerId: string,
  onNodeClick?: (nodeId: string) => void,
): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  injectEnvironmentChartStyles();

  if (nodes.length === 0) {
    container.innerHTML = `<div class="env-force-empty">No devices to visualize</div>`;
    return;
  }

  const width = 920;
  const height = Math.min(560, 80 + nodes.length * 52);
  const PAD = 48;

  const simNodes = runForceSimulation(nodes, edges, width, height);
  const nodeById = new Map(simNodes.map((n) => [n.id, n]));

  // Build edge segments
  const edgeSegments: ForceGraphResult['edges'] = [];
  for (const edge of edges) {
    const s = nodeById.get(edge.source);
    const t = nodeById.get(edge.target);
    if (!s || !t) continue;
    edgeSegments.push({
      x1: s.x,
      y1: s.y,
      x2: t.x,
      y2: t.y,
      kind: edge.kind,
    });
  }

  // Unique zones for legend
  const zones = [...new Set(simNodes.map((n) => n.zone))].sort();

  const edgeLines = edgeSegments
    .map((e) => {
      const dash = e.kind === 'zone' ? '4 6' : 'none';
      const opacity = e.kind === 'zone' ? 0.22 : 0.45;
      return `<line x1="${e.x1.toFixed(1)}" y1="${e.y1.toFixed(1)}" x2="${e.x2.toFixed(1)}" y2="${e.y2.toFixed(1)}" stroke="var(--text-tertiary)" stroke-width="1.2" stroke-dasharray="${dash}" opacity="${opacity}"/>`;
    })
    .join('');

  const R = 22;
  const nodeCircles = simNodes
    .map((n) => {
      const alpha = n.online ? 1 : 0.35;
      const stroke = n.online ? n.color : 'var(--border)';
      const fill = n.online
        ? `color-mix(in srgb, ${n.color} 28%, transparent)`
        : 'var(--bg-tertiary)';
      return `
        <circle
          cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${R}"
          fill="${fill}" stroke="${stroke}" stroke-width="2"
          opacity="${alpha}" class="force-node"
          data-node-id="${escapeAttr(n.id)}"
          data-label="${escapeAttr(n.label)}"
          data-type="${escapeAttr(n.type)}"
          data-online="${n.online}"
          data-zone="${escapeAttr(n.zone)}"
        />
        <text
          x="${n.x.toFixed(1)}" y="${(n.y + R + 12).toFixed(1)}"
          text-anchor="middle" class="env-force-label"
          opacity="${n.online ? 0.88 : 0.38}"
        >${escapeHtml(n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label)}</text>
      `;
    })
    .join('');

  // Type legend
  const typeLegend = ['sensor', 'relay', 'camera', 'smart_plug']
    .filter((t) => nodes.some((n) => n.type === t))
    .map(
      (t) =>
        `<span class="env-force-legend-item"><span class="env-force-legend-dot" style="background:${deviceTypeColor(t)}"></span>${escapeHtml(t)}</span>`,
    )
    .join('');

  const zoneLegend = zones
    .slice(0, 5)
    .map((z) => `<span class="env-force-legend-item">${escapeHtml(z)}</span>`)
    .join('');

  container.innerHTML = `
    <div class="env-force-card">
      <div class="env-sensor-panel-head">
        <div>
          <div class="env-title">Device Topology</div>
          <div class="env-subtitle">${nodes.length} devices · ${edgeSegments.length} connections · spring-electrical layout</div>
        </div>
        <div class="env-force-legend">
          <span class="env-force-legend-item">● Online</span>
          <span class="env-force-legend-item env-force-legend-offline">○ Offline</span>
          <span class="env-force-legend-item" style="color:var(--text-tertiary);font-size:9px">— zone</span>
          <span class="env-force-legend-item" style="color:var(--text-tertiary);font-size:9px">─ dependency</span>
          ${typeLegend}
          ${zoneLegend ? `<span class="env-force-sep">|</span>${zoneLegend}` : ''}
        </div>
      </div>
      <div class="env-force-wrap">
        <svg class="env-force-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Device topology force graph">
          <defs>
            <filter id="force-glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          ${edgeLines}
          ${nodeCircles}
        </svg>
        <div class="env-force-tooltip" id="force-tooltip"></div>
      </div>
    </div>
  `;

  // Tooltip interaction
  const tooltip = document.getElementById('force-tooltip');
  container
    .querySelectorAll<SVGCircleElement>('.force-node')
    .forEach((circle) => {
      circle.addEventListener('pointerenter', (e) => {
        if (!tooltip) return;
        const id = circle.dataset.nodeId || '';
        const label = circle.dataset.label || '';
        const type = circle.dataset.type || '';
        const online = circle.dataset.online === 'true';
        const zone = circle.dataset.zone || '';
        tooltip.innerHTML = `
        <div class="env-force-tip-name">${escapeHtml(label)}</div>
        <div class="env-force-tip-row"><span>Type</span><strong>${escapeHtml(type)}</strong></div>
        <div class="env-force-tip-row"><span>Status</span><strong style="color:${online ? 'var(--success)' : 'var(--danger)'}">${online ? 'Online' : 'Offline'}</strong></div>
        ${zone ? `<div class="env-force-tip-row"><span>Zone</span><strong>${escapeHtml(zone)}</strong></div>` : ''}
      `;
        const rect = (e.target as SVGCircleElement)
          .closest('svg')!
          .getBoundingClientRect();
        const cx = parseFloat(circle.getAttribute('cx')!);
        const cy = parseFloat(circle.getAttribute('cy')!);
        const svgEl = circle.closest('svg')!;
        const vb = svgEl.viewBox.baseVal;
        const scaleX = rect.width / vb.width;
        const scaleY = rect.height / vb.height;
        tooltip.style.left = `${cx * scaleX + rect.left - container.getBoundingClientRect().left + 12}px`;
        tooltip.style.top = `${cy * scaleY + rect.top - container.getBoundingClientRect().top - 10}px`;
        tooltip.style.display = 'block';
      });
      circle.addEventListener('pointerleave', () => {
        if (tooltip) tooltip.style.display = 'none';
      });
      circle.addEventListener('click', () => {
        const id = circle.dataset.nodeId;
        if (id) onNodeClick?.(id);
      });
      circle.style.cursor = 'pointer';
    });
}

// ── Calibration beeswarm ────────────────────────────────────────────────────────

export interface BeeswarmPoint {
  deviceId: string;
  deviceName: string;
  metric: string;
  offset: number;
  unit: string;
}

export function renderCalibrationBeeswarmSvg(
  points: BeeswarmPoint[],
  containerId: string,
): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  injectEnvironmentChartStyles();

  const grouped = new Map<string, BeeswarmPoint[]>();
  for (const p of points) {
    const list = grouped.get(p.metric) ?? [];
    list.push(p);
    grouped.set(p.metric, list);
  }

  if (grouped.size === 0) {
    container.innerHTML = `<div class="env-force-empty">No calibration data</div>`;
    return;
  }

  const METRIC_LABELS: Record<string, string> = {
    temperature: 'Temperature',
    humidity: 'Humidity',
    co2: 'CO₂',
    soil_moisture: 'Soil Moisture',
    light: 'Light',
    water_level: 'Water Level',
    ph: 'pH',
    weight: 'Weight',
  };

  const METRIC_COLORS: Record<string, string> = {
    temperature: '#F59E0B',
    humidity: '#38BDF8',
    co2: '#22C55E',
    soil_moisture: '#EF4444',
    light: '#FACC15',
    water_level: '#2563EB',
    ph: '#A855F7',
    weight: '#94A3B8',
  };

  const ROW_H = 52;
  const PAD = { l: 120, r: 24, t: 24, b: 16 };
  const width = 920;
  const metrics = Array.from(grouped.keys());
  const height = PAD.t + metrics.length * ROW_H + PAD.b;

  const allOffsets = points.map((p) => p.offset);
  const minOff = Math.min(...allOffsets);
  const maxOff = Math.max(...allOffsets);
  const span = Math.max(1, maxOff - minOff);

  const xMap = (v: number) =>
    PAD.l + ((v - minOff) / span) * (width - PAD.l - PAD.r);

  const rows = metrics.map((metric, rowIndex) => {
    const pts = grouped.get(metric) ?? [];
    const yBase = PAD.t + rowIndex * ROW_H;
    const color = METRIC_COLORS[metric] ?? '#94A3B8';
    const label = METRIC_LABELS[metric] ?? metric;

    // Sort by offset for deterministic jitter
    const sorted = pts.slice().sort((a, b) => a.offset - b.offset);

    // Assign vertical jitter slots
    const stackMap = new Map<string, number>();
    let stack = 0;
    for (const pt of sorted) {
      stackMap.set(`${pt.deviceId}:${pt.metric}`, stack % 5);
      stack++;
    }
    const STACK_GAP = 8;
    const CENTER_Y = yBase + ROW_H / 2;
    const R = 7;

    // Zero reference line
    const zeroX = xMap(0);
    const zeroLine = `
      <line x1="${zeroX.toFixed(1)}" y1="${(yBase + 4).toFixed(1)}" x2="${zeroX.toFixed(1)}" y2="${(yBase + ROW_H - 4).toFixed(1)}"
        stroke="var(--border)" stroke-width="1" stroke-dasharray="3 4" opacity="0.6"/>
    `;

    // Tick marks along the row
    const tickCount = Math.max(2, Math.min(5, Math.ceil(span / 0.5)));
    const tickStep = span / (tickCount - 1);
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const v = minOff + i * tickStep;
      const tx = xMap(v);
      return `<text x="${tx.toFixed(1)}" y="${(yBase + ROW_H - 3).toFixed(1)}" text-anchor="middle" class="env-axis-label">${v >= 0 ? '+' : ''}${v.toFixed(1)}</text>`;
    }).join('');

    // Metric label
    const metricLabel = `
      <text x="${PAD.l - 10}" y="${(yBase + ROW_H / 2 + 4).toFixed(1)}"
        text-anchor="end" class="env-force-label" fill="${color}" opacity="0.9">${escapeHtml(label)}</text>
    `;

    // Dots
    const dots = pts
      .map((pt) => {
        const x = xMap(pt.offset);
        const stackIdx = stackMap.get(`${pt.deviceId}:${pt.metric}`) ?? 0;
        const y = CENTER_Y + (stackIdx - 2) * STACK_GAP;
        const dotColor =
          pt.offset > 0.001
            ? 'var(--warning)'
            : pt.offset < -0.001
              ? 'var(--info)'
              : 'var(--border)';
        const title = `${escapeHtml(pt.deviceName)}\noffset = ${pt.offset > 0 ? '+' : ''}${pt.offset.toFixed(3)}${pt.unit}`;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R}" fill="${dotColor}" opacity="0.85" stroke="${color}" stroke-width="1.5"><title>${title}</title></circle>`;
      })
      .join('');

    return { metric, color, yBase, zeroLine, ticks, metricLabel, dots };
  });

  const svgContent = rows
    .map((r) => `${r.zeroLine}${r.ticks}${r.metricLabel}${r.dots}`)
    .join('');

  container.innerHTML = `
    <div class="env-force-card">
      <div class="env-sensor-panel-head">
        <div>
          <div class="env-title">Calibration Offset Distribution</div>
          <div class="env-subtitle">${points.length} sensors across ${metrics.length} metrics · jittered by device</div>
        </div>
        <div class="env-force-legend">
          <span class="env-force-legend-item"><span class="env-force-legend-dot" style="background:var(--warning)"></span>Positive offset</span>
          <span class="env-force-legend-item"><span class="env-force-legend-dot" style="background:var(--info)"></span>Negative offset</span>
          <span class="env-force-legend-item"><span class="env-force-legend-dot" style="background:var(--border)"></span>Zero offset</span>
          <span class="env-force-legend-item" style="color:var(--text-tertiary)">| Dashed line = zero</span>
        </div>
      </div>
      <svg class="env-force-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Calibration offset beeswarm distribution">
        ${svgContent}
      </svg>
    </div>
  `;
}

export function injectEnvironmentChartStyles(): void {
  if (document.getElementById('hal-environment-charts-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-environment-charts-styles';
  style.textContent = `
.env-overview-card {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent-bright) 10%, transparent), transparent 34%),
    radial-gradient(circle at 86% 10%, rgba(56,139,253,0.18), transparent 26%),
    var(--bg-secondary);
  border: 1px solid color-mix(in srgb, var(--accent-bright) 24%, var(--border));
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-card-lg);
}
.env-overview-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent 74%);
}
.env-overview-card > * {
  position: relative;
  z-index: 1;
}
.env-sensor-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.env-sensor-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
}
.env-safety-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
  min-width: 0;
}
.env-sensor-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.env-panel-kicker {
  flex-shrink: 0;
  color: var(--accent-bright);
  border: 1px solid color-mix(in srgb, var(--accent-bright) 30%, var(--border));
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--accent-bright) 8%, var(--bg-tertiary));
  font-size: 10px;
  font-weight: 800;
  padding: 5px 9px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.env-overview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.env-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-primary);
}
.env-subtitle {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-secondary);
}
.env-toggles {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.env-toggle,
.env-zone-reset {
  min-height: 30px;
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--toggle-color, var(--accent)) 34%, var(--border));
  background: color-mix(in srgb, var(--toggle-color, var(--accent)) 7%, var(--bg-tertiary));
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  padding: 0 10px;
}
.env-toggle.active,
.env-zone-reset.active {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--toggle-color, var(--accent)) 18%, var(--bg-secondary));
  border-color: color-mix(in srgb, var(--toggle-color, var(--accent)) 60%, var(--border));
}
.env-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.env-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: var(--space-4);
  align-items: stretch;
}
.env-field-panel {
  min-width: 0;
  margin-bottom: var(--space-4);
}
.env-field-svg {
  display: block;
  width: 100%;
  height: auto;
}
.env-field-bg {
  fill: color-mix(in srgb, var(--bg-primary) 72%, var(--accent) 8%);
  stroke: color-mix(in srgb, var(--accent-bright) 28%, var(--border));
  stroke-width: 1;
}
.env-field-arch {
  fill: none;
  stroke: rgba(240,246,252,0.07);
  stroke-width: 1.2;
}
.env-field-bed {
  fill: none;
  stroke: rgba(63,185,80,0.18);
  stroke-width: 22;
  stroke-linecap: round;
}
.env-field-lane {
  stroke: rgba(240,246,252,0.08);
  stroke-dasharray: 1 8;
  stroke-linecap: round;
}
.env-field-label,
.env-field-title,
.env-field-caption,
.env-field-time,
.env-field-value {
  font-family: var(--font-mono);
}
.env-field-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.env-field-title {
  fill: var(--text-primary);
  font-size: 13px;
  font-weight: 800;
}
.env-field-caption,
.env-field-time {
  fill: var(--text-secondary);
  font-size: 10px;
  letter-spacing: 0.04em;
}
.env-field-value {
  font-size: 11px;
  font-weight: 800;
}
.env-field-ribbon-shadow {
  fill: none;
  stroke-width: 12;
  stroke-opacity: 0.09;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.env-field-ribbon {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.env-chart-panel,
.env-gauge-panel {
  min-width: 0;
}
.env-precision-svg,
.env-radial-svg,
.env-horizon-svg,
.env-stack-svg {
  display: block;
  width: 100%;
  height: auto;
}
.env-safety-heatmap-svg {
  display: block;
  width: 100%;
  height: auto;
}
.env-grid {
  stroke: color-mix(in srgb, var(--text-tertiary) 28%, var(--border));
  stroke-width: 1;
  stroke-dasharray: 2 4;
}
.env-axis-label {
  fill: var(--text-tertiary);
  font-size: 10px;
  font-family: var(--font-mono);
}
.env-metric-table,
.env-zone-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.env-metric-table {
  margin-top: var(--space-2);
}
.env-metric-table th,
.env-zone-table th {
  text-align: left;
  color: var(--text-tertiary);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: var(--space-2);
  border-bottom: 1px solid var(--border);
}
.env-metric-table td,
.env-zone-table td {
  padding: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
}
.env-zone-table tbody tr {
  cursor: pointer;
}
.env-zone-table tbody tr:hover td,
.env-zone-table tbody tr.active td {
  background: var(--bg-tertiary);
}
.env-table-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-right: 7px;
}
.env-muted-cell {
  color: var(--text-secondary) !important;
}
.env-radial {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  height: 100%;
}
.env-gauge-main {
  fill: var(--text-primary);
  font-size: 23px;
  font-weight: 800;
  font-family: var(--font-mono);
}
.env-gauge-sub {
  fill: var(--text-secondary);
  font-size: 10px;
  font-family: var(--font-mono);
}
.env-gauge-legend {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.env-gauge-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 7px;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
}
.env-gauge-row strong {
  font-family: var(--font-mono);
  font-size: 12px;
}
.env-gauge-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
.env-zone-table-wrap {
  margin-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
  padding-top: var(--space-3);
}
.env-zone-table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.env-zone-state {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 7px;
  border-radius: var(--radius-pill);
  font-size: 10px;
  font-weight: 800;
  color: var(--success);
  background: color-mix(in srgb, var(--success) 9%, var(--bg-tertiary));
  border: 1px solid color-mix(in srgb, var(--success) 30%, var(--border));
}
.env-zone-state.partial {
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 9%, var(--bg-tertiary));
  border-color: color-mix(in srgb, var(--warning) 30%, var(--border));
}
.env-zone-state.no-data {
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-color: var(--border);
}
.env-system-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.env-bullet-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.env-bullet-row {
  display: grid;
  grid-template-columns: minmax(110px, 150px) 1fr auto;
  align-items: center;
  gap: var(--space-3);
}
.env-threshold-row {
  grid-template-columns: minmax(130px, 190px) 1fr minmax(72px, auto) auto;
}
.env-bullet-label {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
}
.env-bullet-target {
  color: var(--text-secondary);
  font-size: 10px;
  margin-top: 2px;
}
.env-bullet-track {
  position: relative;
  height: 18px;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
}
.env-bullet-target-band {
  position: absolute;
  top: 0;
  bottom: 0;
  opacity: 0.22;
}
.env-bullet-value {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 0;
  border-radius: var(--radius-sm);
}
.env-bullet-row strong {
  min-width: 64px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 12px;
}
.env-force-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
}
.env-force-wrap {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
}
.env-force-svg {
  display: block;
  width: 100%;
  height: auto;
  max-height: 560px;
}
.env-force-label {
  fill: var(--text-secondary);
  font-size: 10px;
  font-family: var(--font-mono);
  pointer-events: none;
}
.force-node {
  transition: opacity 0.15s;
}
.force-node:hover {
  opacity: 1 !important;
}
.env-force-tooltip {
  display: none;
  position: absolute;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-size: 11px;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  min-width: 140px;
}
.env-force-tip-name {
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
  font-size: 12px;
}
.env-force-tip-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-secondary);
  margin-top: 2px;
}
.env-force-tip-row strong {
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
}
.env-force-legend {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  align-items: center;
}
.env-force-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--text-secondary);
}
.env-force-legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.env-force-legend-offline {
  opacity: 0.5;
}
.env-force-sep {
  color: var(--border);
  margin: 0 2px;
}
.env-force-empty {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}
@media (max-width: 920px) {
  .env-overview-grid {
    grid-template-columns: 1fr;
  }
  .env-gauge-panel {
    max-width: 360px;
  }
}
@media (max-width: 640px) {
  .env-overview-card {
    padding: var(--space-3);
  }
  .env-zone-table-wrap {
    overflow-x: auto;
  }
  .env-zone-table {
    min-width: 520px;
  }
  .env-bullet-row {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }
  .env-threshold-row {
    grid-template-columns: 1fr;
  }
  .env-bullet-row strong {
    text-align: left;
  }
}
`;
  document.head.appendChild(style);
}
