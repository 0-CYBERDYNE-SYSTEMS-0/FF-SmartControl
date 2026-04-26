// Dashboard view — mode-aware: CALM / OPERATOR / DIAGNOSTIC
// Each mode shows different levels of detail

import { getStore, formatSensorValue, type FarmMode } from '../store.js';
import { halApi, type HalSensorReading } from '../api.js';
import { renderSystemStatus, injectSystemStatusStyles } from '../components/SystemStatus.js';
import { renderLatestDecision, injectLatestDecisionStyles } from '../components/LatestDecision.js';
import { renderKpiStrip, buildKpiData, injectKpiStyles } from '../components/KpiStrip.js';
import { loadHeroChartData, renderHeroChart, injectHeroChartStyles } from '../components/HeroChart.js';

export async function renderDashboard(container: HTMLElement): Promise<void> {
  const store = getStore();
  const mode = store.mode;

  injectSystemStatusStyles();
  injectLatestDecisionStyles();
  injectKpiStyles();
  injectHeroChartStyles();

  // Mode-aware layout
  if (mode === 'CALM') {
    await renderCalmDashboard(container);
  } else if (mode === 'OPERATOR') {
    await renderOperatorDashboard(container);
  } else {
    await renderDiagnosticDashboard(container);
  }
}

/* ═══════════════ CALM MODE — Essential info only ═══════════════ */

async function renderCalmDashboard(container: HTMLElement): Promise<void> {
  const store = getStore();

  container.innerHTML = `
    <div class="dash-layout calm-layout">
      <div class="dash-main">
        <div class="calm-hero">
          <div class="calm-status-row">
            ${renderCalmKpi('Temperature', getLatestTemp(), '°C', '#F59E0B')}
            ${renderCalmKpi('Humidity', getLatestHum(), '%', '#38BDF8')}
            ${renderCalmKpi('Devices', store.devices.filter(d => d.online).length, `/${store.devices.length}`, 'var(--accent)')}
          </div>
        </div>

        <div class="hero-chart-wrap calm-chart">
          <div class="dash-hero-header">
            <h2 class="section-title">24h Overview</h2>
          </div>
          <div class="hero-chart" id="dash-hero-chart">
            <div class="chart-empty">Loading…</div>
          </div>
        </div>

        <div class="calm-devices">
          <h2 class="section-title mb-4">Active Devices</h2>
          <div class="calm-device-list">
            ${renderCalmDeviceList(store.devices.filter(d => d.online))}
          </div>
        </div>
      </div>

      <div class="dash-sidebar calm-sidebar">
        ${renderSystemStatus()}
      </div>
    </div>
  `;

  injectDashboardStyles();
  await loadDashboardChart();
}

function renderCalmKpi(label: string, value: number | string, unit: string, color: string): string {
  const val = typeof value === 'number' ? value.toFixed(1) : value;
  return `
    <div class="calm-kpi" style="--kpi-color: ${color}">
      <span class="calm-kpi-value text-mono">${val}<small>${unit}</small></span>
      <span class="calm-kpi-label">${label}</span>
    </div>
  `;
}

function renderCalmDeviceList(devices: ReturnType<typeof getStore>['devices']): string {
  if (devices.length === 0) return '<p class="text-secondary text-sm">No active devices</p>';
  return devices.slice(0, 6).map(d => `
    <div class="calm-device-item ${d.online ? 'online' : 'offline'}">
      <span class="calm-device-dot"></span>
      <span class="calm-device-name">${escapeHtml(d.name)}</span>
      <span class="calm-device-type text-xs text-secondary">${d.type}</span>
    </div>
  `).join('');
}

/* ═══════════════ OPERATOR MODE — Full controls, all data ═══════════════ */

