// SimNetworkLog — Scrolling network activity log
// Shows protocol interactions with timestamp, direction, method, response code, payload preview

export interface SimLogEntry {
  timestamp: string; // HH:MM:SS.mmm
  direction: 'TX' | 'RX';
  protocol: string;
  method: string;
  responseCode: number | string;
  payloadPreview: string;
  faultInjected: boolean;
  deviceId?: string;
}

let logEntries: SimLogEntry[] = [];
const MAX_LOG_ENTRIES = 500;

export function addLogEntry(entry: SimLogEntry): void {
  logEntries.push(entry);
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries = logEntries.slice(-MAX_LOG_ENTRIES);
  }
}

export function clearLog(): void {
  logEntries = [];
}

export function getLogEntries(): SimLogEntry[] {
  return logEntries;
}

// In-memory log storage (server-side populated via API)
let serverLogEntries: SimLogEntry[] = [];

export function setServerLogEntries(entries: SimLogEntry[]): void {
  serverLogEntries = entries;
  // Also merge into local log
  logEntries = entries.slice(-MAX_LOG_ENTRIES);
}

export function renderSimNetworkLog(): string {
  const entries = logEntries.length > 0 ? logEntries : serverLogEntries;
  const rows = entries.slice(-100).reverse().map((entry) => {
    const codeClass = getResponseCodeClass(entry.responseCode);
    const dirClass = entry.direction === 'TX' ? 'log-dir-tx' : 'log-dir-rx';
    const faultClass = entry.faultInjected ? 'log-fault' : '';
    const arrow = entry.direction === 'TX' ? '\u25B6' : '\u25C0';

    return `
      <div class="sim-log-row ${faultClass}">
        <span class="sim-log-time mono">${escapeHtml(entry.timestamp)}</span>
        <span class="sim-log-dir ${dirClass} mono">${arrow} ${entry.direction}</span>
        <span class="sim-log-proto mono">${escapeHtml(entry.protocol)}</span>
        <span class="sim-log-method mono">${escapeHtml(entry.method)}</span>
        <span class="sim-log-code ${codeClass} mono">${escapeHtml(String(entry.responseCode))}</span>
        <span class="sim-log-payload mono" title="${escapeAttr(entry.payloadPreview)}">${escapeHtml(entry.payloadPreview.slice(0, 120))}</span>
      </div>
    `;
  }).join('');

  const empty = entries.length === 0
    ? '<div class="sim-log-empty">Waiting for simulation data...</div>'
    : '';

  return `
    <div class="sim-network-log">
      <div class="sim-log-header">
        <span class="sim-log-title">Network Activity Log</span>
        <span class="sim-log-count mono">${entries.length} / ${MAX_LOG_ENTRIES}</span>
      </div>
      <div class="sim-log-body" id="sim-log-body">
        ${empty}
        ${rows}
      </div>
    </div>
  `;
}

export function getResponseCodeClass(code: number | string): string {
  const n = typeof code === 'number' ? code : parseInt(code as string, 10);
  if (isNaN(n)) {
    const s = String(code).toUpperCase();
    if (s === 'TIMEOUT') return 'code-timeout';
    if (s === 'MALFORMED') return 'code-error';
    return 'code-gray';
  }
  if (n >= 200 && n < 300) return 'code-success';
  if (n >= 400 && n < 500) return 'code-error';
  if (n >= 500) return 'code-error';
  if (n === 0) return 'code-timeout';
  return 'code-gray';
}

export function injectSimNetworkLogStyles(): void {
  if (document.getElementById('sim-network-log-styles')) return;
  const style = document.createElement('style');
  style.id = 'sim-network-log-styles';
  style.textContent = `
.sim-network-log {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary, #0D1117);
  border: 1px solid var(--border, #30363D);
  border-radius: 6px;
  overflow: hidden;
}
.sim-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-secondary, #161B22);
  border-bottom: 1px solid var(--border, #30363D);
  flex-shrink: 0;
}
.sim-log-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary, #F0F6FC);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.sim-log-count {
  font-size: 10px;
  color: var(--text-tertiary, #484F58);
}
.sim-log-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
  font-size: 11px;
  line-height: 1.6;
}
.sim-log-body::-webkit-scrollbar {
  width: 6px;
}
.sim-log-body::-webkit-scrollbar-track {
  background: transparent;
}
.sim-log-body::-webkit-scrollbar-thumb {
  background: var(--border, #30363D);
  border-radius: 3px;
}
.sim-log-row {
  display: flex;
  gap: 8px;
  padding: 3px 12px;
  border-bottom: 1px solid var(--border-subtle, #21262D);
  align-items: baseline;
  white-space: nowrap;
}
.sim-log-row.log-fault {
  background: rgba(210, 153, 34, 0.06);
}
.sim-log-time {
  color: var(--text-tertiary, #484F58);
  flex-shrink: 0;
  min-width: 95px;
}
.sim-log-dir {
  font-weight: 700;
  flex-shrink: 0;
  min-width: 50px;
}
.log-dir-tx {
  color: #58A6FF;
}
.log-dir-rx {
  color: #3FB950;
}
.sim-log-proto {
  color: var(--text-secondary, #8B949E);
  flex-shrink: 0;
  min-width: 65px;
}
.sim-log-method {
  color: var(--text-secondary, #8B949E);
  flex-shrink: 0;
  min-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sim-log-code {
  font-weight: 700;
  flex-shrink: 0;
  min-width: 55px;
}
.code-success { color: #3FB950; }
.code-timeout { color: #D29922; }
.code-error { color: #F85149; }
.code-gray { color: #8B949E; }
.sim-log-payload {
  color: var(--text-tertiary, #484F58);
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.sim-log-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-tertiary, #484F58);
  font-family: var(--font-mono);
  font-size: 12px;
}
.mono {
  font-family: var(--font-mono);
}
`;
  document.head.appendChild(style);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch));
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch));
}
