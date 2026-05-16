// Decisions view — expandable rows, timestamp, trigger, decision, confidence, status filter

import { formatDateTimeValue, getStore } from '../store.js';
import { halApi, type HalDecision } from '../api.js';
import {
  renderHeatmap,
  type HeatmapCell,
  renderDecisionBarTrend,
  type DecisionBarPoint,
  injectChartKitStyles,
} from '../components/ChartKit.js';

const expandedDecisionIds = new Set<string>();
let statusFilter: 'all' | 'success' | 'failure' | 'pending' = 'all';

export async function renderDecisions(container: HTMLElement): Promise<void> {
  const store = getStore();

  // Pending decisions section (from store)
  const pendingDecisions = store.pendingDecisions || [];

  const filtered =
    statusFilter === 'all'
      ? store.decisions
      : store.decisions.filter((d) => (d.status || 'pending') === statusFilter);

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Decisions</h1>
      <p class="page-subtitle">HAL autonomous decision log</p>
    </div>

    ${renderPendingDecisionsSection(pendingDecisions)}

    <div class="decisions-chart-section mb-4">
      <div class="hal-card" style="padding: var(--space-3)">
        <div class="section-title mb-3">Decision Activity Heatmap</div>
        <div id="decisions-heatmap" style="min-height: 100px;"></div>
      </div>
    </div>

    <div class="decisions-chart-section mb-4">
      <div class="hal-card" style="padding: var(--space-3)">
        <div class="section-title mb-3">Decision Trend (24h)</div>
        <div id="decisions-bar-trend" style="min-height: 180px;"></div>
      </div>
    </div>

    <div class="decisions-toolbar mb-4">
      <div class="filter-group" role="group" aria-label="Filter by status">
        ${(['all', 'success', 'failure', 'pending'] as const)
          .map(
            (s) => `
          <button class="filter-btn ${s === statusFilter ? 'active' : ''}" data-filter="${s}">
            ${s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        `,
          )
          .join('')}
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
  injectChartKitStyles();
  attachDecisionHandlers();
  attachFilterHandlers();
  attachPendingHandlers();
  renderDecisionsHeatmap(store.decisions);
  renderDecisionsBarTrend(store.decisions);
  startPendingCountdown();
}

function renderPendingDecisionsSection(
  pending: ReturnType<typeof getStore>['pendingDecisions'],
): string {
  if (pending.length === 0) {
    return '';
  }

  const items = pending
    .filter((p) => p.decision && !p.executed)
    .map((p) => {
      const remaining = p.remainingSeconds ?? 0;
      const isAssisted = p.mode === 'ASSISTED_CONTROL';
      const modeColor: Record<string, string> = {
        SUGGEST: '#388BFD',
        ASSISTED_CONTROL: '#D29922',
      };
      const color = modeColor[p.mode] || '#388BFD';
      const countdown = isAssisted
        ? `<span class="pending-countdown" data-deadline="${p.veto_deadline || ''}">${remaining}s</span>`
        : '';
      const decisionText =
        p.decision?.reasoning || p.decision?.decision || 'No description';
      const confidence = p.decision?.confidence
        ? `${(p.decision.confidence * 100).toFixed(0)}%`
        : '--';
      return `
    <div class="pending-decision-item" data-decision-id="${p.decision_id}">
      <div class="pending-decision-left">
        <span class="pending-mode-badge" style="background:${color}">${p.mode === 'ASSISTED_CONTROL' ? 'ASSISTED' : 'SUGGEST'}</span>
        ${countdown}
      </div>
      <div class="pending-decision-middle">
        <span class="pending-decision-text">${escapeHtml(decisionText)}</span>
        <span class="pending-decision-confidence text-mono text-xs">${confidence}</span>
      </div>
      <div class="pending-decision-right">
        <button class="pending-btn approve-btn" data-decision-id="${p.decision_id}">Approve</button>
        <button class="pending-btn veto-btn" data-decision-id="${p.decision_id}">Veto</button>
      </div>
    </div>
  `;
    })
    .join('');

  return `
    <div class="pending-decisions-section mb-4" id="pending-decisions-section">
      <div class="hal-card" style="padding: var(--space-3)">
        <div class="section-title mb-3">Pending Decisions <span class="pending-count-badge">${pending.length}</span></div>
        <div class="pending-decisions-list">
          ${items || '<p class="text-sm text-secondary">No pending decisions.</p>'}
        </div>
      </div>
    </div>
  `;
}

