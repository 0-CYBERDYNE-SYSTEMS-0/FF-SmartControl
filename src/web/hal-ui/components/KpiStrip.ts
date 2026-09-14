// KPI Strip — 6 cards with big numbers, inline sparklines from real sensor history

import { getStore, formatSensorValue } from '../store.js';
import { halApi, type HalSensorReading } from '../api.js';
import { renderSparkline } from './HeroChart.js';
import { injectHeroChartStyles } from './HeroChart.js';

export interface KpiData {
  label: string;
  value: number;
  unit: string;
  precision: number;
  status: 'good' | 'warning' | 'critical';
  sparklineData: number[];
  sparklineColor: string;
  comparison?: { delta: number; label: string };
}

export function renderKpiStrip(kpis: KpiData[]): string {
  injectHeroChartStyles();

  if (kpis.length === 0) {
    return '<div class="kpi-strip-empty">No KPI data available</div>';
  }

  const cards = kpis
    .map((kpi) => {
      const statusColor =
        kpi.status === 'good'
          ? 'var(--success)'
          : kpi.status === 'warning'
            ? 'var(--warning)'
            : 'var(--danger)';
      const trend =
        kpi.sparklineData.length >= 2
          ? kpi.sparklineData[kpi.sparklineData.length - 1] -
            kpi.sparklineData[0]
          : 0;
      const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';

      const comp = kpi.comparison;
      const compHtml = comp
        ? `<span class="kpi-comparison ${comp.delta >= 0 ? 'up' : 'down'}">${comp.delta >= 0 ? '+' : ''}${comp.delta.toFixed(1)}% ${comp.label}</span>`
        : '';

      const hasData = kpi.sparklineData.length > 0 || kpi.value !== 0;
      const displayValue = hasData
        ? `${kpi.value.toFixed(kpi.precision)}<span class="kpi-unit">${kpi.unit}</span>`
        : '<span class="kpi-no-data">No data</span>';
      const displayColor = hasData ? statusColor : 'var(--text-tertiary)';

      return `
      <div class="kpi-card" style="--kpi-accent: ${statusColor}">
        <div class="kpi-header">
          <span class="kpi-label">${kpi.label}</span>
          <span class="kpi-trend" style="color: ${displayColor}">${trendIcon}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value text-mono" style="color: ${displayColor}">
            ${displayValue}
          </span>
        </div>
        ${hasData ? compHtml : ''}
        <div class="kpi-sparkline">
          ${hasData ? renderSparkline(kpi.sparklineData, statusColor) : '<div class="kpi-sparkline-empty"></div>'}
        </div>
      </div>
    `;
    })
    .join('');

  return `<div class="kpi-strip">${cards}</div>`;
}

