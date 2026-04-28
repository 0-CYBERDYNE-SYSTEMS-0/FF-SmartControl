// Calibration view — per-device per-channel offset calibration (VAL-DISC-060 to VAL-DISC-063)
// calibrated_value = raw + offset

import { getStore, formatSensorValue } from '../store.js';
import { halApi, HalDevice, HalSensorReading } from '../api.js';
import { showToast } from '../components/Toast.js';
import { injectChartKitStyles } from '../components/ChartKit.js';

interface CalibrationDevice {
  device: HalDevice;
  rawValue: number | null;
  calibratedValue: number | null;
  offset: number;
  metric: string;
  unit: string;
}

export async function renderCalibration(container: HTMLElement): Promise<void> {
  const store = getStore();
  injectCalibrationStyles();
  injectChartKitStyles();

  // Get all sensor devices
  const sensors = store.devices.filter((d) => d.type === 'sensor');

  if (sensors.length === 0) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Calibration</h1>
          <p class="page-subtitle">Adjust sensor readings with offset</p>
        </div>
      </div>
      <div class="cal-empty-state">
        <div class="cal-empty-icon">⚙️</div>
        <p class="cal-empty-title">No sensors registered</p>
        <p class="cal-empty-desc">Add sensors from the Devices view to calibrate their readings.</p>
      </div>
    `;
    return;
  }

  // Build calibration data for each sensor
  const calibrationData: CalibrationDevice[] = sensors.map((sensor) => {
    const snap = store.sensors[sensor.id];
    const calibrationOffset = sensor.calibration_offset ?? 0;

    // Find the primary metric for this sensor
    let rawValue: number | null = null;
    let metric = 'temperature';
    let unit = '°C';

    if (snap?.temperature?.value != null) {
      rawValue = snap.temperature.value;
      metric = 'temperature';
      unit = '°C';
    } else if (snap?.humidity?.value != null) {
      rawValue = snap.humidity.value;
      metric = 'humidity';
      unit = '%';
    } else if (snap?.co2?.value != null) {
      rawValue = snap.co2.value;
      metric = 'co2';
      unit = 'ppm';
    } else if (snap?.soil_moisture?.value != null) {
      rawValue = snap.soil_moisture.value;
      metric = 'soil_moisture';
      unit = '%';
    } else if (snap?.light?.value != null) {
      rawValue = snap.light.value;
      metric = 'light';
      unit = 'lux';
    } else if (snap?.water_level?.value != null) {
      rawValue = snap.water_level.value;
      metric = 'water_level';
      unit = '%';
    } else if (snap?.ph?.value != null) {
      rawValue = snap.ph.value;
      metric = 'ph';
      unit = '';
    } else if (snap?.weight?.value != null) {
      rawValue = snap.weight.value;
      metric = 'weight';
      unit = 'kg';
    }

    return {
      device: sensor,
      rawValue,
      calibratedValue: rawValue !== null ? rawValue + calibrationOffset : null,
      offset: calibrationOffset,
      metric,
      unit,
    };
  });

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Calibration</h1>
        <p class="page-subtitle">Adjust sensor readings with offset · calibrated = raw + offset</p>
      </div>
    </div>

    <div class="cal-info-banner">
      <span class="cal-info-icon">ℹ️</span>
      <span>Enter a reference value from a calibrated instrument. The offset is calculated as <strong>reference − raw</strong> and applied to all readings.</span>
    </div>

    <div class="cal-grid" id="cal-grid">
      ${calibrationData.map((cd) => renderCalibrationCard(cd)).join('')}
    </div>
  `;

  attachCalibrationHandlers(calibrationData);
}

function renderCalibrationCard(cd: CalibrationDevice): string {
  const { device, rawValue, calibratedValue, offset, metric, unit } = cd;
  const hasData = rawValue !== null;

  const formattedRaw = hasData ? formatValue(rawValue!, unit) : '--';
  const formattedCalibrated = hasData
    ? formatValue(calibratedValue!, unit)
    : '--';
  const formattedOffset = offset !== 0 ? formatValue(offset, unit) : '0';

  return `
    <div class="cal-card" data-device-id="${device.id}">
      <div class="cal-card-header">
        <div class="cal-device-icon">${getDeviceIcon(device)}</div>
        <div class="cal-device-info">
          <div class="cal-device-name">${escapeHtml(device.name)}</div>
          <div class="cal-device-meta">
            <span class="hal-badge hal-badge-slate">${device.protocol}</span>
            ${(device as any).zone ? `<span class="cal-zone-tag">${escapeHtml((device as any).zone)}</span>` : ''}
          </div>
        </div>
        <div class="cal-status ${offset !== 0 ? 'calibrated' : ''}">
          ${offset !== 0 ? `<span class="cal-badge-active">Calibrated</span>` : `<span class="cal-badge-default">Default</span>`}
        </div>
      </div>

      <div class="cal-readings">
        <div class="cal-reading-block">
          <div class="cal-reading-label">Raw Reading</div>
          <div class="cal-reading-value cal-raw">${formattedRaw}</div>
        </div>
        <div class="cal-reading-arrow">→</div>
        <div class="cal-reading-block">
          <div class="cal-reading-label">Calibrated</div>
          <div class="cal-reading-value cal-calibrated">${formattedCalibrated}</div>
        </div>
      </div>

      <div class="cal-current-offset">
        <span class="cal-offset-label">Current offset:</span>
        <span class="cal-offset-value ${offset !== 0 ? 'has-offset' : ''}">${formattedOffset}</span>
      </div>

      <div class="cal-form">
        <div class="cal-form-row">
          <label class="cal-form-label" for="ref-${device.id}">Reference Value</label>
          <div class="cal-input-group">
            <input
              class="cal-input"
              type="number"
              id="ref-${device.id}"
              placeholder="Enter reference value"
              step="any"
              ${!hasData ? 'disabled' : ''}
            />
            <span class="cal-input-unit">${unit}</span>
          </div>
        </div>
        <div class="cal-form-actions">
          <button
            class="hal-btn-primary cal-apply-btn"
            data-device-id="${device.id}"
            data-raw-value="${rawValue}"
            data-metric="${metric}"
            data-unit="${unit}"
            ${!hasData ? 'disabled' : ''}
          >
            Apply Offset
          </button>
          <button
            class="hal-btn-secondary cal-reset-btn"
            data-device-id="${device.id}"
            ${offset === 0 ? 'disabled' : ''}
          >
            Reset to Zero
          </button>
        </div>
      </div>
    </div>
  `;
}

