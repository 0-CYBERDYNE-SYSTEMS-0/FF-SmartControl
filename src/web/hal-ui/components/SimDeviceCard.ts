// SimDeviceCard — Individual simulated device card
// Shows protocol badge, device name, state, latency, fault injection status

export interface SimDevice {
  id: string;
  label: string;
  protocol: string;
  state: 'on' | 'off' | 'unknown';
  power?: number;
  lastLatencyMs?: number;
  faultInjected?: boolean;
  faultType?: string;
  host?: string;
}

export function renderSimDeviceCard(device: SimDevice): string {
  const stateClass = device.state === 'on' ? 'state-on' : device.state === 'off' ? 'state-off' : 'state-unknown';
  const stateLabel = device.state === 'on' ? 'ON' : device.state === 'off' ? 'OFF' : '---';
  const faultPill = device.faultInjected
    ? `<span class="sim-fault-pill fault-active">FAULT: ${escapeAttr(device.faultType || 'unknown')}</span>`
    : '<span class="sim-fault-pill fault-nominal">NOMINAL</span>';
  const latencyStr = device.lastLatencyMs != null ? `${device.lastLatencyMs.toFixed(0)}ms` : '--ms';
  const powerStr = device.power != null ? `${device.power}W` : '';

  return `
    <div class="sim-device-card" data-device-id="${escapeAttr(device.id)}">
      <div class="sim-card-header">
        <span class="sim-protocol-badge sim-proto-${escapeAttr(device.protocol)}">${escapeHtml(device.protocol.toUpperCase())}</span>
        <span class="sim-device-state ${stateClass}">${stateLabel}</span>
      </div>
      <div class="sim-device-name" title="${escapeAttr(device.label)}">${escapeHtml(device.label)}</div>
      <div class="sim-card-stats">
        <div class="sim-stat">
          <span class="sim-stat-label">LATENCY</span>
          <span class="sim-stat-value mono">${latencyStr}</span>
        </div>
        ${powerStr ? `<div class="sim-stat"><span class="sim-stat-label">POWER</span><span class="sim-stat-value mono">${powerStr}</span></div>` : ''}
        ${!powerStr ? `<div class="sim-stat"><span class="sim-stat-label">HOST</span><span class="sim-stat-value mono text-xs">${escapeHtml(device.host || '--')}</span></div>` : ''}
      </div>
      <div class="sim-card-faults">
        ${faultPill}
      </div>
      <div class="sim-card-actions">
        <button class="sim-fault-btn fault-sensor-stuck" data-device="${escapeAttr(device.id)}" data-fault="sensor_stuck" title="Inject sensor stuck fault">\u2593 STUCK</button>
        <button class="sim-fault-btn fault-device-offline" data-device="${escapeAttr(device.id)}" data-fault="device_offline" title="Inject device offline fault">\u2205 OFFLINE</button>
        <button class="sim-fault-btn fault-clear" data-device="${escapeAttr(device.id)}" data-fault="clear" title="Clear faults">\u2715 CLR</button>
      </div>
    </div>
  `;
}

export function injectSimDeviceCardStyles(): void {
  if (document.getElementById('sim-device-card-styles')) return;
  const style = document.createElement('style');
  style.id = 'sim-device-card-styles';
  style.textContent = `
.sim-device-card {
  background: var(--bg-secondary, #161B22);
  border: 1px solid var(--border, #30363D);
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s;
}
.sim-device-card:hover {
  border-color: var(--accent-bright, #3FB950);
}
.sim-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sim-protocol-badge {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.05em;
}
.sim-proto-http, .sim-proto-tasmota, .sim-proto-shelly, .sim-proto-kasa {
  background: #1A3A5C;
  color: #58A6FF;
  border: 1px solid #264466;
}
.sim-proto-mqtt {
  background: #1A2E1A;
  color: #3FB950;
  border: 1px solid #264426;
}
.sim-proto-serial {
  background: #3A2A1A;
  color: #D29922;
  border: 1px solid #4A3A26;
}
.sim-proto-gpio {
  background: #2A1A3A;
  color: #A371F7;
  border: 1px solid #3A264A;
}
.sim-device-state {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 3px;
  letter-spacing: 0.05em;
}
.state-on {
  background: rgba(63, 185, 80, 0.15);
  color: #3FB950;
  border: 1px solid rgba(63, 185, 80, 0.3);
}
.state-off {
  background: rgba(248, 81, 73, 0.15);
  color: #F85149;
  border: 1px solid rgba(248, 81, 73, 0.3);
}
.state-unknown {
  background: rgba(139, 148, 158, 0.1);
  color: #8B949E;
  border: 1px solid rgba(139, 148, 158, 0.2);
}
.sim-device-name {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #F0F6FC);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sim-card-stats {
  display: flex;
  gap: 12px;
}
.sim-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sim-stat-label {
  font-size: 9px;
  font-weight: 700;
  color: var(--text-tertiary, #484F58);
  letter-spacing: 0.06em;
}
.sim-stat-value {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, #8B949E);
}
.sim-stat-value.mono, .mono {
  font-family: var(--font-mono);
}
.sim-card-faults {
  min-height: 20px;
}
.sim-fault-pill {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 10px;
  letter-spacing: 0.04em;
}
.fault-nominal {
  background: rgba(63, 185, 80, 0.12);
  color: #3FB950;
  border: 1px solid rgba(63, 185, 80, 0.2);
}
.fault-active {
  background: rgba(210, 153, 34, 0.12);
  color: #D29922;
  border: 1px solid rgba(210, 153, 34, 0.3);
}
.sim-card-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.sim-fault-btn {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border: 1px solid var(--border, #30363D);
  border-radius: 3px;
  background: transparent;
  color: var(--text-secondary, #8B949E);
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: all 0.12s;
}
.sim-fault-btn:hover {
  border-color: var(--accent-bright, #3FB950);
  color: var(--text-primary, #F0F6FC);
}
.sim-fault-btn.fault-sensor-stuck:hover {
  border-color: #D29922;
  color: #D29922;
}
.sim-fault-btn.fault-device-offline:hover {
  border-color: #F85149;
  color: #F85149;
}
.sim-fault-btn.fault-clear:hover {
  border-color: #3FB950;
  color: #3FB950;
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
