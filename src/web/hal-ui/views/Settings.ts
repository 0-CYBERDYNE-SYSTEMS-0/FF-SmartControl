// Settings view — accessible from header gear icon
// Shows: Farm name, Timezone, LLM provider/model, Update check, Backup/restore, License status

import { provisioningApi } from '../api-provisioning.js';
import { halApi } from '../api.js';
import { showToast } from '../components/Toast.js';

// LLM Providers (same as SetupWizard)
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

// Common timezones grouped by region
const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Moscow',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Seoul',
  'Asia/Mumbai',
  'Asia/Dubai',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
  'Pacific/Fiji',
];

interface SettingsData {
  farmName: string;
  timezone: string;
  llmProvider: string;
  llmEndpoint: string;
  llmApiKey: string;
  llmModel: string;
}

interface NetworkData {
  accessMode: 'localhost' | 'lan' | 'remote';
  httpsEnabled: boolean;
  lanWithoutHttps: boolean;
}

let settingsData: SettingsData = {
  farmName: 'My Farm',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  llmProvider: 'ollama',
  llmEndpoint: 'http://localhost:11434',
  llmApiKey: '',
  llmModel: '',
};

let networkData: NetworkData = {
  accessMode: 'localhost',
  httpsEnabled: false,
  lanWithoutHttps: false,
};

let isSaving = false;

export async function renderSettings(container: HTMLElement): Promise<void> {
  injectSettingsStyles();
  container.innerHTML = renderLoadingState();

  try {
    // Load LLM settings from halApi (persisted via PUT /api/settings/llm)
    const llmSettings = await halApi.getLlmSettings();
    settingsData.llmProvider = llmSettings.llmProvider || 'ollama';
    settingsData.llmEndpoint =
      llmSettings.llmEndpoint || 'http://localhost:11434';
    settingsData.llmApiKey = llmSettings.llmApiKey || '';
    settingsData.llmModel = llmSettings.llmModel || '';
  } catch {
    // Fall back to provisioning API for LLM provider
  }

  try {
    // Load farm info from provisioning API
    const status = await provisioningApi.getStatus();
    settingsData.farmName = status.farmName || 'My Farm';
    settingsData.timezone =
      status.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Only clobber llmProvider if halApi failed
    if (!settingsData.llmProvider || settingsData.llmProvider === 'ollama') {
      settingsData.llmProvider = status.llmProvider || 'ollama';
    }
  } catch {
    // Use defaults
  }

  // Load network settings
  try {
    const networkRes = await fetch(
      'http://127.0.0.1:3392/api/settings/network',
    );
    if (networkRes.ok) {
      const net = await networkRes.json();
      networkData.accessMode = net.accessMode || 'localhost';
      networkData.httpsEnabled = net.httpsEnabled || false;
      networkData.lanWithoutHttps = net.lanWithoutHttps || false;
    }
  } catch {
    // Use defaults
  }

  container.innerHTML = renderSettingsPage();
  attachSettingsEvents();
}

function renderLoadingState(): string {
  return `
    <div class="settings-view">
      <div class="settings-loading">Loading settings...</div>
    </div>
  `;
}

