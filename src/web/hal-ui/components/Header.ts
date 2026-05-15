// Header — 48px, theme picker center, clock right, E-Stop button, layout selector, settings gear

import {
  themeDefinitions,
  type ThemeName,
  type DashboardLayout,
  getStore,
} from '../store.js';
import { halApi } from '../api.js';

export function renderHeader(theme: ThemeName): string {
  const themes = Object.entries(themeDefinitions) as [
    ThemeName,
    { accent: string; label: string },
  ][];
  const dots = themes
    .map(
      ([key, def]) => `
    <button
      class="theme-dot ${key === theme ? 'active' : ''}"
      data-theme="${key}"
      aria-label="${def.label}"
      title="${def.label}"
      style="--dot-color:${def.accent}"
    ></button>
  `,
    )
    .join('');

  const currentDef = themeDefinitions[theme];
  const store = getStore();
  const currentLayout = store.layout;

  const layoutButtons = (
    ['calm', 'operator', 'diagnostic'] as DashboardLayout[]
  )
    .map((l) => {
      const labels: Record<DashboardLayout, string> = {
        calm: 'CALM',
        operator: 'OPERATOR',
        diagnostic: 'DIAG',
      };
      return `
      <button
        class="layout-btn ${l === currentLayout ? 'active' : ''}"
        data-layout="${l}"
        aria-label="${labels[l]} mode"
        title="${labels[l]} mode"
      >${labels[l]}</button>
    `;
    })
    .join('');

  return `
    <header class="hal-header">
      <div class="hal-header-left">
        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="hal-header-brand" title="FF_SmartControl">
          <img class="hal-header-brand-logo" src="./ff_logo_svg.svg" alt="FF_SmartControl logo" />
          <span class="hal-header-brand-text hal-header-brand-text-long">FF_SmartControl</span>
          <span class="hal-header-brand-text hal-header-brand-text-short">FF_SmartControl</span>
        </div>
        <span class="hal-header-view-label" id="header-view-label">${getViewLabel()}</span>
      </div>
      <div class="hal-header-center">
        <div class="layout-selector" id="layout-selector" role="group" aria-label="Dashboard layout">
          ${layoutButtons}
        </div>
        <div class="safety-state-indicator" id="safety-state-indicator" title="Safety State">
          <span class="safety-state-dot"></span>
          <span class="safety-state-label" id="safety-state-label">NORMAL</span>
        </div>
        <button class="theme-picker-trigger" id="theme-picker-trigger" aria-label="Theme" style="--dot-color:${currentDef.accent}">
          <span class="theme-picker-trigger-dot"></span>
        </button>
        <div class="theme-picker-popover" id="theme-picker-popover">
          <div class="theme-picker-grid">${dots}</div>
        </div>
        <div class="auto-mode-selector" id="auto-mode-selector">
          <button class="auto-mode-btn" id="auto-mode-btn" aria-label="Automation mode" title="Automation mode">
            <span class="auto-mode-badge" id="auto-mode-badge" style="background:${store.automationModeColor.bg};color:${store.automationModeColor.text}">${store.automationModeColor.label}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="auto-mode-popover" id="auto-mode-popover">
            <div class="auto-mode-header">Automation Mode</div>
            <div class="auto-mode-list">
              <button class="auto-mode-option" data-mode="OBSERVE_ONLY">
                <span class="auto-mode-dot" style="background:#238636"></span>
                <span class="auto-mode-name">OBSERVE</span>
                <span class="auto-mode-desc">No actions, LLM sees data</span>
              </button>
              <button class="auto-mode-option" data-mode="SUGGEST">
                <span class="auto-mode-dot" style="background:#388BFD"></span>
                <span class="auto-mode-name">SUGGEST</span>
                <span class="auto-mode-desc">Recommendations, no execution</span>
              </button>
              <button class="auto-mode-option" data-mode="ASSISTED_CONTROL">
                <span class="auto-mode-dot" style="background:#D29922"></span>
                <span class="auto-mode-name">ASSISTED</span>
                <span class="auto-mode-desc">30s veto window</span>
              </button>
              <button class="auto-mode-option" data-mode="AUTONOMOUS">
                <span class="auto-mode-dot" style="background:#F85149"></span>
                <span class="auto-mode-name">AUTO</span>
                <span class="auto-mode-desc">Executes immediately</span>
              </button>
            </div>
            <div class="auto-mode-divider"></div>
            <button class="auto-mode-trigger" id="auto-mode-trigger-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Run Decision Now
            </button>
          </div>
        </div>
      </div>
      <div class="hal-header-right">
        <button class="settings-btn" id="settings-btn" aria-label="Settings" title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <button class="estop-btn" id="estop-btn" aria-label="Emergency Stop" title="Emergency Stop">
          <span class="estop-btn-inner">ESTOP</span>
        </button>
        <span class="hal-clock text-mono" id="hal-clock">--:--:--</span>
      </div>
    </header>
    <div class="estop-banner" id="estop-banner" style="display:none;">
      <span class="estop-banner-icon">⚠</span>
      <span class="estop-banner-text">EMERGENCY STOP ACTIVE</span>
      <span class="estop-banner-time" id="estop-banner-time"></span>
    </div>
  `;
}

