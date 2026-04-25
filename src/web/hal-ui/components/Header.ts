// Header — 48px, logo left, mode badge center, theme toggle + clock right

export type FarmMode = 'GROW' | 'HARVEST' | 'MONITOR';

const modeColors: Record<FarmMode, string> = {
  GROW:    'var(--accent-grow)',
  HARVEST: 'var(--accent-harvest)',
  MONITOR: 'var(--accent-monitor)',
};

export function renderHeader(mode: FarmMode, onModeChange: (m: FarmMode) => void): string {
  return `
    <header class="hal-header">
      <div class="hal-header-logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="var(--accent)"/>
          <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z" fill="var(--bg-primary)"/>
          <path d="M12 8v1M12 15v1M8 12H7M17 12h-1" stroke="var(--bg-primary)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="hal-header-brand">FarmPal</span>
        <span class="hal-header-badge">HAL</span>
      </div>
      <div class="hal-header-center">
        <button class="hal-mode-badge ${mode === 'GROW' ? 'active' : ''}" data-mode="GROW" style="--mode-color: var(--accent-grow)">GROW</button>
        <button class="hal-mode-badge ${mode === 'HARVEST' ? 'active' : ''}" data-mode="HARVEST" style="--mode-color: var(--accent-harvest)">HARVEST</button>
        <button class="hal-mode-badge ${mode === 'MONITOR' ? 'active' : ''}" data-mode="MONITOR" style="--mode-color: var(--accent-monitor)">MONITOR</button>
      </div>
      <div class="hal-header-right">
        <span class="hal-clock text-mono" id="hal-clock">--:--:--</span>
      </div>
    </header>
  `;
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
.hal-header-logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.hal-header-brand {
  font-weight: 600;
  font-size: 16px;
  color: var(--text-primary);
}
.hal-header-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: 1px 5px;
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
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.hal-mode-badge.active,
.hal-mode-badge:hover {
  color: var(--mode-color, var(--accent));
  border-color: var(--mode-color, var(--accent));
  background: color-mix(in srgb, var(--mode-color, var(--accent)) 15%, transparent);
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
