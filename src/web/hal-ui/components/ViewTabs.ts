// ViewTabs — 44px, 5 tabs with active underline in accent color

export type ViewId = 'dashboard' | 'devices' | 'sensors' | 'decisions' | 'cameras';

const tabs: { id: ViewId; label: string }[] = [
  { id: 'dashboard',  label: 'Dashboard' },
  { id: 'devices',    label: 'Devices' },
  { id: 'sensors',    label: 'Sensors' },
  { id: 'decisions',  label: 'Decisions' },
  { id: 'cameras',    label: 'Cameras' },
];

export function renderViewTabs(active: ViewId): string {
  const items = tabs.map(t =>
    `<button class="hal-tab ${t.id === active ? 'active' : ''}" data-view="${t.id}">${t.label}</button>`
  ).join('');
  return `<nav class="hal-tabs" aria-label="Main navigation">${items}</nav>`;
}

export function initViewTabs(onViewChange: (v: ViewId) => void): void {
  injectTabStyles();
  document.querySelectorAll<HTMLButtonElement>('.hal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.hal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      onViewChange(tab.dataset.view as ViewId);
    });
  });
}

export function getTabIds(): ViewId[] {
  return tabs.map(t => t.id);
}

function injectTabStyles(): void {
  if (document.getElementById('hal-tabs-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-tabs-styles';
  style.textContent = `
.hal-tabs {
  height: var(--tabs-height);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: stretch;
  padding: 0 var(--page-padding);
  gap: var(--space-1);
  flex-shrink: 0;
}
.hal-tab {
  position: relative;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 0 var(--space-4);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast);
  display: flex;
  align-items: center;
}
.hal-tab:hover {
  color: var(--text-primary);
}
.hal-tab.active {
  color: var(--accent);
}
.hal-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: var(--space-2);
  right: var(--space-2);
  height: 2px;
  background: var(--accent);
  border-radius: 2px 2px 0 0;
}
`;
  document.head.appendChild(style);
}
