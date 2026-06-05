#!/usr/bin/env -S npx tsx
/**
 * Fetch a REAL recorded hourly outdoor-temperature trace from the free
 * Open-Meteo historical archive (no API key) and write it as a CSV the replay
 * harness can drive:  `timestamp,temperature_c`.
 *
 * Default = a real Eugene, OR heat event (the founder's home market), so
 * historical replay runs on genuine local weather out of the box.
 *
 * Usage:
 *   npx tsx scripts/fetch-openmeteo.ts \
 *     --lat=44.0521 --lon=-123.0868 --start=2024-07-05 --end=2024-07-10 \
 *     --out=data/replay/eugene-heat-2024.csv
 */
import fs from 'fs';
import path from 'path';

function arg(name: string, def: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
}

const lat = arg('lat', '44.0521');
const lon = arg('lon', '-123.0868');
const start = arg('start', '2024-07-05');
const end = arg('end', '2024-07-10');
const out = arg('out', 'data/replay/eugene-heat-2024.csv');

const url =
  `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
  `&start_date=${start}&end_date=${end}&hourly=temperature_2m&temperature_unit=celsius`;

const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
if (!res.ok) {
  console.error(`Open-Meteo error ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const data = (await res.json()) as {
  hourly?: { time?: string[]; temperature_2m?: (number | null)[] };
};
const times = data.hourly?.time ?? [];
const temps = data.hourly?.temperature_2m ?? [];
if (!times.length) {
  console.error('No hourly data returned.');
  process.exit(1);
}

const rows = ['timestamp,temperature_c'];
let min = Infinity;
let max = -Infinity;
for (let i = 0; i < times.length; i++) {
  const t = temps[i];
  if (t === null || t === undefined) continue;
  rows.push(`${times[i]},${t}`);
  min = Math.min(min, t);
  max = Math.max(max, t);
}

const outAbs = path.resolve(process.cwd(), out);
fs.mkdirSync(path.dirname(outAbs), { recursive: true });
fs.writeFileSync(outAbs, rows.join('\n') + '\n');
console.log(
  `Wrote ${rows.length - 1} hourly samples to ${out}\n` +
    `  location: ${lat},${lon}  ·  ${start}..${end}  ·  outdoor ${min.toFixed(1)}–${max.toFixed(1)}°C`,
);