function renderSettingsPage(): string {
  const selectedProvider =
    LLM_PROVIDERS.find((p) => p.id === settingsData.llmProvider) ||
    LLM_PROVIDERS[0];
  const showApiKey =
    'supportsApiKey' in selectedProvider && selectedProvider.supportsApiKey;
  const showEndpoint = 'defaultEndpoint' in selectedProvider;

  // Group timezones by region
  const regionGroups: Record<string, string[]> = {};
  for (const tz of COMMON_TIMEZONES) {
    const region = tz.split('/')[0];
    if (!regionGroups[region]) regionGroups[region] = [];
    regionGroups[region].push(tz);
  }

  const currentTz =
    settingsData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return `
    <div class="settings-view">
      <div class="settings-header">
        <h1 class="view-title">Settings</h1>
      </div>

      <div class="settings-sections">
        <!-- Farm Info Section -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            Farm Info
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <label class="settings-label" for="farm-name">Farm Name</label>
              <input
                type="text"
                id="farm-name"
                class="form-input"
                value="${escapeHtml(settingsData.farmName)}"
                maxlength="64"
                placeholder="My Farm"
              />
              <p class="settings-hint">This appears in the dashboard header and notifications.</p>
            </div>
          </div>
        </section>

        <!-- Timezone Section -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Timezone
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <label class="settings-label" for="timezone">Timezone</label>
              <select id="timezone" class="form-select">
                ${Object.entries(regionGroups)
                  .map(
                    ([region, tzs]) => `
                  <optgroup label="${region}">
                    ${tzs
                      .map(
                        (tz) => `
                      <option value="${tz}" ${tz === currentTz ? 'selected' : ''}>${tz}</option>
                    `,
                      )
                      .join('')}
                  </optgroup>
                `,
                  )
                  .join('')}
              </select>
              <p class="settings-hint">Used for scheduling and decision logs.</p>
            </div>
          </div>
        </section>

        <!-- LLM Provider Section -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/><path d="M12 8v4l3 3"/></svg>
            AI / LLM Provider
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <label class="settings-label">Provider</label>
              <div class="provider-grid">
                ${LLM_PROVIDERS.map(
                  (p) => `
                  <button type="button" class="provider-card ${p.id === settingsData.llmProvider ? 'selected' : ''}" data-provider="${p.id}">
                    <div class="provider-name">${p.name}</div>
                  </button>
                `,
                ).join('')}
              </div>
            </div>

            ${
              showEndpoint
                ? `
            <div class="settings-field">
              <label class="settings-label" for="llm-endpoint">Endpoint</label>
              <input
                type="text"
                id="llm-endpoint"
                class="form-input"
                value="${escapeHtml(settingsData.llmEndpoint)}"
                placeholder="http://localhost:11434"
              />
              <p class="settings-hint">${settingsData.llmProvider === 'ollama' ? 'Ollama server address.' : 'LM Studio server address.'}</p>
            </div>
            `
                : ''
            }

            ${
              showApiKey
                ? `
            <div class="settings-field">
              <label class="settings-label" for="llm-api-key">API Key</label>
              <input
                type="password"
                id="llm-api-key"
                class="form-input"
                value="${escapeHtml(settingsData.llmApiKey)}"
                placeholder="sk-..."
                autocomplete="off"
              />
            </div>
            `
                : ''
            }

            <div class="settings-field">
              <label class="settings-label" for="llm-model">Model</label>
              <input
                type="text"
                id="llm-model"
                class="form-input"
                value="${escapeHtml(settingsData.llmModel)}"
                placeholder="${settingsData.llmProvider === 'ollama' ? 'llama3.2, mistral, etc.' : 'e.g., llama3.2'}"
                autocomplete="off"
              />
              <p class="settings-hint">${'supportsModel' in selectedProvider && selectedProvider.supportsModel ? 'Must match an installed model in your Ollama/LM Studio.' : 'Model identifier for the provider.'}</p>
            </div>
          </div>
        </section>

        <!-- Update Section -->
        <!-- Update Section (VAL-UPDT-001 through VAL-UPDT-012, VAL-VERS-001, VAL-VERS-002, VAL-VERS-003) -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Updates
            <span id="update-badge" class="badge badge-green" style="display:none; margin-left:8px;">Update Available</span>
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <div class="settings-row">
                <div>
                  <p class="settings-label">Current Version</p>
                  <p class="settings-value mono-md" id="current-version">Loading...</p>
                </div>
                <button class="btn btn-secondary" id="check-updates-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  Check for Updates
                </button>
              </div>
            </div>

            <!-- Update available section -->
            <div class="settings-field" id="update-available-section" style="display:none;">
              <div class="update-info-card">
                <div class="update-info-header">
                  <div>
                    <p class="settings-label">Available Version</p>
                    <p class="settings-value mono-md" id="available-version">-</p>
                  </div>
                  <span class="badge badge-green" id="update-version-badge"></span>
                </div>
                <div class="settings-field" style="margin-top:12px;">
                  <button class="btn btn-primary" id="install-update-btn" style="width:100%;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Install Update
                  </button>
                </div>
                <details class="changelog-details">
                  <summary class="changelog-summary">What's New</summary>
                  <div class="changelog-content" id="changelog-content"></div>
                </details>
              </div>
            </div>

            <!-- Offline status -->
            <div class="settings-field" id="update-offline-section" style="display:none;">
              <div class="update-offline-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                <span>Offline — updates available when connected</span>
              </div>
            </div>

            <!-- No update available -->
            <div class="settings-field" id="update-no-available-section" style="display:none;">
              <p class="settings-hint" id="update-no-available-text">You are running the latest version.</p>
            </div>

            <!-- Update status message -->
            <div class="settings-field" id="update-last-checked" style="display:none;">
              <p class="settings-hint">Last checked: <span id="last-checked-time">-</span></p>
            </div>

            <!-- Rollback section (VAL-UPDT-011) -->
            <div class="settings-field" id="rollback-section" style="display:none; margin-top:16px;">
              <hr class="settings-divider"/>
              <p class="settings-label" style="margin-top:12px;">Previous Version</p>
              <p class="settings-hint">A previous version snapshot is available. You can rollback if the current version is not working correctly.</p>
              <button class="btn btn-secondary" id="rollback-btn" style="margin-top:8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Rollback to Previous Version
              </button>
            </div>

            <!-- Update history link -->
            <div class="settings-field" style="margin-top:12px;">
              <button class="btn btn-ghost" id="show-update-history-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                View Update History
              </button>
            </div>
          </div>
        </section>

        <!-- Backup Section -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Backup & Restore
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <p class="settings-label">Configuration Backup</p>
              <p class="settings-hint">Download a backup of your FarmPal configuration and settings.</p>
              <div class="settings-actions">
                <button class="btn btn-secondary" id="backup-now-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Backup Now
                </button>
                <button class="btn btn-secondary" id="restore-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Restore
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- License Section -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            License
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <p class="settings-label">License Status</p>
              <p class="settings-value" id="license-status">
                <span class="badge badge-slate">Loading...</span>
              </p>
            </div>
            <div class="settings-field">
              <p class="settings-label">Features</p>
              <ul class="settings-feature-list" id="license-features">
                <li>Local AI control</li>
                <li>Sensor monitoring</li>
                <li>Device automation</li>
              </ul>
            </div>
            <div id="license-section-actions"></div>
          </div>
        </section>

        <!-- Network Section (VAL-SEC-050, VAL-SEC-051, VAL-SEC-052, VAL-SEC-053) -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Network Access
          </h2>
          <div class="settings-card">
            ${
              networkData.lanWithoutHttps
                ? `
            <div class="settings-warning-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Warning: FarmPal is accessible over HTTP on your local network. Enable HTTPS for secure remote access.</span>
            </div>
            `
                : ''
            }
            <div class="settings-field">
              <p class="settings-label">Access Mode</p>
              <div class="access-mode-grid">
                <button type="button" class="access-mode-card ${networkData.accessMode === 'localhost' ? 'selected' : ''}" data-access-mode="localhost">
                  <div class="access-mode-icon">🔒</div>
                  <div class="access-mode-name">Local Only</div>
                  <div class="access-mode-desc">Only accessible from this device (127.0.0.1)</div>
                </button>
                <button type="button" class="access-mode-card ${networkData.accessMode === 'lan' ? 'selected' : ''}" data-access-mode="lan">
                  <div class="access-mode-icon">🌐</div>
                  <div class="access-mode-name">Local Network</div>
                  <div class="access-mode-desc">Accessible from devices on your LAN (0.0.0.0)</div>
                </button>
                <button type="button" class="access-mode-card ${networkData.accessMode === 'remote' ? 'selected' : ''}" data-access-mode="remote" ${!networkData.httpsEnabled ? 'disabled title="HTTPS required for remote access"' : ''}>
                  <div class="access-mode-icon">🌍</div>
                  <div class="access-mode-name">Remote Access</div>
                  <div class="access-mode-desc">Accessible from anywhere (requires HTTPS)</div>
                </button>
              </div>
            </div>
            <div class="settings-field">
              <p class="settings-label">HTTPS Status</p>
              <p class="settings-value">
                ${
                  networkData.httpsEnabled
                    ? '<span class="badge badge-green">Enabled</span>'
                    : '<span class="badge badge-slate">Disabled</span>'
                }
                ${!networkData.httpsEnabled && networkData.accessMode === 'remote' ? '<span class="settings-hint-error"> — HTTPS is required for remote access</span>' : ''}
              </p>
              <p class="settings-hint">HTTPS is required for remote (WAN) access. Local network access works with or without HTTPS.</p>
            </div>
          </div>
        </section>

        <!-- Factory Reset Section -->
        <section class="settings-section">
          <h2 class="settings-section-title factory-reset-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            Factory Reset
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <p class="settings-label">Reset FarmPal</p>
              <p class="settings-hint">Completely reset FarmPal to first-boot state. All data will be permanently deleted including sensor history, device configuration, automation rules, and admin password.</p>
              <div class="settings-actions">
                <button class="btn btn-danger" id="factory-reset-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  Factory Reset
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>

      <!-- Save Button -->
      <div class="settings-footer">
        <button class="btn btn-primary" id="save-settings-btn" ${isSaving ? 'disabled' : ''}>
          ${isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <!-- Version Footer (VAL-VERS-001) -->
      <div class="settings-version-footer" id="settings-version-footer">
        <span class="settings-version-text" id="settings-version-text">FarmPal v1.0.0</span>
      </div>
    </div>
  `;
}