function getViewLabel(): string {
  const labels: Record<string, string> = {
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
  return labels[location.hash.slice(1) || 'dashboard'] || 'Overview';
}

export function initHeader(
  theme: ThemeName,
  onThemeChange: (t: ThemeName) => void,
  onEstopChange?: (active: boolean) => void,
  onLayoutChange?: (layout: DashboardLayout) => void,
  onSettingsClick?: () => void,
  onModeChange?: (mode: string) => void,
  onManualTrigger?: () => void,
): void {
  injectHeaderStyles();
  injectAutoModeStyles();
  startClock();
  setupThemeButtons(onThemeChange);
  setupEstopButton(onEstopChange);
  setupLayoutButtons(onLayoutChange);
  setupSettingsButton(onSettingsClick);
  setupAutoModeSelector(onModeChange, onManualTrigger);
  refreshEstopStatus();
}

// Refresh E-Stop status and safety state periodically
let estopRefreshInterval: ReturnType<typeof setInterval> | null = null;

function refreshEstopStatus(): void {
  if (estopRefreshInterval) clearInterval(estopRefreshInterval);

  estopRefreshInterval = setInterval(async () => {
    try {
      const status = await halApi.getEstopStatus();
      updateEstopUI(status.estop.active, status.estop.activatedAt);
    } catch {
      // Silently ignore - E-Stop status will be stale
    }

    // Also refresh safety state indicator
    try {
      const safetyState = await halApi.getSafetyState();
      updateSafetyStateIndicator(safetyState.safetyState);
    } catch {
      // Silently ignore
    }
  }, 5000);

  // Initial fetch
  halApi
    .getEstopStatus()
    .then((status) => {
      updateEstopUI(status.estop.active, status.estop.activatedAt);
    })
    .catch(() => {});

  // Initial safety state
  halApi
    .getSafetyState()
    .then((safetyState) => {
      updateSafetyStateIndicator(safetyState.safetyState);
    })
    .catch(() => {});
}

function updateSafetyStateIndicator(
  state: 'NORMAL' | 'WARNING' | 'EMERGENCY_STOP_ACTIVE',
): void {
  const indicator = document.getElementById('safety-state-indicator');
  const label = document.getElementById('safety-state-label');
  if (!indicator || !label) return;

  // Remove all state classes
  indicator.classList.remove('normal', 'warning', 'emergency');

  switch (state) {
    case 'NORMAL':
      indicator.classList.add('normal');
      label.textContent = 'NORMAL';
      break;
    case 'WARNING':
      indicator.classList.add('warning');
      label.textContent = 'WARNING';
      break;
    case 'EMERGENCY_STOP_ACTIVE':
      indicator.classList.add('emergency');
      label.textContent = 'E-STOP';
      break;
    default:
      label.textContent = state;
  }
}

function updateEstopUI(active: boolean, activatedAt: string | null): void {
  const banner = document.getElementById('estop-banner');
  const btn = document.getElementById('estop-btn');
  const bannerTime = document.getElementById('estop-banner-time');

  if (active) {
    btn?.classList.add('active');
    if (banner) {
      banner.style.display = 'flex';
      if (activatedAt && bannerTime) {
        const date = new Date(activatedAt);
        bannerTime.textContent = ` since ${date.toLocaleTimeString('en-US', { hour12: false })}`;
      }
    }
  } else {
    btn?.classList.remove('active');
    if (banner) banner.style.display = 'none';
  }
}

async function setupEstopButton(
  onEstopChange?: (active: boolean) => void,
): Promise<void> {
  const btn = document.getElementById('estop-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    try {
      const status = await halApi.getEstopStatus();
      if (status.estop.active) {
        // E-Stop is active - try to clear it (will require auth)
        const operatorId = prompt('Enter operator ID to clear E-Stop:');
        if (!operatorId) return;
        try {
          await halApi.clearEstop(operatorId);
          updateEstopUI(false, null);
          onEstopChange?.(false);
        } catch (err: any) {
          alert(`Failed to clear E-Stop: ${err.message}`);
        }
      } else {
        // Activate E-Stop
        if (
          !confirm(
            'Activate EMERGENCY STOP? This will suspend all autonomous control and set all devices to safe states.',
          )
        )
          return;
        try {
          const result = await halApi.activateEstop('operator');
          if (result.success) {
            updateEstopUI(true, new Date().toISOString());
            onEstopChange?.(true);
            if (result.failures.length > 0) {
              alert(
                `E-Stop activated with warnings:\n${result.failures.join('\n')}`,
              );
            }
          }
        } catch (err: any) {
          alert(`Failed to activate E-Stop: ${err.message}`);
        }
      }
    } catch (err: any) {
      alert(`E-Stop error: ${err.message}`);
    }
  });
}