export async function buildKpiData(): Promise<KpiData[]> {
  const store = getStore();
  const sensors = store.devices.filter((d) => d.type === 'sensor');
  const relays = store.devices.filter(
    (d) => d.type === 'relay' || d.type === 'smart_plug',
  );
  const activeRelays = relays.filter((d) => d.state === 'on');
  const onlineDevices = store.devices.filter((d) => d.online).length;

  // Fetch real 24h history for sparklines in parallel
  const [tempHistory, humHistory, co2History, soilHistory, lightHistory] =
    await Promise.all([
      fetchMetricSparkline(sensors, 'temperature', 12),
      fetchMetricSparkline(sensors, 'humidity', 12),
      fetchMetricSparkline(sensors, 'co2', 12),
      fetchMetricSparkline(sensors, 'soil_moisture', 12),
      fetchMetricSparkline(sensors, 'light', 12),
    ]);

  // Fetch 24h-48h history for comparison
  const [tempPrev, humPrev, co2Prev, soilPrev, lightPrev] = await Promise.all([
    fetchMetricSparklinePrev(sensors, 'temperature', 12),
    fetchMetricSparklinePrev(sensors, 'humidity', 12),
    fetchMetricSparklinePrev(sensors, 'co2', 12),
    fetchMetricSparklinePrev(sensors, 'soil_moisture', 12),
    fetchMetricSparklinePrev(sensors, 'light', 12),
  ]);

  const kpis: KpiData[] = [];

  // Power Now — count of active relays
  kpis.push({
    label: 'Power Now',
    value: activeRelays.length,
    unit: 'ON',
    precision: 0,
    status: activeRelays.length > 0 ? 'good' : 'warning',
    sparklineData: [],
    sparklineColor: 'var(--accent)',
  });

  // Temperature — average from sensors with real history sparkline
  let tempSum = 0,
    tempCount = 0;
  for (const s of sensors) {
    const snap = store.sensors[s.id];
    if (snap?.temperature?.value != null) {
      const converted = formatSensorValue(
        snap.temperature.value,
        'temperature',
        store.unitSystem,
      );
      tempSum += converted.value;
      tempCount++;
    }
  }
  const avgTemp = tempCount > 0 ? tempSum / tempCount : 0;
  const tempComp = computeComparison(tempHistory, tempPrev);
  const hasTemp = tempCount > 0;
  kpis.push({
    label: 'Temperature',
    value: hasTemp ? avgTemp : 0,
    unit: formatSensorValue(0, 'temperature', store.unitSystem).unit,
    precision: 1,
    status: hasTemp
      ? avgTemp >= 18 && avgTemp <= 28
        ? 'good'
        : avgTemp >= 15 && avgTemp <= 32
          ? 'warning'
          : 'critical'
      : 'good',
    sparklineData:
      tempHistory.length > 1
        ? tempHistory
        : hasTemp
          ? []
          : [],
    sparklineColor: hasTemp ? '#F59E0B' : 'var(--text-tertiary)',
    comparison: tempComp,
  });

  // Humidity — average from sensors
  let humSum = 0,
    humCount = 0;
  for (const s of sensors) {
    const snap = store.sensors[s.id];
    if (snap?.humidity?.value != null) {
      humSum += snap.humidity.value;
      humCount++;
    }
  }
  const avgHum = humCount > 0 ? humSum / humCount : 0;
  const humComp = computeComparison(humHistory, humPrev);
  const hasHum = humCount > 0;
  kpis.push({
    label: 'Humidity',
    value: hasHum ? avgHum : 0,
    unit: '%',
    precision: 0,
    status: hasHum
      ? avgHum >= 40 && avgHum <= 70
        ? 'good'
        : avgHum >= 30 && avgHum <= 80
          ? 'warning'
          : 'critical'
      : 'good',
    sparklineData:
      humHistory.length > 1
        ? humHistory
        : hasHum
          ? []
          : [],
    sparklineColor: hasHum ? '#38BDF8' : 'var(--text-tertiary)',
    comparison: humComp,
  });

  // Soil Moisture — average from sensors
  let soilSum = 0,
    soilCount = 0;
  for (const s of sensors) {
    const snap = store.sensors[s.id];
    if (snap?.soil_moisture?.value != null) {
      soilSum += snap.soil_moisture.value;
      soilCount++;
    }
  }
  const avgSoil = soilCount > 0 ? soilSum / soilCount : 0;
  const soilComp = computeComparison(soilHistory, soilPrev);
  const hasSoil = soilCount > 0;
  kpis.push({
    label: 'Soil Moisture',
    value: hasSoil ? avgSoil : 0,
    unit: '%',
    precision: 0,
    status: hasSoil
      ? avgSoil >= 30 && avgSoil <= 70
        ? 'good'
        : avgSoil >= 20 && avgSoil <= 80
          ? 'warning'
          : 'critical'
      : 'good',
    sparklineData:
      soilHistory.length > 1
        ? soilHistory
        : hasSoil
          ? []
          : [],
    sparklineColor: hasSoil ? '#EF4444' : 'var(--text-tertiary)',
    comparison: soilComp,
  });

  // Light — average from sensors
  let lightSum = 0,
    lightCount = 0;
  for (const s of sensors) {
    const snap = store.sensors[s.id];
    if (snap?.light?.value != null) {
      lightSum += snap.light.value;
      lightCount++;
    }
  }
  const avgLight = lightCount > 0 ? lightSum / lightCount : 0;
  const lightComp = computeComparison(lightHistory, lightPrev);
  const hasLight = lightCount > 0;
  kpis.push({
    label: 'Light',
    value: hasLight ? avgLight : 0,
    unit: 'lux',
    precision: 0,
    status: hasLight
      ? avgLight >= 10000 && avgLight <= 50000
        ? 'good'
        : avgLight >= 5000 && avgLight <= 70000
          ? 'warning'
          : 'critical'
      : 'good',
    sparklineData:
      lightHistory.length > 1
        ? lightHistory
        : hasLight
          ? []
          : [],
    sparklineColor: hasLight ? '#FACC15' : 'var(--text-tertiary)',
    comparison: lightComp,
  });

  // CO2 — from sensor snapshots or history
  let co2Sum = 0,
    co2Count = 0;
  for (const s of sensors) {
    const snap = store.sensors[s.id];
    if (snap?.co2?.value != null) {
      co2Sum += snap.co2.value;
      co2Count++;
    }
  }
  const avgCo2 = co2Count > 0 ? co2Sum / co2Count : 0;
  const co2Comp = computeComparison(co2History, co2Prev);
  const hasCo2 = co2Count > 0;
  kpis.push({
    label: 'CO₂',
    value: hasCo2 ? avgCo2 : 0,
    unit: 'ppm',
    precision: 0,
    status: hasCo2
      ? avgCo2 < 1000
        ? 'good'
        : avgCo2 < 1500
          ? 'warning'
          : 'critical'
      : 'good',
    sparklineData:
      co2History.length > 1
        ? co2History
        : hasCo2
          ? []
          : [],
    sparklineColor: hasCo2 ? '#22C55E' : 'var(--text-tertiary)',
    comparison: co2Comp,
  });

  return kpis;
}

