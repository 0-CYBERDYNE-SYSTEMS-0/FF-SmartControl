// System view — multi-metric overview using the same chart pipeline as Sensors

import { getStore, setStore, formatSensorValue, formatTimeValue } from '../store.js';
import { halApi } from '../api.js';
import { renderFarmPalSensorChart } from '../components/FarmPalCharts.js';

type MetricKey = 'temperature' | 'humidity' | 'soil_moisture' | 'light' | 'co2' | 'water_level' | 'ph' | 'weight';

interface SystemMetricConfig {
  key: MetricKey;
  label: string;
  shortLabel: string;
  fallbackUnit: string;
  color: string;
  minAxis: number;
  maxAxis: number;
}

const systemMetrics: SystemMetricConfig[] = [
  { key: 'temperature', label: 'Temperature', shortLabel: 'Temp', fallbackUnit: '°C', color: '#F59E0B', minAxis: 10, maxAxis: 40 },
  { key: 'humidity', label: 'Humidity', shortLabel: 'RH', fallbackUnit: '%', color: '#38BDF8', minAxis: 0, maxAxis: 100 },
  { key: 'co2', label: 'CO₂', shortLabel: 'CO₂', fallbackUnit: 'ppm', color: '#22C55E', minAxis: 0, maxAxis: 2000 },
];

let systemViewRange: '1H' | '6H' | '24H' | '7D' | '30D' = '24H';

function getRangeBounds(range: typeof systemViewRange): { from: string; to: string } {
  const now = new Date();
  const ms: Record<typeof systemViewRange, number> = {
    '1H': 60 * 60 * 1000,
    '6H': 6 * 60 * 60 * 1000,
    '24H': 24 * 60 * 60 * 1000,
    '7D': 7 * 24 * 60 * 60 * 1000,
    '30D': 30 * 24 * 60 * 60 * 1000,
  };
  return {
    from: new Date(now.getTime() - ms[range]).toISOString(),
    to: now.toISOString(),
  };
}

export async function renderSystemView(container: HTMLElement): Promise<void> {
  const store = getStore();
  const sensors = store.devices.filter((d) => d.type === 'sensor');

  injectSystemStyles();

  const root = document.createElement('div');
  root.className = 'system-view';

  // Header
  const header = document.createElement('div');
  header.className = 'sensors-hero-header';
  header.innerHTML = `
    <div class="sensors-hero-title">
      <h1 class="page-title">System</h1>
      <p class="page-subtitle">System overview</p>
    </div>
    <div class="sensors-hero-controls">
      <div class="time-range-group" role="group">
        ${(['1H', '6H', '24H', '7D', '30D'] as const)
          .map((r) => `<button class="hal-range-btn ${r === systemViewRange ? 'active' : ''}" data-range="${r}">${r}</button>`)
          .join('')}
      </div>
      <button class="hal-range-btn" id="sys-unit-toggle">${store.unitSystem === 'metric' ? '°C' : '°F'}</button>
    </div>
  `;
  root.appendChild(header);

  // Metric pills (display-only, not interactive)
  const metricBar = document.createElement('div');
  metricBar.className = 'metric-bar';
  metricBar.id = 'sys-metric-bar';
  for (const m of systemMetrics) {
    const pill = document.createElement('div');
    pill.className = 'sys-metric-pill';
    pill.style.setProperty('--metric-color', m.color);
    pill.innerHTML = `<span class="pill-dot"></span><span class="pill-label">${m.shortLabel}</span><span class="pill-value text-mono" id="sys-pill-${m.key}">--</span>`;
    metricBar.appendChild(pill);
  }
  root.appendChild(metricBar);

  // Hero chart
  const chartWrap = document.createElement('div');
  chartWrap.className = 'hero-chart-wrap';
  const chartEl = document.createElement('div');
  chartEl.id = 'system-hero-chart';
  chartEl.className = 'hero-chart';
  chartEl.innerHTML = '<div class="chart-empty">Loading...</div>';
  chartWrap.appendChild(chartEl);
  root.appendChild(chartWrap);

  // Device status
  const drawer = document.createElement('div');
  drawer.className = 'sensor-detail-drawer';
  drawer.style.marginTop = 'var(--space-4)';
  const drawerTitle = document.createElement('h3');
  drawerTitle.className = 'section-title';
  drawerTitle.textContent = 'Device Status';
  drawer.appendChild(drawerTitle);
  const grid = document.createElement('div');
  grid.id = 'device-status-grid';
  grid.className = 'device-mini-grid';
  for (const s of sensors) {
    const card = document.createElement('div');
    card.className = `device-mini-card ${s.online ? 'online' : 'offline'}`;
    const name = document.createElement('div');
    name.className = 'device-mini-name';
    name.textContent = s.name;
    const meta = document.createElement('div');
    meta.className = 'device-mini-meta text-xs text-secondary';
    meta.textContent = s.protocol;
    card.appendChild(name);
    card.appendChild(meta);
    grid.appendChild(card);
  }
  drawer.appendChild(grid);
  root.appendChild(drawer);

  container.innerHTML = '';
  container.appendChild(root);

  // Wire up range buttons
  root.querySelectorAll<HTMLButtonElement>('.hal-range-btn[data-range]').forEach((btn) => {
    btn.addEventListener('click', () => {
      systemViewRange = btn.dataset.range as typeof systemViewRange;
      root.querySelectorAll('.hal-range-btn[data-range]').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      void loadSystemData();
    });
  });

  const unitToggle = document.getElementById('sys-unit-toggle');
  unitToggle?.addEventListener('click', () => {
    const s = getStore();
    setStore({ unitSystem: s.unitSystem === 'metric' ? 'imperial' : 'metric' });
    unitToggle.textContent = getStore().unitSystem === 'metric' ? '°C' : '°F';
    void loadSystemData();
  });

  await loadSystemData();
}

