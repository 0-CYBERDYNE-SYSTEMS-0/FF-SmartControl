// FarmPal HAL UI — main.ts
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

import { renderDashboard } from './views/Dashboard.js';
import { renderDevices } from './views/Devices.js';
import { renderSensors } from './views/Sensors.js';
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
              <span>Warning: FarmPal is accessible over HTTP on your local network. Enable HTTPS for secure remote access.</span>
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
  );

  // Init sidebar
  initSidebar(handleViewChange);

  // Listen for hash changes (browser back/forward, direct URL navigation)
  window.addEventListener('hashchange', handleHashChange);

  // Initial data fetch
  await refreshHALData();

  // Render initial view
  await render();

  // Start polling
  startPolling();

  // Start uptime counter
  startUptimeCounter();
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

async function render(): Promise<void> {
  const store = getStore();
  const container = document.getElementById('view-container');
  if (!container) return;

  const renderer = views[store.activeView];
  if (renderer) {
    await renderer(container);
  }
}

export async function refreshHALData(): Promise<void> {
  try {
    const [halState, modeData, pendingData] = await Promise.all([
      halApi.getState(),
      halApi.getAutomationMode().catch(() => ({
        mode: 'AUTONOMOUS',
        color: { bg: '#F85149', text: '#F0F6FC', label: 'AUTO' },
      })),
      halApi.getAutomationPending().catch(() => []),
    ]);
    setStore({
      devices: halState.devices,
      sensors: halState.sensorSnapshots,
      cameras: halState.devices.filter((device) => device.type === 'camera'),
      decisions: halState.recentDecisions,
      decisionsToday: countTodayDecisions(halState.recentDecisions),
      automationMode: modeData.mode as HalStore['automationMode'],
      automationModeColor: modeData.color,
      pendingDecisions: pendingData as HalStore['pendingDecisions'],
    });
  } catch (err: any) {
    console.error('HAL data refresh failed:', err);
  }
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

function startPolling(): void {
  // Refresh HAL data every 10 seconds
  pollInterval = setInterval(refreshHALData, 10000);
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
