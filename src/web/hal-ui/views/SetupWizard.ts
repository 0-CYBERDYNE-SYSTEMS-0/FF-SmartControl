// Setup Wizard — 6-step first-boot provisioning UI
// VAL-SETUP-001 through VAL-SETUP-035

import {
  provisioningApi,
  type ProvisioningStatus,
  type WizardSession,
  type WizardCompleteRequest,
} from '../api-provisioning.js';
import { halApi } from '../api.js';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// Wizard Steps
// ---------------------------------------------------------------------------
type StepId = 1 | 2 | 3 | 4 | 5 | 6;

interface WizardData {
  // Step 1
  adminPassword: string;
  adminPasswordHash: string;
  // Step 2
  farmName: string;
  // Step 3
  timezone: string;
  // Step 4
  wifiSsid: string;
  wifiPassword: string;
  wifiConfigured: boolean;
  // Step 5
  llmProvider: string;
  llmEndpoint: string;
  llmApiKey: string;
  llmModel: string;
  // Step 6
  telegramEnabled: boolean;
  telegramBotToken: string;
}

const DEFAULT_DATA: WizardData = {
  adminPassword: '',
  adminPasswordHash: '',
  farmName: 'My Farm',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  wifiSsid: '',
  wifiPassword: '',
  wifiConfigured: false,
  llmProvider: 'ollama',
  llmEndpoint: 'http://localhost:11434',
  llmApiKey: '',
  llmModel: '',
  telegramEnabled: false,
  telegramBotToken: '',
};

const STEP_LABELS: Record<StepId, string> = {
  1: 'Admin Password',
  2: 'Farm Name',
  3: 'Timezone',
  4: 'WiFi',
  5: 'LLM Provider',
  6: 'Telegram',
};

const TOTAL_STEPS: StepId[] = [1, 2, 3, 4, 5, 6];

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

let currentStep: StepId = 1;
let wizardData: WizardData = { ...DEFAULT_DATA };
let hasEthernet = false;
let isSubmitting = false;
let networkScanTimeout: ReturnType<typeof setTimeout> | null = null;

export async function renderSetupWizard(container: HTMLElement): Promise<void> {
  injectWizardStyles();

  // Load provisioning status
  let status: ProvisioningStatus;
  try {
    status = await provisioningApi.getStatus();
  } catch {
    container.innerHTML = renderError(
      'Could not connect to FarmPal. Please refresh.',
    );
    return;
  }

  // Check if already provisioned
  if (!status.isUnprovisioned && status.state === 'completed') {
    // Redirect to dashboard
    window.location.hash = '#dashboard';
    window.location.reload();
    return;
  }

  // Load saved wizard session (VAL-IMG-018)
  try {
    const session = await provisioningApi.getWizardSession();
    if (session) {
      wizardData = {
        ...DEFAULT_DATA,
        farmName: session.farmName || 'My Farm',
        timezone: session.timezone || wizardData.timezone,
        wifiConfigured: session.wifiConfigured ?? false,
        llmProvider: session.llmProvider || 'ollama',
        llmEndpoint: session.llmEndpoint || 'http://localhost:11434',
        telegramEnabled: session.telegramEnabled,
        adminPasswordHash: session.adminPasswordHash || '',
      };
    }
  } catch {
    // No saved session, use defaults
  }

  // Detect network
  hasEthernet = status.hasNetworkConnectivity;

  // Begin provisioning if not already
  if (status.state === 'unprovisioned') {
    try {
      await provisioningApi.begin();
    } catch {
      // Ignore
    }
  }

  // Determine starting step
  if (status.wizardStep && status.wizardStep >= 1 && status.wizardStep <= 6) {
    currentStep = status.wizardStep as StepId;
  }

  // Render
  render(container);
}

