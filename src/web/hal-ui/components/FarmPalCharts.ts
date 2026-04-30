// FarmPal SVG Charts — vanilla TS, responsive, no dependencies

type Point = {
  time: string;
  temp1?: number;
  temp2?: number;
  soil?: number;
  weight?: number;
  humidity?: number;
  [key: string]: string | number | undefined;
};

type Series = {
  key: string;
  label: string;
  color: string;
  axis?: 'left' | 'right';
  fill?: boolean;
};

type ChartOpts = {
  width?: number;
  height?: number;
  leftMin?: number;
  leftMax?: number;
  rightMin?: number;
  rightMax?: number;
  dualAxis?: boolean;
  title?: string;
  subtitle?: string;
  showStats?: boolean;
  stats?: { label: string; color: string; min: string; avg: string; max: string }[];
};

function makeSvgChart(el: HTMLElement, data: Point[], series: Series[], opts: ChartOpts = {}) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  // Fixed aspect ratio - SVG will scale to fill container
  const width = 800;
  const height = isMobile ? 280 : 360;
  const pad = { top: 24, right: opts.dualAxis ? 56 : 20, bottom: 40, left: isMobile ? 44 : 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const leftValues = series
    .filter(s => s.axis !== 'right')
    .flatMap(s => data.map(d => Number(d[s.key])).filter(v => Number.isFinite(v)));

  const rightValues = series
    .filter(s => s.axis === 'right')
    .flatMap(s => data.map(d => Number(d[s.key])).filter(v => Number.isFinite(v)));

  const leftMin = opts.leftMin ?? (leftValues.length ? Math.min(...leftValues) : 0);
  const leftMax = opts.leftMax ?? (leftValues.length ? Math.max(...leftValues) : 100);
  const rightMin = opts.rightMin ?? (rightValues.length ? Math.min(...rightValues) : 0);
  const rightMax = opts.rightMax ?? (rightValues.length ? Math.max(...rightValues) : 100);

  const x = (i: number) => pad.left + (i / Math.max(1, data.length - 1)) * innerW;
  const yLeft = (v: number) => pad.top + innerH - ((v - leftMin) / Math.max(1, leftMax - leftMin)) * innerH;
  const yRight = (v: number) => pad.top + innerH - ((v - rightMin) / Math.max(1, rightMax - rightMin)) * innerH;

  const linePath = (s: Series) =>
    data
      .map((d, i) => {
        const v = Number(d[s.key]);
        if (!Number.isFinite(v)) return '';
        const y = s.axis === 'right' ? yRight(v) : yLeft(v);
        return `${i === 0 ? 'M' : 'L'} ${x(i)} ${y}`;
      })
      .join(' ');

  const areaPath = (s: Series) => {
    const top = linePath(s);
    if (!top) return '';
    return `${top} L ${x(data.length - 1)} ${pad.top + innerH} L ${x(0)} ${pad.top + innerH} Z`;
  };

  const grid = Array.from({ length: 5 }, (_, i) => {
    const gy = pad.top + (i / 4) * innerH;
    return `<line x1="${pad.left}" y1="${gy}" x2="${width - pad.right}" y2="${gy}" class="grid"/>`;
  }).join('');

  const step = Math.max(1, Math.ceil(data.length / (isMobile ? 4 : 6)));
  const xLabels = data
    .map((d, i) =>
      i % step === 0
        ? `<text x="${x(i)}" y="${height - 14}" class="axis" text-anchor="middle">${d.time}</text>`
        : ''
    )
    .join('');

  const leftTicks = Array.from({ length: 5 }, (_, i) => {
    const value = leftMax - ((leftMax - leftMin) / 4) * i;
    const gy = pad.top + (i / 4) * innerH;
    return `<text x="${pad.left - 12}" y="${gy + 4}" class="axis" text-anchor="end">${value.toFixed(0)}</text>`;
  }).join('');

  const rightTicks = opts.dualAxis
    ? Array.from({ length: 5 }, (_, i) => {
        const value = rightMax - ((rightMax - rightMin) / 4) * i;
        const gy = pad.top + (i / 4) * innerH;
        return `<text x="${width - pad.right + 12}" y="${gy + 4}" class="axis right">${value.toFixed(0)}${opts.dualAxis ? '%' : ''}</text>`;
      }).join('')
    : '';

  const fills = series
    .filter(s => s.fill)
    .map(s => `<path d="${areaPath(s)}" fill="${s.color}" opacity="0.35"></path>`)
    .join('');

  const lines = series
    .map(s => `<path d="${linePath(s)}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>`)
    .join('');

  const legend = series
    .map(s => `<span class="legend-item"><span style="background:${s.color};box-shadow:0 0 8px ${s.color}"></span>${s.label}</span>`)
    .join('');

  const statsHtml = opts.showStats && opts.stats
    ? `<div class="hal-stats-grid">${opts.stats.map(stat => `
        <div class="hal-stat-section" style="--stat-color:${stat.color}">
          <div class="hal-stat-label">${stat.label}</div>
          <div class="hal-stat-row"><span>MIN</span><strong>${stat.min}</strong></div>
          <div class="hal-stat-row"><span>AVG</span><strong>${stat.avg}</strong></div>
          <div class="hal-stat-row"><span>MAX</span><strong>${stat.max}</strong></div>
        </div>
      `).join('')}</div>`
    : '';

  el.innerHTML = `
    <style>
      .hal-chart-card {
        background: linear-gradient(135deg, #0a1628 0%, #07111f 100%);
        border: 1px solid #1e3a5f;
        border-radius: 16px;
        padding: 20px;
        color: #f0f6fc;
        font-family: Inter, system-ui, sans-serif;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      }
      .hal-chart-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
        flex-wrap: wrap;
        gap: 8px;
      }
      .hal-chart-title {
        font-size: 16px;
        font-weight: 700;
        color: #6ee7b7;
        text-shadow: 0 0 20px rgba(110,231,183,0.5);
      }
      .hal-chart-subtitle {
        font-size: 12px;
        color: #7dd3fc;
        margin-top: 4px;
        text-shadow: 0 0 10px rgba(125,211,252,0.3);
      }
      .hal-chart-wrap {
        width: 100%;
        height: 100%;
        overflow: hidden;
        position: relative;
      }
      .hal-chart {
        width: 100%;
        height: auto;
        display: block;
      }
      .grid { stroke: #1e3a5f; stroke-dasharray: 3 6; opacity: 0.8; }
      .axis { fill: #94a3b8; font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .axis.right { fill: #38bdf8; }
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin-top: 14px;
        color: #e2e8f0;
        font-size: 13px;
        font-weight: 500;
      }
      .legend-item {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .legend-item span {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
        box-shadow: 0 0 10px currentColor;
      }
      .hal-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 20px;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #1e3a5f;
      }
      .hal-stat-section { }
      .hal-stat-label {
        font-size: 13px;
        font-weight: 700;
        color: var(--stat-color, #f97316);
        margin-bottom: 8px;
        text-shadow: 0 0 15px currentColor;
      }
      .hal-stat-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        color: #94a3b8;
        padding: 4px 0;
      }
      .hal-stat-row strong { color: #f0f6fc; font-weight: 600; }
      @media (max-width: 480px) {
        .hal-chart-card { padding: 14px; border-radius: 12px; }
        .hal-chart-header { flex-direction: column; }
        .legend { gap: 12px; font-size: 12px; }
        .hal-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
      }
    </style>

    <div class="hal-chart-card">
      ${opts.title ? `
        <div class="hal-chart-header">
          <div>
            <div class="hal-chart-title">${opts.title}</div>
            ${opts.subtitle ? `<div class="hal-chart-subtitle">${opts.subtitle}</div>` : ''}
          </div>
        </div>
      ` : ''}
      <div class="hal-chart-wrap">
        <svg class="hal-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Chart">
          ${grid}
          ${xLabels}
          ${leftTicks}
          ${rightTicks}
          ${fills}
          ${lines}
        </svg>
      </div>
      <div class="legend">${legend}</div>
      ${statsHtml}
    </div>
  `;
}