async function renderOperatorDashboard(container: HTMLElement): Promise<void> {
  const store = getStore();

  container.innerHTML = `
    <div class="dash-layout">
      <div class="dash-main">
        ${renderKpiStrip(await buildKpiData())}

        <div class="hero-chart-wrap">
          <div class="dash-hero-header">
            <h2 class="section-title">Environment Overview</h2>
            <div class="dash-live-bar" id="dash-live-bar">Loading…</div>
          </div>
          <div class="hero-chart" id="dash-hero-chart">
            <div class="chart-empty">Loading sensor data…</div>
          </div>
        </div>

        <div class="dash-bottom-grid">
          <section>
            <h2 class="section-title mb-4">Device State</h2>
            <div id="dashboard-devices" class="device-grid">
              ${renderDeviceGrid(store.devices)}
            </div>
          </section>
          <section>
            <h2 class="section-title mb-4">Recent Decisions</h2>
            <div id="dashboard-decisions">
              ${renderRecentDecisions(store.decisions.slice(0, 5))}
            </div>
          </section>
        </div>
      </div>

      <div class="dash-sidebar">
        ${renderSystemStatus()}
        ${renderLatestDecision()}
      </div>
    </div>
  `;

  injectDashboardStyles();
  attachDashboardHandlers();
  await loadDashboardChart();
}

/* ═══════════════ DIAGNOSTIC MODE — Deep system metrics, raw data ═══════════════ */

async function renderDiagnosticDashboard(container: HTMLElement): Promise<void> {
  const store = getStore();

  container.innerHTML = `
    <div class="dash-layout diag-layout">
      <div class="dash-main">
        ${renderKpiStrip(await buildKpiData())}

        <div class="hero-chart-wrap">
          <div class="dash-hero-header">
            <h2 class="section-title">Environment Overview — All Metrics</h2>
            <div class="dash-live-bar" id="dash-live-bar">Loading…</div>
          </div>
          <div class="hero-chart" id="dash-hero-chart">
            <div class="chart-empty">Loading sensor data…</div>
          </div>
        </div>

        <div class="diag-raw-data">
          <h2 class="section-title mb-4">Raw Sensor Snapshots</h2>
          <div class="diag-snapshot-grid" id="diag-snapshots">
            ${renderRawSnapshots(store.sensors, store.devices)}
          </div>
        </div>

        <div class="dash-bottom-grid">
          <section>
            <h2 class="section-title mb-4">All Devices (${store.devices.length})</h2>
            <div id="dashboard-devices" class="device-grid">
              ${renderDeviceGrid(store.devices)}
            </div>
          </section>
          <section>
            <h2 class="section-title mb-4">All Decisions (${store.decisions.length})</h2>
            <div id="dashboard-decisions">
              ${renderRecentDecisions(store.decisions.slice(0, 10))}
            </div>
          </section>
        </div>
      </div>

      <div class="dash-sidebar">
        ${renderSystemStatus()}
        ${renderLatestDecision()}
        ${renderDiagnosticExtras(store)}
      </div>
    </div>
  `;

  injectDashboardStyles();
  attachDashboardHandlers();
  await loadDashboardChart();
}

