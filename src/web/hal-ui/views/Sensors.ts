// Sensors view — hero multi-layer chart + advanced visualization cards
// Toggle any metric on/off to add/remove layers from the hero chart
// Cards: area, line, bar, gauge, heatmap

import {
  getStore,
  setStore,
  formatSensorValue,
  formatDateTimeValue,
} from '../store.js';
import { halApi, HalSensorReading, HalDecision } from '../api.js';
import { renderSensorEnvironmentHero } from '../components/EnvironmentCharts.js';

type MetricKey =
  | 'temperature'
  | 'humidity'
  | 'soil_moisture'
  | 'light'
  | 'co2'
  | 'water_level'
  | 'ph'
  | 'weight';

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
  zoneName: string;
  metric: MetricConfig;
  data: HalSensorReading[];
}

const metrics: MetricConfig[] = [
  {
    key: 'temperature',
    label: 'Temperature',
    shortLabel: 'Temp',
    fallbackUnit: '°C',
    color: '#F59E0B',
    description: 'Air / probe temperature',
    minAxis: 10,
    maxAxis: 40,
  },
  {
    key: 'humidity',
    label: 'Humidity',
    shortLabel: 'RH',
    fallbackUnit: '%',
    color: '#38BDF8',
    description: 'Relative humidity',
    minAxis: 0,
    maxAxis: 100,
  },
  {
    key: 'soil_moisture',
    label: 'Soil Moisture',
    shortLabel: 'Soil',
    fallbackUnit: '%',
    color: '#EF4444',
    description: 'Volumetric water content',
    minAxis: 0,
    maxAxis: 100,
  },
  {
    key: 'co2',
    label: 'CO₂',
    shortLabel: 'CO₂',
    fallbackUnit: 'ppm',
    color: '#22C55E',
    description: 'Carbon dioxide',
    minAxis: 0,
    maxAxis: 2000,
  },
  {
    key: 'light',
    label: 'Light',
    shortLabel: 'Light',
    fallbackUnit: 'lux',
    color: '#FACC15',
    description: 'PAR / illuminance',
    minAxis: 0,
    maxAxis: 100000,
  },
  {
    key: 'water_level',
    label: 'Water Level',
    shortLabel: 'Water',
    fallbackUnit: '%',
    color: '#2563EB',
    description: 'Reservoir level',
    minAxis: 0,
    maxAxis: 100,
  },
  {
    key: 'ph',
    label: 'pH',
    shortLabel: 'pH',
    fallbackUnit: '',
    color: '#A855F7',
    description: 'Acidity / alkalinity',
    minAxis: 0,
    maxAxis: 14,
  },
  {
    key: 'weight',
    label: 'Weight',
    shortLabel: 'Weight',
    fallbackUnit: 'kg',
    color: '#94A3B8',
    description: 'Load cell',
    minAxis: 0,
    maxAxis: 100,
  },
];

const viewState = {
  deviceId: 'all',
  range: '24H' as '1H' | '6H' | '24H' | '7D' | '30D',
  activeMetrics: new Set<MetricKey>(['temperature', 'humidity', 'co2']),
  availableMetrics: new Set<MetricKey>(['temperature', 'humidity', 'co2']),
  activeZone: '', // Empty = All Zones by default
  zoneSelectionInitialized: false,
  decisions: [] as HalDecision[],
};

let loadSequence = 0;

const DECISION_COLORS: Record<string, string> = {
  success: '#6DFF9A',
  failure: '#FF5C6C',
  pending: '#FFC857',
};

