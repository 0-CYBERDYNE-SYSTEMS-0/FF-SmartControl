// Diagnostic Terminal — monospace log output with timestamped lines

import { getStore } from '../store.js';
import type { HalDecision } from '../api.js';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
}

export function renderTerminal(entries: LogEntry[]): string {
  if (entries.length === 0) {
    return `
      <div class="terminal-wrap hal-card">
        <div class="terminal-header">
          <span class="terminal-title">System Log</span>
          <span class="status-chip status-chip--idle">Idle</span>
        </div>
        <div class="terminal-body">
          <p class="text-secondary text-sm">No log entries</p>
        </div>
      </div>
    `;
  }

  const lines = entries
    .map(
      (e) => `
    <div class="terminal-line ${e.level}">
      <span class="terminal-time text-mono">${formatTime(e.timestamp)}</span>
      <span class="terminal-source">${escapeHtml(e.source)}</span>
      <span class="terminal-msg">${escapeHtml(e.message)}</span>
    </div>
  `,
    )
    .join('');

  return `
    <div class="terminal-wrap hal-card">
      <div class="terminal-header">
        <span class="terminal-title">System Log</span>
        <span class="status-chip status-chip--active">${entries.length} entries</span>
      </div>
      <div class="terminal-body" id="terminal-body">
        ${lines}
      </div>
    </div>
  `;
}

export function buildLogEntries(decisions: HalDecision[]): LogEntry[] {
  const store = getStore();
  const entries: LogEntry[] = [];

  // Agent status
  entries.push({
    timestamp: new Date().toISOString(),
    level: store.agentStatus === 'active' ? 'info' : 'warn',
    source: 'agent',
    message: `Status: ${store.agentStatus}`,
  });

  // HAL status
  entries.push({
    timestamp: new Date().toISOString(),
    level: store.halStatus === 'online' ? 'info' : 'warn',
    source: 'hal',
    message: `Status: ${store.halStatus}`,
  });

  // MQTT
  entries.push({
    timestamp: new Date().toISOString(),
    level: store.mqttStatus === 'connected' ? 'info' : 'error',
    source: 'mqtt',
    message: `Broker: ${store.mqttStatus}`,
  });

  // Recent decisions as log entries
  for (const d of decisions.slice(0, 10)) {
    entries.push({
      timestamp: d.timestamp,
      level:
        d.status === 'success'
          ? 'info'
          : d.status === 'failure'
            ? 'error'
            : 'warn',
      source: 'decision',
      message: `${d.decision} [${(d.confidence * 100).toFixed(0)}%]`,
    });
  }

  // Sort by timestamp descending
  entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return entries;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--:--:--';
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function injectTerminalStyles(): void {
  if (document.getElementById('hal-terminal-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-terminal-styles';
  style.textContent = `
.terminal-wrap {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.terminal-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.terminal-body {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  padding: var(--space-2) 0;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
}
.terminal-line {
  display: flex;
  gap: var(--space-3);
  padding: 2px var(--space-4);
  border-left: 3px solid transparent;
}
.terminal-line:hover {
  background: var(--bg-tertiary);
}
.terminal-line.info { border-left-color: var(--info); }
.terminal-line.warn { border-left-color: var(--warning); }
.terminal-line.error { border-left-color: var(--danger); }
.terminal-line.debug { border-left-color: var(--slate); }
.terminal-time {
  color: var(--text-tertiary);
  flex-shrink: 0;
  min-width: 64px;
}
.terminal-source {
  color: var(--accent);
  flex-shrink: 0;
  min-width: 72px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.03em;
}
.terminal-msg {
  color: var(--text-primary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;
  document.head.appendChild(style);
}