function renderRawSnapshots(
  sensors: ReturnType<typeof getStore>['sensors'],
  devices: ReturnType<typeof getStore>['devices']
): string {
  const entries = Object.entries(sensors);
  if (entries.length === 0) {
    return '<p class="text-secondary text-sm">No sensor snapshots available</p>';
  }

  return entries.map(([deviceId, snap]) => {
    const device = devices.find(d => d.id === deviceId);
    const temp = snap.temperature;
    const hum = snap.humidity;
    return `
      <div class="diag-snapshot hal-card">
        <div class="diag-snapshot-header">
          <span class="text-sm font-semibold">${escapeHtml(device?.name || deviceId)}</span>
          <span class="text-xs text-secondary">${device?.protocol || 'unknown'}</span>
        </div>
        <div class="diag-snapshot-body">
          ${temp ? `
            <div class="diag-snapshot-row">
              <span class="text-xs text-secondary">temperature</span>
              <span class="text-mono text-xs">${temp.value.toFixed(2)} °C @ ${new Date(temp.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ` : ''}
          ${hum ? `
            <div class="diag-snapshot-row">
              <span class="text-xs text-secondary">humidity</span>
              <span class="text-mono text-xs">${hum.value.toFixed(2)} % @ ${new Date(hum.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ` : ''}
          ${!temp && !hum ? '<span class="text-xs text-secondary">No data</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderDiagnosticExtras(store: ReturnType<typeof getStore>): string {
  const sensors = store.devices.filter(d => d.type === 'sensor');
  const relays = store.devices.filter(d => d.type === 'relay' || d.type === 'smart_plug');
  const cameras = store.devices.filter(d => d.type === 'camera');

  return `
    <div class="diag-extras hal-card">
      <div class="diag-extras-header">
        <span class="diag-extras-title">Diagnostics</span>
      </div>
      <div class="diag-extras-grid">
        <div class="diag-extras-row">
          <span class="text-xs text-secondary">Sensors</span>
          <span class="text-mono text-xs">${sensors.length}</span>
        </div>
        <div class="diag-extras-row">
          <span class="text-xs text-secondary">Relays</span>
          <span class="text-mono text-xs">${relays.length}</span>
        </div>
        <div class="diag-extras-row">
          <span class="text-xs text-secondary">Cameras</span>
          <span class="text-mono text-xs">${cameras.length}</span>
        </div>
        <div class="diag-extras-row">
          <span class="text-xs text-secondary">Decisions</span>
          <span class="text-mono text-xs">${store.decisions.length}</span>
        </div>
        <div class="diag-extras-row">
          <span class="text-xs text-secondary">Uptime</span>
          <span class="text-mono text-xs" data-dashboard-uptime>${formatUptime(store.uptime)}</span>
        </div>
        <div class="diag-extras-row">
          <span class="text-xs text-secondary">Mode</span>
          <span class="text-mono text-xs" style="color:var(--accent)">${store.mode}</span>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════════ Shared helpers ═══════════════ */

async function loadDashboardChart(): Promise<void> {
  const hero = document.getElementById('dash-hero-chart');
  const liveBar = document.getElementById('dash-live-bar');
  if (!hero) return;

  try {
    const layers = await loadHeroChartData();
    renderHeroChart(layers, 'dash-hero-chart');
    if (liveBar) liveBar.innerHTML = buildLiveBar(layers);
  } catch (err: any) {
    console.error('Dashboard chart load failed:', err);
    if (hero) hero.innerHTML = '<div class="chart-empty">Failed to load</div>';
  }
}

function buildLiveBar(layers: Array<{ metric: string; data: HalSensorReading[] }>): string {
  const store = getStore();
  const latest: Record<string, { value: number; unit: string; color: string }> = {};
  const metricColors: Record<string, string> = {
    temperature: '#F59E0B', humidity: '#38BDF8', co2: '#22C55E',
    light: '#FACC15', soil_moisture: '#EF4444', water_level: '#2563EB',
    ph: '#A855F7', weight: '#94A3B8',
  };
  for (const layer of layers) {
    if (!layer.data.length) continue;
    const last = layer.data[layer.data.length - 1];
    const converted = formatSensorValue(last.value, layer.metric, store.unitSystem);
    const unit = converted.unit || getMetricUnit(layer.metric);
    latest[layer.metric] = { value: converted.value, unit, color: metricColors[layer.metric] };
  }
  const items = Object.entries(latest).map(([metric, info]) => {
    const label = metric.charAt(0).toUpperCase() + metric.slice(1).replace('_', ' ');
    const precision = Math.abs(info.value) >= 100 ? 0 : info.value % 1 === 0 ? 0 : 1;
    return `<span class="live-item" style="--live-color:${info.color}"><span class="live-dot"></span><span class="live-label">${label}</span><span class="live-val text-mono">${info.value.toFixed(precision)}${info.unit}</span></span>`;
  });
  return items.join('') || '<span class="text-secondary text-xs">No live data</span>';
}

function getLatestTemp(): number {
  const store = getStore();
  let sum = 0, count = 0;
  for (const s of store.devices.filter(d => d.type === 'sensor')) {
    const snap = store.sensors[s.id];
    if (snap?.temperature?.value != null) {
      sum += snap.temperature.value;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

function getLatestHum(): number {
  const store = getStore();
  let sum = 0, count = 0;
  for (const s of store.devices.filter(d => d.type === 'sensor')) {
    const snap = store.sensors[s.id];
    if (snap?.humidity?.value != null) {
      sum += snap.humidity.value;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

function getMetricUnit(metric: string): string {
  switch (metric) {
    case 'humidity': case 'soil_moisture': case 'water_level': return '%';
    case 'co2': return 'ppm';
    case 'light': return 'lux';
    case 'ph': return '';
    case 'weight': return 'kg';
    default: return '';
  }
}

function renderDeviceGrid(devices: ReturnType<typeof getStore>['devices']): string {
  if (devices.length === 0) {
    return '<div class="empty-state"><p>No devices registered</p></div>';
  }
  return devices.map(d => `
    <div class="device-mini-card ${d.online ? 'online' : 'offline'}" data-device-id="${d.id}">
      <div class="device-mini-icon">${deviceIcon(d.type)}</div>
      <div class="device-mini-info">
        <div class="device-mini-name">${escapeHtml(d.name)}</div>
        <div class="device-mini-meta text-xs text-secondary">${d.protocol} · ${d.online ? 'online' : 'offline'}</div>
      </div>
      ${d.type === 'relay' || d.type === 'smart_plug' ? `
        <div class="device-mini-state ${d.state === 'on' ? 'on' : ''}">
          ${d.state === 'on' ? 'ON' : 'OFF'}
        </div>
      ` : ''}
    </div>
  `).join('');
}

function renderRecentDecisions(decisions: ReturnType<typeof getStore>['decisions']): string {
  if (decisions.length === 0) {
    return '<div class="empty-state"><p>No decisions yet</p></div>';
  }
  return decisions.map(d => `
    <div class="decision-row ${d.status || 'pending'}">
      <div class="decision-time text-mono text-xs text-secondary">${formatTime(d.timestamp)}</div>
      <div class="decision-trigger text-sm">${escapeHtml(d.trigger)}</div>
      <div class="decision-text text-sm font-semibold">${escapeHtml(d.decision)}</div>
      <div class="decision-footer">
        <span class="decision-status ${d.status || 'pending'}">${d.status || 'pending'}</span>
        <span class="decision-confidence text-mono text-xs" style="color:${confidenceColor(d.confidence)}">${(d.confidence * 100).toFixed(0)}%</span>
      </div>
    </div>
  `).join('');
}

function attachDashboardHandlers(): void {
  document.querySelectorAll('.device-mini-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.deviceId;
      if (id) console.log('Device clicked:', id);
    });
  });
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour12: false });
  } catch { return '--'; }
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function confidenceColor(conf: number): string {
  if (conf >= 0.8) return 'var(--success)';
  if (conf >= 0.5) return 'var(--warning)';
  return 'var(--danger)';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function deviceIcon(type: string): string {
  switch (type) {
    case 'sensor': return 'SNS';
    case 'camera': return 'CAM';
    case 'relay':  return 'RLY';
    case 'smart_plug': return 'PLG';
    default:       return 'DEV';
  }
}

function injectDashboardStyles(): void {
  if (document.getElementById('hal-dashboard-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-dashboard-styles';
  style.textContent = `
/* ── Layout ── */
.dash-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: var(--space-6);
}
.dash-main { min-width: 0; }
.dash-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ── CALM mode ── */
.calm-layout { grid-template-columns: 1fr 220px; }
.calm-hero { margin-bottom: var(--space-6); }
.calm-status-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}
.calm-kpi {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  text-align: center;
  border-left: 3px solid var(--kpi-color);
}
.calm-kpi-value {
  display: block;
  font-size: 36px;
  font-weight: 600;
  color: var(--kpi-color);
  line-height: 1;
}
.calm-kpi-value small {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 2px;
}
.calm-kpi-label {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: var(--space-2);
}
.calm-chart { margin-bottom: var(--space-6); }
.calm-devices { margin-bottom: var(--space-6); }
.calm-device-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.calm-device-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.calm-device-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}
.calm-device-item.offline .calm-device-dot {
  background: var(--danger);
}
.calm-device-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}
.calm-sidebar { gap: var(--space-4); }

/* ── OPERATOR mode ── */
.dash-hero-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.dash-live-bar {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  align-items: center;
}
.live-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--live-color);
  box-shadow: 0 0 6px var(--live-color);
}
.live-label {
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-size: 10px;
}
.live-val {
  color: var(--live-color);
  font-size: 13px;
  font-weight: 600;
}
.dash-bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
  margin-top: var(--space-6);
}
.device-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}
.device-mini-card {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  border-left: 3px solid var(--slate);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}
.device-mini-card:hover { border-color: var(--accent); }
.device-mini-card.online { border-left-color: var(--accent); }
.device-mini-card.offline { border-left-color: var(--danger); }
.device-mini-icon { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border)); border-radius: var(--radius-sm); padding: 2px 5px; }
.device-mini-name { font-size: 13px; font-weight: 500; }
.device-mini-meta { margin-top: 2px; }
.device-mini-state {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}
.device-mini-state.on {
  background: color-mix(in srgb, var(--success) 20%, transparent);
  color: var(--success);
}
.decision-row {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
  border-left: 3px solid var(--slate);
}
.decision-row.success { border-left-color: var(--success); }
.decision-row.failure { border-left-color: var(--danger); }
.decision-row.pending { border-left-color: var(--warning); }
.decision-time { margin-bottom: 2px; }
.decision-trigger { color: var(--text-secondary); margin-bottom: 2px; }
.decision-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-subtle);
}
.decision-status {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}
.decision-status.success { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
.decision-status.failure { background: color-mix(in srgb, var(--danger) 20%, transparent); color: var(--danger); }
.decision-status.pending { background: color-mix(in srgb, var(--warning) 20%, transparent); color: var(--warning); }
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

/* ── DIAGNOSTIC mode ── */
.diag-layout { grid-template-columns: 1fr 280px; }
.diag-raw-data { margin: var(--space-6) 0; }
.diag-snapshot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
.diag-snapshot {
  padding: var(--space-3);
}
.diag-snapshot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
}
.diag-snapshot-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.diag-snapshot-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.diag-extras {
  padding: var(--space-4);
}
.diag-extras-header {
  margin-bottom: var(--space-3);
}
.diag-extras-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.diag-extras-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.diag-extras-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.diag-extras-row:last-child { border-bottom: none; }

/* ── Responsive ── */
@media (max-width: 1023px) {
  .dash-layout, .calm-layout, .diag-layout { grid-template-columns: 1fr; }
  .dash-sidebar { flex-direction: row; flex-wrap: wrap; }
  .dash-sidebar > * { flex: 1; min-width: 240px; }
  .calm-status-row { grid-template-columns: repeat(3, 1fr); }
  .diag-snapshot-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 767px) {
  .dash-bottom-grid { grid-template-columns: 1fr; }
  .device-grid { grid-template-columns: 1fr; }
  .dash-hero-header { flex-direction: column; align-items: flex-start; }
  .dash-live-bar { gap: var(--space-2); }
  .calm-status-row { grid-template-columns: 1fr; }
  .diag-snapshot-grid { grid-template-columns: 1fr; }
}
`;
  document.head.appendChild(style);
}
