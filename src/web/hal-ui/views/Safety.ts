// Safety view — safety dashboard summary and per-device rule editor
// Shows: active rules count, warning devices, denied actions 24h, E-Stop status
// Allows: creating, editing, deleting safety rules per device

import { getStore, formatDateTimeValue } from '../store.js';
import { halApi } from '../api.js';
import {
  openModal,
  closeModal,
  injectModalStyles,
} from '../components/Modal.js';
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
  min_off_duration:
    'Device must be off for at least N seconds before turning on',
  max_activations_per_hour:
    'Device cannot be turned on more than N times per hour',
  allowed_schedule_windows:
    'Device can only be turned on during specific time windows',
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

      <!-- Tab bar for Safety Rules vs Thresholds -->
      <div class="safety-tabs" id="safety-tabs">
        <button class="safety-tab active" data-tab="rules">Safety Rules</button>
        <button class="safety-tab" data-tab="thresholds">Thresholds</button>
      </div>

      <div id="safety-rules-panel">
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

      <div id="safety-thresholds-panel" style="display:none;">
        <div class="safety-thresholds-section">
          <div class="safety-section-header">
            <h2>Sensor Thresholds</h2>
            <button class="btn btn-primary" id="add-threshold-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Threshold
            </button>
          </div>
          <div class="safety-thresholds-list" id="safety-thresholds-list">
            <div class="safety-thresholds-loading">Loading thresholds...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Setup event listeners
  setupSafetyEventListeners();
  setupThresholdTabListeners();

  // Load data
  await loadSafetySummary();
  await loadSafetyRules();
  await loadRecentDenials();
  await loadDevicesForFilter();
  await loadThresholds();
}

function setupThresholdTabListeners(): void {
  document.querySelectorAll('.safety-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = (tab as HTMLElement).dataset.tab;

      // Update active tab
      document.querySelectorAll('.safety-tab').forEach((t) => {
        t.classList.toggle('active', t === tab);
      });

      // Show/hide panels
      const rulesPanel = document.getElementById('safety-rules-panel');
      const thresholdsPanel = document.getElementById(
        'safety-thresholds-panel',
      );

      if (tabName === 'rules') {
        if (rulesPanel) rulesPanel.style.display = '';
        if (thresholdsPanel) thresholdsPanel.style.display = 'none';
      } else {
        if (rulesPanel) rulesPanel.style.display = 'none';
        if (thresholdsPanel) thresholdsPanel.style.display = '';
        // Load thresholds when switching to tab
        loadThresholds();
      }
    });
  });

  const addThresholdBtn = document.getElementById('add-threshold-btn');
  addThresholdBtn?.addEventListener('click', () => {
    showAddThresholdModal();
  });
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

    listEl.innerHTML = rules.map((rule) => renderRuleCard(rule)).join('');

    // Add event listeners for edit/delete buttons
    listEl.querySelectorAll('.rule-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ruleId = (btn as HTMLElement).dataset.ruleId!;
        editRule(ruleId);
      });
    });

    listEl.querySelectorAll('.rule-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ruleId = (btn as HTMLElement).dataset.ruleId!;
        const ruleDeviceId = (btn as HTMLElement).dataset.deviceId!;
        confirmDeleteRule(ruleId, ruleDeviceId);
      });
    });

    listEl.querySelectorAll('.rule-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ruleId = (btn as HTMLElement).dataset.ruleId!;
        const rule = rules.find((r) => r.id === ruleId);
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

    listEl.innerHTML = audit
      .map(
        (entry) => `
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
    `,
      )
      .join('');
  } catch (err) {
    console.error('Failed to load recent denials:', err);
  }
}

async function loadDevicesForFilter(): Promise<void> {
  const store = getStore();
  const selectEl = document.getElementById(
    'rule-device-filter',
  ) as HTMLSelectElement;
  if (!selectEl) return;

  const devices = store.devices.filter(
    (d) => d.type === 'relay' || d.type === 'smart_plug',
  );
  const options = devices
    .map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`)
    .join('');
  selectEl.innerHTML = `<option value="">All Devices</option>${options}`;

  // Also load for the rule editor modal
  selectEl.addEventListener('change', () => {
    // Re-filter rules when changed
  });
}

function renderRuleCard(rule: SafetyRule): string {
  const store = getStore();
  const device = store.devices.find((d) => d.id === rule.deviceId);
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
      const windows = (
        rule.ruleConfig as {
          windows: Array<{ startHour: number; endHour: number }>;
        }
      ).windows;
      configDisplay = windows
        .map((w) => `${w.startHour}:00-${w.endHour}:00`)
        .join(', ');
      break;
    case 'dependency':
      const dep = rule.ruleConfig as {
        triggerDeviceId: string;
        operator: string;
        value: number;
      };
      configDisplay = `When ${dep.triggerDeviceId} ${dep.operator} ${dep.value}`;
      break;
    default:
      configDisplay = JSON.stringify(rule.ruleConfig);
  }

  return `
    <div class="rule-card ${rule.enabled ? '' : 'disabled'}" data-device-id="${rule.deviceId}">
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

  const filterSelect = document.getElementById(
    'rule-device-filter',
  ) as HTMLSelectElement;
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      filterRules(filterSelect.value);
    });
  }
}

