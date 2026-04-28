// Device Discovery Wizard — 5-step modal flow
// VAL-DISC-001 through VAL-DISC-052

import { halApi, HalDevice } from '../api.js';
import { showToast } from '../components/Toast.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface DiscoveredDevice {
  host: string;
  protocol: string;
  type: string;
  label: string;
  online: boolean;
  port?: string; // for serial
  selected?: boolean;
  name?: string;
  zone?: string;
  role?: string;
}

interface Protocol {
  id: 'gpio' | 'mqtt' | 'http_tasmota' | 'http_shelly' | 'serial';
  label: string;
  description: string;
  icon: string;
  available?: boolean;
  unavailableReason?: string;
}

const PROTOCOLS: Protocol[] = [
  {
    id: 'gpio',
    label: 'GPIO',
    description: 'Raspberry Pi GPIO pins via pigpiod',
    icon: '🟢',
  },
  {
    id: 'mqtt',
    label: 'MQTT',
    description: 'HomeAssistant or Tasmota MQTT discovery',
    icon: '📡',
  },
  {
    id: 'http_tasmota',
    label: 'HTTP / Tasmota',
    description: 'Tasmota HTTP devices on your network',
    icon: '🌐',
  },
  {
    id: 'http_shelly',
    label: 'HTTP / Shelly',
    description: 'Shelly smart plugs on your network',
    icon: '🔌',
  },
  {
    id: 'serial',
    label: 'Serial',
    description: 'USB serial sensors (BME280, DS18B20, Atlas EZO)',
    icon: '🔗',
  },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentStep: WizardStep = 1;
let selectedProtocol: Protocol | null = null;
let discoveredDevices: DiscoveredDevice[] = [];
let selectedDevices: DiscoveredDevice[] = [];
let zones: Array<{ id: string; name: string; deviceCount: number }> = [];
let isScanning = false;
let scanAbortController: AbortController | null = null;
let scanTimeout: ReturnType<typeof setTimeout> | null = null;
let wizardOverlay: HTMLElement | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function openDiscoveryWizard(): Promise<void> {
  currentStep = 1;
  selectedProtocol = null;
  discoveredDevices = [];
  selectedDevices = [];
  isScanning = false;
  scanAbortController = null;
  scanTimeout = null;

  // Load zones
  try {
    zones = await halApi.getZones();
  } catch {
    zones = [];
  }

  // Check GPIO availability
  for (const p of PROTOCOLS) {
    if (p.id === 'gpio') {
      try {
        const status = await halApi.getGpioStatus();
        p.available = status.available;
        if (!status.available) {
          p.unavailableReason = 'pigpiod not running';
        }
      } catch {
        p.available = false;
        p.unavailableReason = 'Unable to check GPIO';
      }
    }
  }

  renderWizard();
}

function closeWizard(): void {
  if (scanAbortController) {
    scanAbortController.abort();
    scanAbortController = null;
  }
  if (scanTimeout) {
    clearTimeout(scanTimeout);
    scanTimeout = null;
  }
  if (wizardOverlay) {
    wizardOverlay.remove();
    wizardOverlay = null;
  }
  isScanning = false;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderWizard(): void {
  injectWizardStyles();
  closeWizard();

  wizardOverlay = document.createElement('div');
  wizardOverlay.id = 'discovery-wizard-overlay';
  wizardOverlay.className = 'dw-overlay';
  document.body.appendChild(wizardOverlay);

  const title = getStepTitle();
  const content = getStepContent();
  const actions = getStepActions();

  wizardOverlay.innerHTML = `
    <div class="dw-panel">
      <div class="dw-header">
        <div class="dw-header-title">
          <span class="dw-icon">${getStepIcon()}</span>
          <span>${title}</span>
        </div>
        <button class="dw-close" id="dw-close-btn" aria-label="Close">×</button>
      </div>
      <div class="dw-progress">
        ${renderProgress()}
      </div>
      <div class="dw-body" id="dw-body">
        ${content}
      </div>
      <div class="dw-actions" id="dw-actions">
        ${actions}
      </div>
    </div>
  `;

  attachWizardHandlers();
}

function renderProgress(): string {
  const steps: WizardStep[] = [1, 2, 3, 4, 5];
  return steps
    .map((s) => {
      const active = s === currentStep;
      const done = s < currentStep;
      const cls = done ? 'done' : active ? 'active' : '';
      return `<div class="dw-step-dot ${cls}" data-step="${s}">
        <div class="dw-step-num">${done ? '✓' : s}</div>
      </div>`;
    })
    .join('<div class="dw-step-line"></div>');
}

function getStepTitle(): string {
  switch (currentStep) {
    case 1:
      return 'Add Device';
    case 2:
      return selectedProtocol?.id === 'serial'
        ? 'Scanning Serial Ports…'
        : 'Scanning Network…';
    case 3:
      return 'Select Devices';
    case 4:
      return 'Configure Devices';
    case 5:
      return 'Confirm Setup';
  }
}

function getStepIcon(): string {
  switch (currentStep) {
    case 1:
      return '🔍';
    case 2:
      return '⏳';
    case 3:
      return '☑️';
    case 4:
      return '⚙️';
    case 5:
      return '✅';
  }
}

function getStepContent(): string {
  switch (currentStep) {
    case 1:
      return renderStep1_ProtocolSelect();
    case 2:
      return renderStep2_Scan();
    case 3:
      return renderStep3_DeviceList();
    case 4:
      return renderStep4_Assign();
    case 5:
      return renderStep5_Confirm();
  }
}

function getStepActions(): string {
  switch (currentStep) {
    case 1:
      return `<button class="dw-btn-secondary" id="dw-manual-btn">Add Manually</button>
              <button class="dw-btn-primary" id="dw-next-btn" disabled>Next</button>`;
    case 2:
      return `<button class="dw-btn-secondary" id="dw-cancel-scan-btn">Cancel</button>`;
    case 3:
      return `<button class="dw-btn-secondary" id="dw-back-btn">Back</button>
              <button class="dw-btn-primary" id="dw-next-btn" disabled>Next</button>`;
    case 4:
      return `<button class="dw-btn-secondary" id="dw-back-btn">Back</button>
              <button class="dw-btn-primary" id="dw-next-btn" disabled>Review</button>`;
    case 5:
      return `<button class="dw-btn-secondary" id="dw-back-btn">Back</button>
              <button class="dw-btn-primary dw-btn-success" id="dw-confirm-btn">Add Devices</button>`;
  }
}

// ---------------------------------------------------------------------------
// Step 1: Protocol Selection (VAL-DISC-002)
// ---------------------------------------------------------------------------

function renderStep1_ProtocolSelect(): string {
  const protocolCards = PROTOCOLS.map((p) => {
    const disabled = p.available === false;
    return `
      <div class="dw-protocol-card ${selectedProtocol?.id === p.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}"
           data-protocol="${p.id}" ${disabled ? 'aria-disabled="true"' : ''}>
        <div class="dw-protocol-icon">${p.icon}</div>
        <div class="dw-protocol-info">
          <div class="dw-protocol-label">${p.label}</div>
          <div class="dw-protocol-desc">${p.description}</div>
          ${disabled ? `<div class="dw-protocol-unavailable">${p.unavailableReason || 'Unavailable'}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="dw-step-content">
      <p class="dw-step-desc">Choose how you want to discover your devices.</p>
      <div class="dw-protocol-grid" id="dw-protocol-grid">
        ${protocolCards}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Step 2: Scan (VAL-DISC-003, VAL-DISC-004)
// ---------------------------------------------------------------------------

function renderStep2_Scan(): string {
  if (isScanning) {
    return `
      <div class="dw-step-content dw-scan-active">
        <div class="dw-scan-spinner">
          <div class="dw-spinner-ring"></div>
        </div>
        <p class="dw-scan-status" id="dw-scan-status">
          Scanning for ${selectedProtocol?.label} devices…
        </p>
        <p class="dw-scan-substatus" id="dw-scan-substatus">
          This may take up to 30 seconds
        </p>
      </div>
    `;
  }

  if (discoveredDevices.length === 0) {
    return `
      <div class="dw-step-content dw-empty-state">
        <div class="dw-empty-icon">📡</div>
        <p class="dw-empty-title">No devices found</p>
        <p class="dw-empty-desc">
          Check that your devices are powered on and connected, then try again.
        </p>
      </div>
    `;
  }

  // Devices found — proceed to step 3
  return '';
}

function startScan(): void {
  isScanning = true;
  currentStep = 2;
  renderWizard();

  scanAbortController = new AbortController();

  // 30 second timeout
  scanTimeout = setTimeout(() => {
    scanAbortController?.abort();
  }, 30000);

  performScan().finally(() => {
    isScanning = false;
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      scanTimeout = null;
    }
  });
}

async function performScan(): Promise<void> {
  if (!selectedProtocol) return;

  const protocol = selectedProtocol.id;
  const statusEl = document.getElementById('dw-scan-status');
  const substatusEl = document.getElementById('dw-scan-substatus');

  try {
    if (protocol === 'gpio') {
      // Get GPIO pins
      updateScanStatus('Checking GPIO pins…', '');
      const { pins } = await halApi.getGpioPins();
      const available = pins.filter((p) => p.state === 'available');
      discoveredDevices = available.map((p) => ({
        host: String(p.bcm),
        protocol: 'gpio',
        type: 'relay',
        label: `GPIO ${p.bcm}`,
        online: true,
      }));
    } else if (protocol === 'mqtt') {
      updateScanStatus(
        'Subscribing to MQTT topics…',
        'Listening for homeassistant/+/+ and tele/+/SENSOR',
      );
      const result = await halApi.getMqttDevices();
      discoveredDevices = result.devices as unknown as DiscoveredDevice[];
    } else if (protocol === 'http_tasmota') {
      updateScanStatus(
        'Scanning network for Tasmota devices…',
        'Pinging subnet…',
      );
      const result = await halApi.scanHttpDevices({ protocol: 'tasmota' });
      discoveredDevices = result.devices;
    } else if (protocol === 'http_shelly') {
      updateScanStatus(
        'Scanning network for Shelly devices…',
        'Pinging subnet…',
      );
      const result = await halApi.scanHttpDevices({ protocol: 'shelly' });
      discoveredDevices = result.devices;
    } else if (protocol === 'serial') {
      updateScanStatus('Enumerating serial ports…', '');
      const { ports } = await halApi.getSerialPorts();
      const probed: DiscoveredDevice[] = [];
      for (const port of ports) {
        try {
          const probe = await halApi.probeSerialPort(port.path);
          if (probe.detected) {
            probed.push({
              host: port.path,
              port: port.path,
              protocol: 'serial',
              type: 'sensor',
              label: probe.label || port.path,
              online: true,
            });
          }
        } catch {
          /* skip failed ports */
        }
      }
      discoveredDevices = probed;
    }
  } catch (err: any) {
    console.error('Scan error:', err);
    discoveredDevices = [];
  }

  // Move to next appropriate step
  if (discoveredDevices.length === 0) {
    // Show empty state in step 2
    renderWizard();
  } else {
    // Skip to step 3
    currentStep = 3;
    renderWizard();
  }
}

function updateScanStatus(status: string, substatus: string): void {
  const statusEl = document.getElementById('dw-scan-status');
  const substatusEl = document.getElementById('dw-scan-substatus');
  if (statusEl) statusEl.textContent = status;
  if (substatusEl) substatusEl.textContent = substatus;
}

// ---------------------------------------------------------------------------
// Step 3: Device List (VAL-DISC-005)
// ---------------------------------------------------------------------------

function renderStep3_DeviceList(): string {
  const deviceRows = discoveredDevices
    .map(
      (d, i) => `
    <div class="dw-device-row ${d.selected ? 'selected' : ''}" data-index="${i}">
      <label class="dw-device-checkbox">
        <input type="checkbox" ${d.selected ? 'checked' : ''} data-device-index="${i}">
        <span class="dw-device-checkmark"></span>
      </label>
      <div class="dw-device-info">
        <div class="dw-device-name">${escapeHtml(d.label)}</div>
        <div class="dw-device-meta">
          ${d.host} · ${d.protocol} · ${d.type}
        </div>
      </div>
      <div class="dw-device-status ${d.online ? 'online' : 'offline'}">
        ${d.online ? 'Online' : 'Offline'}
      </div>
    </div>
  `,
    )
    .join('');

  return `
    <div class="dw-step-content">
      <p class="dw-step-desc">
        ${discoveredDevices.length} device${discoveredDevices.length !== 1 ? 's' : ''} found.
        Select the devices you want to add.
      </p>
      <div class="dw-device-list">
        ${deviceRows}
      </div>
      ${
        discoveredDevices.length === 0
          ? `
        <div class="dw-empty-state">
          <div class="dw-empty-icon">📡</div>
          <p class="dw-empty-title">No devices found</p>
          <p class="dw-empty-desc">Check that your devices are powered on and connected.</p>
        </div>
      `
          : ''
      }
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Step 4: Assign Name/Zone/Role (VAL-DISC-006)
// ---------------------------------------------------------------------------

function renderStep4_Assign(): string {
  const zoneOptions = zones
    .map(
      (z) =>
        `<option value="${escapeHtml(z.name)}">${escapeHtml(z.name)} (${z.deviceCount})</option>`,
    )
    .join('');

  const roleOptions = `
    <option value="sensor">Sensor</option>
    <option value="relay">Relay</option>
    <option value="camera">Camera</option>
    <option value="smart_plug">Smart Plug</option>
  `;

  const deviceRows = selectedDevices
    .map(
      (d, i) => `
    <div class="dw-assign-row">
      <div class="dw-assign-device-info">
        <div class="dw-assign-device-name">${escapeHtml(d.label)}</div>
        <div class="dw-assign-device-meta">${d.protocol} · ${d.type}</div>
      </div>
      <div class="dw-assign-form">
        <input class="dw-input" type="text"
          id="dw-name-${i}"
          value="${escapeHtml(d.label || '')}"
          placeholder="Device name (1-64 chars)"
          maxlength="64" data-index="${i}" data-field="name">
        <select class="dw-select" id="dw-zone-${i}" data-index="${i}" data-field="zone">
          <option value="">No Zone</option>
          ${zoneOptions}
        </select>
        <select class="dw-select" id="dw-role-${i}" data-index="${i}" data-field="role">
          ${roleOptions}
        </select>
      </div>
    </div>
  `,
    )
    .join('');

  return `
    <div class="dw-step-content">
      <p class="dw-step-desc">
        Configure ${selectedDevices.length} device${selectedDevices.length !== 1 ? 's' : ''}.
        Set a name, assign a zone, and choose the device role.
      </p>
      <div class="dw-assign-list">
        ${deviceRows}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Step 5: Confirm (VAL-DISC-007)
// ---------------------------------------------------------------------------

function renderStep5_Confirm(): string {
  const rows = selectedDevices
    .map(
      (d) => `
    <div class="dw-confirm-row">
      <div class="dw-confirm-name">${escapeHtml(d.label || d.name || d.host)}</div>
      <div class="dw-confirm-meta">
        ${d.zone ? `<span class="dw-zone-tag">${escapeHtml(d.zone)}</span>` : ''}
        <span class="dw-protocol-badge">${d.protocol}</span>
        <span class="dw-role-badge">${d.role || d.type}</span>
      </div>
    </div>
  `,
    )
    .join('');

  return `
    <div class="dw-step-content">
      <p class="dw-step-desc">
        Ready to add ${selectedDevices.length} device${selectedDevices.length !== 1 ? 's' : ''} to your farm.
        Review the details below and click "Add Devices" to complete setup.
      </p>
      <div class="dw-confirm-list">
        ${rows}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function attachWizardHandlers(): void {
  const overlay = document.getElementById('discovery-wizard-overlay');
  if (!overlay) return;

  // Close button
  overlay
    .querySelector('#dw-close-btn')
    ?.addEventListener('click', closeWizard);

  // Overlay click to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeWizard();
  });

  // Step-specific handlers
  if (currentStep === 1) {
    attachStep1Handlers();
  } else if (currentStep === 2) {
    attachStep2Handlers();
  } else if (currentStep === 3) {
    attachStep3Handlers();
  } else if (currentStep === 4) {
    attachStep4Handlers();
  } else if (currentStep === 5) {
    attachStep5Handlers();
  }
}

function attachStep1Handlers(): void {
  const overlay = document.getElementById('discovery-wizard-overlay');
  if (!overlay) return;

  // Protocol card selection
  overlay
    .querySelectorAll('.dw-protocol-card:not(.disabled)')
    .forEach((card) => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset.protocol as Protocol['id'];
        selectedProtocol = PROTOCOLS.find((p) => p.id === id) || null;
        const nextBtn = document.getElementById(
          'dw-next-btn',
        ) as HTMLButtonElement | null;
        if (nextBtn) nextBtn.disabled = !selectedProtocol;
        // Update visual selection
        overlay
          .querySelectorAll('.dw-protocol-card')
          .forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });

  // Next button
  overlay.querySelector('#dw-next-btn')?.addEventListener('click', () => {
    if (!selectedProtocol) return;
    startScan();
  });

  // Manual add button
  overlay.querySelector('#dw-manual-btn')?.addEventListener('click', () => {
    openManualAdd();
  });
}

function attachStep2Handlers(): void {
  const overlay = document.getElementById('discovery-wizard-overlay');
  if (!overlay) return;

  // Cancel scan
  overlay
    .querySelector('#dw-cancel-scan-btn')
    ?.addEventListener('click', () => {
      scanAbortController?.abort();
      isScanning = false;
      currentStep = 1;
      renderWizard();
    });
}

function attachStep3Handlers(): void {
  const overlay = document.getElementById('discovery-wizard-overlay');
  if (!overlay) return;

  // Device checkbox toggles
  overlay.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const idx = parseInt((cb as HTMLInputElement).dataset.deviceIndex || '0');
      discoveredDevices[idx].selected = (cb as HTMLInputElement).checked;
      updateSelectedDevices();
      updateNextButtonState();
      // Update row visual
      const row = overlay.querySelector(`[data-index="${idx}"]`);
      if (row)
        row.classList.toggle('selected', (cb as HTMLInputElement).checked);
    });
  });

  // Back button
  overlay.querySelector('#dw-back-btn')?.addEventListener('click', () => {
    currentStep = 1;
    renderWizard();
  });

  // Next button
  overlay.querySelector('#dw-next-btn')?.addEventListener('click', () => {
    if (selectedDevices.length === 0) return;
    currentStep = 4;
    renderWizard();
  });

  updateNextButtonState();
}

function attachStep4Handlers(): void {
  const overlay = document.getElementById('discovery-wizard-overlay');
  if (!overlay) return;

  // Input changes
  overlay.querySelectorAll('.dw-input, .dw-select').forEach((el) => {
    el.addEventListener('input', () => {
      const idx = parseInt((el as HTMLElement).dataset.index || '0');
      const field = (el as HTMLElement).dataset.field as
        | 'name'
        | 'zone'
        | 'role';
      const val = (el as HTMLInputElement | HTMLSelectElement).value;
      if (selectedDevices[idx]) {
        (selectedDevices[idx] as any)[field] = val;
      }
      updateNextButtonState();
    });
  });

  // Back button
  overlay.querySelector('#dw-back-btn')?.addEventListener('click', () => {
    currentStep = 3;
    renderWizard();
  });

  // Next button
  overlay.querySelector('#dw-next-btn')?.addEventListener('click', () => {
    currentStep = 5;
    renderWizard();
  });

  updateNextButtonState();
}

function attachStep5Handlers(): void {
  const overlay = document.getElementById('discovery-wizard-overlay');
  if (!overlay) return;

  // Back button
  overlay.querySelector('#dw-back-btn')?.addEventListener('click', () => {
    currentStep = 4;
    renderWizard();
  });

  // Confirm button
  overlay
    .querySelector('#dw-confirm-btn')
    ?.addEventListener('click', async () => {
      await confirmRegistration();
    });
}

function updateSelectedDevices(): void {
  selectedDevices = discoveredDevices.filter((d) => d.selected);
}

function updateNextButtonState(): void {
  const overlay = document.getElementById('discovery-wizard-overlay');
  if (!overlay) return;
  const nextBtn = overlay.querySelector(
    '#dw-next-btn',
  ) as HTMLButtonElement | null;
  if (!nextBtn) return;

  if (currentStep === 3) {
    nextBtn.disabled = selectedDevices.length === 0;
  } else if (currentStep === 4) {
    const namesValid = selectedDevices.every((d) => {
      const name = d.label || d.name || '';
      return name.length >= 1 && name.length <= 64;
    });
    nextBtn.disabled = !namesValid;
  }
}

// ---------------------------------------------------------------------------
// Registration (VAL-DISC-007, VAL-DISC-008)
// ---------------------------------------------------------------------------

async function confirmRegistration(): Promise<void> {
  const overlay = document.getElementById('discovery-wizard-overlay');
  const confirmBtn = overlay?.querySelector(
    '#dw-confirm-btn',
  ) as HTMLButtonElement | null;

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Adding…';
  }

  const added: HalDevice[] = [];
  const errors: string[] = [];

  for (const device of selectedDevices) {
    try {
      const name = device.label || device.name || device.host;
      const protocol = device.protocol;
      const type = device.role || device.type;
      const zone = device.zone;

      let dev: HalDevice;
      if (protocol === 'gpio') {
        dev = await halApi.registerGpioDevice({
          bcmPin: parseInt(device.host),
          label: name,
          zone: zone || undefined,
        });
      } else if (protocol === 'mqtt') {
        dev = await halApi.registerMqttDevice({
          topic: device.host,
          label: name,
          type: type,
          zone: zone || undefined,
        });
      } else if (protocol === 'http_tasmota' || protocol === 'http_shelly') {
        dev = await halApi.registerHttpDevice({
          host: device.host,
          protocol: protocol === 'http_tasmota' ? 'tasmota' : 'shelly',
          type: type,
          label: name,
          zone: zone || undefined,
        });
      } else if (protocol === 'serial') {
        dev = await halApi.registerSerialDevice({
          port: device.host,
          type: type,
          label: name,
          zone: zone || undefined,
        });
      } else {
        dev = await halApi.manualAddDevice({
          host: device.host,
          protocol: protocol,
          type: type,
          label: name,
          zone: zone || undefined,
        });
      }
      added.push(dev);
    } catch (err: any) {
      errors.push(`${device.label}: ${err.message}`);
    }
  }

  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Add Devices';
  }

  if (added.length > 0) {
    showToast(
      `${added.length} device${added.length !== 1 ? 's' : ''} added successfully`,
      'success',
    );
    // Refresh HAL data
    const { refreshHALData } = await import('../main.js');
    refreshHALData();
    closeWizard();
  } else if (errors.length > 0) {
    showToast(`Failed to add devices: ${errors.join('; ')}`, 'danger');
  }
}

// ---------------------------------------------------------------------------
// Manual Add Modal (VAL-DISC-040, VAL-DISC-041)
// ---------------------------------------------------------------------------

function openManualAdd(): void {
  const overlay = document.getElementById('discovery-wizard-overlay');
  if (!overlay) return;

  const panel = overlay.querySelector('.dw-panel') as HTMLElement;
  if (!panel) return;

  // Hide the main panel content and show manual add form
  const bodyEl = document.getElementById('dw-body');
  const actionsEl = document.getElementById('dw-actions');
  if (bodyEl) {
    bodyEl.innerHTML = renderManualAddForm();
  }
  if (actionsEl) {
    actionsEl.innerHTML = `
      <button class="dw-btn-secondary" id="dw-cancel-manual-btn">Cancel</button>
      <button class="dw-btn-primary" id="dw-save-manual-btn" disabled>Add Device</button>
    `;
  }

  attachManualAddHandlers();
}

function renderManualAddForm(): string {
  const zoneOptions = zones
    .map(
      (z) =>
        `<option value="${escapeHtml(z.name)}">${escapeHtml(z.name)}</option>`,
    )
    .join('');

  return `
    <div class="dw-step-content">
      <p class="dw-step-desc">
        Enter your device details manually. FarmPal will verify connectivity before saving.
      </p>
      <div class="dw-manual-form">
        <div class="dw-form-group">
          <label class="dw-label">Host / IP Address *</label>
          <input class="dw-input" type="text" id="ma-host" placeholder="192.168.1.100" required>
        </div>
        <div class="dw-form-group">
          <label class="dw-label">Protocol *</label>
          <select class="dw-select" id="ma-protocol">
            <option value="tasmota">HTTP / Tasmota</option>
            <option value="shelly">HTTP / Shelly</option>
            <option value="mqtt">MQTT</option>
            <option value="gpio">GPIO</option>
            <option value="serial">Serial</option>
          </select>
        </div>
        <div class="dw-form-group">
          <label class="dw-label">Device Type</label>
          <select class="dw-select" id="ma-type">
            <option value="sensor">Sensor</option>
            <option value="relay">Relay</option>
            <option value="camera">Camera</option>
            <option value="smart_plug">Smart Plug</option>
          </select>
        </div>
        <div class="dw-form-group">
          <label class="dw-label">Device Name</label>
          <input class="dw-input" type="text" id="ma-name" placeholder="My Sensor" maxlength="64">
        </div>
        <div class="dw-form-group">
          <label class="dw-label">Zone</label>
          <select class="dw-select" id="ma-zone">
            <option value="">No Zone</option>
            ${zoneOptions}
          </select>
        </div>
        <div class="dw-form-validation" id="ma-validation"></div>
      </div>
    </div>
  `;
}

function attachManualAddHandlers(): void {
  const overlay = document.getElementById('discovery-wizard-overlay');
  if (!overlay) return;

  overlay
    .querySelector('#dw-cancel-manual-btn')
    ?.addEventListener('click', () => {
      currentStep = 1;
      selectedProtocol = null;
      renderWizard();
    });

  const hostInput = overlay.querySelector(
    '#ma-host',
  ) as HTMLInputElement | null;
  const protocolSelect = overlay.querySelector(
    '#ma-protocol',
  ) as HTMLSelectElement | null;
  const saveBtn = overlay.querySelector(
    '#dw-save-manual-btn',
  ) as HTMLButtonElement | null;

  function validateManualForm(): void {
    if (saveBtn) saveBtn.disabled = !hostInput?.value.trim();
  }

  hostInput?.addEventListener('input', validateManualForm);
  protocolSelect?.addEventListener('change', validateManualForm);

  saveBtn?.addEventListener('click', async () => {
    if (!hostInput?.value.trim()) return;
    const validationEl = document.getElementById('ma-validation');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Checking…';
    }
    if (validationEl) validationEl.textContent = 'Checking connectivity…';

    try {
      const dev = await halApi.manualAddDevice({
        host: hostInput!.value.trim(),
        protocol: (protocolSelect?.value as string) || 'tasmota',
        type:
          (overlay.querySelector('#ma-type') as HTMLSelectElement | null)
            ?.value || 'sensor',
        label:
          (overlay.querySelector('#ma-name') as HTMLInputElement | null)
            ?.value || undefined,
        zone:
          (overlay.querySelector('#ma-zone') as HTMLSelectElement | null)
            ?.value || undefined,
      });
      showToast(`Device "${dev.name}" added successfully`, 'success');
      const { refreshHALData } = await import('../main.js');
      refreshHALData();
      closeWizard();
    } catch (err: any) {
      if (validationEl)
        validationEl.innerHTML = `<span class="dw-validation-error">${escapeHtml(err.message)}</span>`;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Add Device';
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function injectWizardStyles(): void {
  if (document.getElementById('dw-styles')) return;
  const style = document.createElement('style');
  style.id = 'dw-styles';
  style.textContent = `
.dw-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  animation: dw-fade-in 150ms ease;
}
.dw-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: dw-slide-up 150ms ease;
}
.dw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.dw-header-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.dw-icon { font-size: 20px; }
.dw-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.dw-close:hover { color: var(--text-primary); }
.dw-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3) var(--space-4);
  gap: 0;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.dw-step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 2px solid var(--border);
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  transition: all 200ms ease;
}
.dw-step-dot.active {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}
.dw-step-dot.done {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg-primary);
}
.dw-step-line {
  flex: 1;
  height: 2px;
  background: var(--border);
  min-width: 20px;
}
.dw-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}
.dw-step-content { }
.dw-step-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: var(--space-4);
}
.dw-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  padding: var(--space-4);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.dw-btn-primary {
  background: var(--accent);
  color: var(--text-primary);
  border: none;
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-4);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 150ms;
}
.dw-btn-primary:hover:not(:disabled) { opacity: 0.85; }
.dw-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.dw-btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-4);
  font-size: 14px;
  cursor: pointer;
}
.dw-btn-secondary:hover { border-color: var(--accent); color: var(--text-primary); }
.dw-btn-success {
  background: var(--success);
}
.dw-protocol-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.dw-protocol-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 150ms, background 150ms;
}
.dw-protocol-card:hover:not(.disabled) { border-color: var(--accent); }
.dw-protocol-card.selected { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
.dw-protocol-card.disabled { opacity: 0.5; cursor: not-allowed; }
.dw-protocol-icon { font-size: 24px; flex-shrink: 0; }
.dw-protocol-label { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.dw-protocol-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.dw-protocol-unavailable { font-size: 11px; color: var(--warning); margin-top: 4px; }
.dw-scan-active { text-align: center; padding: var(--space-6) 0; }
.dw-scan-spinner { margin-bottom: var(--space-4); }
.dw-spinner-ring {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: dw-spin 0.8s linear infinite;
  margin: 0 auto;
}
@keyframes dw-spin { to { transform: rotate(360deg); } }
.dw-scan-status { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.dw-scan-substatus { font-size: 12px; color: var(--text-secondary); margin-top: var(--space-1); }
.dw-empty-state { text-align: center; padding: var(--space-6) 0; }
.dw-empty-icon { font-size: 48px; margin-bottom: var(--space-3); }
.dw-empty-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: var(--space-2); }
.dw-empty-desc { font-size: 14px; color: var(--text-secondary); }
.dw-device-list { display: flex; flex-direction: column; gap: var(--space-2); }
.dw-device-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 150ms;
}
.dw-device-row:hover { border-color: var(--accent); }
.dw-device-row.selected { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
.dw-device-checkbox { display: flex; align-items: center; }
.dw-device-checkbox input { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
.dw-device-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.dw-device-meta { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.dw-device-status { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-pill); }
.dw-device-status.online { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
.dw-device-status.offline { background: color-mix(in srgb, var(--danger) 15%, transparent); color: var(--danger); }
.dw-assign-list { display: flex; flex-direction: column; gap: var(--space-3); }
.dw-assign-row {
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.dw-assign-device-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.dw-assign-device-meta { font-size: 12px; color: var(--text-secondary); margin-bottom: var(--space-2); }
.dw-assign-form { display: flex; flex-direction: column; gap: var(--space-2); }
.dw-input {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-3);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.dw-input:focus { border-color: var(--accent); }
.dw-select {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-3);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
}
.dw-select:focus { border-color: var(--accent); }
.dw-confirm-list { display: flex; flex-direction: column; gap: var(--space-2); }
.dw-confirm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.dw-confirm-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.dw-confirm-meta { display: flex; align-items: center; gap: var(--space-2); margin-top: 4px; }
.dw-zone-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  border-radius: var(--radius-pill);
  border: 1px solid var(--accent);
}
.dw-protocol-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.dw-role-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
}
.dw-manual-form { display: flex; flex-direction: column; gap: var(--space-3); }
.dw-form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.dw-label { font-size: 12px; font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
.dw-form-validation { font-size: 13px; min-height: 20px; }
.dw-validation-error { color: var(--danger); }
@keyframes dw-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes dw-slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;
  document.head.appendChild(style);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
