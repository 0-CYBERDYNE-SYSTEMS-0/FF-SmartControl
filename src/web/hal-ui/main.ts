// FF_SmartControl HAL UI — main.ts
// Entry point, router, state management, data polling

import './tokens.css';
import './reset.css';
import './themes.css';

import { renderSidebar, initSidebar } from './components/Sidebar.js';
import { renderHeader, initHeader } from './components/Header.js';
import { injectCardStyles } from './components/Card.js';
import { injectToggleStyles } from './components/Toggle.js';
import { injectModalStyles } from './components/Modal.js';
import { showToast } from './components/Toast.js';

import {
  renderDashboard,
  refreshDashboardLiveData,
} from './views/Dashboard.js';
import { renderDevices } from './views/Devices.js';
import { renderSensors, refreshSensorsLiveData } from './views/Sensors.js';
import { renderSystemView } from './views/System.js';
import { renderDecisions } from './views/Decisions.js';
import { renderCameras } from './views/Cameras.js';
import { renderTerminalView } from './views/Terminal.js';
import { renderSetupWizard } from './views/SetupWizard.js';
import { renderSafety } from './views/Safety.js';
import { renderCalibration } from './views/Calibration.js';
import { renderSettings } from './views/Settings.js';

import { halApi } from './api.js';
import type { HalState } from './api.js';
import { provisioningApi } from './api-provisioning.js';
import { getStore, setStore, applyTheme, type HalStore } from './store.js';
import type { ThemeName, ViewId, DashboardLayout } from './store.js';

type AsyncViewRenderer = (container: HTMLElement) => Promise<void>;
type AuthSessionResponse = { authenticated: boolean; operatorId?: string };

const views: Record<ViewId, AsyncViewRenderer> = {
  dashboard: renderDashboard,
  devices: renderDevices,
  sensors: renderSensors,
  decisions: renderDecisions,
  cameras: renderCameras,
  safety: renderSafety,
  system: renderSystemView,
  terminal: renderTerminalView,
  calibration: renderCalibration,
  settings: renderSettings,
};

// Uptime tracking
let pageLoadTime = Date.now();

// Check network access mode and show warning if LAN-bound without HTTPS (VAL-SEC-052)
async function checkNetworkWarning(): Promise<void> {
  try {
    const response = await fetch('http://127.0.0.1:3392/api/settings/network');
    if (response.ok) {
      const data = await response.json();
      if (data.lanWithoutHttps) {
        const banner = document.getElementById('lan-warning-banner');
        if (banner) {
          banner.innerHTML = `
            <div class="lan-warning-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Warning: FF_SmartControl is accessible over HTTP on your local network. Enable HTTPS for secure remote access.</span>
              <a href="#settings" class="lan-warning-link">Configure</a>
            </div>
          `;
          // Inject banner styles if not already present
          injectLanWarningStyles();
        }
      }
    }
  } catch {
    // Network settings check failed, ignore
  }
}

function injectLanWarningStyles(): void {
  if (document.getElementById('lan-warning-styles')) return;
  const style = document.createElement('style');
  style.id = 'lan-warning-styles';
  style.textContent = `
    .lan-warning-banner {
      background: color-mix(in srgb, var(--color-warning, #D29922) 15%, var(--bg-primary));
      border-bottom: 1px solid var(--color-warning, #D29922);
      color: var(--color-warning, #D29922);
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
    }
    .lan-warning-banner svg {
      flex-shrink: 0;
    }
    .lan-warning-banner span {
      flex: 1;
    }
    .lan-warning-link {
      color: var(--color-warning, #D29922);
      text-decoration: underline;
      font-weight: 600;
      white-space: nowrap;
    }
    .lan-warning-link:hover {
      opacity: 0.8;
    }
  `;
  document.head.appendChild(style);
}