function filterRules(deviceId: string): void {
  const cards = document.querySelectorAll('.rule-card');
  cards.forEach((card) => {
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
    const rule = rules.find((r) => r.id === ruleId);
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
  const device = store.devices.find((d) => d.id === deviceId);
  const deviceName = device?.name || deviceId;

  openModal(
    'Delete Safety Rule',
    `<p>Are you sure you want to delete this safety rule for <strong>${escapeHtml(deviceName)}</strong>?</p>
     <p class="text-danger">This action cannot be undone. The device will no longer be protected by this rule.</p>`,
    `<button class="btn btn-secondary" onclick="window.__closeModal && window.__closeModal()">Cancel</button>
     <button class="btn btn-danger" id="confirm-delete-rule-btn">Delete Rule</button>`,
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
  const devices = store.devices.filter(
    (d) => d.type === 'relay' || d.type === 'smart_plug',
  );

  const deviceOptions = devices
    .map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`)
    .join('');
  const ruleTypeOptions = Object.entries(RULE_TYPE_LABELS)
    .map(([key, label]) => `<option value="${key}">${label}</option>`)
    .join('');

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
     <button class="btn btn-primary" id="save-rule-btn">Save Rule</button>`,
  );

  // Store closeModal reference
  (window as any).__closeModal = closeModal;

  // Setup rule type change handler to show appropriate config fields
  const ruleTypeSelect = document.getElementById(
    'rule-type',
  ) as HTMLSelectElement;
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
      const sensorDevices = store.devices.filter((d) => d.type === 'sensor');
      const sensorOptions = sensorDevices
        .map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`)
        .join('');
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
        newRow
          .querySelector('.remove-window-btn')
          ?.addEventListener('click', () => newRow.remove());
      }
    });

    // Setup remove buttons for existing rows
    container.querySelectorAll('.remove-window-btn').forEach((btn) => {
      btn.addEventListener('click', () =>
        (btn as HTMLElement).parentElement?.remove(),
      );
    });
  }
}

async function saveNewRule(): Promise<void> {
  const deviceSelect = document.getElementById(
    'rule-device',
  ) as HTMLSelectElement;
  const ruleTypeSelect = document.getElementById(
    'rule-type',
  ) as HTMLSelectElement;
  const priorityInput = document.getElementById(
    'rule-priority',
  ) as HTMLInputElement;

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
      const maxSecondsInput = document.getElementById(
        'config-max-seconds',
      ) as HTMLInputElement;
      ruleConfig = {
        maxSeconds: parseInt(maxSecondsInput?.value || '300', 10),
      };
      break;
    }
    case 'min_off_duration': {
      const minSecondsInput = document.getElementById(
        'config-min-seconds',
      ) as HTMLInputElement;
      ruleConfig = { minSeconds: parseInt(minSecondsInput?.value || '60', 10) };
      break;
    }
    case 'max_activations_per_hour': {
      const maxPerHourInput = document.getElementById(
        'config-max-per-hour',
      ) as HTMLInputElement;
      ruleConfig = { maxPerHour: parseInt(maxPerHourInput?.value || '10', 10) };
      break;
    }
    case 'allowed_schedule_windows': {
      const windows: Array<{ startHour: number; endHour: number }> = [];
      document.querySelectorAll('.schedule-window-row').forEach((row) => {
        const startInput = row.querySelector(
          '.schedule-start',
        ) as HTMLInputElement;
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
      const triggerDeviceSelect = document.getElementById(
        'config-trigger-device',
      ) as HTMLSelectElement;
      const operatorSelect = document.getElementById(
        'config-operator',
      ) as HTMLSelectElement;
      const thresholdInput = document.getElementById(
        'config-threshold',
      ) as HTMLInputElement;
      const actionRequiredSelect = document.getElementById(
        'config-action-required',
      ) as HTMLSelectElement;
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

async function editRule(ruleId: string): Promise<void> {
  try {
    const rule = await halApi.getSafetyRule(ruleId);
    showEditRuleModal(rule);
  } catch (err: any) {
    showToast(`Failed to load rule: ${err.message}`, 'error');
  }
}

function showEditRuleModal(rule: SafetyRule): void {
  const store = getStore();
  const devices = store.devices.filter(
    (d) => d.type === 'relay' || d.type === 'smart_plug',
  );
  const device = devices.find((d) => d.id === rule.deviceId);
  const deviceName = device?.name || rule.deviceId;
  const ruleLabel = RULE_TYPE_LABELS[rule.ruleType] || rule.ruleType;

  openModal(
    `Edit Safety Rule: ${escapeHtml(deviceName)}`,
    `
    <form id="edit-rule-form" class="add-rule-form">
      <div class="form-group">
        <label>Device</label>
        <div class="form-static">${escapeHtml(deviceName)}</div>
      </div>

      <div class="form-group">
        <label>Rule Type</label>
        <div class="form-static">${ruleLabel}</div>
      </div>

      <div class="form-group">
        <label for="edit-rule-priority">Priority (higher = more restrictive)</label>
        <input type="number" id="edit-rule-priority" class="form-input" value="${rule.priority}" min="0" max="100">
      </div>

      <div class="form-group">
        <label for="edit-rule-enabled">Enabled</label>
        <select id="edit-rule-enabled" class="form-select">
          <option value="true" ${rule.enabled ? 'selected' : ''}>Yes</option>
          <option value="false" ${!rule.enabled ? 'selected' : ''}>No</option>
        </select>
      </div>

      <div id="edit-rule-config-fields">
        ${buildConfigFieldsForRuleType(rule.ruleType, rule.ruleConfig)}
      </div>
    </form>
    `,
    `<button class="btn btn-secondary" onclick="window.__closeModal && window.__closeModal()">Cancel</button>
     <button class="btn btn-primary" id="update-rule-btn">Save Changes</button>`,
  );

  // Store closeModal reference
  (window as any).__closeModal = closeModal;

  // Setup rule type change handler to show appropriate config fields
  const ruleTypeSelect = document.getElementById(
    'edit-rule-type',
  ) as HTMLSelectElement;
  ruleTypeSelect?.addEventListener('change', () => {
    showConfigFieldsForRuleType(ruleTypeSelect.value);
  });

  // Setup update button
  const updateBtn = document.getElementById('update-rule-btn');
  updateBtn?.addEventListener('click', () => saveEditedRule(rule.id));
}

function buildConfigFieldsForRuleType(
  ruleType: string,
  ruleConfig: Record<string, unknown>,
): string {
  switch (ruleType) {
    case 'max_on_duration':
      return `
        <div class="form-group">
          <label for="config-max-seconds">Maximum On Duration (seconds)</label>
          <input type="number" id="config-max-seconds" class="form-input" value="${(ruleConfig.maxSeconds as number) || 300}" min="1" required>
        </div>
      `;
    case 'min_off_duration':
      return `
        <div class="form-group">
          <label for="config-min-seconds">Minimum Off Duration (seconds)</label>
          <input type="number" id="config-min-seconds" class="form-input" value="${(ruleConfig.minSeconds as number) || 60}" min="1" required>
        </div>
      `;
    case 'max_activations_per_hour':
      return `
        <div class="form-group">
          <label for="config-max-per-hour">Maximum Activations Per Hour</label>
          <input type="number" id="config-max-per-hour" class="form-input" value="${(ruleConfig.maxPerHour as number) || 10}" min="1" required>
        </div>
      `;
    case 'allowed_schedule_windows': {
      const windows =
        (ruleConfig.windows as Array<{ startHour: number; endHour: number }>) ||
        [];
      const windowRows = windows
        .map(
          (w, i) => `
        <div class="schedule-window-row">
          <input type="number" class="form-input schedule-start" placeholder="Start hour (0-23)" min="0" max="23" value="${w.startHour}">
          <span>to</span>
          <input type="number" class="form-input schedule-end" placeholder="End hour (0-23)" min="0" max="23" value="${w.endHour}">
          <button type="button" class="btn btn-sm btn-danger remove-window-btn">×</button>
        </div>
      `,
        )
        .join('');
      return `
        <div class="form-group">
          <label>Schedule Windows</label>
          <div id="schedule-windows-list">
            ${windowRows}
            ${
              windows.length === 0
                ? `
            <div class="schedule-window-row">
              <input type="number" class="form-input schedule-start" placeholder="Start hour (0-23)" min="0" max="23" value="6">
              <span>to</span>
              <input type="number" class="form-input schedule-end" placeholder="End hour (0-23)" min="0" max="23" value="22">
              <button type="button" class="btn btn-sm btn-danger remove-window-btn">×</button>
            </div>
            `
                : ''
            }
          </div>
          <button type="button" class="btn btn-sm btn-secondary" id="add-window-btn">+ Add Window</button>
        </div>
      `;
    }
    case 'dependency': {
      const store = getStore();
      const sensorDevices = store.devices.filter((d) => d.type === 'sensor');
      const sensorOptions = sensorDevices
        .map(
          (d) =>
            `<option value="${d.id}" ${d.id === (ruleConfig.triggerDeviceId as string) ? 'selected' : ''}>${escapeHtml(d.name)}</option>`,
        )
        .join('');
      return `
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
            <option value="gt" ${ruleConfig.operator === 'gt' ? 'selected' : ''}>is greater than</option>
            <option value="gte" ${ruleConfig.operator === 'gte' ? 'selected' : ''}>is greater than or equal to</option>
            <option value="lt" ${ruleConfig.operator === 'lt' ? 'selected' : ''}>is less than</option>
            <option value="lte" ${ruleConfig.operator === 'lte' ? 'selected' : ''}>is less than or equal to</option>
            <option value="eq" ${ruleConfig.operator === 'eq' ? 'selected' : ''}>equals</option>
            <option value="neq" ${ruleConfig.operator === 'neq' ? 'selected' : ''}>does not equal</option>
          </select>
        </div>
        <div class="form-group">
          <label for="config-threshold">Threshold Value</label>
          <input type="number" id="config-threshold" class="form-input" value="${ruleConfig.value ?? 30}" required>
        </div>
        <div class="form-group">
          <label for="config-action-required">Required Device State</label>
          <select id="config-action-required" class="form-select" required>
            <option value="on" ${ruleConfig.actionRequired === 'on' ? 'selected' : ''}>Must stay ON</option>
            <option value="off" ${ruleConfig.actionRequired === 'off' ? 'selected' : ''}>Must stay OFF</option>
            <option value="any" ${ruleConfig.actionRequired === 'any' ? 'selected' : ''}>Any state allowed</option>
          </select>
        </div>
      `;
    }
    default:
      return `<p class="text-secondary text-sm">Unknown rule type: ${escapeHtml(ruleType)}</p>`;
  }
}

async function saveEditedRule(ruleId: string): Promise<void> {
  const priorityInput = document.getElementById(
    'edit-rule-priority',
  ) as HTMLInputElement;
  const enabledSelect = document.getElementById(
    'edit-rule-enabled',
  ) as HTMLSelectElement;

  const priority = parseInt(priorityInput?.value || '0', 10);
  const enabled = enabledSelect?.value === 'true';

  // Get the existing rule to know the ruleType
  let ruleType = '';
  let ruleConfig: Record<string, unknown> = {};

  try {
    const existingRule = await halApi.getSafetyRule(ruleId);
    ruleType = existingRule.ruleType;
    ruleConfig = { ...existingRule.ruleConfig };
  } catch (err: any) {
    showToast(`Failed to load rule: ${err.message}`, 'error');
    return;
  }

  // Update ruleConfig based on ruleType
  switch (ruleType) {
    case 'max_on_duration': {
      const maxSecondsInput = document.getElementById(
        'config-max-seconds',
      ) as HTMLInputElement;
      ruleConfig = {
        maxSeconds: parseInt(maxSecondsInput?.value || '300', 10),
      };
      break;
    }
    case 'min_off_duration': {
      const minSecondsInput = document.getElementById(
        'config-min-seconds',
      ) as HTMLInputElement;
      ruleConfig = { minSeconds: parseInt(minSecondsInput?.value || '60', 10) };
      break;
    }
    case 'max_activations_per_hour': {
      const maxPerHourInput = document.getElementById(
        'config-max-per-hour',
      ) as HTMLInputElement;
      ruleConfig = { maxPerHour: parseInt(maxPerHourInput?.value || '10', 10) };
      break;
    }
    case 'allowed_schedule_windows': {
      const windows: Array<{ startHour: number; endHour: number }> = [];
      document.querySelectorAll('.schedule-window-row').forEach((row) => {
        const startInput = row.querySelector(
          '.schedule-start',
        ) as HTMLInputElement;
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
      const triggerDeviceSelect = document.getElementById(
        'config-trigger-device',
      ) as HTMLSelectElement;
      const operatorSelect = document.getElementById(
        'config-operator',
      ) as HTMLSelectElement;
      const thresholdInput = document.getElementById(
        'config-threshold',
      ) as HTMLInputElement;
      const actionRequiredSelect = document.getElementById(
        'config-action-required',
      ) as HTMLSelectElement;
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
    await halApi.updateSafetyRule(ruleId, { ruleConfig, enabled, priority });
    closeModal();
    showToast('Rule updated successfully', 'success');
    await loadSafetyRules();
    await loadSafetySummary();
  } catch (err: any) {
    showToast(`Failed to update rule: ${err.message}`, 'error');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Threshold Management (VAL-AUTO-010, VAL-AUTO-011, VAL-AUTO-012)
// ══════════════════════════════════════════════════════════════════════════════

interface Threshold {
  id: string;
  deviceId: string | null;
  zone: string | null;
  metric: string;
  minValue: number | null;
  maxValue: number | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const METRIC_LABELS: Record<string, string> = {
  temperature: 'Temperature (°C)',
  humidity: 'Humidity (%)',
  soil_moisture: 'Soil Moisture (%)',
  co2: 'CO₂ (ppm)',
  light: 'Light (lux)',
};

const METRIC_UNITS: Record<string, string> = {
  temperature: '°C',
  humidity: '%',
  soil_moisture: '%',
  co2: 'ppm',
  light: 'lux',
};

async function loadThresholds(): Promise<void> {
  try {
    const thresholds: Threshold[] = await halApi.getThresholds();
    const listEl = document.getElementById('safety-thresholds-list');
    if (!listEl) return;

    if (thresholds.length === 0) {
      listEl.innerHTML = `
        <div class="safety-empty">
          <p>No thresholds configured.</p>
          <p>Click "Add Threshold" to set min/max bounds for sensor metrics.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = thresholds.map((t) => renderThresholdCard(t)).join('');

    // Add event listeners for edit/delete buttons
    listEl.querySelectorAll('.threshold-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const thresholdId = (btn as HTMLElement).dataset.thresholdId!;
        editThreshold(thresholdId);
      });
    });

    listEl.querySelectorAll('.threshold-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const thresholdId = (btn as HTMLElement).dataset.thresholdId!;
        const metric = (btn as HTMLElement).dataset.metric!;
        confirmDeleteThreshold(thresholdId, metric);
      });
    });

    listEl.querySelectorAll('.threshold-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const thresholdId = (btn as HTMLElement).dataset.thresholdId!;
        const threshold = thresholds.find((t) => t.id === thresholdId);
        if (threshold) {
          await toggleThreshold(threshold);
        }
      });
    });
  } catch (err) {
    console.error('Failed to load thresholds:', err);
    const listEl = document.getElementById('safety-thresholds-list');
    if (listEl) {
      listEl.innerHTML = `<div class="safety-empty text-danger">Failed to load thresholds.</div>`;
    }
  }
}