function setupThemeButtons(onThemeChange: (t: ThemeName) => void): void {
  function activateTheme(key: ThemeName): void {
    document.querySelectorAll('.theme-dot').forEach((dot) => {
      dot.classList.toggle('active', dot.dataset.theme === key);
    });
    const themeTrigger = document.getElementById('theme-picker-trigger');
    themeTrigger?.style.setProperty(
      '--dot-color',
      themeDefinitions[key].accent,
    );
    onThemeChange(key);
  }

  document.querySelectorAll<HTMLButtonElement>('.theme-dot').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.theme as ThemeName;
      activateTheme(key);
      // Close mobile popover if open
      document.getElementById('theme-picker-popover')?.classList.remove('open');
    });
  });

  const themeTrigger = document.getElementById('theme-picker-trigger');
  const themePopover = document.getElementById('theme-picker-popover');

  themeTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    themePopover?.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (
      !themePopover?.contains(e.target as Node) &&
      e.target !== themeTrigger
    ) {
      themePopover?.classList.remove('open');
    }
  });

  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  mobileMenuBtn?.addEventListener('click', () => {
    const sidebar = document.getElementById('hal-sidebar');
    sidebar?.classList.toggle('open');
  });
}

function setupLayoutButtons(
  onLayoutChange?: (layout: DashboardLayout) => void,
): void {
  document.querySelectorAll<HTMLButtonElement>('.layout-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const layout = btn.dataset.layout as DashboardLayout;
      document.querySelectorAll('.layout-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.layout === layout);
      });
      onLayoutChange?.(layout);
    });
  });
}

function setupSettingsButton(onSettingsClick?: () => void): void {
  const btn = document.getElementById('settings-btn');
  btn?.addEventListener('click', () => {
    onSettingsClick?.();
  });
}

