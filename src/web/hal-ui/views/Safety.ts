// Safety view — safety dashboard summary and per-device rule editor
// Shows: active rules count, warning devices, denied actions 24h, E-Stop status
// Allows: creating, editing, deleting safety rules per device

import { getStore, formatDateTimeValue } from '../store.js';
import { halApi } from '../api.js';
import { openModal, closeModal, injectModalStyles } from '../components/Modal.js';
import { showToast } from '../components/Toast.js';

interface SafetyRule {
  id: string;
  deviceId: string;
  ruleType: string;
  ruleConfig: Record<string, unknown>;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface SafetySummary {
  activeRulesCount: number;
  deniedLast24h: number;
  recentDenied: Array<{
    id: string;
    deviceId: string | null;
    deviceName: string | null;
    proposedAction: string;
    deniedReason: string | null;
    triggeredBy: string;
    createdAt: string;
  }>;
  estopActive: boolean;
  estopActivatedAt: string | null;
  estopReason: string | null;
  farmLoopSafetyMode: boolean;
  lastDecisionAt: string | null;
  rulesPerDevice: Array<{ deviceId: string; ruleCount: number }>;
}

const RULE_TYPE_LABELS: Record<string, string> = {
  max_on_duration: 'Max On Duration',
  min_off_duration: 'Min Off Duration',
  max_activations_per_hour: 'Max Activations/Hour',
  allowed_schedule_windows: 'Schedule Windows',
  dependency: 'Dependency Rule',
};

const RULE_TYPE_DESCRIPTIONS: Record<string, string> = {
  max_on_duration: 'Device cannot be on longer than N seconds',
  min_off_duration: 'Device must be off for at least N seconds before turning on',
  max_activations_per_hour: 'Device cannot be turned on more than N times per hour',
  allowed_schedule_windows: 'Device can only be turned on during specific time windows',
  dependency: 'Device state depends on another device/sensor condition',
};

export async function renderSafety(container: HTMLElement): Promise<void> {
  injectModalStyles();
  injectSafetyStyles();

  container.innerHTML = `
    <div class="safety-view">
      <div class="safety-header">
        <h1 class="view-title">Safety</h1>
        <div class="safety-actions">
          <button class="btn btn-primary" id="add-rule-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Rule
          </button>
        </div>
      </div>

      <div class="safety-summary-cards" id="safety-summary">
        <div class="safety-summary-card loading">Loading...</div>
      </div>

      <div class="safety-rules-section">
        <div class="safety-section-header">
          <h2>Safety Rules</h2>
          <div class="safety-filter">
            <select id="rule-device-filter" class="form-select">
              <option value="">All Devices</option>
            </select>
          </div>
        </div>
        <div class="safety-rules-list" id="safety-rules-list">
          <div class="safety-rules-loading">Loading rules...</div>
        </div>
      </div>

      <div class="safety-recent-denials">
        <div class="safety-section-header">
          <h2>Recent Denials (24h)</h2>
        </div>
        <div class="safety-denials-list" id="safety-denials-list">
          <div class="safety-denials-loading">Loading...</div>
        </div>
      </div>
    </div>
  `;

  // Setup event listeners
  setupSafetyEventListeners();

  // Load data
  await loadSafetySummary();
  await loadSafetyRules();
  await loadRecentDenials();
  await loadDevicesForFilter();
}

async function loadSafetySummary(): Promise<void> {
  try {
    const summary: SafetySummary = await halApi.getSafetySummary();
    const summaryEl = document.getElementById('safety-summary');
    if (!summaryEl) return;

    summaryEl.innerHTML = `
      <div class="safety-summary-card ${summary.estopActive ? 'danger' : summary.farmLoopSafetyMode ? 'warning' : 'normal'}">
        <div class="summary-card-icon">
          ${summary.estopActive ? '🚨' : summary.farmLoopSafetyMode ? '⚠️' : '✅'}
        </div>
        <div class="summary-card-content">
          <div class="summary-card-label">Safety State</div>
          <div class="summary-card-value">${summary.estopActive ? 'EMERGENCY STOP' : summary.farmLoopSafetyMode ? 'WARNING' : 'NORMAL'}</div>
          ${summary.estopActive && summary.estopActivatedAt ? `<div class="summary-card-meta">since ${new Date(summary.estopActivatedAt).toLocaleTimeString()}</div>` : ''}
        </div>
      </div>

      <div class="safety-summary-card">
        <div class="summary-card-icon">📋</div>
        <div class="summary-card-content">
          <div class="summary-card-label">Active Rules</div>
          <div class="summary-card-value">${summary.activeRulesCount}</div>
        </div>
      </div>

      <div class="safety-summary-card ${summary.deniedLast24h > 0 ? 'warning' : ''}">
        <div class="summary-card-icon">🚫</div>
        <div class="summary-card-content">
          <div class="summary-card-label">Denied (24h)</div>
          <div class="summary-card-value">${summary.deniedLast24h}</div>
        </div>
      </div>

      <div class="safety-summary-card">
        <div class="summary-card-icon">🔗</div>
        <div class="summary-card-content">
          <div class="summary-card-label">Monitored Devices</div>
          <div class="summary-card-value">${summary.rulesPerDevice.length}</div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Failed to load safety summary:', err);
  }
}

async function loadSafetyRules(): Promise<void> {
  try {
    const rules: SafetyRule[] = await halApi.getSafetyRules();
    const listEl = document.getElementById('safety-rules-list');
    if (!listEl) return;

    if (rules.length === 0) {
      listEl.innerHTML = `
        <div class="safety-empty">
          <p>No safety rules configured.</p>
          <p>Click "Add Rule" to create your first safety rule.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = rules.map(rule => renderRuleCard(rule)).join('');

    // Add event listeners for edit/delete buttons
    listEl.querySelectorAll('.rule-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ruleId = (btn as HTMLElement).dataset.ruleId!;
        editRule(ruleId);
      });
    });

    listEl.querySelectorAll('.rule-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ruleId = (btn as HTMLElement).dataset.ruleId!;
        const ruleDeviceId = (btn as HTMLElement).dataset.deviceId!;
        confirmDeleteRule(ruleId, ruleDeviceId);
      });
    });

    listEl.querySelectorAll('.rule-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ruleId = (btn as HTMLElement).dataset.ruleId!;
        const rule = rules.find(r => r.id === ruleId);
        if (rule) {
          await toggleRule(rule);
        }
      });
    });
  } catch (err) {
    console.error('Failed to load safety rules:', err);
  }
}

