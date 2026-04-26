// Card component — bg-secondary, 1px border, radius-md, 16px padding, 3px left border by state

export type CardState = 'online' | 'offline' | 'unknown';

export function cardBorderStyle(state: CardState): string {
  switch (state) {
    case 'online':  return 'var(--accent)';
    case 'offline': return 'var(--danger)';
    default:        return 'var(--slate)';
  }
}

export function renderCard(state: CardState, content: string): string {
  return `<div class="hal-card" style="border-left: 3px solid ${cardBorderStyle(state)}">${content}</div>`;
}

// Inject card styles once
export function injectCardStyles(): void {
  if (document.getElementById('hal-card-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-card-styles';
  style.textContent = `
.hal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.hal-card:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-card-hover);
}
.hal-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.hal-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.hal-card-body {
  color: var(--text-secondary);
  font-size: 14px;
}
`;
  document.head.appendChild(style);
}