function setupAutoModeSelector(
  onModeChange?: (mode: string) => void,
  onManualTrigger?: () => void,
): void {
  const selector = document.getElementById('auto-mode-selector');
  const btn = document.getElementById('auto-mode-btn');
  const popover = document.getElementById('auto-mode-popover');
  const triggerBtn = document.getElementById('auto-mode-trigger-btn');

  if (!selector || !btn || !popover) return;

  // Toggle popover on click
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    popover.classList.toggle('open');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!selector.contains(e.target as Node)) {
      popover.classList.remove('open');
    }
  });

  // Mode selection
  popover
    .querySelectorAll<HTMLButtonElement>('.auto-mode-option')
    .forEach((option) => {
      option.addEventListener('click', async () => {
        const mode = option.dataset.mode;
        if (!mode) return;
        try {
          await halApi.setAutomationMode(mode);
          // Update the badge
          const badge = document.getElementById('auto-mode-badge');
          const modeColors: Record<
            string,
            { bg: string; text: string; label: string }
          > = {
            OBSERVE_ONLY: { bg: '#238636', text: '#F0F6FC', label: 'OBSERVE' },
            SUGGEST: { bg: '#388BFD', text: '#F0F6FC', label: 'SUGGEST' },
            ASSISTED_CONTROL: {
              bg: '#D29922',
              text: '#0D1117',
              label: 'ASSISTED',
            },
            AUTONOMOUS: { bg: '#F85149', text: '#F0F6FC', label: 'AUTO' },
          };
          const colors = modeColors[mode] || modeColors['AUTONOMOUS'];
          if (badge) {
            badge.style.background = colors.bg;
            badge.style.color = colors.text;
            badge.textContent = colors.label;
          }
          popover.classList.remove('open');
          onModeChange?.(mode);
        } catch (err: any) {
          alert(`Failed to set automation mode: ${err.message}`);
        }
      });
    });

  // Manual trigger button
  triggerBtn?.addEventListener('click', async () => {
    try {
      await halApi.triggerDecisionCycle();
      popover.classList.remove('open');
      onManualTrigger?.();
    } catch (err: any) {
      alert(`Failed to trigger decision: ${err.message}`);
    }
  });
}

function startClock(): void {
  function tick(): void {
    const el = document.getElementById('hal-clock');
    if (el) {
      el.textContent = new Date().toLocaleTimeString('en-US', {
        hour12: false,
      });
    }
  }
  tick();
  setInterval(tick, 1000);
}