async function loadRecentDenials(): Promise<void> {
  try {
    const audit = await halApi.getSafetyAudit({ limit: 10, result: 'DENIED' });
    const listEl = document.getElementById('safety-denials-list');
    if (!listEl) return;

    if (audit.length === 0) {
      listEl.innerHTML = `
        <div class="safety-empty">
          <p>No denied actions in the last 24 hours.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = audit.map(entry => `
      <div class="denial-item">
        <div class="denial-header">
          <span class="denial-device">${entry.deviceId || 'Unknown Device'}</span>
          <span class="denial-action">${entry.proposedAction}</span>
          <span class="denial-time">${formatRelativeTime(entry.createdAt)}</span>
        </div>
        <div class="denial-reason">${entry.deniedReason || 'No reason provided'}</div>
        <div class="denial-meta">
          Triggered by: ${entry.triggeredBy}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load recent denials:', err);
  }
}

async function loadDevicesForFilter(): Promise<void> {
  const store = getStore();
  const selectEl = document.getElementById('rule-device-filter') as HTMLSelectElement;
  if (!selectEl) return;

  const devices = store.devices.filter(d => d.type === 'relay' || d.type === 'smart_plug');
  const options = devices.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  selectEl.innerHTML = `<option value="">All Devices</option>${options}`;

  // Also load for the rule editor modal
  selectEl.addEventListener('change', () => {
    // Re-filter rules when changed
  });
}

function renderRuleCard(rule: SafetyRule): string {
  const store = getStore();
  const device = store.devices.find(d => d.id === rule.deviceId);
  const deviceName = device?.name || rule.deviceId;
  const ruleLabel = RULE_TYPE_LABELS[rule.ruleType] || rule.ruleType;
  const ruleDesc = RULE_TYPE_DESCRIPTIONS[rule.ruleType] || '';

  let configDisplay = '';
  switch (rule.ruleType) {
    case 'max_on_duration':
      configDisplay = `${(rule.ruleConfig as { maxSeconds: number }).maxSeconds}s max on`;
      break;
    case 'min_off_duration':
      configDisplay = `${(rule.ruleConfig as { minSeconds: number }).minSeconds}s min off`;
      break;
    case 'max_activations_per_hour':
      configDisplay = `${(rule.ruleConfig as { maxPerHour: number }).maxPerHour} max/hour`;
      break;
    case 'allowed_schedule_windows':
      const windows = (rule.ruleConfig as { windows: Array<{ startHour: number; endHour: number }> }).windows;
      configDisplay = windows.map(w => `${w.startHour}:00-${w.endHour}:00`).join(', ');
      break;
    case 'dependency':
      const dep = rule.ruleConfig as { triggerDeviceId: string; operator: string; value: number };
      configDisplay = `When ${dep.triggerDeviceId} ${dep.operator} ${dep.value}`;
      break;
    default:
      configDisplay = JSON.stringify(rule.ruleConfig);
  }

  return `
    <div class="rule-card ${rule.enabled ? '' : 'disabled'}">
      <div class="rule-header">
        <div class="rule-device">${escapeHtml(deviceName)}</div>
        <div class="rule-type-badge">${ruleLabel}</div>
      </div>
      <div class="rule-config">${escapeHtml(configDisplay)}</div>
      <div class="rule-meta">
        Priority: ${rule.priority} · Updated ${formatRelativeTime(rule.updatedAt)}
      </div>
      <div class="rule-actions">
        <button class="btn btn-sm rule-toggle-btn ${rule.enabled ? 'btn-warning' : 'btn-success'}" data-rule-id="${rule.id}">
          ${rule.enabled ? 'Disable' : 'Enable'}
        </button>
        <button class="btn btn-sm btn-secondary rule-edit-btn" data-rule-id="${rule.id}">Edit</button>
        <button class="btn btn-sm btn-danger rule-delete-btn" data-rule-id="${rule.id}" data-device-id="${rule.deviceId}">Delete</button>
      </div>
    </div>
  `;
}

function setupSafetyEventListeners(): void {
  const addBtn = document.getElementById('add-rule-btn');
  addBtn?.addEventListener('click', () => {
    showAddRuleModal();
  });

  const filterSelect = document.getElementById('rule-device-filter') as HTMLSelectElement;
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      filterRules(filterSelect.value);
    });
  }
}

