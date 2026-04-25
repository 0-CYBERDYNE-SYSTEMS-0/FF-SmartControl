// Dashboard view — 4 KPI cards, device state grid, recent decisions, 3 sensor sparklines

import { getStore } from '../store.js';
import { halApi } from '../api.js';
import { createToggle, setToggleState } from '../components/Toggle.js';

export async function renderDashboard(container: HTMLElement): Promise<void> {
  const store = getStore();
  const { devices, decisions, uptime, decisionsToday } = store;

  const activeDevices = devices.filter(d => d.online).length;
  const totalSensors = devices.filter(d => d.type === 'sensor').length;

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-subtitle">FarmPal HAL — real-time overview</p>
    </div>

    <div class="grid-4 mb-6">
      <div class="kpi-card">
        <div class="kpi-value text-mono text-accent">${activeDevices}</div>
        <div class="kpi-label">Active Devices</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value text-mono text-accent">${totalSensors}</div>
        <div class="kpi-label">Sensors</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value text-mono text-accent">${decisionsToday}</div>
        <div class="kpi-label">Decisions Today</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value text-mono text-accent">${formatUptime(uptime)}</div>
        <div class="kpi-label">Uptime</div>
      </div>
    </div>

    <div class="grid-2 gap-6">
      <section>
        <h2 class="section-title mb-4">Device State</h2>
        <div id="dashboard-devices" class="device-grid">
          ${renderDeviceGrid(devices)}
        </div>
      </section>
      <section>
        <h2 class="section-title mb-4">Recent Decisions</h2>
        <div id="dashboard-decisions">
          ${renderRecentDecisions(decisions.slice(0, 5))}
        </div>
      </section>
    </div>

    <section class="mt-6">
      <h2 class="section-title mb-4">Sensor Overview</h2>
      <div id="dashboard-sparklines" class="grid-3">
        ${renderSparklines(devices.filter(d => d.type === 'sensor').slice(0, 3))}
      </div>
    </section>
  `;

  injectDashboardStyles();
  attachDashboardHandlers();
}

function renderDeviceGrid(devices: ReturnType<typeof getStore>['devices']): string {
  if (devices.length === 0) {
    return '<div class="empty-state"><p>No devices registered</p></div>';
  }
  return devices.map(d => `
    <div class="device-mini-card ${d.online ? 'online' : 'offline'}">
      <div class="device-mini-icon">${deviceIcon(d.type)}</div>
      <div class="device-mini-info">
        <div class="device-mini-name">${escapeHtml(d.name)}</div>
        <div class="device-mini-meta text-xs text-secondary">${d.protocol} · ${d.online ? 'online' : 'offline'}</div>
      </div>
    </div>
  `).join('');
}

function renderRecentDecisions(decisions: ReturnType<typeof getStore>['decisions']): string {
  if (decisions.length === 0) {
    return '<div class="empty-state"><p>No decisions yet</p></div>';
  }
  return decisions.map(d => `
    <div class="decision-row">
      <div class="decision-time text-mono text-xs text-secondary">${formatTime(d.timestamp)}</div>
      <div class="decision-trigger text-sm">${escapeHtml(d.trigger)}</div>
      <div class="decision-text text-sm font-semibold">${escapeHtml(d.decision)}</div>
    </div>
  `).join('');
}

function renderSparklines(sensors: ReturnType<typeof getStore>['devices']): string {
  if (sensors.length === 0) {
    return '<div class="empty-state"><p>No sensors available</p></div>';
  }
  return sensors.map(s => {
    const snap = getStore().sensors[s.id];
    const temp = snap?.temperature?.value;
    const hum = snap?.humidity?.value;
    return `
      <div class="sparkline-card hal-card">
        <div class="sparkline-header">
          <span class="sparkline-name">${escapeHtml(s.name)}</span>
          <span class="sparkline-type text-xs text-secondary">${s.protocol}</span>
        </div>
        <div class="sparkline-values">
          ${temp != null ? `<span class="sparkline-val text-mono text-accent">${temp.toFixed(1)}<small>°C</small></span>` : '<span class="text-secondary">--</span>'}
          ${hum != null ? `<span class="sparkline-val text-mono" style="color:var(--info)">${hum.toFixed(0)}<small>%RH</small></span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function attachDashboardHandlers(): void {
  // Attach toggle handlers to device power controls if needed
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour12: false });
  } catch { return '--'; }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function deviceIcon(type: string): string {
  switch (type) {
    case 'sensor': return '🌡️';
    case 'camera': return '📷';
    case 'relay':  return '⚡';
    default:       return '📟';
  }
}

function injectDashboardStyles(): void {
  if (document.getElementById('hal-dashboard-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-dashboard-styles';
  style.textContent = `
.kpi-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  border-left: 3px solid var(--accent);
}
.kpi-value {
  font-size: 36px;
  font-weight: 600;
  line-height: 1;
  color: var(--accent);
  margin-bottom: var(--space-1);
}
.kpi-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
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
}
.device-mini-card.online { border-left-color: var(--accent); }
.device-mini-card.offline { border-left-color: var(--danger); }
.device-mini-icon { font-size: 18px; }
.device-mini-name { font-size: 13px; font-weight: 500; }
.device-mini-meta { margin-top: 2px; }
.decision-row {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
  border-left: 3px solid var(--accent);
}
.decision-time { margin-bottom: 2px; }
.decision-trigger { color: var(--text-secondary); margin-bottom: 2px; }
.sparkline-card { padding: var(--space-3); }
.sparkline-header { display: flex; justify-content: space-between; margin-bottom: var(--space-2); }
.sparkline-name { font-size: 13px; font-weight: 500; }
.sparkline-values { display: flex; gap: var(--space-4); }
.sparkline-val { font-size: 24px; font-weight: 600; }
.sparkline-val small { font-size: 12px; margin-left: 1px; }
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
`;
  document.head.appendChild(style);
}
