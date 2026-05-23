// SimControlBar — Simulation control bar
// Start/Stop, speed control, E-Stop, scenario selector

export interface SimControlState {
  running: boolean;
  speed: number; // 1, 5, 10
  scenario: string;
  estopActive: boolean;
}

export const SCENARIOS: { value: string; label: string }[] = [
  { value: 'normal_day', label: 'Normal Day' },
  { value: 'heat_wave', label: 'Heat Wave' },
  { value: 'cold_snap', label: 'Cold Snap' },
  { value: 'pump_failure', label: 'Pump Failure' },
  { value: 'sensor_fault', label: 'Sensor Fault' },
  { value: 'recovery', label: 'Recovery' },
];

export const SPEEDS: { value: number; label: string }[] = [
  { value: 1, label: '1x' },
  { value: 5, label: '5x' },
  { value: 10, label: '10x' },
  { value: 60, label: '60x' },
];

export function renderSimControlBar(state: SimControlState): string {
  const scenarioOptions = SCENARIOS.map((s) =>
    `<option value="${escapeAttr(s.value)}" ${s.value === state.scenario ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');

  const speedButtons = SPEEDS.map((s) =>
    `<button class="sim-speed-btn ${s.value === state.speed ? 'active' : ''}" data-speed="${s.value}">${s.label}</button>`
  ).join('');

  const runStateClass = state.running ? 'sim-running' : 'sim-stopped';
  const estopClass = state.estopActive ? 'sim-estop-active' : 'sim-estop-inactive';

  return `
    <div class="sim-control-bar">
      <div class="sim-control-section">
        <button class="sim-run-btn ${runStateClass}" id="sim-toggle-run" title="${state.running ? 'Stop simulation' : 'Start simulation'}">
          <span class="sim-run-icon mono">${state.running ? '\u25A0' : '\u25B6'}</span>
          <span class="sim-run-label mono">${state.running ? 'STOP' : 'START'}</span>
        </button>

        <div class="sim-speed-group">
          <span class="sim-speed-label mono">SPEED</span>
          <div class="sim-speed-btns">
            ${speedButtons}
          </div>
        </div>
      </div>

      <div class="sim-control-section">
        <div class="sim-scenario-group">
          <label class="sim-scenario-label mono" for="sim-scenario-select">SCENARIO</label>
          <select class="sim-scenario-select mono" id="sim-scenario-select">
            ${scenarioOptions}
          </select>
        </div>
      </div>

      <div class="sim-control-section sim-control-right">
        <button class="sim-estop-btn ${estopClass}" id="sim-estop-toggle" title="${state.estopActive ? 'Clear E-Stop' : 'Activate E-Stop'}">
          <span class="sim-estop-icon mono">${state.estopActive ? '\u26D4' : '\u26A0'}</span>
          <span class="sim-estop-label mono">${state.estopActive ? 'E-STOP ACTIVE' : 'E-STOP'}</span>
        </button>
      </div>
    </div>
  `;
}

export function initSimControlBar(
  callbacks: {
    onToggleRun: () => void;
    onSpeedChange: (speed: number) => void;
    onScenarioChange: (scenario: string) => void;
    onEstopToggle: () => void;
  }
): void {
  injectSimControlBarStyles();

  const toggleBtn = document.getElementById('sim-toggle-run');
  toggleBtn?.addEventListener('click', callbacks.onToggleRun);

  document.querySelectorAll('.sim-speed-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = parseInt(btn.getAttribute('data-speed') || '1', 10);
      callbacks.onSpeedChange(speed);
    });
  });

  const scenarioSelect = document.getElementById('sim-scenario-select') as HTMLSelectElement;
  scenarioSelect?.addEventListener('change', () => {
    callbacks.onScenarioChange(scenarioSelect.value);
  });

  const estopBtn = document.getElementById('sim-estop-toggle');
  estopBtn?.addEventListener('click', callbacks.onEstopToggle);
}

export function renderSparklinesPanel(sensorData: Record<string, number[]>): string {
  const metrics = [
    { key: 'temperature', label: 'TEMP', unit: 'C', color: '#F59E0B' },
    { key: 'humidity', label: 'HUM', unit: '%', color: '#38BDF8' },
    { key: 'co2', label: 'CO2', unit: 'ppm', color: '#22C55E' },
    { key: 'soil_moisture', label: 'SOIL', unit: '%', color: '#EF4444' },
    { key: 'light', label: 'LIGHT', unit: 'lx', color: '#FACC15' },
    { key: 'water_level', label: 'H2O', unit: '%', color: '#2563EB' },
  ];

  const charts = metrics.map((m) => {
    const values = sensorData[m.key] || [];
    const sparkline = renderAsciiSparkline(values, m.color);
    const lastVal = values.length > 0 ? values[values.length - 1].toFixed(1) : '--';
    return `
      <div class="sim-sparkline-card">
        <div class="sim-sparkline-header">
          <span class="sim-sparkline-label mono">${m.label}</span>
          <span class="sim-sparkline-value mono" style="color: ${m.color}">${lastVal}${m.unit}</span>
        </div>
        <div class="sim-sparkline-chart mono" style="color: ${m.color}">${sparkline}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="sim-sensor-panel">
      <div class="sim-panel-header">
        <span class="sim-panel-title">Sensor Charts</span>
      </div>
      <div class="sim-sparklines-grid">
        ${charts}
      </div>
    </div>
  `;
}

function renderAsciiSparkline(values: number[], color: string): string {
  if (values.length < 2) return '<span class="sim-no-data">no data</span>';

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  // Map to 8 height levels using block characters
  const chars = [' ', '\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];

  // Take last 40 values
  const recent = values.slice(-40);
  return recent.map((v) => {
    const level = Math.round(((v - min) / range) * 8);
    return chars[Math.max(0, Math.min(8, level))];
  }).join('');
}

export function injectSimControlBarStyles(): void {
  if (document.getElementById('sim-control-bar-styles')) return;
  const style = document.createElement('style');
  style.id = 'sim-control-bar-styles';
  style.textContent = `
.sim-control-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: var(--bg-secondary, #161B22);
  border: 1px solid var(--border, #30363D);
  border-radius: 6px;
  flex-wrap: wrap;
}
.sim-control-section {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sim-control-right {
  margin-left: auto;
}
.sim-run-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border, #30363D);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: all 0.12s;
}
.sim-run-btn:hover { border-color: var(--accent-bright, #3FB950); }
.sim-running { border-color: #F85149; color: #F85149; }
.sim-stopped { border-color: #3FB950; color: #3FB950; }
.sim-run-icon { font-size: 14px; }
.sim-run-label { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; }

.sim-speed-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sim-speed-label {
  font-size: 9px;
  font-weight: 700;
  color: var(--text-tertiary, #484F58);
  letter-spacing: 0.06em;
}
.sim-speed-btns {
  display: flex;
  gap: 2px;
}
.sim-speed-btn {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border: 1px solid var(--border, #30363D);
  border-radius: 3px;
  background: transparent;
  color: var(--text-secondary, #8B949E);
  cursor: pointer;
  transition: all 0.12s;
}
.sim-speed-btn:hover { border-color: var(--accent-bright, #3FB950); color: var(--text-primary, #F0F6FC); }
.sim-speed-btn.active { background: rgba(56, 139, 253, 0.15); border-color: #388BFD; color: #58A6FF; }

.sim-scenario-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sim-scenario-label {
  font-size: 9px;
  font-weight: 700;
  color: var(--text-tertiary, #484F58);
  letter-spacing: 0.06em;
}
.sim-scenario-select {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 4px 8px;
  border: 1px solid var(--border, #30363D);
  border-radius: 4px;
  background: var(--bg-primary, #0D1117);
  color: var(--text-primary, #F0F6FC);
  cursor: pointer;
}
.sim-scenario-select:focus { outline: 2px solid var(--accent-bright, #3FB950); }

.sim-estop-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s;
  font-weight: 700;
}
.sim-estop-inactive {
  background: rgba(248, 81, 73, 0.1);
  border: 1px solid rgba(248, 81, 73, 0.3);
  color: #F85149;
}
.sim-estop-active {
  background: rgba(248, 81, 73, 0.25);
  border: 2px solid #F85149;
  color: #FFF;
  animation: estop-pulse 2s infinite;
}
@keyframes estop-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.sim-estop-icon { font-size: 14px; }
.sim-estop-label { font-size: 10px; letter-spacing: 0.05em; }

.sim-sensor-panel {
  background: var(--bg-secondary, #161B22);
  border: 1px solid var(--border, #30363D);
  border-radius: 6px;
  overflow: hidden;
}
.sim-panel-header {
  padding: 8px 12px;
  background: var(--bg-primary, #0D1117);
  border-bottom: 1px solid var(--border, #30363D);
}
.sim-panel-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary, #F0F6FC);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.sim-sparklines-grid {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sim-sparkline-card {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle, #21262D);
}
.sim-sparkline-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.sim-sparkline-label {
  font-size: 9px;
  font-weight: 700;
  color: var(--text-tertiary, #484F58);
  letter-spacing: 0.06em;
}
.sim-sparkline-value {
  font-size: 12px;
  font-weight: 700;
}
.sim-sparkline-chart {
  font-size: 8px;
  line-height: 1;
  letter-spacing: -1px;
  opacity: 0.8;
  overflow: hidden;
}
.sim-no-data {
  color: var(--text-tertiary, #484F58);
  font-size: 10px;
  font-style: italic;
}
.mono { font-family: var(--font-mono); }
`;
  document.head.appendChild(style);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch));
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch));
}
