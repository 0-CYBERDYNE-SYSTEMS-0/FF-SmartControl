// Operator Panels — 5 bottom panels for OPERATOR mode

import { getStore, formatSensorValue } from '../store.js';
import { halApi, type HalDecision } from '../api.js';
import { renderSparkline } from './HeroChart.js';

export async function renderOperatorPanels(): Promise<string> {
  const store = getStore();
  const sensors = store.devices.filter(d => d.type === 'sensor');
  const relays = store.devices.filter(d => d.type === 'relay' || d.type === 'smart_plug');
  const cameras = store.devices.filter(d => d.type === 'camera');

  // Fetch power history for 24h sparkline
  const powerHistory = await fetchPowerHistory(relays);

  return `
    <div class="operator-panels">
      ${renderDeviceGridPanel(relays)}
      ${renderAutomationStatsPanel(store.decisions)}
      ${renderAlertsPanel(store.decisions, sensors)}
      ${renderCameraPanel(cameras)}
      ${renderSystemHealthPanel()}
    </div>
  `;
}

function renderDeviceGridPanel(relays: ReturnType<typeof getStore>['devices']): string {
  if (relays.length === 0) {
    return `
      <div class="op-panel hal-card">
        <div class="op-panel-header">
          <span class="op-panel-title">Device Grid</span>
          <span class="status-chip status-chip--idle">0 devices</span>
        </div>
        <div class="op-panel-body">
          <p class="text-secondary text-sm">No relay devices registered</p>
        </div>
      </div>
    `;
  }

  const grid = relays.map(r => `
    <div class="op-device-cell ${r.online ? 'online' : 'offline'}" data-device-id="${r.id}">
      <div class="op-device-icon">${r.type === 'relay' ? 'RLY' : 'PLG'}</div>
      <div class="op-device-info">
        <span class="op-device-name">${escapeHtml(r.name)}</span>
        <span class="op-device-protocol text-xs text-secondary">${r.protocol}</span>
      </div>
      <div class="op-device-toggle ${r.state === 'on' ? 'on' : ''}" data-device-id="${r.id}">
        <div class="op-toggle-thumb"></div>
      </div>
    </div>
  `).join('');

  const onCount = relays.filter(r => r.state === 'on').length;

  return `
    <div class="op-panel hal-card">
      <div class="op-panel-header">
        <span class="op-panel-title">Device Grid</span>
        <span class="status-chip ${onCount > 0 ? 'status-chip--active' : 'status-chip--idle'}">${onCount} ON</span>
      </div>
      <div class="op-panel-body">
        <div class="op-device-grid">${grid}</div>
      </div>
    </div>
  `;
}