function attachSettingsEvents(): void {
  // Provider selection
  document
    .querySelectorAll<HTMLButtonElement>('.provider-card')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const provider = btn.dataset.provider!;
        settingsData.llmProvider = provider;
        const p = LLM_PROVIDERS.find((x) => x.id === provider);
        if (p && 'defaultEndpoint' in p && p.defaultEndpoint) {
          settingsData.llmEndpoint = p.defaultEndpoint;
        }
        // Re-render provider cards
        document.querySelectorAll('.provider-card').forEach((b) => {
          b.classList.toggle('selected', b.dataset.provider === provider);
        });
        // Update endpoint field if visible
        const endpointField = document.getElementById(
          'llm-endpoint',
        ) as HTMLInputElement;
        if (endpointField) {
          endpointField.value = settingsData.llmEndpoint;
        }
      });
    });

  // Network access mode selection
  document
    .querySelectorAll<HTMLButtonElement>('.access-mode-card')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.accessMode as 'localhost' | 'lan' | 'remote';
        if (!mode) return;

        // Remote access requires HTTPS
        if (mode === 'remote' && !networkData.httpsEnabled) {
          showToast(
            'Enable HTTPS first to allow remote access',
            'warning',
            3000,
          );
          return;
        }

        networkData.accessMode = mode;
        // Update UI
        document.querySelectorAll('.access-mode-card').forEach((b) => {
          b.classList.toggle('selected', b.dataset.accessMode === mode);
        });
      });
    });

  // Save button
  const saveBtn = document.getElementById('save-settings-btn');
  saveBtn?.addEventListener('click', async () => {
    if (isSaving) return;
    isSaving = true;
    saveBtn.textContent = 'Saving...';
    saveBtn.setAttribute('disabled', '');

    try {
      // Gather data from form
      settingsData.farmName =
        (document.getElementById('farm-name') as HTMLInputElement)?.value ||
        'My Farm';
      settingsData.timezone =
        (document.getElementById('timezone') as HTMLSelectElement)?.value ||
        settingsData.timezone;
      settingsData.llmEndpoint =
        (document.getElementById('llm-endpoint') as HTMLInputElement)?.value ||
        settingsData.llmEndpoint;
      settingsData.llmApiKey =
        (document.getElementById('llm-api-key') as HTMLInputElement)?.value ||
        '';
      settingsData.llmModel =
        (document.getElementById('llm-model') as HTMLInputElement)?.value || '';

      // Update wizard step to persist farmName, timezone, llmProvider
      await provisioningApi.updateWizardStep(2, {
        farmName: settingsData.farmName,
        timezone: settingsData.timezone,
        llmProvider: settingsData.llmProvider,
      });

      // Persist LLM settings (VAL-AUTO-040)
      const settingsRes = await fetch(
        'http://127.0.0.1:3392/api/settings/llm',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            llmProvider: settingsData.llmProvider,
            llmEndpoint: settingsData.llmEndpoint,
            llmApiKey: settingsData.llmApiKey,
            llmModel: settingsData.llmModel,
          }),
        },
      );
      if (!settingsRes.ok) {
        throw new Error('Failed to save LLM settings');
      }

      showToast('Settings saved', 'success', 2000);
    } catch (err: any) {
      showToast(
        'Failed to save settings: ' + (err.message || 'Unknown error'),
        'danger',
        3000,
      );
    } finally {
      isSaving = false;
      saveBtn.textContent = 'Save Settings';
      saveBtn.removeAttribute('disabled');
    }
  });

  // Check updates button (VAL-UPDT-001, VAL-UPDT-012)
  const checkUpdatesBtn = document.getElementById('check-updates-btn');
  checkUpdatesBtn?.addEventListener('click', async () => {
    checkUpdatesBtn.setAttribute('disabled', '');
    checkUpdatesBtn.textContent = 'Checking...';

    try {
      const response = await fetch('http://127.0.0.1:3392/api/update/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      // Hide all sections first
      document.getElementById('update-available-section')!.style.display =
        'none';
      document.getElementById('update-offline-section')!.style.display = 'none';
      document.getElementById('update-no-available-section')!.style.display =
        'none';
      document.getElementById('update-badge')!.style.display = 'none';
      document.getElementById('rollback-section')!.style.display = 'none';
      document.getElementById('update-last-checked')!.style.display = 'none';

      // Show last checked time
      const lastCheckedEl = document.getElementById('last-checked-time');
      if (lastCheckedEl && data.lastChecked) {
        const date = new Date(data.lastChecked);
        lastCheckedEl.textContent = date.toLocaleString();
        document.getElementById('update-last-checked')!.style.display = 'block';
      }

      if (data.status === 'offline') {
        // Show offline message (VAL-OFFL-002)
        document.getElementById('update-offline-section')!.style.display =
          'block';
        // Disable install button
        const installBtn = document.getElementById(
          'install-update-btn',
        ) as HTMLButtonElement | null;
        if (installBtn) installBtn.disabled = true;
      } else if (data.status === 'available' || data.status === 'prerelease') {
        // Show available update
        document.getElementById('update-available-section')!.style.display =
          'block';
        document.getElementById('update-badge')!.style.display = 'inline';

        const availableVersionEl = document.getElementById('available-version');
        if (availableVersionEl)
          availableVersionEl.textContent = data.availableVersion || '-';

        const changelogEl = document.getElementById('changelog-content');
        if (changelogEl && data.changelog) {
          changelogEl.innerHTML = formatChangelog(data.changelog);
        }

        const badgeEl = document.getElementById('update-version-badge');
        if (badgeEl) {
          badgeEl.textContent = data.status === 'prerelease' ? 'Beta' : 'New';
        }

        // Enable install button
        const installBtn = document.getElementById(
          'install-update-btn',
        ) as HTMLButtonElement | null;
        if (installBtn) {
          installBtn.disabled = false;
          installBtn.dataset.version = data.availableVersion || '';
          installBtn.dataset.changelog = data.changelog || '';
        }
      } else if (data.status === 'none') {
        // No update available
        document.getElementById('update-no-available-section')!.style.display =
          'block';
        const noUpdateText = document.getElementById(
          'update-no-available-text',
        );
        if (noUpdateText)
          noUpdateText.textContent = 'You are running the latest version.';
      } else if (data.status === 'error') {
        document.getElementById('update-no-available-section')!.style.display =
          'block';
        const noUpdateText = document.getElementById(
          'update-no-available-text',
        );
        if (noUpdateText)
          noUpdateText.textContent =
            data.errorMessage || 'Failed to check for updates.';
      }

      // Show rollback section if available (VAL-UPDT-011)
      if (data.canRollback) {
        document.getElementById('rollback-section')!.style.display = 'block';
      }

      // Update current version display
      const currentVersionEl = document.getElementById('current-version');
      if (currentVersionEl)
        currentVersionEl.textContent = data.currentVersion || 'Unknown';
    } catch (err: any) {
      showToast(
        'Failed to check for updates: ' + (err.message || 'Unknown error'),
        'danger',
        3000,
      );
    } finally {
      checkUpdatesBtn.textContent = 'Check for Updates';
      checkUpdatesBtn.removeAttribute('disabled');
    }
  });

  // Install update button (VAL-UPDT-004, VAL-UPDT-005, VAL-UPDT-006, VAL-UPDT-007)
  const installUpdateBtn = document.getElementById('install-update-btn');
  installUpdateBtn?.addEventListener('click', async () => {
    const version = installUpdateBtn.dataset.version;
    const changelog = installUpdateBtn.dataset.changelog || '';

    // Show confirmation dialog
    if (
      !confirm(
        `Install FarmPal v${version}?\n\nA backup will be created automatically before the update.\n\nThe service will restart after the update.`,
      )
    ) {
      return;
    }

    // Show progress modal
    showUpdateProgressModal(version || 'unknown');

    try {
      const response = await fetch('http://127.0.0.1:3392/api/update/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          release: {
            version,
            changelog,
            downloadUrl: `https://updates.farmpal.io/releases/v${version}/farmpal.tar.gz`,
            checksum: 'mock_checksum_for_testing',
            checksumUrl: `https://updates.farmpal.io/releases/v${version}/SHA256SUMS`,
            releaseDate: new Date().toISOString(),
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        updateProgressModal('Restarting...', 100);
        showToast(
          `FarmPal v${version} installed successfully!`,
          'success',
          5000,
        );
        setTimeout(() => {
          closeUpdateProgressModal();
          // Refresh page to show new version
          window.location.reload();
        }, 3000);
      } else {
        updateProgressModal(
          'Update failed: ' + (result.error || 'Unknown error'),
          -1,
        );
        showToast(
          'Update failed: ' + (result.error || 'Unknown error'),
          'danger',
          5000,
        );
      }
    } catch (err: any) {
      updateProgressModal(
        'Update failed: ' + (err.message || 'Unknown error'),
        -1,
      );
      showToast(
        'Update failed: ' + (err.message || 'Unknown error'),
        'danger',
        5000,
      );
    }
  });

  // Rollback button (VAL-UPDT-011)
  const rollbackBtn = document.getElementById('rollback-btn');
  rollbackBtn?.addEventListener('click', async () => {
    if (
      !confirm(
        'Rollback to the previous version?\n\nThe current version will be replaced and FarmPal will restart.',
      )
    ) {
      return;
    }

    rollbackBtn.setAttribute('disabled', '');

    try {
      const response = await fetch(
        'http://127.0.0.1:3392/api/update/rollback',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const result = await response.json();

      if (result.success) {
        showToast('Rollback initiated. Restarting...', 'success', 3000);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showToast(
          'Rollback failed: ' + (result.error || 'Unknown error'),
          'danger',
          5000,
        );
        rollbackBtn.removeAttribute('disabled');
      }
    } catch (err: any) {
      showToast(
        'Rollback failed: ' + (err.message || 'Unknown error'),
        'danger',
        5000,
      );
      rollbackBtn.removeAttribute('disabled');
    }
  });

  // Show update history button
  const showHistoryBtn = document.getElementById('show-update-history-btn');
  showHistoryBtn?.addEventListener('click', async () => {
    try {
      const response = await fetch('http://127.0.0.1:3392/api/update/history');
      const data = await response.json();

      showUpdateHistoryModal(data.history || []);
    } catch (err: any) {
      showToast('Failed to load update history', 'danger', 3000);
    }
  });

  // Load initial update status
  loadUpdateStatus();

  // Backup button
  const backupBtn = document.getElementById('backup-now-btn');
  backupBtn?.addEventListener('click', async () => {
    backupBtn.setAttribute('disabled', '');
    const originalText = backupBtn.innerHTML;
    backupBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/></svg> Backing up...';

    try {
      const result = await halApi.triggerBackup();
      if (result.ok) {
        showToast(`Backup created: ${result.archive}`, 'success', 4000);
      } else {
        showToast('Backup failed', 'danger', 3000);
      }
    } catch (err: any) {
      showToast(
        'Backup failed: ' + (err.message || 'Unknown error'),
        'danger',
        3000,
      );
    } finally {
      backupBtn.innerHTML = originalText;
      backupBtn.removeAttribute('disabled');
    }
  });

  // Restore button
  const restoreBtn = document.getElementById('restore-btn');
  restoreBtn?.addEventListener('click', async () => {
    showToast('Restore feature coming soon', 'info', 2000);
  });

  // Factory Reset button
  const factoryResetBtn = document.getElementById('factory-reset-btn');
  factoryResetBtn?.addEventListener('click', () => {
    showFactoryResetConfirmDialog();
  });

  // Load version info
  loadVersionInfo();

  // Load license info
  loadLicenseInfo();
}

async function loadVersionInfo(): Promise<void> {
  // Update current version in Updates section
  const versionEl = document.getElementById('current-version');
  // Update version in footer (VAL-VERS-001)
  const versionFooterEl = document.getElementById('settings-version-text');

  try {
    // Fetch version from update status API
    const response = await fetch('http://127.0.0.1:3392/api/update/status');
    const data = await response.json();
    const version = data.currentVersion || 'Unknown';

    if (versionEl) {
      versionEl.textContent = version;
    }
    if (versionFooterEl) {
      versionFooterEl.textContent = `FarmPal v${version}`;
    }
  } catch {
    // Fallback to placeholder
    if (versionEl) {
      versionEl.textContent = 'Unknown';
    }
    if (versionFooterEl) {
      versionFooterEl.textContent = 'FarmPal vUnknown';
    }
  }
}

async function loadLicenseInfo(): Promise<void> {
  const statusEl = document.getElementById('license-status');
  const featuresEl = document.getElementById('license-features');
  const licenseSection = document.getElementById('license-section-actions');

  if (!statusEl) return;

  try {
    const status = await halApi.getLicenseStatus();
    const gates = await halApi.getFeatureGates();

    // Build badge HTML based on status
    let badgeHtml = '';
    let badgeClass = 'badge-slate';
    let featuresHtml = '';
    let bannerHtml = '';

    switch (status.status) {
      case 'LICENSED':
        badgeClass = 'badge-green';
        badgeHtml = `<span class="badge ${badgeClass}">LICENSED</span>`;
        if (status.expiresAt) {
          const expiryDate = new Date(status.expiresAt).toLocaleDateString();
          badgeHtml += ` <span style="color: var(--text-secondary); font-size: 13px;">Expires ${expiryDate}</span>`;
        }
        featuresHtml = `
          <li>✓ Local AI control</li>
          <li>✓ Sensor monitoring</li>
          <li>✓ Device automation</li>
          <li>✓ Cloud features</li>
          <li>✓ Remote access</li>
        `;
        break;

      case 'TRIAL':
        badgeClass = 'badge-blue';
        const daysLeft = status.daysRemaining ?? 0;
        badgeHtml = `<span class="badge ${badgeClass}">TRIAL — ${daysLeft} day${daysLeft === 1 ? '' : 's'}</span>`;
        featuresHtml = `
          <li>✓ Local AI control</li>
          <li>✓ Sensor monitoring</li>
          <li>✓ Device automation</li>
          <li>✓ Cloud features (${daysLeft} days left)</li>
          <li>✓ Remote access (${daysLeft} days left)</li>
        `;
        break;

      case 'EXPIRED':
        badgeClass = 'badge-red';
        badgeHtml = `<span class="badge badge-red">EXPIRED</span>`;
        if (status.expiresAt) {
          const expiryDate = new Date(status.expiresAt).toLocaleDateString();
          badgeHtml += ` <span style="color: var(--text-secondary); font-size: 13px;">Expired ${expiryDate}</span>`;
        }
        // Prominent EXPIRED banner
        bannerHtml = `
          <div class="license-expired-banner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>License Expired</strong>
              <p>Your license has expired. Cloud and remote features are disabled. Activate a license to restore full functionality.</p>
            </div>
          </div>
        `;
        featuresHtml = `
          <li style="color: var(--text-secondary);">✗ Cloud features (license expired)</li>
          <li style="color: var(--text-secondary);">✗ Remote access (license expired)</li>
          <li>✓ Local AI control</li>
          <li>✓ Sensor monitoring</li>
          <li>✓ Device automation</li>
        `;
        break;

      case 'UNLICENSED':
      default:
        badgeClass = 'badge-slate';
        badgeHtml = `<span class="badge ${badgeClass}">UNLICENSED</span>`;
        featuresHtml = `
          <li style="color: var(--text-secondary);">✗ Cloud features</li>
          <li style="color: var(--text-secondary);">✗ Remote access</li>
          <li>✓ Local AI control</li>
          <li>✓ Sensor monitoring</li>
          <li>✓ Device automation</li>
        `;
        break;
    }

    // Show offline cache expiry if running on cached offline license
    if (status.isOffline && status.offlineExpiresAt) {
      const offlineExpiryDate = new Date(
        status.offlineExpiresAt,
      ).toLocaleString();
      bannerHtml += `
        <div class="license-offline-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
          <span>Offline mode — license cache expires ${offlineExpiryDate}</span>
        </div>
      `;
    }

    statusEl.innerHTML = badgeHtml;

    if (featuresEl) {
      featuresEl.innerHTML = featuresHtml;
    }

    // Insert banner(s) before the features element
    if (bannerHtml && featuresEl) {
      featuresEl.insertAdjacentHTML('beforebegin', bannerHtml);
    }

    // Add activate/deactivate button
    if (licenseSection) {
      if (status.status === 'UNLICENSED' || status.status === 'EXPIRED') {
        licenseSection.innerHTML = `
          <button class="btn btn-primary" id="activate-license-btn" style="margin-top: var(--space-3);">
            Activate License
          </button>
        `;
        document
          .getElementById('activate-license-btn')
          ?.addEventListener('click', showLicenseActivationDialog);
      } else if (status.status === 'LICENSED' || status.status === 'TRIAL') {
        licenseSection.innerHTML = `
          <button class="btn btn-danger" id="deactivate-license-btn" style="margin-top: var(--space-3);">
            Deactivate License
          </button>
        `;
        document
          .getElementById('deactivate-license-btn')
          ?.addEventListener('click', showLicenseDeactivationDialog);
      }
    }
  } catch (err) {
    // Show unlicensed state on error
    statusEl.innerHTML = '<span class="badge badge-slate">UNLICENSED</span>';
    if (featuresEl) {
      featuresEl.innerHTML = `
        <li style="color: var(--text-secondary);">✗ Cloud features</li>
        <li style="color: var(--text-secondary);">✗ Remote access</li>
        <li>✓ Local AI control</li>
        <li>✓ Sensor monitoring</li>
        <li>✓ Device automation</li>
      `;
    }
  }
}

// License Activation Dialog (VAL-LIC-011, VAL-LIC-012)
async function showLicenseActivationDialog(): Promise<void> {
  // Get hardware ID first
  let hardwareId = 'Loading...';
  let hardwareIdDisplay = '';
  try {
    const hwInfo = await halApi.getHardwareId();
    hardwareId = hwInfo.hardwareIdDisplay;
    hardwareIdDisplay = hwInfo.hardwareId;
  } catch {
    hardwareId = 'Unknown';
    hardwareIdDisplay = 'unknown';
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-panel license-modal">
      <div class="modal-header">
        <h3 class="modal-title">Activate License</h3>
      </div>
      <div class="modal-body">
        <div class="license-hardware-id">
          <p class="settings-label">Hardware ID</p>
          <p class="license-hw-id-display">${hardwareId}</p>
          <p class="settings-hint">This is your device's unique identifier. License is bound to this hardware.</p>
        </div>
        <div class="settings-field" style="margin-top: var(--space-4);">
          <label class="settings-label" for="license-key-input">License Key</label>
          <input
            type="text"
            id="license-key-input"
            class="form-input"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            maxlength="19"
            autocomplete="off"
            spellcheck="false"
          />
          <p class="settings-hint" id="license-error" style="color: var(--color-danger, #F85149); display: none;"></p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="license-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="license-activate-btn" disabled>Activate</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const inputEl = document.getElementById(
    'license-key-input',
  ) as HTMLInputElement;
  const activateBtn = document.getElementById(
    'license-activate-btn',
  ) as HTMLButtonElement;
  const cancelBtn = document.getElementById(
    'license-cancel-btn',
  ) as HTMLButtonElement;
  const errorEl = document.getElementById(
    'license-error',
  ) as HTMLParagraphElement;

  // Format license key input (add dashes)
  inputEl?.addEventListener('input', () => {
    let value = inputEl.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    // Add dashes
    const parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.slice(i, i + 4));
    }
    inputEl.value = parts.join('-');

    // Enable button if valid format
    if (activateBtn) {
      activateBtn.disabled =
        !/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(
          inputEl.value,
        );
    }
  });

  cancelBtn?.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  activateBtn?.addEventListener('click', async () => {
    const key = inputEl.value.trim();
    if (!key) return;

    activateBtn.setAttribute('disabled', '');
    activateBtn.textContent = 'Activating...';
    errorEl.style.display = 'none';

    try {
      const result = await halApi.activateLicense(key);
      if (result.error) {
        errorEl.textContent = result.error;
        errorEl.style.display = 'block';
        activateBtn.removeAttribute('disabled');
        activateBtn.textContent = 'Activate';
      } else {
        document.body.removeChild(overlay);
        showToast('License activated successfully!', 'success', 3000);
        // Reload license info
        loadLicenseInfo();
      }
    } catch (err: any) {
      errorEl.textContent =
        err.message || 'Activation failed. Please try again.';
      errorEl.style.display = 'block';
      activateBtn.removeAttribute('disabled');
      activateBtn.textContent = 'Activate';
    }
  });

  inputEl?.focus();
}

