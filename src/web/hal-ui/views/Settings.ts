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

let settingsData: SettingsData = {
  farmName: 'My Farm',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  llmProvider: 'ollama',
  llmEndpoint: 'http://localhost:11434',
  llmApiKey: '',
  llmModel: '',
};

let isSaving = false;

export async function renderSettings(container: HTMLElement): Promise<void> {
  injectSettingsStyles();
  container.innerHTML = renderLoadingState();

  try {
    // Load LLM settings from halApi (persisted via PUT /api/settings/llm)
    const llmSettings = await halApi.getLlmSettings();
    settingsData.llmProvider = llmSettings.llmProvider || 'ollama';
    settingsData.llmEndpoint = llmSettings.llmEndpoint || 'http://localhost:11434';
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
    showToast('Backup feature coming soon', 'info', 2000);
  });

  // Restore button
  const restoreBtn = document.getElementById('restore-btn');
  restoreBtn?.addEventListener('click', async () => {
    showToast('Restore feature coming soon', 'info', 2000);
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
  if (statusEl) {
    // Placeholder - would come from license API
    statusEl.innerHTML = '<span class="badge badge-slate">Free Tier</span>';
  }
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
`;
  document.head.appendChild(style);
}
