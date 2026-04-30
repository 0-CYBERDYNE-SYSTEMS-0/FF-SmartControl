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
  stats?: {
    label: string;
    color: string;
    min: string;
    avg: string;
    max: string;
  }[];
  leftAxisLabel?: string;
  rightAxisLabel?: string;
};

function makeSvgChart(
  el: HTMLElement,
  data: Point[],
  series: Series[],
  opts: ChartOpts = {},
) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const visibleSeries = series.filter((s) =>
    data.some((d) => Number.isFinite(Number(d[s.key]))),
  );
  if (!data.length || visibleSeries.length === 0) {
    el.innerHTML = '<div class="chart-empty">No sensor data</div>';
    return;
  }
  // Fixed aspect ratio - SVG will scale to fill container
  const width = 800;
  const height = isMobile ? 280 : 360;
  const pad = {
    top: 24,
    right: opts.dualAxis ? 64 : 24,
    bottom: 48,
    left: isMobile ? 52 : 68,
  };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const leftValues = visibleSeries
    .filter((s) => s.axis !== 'right')
    .flatMap((s) =>
      data.map((d) => Number(d[s.key])).filter((v) => Number.isFinite(v)),
    );

  const rightValues = visibleSeries
    .filter((s) => s.axis === 'right')
    .flatMap((s) =>
      data.map((d) => Number(d[s.key])).filter((v) => Number.isFinite(v)),
    );

  const leftMin =
    opts.leftMin ?? (leftValues.length ? Math.min(...leftValues) : 0);
  const leftMax =
    opts.leftMax ?? (leftValues.length ? Math.max(...leftValues) : 100);
  const rightMin =
    opts.rightMin ?? (rightValues.length ? Math.min(...rightValues) : 0);
  const rightMax =
    opts.rightMax ?? (rightValues.length ? Math.max(...rightValues) : 100);

  const x = (i: number) =>
    pad.left + (i / Math.max(1, data.length - 1)) * innerW;
  const yLeft = (v: number) =>
    pad.top +
    innerH -
    ((v - leftMin) / Math.max(1, leftMax - leftMin)) * innerH;
  const yRight = (v: number) =>
    pad.top +
    innerH -
    ((v - rightMin) / Math.max(1, rightMax - rightMin)) * innerH;

  const linePath = (s: Series) => {
    let started = false;
    return data
      .map((d, i) => {
        const v = Number(d[s.key]);
        if (!Number.isFinite(v)) return '';
        const y = s.axis === 'right' ? yRight(v) : yLeft(v);
        const command = started ? 'L' : 'M';
        started = true;
        return `${command} ${x(i)} ${y}`;
      })
      .join(' ');
  };

  const areaPath = (s: Series) => {
    const finiteIndexes = data
      .map((d, i) => (Number.isFinite(Number(d[s.key])) ? i : -1))
      .filter((i) => i >= 0);
    if (finiteIndexes.length === 0) return '';
    const top = linePath(s);
    if (!top) return '';
    const first = finiteIndexes[0];
    const last = finiteIndexes[finiteIndexes.length - 1];
    return `${top} L ${x(last)} ${pad.top + innerH} L ${x(first)} ${pad.top + innerH} Z`;
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
        : '',
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

  const leftAxisLabel = opts.leftAxisLabel
    ? `<text x="${-(pad.top + innerH / 2)}" y="16" class="axis-label" text-anchor="middle" transform="rotate(-90)">${opts.leftAxisLabel}</text>`
    : '';
  const rightAxisLabel =
    opts.dualAxis && opts.rightAxisLabel
      ? `<text x="${pad.top + innerH / 2}" y="${width - 12}" class="axis-label right" text-anchor="middle" transform="rotate(90 ${width - 12} ${pad.top + innerH / 2})">${opts.rightAxisLabel}</text>`
      : '';

  const fills = visibleSeries
    .filter((s) => s.fill)
    .map(
      (s) =>
        `<path d="${areaPath(s)}" fill="${s.color}" opacity="0.35"></path>`,
    )
    .join('');

  const lines = visibleSeries
    .map(
      (s) =>
        `<path d="${linePath(s)}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>`,
    )
    .join('');

  const legend = visibleSeries
    .map(
      (s) =>
        `<span class="legend-item"><span style="background:${s.color};box-shadow:0 0 8px ${s.color}"></span>${s.label}</span>`,
    )
    .join('');

  const statsHtml =
    opts.showStats && opts.stats
      ? `<div class="hal-stats-grid">${opts.stats
          .map(
            (stat) => `
        <div class="hal-stat-section" style="--stat-color:${stat.color}">
          <div class="hal-stat-label">${stat.label}</div>
          <div class="hal-stat-row"><span>MIN</span><strong>${stat.min}</strong></div>
          <div class="hal-stat-row"><span>AVG</span><strong>${stat.avg}</strong></div>
          <div class="hal-stat-row"><span>MAX</span><strong>${stat.max}</strong></div>
        </div>
      `,
          )
          .join('')}</div>`
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
      .axis-label {
        fill: #7dd3fc;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      .axis-label.right { fill: #38bdf8; }
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
      ${
        opts.title
          ? `
        <div class="hal-chart-header">
          <div>
            <div class="hal-chart-title">${opts.title}</div>
            ${opts.subtitle ? `<div class="hal-chart-subtitle">${opts.subtitle}</div>` : ''}
          </div>
        </div>
      `
          : ''
      }
      <div class="hal-chart-wrap">
        <svg class="hal-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Chart">
          ${grid}
          ${xLabels}
          ${leftTicks}
          ${rightTicks}
          ${leftAxisLabel}
          ${rightAxisLabel}
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
function calcStats(values: number[]): {
  min: string;
  avg: string;
  max: string;
} {
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
  data: Array<{
    time: string;
    temp1?: number;
    temp2?: number;
    soil?: number;
    weight?: number;
  }>,
  opts: { title?: string; subtitle?: string } = {},
): void {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!data.length) {
    el.innerHTML = '<div class="chart-empty">No data</div>';
    return;
  }

  makeSvgChart(
    el,
    data,
    [
      { key: 'temp1', label: 'Temperature #1', color: '#f97316', fill: true },
      { key: 'temp2', label: 'Temperature #2', color: '#fb923c', fill: true },
      { key: 'soil', label: 'Soil Probe', color: '#a78bfa', fill: true },
      { key: 'weight', label: 'Weight', color: '#22d3ee', fill: true },
    ],
    {
      leftMin: 0,
      leftMax: 180,
      title: opts.title || 'Temperature + Weight',
      subtitle: opts.subtitle || 'Multi-sensor overview',
    },
  );
}

// ── Sensors Tab Chart (dual-axis) ──────────────────────────────────
export function renderFarmPalDualAxisChart(
  containerId: string,
  data: Array<{ time: string; temp?: number; humidity?: number }>,
  deviceName: string,
  opts: { unit?: 'C' | 'F' } = {},
): void {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!data.length) {
    el.innerHTML = '<div class="chart-empty">No data</div>';
    return;
  }

  const tempUnit = opts.unit === 'F' ? '°F' : '°C';
  const tempValues = data
    .map((d) => d.temp)
    .filter((v): v is number => v !== undefined);
  const humValues = data
    .map((d) => d.humidity)
    .filter((v): v is number => v !== undefined);
  if (tempValues.length === 0 && humValues.length === 0) {
    el.innerHTML = '<div class="chart-empty">No sensor data</div>';
    return;
  }

  const tempStats = calcStats(tempValues);
  const humStats = calcStats(humValues);
  const tempMin = tempValues.length
    ? Math.floor(Math.min(...tempValues) / 10) * 10 - 5
    : 0;
  const tempMax = tempValues.length
    ? Math.ceil(Math.max(...tempValues) / 10) * 10 + 5
    : 100;

  makeSvgChart(
    el,
    data,
    [
      {
        key: 'temp',
        label: `Temperature (${tempUnit})`,
        color: '#fb923c',
        axis: 'left',
        fill: true,
      },
      {
        key: 'humidity',
        label: 'Humidity (%)',
        color: '#38bdf8',
        axis: 'right',
        fill: true,
      },
    ],
    {
      dualAxis: true,
      leftMin: tempMin,
      leftMax: tempMax,
      rightMin: 0,
      rightMax: 100,
      title: 'Temperature + Humidity',
      subtitle: deviceName,
      leftAxisLabel: tempUnit,
      rightAxisLabel: '% RH',
      showStats: true,
      stats: [
        {
          label: 'Temperature',
          color: '#fb923c',
          min: tempStats.min + tempUnit,
          avg: tempStats.avg + tempUnit,
          max: tempStats.max + tempUnit,
        },
        {
          label: 'Humidity',
          color: '#38bdf8',
          min: humStats.min + '%',
          avg: humStats.avg + '%',
          max: humStats.max + '%',
        },
      ],
    },
  );
}