function render(container: HTMLElement): void {
  // If WiFi is not needed (ethernet), skip it
  const effectiveSteps = hasEthernet ? [1, 2, 3, 5, 6] : TOTAL_STEPS;
  const currentIndex = effectiveSteps.indexOf(currentStep);

  container.innerHTML = `
    <div class="wizard-page">
      <div class="wizard-card">
        <div class="wizard-header">
          <div class="wizard-logo">
            <img src="./ff_logo_svg.svg" alt="FarmPal" />
          </div>
          <h1 class="wizard-title">Welcome to FarmPal</h1>
          <p class="wizard-subtitle">Let's set up your farm controller in a few steps</p>
        </div>

        <div class="wizard-progress">
          <div class="wizard-progress-steps">
            ${effectiveSteps.map((step, idx) => renderProgressStep(step, idx, currentIndex, effectiveSteps)).join('')}
          </div>
          <div class="wizard-progress-bar">
            <div class="wizard-progress-fill" style="width: ${(currentIndex / (effectiveSteps.length - 1)) * 100}%"></div>
          </div>
        </div>

        <div class="wizard-body" id="wizard-body">
          ${renderStepBody(currentStep)}
        </div>

        <div class="wizard-footer">
          ${currentIndex > 0 ? '<button class="wizard-btn wizard-btn-back" id="wizard-back">Back</button>' : '<div></div>'}
          <button class="wizard-btn wizard-btn-next" id="wizard-next" ${isSubmitting ? 'disabled' : ''}>
            ${isSubmitting ? 'Saving...' : currentIndex === effectiveSteps.length - 1 ? 'Complete Setup' : 'Next'}
          </button>
        </div>

        ${currentStep !== 1 ? '<button class="wizard-skip-label" id="wizard-back-to-start">← Start over</button>' : ''}
      </div>
    </div>
  `;

  attachWizardEvents(container, effectiveSteps, currentIndex);
}

function renderProgressStep(
  step: StepId,
  idx: number,
  currentIdx: number,
  effectiveSteps: StepId[],
): string {
  const isComplete = idx < currentIdx;
  const isCurrent = idx === currentIdx;
  const label = hasEthernet && step === 4 ? 'WiFi (skip)' : STEP_LABELS[step];

  return `
    <div class="progress-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}">
      <div class="progress-step-dot">${isComplete ? '✓' : idx + 1}</div>
      <div class="progress-step-label">${label}</div>
    </div>
  `;
}