function filterRules(deviceId: string): void {
  const cards = document.querySelectorAll('.rule-card');
  cards.forEach(card => {
    const cardDeviceId = (card as HTMLElement).dataset.deviceId;
    if (!deviceId || cardDeviceId === deviceId) {
      (card as HTMLElement).style.display = '';
    } else {
      (card as HTMLElement).style.display = 'none';
    }
  });
}

async function toggleRule(ruleId: string): Promise<void> {
  try {
    const rules = await halApi.getSafetyRules();
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    await halApi.updateSafetyRule(ruleId, { enabled: !rule.enabled });
    showToast(`Rule ${rule.enabled ? 'disabled' : 'enabled'}`, 'success');
    await loadSafetyRules();
    await loadSafetySummary();
  } catch (err: any) {
    showToast(`Failed to toggle rule: ${err.message}`, 'error');
  }
}

function confirmDeleteRule(ruleId: string, deviceId: string): void {
  const store = getStore();
  const device = store.devices.find(d => d.id === deviceId);
  const deviceName = device?.name || deviceId;

  openModal(
    'Delete Safety Rule',
    `<p>Are you sure you want to delete this safety rule for <strong>${escapeHtml(deviceName)}</strong>?</p>
     <p class="text-danger">This action cannot be undone. The device will no longer be protected by this rule.</p>`,
    `<button class="btn btn-secondary" onclick="window.__closeModal && window.__closeModal()">Cancel</button>
     <button class="btn btn-danger" id="confirm-delete-rule-btn">Delete Rule</button>`
  );

  const confirmBtn = document.getElementById('confirm-delete-rule-btn');
  confirmBtn?.addEventListener('click', async () => {
    closeModal();
    try {
      await halApi.deleteSafetyRule(ruleId);
      showToast('Rule deleted', 'success');
      await loadSafetyRules();
      await loadSafetySummary();
    } catch (err: any) {
      showToast(`Failed to delete rule: ${err.message}`, 'error');
    }
  });

  // Store closeModal reference for the cancel button
  (window as any).__closeModal = closeModal;
}