async function loadSystemData(): Promise<void> {
  const store = getStore();
  const sensors = store.devices.filter((d) => d.type === 'sensor');
  const { from, to } = getRangeBounds(systemViewRange);
  const heroChart = document.getElementById('system-hero-chart');
  if (heroChart) {
    heroChart.innerHTML = '<div class="chart-empty">Loading...</div>';
  }

  try {
    const bucketMap = new Map<number, Record<string, { sum: number; count: number }>>();

    await Promise.all(
      sensors.flatMap((device) =>
        systemMetrics.map(async (metric) => {
          const data = await halApi.getSensorHistory(device.id, metric.key, from, to);
          if (data.length === 0) return;

          const latest = data[data.length - 1];
          const pill = document.getElementById(`sys-pill-${metric.key}`);
          if (pill) {
            const cv = formatSensorValue(latest.value, metric.key, store.unitSystem);
            pill.textContent = `${cv.value.toFixed(1)}${cv.unit || metric.fallbackUnit}`;
          }

          for (const d of data) {
            const t = new Date(d.timestamp).getTime();
            if (!Number.isFinite(t)) continue;
            const bucket = Math.floor(t / 60000) * 60000;
            const cv = formatSensorValue(d.value, metric.key, store.unitSystem).value;
            const row = bucketMap.get(bucket) ?? {};
            const acc = row[metric.key] ?? { sum: 0, count: 0 };
            acc.sum += cv;
            acc.count += 1;
            row[metric.key] = acc;
            bucketMap.set(bucket, row);
          }
        }),
      ),
    );

    const chartData = Array.from(bucketMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([timestamp, values]) => {
        const point: { time: string; [key: string]: string | number | undefined } = {
          time: formatTimeValue(new Date(timestamp), store.timeFormat),
        };
        for (const [key, acc] of Object.entries(values)) {
          if (acc.count > 0) point[key] = acc.sum / acc.count;
        }
        return point;
      });

    if (chartData.length === 0) {
      if (heroChart) heroChart.innerHTML = '<div class="chart-empty">No sensor data</div>';
      return;
    }

    const activeSeries = systemMetrics
      .filter((m) => chartData.some((d) => Number.isFinite(Number(d[m.key]))))
      .map((m) => {
        const sample = chartData.find((d) => Number.isFinite(Number(d[m.key])));
        const cv = sample ? formatSensorValue(Number(sample[m.key]), m.key, store.unitSystem) : null;
        return {
          key: m.key,
          label: m.label,
          color: m.color,
          unit: cv?.unit || m.fallbackUnit,
        };
      });

    renderFarmPalSensorChart('system-hero-chart', chartData, activeSeries, {
      subtitle: `${systemViewRange} · All sensors`,
    });
  } catch (err) {
    console.error('System view load failed:', err);
    if (heroChart) heroChart.innerHTML = '<div class="chart-empty">Failed to load</div>';
  }
}

function injectSystemStyles(): void {
  if (document.getElementById('hal-system-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-system-styles';
  style.textContent = `
    .system-view {
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .sys-metric-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      border-radius: var(--radius-pill);
      border: 1px solid color-mix(in srgb, var(--metric-color) 30%, var(--border));
      background: color-mix(in srgb, var(--metric-color) 8%, var(--bg-secondary));
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      user-select: none;
    }
    .device-mini-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: var(--space-2);
      margin-top: var(--space-3);
    }
    .device-mini-card {
      padding: var(--space-2) var(--space-3);
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      border-left: 3px solid var(--border);
    }
    .device-mini-card.online { border-left-color: var(--accent); }
    .device-mini-card.offline { border-left-color: var(--danger); }
    .device-mini-name { font-size: 12px; font-weight: 500; }
    .device-mini-meta { font-size: 10px; margin-top: 2px; }
    #system-hero-chart {
      width: 100%;
      min-height: 380px;
    }
  `;
  document.head.appendChild(style);
}