function renderStepBody(step: StepId): string {
  switch (step) {
    case 1:
      return renderPasswordStep();
    case 2:
      return renderFarmNameStep();
    case 3:
      return renderTimezoneStep();
    case 4:
      return renderWifiStep();
    case 5:
      return renderLlmStep();
    case 6:
      return renderTelegramStep();
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Step 1: Admin Password
// ---------------------------------------------------------------------------
function renderPasswordStep(): string {
  return `
    <div class="wizard-step-content">
      <h2 class="step-title">Create Admin Password</h2>
      <p class="step-desc">This password protects your FarmPal settings. Keep it safe — it cannot be recovered.</p>

      <div class="form-group">
        <label class="form-label" for="password">Admin Password</label>
        <div class="input-wrapper">
          <input
            type="password"
            id="password"
            class="form-input"
            placeholder="Minimum 8 characters"
            value="${escapeHtml(wizardData.adminPassword)}"
            minlength="8"
            autocomplete="new-password"
          />
          <button type="button" class="input-toggle" id="toggle-password" aria-label="Show password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="form-hint" id="password-hint"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="password-confirm">Confirm Password</label>
        <div class="input-wrapper">
          <input
            type="password"
            id="password-confirm"
            class="form-input"
            placeholder="Repeat password"
            minlength="8"
            autocomplete="new-password"
          />
          <button type="button" class="input-toggle" id="toggle-password-confirm" aria-label="Show password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="form-hint" id="password-confirm-hint"></div>
      </div>

      <div class="form-group">
        <div class="password-strength" id="password-strength">
          <div class="strength-bars">
            <div class="strength-bar" data-index="0"></div>
            <div class="strength-bar" data-index="1"></div>
            <div class="strength-bar" data-index="2"></div>
            <div class="strength-bar" data-index="3"></div>
          </div>
          <span class="strength-label" id="strength-label">Enter a password</span>
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Step 2: Farm Name
// ---------------------------------------------------------------------------
function renderFarmNameStep(): string {
  return `
    <div class="wizard-step-content">
      <h2 class="step-title">Name Your Farm</h2>
      <p class="step-desc">Give your farm a name. This appears in the dashboard header and notifications.</p>

      <div class="form-group">
        <label class="form-label" for="farm-name">Farm Name</label>
        <input
          type="text"
          id="farm-name"
          class="form-input"
          placeholder="My Farm"
          value="${escapeHtml(wizardData.farmName)}"
          maxlength="64"
          autocomplete="off"
        />
        <div class="form-hint">Maximum 64 characters. Leave blank for "My Farm".</div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Step 3: Timezone
// ---------------------------------------------------------------------------
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'US Eastern (New York)' },
  { value: 'America/Chicago', label: 'US Central (Chicago)' },
  { value: 'America/Denver', label: 'US Mountain (Denver)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (Los Angeles)' },
  { value: 'America/Phoenix', label: 'US Arizona (Phoenix)' },
  { value: 'America/Anchorage', label: 'US Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'US Hawaii (Honolulu)' },
  { value: 'Europe/London', label: 'UK (London)' },
  { value: 'Europe/Paris', label: 'France (Paris)' },
  { value: 'Europe/Berlin', label: 'Germany (Berlin)' },
  { value: 'Europe/Amsterdam', label: 'Netherlands (Amsterdam)' },
  { value: 'Europe/Stockholm', label: 'Sweden (Stockholm)' },
  { value: 'Europe/Madrid', label: 'Spain (Madrid)' },
  { value: 'Europe/Rome', label: 'Italy (Rome)' },
  { value: 'Asia/Dubai', label: 'UAE (Dubai)' },
  { value: 'Asia/Kolkata', label: 'India (Kolkata)' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Shanghai', label: 'China (Shanghai)' },
  { value: 'Asia/Tokyo', label: 'Japan (Tokyo)' },
  { value: 'Australia/Sydney', label: 'Australia (Sydney)' },
  { value: 'Australia/Perth', label: 'Australia (Perth)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (Auckland)' },
];

function renderTimezoneStep(): string {
  const currentTz =
    wizardData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentRegion = currentTz.split('/')[0] || '';

  const regionGroups: Record<string, typeof COMMON_TIMEZONES> = {};
  for (const tz of COMMON_TIMEZONES) {
    const region = tz.value.split('/')[0];
    if (!regionGroups[region]) regionGroups[region] = [];
    regionGroups[region].push(tz);
  }

  const regionOptions = Object.keys(regionGroups)
    .sort()
    .map(
      (region) => `
      <optgroup label="${region}">
        ${regionGroups[region]
          .map(
            (tz) => `
          <option value="${tz.value}" ${tz.value === currentTz ? 'selected' : ''}>
            ${tz.label}
          </option>
        `,
          )
          .join('')}
      </optgroup>
    `,
    )
    .join('');

  return `
    <div class="wizard-step-content">
      <h2 class="step-title">Set Your Timezone</h2>
      <p class="step-desc">FarmPal uses this timezone for scheduling and decision logs.</p>

      <div class="form-group">
        <label class="form-label" for="timezone">Timezone</label>
        <select id="timezone" class="form-select">
          ${regionOptions}
        </select>
        <div class="form-hint">Detected: <strong id="detected-timezone">${escapeHtml(currentTz)}</strong></div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Step 4: WiFi
// ---------------------------------------------------------------------------
let wifiNetworks: Array<{ ssid: string; signal?: number }> = [];
let wifiScanTimeout: ReturnType<typeof setTimeout> | null = null;

function renderWifiStep(): string {
  return `
    <div class="wizard-step-content">
      <h2 class="step-title">WiFi Connection</h2>
      <p class="step-desc">Connect FarmPal to your network. Ethernet is recommended if available.</p>

      <div class="form-group">
        <label class="form-label" for="wifi-ssid">Network (SSID)</label>
        <input
          type="text"
          id="wifi-ssid"
          class="form-input"
          placeholder="Enter network name or select below"
          value="${escapeHtml(wizardData.wifiSsid)}"
          maxlength="32"
          autocomplete="off"
          list="wifi-networks-list"
        />
        <datalist id="wifi-networks-list">
          ${wifiNetworks.map((n) => `<option value="${escapeHtml(n.ssid)}">`).join('')}
        </datalist>
      </div>

      <div class="form-group">
        <label class="form-label" for="wifi-password">Password</label>
        <div class="input-wrapper">
          <input
            type="password"
            id="wifi-password"
            class="form-input"
            placeholder="Network password"
            autocomplete="off"
          />
          <button type="button" class="input-toggle" id="toggle-wifi-password" aria-label="Show password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>

      <div class="wifi-status" id="wifi-status"></div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Step 5: LLM Provider
// ---------------------------------------------------------------------------
const LLM_PROVIDERS = [
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    defaultEndpoint: 'http://localhost:11434',
    supportsModel: true,
  },
  { id: 'openai', name: 'OpenAI', supportsApiKey: true },
  { id: 'anthropic', name: 'Anthropic', supportsApiKey: true },
  { id: 'zai', name: 'ZAI', supportsApiKey: true },
  { id: 'minimax', name: 'MiniMax', supportsApiKey: true },
  {
    id: 'lmstudio',
    name: 'LM Studio (Local)',
    defaultEndpoint: 'http://localhost:1234',
    supportsModel: true,
  },
];

function renderLlmStep(): string {
  const selectedProvider =
    LLM_PROVIDERS.find((p) => p.id === wizardData.llmProvider) ||
    LLM_PROVIDERS[0];
  const showApiKey =
    selectedProvider &&
    'supportsApiKey' in selectedProvider &&
    selectedProvider.supportsApiKey;
  const showEndpoint =
    selectedProvider && 'defaultEndpoint' in selectedProvider;
  const showModel =
    selectedProvider &&
    'supportsModel' in selectedProvider &&
    selectedProvider.supportsModel;

  return `
    <div class="wizard-step-content">
      <h2 class="step-title">AI Provider</h2>
      <p class="step-desc">Choose how FarmPal connects to its AI brain. Local options run entirely on your network.</p>

      <div class="form-group">
        <label class="form-label">Provider</label>
        <div class="provider-grid">
          ${LLM_PROVIDERS.map(
            (p) => `
            <button type="button" class="provider-card ${p.id === wizardData.llmProvider ? 'selected' : ''}" data-provider="${p.id}">
              <div class="provider-name">${p.name}</div>
            </button>
          `,
          ).join('')}
        </div>
      </div>

      ${
        showEndpoint
          ? `
      <div class="form-group">
        <label class="form-label" for="llm-endpoint">Endpoint URL</label>
        <input
          type="url"
          id="llm-endpoint"
          class="form-input"
          placeholder="http://localhost:11434"
          value="${escapeHtml(wizardData.llmEndpoint)}"
        />
        <div class="form-hint">${wizardData.llmProvider === 'ollama' ? 'Ollama must be running on your device.' : 'LM Studio server address.'}</div>
      </div>
      `
          : ''
      }

      ${
        showApiKey
          ? `
      <div class="form-group">
        <label class="form-label" for="llm-api-key">API Key</label>
        <div class="input-wrapper">
          <input
            type="password"
            id="llm-api-key"
            class="form-input"
            placeholder="sk-..."
            value="${escapeHtml(wizardData.llmApiKey)}"
            autocomplete="off"
          />
          <button type="button" class="input-toggle" id="toggle-api-key" aria-label="Show API key">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="form-hint">Your API key is stored securely in .env and never sent to our servers.</div>
      </div>
      `
          : ''
      }

      ${
        showModel
          ? `
      <div class="form-group">
        <label class="form-label" for="llm-model">Model</label>
        <input
          type="text"
          id="llm-model"
          class="form-input"
          placeholder="${wizardData.llmProvider === 'ollama' ? 'llama3.2, mistral, etc.' : 'e.g., llama3.2'}"
          value="${escapeHtml(wizardData.llmModel)}"
          autocomplete="off"
        />
        <div class="form-hint">Must match an installed model in your Ollama/LM Studio.</div>
      </div>
      `
          : ''
      }
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Step 6: Telegram (Optional)
// ---------------------------------------------------------------------------
function renderTelegramStep(): string {
  return `
    <div class="wizard-step-content">
      <h2 class="step-title">Telegram <span class="badge-optional">Optional</span></h2>
      <p class="step-desc">Connect Telegram to receive alerts and control FarmPal from your phone.</p>

      <div class="form-group">
        <div class="toggle-row">
          <div>
            <div class="toggle-label">Enable Telegram</div>
            <div class="toggle-desc">Receive notifications and commands via Telegram bot</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="telegram-enabled" ${wizardData.telegramEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="form-group telegram-fields ${wizardData.telegramEnabled ? '' : 'hidden'}">
        <label class="form-label" for="telegram-token">Bot Token</label>
        <div class="input-wrapper">
          <input
            type="password"
            id="telegram-token"
            class="form-input"
            placeholder="123456789:ABCdefGHI..."
            value="${escapeHtml(wizardData.telegramBotToken)}"
            autocomplete="off"
          />
          <button type="button" class="input-toggle" id="toggle-telegram-token" aria-label="Show token">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="form-hint">Create a bot via <strong>@BotFather</strong> in Telegram to get your token.</div>
      </div>

      <div class="skip-note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Telegram can be configured later in Settings.
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------
function renderError(message: string): string {
  return `
    <div class="wizard-page">
      <div class="wizard-card wizard-error">
        <div class="error-icon">⚠</div>
        <h2>Setup Error</h2>
        <p>${escapeHtml(message)}</p>
        <button class="wizard-btn wizard-btn-next" onclick="location.reload()">Refresh</button>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Event Handling
// ---------------------------------------------------------------------------
function attachWizardEvents(
  container: HTMLElement,
  effectiveSteps: StepId[],
  currentIndex: number,
): void {
  // Password visibility toggles
  setupPasswordToggle('toggle-password', 'password');
  setupPasswordToggle('toggle-password-confirm', 'password-confirm');
  setupPasswordToggle('toggle-wifi-password', 'wifi-password');
  setupPasswordToggle('toggle-api-key', 'llm-api-key');
  setupPasswordToggle('toggle-telegram-token', 'telegram-token');

  // Password strength meter
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const passwordConfirm = document.getElementById(
    'password-confirm',
  ) as HTMLInputElement;
  if (passwordInput) {
    passwordInput.addEventListener('input', () =>
      updatePasswordStrength(passwordInput.value),
    );
    passwordInput.addEventListener('blur', () => validatePasswordStep());
  }
  if (passwordConfirm) {
    passwordConfirm.addEventListener('blur', () => validatePasswordStep());
  }

  // Provider selection
  document
    .querySelectorAll<HTMLButtonElement>('.provider-card')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const provider = btn.dataset.provider!;
        wizardData.llmProvider = provider;
        const p = LLM_PROVIDERS.find((x) => x.id === provider);
        if (p && 'defaultEndpoint' in p && p.defaultEndpoint) {
          wizardData.llmEndpoint = p.defaultEndpoint;
        }
        // Re-render this step
        const body = document.getElementById('wizard-body');
        if (body) body.innerHTML = renderLlmStep();
        attachWizardEvents(container, effectiveSteps, currentIndex);
      });
    });

  // Telegram toggle
  const telegramToggle = document.getElementById(
    'telegram-enabled',
  ) as HTMLInputElement;
  const telegramFields = document.querySelector('.telegram-fields');
  if (telegramToggle && telegramFields) {
    telegramToggle.addEventListener('change', () => {
      wizardData.telegramEnabled = telegramToggle.checked;
      telegramFields.classList.toggle('hidden', !telegramToggle.checked);
    });
  }

  // Back button
  const backBtn = document.getElementById('wizard-back');
  backBtn?.addEventListener('click', async () => {
    if (currentIndex > 0) {
      await saveCurrentStep(currentStep, effectiveSteps[currentIndex]);
      currentStep = effectiveSteps[currentIndex - 1];
      wizardData = loadStepData(currentStep);
      render(container);
    }
  });

  // Back to start
  const backToStart = document.getElementById('wizard-back-to-start');
  backToStart?.addEventListener('click', async () => {
    currentStep = effectiveSteps[0];
    wizardData = { ...DEFAULT_DATA };
    await provisioningApi.updateWizardStep(1, {});
    render(container);
  });

  // Next / Complete button
  const nextBtn = document.getElementById('wizard-next');
  nextBtn?.addEventListener('click', async () => {
    if (!validateCurrentStep(currentStep)) return;

    isSubmitting = true;
    render(container); // show loading state

    try {
      await saveCurrentStep(currentIndex, currentStep);

      if (currentIndex < effectiveSteps.length - 1) {
        // Advance to next step
        currentStep = effectiveSteps[currentIndex + 1];
        wizardData = loadStepData(currentStep);
        render(container);
      } else {
        // Complete wizard
        await completeWizard(container);
      }
    } catch (err: any) {
      showStepError(currentStep, err.message || 'An error occurred');
      render(container);
    } finally {
      isSubmitting = false;
    }
  });
}

async function saveCurrentStep(
  currentIndex: number,
  step: StepId,
): Promise<void> {
  // Gather data from current step UI
  switch (step) {
    case 1: {
      const pwd =
        (document.getElementById('password') as HTMLInputElement)?.value || '';
      wizardData.adminPassword = pwd;
      if (pwd && !wizardData.adminPasswordHash) {
        wizardData.adminPasswordHash = await bcrypt.hash(pwd, 10);
      }
      break;
    }
    case 2: {
      wizardData.farmName =
        (document.getElementById('farm-name') as HTMLInputElement)?.value ||
        'My Farm';
      break;
    }
    case 3: {
      wizardData.timezone =
        (document.getElementById('timezone') as HTMLSelectElement)?.value ||
        wizardData.timezone;
      break;
    }
    case 4: {
      wizardData.wifiSsid =
        (document.getElementById('wifi-ssid') as HTMLInputElement)?.value || '';
      wizardData.wifiPassword =
        (document.getElementById('wifi-password') as HTMLInputElement)?.value ||
        '';
      wizardData.wifiConfigured = !!wizardData.wifiSsid;
      break;
    }
    case 5: {
      wizardData.llmEndpoint =
        (document.getElementById('llm-endpoint') as HTMLInputElement)?.value ||
        wizardData.llmEndpoint;
      wizardData.llmApiKey =
        (document.getElementById('llm-api-key') as HTMLInputElement)?.value ||
        '';
      wizardData.llmModel =
        (document.getElementById('llm-model') as HTMLInputElement)?.value || '';
      break;
    }
    case 6: {
      wizardData.telegramBotToken =
        (document.getElementById('telegram-token') as HTMLInputElement)
          ?.value || '';
      break;
    }
  }

  // Persist to server
  await provisioningApi.updateWizardStep(step, {
    farmName: wizardData.farmName,
    timezone: wizardData.timezone,
    wifiConfigured: wizardData.wifiConfigured,
    llmProvider: wizardData.llmProvider,
  });
}

function loadStepData(step: StepId): WizardData {
  // Just return current data - values already saved in wizardData
  return wizardData;
}

function validateCurrentStep(step: StepId): boolean {
  switch (step) {
    case 1:
      return validatePasswordStep();
    case 2:
      return true; // farm name always valid
    case 3:
      return true; // timezone always valid
    case 4:
      return true; // wifi optional
    case 5:
      return validateLlmStep();
    case 6:
      return true; // telegram optional
    default:
      return true;
  }
}

function validatePasswordStep(): boolean {
  const pwd =
    (document.getElementById('password') as HTMLInputElement)?.value || '';
  const pwdConfirm =
    (document.getElementById('password-confirm') as HTMLInputElement)?.value ||
    '';
  const hint = document.getElementById('password-hint');
  const confirmHint = document.getElementById('password-confirm-hint');

  if (!pwd) {
    hint!.textContent = 'Admin password is required.';
    hint!.className = 'form-hint text-danger';
    return false;
  }

  if (pwd.length < 8) {
    hint!.textContent = 'Password must be at least 8 characters.';
    hint!.className = 'form-hint text-danger';
    return false;
  }

  if (pwdConfirm && pwd !== pwdConfirm) {
    hint!.textContent = '';
    confirmHint!.textContent = 'Passwords do not match.';
    confirmHint!.className = 'form-hint text-danger';
    return false;
  }

  if (hint) {
    hint!.textContent = '';
    hint!.className = 'form-hint';
  }
  if (confirmHint) {
    confirmHint!.textContent = '';
    confirmHint!.className = 'form-hint';
  }
  return true;
}

function validateLlmStep(): boolean {
  const provider = wizardData.llmProvider;
  const selectedProvider = LLM_PROVIDERS.find((p) => p.id === provider);

  if (
    selectedProvider &&
    'supportsApiKey' in selectedProvider &&
    selectedProvider.supportsApiKey
  ) {
    const apiKey =
      (document.getElementById('llm-api-key') as HTMLInputElement)?.value || '';
    if (!apiKey) {
      showStepError(5, 'API key is required for cloud providers.');
      return false;
    }
  }
  return true;
}

function showStepError(step: StepId, message: string): void {
  // Show error at the top of the wizard body
  const body = document.getElementById('wizard-body');
  if (body) {
    body.innerHTML = `
      <div class="wizard-step-content">
        <div class="step-error">${escapeHtml(message)}</div>
      </div>
    `;
  }
}

async function completeWizard(container: HTMLElement): Promise<void> {
  // Gather final data
  wizardData.farmName =
    (document.getElementById('farm-name') as HTMLInputElement)?.value ||
    'My Farm';
  wizardData.timezone =
    (document.getElementById('timezone') as HTMLSelectElement)?.value ||
    wizardData.timezone;
  wizardData.wifiSsid =
    (document.getElementById('wifi-ssid') as HTMLInputElement)?.value || '';
  wizardData.wifiPassword =
    (document.getElementById('wifi-password') as HTMLInputElement)?.value || '';
  wizardData.llmEndpoint =
    (document.getElementById('llm-endpoint') as HTMLInputElement)?.value ||
    wizardData.llmEndpoint;
  wizardData.llmApiKey =
    (document.getElementById('llm-api-key') as HTMLInputElement)?.value || '';
  wizardData.llmModel =
    (document.getElementById('llm-model') as HTMLInputElement)?.value || '';
  wizardData.telegramBotToken =
    (document.getElementById('telegram-token') as HTMLInputElement)?.value ||
    '';

  // Final password hash if not done
  if (!wizardData.adminPasswordHash) {
    const pwd = (document.getElementById('password') as HTMLInputElement)
      ?.value;
    if (pwd) wizardData.adminPasswordHash = await bcrypt.hash(pwd, 10);
  }

  const completeData: WizardCompleteRequest = {
    farmName: wizardData.farmName || 'My Farm',
    adminPasswordHash: wizardData.adminPasswordHash,
    timezone: wizardData.timezone,
    wifiSsid: wizardData.wifiSsid || undefined,
    wifiPassword: wizardData.wifiPassword || undefined,
    wifiConfigured: wizardData.wifiConfigured,
    llmProvider: wizardData.llmProvider,
    llmEndpoint: wizardData.llmEndpoint,
    llmApiKey: wizardData.llmApiKey,
    llmModel: wizardData.llmModel,
    telegramEnabled: wizardData.telegramEnabled,
    telegramBotToken: wizardData.telegramBotToken,
  };

  try {
    await provisioningApi.complete(completeData);
    // Store operatorId in session for authenticated actions (factory reset, etc.)
    sessionStorage.setItem('operatorId', 'admin');
    // Redirect to dashboard
    window.location.hash = '#dashboard';
    window.location.reload();
  } catch (err: any) {
    showStepError(
      6,
      err.message || 'Setup could not be saved — please try again.',
    );
  }
}

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------
function updatePasswordStrength(pwd: string): void {
  const bars = document.querySelectorAll<HTMLElement>('.strength-bar');
  const label = document.getElementById('strength-label');
  if (!bars.length || !label) return;

  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;

  const labels = ['Too weak', 'Weak', 'Fair', 'Strong'];
  const colors = ['#F85149', '#F85149', '#D29922', '#2EA043'];

  bars.forEach((bar, i) => {
    bar.style.background =
      i < score ? colors[Math.min(score - 1, 3)] : 'var(--border)';
  });

  label.textContent =
    pwd.length === 0
      ? 'Enter a password'
      : labels[Math.min(score - 1, 3)] || 'Too weak';
  label.style.color =
    pwd.length === 0 ? 'var(--text-secondary)' : colors[Math.min(score - 1, 3)];
}

// ---------------------------------------------------------------------------
// Password toggle
// ---------------------------------------------------------------------------
function setupPasswordToggle(btnId: string, inputId: string): void {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId) as HTMLInputElement;
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.setAttribute(
      'aria-label',
      isPassword ? 'Hide password' : 'Show password',
    );
  });
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
function injectWizardStyles(): void {
  if (document.getElementById('wizard-styles')) return;
  const style = document.createElement('style');
  style.id = 'wizard-styles';
  style.textContent = `
/* ===== Wizard Page Layout ===== */
.wizard-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--bg-primary);
}

.wizard-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 520px;
  padding: var(--space-8);
  box-shadow: var(--shadow-card-lg);
}

.wizard-card.wizard-error {
  text-align: center;
}

.error-icon {
  font-size: 48px;
  margin-bottom: var(--space-4);
}

/* ===== Header ===== */
.wizard-header {
  text-align: center;
  margin-bottom: var(--space-6);
}

.wizard-logo {
  margin-bottom: var(--space-4);
}

.wizard-logo img {
  width: 56px;
  height: 56px;
}

.wizard-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
}

.wizard-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

/* ===== Progress ===== */
.wizard-progress {
  margin-bottom: var(--space-6);
}

.wizard-progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  position: relative;
}

.wizard-progress-steps::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 20px;
  right: 20px;
  height: 1px;
  background: var(--border);
  z-index: 0;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
  z-index: 1;
}