// License Deactivation Dialog (VAL-LIC-014)
async function showLicenseDeactivationDialog(): Promise<void> {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-panel license-modal">
      <div class="modal-header">
        <h3 class="modal-title">Deactivate License</h3>
      </div>
      <div class="modal-body">
        <p style="color: var(--text-primary); margin: 0 0 var(--space-3) 0;">
          Are you sure you want to deactivate your license? This will:
        </p>
        <ul style="color: var(--text-secondary); margin: 0 0 var(--space-3) 0; padding-left: var(--space-5);">
          <li>Remove the license from this device</li>
          <li>Disable cloud and remote features</li>
          <li>Required to activate on a different device</li>
        </ul>
        <p style="color: var(--text-secondary); font-size: 13px;">
          Your license key can be reused to activate on another device.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="license-cancel-btn">Cancel</button>
        <button class="btn btn-danger" id="license-deactivate-btn">Deactivate</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const deactivateBtn = document.getElementById(
    'license-deactivate-btn',
  ) as HTMLButtonElement;
  const cancelBtn = document.getElementById(
    'license-cancel-btn',
  ) as HTMLButtonElement;

  cancelBtn?.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  deactivateBtn?.addEventListener('click', async () => {
    deactivateBtn.setAttribute('disabled', '');
    deactivateBtn.textContent = 'Deactivating...';

    try {
      await halApi.deactivateLicense();
      document.body.removeChild(overlay);
      showToast('License deactivated', 'success', 3000);
      // Reload license info
      loadLicenseInfo();
    } catch (err: any) {
      showToast(
        'Deactivation failed: ' + (err.message || 'Unknown error'),
        'danger',
        4000,
      );
      deactivateBtn.removeAttribute('disabled');
      deactivateBtn.textContent = 'Deactivate';
    }
  });
}