function injectHeaderStyles(): void {
  if (document.getElementById('hal-header-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-header-styles';
  style.textContent = `
.hal-header {
  height: var(--header-height);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--page-padding);
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}
.hal-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  flex-shrink: 1;
}
.hal-header-brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 2px 8px 2px 2px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-tertiary) 82%, transparent);
}
.hal-header-brand-logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}
.hal-header-brand-text {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  white-space: nowrap;
}
.hal-header-brand-text-short {
  display: none;
}
.hal-header-view-label {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hal-header-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  position: relative;
  gap: var(--space-4);
}

/* Safety State Indicator */
.safety-state-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--bg-tertiary) 82%, transparent);
  border: 1px solid var(--border);
  cursor: default;
  transition: all var(--transition-fast);
}
.safety-state-indicator.normal {
  border-color: var(--success);
  background: color-mix(in srgb, var(--success) 15%, transparent);
}
.safety-state-indicator.warning {
  border-color: var(--warning);
  background: color-mix(in srgb, var(--warning) 15%, transparent);
}
.safety-state-indicator.emergency {
  border-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  animation: safety-pulse 2s ease-in-out infinite;
}
.safety-state-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  flex-shrink: 0;
}
.safety-state-indicator.normal .safety-state-dot {
  background: var(--success);
}
.safety-state-indicator.warning .safety-state-dot {
  background: var(--warning);
}
.safety-state-indicator.emergency .safety-state-dot {
  background: var(--danger);
  animation: safety-dot-pulse 1s ease-in-out infinite;
}
.safety-state-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}
.safety-state-indicator.normal .safety-state-label {
  color: var(--success);
}
.safety-state-indicator.warning .safety-state-label {
  color: var(--warning);
}
.safety-state-indicator.emergency .safety-state-label {
  color: var(--danger);
}
@keyframes safety-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
@keyframes safety-dot-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

/* Desktop theme dots */
.theme-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--dot-color);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.theme-dot:hover {
  transform: scale(1.15);
}
.theme-dot.active {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--dot-color);
}

/* Single trigger theme picker */
.theme-picker-trigger {
  display: inline-flex;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--bg-tertiary);
  cursor: pointer;
  padding: 0;
  align-items: center;
  justify-content: center;
}
.theme-picker-trigger-dot {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--dot-color);
}
.theme-picker-popover {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  box-shadow: var(--shadow-card-lg);
  z-index: 110;
  min-width: 200px;
}
.theme-picker-popover.open {
  display: block;
}
.theme-picker-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}
.theme-picker-grid .theme-dot {
  width: 32px;
  height: 32px;
  justify-self: center;
}

/* Layout Selector */
.layout-selector {
  display: inline-flex;
  align-items: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 2px;
  gap: 2px;
}
.layout-btn {
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.layout-btn:hover {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--bg-secondary) 60%, transparent);
}
.layout-btn.active {
  background: var(--accent);
  color: var(--on-primary);
}

/* Settings Button */
.settings-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.settings-btn:hover {
  color: var(--text-primary);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-tertiary));
}

.hal-header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}
.hal-clock {
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* E-Stop Button */
.estop-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: var(--radius-sm);
  border: 2px solid var(--danger);
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  position: relative;
}
.estop-btn:hover {
  background: color-mix(in srgb, var(--danger) 30%, transparent);
  transform: scale(1.05);
}
.estop-btn:active {
  transform: scale(0.95);
}
.estop-btn.active {
  background: var(--danger);
  animation: estop-pulse 1s ease-in-out infinite;
}
.estop-btn-inner {
  font-size: 9px;
  font-weight: 800;
  color: var(--danger);
  letter-spacing: 0.02em;
  line-height: 1;
}
.estop-btn.active .estop-btn-inner {
  color: var(--on-primary);
}
@keyframes estop-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(248, 81, 73, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(248, 81, 73, 0); }
}

/* E-Stop Banner */
.estop-banner {
  background: var(--danger);
  color: var(--on-primary);
  padding: var(--space-2) var(--page-padding);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.estop-banner-icon {
  font-size: 16px;
}
.estop-banner-text {
  color: var(--on-primary);
}
.estop-banner-time {
  font-size: 11px;
  font-weight: 400;
  opacity: 0.8;
  text-transform: none;
  letter-spacing: 0;
}

@media (max-width: 1560px) {
  .hal-header-brand-text-long {
    display: none;
  }
  .hal-header-brand-text-short {
    display: inline;
  }
}
@media (max-width: 1279px) {
  .hal-header-brand {
    padding-right: 2px;
  }
  .hal-header-brand-text {
    display: none;
  }
  .layout-btn {
    padding: 4px 8px;
    font-size: 10px;
  }
}
@media (max-width: 767px) {
  .hal-header { padding: 0 var(--space-3); }
  .hal-clock { font-size: 11px; }
  .layout-selector {
    display: none;
  }
}
@media (max-width: 480px) {
  .hal-header-view-label {
    max-width: 90px;
  }
  .hal-header-right {
    gap: var(--space-2);
  }
}
`;
  document.head.appendChild(style);
}

function injectAutoModeStyles(): void {
  if (document.getElementById('hal-auto-mode-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-auto-mode-styles';
  style.textContent = `
/* Automation Mode Selector */
.auto-mode-selector {
  position: relative;
}
.auto-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
}
.auto-mode-btn:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-tertiary));
}
.auto-mode-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.auto-mode-popover {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-2);
  box-shadow: var(--shadow-card-lg);
  z-index: 120;
  min-width: 220px;
}
.auto-mode-popover.open {
  display: block;
}
.auto-mode-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 4px 8px 8px;
}
.auto-mode-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.auto-mode-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background var(--transition-fast);
}
.auto-mode-option:hover {
  background: var(--bg-tertiary);
}
.auto-mode-option.selected {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
}
.auto-mode-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.auto-mode-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 56px;
}
.auto-mode-desc {
  font-size: 11px;
  color: var(--text-secondary);
  flex: 1;
}
.auto-mode-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: var(--space-2) 0;
}
.auto-mode-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  padding: 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.auto-mode-trigger:hover {
  background: color-mix(in srgb, var(--accent) 20%, var(--bg-tertiary));
  border-color: var(--accent);
}
@media (max-width: 1023px) {
  .auto-mode-selector {
    display: none;
  }
}
`;
  document.head.appendChild(style);
}