function showAddRuleModal(): void {
  const store = getStore();
  const devices = store.devices.filter(d => d.type === 'relay' || d.type === 'smart_plug');

  const deviceOptions = devices.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  const ruleTypeOptions = Object.entries(RULE_TYPE_LABELS).map(([key, label]) =>
    `<option value="${key}">${label}</option>`
  ).join('');

  openModal(
    'Add Safety Rule',
    `
    <form id="add-rule-form" class="add-rule-form">
      <div class="form-group">
        <label for="rule-device">Device</label>
        <select id="rule-device" class="form-select" required>
          <option value="">Select a device...</option>
          ${deviceOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="rule-type">Rule Type</label>
        <select id="rule-type" class="form-select" required>
          <option value="">Select rule type...</option>
          ${ruleTypeOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="rule-priority">Priority (higher = more restrictive)</label>
        <input type="number" id="rule-priority" class="form-input" value="0" min="0" max="100">
      </div>

      <div id="rule-config-fields">
        <p class="text-secondary text-sm">Select a rule type to configure.</p>
      </div>
    </form>
    `,
    `<button class="btn btn-secondary" onclick="window.__closeModal && window.__closeModal()">Cancel</button>
     <button class="btn btn-primary" id="save-rule-btn">Save Rule</button>`
  );

  // Store closeModal reference
  (window as any).__closeModal = closeModal;

  // Setup rule type change handler to show appropriate config fields
  const ruleTypeSelect = document.getElementById('rule-type') as HTMLSelectElement;
  ruleTypeSelect?.addEventListener('change', () => {
    showConfigFieldsForRuleType(ruleTypeSelect.value);
  });

  // Setup save button
  const saveBtn = document.getElementById('save-rule-btn');
  saveBtn?.addEventListener('click', () => saveNewRule());
}

