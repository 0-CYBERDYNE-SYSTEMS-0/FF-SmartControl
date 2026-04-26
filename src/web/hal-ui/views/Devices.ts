// Devices view — 3-col card grid, filter bar, power toggle, add device

import { getStore, setStore, formatSensorValue } from '../store.js';
import { halApi, HalDevice } from '../api.js';
import { createToggle, setToggleState } from '../components/Toggle.js';
import { showToast } from '../components/Toast.js';
import { renderBulletChart, type BulletMetric, injectChartKitStyles, renderTinyAreaChart, renderTinyBarChart, generateDeviceShades } from '../components/ChartKit.js';

export async function renderDevices(container: HTMLElement): Promise<void> {
  const store = getStore();
  injectDevicesStyles();
  injectChartKitStyles();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Devices</h1>
      <p class="page-subtitle">Manage farm hardware</p>
    </div>

    <div class="devices-toolbar mb-4">
      <input class="hal-input" id="device-filter" type="text" placeholder="Filter devices..." />
      <select class="hal-input" id="device-type-filter">
        <option value="">All types</option>
        <option value="relay">Relays</option>
        <option value="sensor">Sensors</option>
        <option value="camera">Cameras</option>
      </select>
      <select class="hal-input" id="device-status-filter">
        <option value="">All status</option>
        <option value="online">Online</option>
        <option value="offline">Offline</option>
      </select>
    </div>

    <div id="devices-grid" class="grid-3">
      ${renderDeviceCards(store.devices)}
    </div>
  `;

  attachDevicesHandlers();
  renderDeviceCharts(store.devices);
}

function renderDeviceCharts(devices: HalDevice[]): void {
  const sensors = devices.filter(d => d.type === 'sensor');
  if (sensors.length === 0) return;

  const store = getStore();

  // Group sensors by their dominant metric color so same-metric devices get shades
  const tempSensors: HalDevice[] = [];
  const humSensors: HalDevice[] = [];
  for (const s of sensors) {
    const snap = store.sensors[s.id];
    if (snap?.temperature?.value != null) tempSensors.push(s);
    else if (snap?.humidity?.value != null) humSensors.push(s);
  }

  const tempShades = generateDeviceShades('#F59E0B', tempSensors.length);
  const humShades = generateDeviceShades('#38BDF8', humSensors.length);

  for (const s of sensors) {
    const chartId = `dev-chart-${s.id}`;
    const container = document.getElementById(chartId);
    if (!container) continue;

    const snap = store.sensors[s.id];
    if (!snap) continue;

    // Build synthetic trend from available metrics
    const values: number[] = [];
    if (snap.temperature?.value != null) values.push(snap.temperature.value);
    if (snap.humidity?.value != null) values.push(snap.humidity.value);

    if (values.length === 0) {
      container.innerHTML = '<span class="text-xs text-secondary">No data</span>';
      continue;
    }

    // Generate a mini trend from the current value
    const base = values[0];
    const trend = Array.from({ length: 15 }, (_, i) => base + Math.sin(i * 0.8) * (base * 0.05));

    let color: string;
    if (snap.temperature?.value != null) {
      const idx = tempSensors.indexOf(s);
      color = idx >= 0 ? tempShades[idx] : '#F59E0B';
    } else {
      const idx = humSensors.indexOf(s);
      color = idx >= 0 ? humShades[idx] : '#38BDF8';
    }
    renderTinyAreaChart(trend, color, chartId);
  }
}

function renderDeviceCards(devices: HalDevice[]): string {
  if (devices.length === 0) {
    return `<div class="empty-state col-span-3"><p class="empty-state-title">No devices registered</p><p class="empty-state-desc">Devices will appear here once discovered.</p></div>`;
  }
  return devices.map(d => {
    const state = d.online ? 'online' : 'offline';
    const chartId = `dev-chart-${d.id}`;
    return `
      <div class="device-card hal-card" data-device-id="${d.id}" style="border-left: 3px solid ${state === 'online' ? 'var(--accent)' : 'var(--danger)'}">
        <div class="device-card-header">
          <div class="device-card-icon">${deviceIcon(d.type)}</div>
          <div class="device-card-title">${escapeHtml(d.name)}</div>
          <span class="hal-badge hal-badge-slate">${d.protocol}</span>
        </div>
        <div class="device-card-meta">
          <span class="text-xs text-secondary">${d.type} · ${state}</span>
          ${d.lastSeen ? `<span class="text-xs text-mono text-secondary">${formatRelativeTime(d.lastSeen)}</span>` : ''}
        </div>
        ${d.type === 'sensor' ? `<div class="device-chart-wrap" id="${chartId}"></div>` : ''}
        ${d.type === 'relay' ? `
          <div class="device-card-control">
            <span class="text-xs text-secondary">Power</span>
            <div id="toggle-${d.id}" class="device-toggle"></div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function attachDevicesHandlers(): void {
  const filterInput = document.getElementById('device-filter') as HTMLInputElement | null;
  const typeSelect = document.getElementById('device-type-filter') as HTMLSelectElement | null;
  const statusSelect = document.getElementById('device-status-filter') as HTMLSelectElement | null;

  function applyFilter(): void {
    const q = filterInput?.value.toLowerCase() || '';
    const type = typeSelect?.value || '';
    const status = statusSelect?.value || '';
    const store = getStore();
    const filtered = store.devices.filter(d => {
      const matchQ = !q || d.name.toLowerCase().includes(q) || d.protocol.toLowerCase().includes(q);
      const matchType = !type || d.type === type;
      const matchStatus = !status || (status === 'online' ? d.online : !d.online);
      return matchQ && matchType && matchStatus;
    });
    const grid = document.getElementById('devices-grid');
    if (grid) grid.innerHTML = renderDeviceCards(filtered);
    attachToggleHandlers();
    renderDeviceCharts(filtered);
  }

  filterInput?.addEventListener('input', applyFilter);
  typeSelect?.addEventListener('change', applyFilter);
  statusSelect?.addEventListener('change', applyFilter);

  attachToggleHandlers();
}

function attachToggleHandlers(): void {
  const store = getStore();
  const relays = store.devices.filter(d => d.type === 'relay');
  relays.forEach(relay => {
    const el = document.getElementById(`toggle-${relay.id}`);
    if (!el) return;
    const isOn = relay.state === 'on';
    const toggle = createToggle(`toggle-${relay.id}`, isOn, async (on) => {
      try {
        await halApi.controlDevice(relay.id, on ? 'on' : 'off');
        showToast(`${relay.name} turned ${on ? 'on' : 'off'}`, 'success');
      } catch (err: any) {
        showToast(`Failed: ${err.message}`, 'danger');
        setToggleState(toggle, !on); // revert
      }
    });
    el.replaceWith(toggle);
  });
}

function formatRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  } catch { return '--'; }
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

function injectDevicesStyles(): void {
  if (document.getElementById('hal-devices-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-devices-styles';
  style.textContent = `
.devices-toolbar {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.hal-input {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-3);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition-fast);
}
.hal-input:focus { border-color: var(--accent); }
.hal-input::placeholder { color: var(--text-tertiary); }
.device-card { padding: var(--space-4); }
.device-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.device-card-icon { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border)); border-radius: var(--radius-sm); padding: 3px 6px; }
.device-card-title { flex: 1; font-size: 14px; font-weight: 600; }
.hal-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: var(--radius-pill);
  text-transform: uppercase;
}
.hal-badge-slate {
  background: color-mix(in srgb, var(--slate) 20%, transparent);
  color: var(--slate);
  border: 1px solid var(--slate);
}
.device-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}
.device-card-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-2);
  border-top: 1px solid var(--border);
}
.col-span-3 { grid-column: 1 / -1; }
.device-chart-wrap {
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-subtle);
  min-height: 40px;
}
.tiny-chart-svg {
  display: block;
  width: 100%;
  height: 40px;
}
`;
  document.head.appendChild(style);
}