// Factory Reset confirmation dialog (VAL-SVC-023, VAL-SVC-024)
function showFactoryResetConfirmDialog(): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-panel factory-reset-modal">
      <div class="modal-header">
        <h3 class="modal-title">⚠️ Factory Reset</h3>
      </div>
      <div class="modal-body">
        <p class="reset-warning">This will <strong>permanently delete</strong> all FarmPal data:</p>
        <ul class="reset-list">
          <li>All sensor readings and history</li>
          <li>All device registrations and configuration</li>
          <li>All automation and safety rules</li>
          <li>Your admin password and sessions</li>
          <li>Your .env configuration</li>
        </ul>
        <p class="reset-irreversible">This action <strong>cannot be undone</strong>.</p>
        <div class="reset-confirm-field">
          <label for="reset-confirm-input">Type <strong>FACTORY RESET</strong> to confirm:</label>
          <input type="text" id="reset-confirm-input" class="form-input" placeholder="FACTORY RESET" autocomplete="off">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="reset-cancel-btn">Cancel</button>
        <button class="btn btn-danger" id="reset-confirm-btn" disabled>Reset FarmPal</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const confirmInput = document.getElementById(
    'reset-confirm-input',
  ) as HTMLInputElement;
  const confirmBtn = document.getElementById(
    'reset-confirm-btn',
  ) as HTMLButtonElement;
  const cancelBtn = document.getElementById(
    'reset-cancel-btn',
  ) as HTMLButtonElement;

  // Enable confirm button only when user types "FACTORY RESET"
  confirmInput?.addEventListener('input', () => {
    if (confirmBtn) {
      confirmBtn.disabled =
        confirmInput.value.trim().toUpperCase() !== 'FACTORY RESET';
    }
  });

  // Cancel button closes dialog
  cancelBtn?.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  // Confirm button triggers factory reset
  confirmBtn?.addEventListener('click', async () => {
    if (confirmInput.value.trim().toUpperCase() !== 'FACTORY RESET') {
      return;
    }

    confirmBtn.setAttribute('disabled', '');
    confirmBtn.textContent = 'Resetting...';

    try {
      // Get operator ID from session storage (set during wizard completion)
      const operatorId = sessionStorage.getItem('operatorId') || 'admin';

      const response = await fetch(
        'http://127.0.0.1:3392/api/admin/factory-reset',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operatorId }),
        },
      );

      if (response.ok) {
        showToast('Factory reset initiated. Restarting...', 'success', 3000);
        document.body.removeChild(overlay);
        // Redirect to provisioning after a delay
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        const data = await response.json();
        showToast(
          'Reset failed: ' + (data.error || 'Unknown error'),
          'danger',
          4000,
        );
        confirmBtn.removeAttribute('disabled');
        confirmBtn.textContent = 'Reset FarmPal';
      }
    } catch (err: any) {
      showToast(
        'Reset failed: ' + (err.message || 'Network error'),
        'danger',
        4000,
      );
      confirmBtn.removeAttribute('disabled');
      confirmBtn.textContent = 'Reset FarmPal';
    }
  });

  // Focus the input
  confirmInput?.focus();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function injectSettingsStyles(): void {
  if (document.getElementById('settings-view-styles')) return;
  const style = document.createElement('style');
  style.id = 'settings-view-styles';
  style.textContent = `
.settings-view {
  padding: var(--page-padding);
  max-width: 720px;
  margin: 0 auto;
}
.settings-header {
  margin-bottom: var(--space-lg);
}
.settings-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}
.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.settings-section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.settings-section-title svg {
  color: var(--accent);
}
.settings-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.settings-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.settings-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.settings-value {
  font-size: 14px;
  color: var(--text-secondary);
}
.settings-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
}
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}
.settings-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-2);
}
.settings-footer {
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
}

/* Version Footer (VAL-VERS-001) */
.settings-version-footer {
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: center;
}
.settings-version-text {
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: monospace;
}
.settings-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
  color: var(--text-secondary);
}
.settings-feature-list {
  margin: 0;
  padding-left: var(--space-5);
  color: var(--text-secondary);
  font-size: 13px;
}
.settings-feature-list li {
  margin-bottom: var(--space-1);
}

/* Provider grid (same as SetupWizard) */
.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-3);
}
.provider-card {
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}
.provider-card:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-tertiary));
}
.provider-card.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, var(--bg-tertiary));
  box-shadow: 0 0 0 1px var(--accent);
}
.provider-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Danger button */
.btn-danger {
  background: var(--color-danger, #F85149);
  color: #fff;
  border: none;
}
.btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-danger, #F85149) 85%, white);
}
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Factory reset section */
.factory-reset-title svg {
  color: var(--color-danger, #F85149);
}

/* Factory reset modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  max-width: 480px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
}
.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.modal-body {
  padding: var(--space-4);
}
.modal-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--border);
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}
.reset-warning {
  color: var(--text-primary);
  margin: 0 0 var(--space-3) 0;
}
.reset-warning strong {
  color: var(--color-danger, #F85149);
}
.reset-list {
  margin: 0 0 var(--space-3) 0;
  padding-left: var(--space-5);
  color: var(--text-secondary);
  font-size: 13px;
}
.reset-list li {
  margin-bottom: var(--space-1);
}
.reset-irreversible {
  color: var(--color-danger, #F85149);
  font-weight: 600;
  margin: 0 0 var(--space-4) 0;
}
.reset-confirm-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.reset-confirm-field label {
  font-size: 13px;
  color: var(--text-secondary);
}
.reset-confirm-field strong {
  color: var(--text-primary);
  font-family: monospace;
}

/* Network access mode grid */
.access-mode-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
@media (max-width: 640px) {
  .access-mode-grid {
    grid-template-columns: 1fr;
  }
}
.access-mode-card {
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}
.access-mode-card:hover:not(:disabled) {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-tertiary));
}
.access-mode-card.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, var(--bg-tertiary));
  box-shadow: 0 0 0 1px var(--accent);
}
.access-mode-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.access-mode-icon {
  font-size: 24px;
  margin-bottom: var(--space-2);
}
.access-mode-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}
.access-mode-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.3;
}
.settings-warning-banner {
  background: color-mix(in srgb, var(--color-warning, #D29922) 15%, var(--bg-secondary));
  border: 1px solid var(--color-warning, #D29922);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--color-warning, #D29922);
  font-size: 13px;
}
.settings-warning-banner svg {
  flex-shrink: 0;
  margin-top: 2px;
}
.settings-warning-banner span {
  flex: 1;
}

/* License banners */
.license-expired-banner {
  background: color-mix(in srgb, var(--color-danger, #F85149) 15%, var(--bg-secondary));
  border: 1px solid var(--color-danger, #F85149);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  color: var(--text-primary);
  font-size: 14px;
}
.license-expired-banner svg {
  flex-shrink: 0;
  color: var(--color-danger, #F85149);
  margin-top: 2px;
}
.license-expired-banner strong {
  display: block;
  color: var(--color-danger, #F85149);
  font-size: 15px;
  margin-bottom: var(--space-1);
}
.license-expired-banner p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.license-offline-banner {
  background: color-mix(in srgb, var(--color-info, #388BFD) 15%, var(--bg-secondary));
  border: 1px solid var(--color-info, #388BFD);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: 13px;
}
.license-offline-banner svg {
  flex-shrink: 0;
  color: var(--color-info, #388BFD);
}

.settings-hint-error {
  color: var(--color-danger, #F85149);
  font-size: 12px;
}
.badge-green {
  background: var(--color-success, #2EA043);
  color: #fff;
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
}
.badge-blue {
  background: var(--color-info, #388BFD);
  color: #fff;
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
}
.badge-amber {
  background: var(--color-warning, #D29922);
  color: #fff;
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
}
.badge-red {
  background: var(--color-danger, #F85149);
  color: #fff;
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
}

/* Update system styles (VAL-UPDT-001 through VAL-UPDT-012) */
.update-info-card {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-top: var(--space-2);
}
.update-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.update-offline-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13px;
}
.update-offline-banner svg {
  flex-shrink: 0;
  color: var(--text-tertiary);
}
.changelog-details {
  margin-top: var(--space-3);
}
.changelog-summary {
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 13px;
  user-select: none;
  padding: var(--space-2) 0;
}
.changelog-summary:hover {
  color: var(--text-primary);
}
.changelog-content {
  padding: var(--space-3);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  margin-top: var(--space-2);
}
.changelog-content h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-2) 0;
}
.changelog-content h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: var(--space-3) 0 var(--space-1) 0;
}
.changelog-content li {
  margin-left: var(--space-4);
  margin-bottom: var(--space-1);
}
.settings-divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: var(--space-4) 0;
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.btn-ghost:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* License modal */
.license-hardware-id {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-3);
}
.license-hw-id-display {
  font-family: monospace;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: var(--space-1) 0;
  letter-spacing: 0.05em;
}
`;
  document.head.appendChild(style);
}