async function init(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');

  // Inject shared component styles
  injectCardStyles();
  injectToggleStyles();
  injectModalStyles();

  // Check provisioning status first
  let isUnprovisioned = false;
  try {
    const status = await provisioningApi.getStatus();
    isUnprovisioned = status.isUnprovisioned;
  } catch {
    // If we can't reach the API, assume provisioned and let the error show in dashboard
    isUnprovisioned = false;
  }

  if (isUnprovisioned) {
    // Render wizard — full page, no shell
    app.innerHTML = '<div id="view-container"></div>';
    const container = document.getElementById('view-container');
    if (container) {
      await renderSetupWizard(container);
    }
    return;
  }

  const authenticated = await ensureAuthenticated(app);
  if (!authenticated) return;

  // Normal HAL UI shell - use initial view from URL hash
  const initialView = getInitialView();
  setStore({ activeView: initialView });
  const store = getStore();
  applyTheme(store.theme);

  // Set initial hash if not present
  if (!location.hash) {
    history.replaceState(null, '', `#${initialView}`);
  }

  app.innerHTML = `
    <div class="app-layout" id="app-layout">
      ${renderSidebar(initialView, store.sidebarCollapsed)}
      <div class="app-main">
        <div id="lan-warning-banner"></div>
        <div id="hal-header"></div>
        <main class="main-content" id="view-container"></main>
      </div>
    </div>
  `;

  // Check network access mode and show warning if LAN-bound without HTTPS (VAL-SEC-052)
  checkNetworkWarning();

  // Render header with initial view label

  // Render header with initial view label
  const headerEl = document.getElementById('hal-header')!;
  headerEl.innerHTML = renderHeader(store.theme);
  initHeader(
    store.theme,
    handleThemeChange,
    undefined,
    handleLayoutChange,
    handleSettingsClick,
    handleModeChange,
    handleManualTrigger,
    handleReasoningToggle,
  );

  // Init sidebar
  initSidebar(handleViewChange);

  // Listen for hash changes (browser back/forward, direct URL navigation)
  window.addEventListener('hashchange', handleHashChange);

  // Initial data fetch. The first route render below will consume this state,
  // so avoid queueing a second live update before the shell is painted.
  await refreshHALData({ scheduleRender: false });

  // Render initial view
  await render();

  // Prefer the live SSE stream; polling stays as fallback and metadata refresh.
  startLiveDataStream();
  startPolling();

  // Start uptime counter
  startUptimeCounter();
}

async function ensureAuthenticated(app: HTMLElement): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'same-origin',
    });
    if (response.ok) {
      const data = (await response.json()) as AuthSessionResponse;
      if (data.authenticated) return true;
    }
  } catch {
    // Render login below.
  }

  renderLogin(app);
  return false;
}

function renderLogin(app: HTMLElement): void {
  injectLoginStyles();
  app.innerHTML = `
    <main class="login-shell">
      <section class="login-panel" aria-labelledby="login-title">
        <div class="login-brand">
          <img src="./ff_logo_svg.svg" alt="FF_SmartControl" />
          <span>FF_SmartControl HAL</span>
        </div>
        <h1 id="login-title">Operator Sign In</h1>
        <form id="hal-login-form" class="login-form">
          <label>
            <span>Username</span>
            <input name="username" value="admin" autocomplete="username" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" autocomplete="current-password" required autofocus />
          </label>
          <button type="submit">Sign In</button>
          <p id="login-error" class="login-error" role="alert"></p>
        </form>
      </section>
    </main>
  `;

  const form = document.getElementById('hal-login-form') as HTMLFormElement;
  const errorEl = document.getElementById('login-error') as HTMLElement;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    const data = new FormData(form);
    const submit = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (submit) submit.disabled = true;
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: String(data.get('username') || ''),
          password: String(data.get('password') || ''),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Sign in failed');
      }
      history.replaceState(null, '', '#dashboard');
      await init();
    } catch (err: any) {
      errorEl.textContent = err.message || 'Sign in failed';
      if (submit) submit.disabled = false;
    }
  });
}