function renderThresholdCard(threshold: Threshold): string {
  const store = getStore();
  let deviceName = 'All Devices';
  if (threshold.deviceId) {
    const device = store.devices.find((d) => d.id === threshold.deviceId);
    deviceName = device?.name || threshold.deviceId;
  } else if (threshold.zone) {
    deviceName = `Zone: ${threshold.zone}`;
  }

  const metricLabel = METRIC_LABELS[threshold.metric] || threshold.metric;
  const unit = METRIC_UNITS[threshold.metric] || '';
  const minDisplay =
    threshold.minValue !== null ? `${threshold.minValue}${unit}` : '—';
  const maxDisplay =
    threshold.maxValue !== null ? `${threshold.maxValue}${unit}` : '—';

  return `
    <div class="threshold-card ${threshold.enabled ? '' : 'disabled'}" data-threshold-id="${threshold.id}">
      <div class="threshold-header">
        <div class="threshold-device">${escapeHtml(deviceName)}</div>
        <div class="threshold-metric-badge">${metricLabel}</div>
      </div>
      <div class="threshold-bounds">
        <div class="threshold-bound">
          <span class="threshold-bound-label">MIN</span>
          <span class="threshold-bound-value">${minDisplay}</span>
        </div>
        <div class="threshold-bound-divider">—</div>
        <div class="threshold-bound">
          <span class="threshold-bound-label">MAX</span>
          <span class="threshold-bound-value">${maxDisplay}</span>
        </div>
      </div>
      <div class="threshold-meta">
        Updated ${formatRelativeTime(threshold.updatedAt)}
      </div>
      <div class="threshold-actions">
        <button class="btn btn-sm threshold-toggle-btn ${threshold.enabled ? 'btn-warning' : 'btn-success'}" data-threshold-id="${threshold.id}">
          ${threshold.enabled ? 'Disable' : 'Enable'}
        </button>
        <button class="btn btn-sm btn-secondary threshold-edit-btn" data-threshold-id="${threshold.id}">Edit</button>
        <button class="btn btn-sm btn-danger threshold-delete-btn" data-threshold-id="${threshold.id}" data-metric="${threshold.metric}">Delete</button>
      </div>
    </div>
  `;
}

