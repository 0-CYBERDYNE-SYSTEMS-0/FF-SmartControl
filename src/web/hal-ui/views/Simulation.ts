// Simulation view — Real-time telemetry simulation dashboard
// Device cards + network activity log + sensor charts + scenario control

import {
  renderSimDeviceCard,
  injectSimDeviceCardStyles,
  type SimDevice,
} from '../components/SimDeviceCard.js';
import {
  renderSimNetworkLog,
  injectSimNetworkLogStyles,
  setServerLogEntries,
  type SimLogEntry,
} from '../components/SimNetworkLog.js';
import {
  renderSimControlBar,
  renderSparklinesPanel,
  initSimControlBar,
  injectSimControlBarStyles,
  SCENARIOS,
  type SimControlState,
} from '../components/SimControlBar.js';

// In-memory sensor data for sparklines (last 100 readings)
const sensorHistory: Record<string, number[]> = {
  temperature: [],
  humidity: [],
  co2: [],
  soil_moisture: [],
  light: [],
  water_level: [],
};
const MAX_HISTORY = 100;

// Default simulated devices
const DEFAULT_DEVICES: SimDevice[] = [
  { id: 'grow_light_main', label: 'Grow Light (Main)', protocol: 'tasmota', state: 'off', power: 600, host: '192.168.1.101' },
  { id: 'exhaust_fan', label: 'Exhaust Fan', protocol: 'shelly', state: 'off', power: 80, host: '192.168.1.102' },
  { id: 'humidifier', label: 'Humidifier', protocol: 'shelly', state: 'off', power: 200, host: '192.168.1.103' },
  { id: 'water_pump', label: 'Water Pump', protocol: 'tasmota', state: 'off', power: 45, host: '192.168.1.104' },
  { id: 'heater_plug', label: 'Heater Plug', protocol: 'kasa', state: 'off', power: 1500, host: '192.168.1.105' },
  { id: 'dehumidifier_plug', label: 'Dehumidifier Plug', protocol: 'kasa', state: 'off', power: 300, host: '192.168.1.106' },
  { id: 'tent_a_temp_1', label: 'Tent A Temp #1 (Canopy)', protocol: 'mqtt', state: 'unknown', host: 'mqtt://localhost' },
  { id: 'tent_b_temp_1', label: 'Tent B Temp #1 (Canopy)', protocol: 'mqtt', state: 'unknown', host: 'mqtt://localhost' },
  { id: 'tent_a_load_cell_1', label: 'Tent A Load Cell #1', protocol: 'serial', state: 'unknown', host: '/dev/ttyUSB0' },
  { id: 'tent_b_load_cell_1', label: 'Tent B Load Cell #1', protocol: 'serial', state: 'unknown', host: '/dev/ttyUSB1' },
];

let simDevices: SimDevice[] = [...DEFAULT_DEVICES];
let simControl: SimControlState = {
  running: false,
  speed: 1,
  scenario: 'normal_day',
  estopActive: false,
};
let sseSource: EventSource | null = null;
let refreshInterval: ReturnType<typeof setInterval> | null = null;

export async function renderSimulation(container: HTMLElement): Promise<void> {
  injectSimDeviceCardStyles();
  injectSimNetworkLogStyles();
  injectSimControlBarStyles();

  // Fetch initial status
  try {
    await refreshSimStatus();
  } catch {
    // If status fetch fails, show default
    simControl.running = false;
  }

  container.innerHTML = `
    <div class="sim-dashboard">
      <div class="sim-top-bar">
        ${renderSimControlBar(simControl)}
      </div>
      <div class="sim-grid">
        <div class="sim-panel sim-devices-panel" id="sim-devices-panel">
          <div class="sim-panel-header">
            <span class="sim-panel-title">Device Cards</span>
            <span class="sim-panel-count mono">${simDevices.length}</span>
          </div>
          <div class="sim-devices-grid" id="sim-devices-grid">
            ${simDevices.map((d) => renderSimDeviceCard(d)).join('')}
          </div>
        </div>
        <div class="sim-panel sim-log-panel" id="sim-log-panel">
          ${renderSimNetworkLog()}
        </div>
        <div class="sim-panel sim-sensors-panel" id="sim-sensors-panel">
          ${renderSparklinesPanel(sensorHistory)}
        </div>
      </div>
    </div>
  `;

  // Initialize control bar
  initSimControlBar({
    onToggleRun: handleToggleRun,
    onSpeedChange: handleSpeedChange,
    onScenarioChange: handleScenarioChange,
    onEstopToggle: handleEstopToggle,
  });

  // Attach fault button handlers
  attachFaultButtonHandlers();

  // Start SSE stream for live data
  startSimStream();
}

