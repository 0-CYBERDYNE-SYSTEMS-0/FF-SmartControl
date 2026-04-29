// System view — stacked area chart for multi-sensor overview

import { getStore } from '../store.js';
import { halApi, type HalSensorReading } from '../api.js';
import { renderStackedAreaChart, type StackedLayer } from '../components/ChartKit.js';
import { formatSensorValue } from '../store.js';

type MetricKey = 'temperature' | 'humidity' | 'soil_moisture' | 'light' | 'co2' | 'water_level' | 'ph' | 'weight';

interface SystemMetricConfig {
  key: MetricKey;
  label: string;
  shortLabel: string;
  fallbackUnit: string;
  color: string;
  description: string;
  minAxis: number;
  maxAxis: number;
}

const systemMetrics: SystemMetricConfig[] = [
  { key: 'temperature', label: 'Temperature', shortLabel: 'Temp', fallbackUnit: '°C', color: '#F59E0B', description: 'Air / probe temperature', minAxis: 10, maxAxis: 40 },
  { key: 'humidity', label: 'Humidity', shortLabel: 'RH', fallbackUnit: '%', color: '#38BDF8', description: 'Relative humidity', minAxis: 0, maxAxis: 100 },
  { key: 'co2', label: 'CO₂', shortLabel: 'CO₂', fallbackUnit: 'ppm', color: '#22C55E', description: 'Carbon dioxide', minAxis: 0, maxAxis: 2000 },
];

let systemViewRange: '1H' | '6H' | '24H' | '7D' | '30D' = '24H';

function getRangeBounds(range: typeof systemViewRange): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;
  switch (range) {
    case '1H': from = new Date(now.getTime() - 60 * 60 * 1000); break;
    case '6H': from = new Date(now.getTime() - 6 * 60 * 60 * 1000); break;
    case '24H': from = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case '7D': from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case '30D': from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
  }
  return { from: from.toISOString(), to };
}

export async function renderSystemView(container: HTMLElement): Promise<void> {
  const store = getStore();
  const sensors = store.devices.filter((d) => d.type === 'sensor');

  container.innerHTML = `
    <div class="sensors-hero">
      <div class="sensors-hero-header">
        <div class="sensors-hero-title">
          <h1 class="page-title">System</h1>
          <p class="page-subtitle">System overview</p>
        </div>
        <div class="sensors-hero-controls">
          <div class="time-range-group" role="group">
            ${(['1H', '6H', '24H', '7D', '30D'] as const)
              .map(
                (r) =>
                  `<button class="hal-range-btn ${r === systemViewRange ? 'active' : ''}" data-range="${r}">${r}</button>`,
              )
              .join('')}
          </div>
          <button class="hal-range-btn" id="unit-toggle">${store.unitSystem === 'metric' ? '°C' : '°F'}</button>
        </div>
      </div>

      <div class="metric-bar" id="metric-bar">
        ${systemMetrics
          .map((m) => `
            <div class="metric-pill active" style="--metric-color:${m.color}">
              <span class="pill-dot"></span>
              <span class="pill-label">${m.shortLabel}</span>
              <span class="pill-value" id="pill-${m.key}">--</span>
            </div>
          `)
          .join('')}
      </div>

      <div class="hero-chart-wrap">
        <div id="hero-chart" class="hero-chart">
          <div class="chart-empty">Loading...</div>
        </div>
        <div class="hero-legend" id="hero-legend"></div>
      </div>

      <div class="sensor-detail-drawer">
        <h3 class="section-title">Device Status</h3>
        <div id="device-status-grid" class="device-mini-grid">
          ${sensors.map((s) => `
            <div class="device-mini-card ${s.online ? 'online' : 'offline'}">
              <div class="device-mini-name">${s.name}</div>
              <div class="device-mini-meta text-xs text-secondary">${s.protocol}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Event listeners
  container.querySelectorAll('.hal-range-btn[data-range]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const range = (btn as HTMLElement).dataset.range as typeof systemViewRange;
      if (range) {
        systemViewRange = range;
        container.querySelectorAll('.hal-range-btn[data-range]').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        void loadSystemData();
      }
    });
  });

  const unitToggle = document.getElementById('unit-toggle');
  if (unitToggle) {
    unitToggle.addEventListener('click', () => {
      setStore({ unitSystem: store.unitSystem === 'metric' ? 'imperial' : 'metric' });
      unitToggle.textContent = store.unitSystem === 'metric' ? '°C' : '°F';
      void loadSystemData();
    });
  }

  await loadSystemData();
}