function injectLoginStyles(): void {
  if (document.getElementById('hal-login-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-login-styles';
  style.textContent = `
    .login-shell {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        linear-gradient(135deg, rgba(35,134,54,0.18), transparent 38%),
        radial-gradient(circle at 82% 18%, rgba(56,139,253,0.18), transparent 28%),
        var(--bg-primary);
    }
    .login-panel {
      width: min(100%, 380px);
      border: 1px solid color-mix(in srgb, var(--accent-bright) 28%, var(--border));
      border-radius: var(--radius-lg);
      background: var(--bg-secondary);
      box-shadow: var(--shadow-card-lg);
      padding: 24px;
    }
    .login-brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .login-brand img {
      width: 26px;
      height: 26px;
    }
    .login-panel h1 {
      margin: 18px 0 20px;
      color: var(--text-primary);
      font-size: 24px;
      line-height: 1.1;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .login-form label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 700;
    }
    .login-form input {
      height: 40px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      color: var(--text-primary);
      padding: 0 12px;
      font: inherit;
    }
    .login-form input:focus {
      outline: 2px solid color-mix(in srgb, var(--accent-bright) 50%, transparent);
      border-color: var(--accent-bright);
    }
    .login-form button {
      height: 40px;
      border: 1px solid var(--accent);
      border-radius: var(--radius-md);
      background: var(--accent);
      color: var(--on-accent);
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
    }
    .login-form button:disabled {
      cursor: wait;
      opacity: 0.7;
    }
    .login-error {
      min-height: 18px;
      color: var(--danger);
      font-size: 12px;
      margin: 0;
    }
  `;
  document.head.appendChild(style);
}

function handleThemeChange(theme: ThemeName): void {
  setStore({ theme });
  applyTheme(theme);
  showToast(`Theme: ${theme}`, 'info', 2000);
}

function handleLayoutChange(layout: DashboardLayout): void {
  setStore({ layout });
  showToast(`Layout: ${layout.toUpperCase()}`, 'info', 2000);
  // Re-render dashboard when layout changes
  render();
}

function handleReasoningToggle(): void {
  // Store already updated by the header control; re-render decision surfaces.
  const view = getStore().activeView;
  if (view === 'decisions' || view === 'dashboard') render();
}

function handleModeChange(mode: string): void {
  showToast(`Automation mode: ${mode}`, 'info', 2000);
  // Refresh data to get updated pending decisions
  refreshHALData();
}

function handleManualTrigger(): void {
  showToast('Decision cycle triggered manually', 'info', 2000);
  // Refresh data after a short delay to see the new decision
  setTimeout(() => refreshHALData(), 1000);
}

function handleSettingsClick(): void {
  // Navigate to settings view
  const newHash = '#settings';
  if (location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
  updateHeaderViewLabel('settings');
  setStore({ activeView: 'settings' });
  render();
}

async function handleViewChange(viewId: ViewId): Promise<void> {
  // Update URL hash for SPA routing
  const newHash = `#${viewId}`;
  if (location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
  // Update sidebar active state
  document.querySelectorAll('.sidebar-item').forEach((item) => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewId);
  });
  // Update header view label reactively
  updateHeaderViewLabel(viewId);
  setStore({ activeView: viewId });
  await render();
}

// Update the header view label when navigation changes
function updateHeaderViewLabel(viewId: ViewId): void {
  const labels: Record<ViewId, string> = {
    dashboard: 'Overview',
    devices: 'Devices',
    sensors: 'Sensors',
    decisions: 'Decisions',
    cameras: 'Cameras',
    safety: 'Safety',
    system: 'System',
    terminal: 'Terminal',
    calibration: 'Calibration',
    settings: 'Settings',
  };
  const labelEl = document.getElementById('header-view-label');
  if (labelEl) {
    labelEl.textContent = labels[viewId] || 'Overview';
  }
}

// Handle hash changes (browser back/forward, direct URL access)
function handleHashChange(): void {
  const hash = location.hash.slice(1) || 'dashboard';
  const validViews: ViewId[] = [
    'dashboard',
    'devices',
    'sensors',
    'decisions',
    'cameras',
    'safety',
    'system',
    'terminal',
    'calibration',
    'settings',
  ];
  const viewId = validViews.includes(hash as ViewId)
    ? (hash as ViewId)
    : 'dashboard';

  // Update sidebar active state
  document.querySelectorAll('.sidebar-item').forEach((item) => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewId);
  });

  // Update header view label
  updateHeaderViewLabel(viewId);

  // Update store and re-render
  setStore({ activeView: viewId });
  render();
}

// Get initial view from URL hash or default to dashboard
function getInitialView(): ViewId {
  const hash = location.hash.slice(1) || 'dashboard';
  const validViews: ViewId[] = [
    'dashboard',
    'devices',
    'sensors',
    'decisions',
    'cameras',
    'safety',
    'system',
    'terminal',
    'calibration',
    'settings',
  ];
  return validViews.includes(hash as ViewId) ? (hash as ViewId) : 'dashboard';
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[ch] || ch,
  );
}

async function render(): Promise<void> {
  if (renderInProgress) {
    renderAgainRequested = true;
    return;
  }

  const store = getStore();
  const container = document.getElementById('view-container');
  if (!container) return;

  const renderer = views[store.activeView];
  if (renderer) {
    renderInProgress = true;
    try {
      await renderer(container);
    } catch (err: any) {
      console.error(`Failed to render ${store.activeView}:`, err);
      container.innerHTML = `
        <div class="hal-card" style="padding:16px">
          <div class="text-sm font-semibold">View failed to load</div>
          <div class="text-xs text-secondary">${escapeHtml(err?.message || 'Unknown render error')}</div>
        </div>
      `;
    } finally {
      renderInProgress = false;
      if (renderAgainRequested) {
        renderAgainRequested = false;
        void render();
      }
    }
  }
}

