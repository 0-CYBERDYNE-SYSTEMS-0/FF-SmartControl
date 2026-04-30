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
  const width = opts.width ?? (isMobile ? 400 : 800);
  const height = opts.height ?? (isMobile ? 240 : 340);
  const pad = { top: 28, right: opts.dualAxis ? 58 : 24, bottom: 42, left: isMobile ? 48 : 58 };
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
    .map(s => `<path d="${areaPath(s)}" fill="${s.color}" opacity="0.22"></path>`)
    .join('');

  const lines = series
    .map(s => `<path d="${linePath(s)}" fill="none" stroke="${s.color}" stroke-width="2"></path>`)
    .join('');

  const legend = series
    .map(s => `<span class="legend-item"><span style="background:${s.color}"></span>${s.label}</span>`)
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
        background: #07111f;
        border: 1px solid #243653;
        border-radius: 12px;
        padding: 18px;
        color: #dbe4f0;
        font-family: Inter, system-ui, sans-serif;
        width: 100%;
        box-sizing: border-box;
      }
      .hal-chart-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 14px;
        flex-wrap: wrap;
        gap: 8px;
      }
      .hal-chart-title {
        font-size: 14px;
        font-weight: 600;
        color: #38bdf8;
      }
      .hal-chart-subtitle {
        font-size: 11px;
        color: #64748b;
        margin-top: 2px;
      }
      .hal-chart-wrap {
        width: 100%;
        overflow: hidden;
      }
      .hal-chart {
        width: 100%;
        height: auto;
        display: block;
      }
      .grid { stroke: #334155; stroke-dasharray: 2 5; opacity: 0.75; }
      .axis { fill: #7f8ea3; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .axis.right { fill: #38bdf8; }
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 10px;
        color: #94a3b8;
        font-size: 13px;
      }
      .legend-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .legend-item span {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
      }
      .hal-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 16px;
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid #243653;
      }
      .hal-stat-section { }
      .hal-stat-label {
        font-size: 12px;
        font-weight: 700;
        color: var(--stat-color, #f59e0b);
        margin-bottom: 6px;
      }
      .hal-stat-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        font-family: ui-monospace, monospace;
        color: #94a3b8;
        padding: 2px 0;
      }
      .hal-stat-row strong { color: #dbe4f0; }
      @media (max-width: 480px) {
        .hal-chart-card { padding: 12px; }
        .hal-chart-header { flex-direction: column; }
        .legend { gap: 10px; font-size: 12px; }
        .hal-stats-grid { grid-template-columns: repeat(2, 1fr); }
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
        <svg class="hal-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Chart">
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
    { key: 'temp1', label: 'Temperature #1', color: '#f59e0b', fill: true },
    { key: 'temp2', label: 'Temperature #2', color: '#f97316', fill: true },
    { key: 'soil', label: 'Soil Probe', color: '#a3a3a3', fill: true },
    { key: 'weight', label: 'Weight', color: '#94a3b8', fill: true },
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
    { key: 'temp', label: `Temperature (${tempUnit})`, color: '#f59e0b', axis: 'left', fill: true },
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
      { label: 'Temperature', color: '#f59e0b', min: tempStats.min + tempUnit, avg: tempStats.avg + tempUnit, max: tempStats.max + tempUnit },
      { label: 'Humidity', color: '#38bdf8', min: humStats.min + '%', avg: humStats.avg + '%', max: humStats.max + '%' },
    ],
  });
}