.progress-step-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-tertiary);
  transition: all var(--transition-base);
}

.progress-step.current .progress-step-dot {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.progress-step.complete .progress-step-dot {
  background: var(--success);
  border-color: var(--success);
  color: white;
}

.progress-step-label {
  font-size: 10px;
  color: var(--text-tertiary);
  white-space: nowrap;
  text-align: center;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-step.current .progress-step-label,
.progress-step.complete .progress-step-label {
  color: var(--text-secondary);
}

.wizard-progress-bar {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.wizard-progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width var(--transition-base);
}

/* ===== Step Body ===== */
.wizard-body {
  min-height: 280px;
}

.wizard-step-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.step-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 var(--space-6);
  line-height: 1.5;
}

.step-error {
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger) 40%, transparent);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  color: var(--danger);
  font-size: 14px;
  margin-bottom: var(--space-4);
}

/* ===== Form Elements ===== */
.form-group {
  margin-bottom: var(--space-5);
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.form-input {
  width: 100%;
  height: 40px;
  padding: 0 var(--space-3);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.form-input::placeholder {
  color: var(--text-tertiary);
}

.form-select {
  width: 100%;
  height: 40px;
  padding: 0 var(--space-3);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: var(--accent);
}

.form-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: var(--space-1);
}

.form-hint.text-danger {
  color: var(--danger);
}

.input-wrapper {
  position: relative;
}

.input-wrapper .form-input {
  padding-right: 40px;
}

.input-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast);
}