function showConfigFieldsForRuleType(ruleType: string): void {
  const container = document.getElementById('rule-config-fields');
  if (!container) return;

  let fieldsHtml = '';
  switch (ruleType) {
    case 'max_on_duration':
      fieldsHtml = `
        <div class="form-group">
          <label for="config-max-seconds">Maximum On Duration (seconds)</label>
          <input type="number" id="config-max-seconds" class="form-input" value="300" min="1" required>
        </div>
      `;
      break;
    case 'min_off_duration':
      fieldsHtml = `
        <div class="form-group">
          <label for="config-min-seconds">Minimum Off Duration (seconds)</label>
          <input type="number" id="config-min-seconds" class="form-input" value="60" min="1" required>
        </div>
      `;
      break;
    case 'max_activations_per_hour':
      fieldsHtml = `
        <div class="form-group">
          <label for="config-max-per-hour">Maximum Activations Per Hour</label>
          <input type="number" id="config-max-per-hour" class="form-input" value="10" min="1" required>
        </div>
      `;
      break;
    case 'allowed_schedule_windows':
      fieldsHtml = `
        <div class="form-group">
          <label>Schedule Windows</label>
          <div id="schedule-windows-list">
            <div class="schedule-window-row">
              <input type="number" class="form-input schedule-start" placeholder="Start hour (0-23)" min="0" max="23" value="6">
              <span>to</span>
              <input type="number" class="form-input schedule-end" placeholder="End hour (0-23)" min="0" max="23" value="22">
              <button type="button" class="btn btn-sm btn-danger remove-window-btn">×</button>
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-secondary" id="add-window-btn">+ Add Window</button>
        </div>
      `;
      break;
    case 'dependency':
      const store = getStore();
      const sensorDevices = store.devices.filter(d => d.type === 'sensor');
      const sensorOptions = sensorDevices.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
      fieldsHtml = `
        <div class="form-group">
          <label for="config-trigger-device">When this sensor...</label>
          <select id="config-trigger-device" class="form-select" required>
            <option value="">Select sensor...</option>
            ${sensorOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="config-operator">Condition</label>
          <select id="config-operator" class="form-select" required>
            <option value="gt">is greater than</option>
            <option value="gte">is greater than or equal to</option>
            <option value="lt">is less than</option>
            <option value="lte">is less than or equal to</option>
            <option value="eq">equals</option>
            <option value="neq">does not equal</option>
          </select>
        </div>
        <div class="form-group">
          <label for="config-threshold">Threshold Value</label>
          <input type="number" id="config-threshold" class="form-input" value="30" required>
        </div>
        <div class="form-group">
          <label for="config-action-required">Required Device State</label>
          <select id="config-action-required" class="form-select" required>
            <option value="on">Must stay ON</option>
            <option value="off">Must stay OFF</option>
            <option value="any">Any state allowed</option>
          </select>
        </div>
      `;
      break;
    default:
      fieldsHtml = `<p class="text-secondary text-sm">Select a rule type to configure.</p>`;
  }

  container.innerHTML = fieldsHtml;

  // Setup add window button for schedule windows
  if (ruleType === 'allowed_schedule_windows') {
    const addWindowBtn = document.getElementById('add-window-btn');
    addWindowBtn?.addEventListener('click', () => {
      const list = document.getElementById('schedule-windows-list');
      if (list) {
        const newRow = document.createElement('div');
        newRow.className = 'schedule-window-row';
        newRow.innerHTML = `
          <input type="number" class="form-input schedule-start" placeholder="Start hour (0-23)" min="0" max="23" value="0">
          <span>to</span>
          <input type="number" class="form-input schedule-end" placeholder="End hour (0-23)" min="0" max="23" value="0">
          <button type="button" class="btn btn-sm btn-danger remove-window-btn">×</button>
        `;
        list.appendChild(newRow);
        newRow.querySelector('.remove-window-btn')?.addEventListener('click', () => newRow.remove());
      }
    });

    // Setup remove buttons for existing rows
    container.querySelectorAll('.remove-window-btn').forEach(btn => {
      btn.addEventListener('click', () => (btn as HTMLElement).parentElement?.remove());
    });
  }
}

async function saveNewRule(): Promise<void> {
  const deviceSelect = document.getElementById('rule-device') as HTMLSelectElement;
  const ruleTypeSelect = document.getElementById('rule-type') as HTMLSelectElement;
  const priorityInput = document.getElementById('rule-priority') as HTMLInputElement;

  const deviceId = deviceSelect?.value;
  const ruleType = ruleTypeSelect?.value;
  const priority = parseInt(priorityInput?.value || '0', 10);

  if (!deviceId || !ruleType) {
    showToast('Please select a device and rule type', 'error');
    return;
  }

  let ruleConfig: Record<string, unknown> = {};

  switch (ruleType) {
    case 'max_on_duration': {
      const maxSecondsInput = document.getElementById('config-max-seconds') as HTMLInputElement;
      ruleConfig = { maxSeconds: parseInt(maxSecondsInput?.value || '300', 10) };
      break;
    }
    case 'min_off_duration': {
      const minSecondsInput = document.getElementById('config-min-seconds') as HTMLInputElement;
      ruleConfig = { minSeconds: parseInt(minSecondsInput?.value || '60', 10) };
      break;
    }
    case 'max_activations_per_hour': {
      const maxPerHourInput = document.getElementById('config-max-per-hour') as HTMLInputElement;
      ruleConfig = { maxPerHour: parseInt(maxPerHourInput?.value || '10', 10) };
      break;
    }
    case 'allowed_schedule_windows': {
      const windows: Array<{ startHour: number; endHour: number }> = [];
      document.querySelectorAll('.schedule-window-row').forEach(row => {
        const startInput = row.querySelector('.schedule-start') as HTMLInputElement;
        const endInput = row.querySelector('.schedule-end') as HTMLInputElement;
        if (startInput?.value && endInput?.value) {
          windows.push({
            startHour: parseInt(startInput.value, 10),
            endHour: parseInt(endInput.value, 10),
          });
        }
      });
      ruleConfig = { windows };
      break;
    }
    case 'dependency': {
      const triggerDeviceSelect = document.getElementById('config-trigger-device') as HTMLSelectElement;
      const operatorSelect = document.getElementById('config-operator') as HTMLSelectElement;
      const thresholdInput = document.getElementById('config-threshold') as HTMLInputElement;
      const actionRequiredSelect = document.getElementById('config-action-required') as HTMLSelectElement;
      ruleConfig = {
        triggerDeviceId: triggerDeviceSelect?.value,
        operator: operatorSelect?.value,
        value: parseFloat(thresholdInput?.value || '30'),
        actionRequired: actionRequiredSelect?.value,
      };
      break;
    }
    default:
      showToast('Unknown rule type', 'error');
      return;
  }

  try {
    await halApi.createSafetyRule({ deviceId, ruleType, ruleConfig, priority });
    closeModal();
    showToast('Rule created successfully', 'success');
    await loadSafetyRules();
    await loadSafetySummary();
  } catch (err: any) {
    showToast(`Failed to create rule: ${err.message}`, 'error');
  }
}

