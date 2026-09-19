// Reasoning display — shared one-line summary, full text, verifier transparency,
// and smart auto-surface. Display-only: never changes what the controller logs.

import { getStore } from '../store.js';
import type { HalDecision } from '../api.js';

export interface AuditMatch {
  verifierResult: string;
  deniedReason: string | null;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// One-line "what + why": first sentence/clause of the reasoning, or the
// decision verb when there's no reasoning text.
export function summarizeReasoning(d: HalDecision): string {
  const text = (d.reasoning || '').trim();
  if (!text) return d.decision;
  return text.split(/(?<=[.!?])\s+/)[0].trim() || d.decision;
}

export function shouldAutoSurface(d: HalDecision, audit?: AuditMatch): boolean {
  if (typeof d.confidence === 'number' && d.confidence < 0.5) return true;
  if (d.outcome === 'failure' || d.status === 'failure') return true;
  if (audit?.verifierResult?.startsWith('DENIED')) return true;
  return false;
}

export function autoSurfaceChip(d: HalDecision, audit?: AuditMatch): string {
  if (audit?.verifierResult?.startsWith('DENIED'))
    return `<span class="reasoning-chip reasoning-chip-danger">Blocked by safety</span>`;
  if (d.outcome === 'failure' || d.status === 'failure')
    return `<span class="reasoning-chip reasoning-chip-danger">Action failed</span>`;
  if (typeof d.confidence === 'number' && d.confidence < 0.5)
    return `<span class="reasoning-chip reasoning-chip-warning">Low confidence</span>`;
  return '';
}

// Verifier badge + denied reason (used in expandable detail).
export function renderVerifierRow(audit: AuditMatch): string {
  const denied = audit.verifierResult.startsWith('DENIED');
  return `
    <div class="reasoning-verifier">
      <span class="reasoning-verifier-badge ${denied ? 'denied' : 'approved'}">${escapeHtml(audit.verifierResult)}</span>
      ${audit.deniedReason ? `<span class="reasoning-verifier-reason">${escapeHtml(audit.deniedReason)}</span>` : ''}
    </div>
  `;
}

// Full reasoning text + verifier row — for surfaces that manage their own
// expand/collapse (the Decisions list).
export function renderReasoningDetail(
  d: HalDecision,
  audit?: AuditMatch,
): string {
  const full = (d.reasoning || '').trim();
  return `
    ${full ? `<div class="reasoning-full">${escapeHtml(full)}</div>` : ''}
    ${audit ? renderVerifierRow(audit) : ''}
  `;
}

// Self-contained block — clamped one-liner always, full text when Detailed or
// auto-surfaced. For cards without their own expand (LatestDecision, pending).
export function renderReasoningBlock(
  d: HalDecision,
  audit?: AuditMatch,
): string {
  const summary = summarizeReasoning(d);
  const full = (d.reasoning || '').trim();
  const auto = shouldAutoSurface(d, audit);
  const showFull =
    (getStore().reasoningVerbosity === 'detailed' || auto) &&
    !!full &&
    full !== summary;

  return `
    <div class="reasoning-block">
      <div class="reasoning-summary-row">
        <span class="reasoning-summary" title="${escapeHtml(full || summary)}">${escapeHtml(summary)}</span>
        ${auto ? autoSurfaceChip(d, audit) : ''}
      </div>
      ${showFull ? `<div class="reasoning-full">${escapeHtml(full)}</div>` : ''}
      ${audit ? renderVerifierRow(audit) : ''}
    </div>
  `;
}

export function injectReasoningStyles(): void {
  if (document.getElementById('hal-reasoning-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-reasoning-styles';
  style.textContent = `
.reasoning-block { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
.reasoning-summary-row { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.reasoning-summary {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: anywhere;
}
.reasoning-full {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-width: 100%;
  margin-top: var(--space-1);
}
.reasoning-chip {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-pill);
}
.reasoning-chip-danger { color: var(--danger); background: color-mix(in srgb, var(--danger) 15%, transparent); }
.reasoning-chip-warning { color: var(--warning); background: color-mix(in srgb, var(--warning) 15%, transparent); }
.reasoning-verifier { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-1); }
.reasoning-verifier-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}
.reasoning-verifier-badge.approved { color: var(--success); background: color-mix(in srgb, var(--success) 15%, transparent); }
.reasoning-verifier-badge.denied { color: var(--danger); background: color-mix(in srgb, var(--danger) 15%, transparent); }
.reasoning-verifier-reason { font-size: 12px; color: var(--text-secondary); overflow-wrap: anywhere; }
`;
  document.head.appendChild(style);
}
