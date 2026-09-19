// LakeTank chart — animated water-fill visualization for current metric state
// Pure SVG + SMIL animation, no dependencies

export interface LakeTank {
  key: string;
  label: string;
  unit: string;
  color: string;
  currentValue: number;
  minVal: number;
  maxVal: number;
  history: { time: number; value: number }[];
}

const W = 200;
const H = 220;
const SPARK_H = 46;
const TOTAL_H = H + SPARK_H;
const TOP_PAD = 40;
const BOT_PAD = 20;
const FILLABLE = H - TOP_PAD - BOT_PAD; // 160px
const FILL_BOTTOM = H - BOT_PAD; // 200
const PERIOD = 80;
const AMP = 10;

const WAVE_DUR: Record<string, string> = {
  temperature: '5s',
  humidity: '9s',
  co2: '3.5s',
  soil_moisture: '7s',
  water_level: '10s',
  ph: '6s',
  light: '4s',
  weight: '8s',
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function injectLakeTankStyles(): void {
  if (document.getElementById('hal-lake-tank-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-lake-tank-styles';
  style.textContent = `
    .lake-tanks-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-3);
    }
    @media (max-width: 640px) {
      .lake-tanks-grid { grid-template-columns: 1fr; }
    }
    @media (min-width: 641px) and (max-width: 900px) {
      .lake-tanks-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .lake-tank-card { min-width: 0; }
    .lake-tank-svg { width: 100%; height: auto; display: block; }
    .lake-lbl {
      fill: var(--text-secondary);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.09em;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }
    .lake-val {
      fill: #fff;
      font-size: 30px;
      font-weight: 700;
      font-family: var(--font-display, system-ui, sans-serif);
    }
    .lake-val-above {
      fill: var(--text-primary);
      font-size: 24px;
      font-weight: 700;
      font-family: var(--font-display, system-ui, sans-serif);
    }
    .lake-unit { font-size: 13px; font-weight: 500; opacity: 0.8; }
    .lake-axis {
      fill: var(--text-secondary);
      font-size: 9px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      opacity: 0.55;
    }
    .lake-spark { fill: none; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
    .lake-spark-lbl {
      fill: var(--text-secondary);
      font-size: 8px;
      letter-spacing: 0.06em;
      font-family: ui-monospace, SFMono-Regular, monospace;
      opacity: 0.5;
    }
  `;
  document.head.appendChild(style);
}

export function renderLakeTanks(containerId: string, tanks: LakeTank[]): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  injectLakeTankStyles();
  const grid = document.createElement('div');
  grid.className = 'lake-tanks-grid';
  for (const tank of tanks) {
    const card = document.createElement('div');
    card.className = 'lake-tank-card';
    // All interpolated values are either escaped strings, hex colors, or numeric toFixed() — no user input
    card.innerHTML = buildTankSvg(tank); // eslint-disable-line
    grid.appendChild(card);
  }
  container.innerHTML = ''; // eslint-disable-line
  container.appendChild(grid);
}

function buildTankSvg(tank: LakeTank): string {
  const fillPct = Number.isFinite(tank.currentValue)
    ? Math.max(
        0.02,
        Math.min(
          1,
          (tank.currentValue - tank.minVal) / (tank.maxVal - tank.minVal),
        ),
      )
    : 0.02;

  const fillY = TOP_PAD + FILLABLE * (1 - fillPct);
  const dur = WAVE_DUR[tank.key] ?? '6s';
  const wavePath = buildWavePath(-(PERIOD * 2), W + PERIOD * 2, fillY);

  const fillMidY = fillY + (FILL_BOTTOM - fillY) / 2 + 11;
  const insideFill = fillPct >= 0.25;
  const valueY = insideFill ? fillMidY : fillY - 12;
  const valueClass = insideFill ? 'lake-val' : 'lake-val-above';
  const displayVal = Number.isFinite(tank.currentValue)
    ? tank.currentValue.toFixed(1)
    : '--';

  const label = esc(tank.label);
  const unit = esc(tank.unit);
  const color = esc(tank.color);
  const key = esc(tank.key);

  const sparkSvg = buildSparklineSvg(tank);

  return `<svg class="lake-tank-svg" viewBox="0 0 ${W} ${TOTAL_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="lc-${key}">
      <rect x="0" y="0" width="${W}" height="${H}" rx="12"/>
    </clipPath>
    <linearGradient id="lg-${key}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.28"/>
    </linearGradient>
    <linearGradient id="sg-${key}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" rx="12"
    fill="${color}" fill-opacity="0.07"
    stroke="${color}" stroke-opacity="0.28" stroke-width="1.5"/>

  <g clip-path="url(#lc-${key})">
    <g>
      <path d="${wavePath}" fill="url(#lg-${key})"/>
      <animateTransform attributeName="transform" type="translate"
        from="0 0" to="-${PERIOD} 0" dur="${dur}" repeatCount="indefinite"/>
    </g>
  </g>

  <text x="${W / 2}" y="24" text-anchor="middle" class="lake-lbl">${label}</text>

  <text x="${W / 2}" y="${valueY.toFixed(1)}" text-anchor="middle" class="${valueClass}">${displayVal}<tspan class="lake-unit" dx="3">${unit}</tspan></text>

  <text x="8" y="${FILL_BOTTOM - 4}" class="lake-axis">${tank.minVal}${unit}</text>
  <text x="8" y="${TOP_PAD + 14}" class="lake-axis">${tank.maxVal}${unit}</text>

  ${sparkSvg}
</svg>`;
}

function buildWavePath(startX: number, endX: number, fillY: number): string {
  const halfP = PERIOD / 2;
  const cp = halfP * 0.42;

  let d = `M ${startX} ${fillY}`;
  let x = startX;
  let sign = 1;

  while (x < endX) {
    const ex = x + halfP;
    const cy = fillY - sign * AMP;
    d += ` C ${(x + cp).toFixed(1)} ${cy} ${(ex - cp).toFixed(1)} ${cy} ${ex} ${fillY}`;
    x = ex;
    sign = -sign;
  }

  d += ` L ${x} ${FILL_BOTTOM} L ${startX} ${FILL_BOTTOM} Z`;
  return d;
}

function buildSparklineSvg(tank: LakeTank): string {
  if (tank.history.length < 3) return '';

  const x0 = 10;
  const y0 = H + 8;
  const sw = W - 20;
  const sh = SPARK_H - 18;
  const key = esc(tank.key);
  const color = esc(tank.color);

  const sorted = [...tank.history].sort((a, b) => a.time - b.time);
  const tMin = sorted[0].time;
  const tMax = sorted[sorted.length - 1].time;
  const tRange = tMax - tMin || 1;
  const vRange = tank.maxVal - tank.minVal || 1;

  const pts = sorted.map((p) => {
    const px = x0 + ((p.time - tMin) / tRange) * sw;
    const py =
      y0 + sh - Math.max(0, Math.min(1, (p.value - tank.minVal) / vRange)) * sh;
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  });

  const botY = (y0 + sh).toFixed(1);
  const areaPoints = `${x0},${botY} ${pts.join(' ')} ${(x0 + sw).toFixed(1)},${botY}`;

  return `
  <line x1="${x0}" y1="${y0}" x2="${x0 + sw}" y2="${y0}" stroke="${color}" stroke-opacity="0.15" stroke-width="1"/>
  <polygon points="${areaPoints}" fill="url(#sg-${key})"/>
  <polyline points="${pts.join(' ')}" stroke="${color}" stroke-opacity="0.65" class="lake-spark"/>
  <text x="${x0}" y="${y0 + sh + 10}" class="lake-spark-lbl">TREND</text>`;
}