export async function refreshHALData(
  opts: { scheduleRender?: boolean } = {},
): Promise<void> {
  try {
    const [halState, modeData, pendingData] = await Promise.all([
      halApi.getState(),
      halApi.getAutomationMode().catch(() => ({
        mode: 'AUTONOMOUS',
        color: { bg: '#F85149', text: '#F0F6FC', label: 'AUTO' },
      })),
      halApi.getAutomationPending().catch(() => []),
    ]);
    applyHalState(
      halState,
      {
        automationMode: modeData.mode as HalStore['automationMode'],
        automationModeColor: modeData.color,
        pendingDecisions: pendingData as HalStore['pendingDecisions'],
      },
      opts.scheduleRender ?? true,
    );
  } catch (err: any) {
    console.error('HAL data refresh failed:', err);
  }
}

async function refreshAutomationData(): Promise<void> {
  try {
    const [modeData, pendingData] = await Promise.all([
      halApi.getAutomationMode().catch(() => ({
        mode: getStore().automationMode,
        color: getStore().automationModeColor,
      })),
      halApi.getAutomationPending().catch(() => getStore().pendingDecisions),
    ]);
    setStore({
      automationMode: modeData.mode as HalStore['automationMode'],
      automationModeColor: modeData.color,
      pendingDecisions: pendingData as HalStore['pendingDecisions'],
    });
    scheduleLiveRender();
  } catch (err: any) {
    console.error('HAL automation refresh failed:', err);
  }
}

function applyHalState(
  halState: HalState,
  extra: Partial<HalStore> = {},
  scheduleRender = true,
): void {
  setStore({
    devices: halState.devices,
    sensors: halState.sensorSnapshots,
    cameras: halState.devices.filter((device) => device.type === 'camera'),
    decisions: halState.recentDecisions,
    decisionsToday: countTodayDecisions(halState.recentDecisions),
    ...extra,
  });
  if (scheduleRender) scheduleLiveRender();
}

function countTodayDecisions(
  decisions: ReturnType<typeof getStore>['decisions'],
): number {
  const today = new Date().toDateString();
  return decisions.filter((d) => {
    try {
      return new Date(d.timestamp).toDateString() === today;
    } catch {
      return false;
    }
  }).length;
}

let pollInterval: ReturnType<typeof setInterval> | null = null;
let liveStateStream: EventSource | null = null;
let liveStreamActive = false;
let liveRenderQueued = false;
let lastLiveRenderAt = 0;
let renderInProgress = false;
let renderAgainRequested = false;
let liveRefreshInProgress = false;
let liveRefreshAgainRequested = false;

function startLiveDataStream(): void {
  liveStateStream?.close();
  liveStateStream = halApi.openStateStream(
    (halState) => {
      liveStreamActive = true;
      applyHalState(halState);
    },
    () => {
      liveStreamActive = false;
    },
  );
}

function startPolling(): void {
  // Refresh HAL data every 10 seconds when streaming is unavailable.
  // When streaming is active, keep slower automation metadata fresh.
  pollInterval = setInterval(() => {
    if (liveStreamActive) {
      void refreshAutomationData();
    } else {
      void refreshHALData();
      if (
        !liveStateStream ||
        liveStateStream.readyState === EventSource.CLOSED
      ) {
        startLiveDataStream();
      }
    }
  }, 10000);
}

function scheduleLiveRender(): void {
  const activeView = getStore().activeView;
  if (activeView === 'settings' || activeView === 'terminal') return;
  if (liveRenderQueued) return;

  const now = Date.now();
  const delay = Math.max(0, 3000 - (now - lastLiveRenderAt));
  liveRenderQueued = true;
  window.setTimeout(() => {
    liveRenderQueued = false;
    lastLiveRenderAt = Date.now();
    void runLiveRefresh();
  }, delay);
}

async function runLiveRefresh(): Promise<void> {
  if (liveRefreshInProgress) {
    liveRefreshAgainRequested = true;
    return;
  }

  liveRefreshInProgress = true;
  try {
    await refreshLiveView();
  } finally {
    liveRefreshInProgress = false;
    if (liveRefreshAgainRequested) {
      liveRefreshAgainRequested = false;
      void runLiveRefresh();
    }
  }
}

async function refreshLiveView(): Promise<void> {
  switch (getStore().activeView) {
    case 'dashboard':
      await refreshDashboardLiveData();
      break;
    case 'sensors':
      await refreshSensorsLiveData();
      break;
    default:
      // Avoid remounting route views on background HAL state pushes. Full view
      // renders reset forms, charts, and scroll position; route changes and
      // explicit actions still render through the normal path.
      break;
  }
}

function startUptimeCounter(): void {
  setInterval(() => {
    const uptime = Math.floor((Date.now() - pageLoadTime) / 1000);
    setStore({ uptime });
    const uptimeEl = document.querySelector<HTMLElement>(
      '[data-dashboard-uptime]',
    );
    if (uptimeEl) uptimeEl.textContent = formatUptime(uptime);
  }, 1000);
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// Boot
document.addEventListener('DOMContentLoaded', init);