function renderAutomationStatsPanel(decisions: HalDecision[]): string {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const recent = decisions.filter(d => now - new Date(d.timestamp).getTime() < oneHour);
  const successCount = recent.filter(d => d.status === 'success').length;
  const successRate = recent.length > 0 ? (successCount / recent.length) * 100 : 0;

  // Hourly buckets for last 6h
  const buckets: number[] = [];
  for (let h = 5; h >= 0; h--) {
    const start = now - (h + 1) * oneHour;
    const end = now - h * oneHour;
    buckets.push(decisions.filter(d => {
      const t = new Date(d.timestamp).getTime();
      return t >= start && t < end;
    }).length);
  }

  return `
    <div class="op-panel hal-card">
      <div class="op-panel-header">
        <span class="op-panel-title">Automation Stats</span>
        <span class="status-chip status-chip--active">${recent.length}/h</span>
      </div>
      <div class="op-panel-body">
        <div class="op-stat-row">
          <span class="op-stat-label">Success Rate</span>
          <span class="op-stat-value text-mono" style="color:${successRate >= 80 ? 'var(--success)' : successRate >= 50 ? 'var(--warning)' : 'var(--danger)'}">${successRate.toFixed(0)}%</span>
        </div>
        <div class="op-stat-row">
          <span class="op-stat-label">Decisions (1h)</span>
          <span class="op-stat-value text-mono">${recent.length}</span>
        </div>
        <div class="op-stat-sparkline">
          ${renderSparkline(buckets, 'var(--accent)', 180, 32)}
        </div>
        <div class="op-stat-xlabels">
          ${['-5h','-4h','-3h','-2h','-1h','now'].map(l => `<span class="op-stat-xlabel">${l}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderAlertsPanel(decisions: HalDecision[], sensors: ReturnType<typeof getStore>['devices']): string {
  const now = Date.now();
  const alerts: { level: 'critical' | 'warning'; text: string; time: string }[] = [];

  // Critical: offline sensors
  for (const s of sensors) {
    if (!s.online) {
      alerts.push({ level: 'critical', text: `${s.name} offline`, time: 'now' });
    }
  }

  // Warning: failed decisions
  const failed = decisions.filter(d => d.status === 'failure' && now - new Date(d.timestamp).getTime() < 3600000);
  for (const d of failed.slice(0, 3)) {
    alerts.push({ level: 'warning', text: d.decision.slice(0, 40), time: formatRelTime(d.timestamp) });
  }

  if (alerts.length === 0) {
    return `
      <div class="op-panel hal-card">
        <div class="op-panel-header">
          <span class="op-panel-title">Alerts</span>
          <span class="status-chip status-chip--online">Clear</span>
        </div>
        <div class="op-panel-body">
          <p class="text-secondary text-sm">No active alerts</p>
        </div>
      </div>
    `;
  }

  const criticalCount = alerts.filter(a => a.level === 'critical').length;

  return `
    <div class="op-panel hal-card">
      <div class="op-panel-header">
        <span class="op-panel-title">Alerts</span>
        ${criticalCount > 0 ? `<span class="status-chip status-chip--offline">${criticalCount} critical</span>` : `<span class="status-chip status-chip--online">Clear</span>`}
      </div>
      <div class="op-panel-body">
        ${alerts.slice(0, 5).map(a => `
          <div class="op-alert ${a.level}">
            <span class="op-alert-dot"></span>
            <span class="op-alert-text">${escapeHtml(a.text)}</span>
            <span class="op-alert-time text-xs text-secondary">${a.time}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderCameraPanel(cameras: ReturnType<typeof getStore>['devices']): string {
  if (cameras.length === 0) {
    return `
      <div class="op-panel hal-card">
        <div class="op-panel-header">
          <span class="op-panel-title">Camera Feed</span>
          <span class="status-chip status-chip--idle">None</span>
        </div>
        <div class="op-panel-body">
          <p class="text-secondary text-sm">No cameras registered</p>
        </div>
      </div>
    `;
  }

  const cam = cameras[0];
  return `
    <div class="op-panel hal-card">
      <div class="op-panel-header">
        <span class="op-panel-title">Camera Feed</span>
        <span class="status-chip ${cam.online ? 'status-chip--online' : 'status-chip--offline'}">${cam.online ? 'Live' : 'Offline'}</span>
      </div>
      <div class="op-panel-body">
        <div class="op-camera-frame">
          <div class="op-camera-placeholder">
            <span class="op-camera-icon">CAM</span>
            <span class="op-camera-name">${escapeHtml(cam.name)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSystemHealthPanel(): string {
  // Simulated metrics — in production these would come from system APIs
  const cpu = 35 + Math.random() * 20;
  const mem = 42 + Math.random() * 15;
  const disk = 68 + Math.random() * 10;

  return `
    <div class="op-panel hal-card">
      <div class="op-panel-header">
        <span class="op-panel-title">System Health</span>
        <span class="status-chip status-chip--online">Healthy</span>
      </div>
      <div class="op-panel-body">
        ${renderHealthBar('CPU', cpu, '%')}
        ${renderHealthBar('Memory', mem, '%')}
        ${renderHealthBar('Disk', disk, '%')}
      </div>
    </div>
  `;
}

function renderHealthBar(label: string, value: number, unit: string): string {
  const color = value > 85 ? 'var(--danger)' : value > 60 ? 'var(--warning)' : 'var(--success)';
  return `
    <div class="op-health-row">
      <div class="op-health-labels">
        <span class="op-health-label">${label}</span>
        <span class="op-health-value text-mono" style="color:${color}">${value.toFixed(0)}${unit}</span>
      </div>
      <div class="op-health-track">
        <div class="op-health-fill" style="width:${value}%;background:${color}"></div>
      </div>
    </div>
  `;
}

async function fetchPowerHistory(relays: ReturnType<typeof getStore>['devices']): Promise<number[]> {
  // Placeholder — would fetch actual relay state history
  return relays.length > 0 ? [1, 2, 1, 3, 2, 4, 3, 2, 3, 4, 3, 2] : [];
}

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function injectOperatorPanelStyles(): void {
  if (document.getElementById('hal-op-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-op-panel-styles';
  style.textContent = `
.operator-panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  grid-auto-rows: minmax(200px, auto);
  align-items: stretch;
  gap: var(--space-4);
  margin-top: var(--space-4);
}
.op-panel {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  min-height: 200px;
  min-width: 0;
}
.op-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
}
.op-panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.op-panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* Device Grid */
.op-device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  grid-auto-rows: minmax(80px, auto);
  align-items: stretch;
  gap: var(--space-1);
}
.op-device-cell {
  display: flex;
  align-items: stretch;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--slate);
  min-height: 80px;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}
