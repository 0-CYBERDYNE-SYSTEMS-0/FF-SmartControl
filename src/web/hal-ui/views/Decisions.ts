// Decisions view — expandable rows, timestamp, trigger, decision, confidence, status filter

import { getStore } from '../store.js';
import { HalDecision } from '../api.js';

const expandedDecisionIds = new Set<string>();
let statusFilter: 'all' | 'success' | 'failure' | 'pending' = 'all';

export async function renderDecisions(container: HTMLElement): Promise<void> {
  const store = getStore();

  const filtered = statusFilter === 'all'
    ? store.decisions
    : store.decisions.filter(d => (d.status || 'pending') === statusFilter);

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Decisions</h1>
      <p class="page-subtitle">HAL autonomous decision log</p>
    </div>

    <div class="decisions-toolbar mb-4">
      <div class="filter-group" role="group" aria-label="Filter by status">
        ${(['all','success','failure','pending'] as const).map(s => `
          <button class="filter-btn ${s === statusFilter ? 'active' : ''}" data-filter="${s}">
            ${s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        `).join('')}
      </div>
      <span class="text-xs text-secondary">${filtered.length} decisions</span>
    </div>

    <div class="hal-card" style="padding:0">
      <div id="decisions-list">
        ${renderDecisionList(filtered)}
      </div>
    </div>
  `;

  injectDecisionsStyles();
  attachDecisionHandlers();
  attachFilterHandlers();
}

function attachFilterHandlers(): void {
  document.querySelectorAll<HTMLButtonElement>('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      statusFilter = btn.dataset.filter as typeof statusFilter;
      const store = getStore();
      const container = document.getElementById('view-container');
      if (container) renderDecisions(container);
    });
  });
}

function renderDecisionList(decisions: HalDecision[]): string {
  if (decisions.length === 0) {
    return `<div class="empty-state" style="padding: var(--space-8)"><p class="empty-state-title">No decisions</p><p class="empty-state-desc">${statusFilter === 'all' ? 'Decisions will appear here as the HAL makes them.' : `No ${statusFilter} decisions found.`}</p></div>`;
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
          <button class="decision-expand-btn" aria-label="Toggle metadata">${expandedDecisionIds.has(d.id) ? 'v' : '>'}</button>
        </div>
      </div>
      <div class="decision-detail" ${expandedDecisionIds.has(d.id) ? '' : 'hidden'}>
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

    detail?.addEventListener('click', event => event.stopPropagation());
    summary?.addEventListener('click', () => {
      const isOpen = !detail?.hidden;
      const id = item.dataset.id;
      if (isOpen) {
        detail!.hidden = true;
        expandBtn!.textContent = '>';
        if (id) expandedDecisionIds.delete(id);
      } else {
        detail!.hidden = false;
        expandBtn!.textContent = 'v';
        if (id) expandedDecisionIds.add(id);
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
.decisions-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.filter-group {
  display: flex;
  gap: 2px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px;
}
.filter-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-transform: capitalize;
}
.filter-btn.active,
.filter-btn:hover {
  background: var(--accent);
  color: var(--on-accent);
}
`;
  document.head.appendChild(style);
}