async function toggleThreshold(threshold: Threshold): Promise<void> {
  try {
    await halApi.updateThreshold(threshold.id, { enabled: !threshold.enabled });
    showToast(
      `Threshold ${threshold.enabled ? 'disabled' : 'enabled'}`,
      'success',
    );
    await loadThresholds();
  } catch (err: any) {
    showToast(`Failed to toggle threshold: ${err.message}`, 'error');
  }
}

function confirmDeleteThreshold(thresholdId: string, metric: string): void {
  const metricLabel = METRIC_LABELS[metric] || metric;
  openModal(
    'Delete Threshold',
    `<p>Are you sure you want to delete this <strong>${metricLabel}</strong> threshold?</p>
     <p class="text-danger">This action cannot be undone.</p>`,
    `<button class="btn btn-secondary" onclick="window.__closeModal && window.__closeModal()">Cancel</button>
     <button class="btn btn-danger" id="confirm-delete-threshold-btn">Delete Threshold</button>`,
  );

  (window as any).__closeModal = closeModal;

  const confirmBtn = document.getElementById('confirm-delete-threshold-btn');
  confirmBtn?.addEventListener('click', async () => {
    closeModal();
    try {
      await halApi.deleteThreshold(thresholdId);
      showToast('Threshold deleted', 'success');
      await loadThresholds();
    } catch (err: any) {
      showToast(`Failed to delete threshold: ${err.message}`, 'error');
    }
  });
}