function editRule(ruleId: string): void {
  // For simplicity, we'll reload the rule and show an edit modal similar to add
  // A full implementation would show the current values pre-populated
  showToast('Edit functionality - please delete and recreate the rule', 'info', 4000);
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return isoString;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function injectSafetyStyles(): void {
  if (document.getElementById('hal-safety-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-safety-styles';
  style.textContent = `
.safety-view {
  padding: var(--page-padding);
  max-width: 1200px;
  margin: 0 auto;
}
.safety-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}
.safety-actions {
  display: flex;
  gap: var(--space-3);
}
.safety-summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.safety-summary-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border-left: 3px solid var(--accent);
}
.safety-summary-card.normal {
  border-left-color: var(--success);
}
.safety-summary-card.warning {
  border-left-color: var(--warning);
}
.safety-summary-card.danger {
  border-left-color: var(--danger);
}
.safety-summary-card.loading {
  justify-content: center;
  color: var(--text-secondary);
}
.summary-card-icon {
  font-size: 24px;
}
.summary-card-content {
  flex: 1;
}
.summary-card-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.summary-card-value {
  font-size: 20px;
  font-weight: 600;
  font-family: var(--font-mono);
}
.summary-card-meta {
  font-size: 11px;
  color: var(--text-tertiary);
}
.safety-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}
.safety-section-header h2 {
  font-size: 16px;
  font-weight: 600;
}
.safety-rules-section {
  margin-bottom: var(--space-6);
}
.safety-rules-list {
  display: grid;
  gap: var(--space-3);
}
.safety-rules-loading,
.safety-denials-loading {
  text-align: center;
  padding: var(--space-6);
  color: var(--text-secondary);
}
.safety-empty {
  text-align: center;
  padding: var(--space-6);
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.rule-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  border-left: 3px solid var(--accent);
}
.rule-card.disabled {
  opacity: 0.5;
  border-left-color: var(--text-tertiary);
}
.rule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}
.rule-device {
  font-weight: 600;
  font-size: 14px;
}
.rule-type-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.rule-config {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
.rule-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-3);
}
.rule-actions {
  display: flex;
  gap: var(--space-2);
}
.denial-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  border-left: 3px solid var(--danger);
}
.denial-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}
.denial-device {
  font-weight: 600;
  font-size: 13px;
}
.denial-action {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
.denial-time {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: auto;
}
.denial-reason {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
.denial-meta {
  font-size: 11px;
  color: var(--text-tertiary);
}
/* Form styles */
.add-rule-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.form-group label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}
.form-select,
.form-input {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  color: var(--text-primary);
  font-size: 14px;
  min-height: 36px;
}
.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: var(--accent);
}
.schedule-window-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.schedule-window-row .form-input {
  width: 100px;
}
.text-danger {
  color: var(--danger);
}
.text-secondary {
  color: var(--text-secondary);
}
.text-sm {
  font-size: 12px;
}
`;
  document.head.appendChild(style);
}