function attachCalibrationHandlers(calibrationData: CalibrationDevice[]): void {
  // Apply button handlers
  document.querySelectorAll('.cal-apply-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const el = btn as HTMLButtonElement;
      const deviceId = el.dataset.deviceId!;
      const rawValue = parseFloat(el.dataset.rawValue!);
      const unit = el.dataset.unit!;

      const inputEl = document.getElementById(
        `ref-${deviceId}`,
      ) as HTMLInputElement;
      const refValue = parseFloat(inputEl.value);

      if (isNaN(refValue)) {
        showToast('Please enter a valid reference value', 'warning');
        return;
      }

      // Calculate offset: reference - raw
      const offset = refValue - rawValue;

      try {
        await halApi.updateDeviceCalibration(deviceId, offset);
        showToast(
          `Calibration applied: offset = ${formatValue(offset, unit)}`,
          'success',
        );

        // Refresh data and re-render
        const { refreshHALData } = await import('../main.js');
        refreshHALData();

        const container = document.getElementById('view-container');
        if (container) {
          renderCalibration(container);
        }
      } catch (err: any) {
        showToast(`Failed: ${err.message}`, 'danger');
      }
    });
  });

  // Reset button handlers
  document.querySelectorAll('.cal-reset-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const el = btn as HTMLButtonElement;
      const deviceId = el.dataset.deviceId!;

      if (!confirm('Reset calibration offset to zero for this sensor?')) {
        return;
      }

      try {
        await halApi.updateDeviceCalibration(deviceId, 0);
        showToast('Calibration reset to zero', 'success');

        // Refresh data and re-render
        const { refreshHALData } = await import('../main.js');
        refreshHALData();

        const container = document.getElementById('view-container');
        if (container) {
          renderCalibration(container);
        }
      } catch (err: any) {
        showToast(`Failed: ${err.message}`, 'danger');
      }
    });
  });
}

function getDeviceIcon(device: HalDevice): string {
  switch (device.type) {
    case 'sensor':
      return '🌡️';
    case 'relay':
      return '🔌';
    case 'camera':
      return '📷';
    default:
      return '📟';
  }
}

function formatValue(value: number, unit: string): string {
  const precision = Math.abs(value) >= 100 ? 0 : value % 1 === 0 ? 0 : 2;
  return `${value.toFixed(precision)}${unit}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function injectCalibrationStyles(): void {
  if (document.getElementById('hal-calibration-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-calibration-styles';
  style.textContent = `
.cal-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}
.cal-empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}
.cal-empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}
.cal-empty-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  max-width: 400px;
}

.cal-info-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-secondary));
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
  border-radius: var(--radius-md);
  margin-bottom: 24px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.cal-info-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}
.cal-info-banner strong {
  color: var(--text-primary);
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.cal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cal-card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.cal-device-icon {
  font-size: 28px;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.cal-device-info {
  flex: 1;
  min-width: 0;
}

.cal-device-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cal-device-meta {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.cal-zone-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.cal-status {
  flex-shrink: 0;
}

.cal-badge-active {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--accent) 20%, var(--bg-tertiary));
  color: var(--accent-bright);
  border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border));
}

.cal-badge-default {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.cal-readings {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.cal-reading-block {
  text-align: center;
  flex: 1;
}

.cal-reading-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}

.cal-reading-value {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 600;
}

.cal-raw {
  color: var(--text-secondary);
}

.cal-calibrated {
  color: var(--accent-bright);
}

.cal-reading-arrow {
  font-size: 20px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.cal-current-offset {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.cal-offset-label {
  color: var(--text-secondary);
}

.cal-offset-value {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-tertiary);
}

.cal-offset-value.has-offset {
  color: var(--accent-bright);
}

.cal-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
  border-top: 1px solid var(--border-subtle);
}

.cal-form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cal-form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.cal-input-group {
  display: flex;
  align-items: center;
  gap: 0;
}

.cal-input {
  flex: 1;
  height: 36px;
  padding: 0 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 14px;
  outline: none;
  min-width: 0;
}

.cal-input:focus {
  border-color: var(--accent);
}

.cal-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cal-input-unit {
  height: 36px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-left: none;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.cal-form-actions {
  display: flex;
  gap: 8px;
}

.cal-apply-btn,
.cal-reset-btn {
  flex: 1;
  height: 36px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
}

.cal-apply-btn {
  background: var(--accent);
  color: var(--on-accent);
}

.cal-apply-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}

.cal-apply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cal-reset-btn {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.cal-reset-btn:hover:not(:disabled) {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.cal-reset-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .cal-grid {
    grid-template-columns: 1fr;
  }
  .cal-readings {
    flex-direction: column;
    gap: 8px;
  }
  .cal-reading-arrow {
    transform: rotate(90deg);
  }
}
`;
  document.head.appendChild(style);
}