// Stats calculation helper
function calcStats(values: number[]): { min: string; avg: string; max: string } {
  if (!values.length) return { min: '--', avg: '--', max: '--' };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    min: min.toFixed(1),
    avg: avg.toFixed(1),
    max: max.toFixed(1),
  };
}

// ── System Tab Chart ──────────────────────────────────────────────
export function renderFarmPalAreaChart(
  containerId: string,
  data: Array<{ time: string; temp1?: number; temp2?: number; soil?: number; weight?: number }>,
  opts: { title?: string; subtitle?: string } = {}
): void {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!data.length) {
    el.innerHTML = '<div class="chart-empty">No data</div>';
    return;
  }

  makeSvgChart(el, data, [
    { key: 'temp1', label: 'Temperature #1', color: '#f97316', fill: true },
    { key: 'temp2', label: 'Temperature #2', color: '#fb923c', fill: true },
    { key: 'soil', label: 'Soil Probe', color: '#a78bfa', fill: true },
    { key: 'weight', label: 'Weight', color: '#22d3ee', fill: true },
  ], {
    leftMin: 0,
    leftMax: 180,
    title: opts.title || 'Temperature + Weight',
    subtitle: opts.subtitle || 'Multi-sensor overview',
  });
}

// ── Sensors Tab Chart (dual-axis) ──────────────────────────────────
export function renderFarmPalDualAxisChart(
  containerId: string,
  data: Array<{ time: string; temp?: number; humidity?: number }>,
  deviceName: string,
  opts: { unit?: 'C' | 'F' } = {}
): void {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!data.length) {
    el.innerHTML = '<div class="chart-empty">No data</div>';
    return;
  }

  const tempUnit = opts.unit === 'F' ? '°F' : '°C';
  const tempValues = data.map(d => d.temp).filter((v): v is number => v !== undefined);
  const humValues = data.map(d => d.humidity).filter((v): v is number => v !== undefined);

  const tempStats = calcStats(tempValues);
  const humStats = calcStats(humValues);

  makeSvgChart(el, data, [
    { key: 'temp', label: `Temperature (${tempUnit})`, color: '#fb923c', axis: 'left', fill: true },
    { key: 'humidity', label: 'Humidity (%)', color: '#38bdf8', axis: 'right', fill: true },
  ], {
    dualAxis: true,
    leftMin: Math.floor(Math.min(...tempValues) / 10) * 10 - 5,
    leftMax: Math.ceil(Math.max(...tempValues) / 10) * 10 + 5,
    rightMin: 0,
    rightMax: 100,
    title: 'Temperature + Humidity',
    subtitle: deviceName,
    showStats: true,
    stats: [
      { label: 'Temperature', color: '#fb923c', min: tempStats.min + tempUnit, avg: tempStats.avg + tempUnit, max: tempStats.max + tempUnit },
      { label: 'Humidity', color: '#38bdf8', min: humStats.min + '%', avg: humStats.avg + '%', max: humStats.max + '%' },
    ],
  });
}