.op-device-cell.online { border-left-color: var(--accent); }
.op-device-cell.offline { border-left-color: var(--danger); }
.op-device-cell:hover { border-color: var(--accent); }
.op-device-icon {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
  border-radius: var(--radius-sm);
  padding: 2px 4px;
}
.op-device-info {
  flex: 1;
  min-width: 0;
}
.op-device-name {
  display: block;
  font-size: 12px;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.op-device-protocol {
  display: block;
  margin-top: 1px;
}
.op-device-toggle {
  width: 36px;
  height: 20px;
  border-radius: var(--radius-pill);
  background: var(--bg-tertiary);
  position: relative;
  cursor: pointer;
  transition: background var(--transition-fast);
  flex-shrink: 0;
}
.op-device-toggle.on {
  background: var(--accent);
}
.op-toggle-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-primary);
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform var(--transition-fast);
}
.op-device-toggle.on .op-toggle-thumb {
  transform: translateX(16px);
}

/* Automation Stats */
.op-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-1) 0;
}
.op-stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.op-stat-value {
  font-size: 14px;
  font-weight: 600;
}
.op-stat-sparkline {
  margin-top: auto;
  padding-top: var(--space-2);
}
.op-stat-xlabels {
  display: flex;
  justify-content: space-between;
}
.op-stat-xlabel {
  font-size: 9px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* Alerts */
.op-alert {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--slate);
}
.op-alert.critical { border-left-color: var(--danger); }
.op-alert.warning { border-left-color: var(--warning); }
.op-alert-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.op-alert.critical .op-alert-dot { background: var(--danger); }
.op-alert.warning .op-alert-dot { background: var(--warning); }
.op-alert-text {
  flex: 1;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.op-alert-time {
  flex-shrink: 0;
}

/* Camera */
.op-camera-frame {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.op-camera-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  color: var(--text-tertiary);
}
.op-camera-icon {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.1em;
}
.op-camera-name {
  font-size: 11px;
}

/* System Health */
.op-health-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.op-health-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.op-health-label {
  font-size: 11px;
  color: var(--text-secondary);
}
.op-health-value {
  font-size: 13px;
  font-weight: 600;
}
.op-health-track {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-pill);
  overflow: hidden;
}
.op-health-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  transition: width 500ms ease;
}

@media (max-width: 767px) {
  .op-panel {
    min-height: 120px;
  }
  .op-device-grid {
    grid-template-columns: 1fr;
  }
}
`;
  document.head.appendChild(style);
}
