// Header — 48px, theme picker center, clock right, E-Stop button

import { themeDefinitions, type ThemeName } from '../store.js';
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

  return `
    <header class="hal-header">
      <div class="hal-header-left">
        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="hal-header-brand" title="FarmFriend_Smart_Control">
          <img class="hal-header-brand-logo" src="./ff_logo_svg.svg" alt="FarmFriend_Smart_Control logo" />
          <span class="hal-header-brand-text hal-header-brand-text-long">FarmFriend_Smart_Control</span>
          <span class="hal-header-brand-text hal-header-brand-text-short">FF_Smart_Control</span>
        </div>
        <span class="hal-header-view-label" id="header-view-label">${getViewLabel()}</span>
      </div>
      <div class="hal-header-center">
        <button class="theme-picker-trigger" id="theme-picker-trigger" aria-label="Theme" style="--dot-color:${currentDef.accent}">
          <span class="theme-picker-trigger-dot"></span>
        </button>
        <div class="theme-picker-popover" id="theme-picker-popover">
          <div class="theme-picker-grid">${dots}</div>
        </div>
      </div>
      <div class="hal-header-right">
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
  };
  return labels[location.hash.slice(1) || 'dashboard'] || 'Overview';
}

export function initHeader(
  theme: ThemeName,
  onThemeChange: (t: ThemeName) => void,
  onEstopChange?: (active: boolean) => void,
): void {
  injectHeaderStyles();
  startClock();
  setupThemeButtons(onThemeChange);
  setupEstopButton(onEstopChange);
  refreshEstopStatus();
}

// Refresh E-Stop status periodically
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
  }, 5000);

  // Initial fetch
  halApi
    .getEstopStatus()
    .then((status) => {
      updateEstopUI(status.estop.active, status.estop.activatedAt);
    })
    .catch(() => {});
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
}
@media (max-width: 767px) {
  .hal-header { padding: 0 var(--space-3); }
  .hal-clock { font-size: 11px; }
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
