// System Status Panel — Agent, HAL, MQTT, Database, Auto Mode, Uptime

import { getStore } from '../store.js';

export function renderSystemStatus(): string {
  const store = getStore();

  return `
    <div class="sys-status-panel hal-card">
      <div class="sys-status-header">
        <span class="sys-status-title">System Status</span>
        <span class="sys-uptime text-mono text-xs text-secondary" data-dashboard-uptime>${formatUptime(store.uptime)}</span>
      </div>
      <div class="sys-status-grid">
        ${renderStatusRow('Agent', store.agentStatus, statusColor(store.agentStatus))}
        ${renderStatusRow('HAL Layer', store.halStatus, statusColor(store.halStatus))}
        ${renderStatusRow('MQTT Broker', store.mqttStatus, store.mqttStatus === 'connected' ? 'var(--success)' : 'var(--danger)')}
        ${renderStatusRow('Database', store.dbStatus, store.dbStatus === 'healthy' ? 'var(--success)' : 'var(--danger)')}
        ${renderStatusRow('Auto Mode', store.autoMode ? 'ON' : 'OFF', store.autoMode ? 'var(--accent)' : 'var(--text-tertiary)')}
      </div>
    </div>
  `;
}

function renderStatusRow(label: string, value: string, color: string): string {
  return `
    <div class="sys-status-row">
      <span class="sys-status-label">${label}</span>
      <span class="sys-status-value" style="color:${color}">${value}</span>
    </div>
  `;
}

function statusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'online':
    case 'healthy':
    case 'connected':
      return 'var(--success)';
    case 'idle':
    case 'degraded':
      return 'var(--warning)';
    case 'error':
    case 'offline':
    case 'disconnected':
      return 'var(--danger)';
    default:
      return 'var(--text-tertiary)';
  }
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function injectSystemStatusStyles(): void {
  if (document.getElementById('hal-sys-status-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-sys-status-styles';
  style.textContent = `
.sys-status-panel {
  padding: var(--space-4);
}
.sys-status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.sys-status-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.sys-status-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.sys-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.sys-status-row:last-child {
  border-bottom: none;
}
.sys-status-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.sys-status-value {
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
`;
  document.head.appendChild(style);
}