async function fetchMetricSparkline(
  sensors: ReturnType<typeof getStore>['devices'],
  metric: string,
  buckets = 12,
): Promise<number[]> {
  if (sensors.length === 0) return [];
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date().toISOString();

  try {
    const historyMap = await halApi.getSensorHistoryBatch(
      sensors.map((s) => s.id),
      [metric],
      from,
      to,
    );
    for (const s of sensors) {
      const data = historyMap.get(`${s.id}|${metric}`) ?? [];
      if (data.length > 1) {
        const step = Math.max(1, Math.floor(data.length / buckets));
        return Array.from(
          { length: Math.min(buckets, data.length) },
          (_, i) => data[Math.min(i * step, data.length - 1)].value,
        );
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

async function fetchMetricSparklinePrev(
  sensors: ReturnType<typeof getStore>['devices'],
  metric: string,
  buckets = 12,
): Promise<number[]> {
  if (sensors.length === 0) return [];
  const to = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const from = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  try {
    const historyMap = await halApi.getSensorHistoryBatch(
      sensors.map((s) => s.id),
      [metric],
      from,
      to,
    );
    for (const s of sensors) {
      const data = historyMap.get(`${s.id}|${metric}`) ?? [];
      if (data.length > 1) {
        const step = Math.max(1, Math.floor(data.length / buckets));
        return Array.from(
          { length: Math.min(buckets, data.length) },
          (_, i) => data[Math.min(i * step, data.length - 1)].value,
        );
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

function computeComparison(
  current: number[],
  previous: number[],
): { delta: number; label: string } | undefined {
  if (current.length === 0 || previous.length === 0) return undefined;
  const currAvg = current.reduce((a, b) => a + b, 0) / current.length;
  const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
  if (prevAvg === 0) return undefined;
  const delta = ((currAvg - prevAvg) / Math.abs(prevAvg)) * 100;
  return { delta, label: 'vs yesterday' };
}


export function injectKpiStyles(): void {
  if (document.getElementById('hal-kpi-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-kpi-styles';
  style.textContent = `
.kpi-strip {
  display: grid;
  /* Exactly 6 KPIs — use divisor-of-6 column counts (6/3/2/1) so every row is
     always full at every width: no orphaned card, no blank trailing cells.
     minmax(0,1fr) lets tracks shrink below content (which wraps) instead of
     content forcing a wider track and collapsing the column count. */
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-auto-rows: minmax(80px, auto);
  align-items: stretch;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}
.kpi-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  border-left: 3px solid var(--kpi-accent);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-1);
  min-height: 80px;
  min-width: 0;
  transition: border-color var(--transition-fast);
}
.kpi-card:hover {
  border-color: var(--kpi-accent);
}
.kpi-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.kpi-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.kpi-trend {
  font-size: 12px;
  font-weight: 700;
}
.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.kpi-value {
  font-size: clamp(22px, 4vw, 28px);
  font-weight: 600;
  line-height: 1;
  overflow-wrap: anywhere;
}
.kpi-unit {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 2px;
}
.kpi-sparkline {
  margin-top: auto;
  opacity: 0.7;
}
.kpi-comparison {
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
  margin-top: -4px;
  overflow-wrap: anywhere;
}
.kpi-comparison.up {
  color: var(--success);
}
.kpi-comparison.down {
  color: var(--danger);
}
.kpi-no-data {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-tertiary);
}
.kpi-sparkline-empty {
  height: 28px;
}
@media (max-width: 1100px) {
  .kpi-strip { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .kpi-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 380px) {
  .kpi-strip { grid-template-columns: 1fr; }
}
`;
  document.head.appendChild(style);
}