// ============================================================
// Update System Helper Functions (VAL-UPDT-001 through VAL-UPDT-012)
// ============================================================

/**
 * Load initial update status on page load
 */
async function loadUpdateStatus(): Promise<void> {
  try {
    const response = await fetch('http://127.0.0.1:3392/api/update/status');
    const data = await response.json();

    // Update current version display
    const currentVersionEl = document.getElementById('current-version');
    if (currentVersionEl)
      currentVersionEl.textContent = data.currentVersion || 'Unknown';

    // Hide all sections first
    document.getElementById('update-available-section')!.style.display = 'none';
    document.getElementById('update-offline-section')!.style.display = 'none';
    document.getElementById('update-no-available-section')!.style.display =
      'none';
    document.getElementById('update-badge')!.style.display = 'none';
    document.getElementById('rollback-section')!.style.display = 'none';

    if (data.status === 'offline') {
      document.getElementById('update-offline-section')!.style.display =
        'block';
      const installBtn = document.getElementById(
        'install-update-btn',
      ) as HTMLButtonElement | null;
      if (installBtn) installBtn.disabled = true;
    } else if (data.status === 'available' || data.status === 'prerelease') {
      document.getElementById('update-available-section')!.style.display =
        'block';
      document.getElementById('update-badge')!.style.display = 'inline';

      const availableVersionEl = document.getElementById('available-version');
      if (availableVersionEl)
        availableVersionEl.textContent = data.availableVersion || '-';

      const changelogEl = document.getElementById('changelog-content');
      if (changelogEl && data.changelog) {
        changelogEl.innerHTML = formatChangelog(data.changelog);
      }

      const badgeEl = document.getElementById('update-version-badge');
      if (badgeEl)
        badgeEl.textContent = data.status === 'prerelease' ? 'Beta' : 'New';

      const installBtn = document.getElementById(
        'install-update-btn',
      ) as HTMLButtonElement | null;
      if (installBtn) {
        installBtn.disabled = false;
        installBtn.dataset.version = data.availableVersion || '';
        installBtn.dataset.changelog = data.changelog || '';
      }
    } else if (data.status === 'none') {
      document.getElementById('update-no-available-section')!.style.display =
        'block';
    }

    // Show rollback section if available
    if (data.canRollback) {
      document.getElementById('rollback-section')!.style.display = 'block';
    }

    // Show last checked time if available
    if (data.lastChecked) {
      const lastCheckedEl = document.getElementById('last-checked-time');
      if (lastCheckedEl) {
        const date = new Date(data.lastChecked);
        lastCheckedEl.textContent = date.toLocaleString();
        document.getElementById('update-last-checked')!.style.display = 'block';
      }
    }
  } catch {
    // Silently fail - user can click "Check for Updates" to retry
  }
}

