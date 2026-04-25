// Sensors view — SVG chart, time range selector, sensor history table

import { getStore } from '../store.js';
import { halApi, HalSensorReading } from '../api.js';

export async function renderSensors(container: HTMLElement): Promise<void> {
  const store = getStore();
  const sensors = store.devices.filter(d => d.type === 'sensor');

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Sensors</h1>
      <p class="page-subtitle">Real-time sensor readings and history</p>
    </div>

    <div class="sensors-toolbar mb-4">
      <select class="hal-input" id="sensor-device-select">
        ${sensors.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
      </select>
      <select class="hal-input" id="sensor-metric-select">
        <option value="temperature">Temperature</option>
        <option value="humidity">Humidity</option>
      </select>
      <div class="time-range-group">
        ${['1H','6H','24H','7D'].map(r => `<button class="hal-range-btn ${r === '24H' ? 'active' : ''}" data-range="${r}">${r}</button>`).join('')}
      </div>
    </div>

    <div class="hal-card mb-4" style="padding:0;overflow:hidden">
      <div id="sensor-chart" style="height:240px"></div>
    </div>

    <div class="hal-card">
      <h3 class="section-title mb-4">Sensor History</h3>
      <div id="sensor-history-table">
        <table class="hal-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Device</th>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody id="sensor-history-body">
            <tr><td colspan="4" class="text-secondary" style="text-align:center;padding:24px">Select a sensor to view history</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  injectSensorStyles();
  attachSensorHandlers(sensors);
}

async function attachSensorHandlers(sensors: ReturnType<typeof getStore>['devices']): Promise<void> {
  const deviceSelect = document.getElementById('sensor-device-select') as HTMLSelectElement;
  const metricSelect = document.getElementById('sensor-metric-select') as HTMLSelectElement;
  let currentRange = '24H';

  // Time range buttons
  document.querySelectorAll<HTMLButtonElement>('.hal-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hal-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.dataset.range || '24H';
      loadChart();
    });
  });

  async function getRangeMs(range: string): Promise<{ from: string; to: string }> {
    const to = new Date();
    const from = new Date();
    switch (range) {
      case '1H': from.setHours(from.getHours() - 1); break;
      case '6H': from.setHours(from.getHours() - 6); break;
      case '24H': from.setDate(from.getDate() - 1); break;
      case '7D': from.setDate(from.getDate() - 7); break;
    }
    return { from: from.toISOString(), to: to.toISOString() };
  }

  async function loadChart(): Promise<void> {
    if (!deviceSelect.value) return;
    const { from, to } = await getRangeMs(currentRange);
    const metric = metricSelect.value;

    try {
      const data = await halApi.getSensorHistory(deviceSelect.value, metric, from, to);
      renderHistoryTable(data, deviceSelect.value, metric);
      renderSvgChart(data, metric);
    } catch (err: any) {
      console.error('Failed to load sensor history:', err);
    }
  }

  function renderHistoryTable(data: HalSensorReading[], deviceId: string, metric: string): void {
    const tbody = document.getElementById('sensor-history-body');
    if (!tbody) return;
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-secondary" style="text-align:center;padding:24px">No data for selected range</td></tr>';
      return;
    }
    const deviceName = sensors.find(s => s.id === deviceId)?.name || deviceId;
    tbody.innerHTML = data.slice(-20).reverse().map(d => `
      <tr>
        <td class="text-mono text-xs">${formatTime(d.timestamp)}</td>
        <td>${escapeHtml(deviceName)}</td>
        <td>${metric}</td>
        <td class="text-mono text-accent">${d.value.toFixed(2)}${d.unit || ''}</td>
      </tr>
    `).join('');
  }

  function renderSvgChart(data: HalSensorReading[], metric: string): void {
    const container = document.getElementById('sensor-chart');
    if (!container) return;
    if (data.length === 0) {
      container.innerHTML = '<div class="chart-empty">No readings in selected range</div>';
      return;
    }

    const width = Math.max(320, container.clientWidth || 960);
    const height = 240;
    const pad = { top: 24, right: 24, bottom: 34, left: 54 };
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    const x = (idx: number) => pad.left + (idx / Math.max(1, data.length - 1)) * (width - pad.left - pad.right);
    const y = (value: number) => pad.top + ((max - value) / span) * (height - pad.top - pad.bottom);
    const points = data.map((d, idx) => `${x(idx).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
    const areaPoints = `${pad.left},${height - pad.bottom} ${points} ${width - pad.right},${height - pad.bottom}`;
    const unit = data[data.length - 1]?.unit || (metric === 'temperature' ? 'c' : '%');
    const latest = data[data.length - 1];
    const firstLabel = formatTime(data[0].timestamp);
    const lastLabel = formatTime(latest.timestamp);

    container.innerHTML = `
      <svg class="sensor-svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(metric)} history chart">
        <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" class="chart-axis" />
        <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" class="chart-axis" />
        ${[0, 0.25, 0.5, 0.75, 1].map(step => {
          const gy = pad.top + step * (height - pad.top - pad.bottom);
          const label = (max - step * span).toFixed(1);
          return `<line x1="${pad.left}" y1="${gy}" x2="${width - pad.right}" y2="${gy}" class="chart-grid" /><text x="${pad.left - 10}" y="${gy + 4}" class="chart-label" text-anchor="end">${label}</text>`;
        }).join('')}
        <polygon points="${areaPoints}" class="chart-area" />
        <polyline points="${points}" class="chart-line" />
        <circle cx="${x(data.length - 1).toFixed(1)}" cy="${y(latest.value).toFixed(1)}" r="4" class="chart-point" />
        <text x="${pad.left}" y="${height - 10}" class="chart-label">${escapeHtml(firstLabel)}</text>
        <text x="${width - pad.right}" y="${height - 10}" class="chart-label" text-anchor="end">${escapeHtml(lastLabel)}</text>
        <text x="${width - pad.right}" y="22" class="chart-current" text-anchor="end">${latest.value.toFixed(2)}${escapeHtml(unit)}</text>
      </svg>
    `;
  }

  deviceSelect?.addEventListener('change', loadChart);
  metricSelect?.addEventListener('change', loadChart);

  // Initial load
  if (sensors.length > 0) {
    loadChart();
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
  } catch { return '--'; }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function injectSensorStyles(): void {
  if (document.getElementById('hal-sensors-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-sensors-styles';
  style.textContent = `
.sensors-toolbar {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.time-range-group {
  display: flex;
  gap: 2px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 2px;
}
.hal-range-btn {
  font-size: 12px;
  font-weight: 500;
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
.chart-empty {
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 13px;
}
.sensor-svg-chart {
  display: block;
  width: 100%;
  height: 240px;
}
.chart-axis,
.chart-grid {
  stroke: var(--border);
  stroke-width: 1;
}
.chart-grid {
  stroke: var(--border-subtle);
}
.chart-area {
  fill: color-mix(in srgb, var(--accent) 16%, transparent);
}
.chart-line {
  fill: none;
  stroke: var(--accent-bright);
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.chart-point {
  fill: var(--accent-bright);
  stroke: var(--bg-primary);
  stroke-width: 2;
}
.chart-label {
  fill: var(--text-secondary);
  font-size: 11px;
  font-family: var(--font-mono);
}
.chart-current {
  fill: var(--accent-bright);
  font-size: 18px;
  font-weight: 700;
  font-family: var(--font-mono);
}
.hal-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.hal-table th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
}
.hal-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
}
.hal-table tr:last-child td { border-bottom: none; }
.hal-table tr:hover td { background: var(--bg-tertiary); }
`;
  document.head.appendChild(style);
}
