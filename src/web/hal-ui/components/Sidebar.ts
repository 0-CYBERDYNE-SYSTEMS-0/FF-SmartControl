// Sidebar — collapsible left navigation with icons, active state, section grouping

import type { FarmMode, ViewId } from '../store.js';
import { getStore, setStore } from '../store.js';

const navItems: { id: ViewId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Overview', icon: overviewIcon() },
  { id: 'devices', label: 'Devices', icon: devicesIcon() },
  { id: 'sensors', label: 'Sensors', icon: sensorsIcon() },
  { id: 'decisions', label: 'Decisions', icon: decisionsIcon() },
  { id: 'cameras', label: 'Cameras', icon: camerasIcon() },
  { id: 'system', label: 'System', icon: systemIcon() },
  { id: 'terminal', label: 'Terminal', icon: terminalIcon() },
];

export function renderSidebar(mode: FarmMode, activeView: ViewId, collapsed: boolean): string {
  const items = navItems.map(item => `
    <button
      class="sidebar-item ${item.id === activeView ? 'active' : ''}"
      data-view="${item.id}"
      title="${item.label}"
    >
      <span class="sidebar-icon">${item.icon}</span>
      <span class="sidebar-label">${item.label}</span>
    </button>
  `).join('');

  return `
    <aside class="sidebar ${collapsed ? 'collapsed' : ''}" id="hal-sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2" width="24" height="24" rx="4" fill="var(--accent)" opacity="0.15"/>
            <rect x="6" y="6" width="16" height="16" rx="2" fill="var(--accent)" opacity="0.4"/>
            <rect x="10" y="10" width="8" height="8" rx="1" fill="var(--accent)"/>
          </svg>
          <span class="sidebar-brand">FarmPal</span>
        </div>
        <button class="sidebar-toggle" id="sidebar-toggle" title="Toggle sidebar">
          ${chevronIcon()}
        </button>
      </div>
      <nav class="sidebar-nav" aria-label="Main navigation">
        ${items}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-mode">
          <span class="sidebar-mode-dot" style="background: var(--accent)"></span>
          <span class="sidebar-mode-label">${mode}</span>
        </div>
      </div>
    </aside>
  `;
}

export function initSidebar(onViewChange: (v: ViewId) => void): void {
  injectSidebarStyles();

  document.querySelectorAll<HTMLButtonElement>('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.dataset.view as ViewId;
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      // Close mobile sidebar
      const sidebar = document.getElementById('hal-sidebar');
      sidebar?.classList.remove('open');
      onViewChange(viewId);
    });
  });

  const toggle = document.getElementById('sidebar-toggle');
  toggle?.addEventListener('click', () => {
    const sidebar = document.getElementById('hal-sidebar');
    const collapsed = sidebar?.classList.toggle('collapsed');
    setStore({ sidebarCollapsed: !!collapsed });
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('hal-sidebar');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if (!sidebar || !mobileBtn) return;
    if (window.innerWidth > 767) return;
    if (!sidebar.contains(e.target as Node) && !mobileBtn.contains(e.target as Node)) {
      sidebar.classList.remove('open');
    }
  });
}

function overviewIcon(): string {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`;
}

function devicesIcon(): string {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/><path d="M12 6v6l4 2"/></svg>`;
}

function sensorsIcon(): string {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
}

function decisionsIcon(): string {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
}

function camerasIcon(): string {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
}

function systemIcon(): string {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
}

function terminalIcon(): string {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;
}

function chevronIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
}

function injectSidebarStyles(): void {
  if (document.getElementById('hal-sidebar-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-sidebar-styles';
  style.textContent = `
.sidebar {
  width: 200px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--transition-base);
  overflow: hidden;
}
.sidebar.collapsed {
  width: 64px;
}
.sidebar-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-3);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow: hidden;
}
.sidebar-brand {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  white-space: nowrap;
  transition: opacity var(--transition-fast);
}
.sidebar.collapsed .sidebar-brand {
  opacity: 0;
  width: 0;
}
.sidebar-toggle {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.sidebar-toggle:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.sidebar.collapsed .sidebar-toggle svg {
  transform: rotate(180deg);
}
.sidebar-nav {
  flex: 1;
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition-fast);
  text-align: left;
  white-space: nowrap;
}
.sidebar-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.sidebar-item.active {
  background: color-mix(in srgb, var(--accent) 12%, var(--bg-tertiary));
  color: var(--accent);
  border-left: 3px solid var(--accent);
  margin-left: -3px;
}
.sidebar-item svg {
  flex-shrink: 0;
}
.sidebar-label {
  transition: opacity var(--transition-fast);
}
.sidebar.collapsed .sidebar-label {
  opacity: 0;
  width: 0;
  display: none;
}
.sidebar.collapsed .sidebar-item {
  justify-content: center;
  padding: 10px;
}
.sidebar-footer {
  padding: var(--space-3);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.sidebar-mode {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  text-transform: uppercase;
}
.sidebar-mode-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sidebar.collapsed .sidebar-mode-label {
  display: none;
}
.sidebar.collapsed .sidebar-mode {
  justify-content: center;
}
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform var(--transition-base);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .sidebar.collapsed {
    width: 200px;
  }
  .sidebar.collapsed .sidebar-brand,
  .sidebar.collapsed .sidebar-label,
  .sidebar.collapsed .sidebar-mode-label {
    display: block;
    opacity: 1;
    width: auto;
  }
  .sidebar.collapsed .sidebar-item {
    justify-content: flex-start;
    padding: 10px var(--space-3);
  }
  .sidebar.collapsed .sidebar-toggle svg {
    transform: none;
  }
}
`;
  document.head.appendChild(style);
}