export function refreshSimulationLiveData(): void {
  // Update device cards in-place
  const devicesGrid = document.getElementById('sim-devices-grid');
  if (devicesGrid) {
    devicesGrid.innerHTML = simDevices.map((d) => renderSimDeviceCard(d)).join('');
  }

  // Update network log
  const logPanel = document.getElementById('sim-log-panel');
  if (logPanel) {
    logPanel.innerHTML = renderSimNetworkLog();
  }

  // Update sensor charts
  const sensorsPanel = document.getElementById('sim-sensors-panel');
  if (sensorsPanel) {
    sensorsPanel.innerHTML = renderSparklinesPanel(sensorHistory);
  }

  // Re-attach fault handlers
  attachFaultButtonHandlers();
}

export function cleanupSimStream(): void {
  sseSource?.close();
  sseSource = null;
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

async function refreshSimStatus(): Promise<void> {
  try {
    const resp = await fetch('/api/hal/sim/status');
    if (!resp.ok) return;
    const status = await resp.json();
    simControl.running = status.running ?? false;
    simControl.speed = status.speed ?? 1;
    simControl.scenario = status.scenario ?? 'normal_day';

    // Update devices from status
    if (status.devices && Array.isArray(status.devices)) {
      for (const sd of status.devices) {
        const existing = simDevices.find((d) => d.id === sd.id);
        if (existing) {
          existing.state = sd.state || 'unknown';
          if (sd.power != null) existing.power = sd.power;
          if (sd.lastLatencyMs != null) existing.lastLatencyMs = sd.lastLatencyMs;
        }
      }
    }

    // Update sensor history from zones
    if (status.zones && Array.isArray(status.zones)) {
      // Average across zones for sparklines
      for (const metric of ['temperature', 'humidity', 'co2', 'light', 'water_level'] as const) {
        const vals = status.zones.map((z: any) => z[metric]).filter((v: any) => v != null);
        if (vals.length > 0) {
          const avg = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
          pushMetric(metric, avg);
        }
      }
      if (status.zones[0]?.soilMoisture != null) {
        pushMetric('soil_moisture', status.zones[0].soilMoisture);
      }
    }

    // Update faults
    if (status.faults) {
      updateDeviceFaults(status.faults);
    }
  } catch {
    // Ignore fetch errors
  }
}

function pushMetric(metric: string, value: number): void {
  if (!sensorHistory[metric]) sensorHistory[metric] = [];
  sensorHistory[metric].push(value);
  if (sensorHistory[metric].length > MAX_HISTORY) {
    sensorHistory[metric] = sensorHistory[metric].slice(-MAX_HISTORY);
  }
}

function updateDeviceFaults(faults: any): void {
  for (const device of simDevices) {
    device.faultInjected = false;
    device.faultType = undefined;
  }

  if (faults.sensorStuck && Array.isArray(faults.sensorStuck)) {
    for (const stuck of faults.sensorStuck) {
      const [deviceId] = stuck.split(':');
      const dev = simDevices.find((d) => d.id === deviceId);
      if (dev) { dev.faultInjected = true; dev.faultType = 'sensor_stuck'; }
    }
  }
  if (faults.deviceOffline && Array.isArray(faults.deviceOffline)) {
    for (const offlineId of faults.deviceOffline) {
      const dev = simDevices.find((d) => d.id === offlineId);
      if (dev) { dev.faultInjected = true; dev.faultType = 'device_offline'; }
    }
  }
  if (faults.badCalibration && Array.isArray(faults.badCalibration)) {
    for (const cal of faults.badCalibration) {
      const [deviceId] = cal.split(':');
      const dev = simDevices.find((d) => d.id === deviceId);
      if (dev) { dev.faultInjected = true; dev.faultType = dev.faultType ? `${dev.faultType}, bad_cal` : 'bad_cal'; }
    }
  }
  if (faults.networkFlap) {
    for (const device of simDevices) {
      if (!device.faultInjected) {
        device.faultInjected = true;
        device.faultType = 'network_flap';
      }
    }
  }
  if (faults.delayedTelemetry) {
    for (const device of simDevices) {
      if (!device.faultInjected) {
        device.faultInjected = true;
        device.faultType = 'delayed_tlm';
      }
    }
  }
}

function startSimStream(): void {
  if (typeof EventSource === 'undefined') {
    // Fallback to polling
    refreshInterval = setInterval(() => {
      refreshSimStatus().then(() => refreshSimulationLiveData());
    }, 2000);
    return;
  }

  sseSource = new EventSource('/api/hal/sim/sse');
  sseSource.addEventListener('status', (event) => {
    try {
      const status = JSON.parse((event as MessageEvent<string>).data);
      simControl.running = status.running ?? false;
      simControl.speed = status.speed ?? 1;
      simControl.scenario = status.scenario ?? 'normal_day';

      if (status.devices) {
        for (const sd of status.devices) {
          const existing = simDevices.find((d) => d.id === sd.id);
          if (existing) {
            existing.state = sd.state || 'unknown';
            if (sd.power != null) existing.power = sd.power;
            if (sd.lastLatencyMs != null) existing.lastLatencyMs = sd.lastLatencyMs;
          }
        }
      }

      if (status.zones) {
        for (const metric of ['temperature', 'humidity', 'co2', 'light', 'water_level'] as const) {
          const vals = status.zones.map((z: any) => z[metric]).filter((v: any) => v != null);
          if (vals.length > 0) {
            const avg = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
            pushMetric(metric, avg);
          }
        }
        if (status.zones[0]?.soilMoisture != null) {
          pushMetric('soil_moisture', status.zones[0].soilMoisture);
        }
      }

      if (status.faults) updateDeviceFaults(status.faults);

      refreshSimulationLiveData();
    } catch {
      // Ignore parse errors
    }
  });

  sseSource.addEventListener('log', (event) => {
    try {
      const data = JSON.parse((event as MessageEvent<string>).data);
      if (data.entries && Array.isArray(data.entries)) {
        setServerLogEntries(data.entries);
        refreshSimulationLiveData();
      }
    } catch {
      // Ignore parse errors
    }
  });

  sseSource.onerror = () => {
    sseSource?.close();
    sseSource = null;
    // Start polling as fallback
    if (!refreshInterval) {
      refreshInterval = setInterval(() => {
        refreshSimStatus().then(() => refreshSimulationLiveData());
      }, 2000);
    }
  };
}

async function handleToggleRun(): Promise<void> {
  try {
    if (simControl.running) {
      await fetch('/api/hal/sim/stop', { method: 'POST' });
      simControl.running = false;
    } else {
      await fetch('/api/hal/sim/start', { method: 'POST' });
      simControl.running = true;
    }
    // Update control bar
    const topBar = document.querySelector('.sim-top-bar');
    if (topBar) {
      topBar.innerHTML = renderSimControlBar(simControl);
      initSimControlBar({
        onToggleRun: handleToggleRun,
        onSpeedChange: handleSpeedChange,
        onScenarioChange: handleScenarioChange,
        onEstopToggle: handleEstopToggle,
      });
    }
  } catch (err) {
    console.error('Failed to toggle simulation:', err);
  }
}

async function handleSpeedChange(speed: number): Promise<void> {
  try {
    await fetch('/api/hal/sim/speed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed }),
    });
    simControl.speed = speed;
    const topBar = document.querySelector('.sim-top-bar');
    if (topBar) {
      topBar.innerHTML = renderSimControlBar(simControl);
      initSimControlBar({
        onToggleRun: handleToggleRun,
        onSpeedChange: handleSpeedChange,
        onScenarioChange: handleScenarioChange,
        onEstopToggle: handleEstopToggle,
      });
    }
  } catch (err) {
    console.error('Failed to change speed:', err);
  }
}

