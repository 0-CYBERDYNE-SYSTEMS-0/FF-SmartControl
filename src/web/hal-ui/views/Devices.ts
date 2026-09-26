// Devices view — 3-col card grid, filter bar, power toggle, add device

import { getStore, setStore, formatSensorValue } from '../store.js';
import { halApi, HalDevice } from '../api.js';
import { createToggle, setToggleState } from '../components/Toggle.js';
import { showToast } from '../components/Toast.js';
import { openDiscoveryWizard } from './DiscoveryWizard.js';
import {
  renderBulletChart,
  type BulletMetric,
  injectChartKitStyles,
  renderTinyAreaChart,
  renderTinyBarChart,
  generateDeviceShades,
} from '../components/ChartKit.js';
import {
  renderDeviceForceGraphSvg,
  type ForceNode,
  type ForceEdge,
} from '../components/EnvironmentCharts.js';

export async function renderDevices(container: HTMLElement): Promise<void> {
  const store = getStore();
  injectDevicesStyles();
  injectChartKitStyles();

  // Load zones for filter dropdown
  let zones: Array<{ id: string; name: string }> = [];
  try {
    const allZones = await halApi.getZones();
    zones = allZones.filter((z) => z.id && z.id !== '_none');
  } catch {
    /* ignore */
  }

  const zoneOptions = zones
    .map(
      (z) =>
        `<option value="${escapeHtml(z.name)}">${escapeHtml(z.name)}</option>`,
    )
    .join('');

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Devices</h1>
        <p class="page-subtitle">Manage farm hardware</p>
      </div>
      <div class="page-header-right">
        <button class="hal-btn-secondary" id="dw-graph-toggle-btn">
          <span>Graph</span>
        </button>
        <button class="hal-btn-primary" id="dw-add-device-btn">
          <span>+ Add Device</span>
        </button>
      </div>
    </div>

    <div class="devices-toolbar mb-4">
      <input class="hal-input" id="device-filter" type="text" placeholder="Filter devices..." />
      <select class="hal-input" id="device-type-filter">
        <option value="">All types</option>
        <option value="relay">Relays</option>
        <option value="sensor">Sensors</option>
        <option value="camera">Cameras</option>
      </select>
      <select class="hal-input" id="device-zone-filter">
        <option value="">All zones</option>
        ${zoneOptions}
      </select>
      <select class="hal-input" id="device-status-filter">
        <option value="">All status</option>
        <option value="online">Online</option>
        <option value="offline">Offline</option>
      </select>
    </div>

    <div id="devices-graph-container" style="display:none" class="mb-4"></div>
    <div id="devices-grid" class="grid-3">
      ${renderDeviceCards(store.devices)}
    </div>
  `;

  attachDevicesHandlers();
  renderDeviceCharts(store.devices);
}

function renderDeviceCharts(devices: HalDevice[]): void {
  const sensors = devices.filter((d) => d.type === 'sensor');
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
      container.innerHTML =
        '<span class="text-xs text-secondary">No data</span>';
      continue;
    }

    // Generate a mini trend from the current value
    const base = values[0];
    const trend = Array.from(
      { length: 15 },
      (_, i) => base + Math.sin(i * 0.8) * (base * 0.05),
    );

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
  return devices
    .map((d) => {
      const state = d.online ? 'online' : 'offline';
      const chartId = `dev-chart-${d.id}`;
      const zone = (d as any).zone as string | undefined;
      const safeState = (d as any).safe_state as string | undefined; // VAL-DISC-071
      const description = d.controlled_device_description as string | undefined; // VAL-DISC-070
      return `
      <div class="device-card hal-card" data-device-id="${d.id}" style="border-left: 3px solid ${state === 'online' ? 'var(--accent)' : 'var(--danger)'}">
        <div class="device-card-header">
          <div class="device-card-icon">${deviceIcon(d.type)}</div>
          <div class="device-card-title" id="dev-name-${d.id}">${escapeHtml(d.name)}</div>
          <span class="hal-badge hal-badge-slate">${d.protocol}</span>
          <button class="device-rename-btn" data-device-id="${d.id}" title="Rename device">✏️</button>
        </div>
        <div class="device-card-meta">
          <span class="text-xs text-secondary">${d.type} · ${state}</span>
          ${zone ? `<span class="device-zone-tag">${escapeHtml(zone)}</span>` : ''}
          ${d.lastSeen ? `<span class="text-xs text-mono text-secondary">${formatRelativeTime(d.lastSeen)}</span>` : ''}
        </div>
        ${description ? `<div class="device-description text-xs text-secondary">${escapeHtml(description)}</div>` : ''}
        ${d.type === 'sensor' ? `<div class="device-chart-wrap" id="${chartId}"></div>` : ''}
        ${
          d.type === 'relay'
            ? `
          <div class="device-card-relay-info">
            <span class="text-xs text-secondary">Safe state:</span>
            <span class="relay-safe-state text-xs" data-device-id="${d.id}">${safeState || 'off'}</span>
          </div>
          <div class="device-card-control">
            <span class="text-xs text-secondary">Power</span>
            <div id="toggle-${d.id}" class="device-toggle" ${!d.online ? 'data-offline="true" title="Offline - cannot toggle"' : ''}></div>
          </div>
        `
            : ''
        }
      </div>
    `;
    })
    .join('');
}

function attachDevicesHandlers(): void {
  const filterInput = document.getElementById(
    'device-filter',
  ) as HTMLInputElement | null;
  const typeSelect = document.getElementById(
    'device-type-filter',
  ) as HTMLSelectElement | null;
  const zoneSelect = document.getElementById(
    'device-zone-filter',
  ) as HTMLSelectElement | null;
  const statusSelect = document.getElementById(
    'device-status-filter',
  ) as HTMLSelectElement | null;

  // Add Device button
  document
    .getElementById('dw-add-device-btn')
    ?.addEventListener('click', () => {
      openDiscoveryWizard();
    });

  // Graph toggle
  let graphVisible = false;
  const graphBtn = document.getElementById('dw-graph-toggle-btn');
  const graphContainer = document.getElementById('devices-graph-container');
  const gridContainer = document.getElementById('devices-grid');

  graphBtn?.addEventListener('click', () => {
    graphVisible = !graphVisible;
    if (graphVisible) {
      graphBtn.classList.add('active');
      graphContainer!.style.display = '';
      gridContainer!.style.display = 'none';
      renderForceGraph();
    } else {
      graphBtn.classList.remove('active');
      graphContainer!.style.display = 'none';
      gridContainer!.style.display = '';
    }
  });

  function renderForceGraph(): void {
    if (!graphContainer) return;
    const store = getStore();
    const nodes: ForceNode[] = store.devices.map((d) => ({
      id: d.id,
      label: d.name,
      type: d.type,
      online: d.online,
      zone: d.zone,
    }));

    // Zone edges: connect all devices in same zone
    const edges: ForceEdge[] = [];
    const zoneGroups = new Map<string, string[]>();
    for (const d of store.devices) {
      const z = d.zone || '';
      const list = zoneGroups.get(z) ?? [];
      list.push(d.id);
      zoneGroups.set(z, list);
    }
    for (const [, ids] of zoneGroups) {
      for (let i = 0; i < ids.length - 1; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          edges.push({ source: ids[i], target: ids[j], kind: 'zone' });
        }
      }
    }

    renderDeviceForceGraphSvg(
      nodes,
      edges,
      'devices-graph-container',
      (nodeId) => {
        // Clicking a node highlights the corresponding card and scrolls to it
        gridContainer!.style.display = '';
        graphBtn!.classList.remove('active');
        graphContainer!.style.display = 'none';
        graphVisible = false;
        const card = document.querySelector<HTMLElement>(
          `.device-card[data-device-id="${CSS.escape(nodeId)}"]`,
        );
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.outline = `2px solid var(--accent)`;
          setTimeout(() => {
            card.style.outline = '';
          }, 2000);
        }
      },
    );
  }

  function applyFilter(): void {
    const q = filterInput?.value.toLowerCase() || '';
    const type = typeSelect?.value || '';
    const zone = zoneSelect?.value || '';
    const status = statusSelect?.value || '';
    const store = getStore();
    const filtered = store.devices.filter((d) => {
      const matchQ =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.protocol.toLowerCase().includes(q);
      const matchType = !type || d.type === type;
      const matchZone = !zone || (d as any).zone === zone;
      const matchStatus =
        !status || (status === 'online' ? d.online : !d.online);
      return matchQ && matchType && matchZone && matchStatus;
    });
    const grid = document.getElementById('devices-grid');
    if (grid) grid.innerHTML = renderDeviceCards(filtered);
    attachToggleHandlers();
    attachRenameHandlers();
    renderDeviceCharts(filtered);
  }

  filterInput?.addEventListener('input', applyFilter);
  typeSelect?.addEventListener('change', applyFilter);
  zoneSelect?.addEventListener('change', applyFilter);
  statusSelect?.addEventListener('change', applyFilter);

  attachToggleHandlers();
  attachRenameHandlers();
}

function attachToggleHandlers(): void {
  const store = getStore();
  const relays = store.devices.filter((d) => d.type === 'relay');
  relays.forEach((relay) => {
    const el = document.getElementById(`toggle-${relay.id}`);
    if (!el) return;

    // VAL-DISC-073: Disable toggle for offline relays with tooltip
    if (!relay.online) {
      el.setAttribute('title', 'Offline - cannot toggle');
      el.style.opacity = '0.5';
      el.style.cursor = 'not-allowed';
      return;
    }

    const isOn = relay.state === 'on';
    const toggle = createToggle(`toggle-${relay.id}`, isOn, async (on) => {
      // Double-check online status before sending command
      const currentDevice = store.devices.find((d) => d.id === relay.id);
      if (!currentDevice?.online) {
        showToast(`Cannot toggle ${relay.name}: device is offline`, 'danger');
        setToggleState(toggle, !on); // revert
        return;
      }
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

function attachRenameHandlers(): void {
  document.querySelectorAll('.device-rename-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const deviceId = (btn as HTMLElement).dataset.deviceId;
      if (!deviceId) return;
      startInlineRename(deviceId);
    });
  });
}

async function startInlineRename(deviceId: string): Promise<void> {
  const store = getStore();
  const device = store.devices.find((d) => d.id === deviceId);
  if (!device) return;

  const nameEl = document.getElementById(`dev-name-${deviceId}`);
  if (!nameEl) return;

  const currentName = device.name;

  // Load zones for zone dropdown
  let zones: Array<{ id: string; name: string }> = [];
  try {
    const allZones = await halApi.getZones();
    zones = allZones.filter((z) => z.id && z.id !== '_none');
  } catch {
    /* ignore */
  }

  const zoneOptions = zones
    .map((z) => {
      const selected = (device as any).zone === z.name ? 'selected' : '';
      return `<option value="${escapeHtml(z.name)}" ${selected}>${escapeHtml(z.name)}</option>`;
    })
    .join('');

  const currentZone = (device as any).zone || '';

  nameEl.innerHTML = `
    <div class="inline-rename-form">
      <input class="dw-input inline-rename-input" type="text" id="rename-input-${deviceId}"
        value="${escapeHtml(currentName)}" maxlength="64" placeholder="Device name">
      <select class="dw-select inline-rename-zone" id="rename-zone-${deviceId}">
        <option value="">No Zone</option>
        ${zoneOptions}
      </select>
      <button class="inline-rename-save" id="rename-save-${deviceId}">Save</button>
      <button class="inline-rename-cancel" id="rename-cancel-${deviceId}">Cancel</button>
    </div>
  `;

  const inputEl = document.getElementById(
    `rename-input-${deviceId}`,
  ) as HTMLInputElement | null;
  inputEl?.focus();
  inputEl?.select();

  document
    .getElementById(`rename-save-${deviceId}`)
    ?.addEventListener('click', async () => {
      const newName = inputEl?.value.trim() || currentName;
      const newZone =
        (
          document.getElementById(
            `rename-zone-${deviceId}`,
          ) as HTMLSelectElement | null
        )?.value || '';
      try {
        await halApi.updateDevice(deviceId, {
          label: newName,
          zone: newZone || undefined,
        });
        showToast(`Device renamed to "${newName}"`, 'success');
        // Refresh data
        const { refreshHALData } = await import('../main.js');
        refreshHALData();
        // Re-render to show updated data
        const container = document.getElementById('view-container');
        if (container) {
          const { renderDevices } = await import('./Devices.js');
          renderDevices(container);
        }
      } catch (err: any) {
        showToast(`Rename failed: ${err.message}`, 'danger');
      }
    });

  document
    .getElementById(`rename-cancel-${deviceId}`)
    ?.addEventListener('click', () => {
      nameEl.textContent = currentName;
    });

  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document
        .getElementById(`rename-save-${deviceId}`)
        ?.dispatchEvent(new Event('click'));
    } else if (e.key === 'Escape') {
      nameEl.textContent = currentName;
    }
  });
}

function formatRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  } catch {
    return '--';
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function deviceIcon(type: string): string {
  switch (type) {
    case 'sensor':
      return 'SNS';
    case 'camera':
      return 'CAM';
    case 'relay':
      return 'RLY';
    case 'smart_plug':
      return 'PLG';
    default:
      return 'DEV';
  }
}

function injectDevicesStyles(): void {
  if (document.getElementById('hal-devices-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-devices-styles';
  style.textContent = `
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}
.page-header-left { flex: 1; }
.page-header-right { display: flex; gap: var(--space-2); flex-shrink: 0; }
.hal-btn-primary {
  background: var(--accent);
  color: var(--text-primary);
  border: none;
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-4);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 150ms;
}
.hal-btn-primary:hover { opacity: 0.85; }
.hal-btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-4);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 150ms;
}
.hal-btn-secondary:hover { border-color: var(--accent); color: var(--text-primary); }
.hal-btn-secondary.active { background: var(--accent); color: var(--text-primary); border-color: var(--accent); }
.devices-toolbar {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
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
.device-card-title { flex: 1; font-size: 14px; font-weight: 600; min-width: 0; }
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
  flex-wrap: wrap;
  gap: var(--space-1);
}
.device-description {
  margin-bottom: var(--space-2);
  padding: var(--space-1) var(--space-2);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border-radius: var(--radius-sm);
  border-left: 2px solid var(--accent);
  color: var(--text-secondary);
}
.device-card-relay-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  padding: var(--space-1) var(--space-2);
  background: color-mix(in srgb, var(--warning, #D29922) 10%, transparent);
  border-radius: var(--radius-sm);
}
.relay-safe-state {
  font-weight: 600;
  color: var(--warning, #D29922);
  text-transform: uppercase;
}
.device-zone-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: var(--radius-pill);
}
.device-rename-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  opacity: 0.5;
  transition: opacity 150ms;
  flex-shrink: 0;
}
.device-rename-btn:hover { opacity: 1; }
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
.inline-rename-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
}
.inline-rename-input,
.inline-rename-zone {
  background: var(--bg-primary);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  height: 30px;
  padding: 0 var(--space-2);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.inline-rename-save,
.inline-rename-cancel {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 26px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-primary);
}
.inline-rename-save:hover { border-color: var(--accent); color: var(--accent); }
.inline-rename-cancel:hover { border-color: var(--danger); color: var(--danger); }
`;
  document.head.appendChild(style);
}