export async function renderSensors(container: HTMLElement): Promise<void> {
  const store = getStore();
  const sensors = store.devices.filter((d) => d.type === 'sensor');
  const validDeviceIds = new Set(['all', ...sensors.map((s) => s.id)]);
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
            ${sensors.map((s) => `<option value="${s.id}" ${viewState.deviceId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
          </select>
          <div class="time-range-group" role="group">
            ${(['1H', '6H', '24H', '7D', '30D'] as const)
              .map(
                (r) =>
                  `<button class="hal-range-btn ${r === viewState.range ? 'active' : ''}" data-range="${r}">${r}</button>`,
              )
              .join('')}
          </div>
          <button class="hal-range-btn" id="unit-toggle">${store.unitSystem === 'metric' ? '°C' : '°F'}</button>
          <button class="hal-range-btn" id="time-format-toggle">${store.timeFormat === '24h' ? '24H' : '12H'}</button>
        </div>
      </div>

      <div class="zone-bar" id="zone-bar"></div>

      <div class="metric-bar" id="metric-bar">
        ${metrics
          .map((m) => {
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
          })
          .join('')}
      </div>

      <div class="hero-chart-wrap">
        <div id="hero-chart" class="hero-chart">
          <div class="chart-empty">Loading sensor data...</div>
        </div>
        <div class="hero-legend" id="hero-legend"></div>
      </div>
    </div>

    <!-- Metric Strips - hidden, using hero chart only -->
    <div class="horizon-strips-section collapsible-section" id="strips-section" style="display:none">
      <div class="collapsible-header" data-target="strips-content">
        <h2 class="section-title">Metric Strips</h2>
        <button class="collapsible-toggle" aria-expanded="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      <div class="collapsible-content" id="strips-content">
        <div class="horizon-strips-grid" id="horizon-strips"></div>
      </div>
    </div>

    <div class="viz-grid" id="viz-grid" style="display:none"></div>

    <div class="sensor-detail-drawer collapsible-section collapsed" id="detail-drawer-section" style="max-height:0;overflow:hidden">
      <div class="collapsible-header" data-target="detail-drawer">
        <div class="detail-header" style="margin:0">
          <h3 class="section-title">Readings</h3>
          <span class="text-xs text-secondary" id="detail-count">--</span>
        </div>
        <button class="collapsible-toggle" aria-expanded="false">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
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

export async function refreshSensorsLiveData(): Promise<void> {
  const store = getStore();
  const sensors = store.devices.filter((d) => d.type === 'sensor');
  await loadData(sensors, { showLoading: false });
}

function attachHandlers(sensors: ReturnType<typeof getStore>['devices']): void {
  const deviceSelect = document.getElementById(
    'sensor-device-select',
  ) as HTMLSelectElement | null;
  deviceSelect?.addEventListener('change', () => {
    viewState.deviceId = deviceSelect.value || 'all';
    void loadData(sensors);
  });

  document
    .querySelectorAll<HTMLButtonElement>('.hal-range-btn[data-range]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('.hal-range-btn[data-range]')
          .forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        viewState.range =
          (btn.dataset.range as typeof viewState.range) || '24H';
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

  document
    .querySelectorAll<HTMLButtonElement>('.metric-pill')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const metric = btn.dataset.metric as MetricKey;
        if (!viewState.availableMetrics.has(metric)) return;
        if (viewState.activeMetrics.has(metric)) {
          const activeAvailable = Array.from(viewState.activeMetrics).filter(
            (key) => viewState.availableMetrics.has(key),
          );
          // Keep at least one active metric so the hero chart never blanks due to toggles.
          if (activeAvailable.length <= 1) return;
          viewState.activeMetrics.delete(metric);
        } else {
          viewState.activeMetrics.add(metric);
        }
        syncMetricPills();
        void loadData(sensors);
      });
    });

  // Collapsible section handlers
  document.querySelectorAll('.collapsible-header').forEach((header) => {
    header.addEventListener('click', () => {
      const section = header.closest('.collapsible-section');
      if (!section) return;
      const isCollapsed = section.classList.toggle('collapsed');
      const btn = header.querySelector('.collapsible-toggle');
      if (btn)
        btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    });
  });
}

async function loadData(
  sensors: ReturnType<typeof getStore>['devices'],
  opts: { showLoading?: boolean } = {},
): Promise<void> {
  const sequence = ++loadSequence;
  const selectedDevices =
    viewState.deviceId === 'all'
      ? sensors
      : sensors.filter((s) => s.id === viewState.deviceId);
  const { from, to } = getRangeBounds(viewState.range);
  viewState.availableMetrics = getAvailableMetrics(selectedDevices);
  reconcileActiveMetrics();
  syncMetricPills();
  const activeMetricConfigs = metrics.filter((m) =>
    viewState.activeMetrics.has(m.key),
  );

  const heroChart = document.getElementById('hero-chart');
  if (heroChart && opts.showLoading !== false)
    heroChart.innerHTML = '<div class="chart-empty">Loading...</div>';

  try {
    const layers: SeriesLayer[] = [];
    const [decisions, historyMap] = await Promise.all([
      halApi.getDecisions(50).catch(() => [] as HalDecision[]),
      halApi
        .getSensorHistoryBatch(
          selectedDevices.map((d) => d.id),
          activeMetricConfigs.map((m) => m.key),
          from,
          to,
        )
        .catch(() => new Map<string, HalSensorReading[]>()),
    ]);
    for (const device of selectedDevices) {
      for (const metric of activeMetricConfigs) {
        const data = historyMap.get(`${device.id}|${metric.key}`) ?? [];
        if (data.length > 0) {
          layers.push({
            deviceId: device.id,
            deviceName: device.name,
            zoneName: resolveZoneName(
              device.id,
              device.name,
              (device as any).zone,
            ),
            metric,
            data,
          });
        }
      }
    }

    if (sequence !== loadSequence) return;

    // Derive zones from loaded layers and render zone toggles
    const zones = [...new Set(layers.map((l) => l.zoneName).filter(Boolean))];
    renderZoneToggles(zones);

    // Only expose connected metrics, and always keep at least one active metric.
    viewState.availableMetrics = getAvailableMetrics(selectedDevices);
    reconcileActiveMetrics();
    syncMetricPills();

    // Filter layers to only the selected zone
    const zoneLayers = viewState.activeZone
      ? layers.filter((l) => l.zoneName === viewState.activeZone)
      : layers;

    viewState.decisions = decisions;
    renderHeroChart(zoneLayers, decisions);
    renderDetailTable(zoneLayers);
    updatePillValues(zoneLayers);
  } catch (err: any) {
    console.error('Sensor load failed:', err);
    if (heroChart)
      heroChart.innerHTML = '<div class="chart-empty">Failed to load</div>';
  }
}

function renderZoneToggles(zones: string[]): void {
  const container = document.getElementById('zone-bar');
  if (!container) return;

  const sortedZones = zones.slice().sort((a, b) => {
    if (a === 'Unzoned') return 1;
    if (b === 'Unzoned') return -1;
    return a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });

  if (sortedZones.length > 0) {
    if (!viewState.zoneSelectionInitialized) {
      // Default to All Zones (empty string)
      viewState.activeZone = '';
      viewState.zoneSelectionInitialized = true;
    } else if (
      viewState.activeZone &&
      !sortedZones.includes(viewState.activeZone)
    ) {
      viewState.activeZone = '';
    }
  } else {
    viewState.activeZone = '';
    viewState.zoneSelectionInitialized = false;
  }

  if (zones.length <= 1) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = [
    `<button class="zone-pill ${viewState.activeZone ? '' : 'active'}" data-zone="__all__">All Zones</button>`,
    ...sortedZones.map((z) => {
      const isActive = z === viewState.activeZone;
      return `<button class="zone-pill ${isActive ? 'active' : ''}" data-zone="${escapeAttr(z)}">${escapeHtml(z)}</button>`;
    }),
  ].join('');

  container.querySelectorAll('.zone-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      const zone = (btn as HTMLElement).dataset.zone;
      if (zone) {
        viewState.activeZone = zone === '__all__' ? '' : zone;
        viewState.zoneSelectionInitialized = true;
        // Update active visual state without full re-fetch
        container.querySelectorAll('.zone-pill').forEach((pill) => {
          const pillZone = (pill as HTMLElement).dataset.zone || '';
          const normalized = pillZone === '__all__' ? '' : pillZone;
          pill.classList.toggle('active', normalized === viewState.activeZone);
        });
        // Re-render chart with current layers filtered to new zone
        const store = getStore();
        const sensors = store.devices.filter((d) => d.type === 'sensor');
        void loadData(sensors);
      }
    });
  });
}

function getRangeBounds(range: typeof viewState.range): {
  from: string;
  to: string;
} {
  const to = new Date();
  const from = new Date();
  switch (range) {
    case '1H':
      from.setHours(from.getHours() - 1);
      break;
    case '6H':
      from.setHours(from.getHours() - 6);
      break;
    case '7D':
      from.setDate(from.getDate() - 7);
      break;
    case '30D':
      from.setDate(from.getDate() - 30);
      break;
    default:
      from.setDate(from.getDate() - 1);
      break;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

function getAvailableMetrics(
  selectedDevices: ReturnType<typeof getStore>['devices'],
): Set<MetricKey> {
  const store = getStore();
  const available = new Set<MetricKey>();
  const zoneDevices = viewState.activeZone
    ? selectedDevices.filter(
        (device) =>
          resolveZoneName(device.id, device.name, (device as any).zone) ===
          viewState.activeZone,
      )
    : selectedDevices;

  for (const device of zoneDevices) {
    const snapshot = store.sensors[device.id] as
      | Record<string, HalSensorReading | undefined>
      | undefined;
    if (!snapshot) continue;
    for (const metric of metrics) {
      const reading = snapshot[metric.key];
      if (
        reading &&
        typeof reading.value === 'number' &&
        Number.isFinite(reading.value)
      ) {
        available.add(metric.key);
      }
    }
  }

  return available;
}

function resolveZoneName(
  deviceId: string,
  deviceName: string,
  zone?: string | null,
): string {
  // Zone from device registry takes precedence (VAL-DISC-051)
  if (zone && zone.trim()) return zone.trim();
  // Fallback: infer from device ID or name
  if (deviceId.startsWith('tent_a_')) return 'Tent A';
  if (deviceId.startsWith('tent_b_')) return 'Tent B';
  if (/tent\s*a/i.test(deviceName)) return 'Tent A';
  if (/tent\s*b/i.test(deviceName)) return 'Tent B';
  return 'Unzoned';
}

function reconcileActiveMetrics(): void {
  for (const metricKey of Array.from(viewState.activeMetrics)) {
    if (!viewState.availableMetrics.has(metricKey)) {
      viewState.activeMetrics.delete(metricKey);
    }
  }

  if (viewState.activeMetrics.size > 0) return;
  const fallback =
    (['temperature', 'humidity', 'co2'] as MetricKey[]).find((key) =>
      viewState.availableMetrics.has(key),
    ) ?? Array.from(viewState.availableMetrics)[0];
  if (fallback) viewState.activeMetrics.add(fallback);
}

function syncMetricPills(): void {
  document.querySelectorAll<HTMLElement>('.metric-pill').forEach((pill) => {
    const key = pill.dataset.metric as MetricKey;
    const available = viewState.availableMetrics.has(key);
    pill.style.display = available ? '' : 'none';
    pill.classList.toggle(
      'active',
      available && viewState.activeMetrics.has(key),
    );
    pill.setAttribute(
      'aria-pressed',
      available && viewState.activeMetrics.has(key) ? 'true' : 'false',
    );
  });
}

/* ─────────────── Hero Chart (Stacked Area) ─────────────── */

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHeroChart(
  layers: SeriesLayer[],
  _decisions: HalDecision[] = [],
): void {
  const container = document.getElementById('hero-chart');
  const legend = document.getElementById('hero-legend');
  if (!container) return;

  if (layers.length === 0) {
    container.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'chart-empty';
    empty.textContent = 'No data for selection';
    container.appendChild(empty);
    if (legend) legend.textContent = '';
    return;
  }

  const store = getStore();

  // Group layers by metric and average matching timestamps across devices.
  const metricGroups = new Map<string, SeriesLayer[]>();
  for (const layer of layers) {
    const list = metricGroups.get(layer.metric.key) || [];
    list.push(layer);
    metricGroups.set(layer.metric.key, list);
  }

  const bucketMap = new Map<
    number,
    Record<string, { sum: number; count: number }>
  >();
  const series = Array.from(metricGroups.entries()).map(
    ([metricKey, metricLayers]) => {
      const metric = metricLayers[0].metric;
      const firstReading = metricLayers.flatMap((layer) => layer.data)[0];
      const converted = firstReading
        ? formatSensorValue(firstReading.value, metric.key, store.unitSystem)
        : null;
      return {
        key: metricKey,
        label: metric.label,
        color: metric.color,
        unit: converted?.unit || metric.fallbackUnit,
      };
    },
  );

  for (const [metricKey, metricLayers] of metricGroups) {
    for (const l of metricLayers) {
      for (const d of l.data) {
        const t = new Date(d.timestamp).getTime();
        if (!Number.isFinite(t)) continue;
        const bucket = Math.floor(t / 60000) * 60000;
        const converted = formatSensorValue(
          d.value,
          metricKey as MetricKey,
          store.unitSystem,
        ).value;
        const bucketValues = bucketMap.get(bucket) || {};
        const current = bucketValues[metricKey] || { sum: 0, count: 0 };
        current.sum += converted;
        current.count += 1;
        bucketValues[metricKey] = current;
        bucketMap.set(bucket, bucketValues);
      }
    }
  }

  const bucketEntries = Array.from(bucketMap.entries()).sort(
    (a, b) => a[0] - b[0],
  );
  const chartMetrics = series.map((metric) => ({
    ...metric,
    data: bucketEntries
      .map(([timestamp, values]) => {
        const aggregate = values[metric.key];
        return aggregate && aggregate.count > 0
          ? { t: timestamp, v: aggregate.sum / aggregate.count }
          : null;
      })
      .filter((point): point is { t: number; v: number } => point !== null),
  }));

  const deviceName =
    viewState.deviceId === 'all' ? 'All Sensors' : layers[0]?.deviceName;
  const zoneName = viewState.activeZone || 'All Zones';
  const subtitle = `${deviceName || 'Sensors'} · ${zoneName} · ${viewState.range}`;

  try {
    renderSensorEnvironmentHero(chartMetrics, 'hero-chart', { subtitle });
  } catch (err) {
    const heroContainer = document.getElementById('hero-chart');
    if (heroContainer)
      heroContainer.innerHTML = `<div class="chart-empty">Chart error</div>`;
    console.error('Environment chart render failed:', err);
  }

  // Legend is handled internally by the environment chart stack.
  if (legend) legend.innerHTML = '';
}

/* ─────────────── Detail table ─────────────── */

function renderDetailTable(layers: SeriesLayer[]): void {
  const tbody = document.getElementById('detail-body');
  const count = document.getElementById('detail-count');
  if (!tbody) return;

  const store = getStore();
  const rows = layers
    .flatMap((layer) =>
      layer.data.slice(-15).map((reading) => {
        const converted = formatSensorValue(
          reading.value,
          layer.metric.key,
          store.unitSystem,
        );
        return {
          time: reading.timestamp,
          device: layer.deviceName,
          metric: layer.metric.label,
          value: formatValue(
            converted.value,
            converted.unit || layer.metric.fallbackUnit,
          ),
          color: layer.metric.color,
        };
      }),
    )
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  if (count) count.textContent = `${rows.length} readings`;

  if (rows.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="empty-cell">No data</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr style="--metric-color:${r.color}">
      <td class="text-mono text-xs">${formatDateTimeValue(new Date(r.time), store.timeFormat)}</td>
      <td>${escapeHtml(r.device)}</td>
      <td><span class="history-dot"></span>${escapeHtml(r.metric)}</td>
      <td class="text-mono metric-value">${r.value}</td>
    </tr>
  `,
    )
    .join('');
}

/* ─────────────── Pill live values ─────────────── */

function updatePillValues(layers: SeriesLayer[]): void {
  const store = getStore();
  metrics.forEach((m) => {
    const el = document.getElementById(`pill-${m.key}`);
    if (!el) return;
    const layer = layers.find((l) => l.metric.key === m.key);
    if (!layer || layer.data.length === 0) {
      el.textContent = '--';
      return;
    }
    const latest = layer.data[layer.data.length - 1];
    const converted = formatSensorValue(latest.value, m.key, store.unitSystem);
    el.textContent = formatValue(
      converted.value,
      converted.unit || m.fallbackUnit,
    );
  });
}

/* ─────────────── Horizon Strips ─────────────── */

function renderHorizonStrips(allLayers: SeriesLayer[]): void {
  const container = document.getElementById('horizon-strips');
  if (!container) return;
  if (allLayers.length === 0) {
    container.textContent = '';
    return;
  }

  const store = getStore();
  const byMetric = new Map<string, SeriesLayer>();
  for (const layer of allLayers) {
    if (!byMetric.has(layer.metric.key)) byMetric.set(layer.metric.key, layer);
  }

  const strips = Array.from(byMetric.values())
    .map((layer) => {
      const { data, metric } = layer;
      if (data.length < 2) return '';
      const converted = formatSensorValue(
        data[data.length - 1].value,
        metric.key,
        store.unitSystem,
      );
      const latestLabel = `${converted.value.toFixed(1)}${converted.unit || metric.fallbackUnit}`;
      const values = data.map(
        (d) => formatSensorValue(d.value, metric.key, store.unitSystem).value,
      );
      const vMin = Math.min(...values);
      const vMax = Math.max(...values);
      const vSpan = Math.max(0.001, vMax - vMin);
      const w = 420,
        h = 52;
      const step = (w - 4) / Math.max(values.length - 1, 1);
      const pts = values
        .map((v, i) => {
          const x = 2 + i * step;
          const y = 2 + ((vMax - v) / vSpan) * (h - 4);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
      const color = metric.color;
      return `<div class="horizon-strip">
      <div class="horizon-strip-header">
        <span class="horizon-strip-label">${escapeHtml(metric.shortLabel)}</span>
        <span class="horizon-strip-value text-mono" style="color:${color}">${latestLabel}</span>
      </div>
      <svg viewBox="0 0 ${w} ${h}" class="horizon-strip-svg" preserveAspectRatio="none">
        <defs><linearGradient id="hs-grad-${metric.key}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0.02"/></linearGradient></defs>
        <path d="M2,${h - 2} ${pts} ${(2 + (values.length - 1) * step).toFixed(1)},${h - 2} Z" fill="url(#hs-grad-${metric.key})" stroke="none"/>
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
    </div>`;
    })
    .filter(Boolean);

  container.innerHTML = strips.join('');
}

/* ─────────────── Viz Cards ─────────────── */

function renderVizCards(
  allLayers: SeriesLayer[],
  decisions: HalDecision[] = [],
): void {
  const grid = document.getElementById('viz-grid');
  if (!grid) return;
  if (allLayers.length === 0) {
    grid.textContent = '';
    return;
  }

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
  if (tempLayers)
    cards.push(renderAreaCard(tempLayers[0], 'Temperature Trend'));

  // 2. Line card — humidity
  const humLayers = byMetric.get('humidity');
  if (humLayers) cards.push(renderLineCard(humLayers[0], 'Humidity Trend'));

  // 3. Bar card — CO2
  const co2Layers = byMetric.get('co2');
  if (co2Layers) cards.push(renderBarCard(co2Layers[0], 'CO₂ Levels'));

  // 4. Gauge card — latest value of any metric
  const first = allLayers[0];
  if (first) cards.push(renderGaugeCard(first, 'Latest Reading'));

  // 5. Sensor Quality Matrix — freshness per device × metric
  cards.push(renderQualityMatrix(allLayers, decisions));

  grid.innerHTML = cards.join('');
}

function renderAreaCard(layer: SeriesLayer, title: string): string {
  const { data, metric } = layer;
  const store = getStore();
  const latest = formatSensorValue(
    data[data.length - 1].value,
    metric.key,
    store.unitSystem,
  );
  const unit = latest.unit || metric.fallbackUnit;
  const id = `area-${metric.key}-${Math.random().toString(36).slice(2, 7)}`;
  // Schedule ChartKit render after DOM insertion
  setTimeout(() => {
    void import('../components/ChartKit.js').then((m) => {
      m.renderAreaCard(data, metric.key, id, title);
    });
  }, 0);
  return `<div class="viz-card" id="${id}">
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml(title)}</span>
      <span class="viz-card-value text-mono" style="color:${metric.color}">${latest.value.toFixed(1)}${unit}</span>
    </div>
    <div class="viz-chart-placeholder" style="height:100px;"></div>
  </div>`;
}

function renderLineCard(layer: SeriesLayer, title: string): string {
  const { data, metric } = layer;
  const store = getStore();
  const latest = formatSensorValue(
    data[data.length - 1].value,
    metric.key,
    store.unitSystem,
  );
  const unit = latest.unit || metric.fallbackUnit;
  const id = `line-${metric.key}-${Math.random().toString(36).slice(2, 7)}`;
  setTimeout(() => {
    void import('../components/ChartKit.js').then((m) => {
      m.renderLineCard(data, metric.key, id, title);
    });
  }, 0);
  return `<div class="viz-card" id="${id}">
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml(title)}</span>
      <span class="viz-card-value text-mono" style="color:${metric.color}">${latest.value.toFixed(0)}${unit}</span>
    </div>
    <div class="viz-chart-placeholder" style="height:100px;"></div>
  </div>`;
}

function renderBarCard(layer: SeriesLayer, title: string): string {
  const { data, metric } = layer;
  const store = getStore();
  const latest = formatSensorValue(
    data[data.length - 1].value,
    metric.key,
    store.unitSystem,
  );
  const unit = latest.unit || metric.fallbackUnit;
  const id = `bar-${metric.key}-${Math.random().toString(36).slice(2, 7)}`;
  setTimeout(() => {
    void import('../components/ChartKit.js').then((m) => {
      m.renderBarCard(data, metric.key, id, title);
    });
  }, 0);
  return `<div class="viz-card" id="${id}">
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml(title)}</span>
      <span class="viz-card-value text-mono" style="color:${metric.color}">${latest.value.toFixed(0)}${unit}</span>
    </div>
    <div class="viz-chart-placeholder" style="height:100px;"></div>
  </div>`;
}

function renderGaugeCard(layer: SeriesLayer, title: string): string {
  const { data, metric } = layer;
  const store = getStore();
  const latest = formatSensorValue(
    data[data.length - 1].value,
    metric.key,
    store.unitSystem,
  );
  const unit = latest.unit || metric.fallbackUnit;
  let axisMin = metric.minAxis,
    axisMax = metric.maxAxis;
  if (metric.key === 'temperature' && store.unitSystem === 'imperial') {
    axisMin = (axisMin * 9) / 5 + 32;
    axisMax = (axisMax * 9) / 5 + 32;
  }
  const pct = Math.max(
    0,
    Math.min(1, (latest.value - axisMin) / (axisMax - axisMin)),
  );
  const r = 42,
    cx = 80,
    cy = 56;
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

function renderQualityMatrix(
  layers: SeriesLayer[],
  decisions: HalDecision[],
): string {
  // Rows = devices, cols = active metrics. Color = data freshness/quality.
  const now = Date.now();
  const staleMs = 10 * 60 * 1000; // 10 min = stale

  // Build unique device list from layers
  const deviceMap = new Map<string, string>(); // deviceId -> deviceName
  const metricSet = new Set<string>();
  for (const l of layers) {
    deviceMap.set(l.deviceId, l.deviceName);
    metricSet.add(l.metric.key);
  }

  const deviceIds = Array.from(deviceMap.keys());
  const metricKeys = Array.from(metricSet);

  if (deviceIds.length === 0) return '';

  // Build lookup: deviceId+metric -> latest timestamp
  const latestMap = new Map<string, number>();
  for (const l of layers) {
    if (l.data.length === 0) continue;
    const last = l.data[l.data.length - 1];
    latestMap.set(
      `${l.deviceId}:${l.metric.key}`,
      new Date(last.timestamp).getTime(),
    );
  }

  const qualityColor = (ageMs: number | undefined): string => {
    if (ageMs === undefined) return '#1A2822';
    if (ageMs < staleMs) return '#6DFF9A';
    if (ageMs < staleMs * 6) return '#FFC857';
    return '#FF5C6C';
  };

  const qualityLabel = (ageMs: number | undefined): string => {
    if (ageMs === undefined) return 'no data';
    const mins = Math.floor(ageMs / 60000);
    return mins < 1 ? 'just now' : `${mins}m ago`;
  };

  const headerCols = metricKeys
    .map((k) => {
      const cfg = metrics.find((m) => m.key === k);
      return `<th class="qm-th">${escapeHtml(cfg?.shortLabel || k)}</th>`;
    })
    .join('');

  const rows = deviceIds
    .map((deviceId) => {
      const name = deviceMap.get(deviceId) || deviceId;
      const cells = metricKeys
        .map((metricKey) => {
          const ts = latestMap.get(`${deviceId}:${metricKey}`);
          const ageMs = ts !== undefined ? now - ts : undefined;
          const color = qualityColor(ageMs);
          const label = qualityLabel(ageMs);
          return `<td class="qm-cell" title="${escapeHtml(name)} · ${metricKey} · ${label}"><span class="qm-dot" style="background:${color}"></span></td>`;
        })
        .join('');
      return `<tr><td class="qm-device">${escapeHtml(name.length > 20 ? name.slice(0, 18) + '…' : name)}</td>${cells}</tr>`;
    })
    .join('');

  const recentDecisionCount = decisions.filter(
    (d) => now - new Date(d.timestamp).getTime() < 3600000,
  ).length;

  return `
    <div class="viz-card wide">
      <div class="viz-card-header">
        <span class="viz-card-title">Sensor Quality</span>
        <span class="viz-card-value text-mono text-secondary">${recentDecisionCount} decisions / 1h</span>
      </div>
      <div class="qm-legend">
        <span class="qm-legend-item"><span class="qm-dot" style="background:#6DFF9A"></span>Fresh</span>
        <span class="qm-legend-item"><span class="qm-dot" style="background:#FFC857"></span>Stale</span>
        <span class="qm-legend-item"><span class="qm-dot" style="background:#FF5C6C"></span>Old</span>
        <span class="qm-legend-item"><span class="qm-dot" style="background:#1A2822"></span>Missing</span>
      </div>
      <div class="qm-table-wrap">
        <table class="qm-table">
          <thead><tr><th class="qm-th-device">Device</th>${headerCols}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
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
  min-width: 0;
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
.zone-bar {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: var(--space-2);
}
.zone-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all var(--transition-fast);
  user-select: none;
}
.zone-pill.active {
  background: var(--accent);
  border-color: var(--accent);
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
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  position: relative;
}
.hero-chart {
  width: 100%;
  min-height: 380px;
  position: relative;
  overflow: visible;
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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  grid-auto-rows: minmax(140px, auto);
  align-items: stretch;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
.viz-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-2);
  min-height: 140px;
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
  min-height: 0;
  flex: 1;
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
  overflow-x: auto;
  overflow-y: hidden;
}
.hal-table {
  width: 100%;
  min-width: 560px;
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

/* ── Horizon strips ── */
.horizon-strips-section {
  margin-top: var(--space-6);
}
.horizon-strips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-auto-rows: minmax(140px, auto);
  align-items: stretch;
  gap: var(--space-3);
  margin-top: var(--space-3);
}
.horizon-strip {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  overflow: hidden;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.horizon-strip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.horizon-strip-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}
.horizon-strip-value {
  font-size: 13px;
  font-weight: 600;
}
.horizon-strip-svg {
  display: block;
  width: 100%;
  flex: 1;
  min-height: 40px;
}

/* ── Quality Matrix ── */
.qm-legend {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  flex-wrap: wrap;
}
.qm-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-secondary);
}
.qm-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.qm-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 11px;
}
.qm-table-wrap {
  overflow-x: auto;
  overflow-y: hidden;
}
.qm-th, .qm-th-device {
  text-align: left;
  padding: var(--space-1) var(--space-2);
  color: var(--text-tertiary);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.qm-th-device { min-width: 120px; }
.qm-cell {
  padding: var(--space-1) var(--space-2);
  text-align: center;
  border-bottom: 1px solid var(--border-subtle);
}
.qm-device {
  padding: var(--space-1) var(--space-2);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
  font-size: 11px;
  white-space: nowrap;
}
.qm-table tbody tr:last-child td { border-bottom: none; }
.qm-table tbody tr:hover td { background: var(--bg-tertiary); }

/* ── Collapsible sections ── */
.collapsible-section {
  margin-top: var(--space-4);
}
.collapsible-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: var(--space-2) 0;
  user-select: none;
}
.collapsible-header:hover .section-title {
  color: var(--text-primary);
}
.collapsible-toggle {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-fast);
}
.collapsible-toggle svg {
  transition: transform var(--transition-fast);
}
.collapsible-section.collapsed .collapsible-toggle svg {
  transform: rotate(-90deg);
}
.collapsible-content {
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.3s ease;
  max-height: 2000px;
  opacity: 1;
}
.collapsible-section.collapsed .collapsible-content {
  max-height: 0;
  opacity: 0;
}

/* ── Hero chart sizing ── */
#hero-chart {
  width: 100%;
  position: relative;
}
#hero-chart .ck-chart,
#hero-chart .hal-chart-card {
  width: 100%;
}
#hero-chart .hero-svg {
  width: 100%;
  height: auto;
  display: block;
}
#hero-chart .chart-empty {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}
#hero-chart .stack-chart,
#hero-chart .lake-chart-inner {
  width: 100%;
}

@media (max-width: 1023px) {
  .viz-grid { grid-template-columns: repeat(2, 1fr); }
  .viz-card.wide { grid-column: span 2; }
  .horizon-strips-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .sensors-hero-header { flex-direction: column; align-items: flex-start; }
  .sensors-hero-controls {
    width: 100%;
  }
  .hal-input {
    width: 100%;
  }
  .hero-chart { min-height: 200px; }
  .metric-bar { gap: var(--space-1); }
  .metric-pill { height: 32px; padding: 0 10px; font-size: 11px; }
  .viz-grid { grid-template-columns: 1fr; }
  .viz-card.wide { grid-column: span 1; }
  .horizon-strips-grid { grid-template-columns: 1fr; }
}
`;
  document.head.appendChild(style);
}