function showAddThresholdModal(): void {
  const store = getStore();
  const sensorDevices = store.devices.filter((d) => d.type === 'sensor');

  // Get unique zones from devices
  const zones = [
    ...new Set(store.devices.map((d) => d.zone).filter(Boolean)),
  ] as string[];

  const deviceOptions =
    `<option value="">All Devices (global)</option>` +
    sensorDevices
      .map(
        (d) => `<option value="${d.id}">${escapeHtml(d.name || d.id)}</option>`,
      )
      .join('');
  const zoneOptions =
    zones.length > 0
      ? `<option value="">All Zones</option>` +
        zones
          .map(
            (z) => `<option value="${escapeHtml(z)}">${escapeHtml(z)}</option>`,
          )
          .join('')
      : '';
  const metricOptions = Object.entries(METRIC_LABELS)
    .map(([key, label]) => `<option value="${key}">${label}</option>`)
    .join('');

  openModal(
    'Add Threshold',
    `
    <form id="add-threshold-form" class="add-rule-form">
      <div class="form-group">
        <label for="threshold-scope">Applies To</label>
        <select id="threshold-scope" class="form-select">
          <option value="global">All Devices (Global)</option>
          <option value="device">Specific Device</option>
          ${zoneOptions ? `<option value="zone">Specific Zone</option>` : ''}
        </select>
      </div>

      <div class="form-group" id="threshold-device-group" style="display:none;">
        <label for="threshold-device">Device</label>
        <select id="threshold-device" class="form-select">
          <option value="">Select device...</option>
          ${deviceOptions}
        </select>
      </div>

      <div class="form-group" id="threshold-zone-group" style="display:none;">
        <label for="threshold-zone">Zone</label>
        <select id="threshold-zone" class="form-select">
          <option value="">Select zone...</option>
          ${zoneOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="threshold-metric">Metric</label>
        <select id="threshold-metric" class="form-select" required>
          <option value="">Select metric...</option>
          ${metricOptions}
        </select>
      </div>

      <div class="threshold-bounds-form">
        <div class="form-group">
          <label for="threshold-min">Min Value</label>
          <input type="number" id="threshold-min" class="form-input" placeholder="No minimum" step="any">
        </div>
        <div class="form-group">
          <label for="threshold-max">Max Value</label>
          <input type="number" id="threshold-max" class="form-input" placeholder="No maximum" step="any">
        </div>
      </div>
    </form>
    `,
    `<button class="btn btn-secondary" onclick="window.__closeModal && window.__closeModal()">Cancel</button>
     <button class="btn btn-primary" id="save-threshold-btn">Save Threshold</button>`,
  );

  (window as any).__closeModal = closeModal;

  // Setup scope change handler
  const scopeSelect = document.getElementById(
    'threshold-scope',
  ) as HTMLSelectElement;
  scopeSelect?.addEventListener('change', () => {
    const deviceGroup = document.getElementById('threshold-device-group');
    const zoneGroup = document.getElementById('threshold-zone-group');
    const scope = scopeSelect.value;

    if (deviceGroup)
      deviceGroup.style.display = scope === 'device' ? '' : 'none';
    if (zoneGroup) zoneGroup.style.display = scope === 'zone' ? '' : 'none';
  });

  const saveBtn = document.getElementById('save-threshold-btn');
  saveBtn?.addEventListener('click', () => saveThreshold());
}

