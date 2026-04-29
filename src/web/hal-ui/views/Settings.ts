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
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Updates
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <div class="settings-row">
                <div>
                  <p class="settings-label">Current Version</p>
                  <p class="settings-value" id="current-version">Loading...</p>
                </div>
                <button class="btn btn-secondary" id="check-updates-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  Check for Updates
                </button>
              </div>
            </div>
            <div class="settings-field" id="update-status-field" style="display:none;">
              <p class="settings-label">Status</p>
              <p class="settings-value" id="update-status">-</p>
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

  // Check updates button
  const checkUpdatesBtn = document.getElementById('check-updates-btn');
  checkUpdatesBtn?.addEventListener('click', async () => {
    checkUpdatesBtn.setAttribute('disabled', '');
    checkUpdatesBtn.textContent = 'Checking...';

    // Simulate update check - in real implementation, this would call an update API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const statusField = document.getElementById('update-status-field');
    const statusText = document.getElementById('update-status');
    if (statusField) statusField.style.display = 'block';
    if (statusText) {
      statusText.innerHTML =
        '<span class="badge badge-slate">No updates available</span>';
    }

    checkUpdatesBtn.textContent = 'Check for Updates';
    checkUpdatesBtn.removeAttribute('disabled');
    showToast('You are running the latest version', 'info', 2000);
  });

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
  const versionEl = document.getElementById('current-version');
  if (versionEl) {
    // Try to get version from package.json or git
    versionEl.textContent = '1.0.0'; // Placeholder - would come from API
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
        badgeClass = 'badge-amber';
        badgeHtml = `<span class="badge ${badgeClass}">EXPIRED</span>`;
        if (status.expiresAt) {
          const expiryDate = new Date(status.expiresAt).toLocaleDateString();
          badgeHtml += ` <span style="color: var(--text-secondary); font-size: 13px;">Expired ${expiryDate}</span>`;
        }
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

    statusEl.innerHTML = badgeHtml;

    if (featuresEl) {
      featuresEl.innerHTML = featuresHtml;
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