.input-toggle:hover {
  color: var(--text-secondary);
}

/* ===== Password Strength ===== */
.password-strength {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.strength-bars {
  display: flex;
  gap: 4px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  transition: background var(--transition-base);
}

.strength-label {
  font-size: 12px;
  color: var(--text-tertiary);
  transition: color var(--transition-base);
}

/* ===== Provider Grid ===== */
.provider-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

.provider-card {
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
}

.provider-card:hover {
  border-color: var(--text-tertiary);
}

.provider-card.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-tertiary));
}

.provider-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

/* ===== Toggle ===== */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.toggle-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.toggle-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all var(--transition-base);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  transition: transform var(--transition-base);
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--accent);
  border-color: var(--accent);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* ===== Telegram ===== */
.badge-optional {
  font-size: 11px;
  font-weight: 500;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
}

.skip-note {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: var(--space-4);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.hidden {
  display: none !important;
}

/* ===== WiFi Status ===== */
.wifi-status {
  font-size: 13px;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  margin-top: var(--space-2);
}

.wifi-status.info {
  background: color-mix(in srgb, var(--info) 10%, transparent);
  color: var(--info);
}

.wifi-status.error {
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  color: var(--danger);
}

.wifi-status.success {
  background: color-mix(in srgb, var(--success) 10%, transparent);
  color: var(--success);
}

/* ===== Footer ===== */
.wizard-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}

.wizard-btn {
  height: 40px;
  padding: 0 var(--space-6);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
}

.wizard-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wizard-btn-back {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.wizard-btn-back:hover:not(:disabled) {
  background: var(--border);
  color: var(--text-primary);
}

.wizard-btn-next {
  background: var(--accent);
  color: white;
}

.wizard-btn-next:hover:not(:disabled) {
  background: var(--accent-bright, var(--accent));
}

.wizard-skip-label {
  display: block;
  margin: var(--space-4) auto 0;
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 12px;
  cursor: pointer;
  padding: var(--space-2);
}

.wizard-skip-label:hover {
  color: var(--text-secondary);
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .wizard-card {
    padding: var(--space-5);
    border-radius: var(--radius-md);
  }

  .wizard-progress-steps {
    gap: 0;
  }

  .progress-step-label {
    display: none;
  }

  .provider-grid {
    grid-template-columns: 1fr;
  }

  .wizard-footer {
    gap: var(--space-3);
  }

  .wizard-btn-back {
    padding: 0 var(--space-4);
  }

  .wizard-btn-next {
    flex: 1;
  }
}
`;
  document.head.appendChild(style);
}