async function saveThreshold(): Promise<void> {
  const scopeSelect = document.getElementById(
    'threshold-scope',
  ) as HTMLSelectElement;
  const deviceSelect = document.getElementById(
    'threshold-device',
  ) as HTMLSelectElement;
  const zoneSelect = document.getElementById(
    'threshold-zone',
  ) as HTMLSelectElement;
  const metricSelect = document.getElementById(
    'threshold-metric',
  ) as HTMLSelectElement;
  const minInput = document.getElementById('threshold-min') as HTMLInputElement;
  const maxInput = document.getElementById('threshold-max') as HTMLInputElement;

  const scope = scopeSelect?.value || 'global';
  const deviceId =
    scope === 'device' ? deviceSelect?.value || undefined : undefined;
  const zone = scope === 'zone' ? zoneSelect?.value || undefined : undefined;
  const metric = metricSelect?.value;
  const minValue = minInput?.value ? parseFloat(minInput.value) : undefined;
  const maxValue = maxInput?.value ? parseFloat(maxInput.value) : undefined;

  if (!metric) {
    showToast('Please select a metric', 'error');
    return;
  }

  if (minValue === undefined && maxValue === undefined) {
    showToast('Please enter at least a minimum or maximum value', 'error');
    return;
  }

  try {
    await halApi.createThreshold({
      deviceId: deviceId || undefined,
      zone: zone || undefined,
      metric,
      minValue: minValue ?? null,
      maxValue: maxValue ?? null,
      enabled: true,
    });
    closeModal();
    showToast('Threshold created successfully', 'success');
    await loadThresholds();
  } catch (err: any) {
    showToast(`Failed to create threshold: ${err.message}`, 'error');
  }
}

