// Decisions view — expandable rows, timestamp, trigger, decision, confidence

import { getStore } from '../store.js';
import { halApi, HalDecision } from '../api.js';

export async function renderDecisions(container: HTMLElement): Promise<void> {
  const store = getStore();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Decisions</h1>
      <p class="page-subtitle">HAL autonomous decision log</p>
    </div>

    <div class="hal-card" style="padding:0">
      <div id="decisions-list">
        ${renderDecisionList(store.decisions)}
      </div>
    </div>
  `;

  injectDecisionsStyles();
  attachDecisionHandlers();
}

function renderDecisionList(decisions: HalDecision[]): string {
  if (decisions.length === 0) {
    return `<div class="empty-state"><p class="empty-state-title">No decisions yet</p><p class="empty-state-desc">Decisions will appear here as the HAL makes them.</p></div>`;
  }
  return decisions.map(d => `
    <div class="decision-item" data-id="${d.id}">
      <div class="decision-summary">
        <div class="decision-left">
          <span class="decision-status-dot ${d.status || 'pending'}"></span>
          <span class="decision-time text-mono text-xs text-secondary">${formatTime(d.timestamp)}</span>
        </div>
        <div class="decision-middle">
          <span class="decision-trigger-text text-sm">${escapeHtml(d.trigger)}</span>
        </div>
        <div class="decision-right">
          <span class="decision-confidence text-mono text-xs" style="color:${confidenceColor(d.confidence)}">${(d.confidence * 100).toFixed(0)}%</span>
          <button class="decision-expand-btn" aria-label="Expand">▶</button>
        </div>
      </div>
      <div class="decision-detail" hidden>
        <div class="decision-detail-row">
          <span class="decision-detail-label">Decision</span>
          <span class="decision-detail-value font-semibold">${escapeHtml(d.decision)}</span>
        </div>
        ${d.outcome ? `
        <div class="decision-detail-row">
          <span class="decision-detail-label">Outcome</span>
          <span class="decision-detail-value">${escapeHtml(d.outcome)}</span>
        </div>` : ''}
        <div class="decision-detail-row">
          <span class="decision-detail-label">Confidence</span>
          <span class="decision-detail-value text-mono">${(d.confidence * 100).toFixed(1)}%</span>
        </div>
        <div class="decision-detail-row">
          <span class="decision-detail-label">Timestamp</span>
          <span class="decision-detail-value text-mono">${d.timestamp}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function attachDecisionHandlers(): void {
  document.querySelectorAll<HTMLElement>('.decision-item').forEach(item => {
    const summary = item.querySelector<HTMLElement>('.decision-summary');
    const detail = item.querySelector<HTMLElement>('.decision-detail');
    const expandBtn = item.querySelector<HTMLButtonElement>('.decision-expand-btn');

    summary?.addEventListener('click', () => {
      const isOpen = !detail?.hidden;
      // Close all others
      document.querySelectorAll<HTMLElement>('.decision-detail').forEach(el => el.hidden = true);
      document.querySelectorAll<HTMLButtonElement>('.decision-expand-btn').forEach(btn => btn.textContent = '▶');
      if (!isOpen) {
        detail!.hidden = false;
        expandBtn!.textContent = '▼';
      }
    });
  });
}

function confidenceColor(conf: number): string {
  if (conf >= 0.8) return 'var(--success)';
  if (conf >= 0.5) return 'var(--warning)';
  return 'var(--danger)';
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
  } catch { return '--'; }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function injectDecisionsStyles(): void {
  if (document.getElementById('hal-decisions-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-decisions-styles';
  style.textContent = `
.decision-item {
  border-bottom: 1px solid var(--border);
}
.decision-item:last-child { border-bottom: none; }
.decision-summary {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.decision-summary:hover { background: var(--bg-tertiary); }
.decision-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 140px;
}
.decision-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--slate);
  flex-shrink: 0;
}
.decision-status-dot.success { background: var(--success); }
.decision-status-dot.failure { background: var(--danger); }
.decision-status-dot.pending { background: var(--warning); }
.decision-middle { flex: 1; }
.decision-trigger-text { color: var(--text-primary); }
.decision-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.decision-confidence { font-size: 12px; }
.decision-expand-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 10px;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-fast);
}
.decision-detail {
  padding: 0 var(--space-4) var(--space-4);
  border-top: 1px solid var(--border-subtle);
}
.decision-detail[hidden] { display: none; }
.decision-detail-row {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.decision-detail-row:last-child { border-bottom: none; }
.decision-detail-label {
  min-width: 100px;
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.decision-detail-value { font-size: 14px; color: var(--text-primary); }
`;
  document.head.appendChild(style);
}
