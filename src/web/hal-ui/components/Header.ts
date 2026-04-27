// Header — 48px, theme picker center, clock right

import { themeDefinitions, type ThemeName } from '../store.js';

export function renderHeader(theme: ThemeName): string {
  const themes = Object.entries(themeDefinitions) as [ThemeName, { accent: string; label: string }][];
  const dots = themes.map(([key, def]) => `
    <button
      class="theme-dot ${key === theme ? 'active' : ''}"
      data-theme="${key}"
      aria-label="${def.label}"
      title="${def.label}"
      style="--dot-color:${def.accent}"
    ></button>
  `).join('');

  const currentDef = themeDefinitions[theme];

  return `
    <header class="hal-header">
      <div class="hal-header-left">
        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
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
        <span class="hal-clock text-mono" id="hal-clock">--:--:--</span>
      </div>
    </header>
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

export function initHeader(theme: ThemeName, onThemeChange: (t: ThemeName) => void): void {
  injectHeaderStyles();
  startClock();
  setupThemeButtons(onThemeChange);
}

function setupThemeButtons(onThemeChange: (t: ThemeName) => void): void {
  function activateTheme(key: ThemeName): void {
    document.querySelectorAll('.theme-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.theme === key);
    });
    onThemeChange(key);
  }

  document.querySelectorAll<HTMLButtonElement>('.theme-dot').forEach(btn => {
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
    if (!themePopover?.contains(e.target as Node) && e.target !== themeTrigger) {
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
      el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
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
