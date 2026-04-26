// Latest Decision + Camera Snapshot — compact inline decision card

import { getStore } from '../store.js';

export function renderLatestDecision(): string {
  const store = getStore();
  const latest = store.decisions[0];

  if (!latest) {
    return `
      <div class="latest-decision hal-card">
        <div class="latest-decision-header">
          <span class="latest-decision-title">Latest Decision</span>
        </div>
        <div class="latest-decision-empty text-secondary text-sm">No decisions yet</div>
      </div>
    `;
  }

  const statusColor = latest.status === 'success' ? 'var(--success)' : latest.status === 'failure' ? 'var(--danger)' : 'var(--warning)';

  return `
    <div class="latest-decision hal-card">
      <div class="latest-decision-header">
        <span class="latest-decision-title">Latest Decision</span>
        <span class="latest-decision-time text-mono text-xs text-secondary">${formatTime(latest.timestamp)}</span>
      </div>
      <div class="latest-decision-body">
        <div class="latest-decision-trigger text-sm text-secondary">${escapeHtml(latest.trigger)}</div>
        <div class="latest-decision-action font-semibold text-sm">${escapeHtml(latest.decision)}</div>
        <div class="latest-decision-footer">
          <span class="latest-decision-status" style="color: ${statusColor}; background: color-mix(in srgb, ${statusColor} 15%, transparent)"
            >${latest.status || 'pending'}</span
          >
          <span class="latest-decision-confidence text-mono text-xs" style="color: ${confidenceColor(latest.confidence)}"
            >${(latest.confidence * 100).toFixed(0)}%</span
          >
        </div>
      </div>
    </div>
  `;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    });
  } catch { return '--'; }
}

function confidenceColor(conf: number): string {
  if (conf >= 0.8) return 'var(--success)';
  if (conf >= 0.5) return 'var(--warning)';
  return 'var(--danger)';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function injectLatestDecisionStyles(): void {
  if (document.getElementById('hal-latest-decision-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-latest-decision-styles';
  style.textContent = `
.latest-decision {
  padding: var(--space-4);
}
.latest-decision-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.latest-decision-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.latest-decision-empty {
  padding: var(--space-6) 0;
  text-align: center;
}
.latest-decision-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.latest-decision-trigger {
  font-size: 12px;
}
.latest-decision-action {
  color: var(--text-primary);
}
.latest-decision-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-subtle);
}
.latest-decision-status {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}
`;
  document.head.appendChild(style);
}