function renderDecisionsHeatmap(decisions: HalDecision[]): void {
  if (decisions.length < 3) return;

  // Build heatmap: hour of day x day of week = decision count
  const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts = new Map<string, number>();

  for (const d of decisions) {
    const dt = new Date(d.timestamp);
    const dow = dows[dt.getDay()];
    const hour = dt.getHours();
    const key = `${dow}:${hour}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const cells: HeatmapCell[] = [];
  for (const dow of dows) {
    for (let h = 0; h < 24; h++) {
      const val = counts.get(`${dow}:${h}`) || 0;
      cells.push({ dow, hour: h, value: val });
    }
  }

  setTimeout(
    () =>
      renderHeatmap(cells, 'decisions-heatmap', {
        colorRange: ['#0a1a12', '#1a4030', '#4aB070', '#F59E0B', '#FF5C6C'],
      }),
    0,
  );
}

function renderDecisionsBarTrend(decisions: HalDecision[]): void {
  if (decisions.length < 2) return;

  // Bucket by hour for last 24 hours
  const now = Date.now();
  const buckets = new Map<
    number,
    { success: number; failure: number; pending: number }
  >();

  for (let h = 23; h >= 0; h--) {
    const t = now - h * 3600000;
    const hourKey = new Date(t).getHours();
    buckets.set(hourKey, { success: 0, failure: 0, pending: 0 });
  }

  for (const d of decisions) {
    const t = new Date(d.timestamp).getTime();
    if (now - t > 24 * 3600000) continue;
    const hourKey = new Date(d.timestamp).getHours();
    const bucket = buckets.get(hourKey);
    if (!bucket) continue;
    const status = d.status || 'pending';
    if (status === 'success') bucket.success++;
    else if (status === 'failure') bucket.failure++;
    else bucket.pending++;
  }

  const points: DecisionBarPoint[] = [];
  for (let h = 23; h >= 0; h--) {
    const t = now - h * 3600000;
    const hourKey = new Date(t).getHours();
    const bucket = buckets.get(hourKey);
    const label = `${hourKey.toString().padStart(2, '0')}:00`;
    points.push({
      label,
      success: bucket?.success ?? 0,
      failure: bucket?.failure ?? 0,
      pending: bucket?.pending ?? 0,
    });
  }

  setTimeout(
    () =>
      renderDecisionBarTrend(points, 'decisions-bar-trend', { height: 180 }),
    0,
  );
}

function attachFilterHandlers(): void {
  document.querySelectorAll<HTMLButtonElement>('.filter-btn').forEach((btn) => {
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
  return decisions
    .map(
      (d) => `
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
        ${
          d.outcome
            ? `
        <div class="decision-detail-row">
          <span class="decision-detail-label">Outcome</span>
          <span class="decision-detail-value">${escapeHtml(d.outcome)}</span>
        </div>`
            : ''
        }
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
  `,
    )
    .join('');
}

function attachDecisionHandlers(): void {
  document.querySelectorAll<HTMLElement>('.decision-item').forEach((item) => {
    const summary = item.querySelector<HTMLElement>('.decision-summary');
    const detail = item.querySelector<HTMLElement>('.decision-detail');
    const expandBtn = item.querySelector<HTMLButtonElement>(
      '.decision-expand-btn',
    );

    detail?.addEventListener('click', (event) => event.stopPropagation());
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

function attachPendingHandlers(): void {
  // Approve buttons
  document
    .querySelectorAll<HTMLButtonElement>('.pending-btn.approve-btn')
    .forEach((btn) => {
      btn.addEventListener('click', async () => {
        const decisionId = btn.dataset.decisionId;
        if (!decisionId) return;
        try {
          await halApi.approveDecision(decisionId);
          // Refresh data
          const { refreshHALData } = await import('../main.js');
          await refreshHALData();
          // Re-render
          const container = document.getElementById('view-container');
          if (container) await renderDecisions(container);
        } catch (err: any) {
          alert(`Failed to approve: ${err.message}`);
        }
      });
    });

  // Veto buttons
  document
    .querySelectorAll<HTMLButtonElement>('.pending-btn.veto-btn')
    .forEach((btn) => {
      btn.addEventListener('click', async () => {
        const decisionId = btn.dataset.decisionId;
        if (!decisionId) return;
        try {
          await halApi.vetoDecision(decisionId);
          // Refresh data
          const { refreshHALData } = await import('../main.js');
          await refreshHALData();
          // Re-render
          const container = document.getElementById('view-container');
          if (container) await renderDecisions(container);
        } catch (err: any) {
          alert(`Failed to veto: ${err.message}`);
        }
      });
    });
}

let countdownInterval: ReturnType<typeof setInterval> | null = null;

function startPendingCountdown(): void {
  if (countdownInterval) clearInterval(countdownInterval);

  function tick(): void {
    document
      .querySelectorAll<HTMLElement>('.pending-countdown')
      .forEach((el) => {
        const deadline = el.dataset.deadline;
        if (!deadline) return;
        const remaining = Math.max(
          0,
          Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000),
        );
        el.textContent = `${remaining}s`;
        if (remaining <= 0) {
          el.textContent = '0s';
          el.classList.add('expired');
        }
      });
  }

  tick();
  countdownInterval = setInterval(tick, 1000);
}

function confidenceColor(conf: number): string {
  if (conf >= 0.8) return 'var(--success)';
  if (conf >= 0.5) return 'var(--warning)';
  return 'var(--danger)';
}

function formatTime(iso: string): string {
  try {
    return formatDateTimeValue(new Date(iso), getStore().timeFormat);
  } catch {
    return '--';
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

@media (max-width: 767px) {
  .decisions-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
  .decision-summary {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .decision-left {
    min-width: 0;
  }
  .decision-right {
    margin-left: auto;
  }
  .decision-detail-row {
    flex-direction: column;
    gap: var(--space-1);
  }
  .decision-detail-label {
    min-width: 0;
  }
}

/* Pending Decisions Section */
.pending-decisions-section .section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.pending-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--radius-pill);
  background: var(--accent);
  color: var(--on-primary);
  font-size: 11px;
  font-weight: 700;
}
.pending-decisions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.pending-decision-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
}
.pending-decision-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
.pending-mode-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-primary);
}
.pending-countdown {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--warning);
  min-width: 32px;
}
.pending-countdown.expired {
  color: var(--danger);
}
.pending-decision-middle {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.pending-decision-text {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pending-decision-confidence {
  color: var(--text-secondary);
}
.pending-decision-right {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}
.pending-btn {
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border);
  transition: all var(--transition-fast);
}
.pending-btn.approve-btn {
  background: color-mix(in srgb, var(--success) 20%, transparent);
  color: var(--success);
  border-color: var(--success);
}
.pending-btn.approve-btn:hover {
  background: color-mix(in srgb, var(--success) 35%, transparent);
}
.pending-btn.veto-btn {
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  color: var(--danger);
  border-color: var(--danger);
}
.pending-btn.veto-btn:hover {
  background: color-mix(in srgb, var(--danger) 30%, transparent);
}
`;
  document.head.appendChild(style);
}