export type FarmPalSensorSeries = {
  key: string;
  label: string;
  color: string;
  unit: string;
};

export function renderFarmPalSensorChart(
  containerId: string,
  data: Point[],
  series: FarmPalSensorSeries[],
  opts: { title?: string; subtitle?: string } = {},
): void {
  const el = document.getElementById(containerId);
  if (!el) return;

  const activeSeries = series.filter((s) =>
    data.some((d) => Number.isFinite(Number(d[s.key]))),
  );
  if (!data.length || activeSeries.length === 0) {
    el.innerHTML = '<div class="chart-empty">No sensor data</div>';
    return;
  }

  const extents = new Map<string, { min: number; max: number }>();
  for (const s of activeSeries) {
    const values = data
      .map((d) => Number(d[s.key]))
      .filter((v) => Number.isFinite(v));
    extents.set(s.key, {
      min: Math.min(...values),
      max: Math.max(...values),
    });
  }

  const normalizedData = data.map((row) => {
    const normalized: Point = { time: row.time };
    for (const s of activeSeries) {
      const value = Number(row[s.key]);
      const extent = extents.get(s.key);
      if (!Number.isFinite(value) || !extent) continue;
      const { min, max } = extent;
      normalized[s.key] =
        max === min ? 50 : ((value - min) / (max - min)) * 100;
    }
    return normalized;
  });

  const stats = activeSeries.map((s) => {
    const values = data
      .map((d) => Number(d[s.key]))
      .filter((v) => Number.isFinite(v));
    const calculated = calcStats(values);
    return {
      label: s.label,
      color: s.color,
      min: `${calculated.min}${s.unit}`,
      avg: `${calculated.avg}${s.unit}`,
      max: `${calculated.max}${s.unit}`,
    };
  });

  makeSvgChart(
    el,
    normalizedData,
    activeSeries.map((s) => ({
      key: s.key,
      label: s.unit ? `${s.label} (${s.unit})` : s.label,
      color: s.color,
      fill: true,
    })),
    {
      leftMin: 0,
      leftMax: 100,
      title: opts.title || 'Telemetry Digital Twin',
      subtitle: opts.subtitle,
      leftAxisLabel: 'Normalized range',
      showStats: true,
      stats,
    },
  );
}
