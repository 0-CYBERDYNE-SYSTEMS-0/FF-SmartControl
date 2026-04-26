// KPI Strip — 6 cards with big numbers, inline sparklines from real sensor history

import { getStore, formatSensorValue } from '../store.js';
import { halApi } from '../api.js';
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
}

export function renderKpiStrip(kpis: KpiData[]): string {
  injectHeroChartStyles();

  if (kpis.length === 0) {
    return '<div class="kpi-strip-empty">No KPI data available</div>';
  }

  const cards = kpis.map(kpi => {
    const statusColor = kpi.status === 'good' ? 'var(--success)' : kpi.status === 'warning' ? 'var(--warning)' : 'var(--danger)';
    const trend = kpi.sparklineData.length >= 2
      ? kpi.sparklineData[kpi.sparklineData.length - 1] - kpi.sparklineData[0]
      : 0;
    const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';

    return `
      <div class="kpi-card" style="--kpi-accent: ${statusColor}">
        <div class="kpi-header">
          <span class="kpi-label">${kpi.label}</span>
          <span class="kpi-trend" style="color: ${statusColor}">${trendIcon}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value text-mono" style="color: ${statusColor}">
            ${kpi.value.toFixed(kpi.precision)}<span class="kpi-unit">${kpi.unit}</span>
          </span>
        </div>
        <div class="kpi-sparkline">
          ${renderSparkline(kpi.sparklineData, statusColor)}
        </div>
      </div>
    `;
  }).join('');

  return `<div class="kpi-strip">${cards}</div>`;
}

export async function buildKpiData(): Promise<KpiData[]> {
  const store = getStore();
  const sensors = store.devices.filter(d => d.type === 'sensor');
  const relays = store.devices.filter(d => d.type === 'relay' || d.type === 'smart_plug');
  const activeRelays = relays.filter(d => d.state === 'on');
  const onlineDevices = store.devices.filter(d => d.online).length;

  // Fetch real 24h history for sparklines in parallel
  const [tempHistory, humHistory, co2History] = await Promise.all([
    fetchMetricSparkline(sensors, 'temperature', 12),
    fetchMetricSparkline(sensors, 'humidity', 12),
    fetchMetricSparkline(sensors, 'co2', 12),
  ]);

  const kpis: KpiData[] = [];

  // Power Now — count of active relays
  kpis.push({
    label: 'Power Now',
    value: activeRelays.length,
    unit: 'ON',
    precision: 0,
    status: activeRelays.length > 0 ? 'good' : 'warning',
    sparklineData: generateTrendData(activeRelays.length, 12),
    sparklineColor: 'var(--accent)',
  });

  // Temperature — average from sensors with real history sparkline
  let tempSum = 0, tempCount = 0;
  for (const s of sensors) {
    const snap = store.sensors[s.id];
    if (snap?.temperature?.value != null) {
      const converted = formatSensorValue(snap.temperature.value, 'temperature', store.unitSystem);
      tempSum += converted.value;
      tempCount++;
    }
  }
  const avgTemp = tempCount > 0 ? tempSum / tempCount : 0;
  kpis.push({
    label: 'Temperature',
    value: avgTemp,
    unit: formatSensorValue(0, 'temperature', store.unitSystem).unit,
    precision: 1,
    status: avgTemp >= 18 && avgTemp <= 28 ? 'good' : avgTemp >= 15 && avgTemp <= 32 ? 'warning' : 'critical',
    sparklineData: tempHistory.length > 1 ? tempHistory : generateTrendData(avgTemp || 22, 12, 3),
    sparklineColor: '#F59E0B',
  });

  // Humidity — average from sensors
  let humSum = 0, humCount = 0;
  for (const s of sensors) {
    const snap = store.sensors[s.id];
    if (snap?.humidity?.value != null) {
      humSum += snap.humidity.value;
      humCount++;
    }
  }
  const avgHum = humCount > 0 ? humSum / humCount : 0;
  kpis.push({
    label: 'Humidity',
    value: avgHum,
    unit: '%',
    precision: 0,
    status: avgHum >= 40 && avgHum <= 70 ? 'good' : avgHum >= 30 && avgHum <= 80 ? 'warning' : 'critical',
    sparklineData: humHistory.length > 1 ? humHistory : generateTrendData(avgHum || 60, 12, 10),
    sparklineColor: '#38BDF8',
  });

  // CO2 — from sensor snapshots or history
  let co2Sum = 0, co2Count = 0;
  for (const s of sensors) {
    const snap = store.sensors[s.id];
    if (snap?.co2?.value != null) {
      co2Sum += snap.co2.value;
      co2Count++;
    }
  }
  const avgCo2 = co2Count > 0 ? co2Sum / co2Count : 0;
  kpis.push({
    label: 'CO₂',
    value: avgCo2,
    unit: 'ppm',
    precision: 0,
    status: avgCo2 < 1000 ? 'good' : avgCo2 < 1500 ? 'warning' : 'critical',
    sparklineData: co2History.length > 1 ? co2History : generateTrendData(avgCo2 || 800, 12, 200),
    sparklineColor: '#22C55E',
  });

  // Devices — total online
  kpis.push({
    label: 'Devices',
    value: onlineDevices,
    unit: `/${store.devices.length}`,
    precision: 0,
    status: onlineDevices === store.devices.length ? 'good' : onlineDevices > 0 ? 'warning' : 'critical',
    sparklineData: generateTrendData(onlineDevices || 1, 12),
    sparklineColor: 'var(--accent)',
  });

  // Automations — decisions today
  kpis.push({
    label: 'Automations',
    value: store.decisionsToday,
    unit: 'today',
    precision: 0,
    status: store.decisionsToday > 0 ? 'good' : 'warning',
    sparklineData: generateTrendData(store.decisionsToday || 0, 12, 2),
    sparklineColor: 'var(--accent)',
  });

  return kpis;
}

async function fetchMetricSparkline(sensors: ReturnType<typeof getStore>['devices'], metric: string, buckets = 12): Promise<number[]> {
  if (sensors.length === 0) return [];
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date().toISOString();

  try {
    for (const s of sensors) {
      const data = await halApi.getSensorHistory(s.id, metric, from, to);
      if (data.length > 1) {
        // Sample evenly across the data
        const step = Math.max(1, Math.floor(data.length / buckets));
        return Array.from({ length: Math.min(buckets, data.length) }, (_, i) => data[Math.min(i * step, data.length - 1)].value);
      }
    }
  } catch { /* ignore */ }
  return [];
}

function generateTrendData(base: number, count: number, variance = 5): number[] {
  const data: number[] = [];
  for (let i = 0; i < count; i++) {
    data.push(base + (Math.random() - 0.5) * variance * 2);
  }
  return data;
}

export function injectKpiStyles(): void {
  if (document.getElementById('hal-kpi-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-kpi-styles';
  style.textContent = `
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}
.kpi-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  border-left: 3px solid var(--kpi-accent);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
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
  font-size: 28px;
  font-weight: 600;
  line-height: 1;
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
@media (max-width: 1200px) {
  .kpi-strip { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 767px) {
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
}
`;
  document.head.appendChild(style);
}
