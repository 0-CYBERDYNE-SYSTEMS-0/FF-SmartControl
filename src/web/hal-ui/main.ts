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
import { renderDecisions } from './views/Decisions.js';
import { renderCameras } from './views/Cameras.js';
import { renderTerminalView } from './views/Terminal.js';
import { renderSetupWizard } from './views/SetupWizard.js';
import { renderSafety } from './views/Safety.js';
import { renderCalibration } from './views/Calibration.js';

import { halApi } from './api.js';
import type { HalState } from './api.js';
import { provisioningApi } from './api-provisioning.js';
import { getStore, setStore, applyTheme } from './store.js';
import type { ThemeName, ViewId, DashboardLayout } from './store.js';

type AsyncViewRenderer = (container: HTMLElement) => Promise<void>;

const views: Record<ViewId, AsyncViewRenderer> = {
  dashboard: renderDashboard,
  devices: renderDevices,
  sensors: renderSensors,
  decisions: renderDecisions,
  cameras: renderCameras,
  safety: renderSafety,
  system: renderDashboard,
  terminal: renderTerminalView,
  calibration: renderCalibration,
};

// Uptime tracking
let pageLoadTime = Date.now();

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
        <div id="hal-header"></div>
        <main class="main-content" id="view-container"></main>
      </div>
    </div>
  `;

  // Render header with initial view label
  const headerEl = document.getElementById('hal-header')!;
  headerEl.innerHTML = renderHeader(store.theme);
  initHeader(
    store.theme,
    handleThemeChange,
    undefined,
    handleLayoutChange,
    handleSettingsClick,
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

function handleSettingsClick(): void {
  // For now, show a toast. Later this will navigate to settings view.
  showToast('Settings panel coming soon', 'info', 2000);
}

async function handleViewChange(viewId: ViewId): Promise<void> {
  // Update URL hash for SPA routing
  const newHash = `#${viewId}`;
  if (location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
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
  };
  const labelEl = document.getElementById('header-view-label');
  if (labelEl) {
    labelEl.textContent = labels[viewId] || 'Overview';
  }
}

// Handle hash changes (browser back/forward, direct URL access)
function handleHashChange(): void {
  const hash = location.hash.slice(1) || 'dashboard';
  const validViews: ViewId[] = ['dashboard', 'devices', 'sensors', 'decisions', 'cameras', 'safety', 'system', 'terminal', 'calibration'];
  const viewId = validViews.includes(hash as ViewId) ? hash as ViewId : 'dashboard';
  
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
  const validViews: ViewId[] = ['dashboard', 'devices', 'sensors', 'decisions', 'cameras', 'safety', 'system', 'terminal', 'calibration'];
  return validViews.includes(hash as ViewId) ? hash as ViewId : 'dashboard';
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
    const state: HalState = await halApi.getState();
    setStore({
      devices: state.devices,
      sensors: state.sensorSnapshots,
      cameras: state.devices.filter((device) => device.type === 'camera'),
      decisions: state.recentDecisions,
      decisionsToday: countTodayDecisions(state.recentDecisions),
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