async function handleScenarioChange(scenario: string): Promise<void> {
  try {
    // Stop current sim, change scenario, restart
    await fetch('/api/hal/sim/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });
    simControl.scenario = scenario;
    await refreshSimStatus();
    refreshSimulationLiveData();
  } catch (err) {
    console.error('Failed to change scenario:', err);
  }
}

async function handleEstopToggle(): Promise<void> {
  try {
    if (simControl.estopActive) {
      await fetch('/api/hal/estop/clear', { method: 'POST' });
      simControl.estopActive = false;
    } else {
      await fetch('/api/hal/estop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'operator', reasonText: 'Simulation E-Stop' }),
      });
      simControl.estopActive = true;
    }
    const topBar = document.querySelector('.sim-top-bar');
    if (topBar) {
      topBar.innerHTML = renderSimControlBar(simControl);
      initSimControlBar({
        onToggleRun: handleToggleRun,
        onSpeedChange: handleSpeedChange,
        onScenarioChange: handleScenarioChange,
        onEstopToggle: handleEstopToggle,
      });
    }
  } catch (err) {
    console.error('Failed to toggle E-Stop:', err);
  }
}

function attachFaultButtonHandlers(): void {
  document.querySelectorAll('.sim-fault-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const device = btn.getAttribute('data-device');
      const fault = btn.getAttribute('data-fault');
      if (!device) return;

      try {
        if (fault === 'clear') {
          // Clear all faults
          await fetch('/api/hal/sim/fault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fault: 'clear' }),
          });
        } else {
          // Inject fault
          await fetch('/api/hal/sim/fault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fault, device }),
          });
        }
        await refreshSimStatus();
        refreshSimulationLiveData();
      } catch (err) {
        console.error('Failed to inject fault:', err);
      }
    });
  });
}