/**
 * Format changelog markdown to HTML (simplified)
 */
function formatChangelog(changelog: string): string {
  if (!changelog) return '';

  return changelog
    .replace(/^# (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h4>$1</h4>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

/**
 * Show the update progress modal (VAL-UPDT-006)
 */
function showUpdateProgressModal(version: string): void {
  // Remove existing modal if any
  closeUpdateProgressModal();

  const modal = document.createElement('div');
  modal.id = 'update-progress-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-panel" style="max-width:420px;">
      <div class="modal-header">
        <h2>Installing FarmPal v${escapeHtml(version)}</h2>
      </div>
      <div class="modal-body">
        <div class="update-progress-steps">
          <div class="progress-step" id="step-backup">
            <div class="step-icon pending">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <span class="step-label">Backing up...</span>
          </div>
          <div class="progress-step" id="step-download">
            <div class="step-icon pending">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <span class="step-label">Downloading...</span>
          </div>
          <div class="progress-step" id="step-verify">
            <div class="step-icon pending">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <span class="step-label">Verifying...</span>
          </div>
          <div class="progress-step" id="step-install">
            <div class="step-icon pending">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <span class="step-label">Installing...</span>
          </div>
          <div class="progress-step" id="step-restart">
            <div class="step-icon pending">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <span class="step-label">Restarting...</span>
          </div>
          <div class="progress-step" id="step-health">
            <div class="step-icon pending">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <span class="step-label">Health check...</span>
          </div>
        </div>
        <div class="progress-bar-container" id="progress-bar-container">
          <div class="progress-bar" id="update-progress-bar" style="width:0%"></div>
        </div>
        <p class="progress-message" id="progress-message">Preparing update...</p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add modal styles
  const style = document.createElement('style');
  style.textContent = `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .modal-panel {
      background: var(--bg-secondary, #161B22);
      border-radius: 12px;
      border: 1px solid var(--border, #30363D);
      padding: 24px;
      width: 90%;
      max-width: 480px;
    }
    .modal-header h2 {
      margin: 0 0 20px 0;
      font-size: 18px;
      color: var(--text-primary, #F0F6FC);
    }
    .update-progress-steps {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }
    .progress-step {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .step-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .step-icon.pending svg {
      color: var(--text-tertiary, #484F58);
    }
    .step-icon.active svg {
      color: var(--accent, #388BFD);
      animation: pulse 1s infinite;
    }
    .step-icon.complete svg {
      color: var(--color-success, #2EA043);
    }
    .step-icon.failed svg {
      color: var(--color-danger, #F85149);
    }
    .step-label {
      color: var(--text-secondary, #8B949E);
      font-size: 14px;
    }
    .step-label.active {
      color: var(--text-primary, #F0F6FC);
    }
    .step-label.complete {
      color: var(--color-success, #2EA043);
    }
    .step-label.failed {
      color: var(--color-danger, #F85149);
    }
    .progress-bar-container {
      height: 6px;
      background: var(--bg-tertiary, #21262D);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .progress-bar {
      height: 100%;
      background: var(--accent, #388BFD);
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    .progress-message {
      text-align: center;
      color: var(--text-secondary, #8B949E);
      font-size: 13px;
      margin: 0;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Update the progress modal with current step and message
 */
function updateProgressModal(message: string, percent: number): void {
  const messageEl = document.getElementById('progress-message');
  if (messageEl) messageEl.textContent = message;

  const barEl = document.getElementById('update-progress-bar');
  if (barEl) barEl.style.width = percent >= 0 ? `${percent}%` : '0%';

  // Update step icons based on progress
  const steps = [
    'backup',
    'download',
    'verify',
    'install',
    'restart',
    'health',
  ];
  const stepPercent = percent >= 0 ? percent : 0;
  const completedSteps = Math.floor(stepPercent / (100 / steps.length));

  steps.forEach((step, index) => {
    const stepEl = document.getElementById(`step-${step}`);
    if (!stepEl) return;

    const iconEl = stepEl.querySelector('.step-icon') as HTMLElement;
    const labelEl = stepEl.querySelector('.step-label') as HTMLElement;

    if (index < completedSteps) {
      iconEl.className = 'step-icon complete';
      iconEl.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
      labelEl.className = 'step-label complete';
    } else if (index === completedSteps) {
      iconEl.className = 'step-icon active';
      iconEl.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
      labelEl.className = 'step-label active';
    } else {
      iconEl.className = 'step-icon pending';
      iconEl.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
      labelEl.className = 'step-label';
    }
  });

  // If failed, show error state on all remaining steps
  if (percent < 0) {
    steps.forEach((step, index) => {
      if (index >= completedSteps) {
        const stepEl = document.getElementById(`step-${step}`);
        if (!stepEl) return;
        const iconEl = stepEl.querySelector('.step-icon') as HTMLElement;
        const labelEl = stepEl.querySelector('.step-label') as HTMLElement;
        iconEl.className = 'step-icon failed';
        iconEl.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        labelEl.className = 'step-label failed';
      }
    });
  }
}

/**
 * Close the update progress modal
 */
function closeUpdateProgressModal(): void {
  const modal = document.getElementById('update-progress-modal');
  if (modal) modal.remove();
}

/**
 * Show update history modal (VAL-VERS-003)
 */
function showUpdateHistoryModal(
  history: Array<{
    fromVersion: string;
    toVersion: string;
    triggeredBy: string;
    trigger: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    errorMessage?: string;
  }>,
): void {
  // Remove existing modal if any
  const existingModal = document.getElementById('update-history-modal');
  if (existingModal) existingModal.remove();

  const historyRows =
    history.length === 0
      ? '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-tertiary);">No update history yet</td></tr>'
      : history
          .map(
            (entry) => `
        <tr>
          <td class="mono">v${escapeHtml(entry.fromVersion)} → v${escapeHtml(entry.toVersion)}</td>
          <td><span class="badge ${entry.status === 'success' ? 'badge-green' : entry.status === 'rolled_back' ? 'badge-amber' : 'badge-red'}">${entry.status}</span></td>
          <td>${escapeHtml(entry.triggeredBy)}</td>
          <td>${new Date(entry.startedAt).toLocaleDateString()}</td>
        </tr>
      `,
          )
          .join('');

  const modal = document.createElement('div');
  modal.id = 'update-history-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-panel" style="max-width:600px;">
      <div class="modal-header">
        <h2>Update History</h2>
        <button class="modal-close" id="close-history-modal" style="background:none;border:none;color:var(--text-primary);cursor:pointer;font-size:20px;padding:4px;">&times;</button>
      </div>
      <div class="modal-body" style="max-height:400px;overflow-y:auto;">
        <table class="settings-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--border);">
              <th style="text-align:left;padding:8px;">Version</th>
              <th style="text-align:left;padding:8px;">Status</th>
              <th style="text-align:left;padding:8px;">Type</th>
              <th style="text-align:left;padding:8px;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add close handler
  document
    .getElementById('close-history-modal')
    ?.addEventListener('click', () => {
      modal.remove();
    });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}
