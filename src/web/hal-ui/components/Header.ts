// Header — 48px, mode switcher left, clock right

import type { FarmMode } from '../store.js';

export function renderHeader(mode: FarmMode, onModeChange: (m: FarmMode) => void): string {
  return `
    <header class="hal-header">
      <div class="hal-header-left">
        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <span class="hal-header-view-label" id="header-view-label">${getViewLabel()}</span>
      </div>
      <div class="hal-header-center">
        <button class="hal-mode-badge ${mode === 'CALM' ? 'active' : ''}" data-mode="CALM">CALM</button>
        <button class="hal-mode-badge ${mode === 'OPERATOR' ? 'active' : ''}" data-mode="OPERATOR">OPERATOR</button>
        <button class="hal-mode-badge ${mode === 'DIAGNOSTIC' ? 'active' : ''}" data-mode="DIAGNOSTIC">DIAGNOSTIC</button>
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

export function initHeader(mode: FarmMode, onModeChange: (m: FarmMode) => void): void {
  injectHeaderStyles();
  startClock();
  setupModeButtons(onModeChange);
}

function setupModeButtons(onModeChange: (m: FarmMode) => void): void {
  document.querySelectorAll<HTMLButtonElement>('.hal-mode-badge').forEach(btn => {
    btn.addEventListener('click', () => {
      const newMode = btn.dataset.mode as FarmMode;
      document.querySelectorAll('.hal-mode-badge').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onModeChange(newMode);
    });
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
}
.hal-header-view-label {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}
.hal-header-center {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.hal-mode-badge {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  padding: 3px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.hal-mode-badge.active,
.hal-mode-badge:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, transparent);
}
.hal-header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.hal-clock {
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}
`;
  document.head.appendChild(style);
}