async function editThreshold(thresholdId: string): Promise<void> {
  try {
    const threshold: Threshold = await halApi.getThreshold(thresholdId);
    showEditThresholdModal(threshold);
  } catch (err: any) {
    showToast(`Failed to load threshold: ${err.message}`, 'error');
  }
}

function showEditThresholdModal(threshold: Threshold): void {
  const store = getStore();
  const sensorDevices = store.devices.filter((d) => d.type === 'sensor');
  const zones = [
    ...new Set(store.devices.map((d) => d.zone).filter(Boolean)),
  ] as string[];

  let scope = 'global';
  if (threshold.deviceId) scope = 'device';
  else if (threshold.zone) scope = 'zone';

  const deviceOptions =
    `<option value="">All Devices (global)</option>` +
    sensorDevices
      .map(
        (d) =>
          `<option value="${d.id}" ${d.id === threshold.deviceId ? 'selected' : ''}>${escapeHtml(d.name || d.id)}</option>`,
      )
      .join('');
  const zoneOptions =
    zones.length > 0
      ? `<option value="">All Zones</option>` +
        zones
          .map(
            (z) =>
              `<option value="${escapeHtml(z)}" ${z === threshold.zone ? 'selected' : ''}>${escapeHtml(z)}</option>`,
          )
          .join('')
      : '';
  const metricOptions = Object.entries(METRIC_LABELS)
    .map(
      ([key, label]) =>
        `<option value="${key}" ${key === threshold.metric ? 'selected' : ''}>${label}</option>`,
    )
    .join('');

  const unit = METRIC_UNITS[threshold.metric] || '';

  openModal(
    'Edit Threshold',
    `
    <form id="edit-threshold-form" class="add-rule-form">
      <div class="form-group">
        <label for="threshold-scope">Applies To</label>
        <select id="threshold-scope" class="form-select">
          <option value="global" ${scope === 'global' ? 'selected' : ''}>All Devices (Global)</option>
          <option value="device" ${scope === 'device' ? 'selected' : ''}>Specific Device</option>
          ${zoneOptions ? `<option value="zone" ${scope === 'zone' ? 'selected' : ''}>Specific Zone</option>` : ''}
        </select>
      </div>

      <div class="form-group" id="threshold-device-group" style="display:${scope === 'device' ? '' : 'none'};">
        <label for="threshold-device">Device</label>
        <select id="threshold-device" class="form-select">
          ${deviceOptions}
        </select>
      </div>

      <div class="form-group" id="threshold-zone-group" style="display:${scope === 'zone' ? '' : 'none'};">
        <label for="threshold-zone">Zone</label>
        <select id="threshold-zone" class="form-select">
          ${zoneOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="threshold-metric">Metric</label>
        <select id="threshold-metric" class="form-select" required>
          ${metricOptions}
        </select>
      </div>

      <div class="threshold-bounds-form">
        <div class="form-group">
          <label for="threshold-min">Min Value (${unit})</label>
          <input type="number" id="threshold-min" class="form-input" value="${threshold.minValue ?? ''}" placeholder="No minimum" step="any">
        </div>
        <div class="form-group">
          <label for="threshold-max">Max Value (${unit})</label>
          <input type="number" id="threshold-max" class="form-input" value="${threshold.maxValue ?? ''}" placeholder="No maximum" step="any">
        </div>
      </div>

      <div class="form-group">
        <label for="threshold-enabled">Enabled</label>
        <select id="threshold-enabled" class="form-select">
          <option value="true" ${threshold.enabled ? 'selected' : ''}>Yes</option>
          <option value="false" ${!threshold.enabled ? 'selected' : ''}>No</option>
        </select>
      </div>
    </form>
    `,
    `<button class="btn btn-secondary" onclick="window.__closeModal && window.__closeModal()">Cancel</button>
     <button class="btn btn-primary" id="update-threshold-btn">Save Changes</button>`,
  );

  (window as any).__closeModal = closeModal;

  // Setup scope change handler
  const scopeSelect = document.getElementById(
    'threshold-scope',
  ) as HTMLSelectElement;
  scopeSelect?.addEventListener('change', () => {
    const deviceGroup = document.getElementById('threshold-device-group');
    const zoneGroup = document.getElementById('threshold-zone-group');
    const s = scopeSelect.value;
    if (deviceGroup) deviceGroup.style.display = s === 'device' ? '' : 'none';
    if (zoneGroup) zoneGroup.style.display = s === 'zone' ? '' : 'none';
  });

  const updateBtn = document.getElementById('update-threshold-btn');
  updateBtn?.addEventListener('click', () => saveEditedThreshold(threshold.id));
}