async function loadSystemData(): Promise<void> {
  const store = getStore();
  const sensors = store.devices.filter((d) => d.type === 'sensor');
  const { from, to } = getRangeBounds(systemViewRange);
  const heroChart = document.getElementById('hero-chart');
  if (heroChart) heroChart.innerHTML = '<div class="chart-empty">Loading...</div>';

  try {
    const layers: StackedLayer[] = [];

    await Promise.all(
      sensors.flatMap((device) =>
        systemMetrics.map(async (metric) => {
          const data = await halApi.getSensorHistory(device.id, metric.key, from, to);
          if (data.length > 0) {
            // Merge into time buckets
            const timeMap = new Map<number, number[]>();
            for (const d of data) {
              const t = new Date(d.timestamp).getTime();
              const bucket = Math.floor(t / 60000) * 60000;
              const converted = formatSensorValue(d.value, metric.key, store.unitSystem).value;
              const list = timeMap.get(bucket) || [];
              list.push(converted);
              timeMap.set(bucket, list);
            }

            const merged = Array.from(timeMap.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([t, vals]) => ({
                t,
                v: vals.reduce((a, b) => a + b, 0) / vals.length,
              }));

            layers.push({
              label: `${device.name} ${metric.label}`,
              color: metric.color,
              data: merged,
            });

            // Update pill with latest value
            if (data.length > 0) {
              const latest = data[data.length - 1];
              const pill = document.getElementById(`pill-${metric.key}`);
              if (pill) {
                const converted = formatSensorValue(latest.value, metric.key, store.unitSystem);
                pill.textContent = `${converted.value.toFixed(1)}${converted.unit || metric.fallbackUnit}`;
              }
            }
          }
        }),
      ),
    );

    if (layers.length === 0) {
      if (heroChart) heroChart.innerHTML = '<div class="chart-empty">No sensor data</div>';
      return;
    }

    renderStackedAreaChart(layers, 'hero-chart', { showLegend: true });
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
    .sensors-hero { padding: var(--space-md); }
    .sensors-hero-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-md); }
    .sensors-hero-title .page-title { margin: 0; font-size: 24px; }
    .sensors-hero-title .page-subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .sensors-hero-controls { display: flex; gap: var(--space-sm); align-items: center; }
    .hero-chart-wrap { margin-bottom: var(--space-md); }
    .hero-chart { min-height: 300px; background: var(--surface-secondary); border-radius: var(--radius-md); border: 1px solid var(--border); }
    .hero-chart .chart-empty { min-height: 300px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
    .hero-legend { display: flex; flex-wrap: wrap; gap: var(--space-sm); padding: var(--space-sm) 0; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--metric-color); }
    .metric-bar { display: flex; gap: var(--space-sm); margin-bottom: var(--space-md); }
    .metric-pill { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--surface-secondary); border: 1px solid var(--border); border-radius: var(--radius-pill); font-size: 12px; }
    .pill-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--metric-color); }
    .pill-label { font-weight: 500; }
    .pill-value { font-family: var(--font-mono); color: var(--text-primary); }
    .sensor-detail-drawer { padding: var(--space-md); background: var(--surface-secondary); border-radius: var(--radius-md); border: 1px solid var(--border); }
    .device-mini-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-sm); margin-top: var(--space-md); }
    .device-mini-card { padding: var(--space-sm); background: var(--surface-tertiary); border-radius: var(--radius-sm); border: 1px solid var(--border); border-left: 3px solid var(--border); }
    .device-mini-card.online { border-left-color: var(--accent); }
    .device-mini-card.offline { border-left-color: var(--danger); }
    .device-mini-name { font-size: 12px; font-weight: 500; }
    .device-mini-meta { font-size: 10px; margin-top: 2px; }
    @media (max-width: 768px) {
      .sensors-hero-header { flex-direction: column; gap: var(--space-sm); }
      .sensors-hero-controls { width: 100%; }
      .metric-bar { overflow-x: auto; padding-bottom: var(--space-sm); }
    }
  `;
  document.head.appendChild(style);
}

// Auto-inject styles when module loads
injectSystemStyles();