async function saveEditedThreshold(thresholdId: string): Promise<void> {
  const scopeSelect = document.getElementById(
    'threshold-scope',
  ) as HTMLSelectElement;
  const deviceSelect = document.getElementById(
    'threshold-device',
  ) as HTMLSelectElement;
  const zoneSelect = document.getElementById(
    'threshold-zone',
  ) as HTMLSelectElement;
  const metricSelect = document.getElementById(
    'threshold-metric',
  ) as HTMLSelectElement;
  const minInput = document.getElementById('threshold-min') as HTMLInputElement;
  const maxInput = document.getElementById('threshold-max') as HTMLInputElement;
  const enabledSelect = document.getElementById(
    'threshold-enabled',
  ) as HTMLSelectElement;

  const scope = scopeSelect?.value || 'global';
  const deviceId =
    scope === 'device' ? deviceSelect?.value || undefined : undefined;
  const zone = scope === 'zone' ? zoneSelect?.value || undefined : undefined;
  const metric = metricSelect?.value;
  const minValue = minInput?.value ? parseFloat(minInput.value) : undefined;
  const maxValue = maxInput?.value ? parseFloat(maxInput.value) : undefined;
  const enabled = enabledSelect?.value === 'true';

  if (!metric) {
    showToast('Please select a metric', 'error');
    return;
  }

  if (minValue === undefined && maxValue === undefined) {
    showToast('Please enter at least a minimum or maximum value', 'error');
    return;
  }

  try {
    await halApi.updateThreshold(thresholdId, {
      deviceId: deviceId || null,
      zone: zone || null,
      metric,
      minValue: minValue ?? null,
      maxValue: maxValue ?? null,
      enabled,
    });
    closeModal();
    showToast('Threshold updated successfully', 'success');
    await loadThresholds();
  } catch (err: any) {
    showToast(`Failed to update threshold: ${err.message}`, 'error');
  }
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
/* Safety tabs */
.safety-tabs {
  display: flex;
  gap: 0;
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--border);
}
.safety-tab {
  padding: var(--space-3) var(--space-5);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: -1px;
}
.safety-tab:hover {
  color: var(--text-primary);
}
.safety-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
/* Threshold cards */
.threshold-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  border-left: 3px solid var(--accent);
  margin-bottom: var(--space-3);
}
.threshold-card.disabled {
  opacity: 0.5;
  border-left-color: var(--text-tertiary);
}
.threshold-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.threshold-device {
  font-weight: 600;
  font-size: 14px;
}
.threshold-metric-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.threshold-bounds {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}
.threshold-bound {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}
.threshold-bound-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
}
.threshold-bound-value {
  font-size: 20px;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--accent);
}
.threshold-bound-divider {
  font-size: 18px;
  color: var(--text-tertiary);
  padding-top: 12px;
}
.threshold-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-3);
}
.threshold-actions {
  display: flex;
  gap: var(--space-2);
}
.threshold-bounds-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
`;
  document.head.appendChild(style);
}
