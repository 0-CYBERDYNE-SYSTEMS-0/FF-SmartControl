# FarmPal Chart and Visualization Design Handoff

This document is for a frontend/data-visualization specialist joining FarmPal to improve or replace parts of the HAL UI chart system. It covers the current architecture, chart components, layout grid, data flow, design rules, known pitfalls, and the ECharts direction we explored.

FarmPal is a hardware-first smart garden controller. The visualization system is not decorative: it is the operator's evidence surface for sensor telemetry, relay state, automation decisions, safety status, simulator/digital-twin behavior, and device health. The UI should stay dense, reliable, readable, and testable on a local host machine.

## Current State

The active HAL UI lives in:

- `src/web/hal-ui/` - source TypeScript, CSS, and HTML.
- `src/web/hal-ui/dist/` - bundled assets served to browsers. Do not edit this directly.
- `src/web/hal-ui-server.ts` - standalone HAL UI server and HAL API surface.

The HAL UI is a plain TypeScript single-page app bundled by esbuild. It is not React. Most views render HTML strings, inject scoped styles, then attach event handlers.

Important scripts:

```bash
npm run hal:ui:build    # bundle HAL UI source into src/web/hal-ui/dist
npm run typecheck       # TypeScript validation
npm run build           # compile dist/ host runtime
```

The browser is served from `src/web/hal-ui/`, but JavaScript and CSS assets come from `src/web/hal-ui/dist/`. If a chart source file changes and the UI does not update, rebuild the HAL UI bundle and hard refresh the browser.

## Main Visualization Files

### Sensors View

Primary file:

```text
src/web/hal-ui/views/Sensors.ts
```

This is the main telemetry view. It owns:

- device selector
- time range selector: `1H`, `6H`, `24H`, `7D`, `30D`
- unit toggle: metric/imperial
- time format toggle: 24h/12h
- zone pills
- metric pills
- hero chart
- hidden/experimental secondary visualization grids
- readings detail table

Key concepts in `Sensors.ts`:

- `MetricKey` covers:
  - `temperature`
  - `humidity`
  - `soil_moisture`
  - `light`
  - `co2`
  - `water_level`
  - `ph`
  - `weight`
- `metrics` is the local display config for label, short label, color, fallback unit, description, and axis hints.
- `viewState` stores current local UI selections.
- `loadData()` fetches decisions plus metric history for every selected device and active metric.
- `renderHeroChart()` groups layers by metric and creates chart-ready bucketed data.

The current Sensors hero chart uses `renderFarmPalSensorChart()` from `FarmPalCharts.ts`. It normalizes active metrics to a 0-100 range so unlike units can share one chart while stats still show raw units.

### FarmPalCharts

Primary file:

```text
src/web/hal-ui/components/FarmPalCharts.ts
```

This is the newer custom SVG chart module. It contains:

- `makeSvgChart()` - low-level SVG renderer.
- `renderFarmPalAreaChart()` - currently used by the System view.
- `renderFarmPalDualAxisChart()` - older temperature/humidity-only Sensors chart path, still present.
- `renderFarmPalSensorChart()` - current Sensors multi-metric normalized telemetry chart.

Important behavior:

- Empty data renders `.chart-empty`.
- Series with no finite values are filtered out.
- The current Sensors chart uses normalized values for line plotting, but stats show raw min/avg/max with units.
- The chart injects CSS in the rendered HTML. This means changes inside `FarmPalCharts.ts` can affect all charts rendered by it, not only Sensors.

### ChartKit

Primary file:

```text
src/web/hal-ui/components/ChartKit.ts
```

This is a broader pure-SVG chart library used by Dashboard, Devices, Decisions, and some hidden Sensors secondary cards. It includes:

- metric config and colors
- monotone cubic splines
- shade generation for multiple devices in the same metric family
- dashboard overview cards
- decision and status cards
- assorted compact chart/card renderers
- injected ChartKit styles

ChartKit is still active. Do not assume `FarmPalCharts.ts` is the only chart system.

### HeroChart

Primary file:

```text
src/web/hal-ui/components/HeroChart.ts
```

This wraps ChartKit for Dashboard hero chart data. Dashboard still uses this path:

```text
src/web/hal-ui/views/Dashboard.ts
```

Dashboard and Sensors are not currently using exactly the same hero chart pipeline.

### System View

Primary file:

```text
src/web/hal-ui/views/System.ts
```

System view uses `renderFarmPalAreaChart()` for a mixed temperature/soil/weight overview. It is simpler than Sensors and still has assumptions about which metric goes into which slot.

### VegaChart

Primary file:

```text
src/web/hal-ui/components/VegaChart.ts
```

This exists as an optional/older visualization experiment. It is not the primary chart path. Do not migrate to or delete it without checking live imports and bundled output.

### ECharts Preview

Preview file created for evaluation:

```text
echarts-preview.html
```

This is a standalone single-file prototype with 16 ECharts chart candidates. It is not wired into the HAL UI. It loads ECharts from a CDN, so it is suitable for visual selection but not production as-is.

The 16 candidates are:

1. Multi-axis environment trend
2. CO2 threshold area
3. Soil moisture heatmap
4. Relay runtime stacked bars
5. Reservoir gauge
6. pH scatter with safe band
7. Plant weight curve
8. Device health donut
9. Decision confidence radar
10. Actuator timeline
11. Zone comparison stack
12. Sensor freshness calendar
13. Safety rule funnel
14. Digital-twin forecast band
15. Fault mix treemap
16. Camera coverage Sankey

## Data Flow

The HAL UI data flow is:

```text
HAL database / simulator / hardware integrations
  -> halSensors / halRegistry / halDecisions
  -> src/web/hal-ui-server.ts API routes
  -> src/web/hal-ui/api.ts normalization
  -> src/web/hal-ui/store.ts
  -> view renderers and chart components
```

### Main APIs

The HAL UI server exposes these relevant routes:

```text
GET /api/hal/state
GET /api/hal/sensors/latest
GET /api/hal/sensors/history?device=<id>&metric=<metric>&from=<iso>&to=<iso>
GET /api/hal/decisions
GET /api/hal/devices
```

`/api/hal/state` returns:

- devices
- latest sensor snapshots grouped by device
- recent decisions

`/api/hal/sensors/latest` returns all latest metrics for all sensor devices.

`/api/hal/sensors/history` returns historical rows for exactly one device and one metric in an ISO timestamp range.

### Database Shape

Historical sensor data comes from the `hal_sensors` table:

```text
id
device_id
metric
unit
value
quality
read_at
stored_at
```

`halSensors.history(deviceId, metric, from, to)` filters on:

```sql
WHERE device_id = ? AND metric = ? AND read_at BETWEEN ? AND ?
ORDER BY read_at ASC
```

Pitfall: if the device does not have that metric, history is legitimately empty. Example: a CO2 monitor may only have `co2`, while a temperature probe may have `temperature` and `humidity`. The UI must not assume every sensor device supports every metric.

### Calibration

The server applies per-device calibration offset before returning latest/history values:

```text
calibrated_value = raw_value + calibration_offset
```

This is currently a simple additive offset and is applied to all metrics for a device. A future calibration model may need per-metric offsets or transforms; chart code should not duplicate calibration in the browser.

### Timestamp Normalization

The API client normalizes sensor rows in `src/web/hal-ui/api.ts`:

- `timestamp` is taken from `timestamp`, `read_at`, or `stored_at`.
- `value` must be numeric or the row is dropped.

Chart code should use the normalized `timestamp` field from `HalSensorReading`.

### Store Refresh

`main.ts` calls `refreshHALData()` on initial load and every 10 seconds. That updates:

- `devices`
- `sensors`
- `cameras`
- `decisions`
- automation mode state
- pending decisions

Sensors view uses store snapshots to decide which metric pills are available, then fetches history separately.

Pitfall: latest snapshots and history are separate data sources. A metric can appear available because a latest snapshot exists, but a selected time window can still have no matching history if the time range is wrong or the data is stale.

## Simulator and Digital Twin Data

There are two related but different telemetry concepts:

1. HAL sensor history in `hal_sensors`.
2. Farm state telemetry files under `data/farm-state/`, such as `telemetry.ndjson`.

The current HAL UI charts read HAL history through `/api/hal/sensors/history`. They do not directly read `data/farm-state/telemetry.ndjson`.

When `HAL_SIM_MODE=1`, the HAL simulator writes synthetic readings through `halSensors.store()`, so simulator data becomes normal HAL history. The static demo seeder also populates `hal_sensors` with 60 days of demo data.

Pitfall: when someone says "telemetry digital twin," verify whether they mean:

- HAL simulator readings in `hal_sensors`
- farm-state collector telemetry in `data/farm-state/telemetry.ndjson`
- Home Assistant-derived state
- future forecast/projection data

Do not wire a chart to the wrong telemetry source by name alone.

## Current Chart Design Direction

The HAL UI design is operational, not marketing. Charts must be:

- dense enough for repeated operator use
- legible in a dark local dashboard
- stable across small laptop and mobile widths
- fast with 24h and 30d windows
- clear about no-data, stale-data, and loading states
- usable without cloud services

Current design tokens are in:

```text
src/web/hal-ui/tokens.css
```

Key tokens:

```css
--bg-primary: #0D1117;
--bg-secondary: #161B22;
--bg-tertiary: #21262D;
--text-primary: #F0F6FC;
--text-secondary: #8B949E;
--border: #30363D;
--accent: #238636;
--accent-bright: #3FB950;
--success: #2EA043;
--warning: #D29922;
--danger: #F85149;
--info: #388BFD;
```

The app also has themes, but chart components often hardcode metric colors. If you change the palette, check hardcoded colors in:

- `Sensors.ts`
- `FarmPalCharts.ts`
- `ChartKit.ts`
- `HeroChart.ts`
- `KpiStrip.ts`
- `Dashboard.ts`
- `System.ts`
- `echarts-preview.html` if carrying prototype options over

## Metric Color Language

Current metric colors are not fully centralized. The main recurring mapping is:

```text
temperature    orange / amber
humidity       cyan / blue
soil_moisture  red/purple depending on component
co2            green
light          yellow
water_level    blue
ph             violet / amber depending on component
weight         slate / cyan depending on component
vpd            violet
```

Pitfall: `Sensors.ts`, `ChartKit.ts`, and `FarmPalCharts.ts` do not perfectly agree on colors. A specialist should centralize metric config before doing a major chart redesign.

Recommended future step:

```text
Create src/web/hal-ui/chart-metrics.ts
```

It should export metric keys, labels, units, colors, axis defaults, thresholds, and formatters. Then import it in Sensors, ChartKit, FarmPalCharts, Dashboard, and any ECharts wrapper.

## Flux Grid / Responsive Layout Model

There is no formal library named "Flux Grid" in this repo. The practical "flux grid" is the responsive CSS grid system used across HAL UI views:

- global `.grid-2`, `.grid-3`, `.grid-4` in `themes.css`
- view-specific grids in `Sensors.ts`, `Dashboard.ts`, `OperatorPanels.ts`, etc.
- `repeat(auto-fit, minmax(...))` for flexible card layouts
- fixed/min-height chart containers to avoid layout jumps
- `min-width: 0` and `overflow-x: hidden` to prevent app shell overflow

Key global layout rules in `themes.css`:

```css
.app-layout {
  display: flex;
  height: 100%;
  width: 100%;
  min-width: 0;
}

.app-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
}

.main-content {
  overflow-x: hidden;
  overflow-y: auto;
}
```

Sensors-specific chart layout:

```css
.hero-chart-wrap {
  min-height: 400px;
  overflow: hidden;
}

#hero-chart {
  width: 100%;
  min-height: 380px;
  height: 400px;
  overflow: hidden;
}

.viz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  grid-auto-rows: minmax(140px, auto);
}
```

The chart layout pitfalls are mostly sizing-related:

- SVGs need stable viewBox dimensions.
- Chart containers need explicit/min heights.
- `min-width: 0` is necessary inside flex/grid parents.
- Legends and stats can push charts out of their intended height.
- Text labels can overflow on mobile if they are not thinned or stepped.
- Hidden sections (`display:none`) cannot be measured reliably by chart libraries until shown.

If using ECharts, call `chart.resize()` after:

- view render
- sidebar collapse/expand
- window resize
- filter/zone/metric changes
- revealing hidden or collapsed sections

## The "No Sensor Data" Problem We Hit

The important recent bug was not that the database had no data. The local HAL database had history rows. The problem was in chart assembly.

Symptoms:

- UI showed "No sensor data" or "No data for selection."
- Server logs did not show browser `console.log()` output.
- API history could return data, but the chart still rendered empty or incomplete.

Root causes and related pitfalls:

1. Browser console logs do not appear in Node server logs.
   - Debug browser code in DevTools, not `tail` on server logs.

2. The old Sensors hero path only mapped `temperature` to `temp` and `humidity` to `humidity`.
   - Active metrics like `co2`, `soil_moisture`, `light`, `ph`, `water_level`, and `weight` could be fetched but never plotted.

3. Multiple sensor devices do not share the same metric set.
   - Fetching CO2 history for a temperature-only device returns empty.
   - Fetching humidity for a CO2-only device returns empty.

4. `availableMetrics` is based on latest store snapshots.
   - It does not guarantee history exists in the currently selected time range.

5. Time range matters.
   - Demo data is timestamped relative to seeding/current runtime.
   - A stale database or a different checkout's DB can have rows outside the selected range.

6. The UI has both source files and bundled dist files.
   - Editing `src/web/hal-ui/views/Sensors.ts` without `npm run hal:ui:build` will not change what the browser sees.

7. Cached browser assets can hide fixes.
   - Hard refresh after rebuild. Consider bumping the query cache-buster in `src/web/hal-ui/index.html` if needed.

8. The HAL UI server can be running from a different checkout.
   - Always verify which checkout owns the active process and DB before debugging.

The current fix in `Sensors.ts`:

- fetches history for selected devices and active metrics
- groups non-empty layers by metric
- buckets readings by minute
- averages matching metric readings across devices in each bucket
- passes every active metric into `renderFarmPalSensorChart()`
- plots normalized 0-100 lines for multi-unit comparison
- displays raw min/avg/max stats with units

## ECharts Suitability

ECharts is a good fit for FarmPal if we want richer operator analysis:

- zoom and pan on long time series
- hover tooltips
- brushing
- legend toggles
- multiple y-axes
- heatmaps
- calendars
- timelines
- gauges
- radar/funnel/treemap/sankey for operations views
- better performance for large datasets than hand-built SVG if configured carefully

Tradeoffs:

- larger bundle
- more dependency surface
- resize lifecycle complexity
- theming must be centralized
- hidden/collapsed containers require careful resize handling
- offline/local-first packaging must include the library locally, not via CDN

Recommended adoption path:

1. Keep the custom SVG charts until a selected ECharts pattern is approved.
2. Add ECharts as a local npm dependency, not CDN.
3. Create one wrapper component, for example:

   ```text
   src/web/hal-ui/components/EChartPanel.ts
   ```

4. Keep chart option generation in pure functions so it can be tested.
5. Start with one view, probably Sensors.
6. Preserve existing controls and data loading at first.
7. Only replace the rendering layer initially.
8. Add cleanup/dispose logic if the view re-renders often.

Do not scatter raw ECharts setup across every view. The app re-renders views by replacing `container.innerHTML`, so unmanaged chart instances can leak.

## Recommended ECharts Wrapper Contract

A future wrapper should handle:

- `echarts.init(element, theme, { renderer: 'canvas' })`
- `setOption(option, true)`
- `resize()`
- `dispose()`
- empty state rendering
- loading state rendering
- theme colors
- reduced-motion behavior
- standard tooltip style
- standard grid margins
- mobile label density

Suggested minimal shape:

```ts
type ChartPanelOptions = {
  element: HTMLElement;
  option: echarts.EChartsOption;
  empty?: boolean;
  emptyText?: string;
};
```

Lifecycle hazard:

The HAL UI does not have a component unmount lifecycle. If ECharts is introduced, store chart instances in a local registry keyed by container ID and dispose before replacing the DOM or reinitializing.

## Data Volume and Performance

The current Sensors chart uses minute buckets:

```text
bucket = Math.floor(timestamp / 60000) * 60000
```

This is good for 24h data, but 30d windows can still produce large datasets if simulator or hardware writes frequently.

Recommendations:

- Continue bucketing on the client for now.
- Consider server-side aggregation for 7d/30d views.
- Use different bucket widths by range:
  - `1H`: raw or 1-minute
  - `6H`: 1-5 minute
  - `24H`: 5-15 minute
  - `7D`: 1-hour
  - `30D`: 6-hour or 1-day
- For ECharts, disable unnecessary symbols on dense lines:

  ```js
  symbol: 'none'
  ```

- Use `sampling: 'lttb'` where appropriate for dense time series.
- Avoid expensive per-point DOM/SVG operations for high-frequency data.

## Chart-Specific Recommendations

### Sensors Hero

Best near-term ECharts replacement:

- multi-series line chart
- normalized overlay mode
- optional raw/unit-specific mode
- tooltip showing raw values for every metric at the hovered timestamp
- legend toggles
- dataZoom for long ranges
- markLines or markAreas for safe bands

The current normalized SVG chart solves the multi-unit problem but loses raw axis semantics. ECharts can improve this with:

- multiple axes for common pairs
- tooltip raw values
- optional "normalize" toggle
- safe bands per metric

### CO2

CO2 should usually have:

- ppm axis
- target band
- high threshold mark line
- visible stale/missing state

CO2 must render when `co2_monitor` or `tent_*_co2_*` history exists. This was one of the original failure cases.

### Soil Moisture

Best pattern:

- heatmap by hour/day and probe
- trend with irrigation events overlaid
- threshold bands for dry/ideal/wet

Avoid mixing soil moisture on the same raw y-axis as CO2 or light.

### pH

Best pattern:

- scatter or line with safe band
- calibration markers
- outlier styling

pH ranges are narrow. If plotted on a normalized chart, always show raw stats/tooltips.

### Relays / Actuators

Best patterns:

- timeline/Gantt spans for on/off state
- stacked daily runtime bars
- overlay control decisions and manual overrides

The actuator timeline should come from relay logs, not sensor history.

### Decisions

Best patterns:

- confidence trend
- status counts
- funnel: suggested -> verified -> blocked/vetoed -> executed
- timeline annotated against sensor state

Decisions are audit artifacts. Preserve exact labels and timestamps.

### Device Health

Best patterns:

- freshness calendar
- online/stale/offline donut or compact summary
- matrix by device and metric

Stale data is different from no data. The UI should distinguish them.

## Design Pitfalls

1. Do not make chart cards too tall or too decorative.
   - FarmPal is operational. Dense but readable is better than a flashy dashboard.

2. Avoid nested cards.
   - Current design guidance prefers cards for repeated items and tool panels, not cards inside cards.

3. Do not rely on color alone.
   - Use labels, legends, axis units, safe bands, and tooltips.

4. Do not hide unavailable metrics without giving the operator context.
   - The current metric pills disappear if latest snapshots do not include that metric. That is efficient, but can confuse debugging.

5. Do not assume one device equals one metric.
   - Some devices have multiple metrics; some have only one.

6. Do not assume zones are explicitly stored.
   - `resolveZoneName()` falls back to ID/name inference for `tent_a_` and `tent_b_`.

7. Do not trust chart screenshots without clicking toggles.
   - Verify metric toggles add/remove series.
   - Verify default zone is All Zones.
   - Verify CO2 renders when CO2 history exists.

8. Do not confuse browser logs and server logs.
   - Client chart errors are in DevTools unless explicitly reported to server.

9. Do not test only with seeded demo data.
   - Test empty DB, stale DB, simulator mode, and real hardware/MQTT data when possible.

10. Do not forget auth/network settings.
    - Authenticate by signing in through the HAL UI login page (operator account created by the setup wizard); there is no auth bypass.
    - LAN/HTTPS settings can affect browser access.

11. Do not start duplicate host runtimes casually.
    - The host uses `data/farmpal.lock`.
    - Telegram polling conflicts occur if more than one bot process is active.

12. Do not use the `289xx` port range for previews.
    - FarmPal local block is `3390`-`3399`.

## Runtime Pitfalls Encountered

These are operational issues that affected chart work and previewing:

- `127.0.0.1:3392` is the default HAL UI.
- `127.0.0.1:3390` is the TUI websocket.
- `127.0.0.1:3393` is the web control center.
- A stale `data/farmpal.lock` can block startup.
- Starting the host inside a sandbox can fail with `listen EPERM`.
- The local direct-start path can accidentally pick up `TELEGRAM_BOT_TOKEN` from `.env` and conflict with another Telegram poller.
- For UI-only local preview, it is safer to start with Telegram disabled.
- `kasa: command not found` warnings can appear during device polling. This is not necessarily a chart blocker.
- Home Assistant `401 Unauthorized` warnings from farm-state collector are not necessarily HAL chart blockers.
- The server may report HAL UI started before a bind failure if startup continues through catch blocks; verify with `curl`.

Useful local preview command pattern:

```bash
env \
  CONTAINER_RUNTIME=host \
  FFT_NANO_ALLOW_HOST_RUNTIME=1 \
  WHATSAPP_ENABLED=0 \
  TELEGRAM_BOT_TOKEN= \
  HAL_UI_AUTO_OPEN=0 \
  FFT_NANO_TUI_ENABLED=0 \
  npm run start
```

Then sign in through the HAL UI login page (there is no auth bypass) and open:

```text
http://127.0.0.1:3392/#sensors
```

## Verification Checklist for Chart Changes

Always run:

```bash
npm run hal:ui:build
npm run typecheck
git diff --check
```

For behavioral verification:

1. Open `http://127.0.0.1:3392/#sensors`.
2. Confirm the Sensors hero chart renders.
3. Confirm default zone is All Zones.
4. Toggle temperature, humidity, and CO2.
5. Confirm CO2 adds/removes a visible series when CO2 history exists.
6. Change time ranges: `1H`, `6H`, `24H`, `7D`, `30D`.
7. Select a single device with only one metric and verify the UI does not crash.
8. Select a device/metric combo with no history and verify empty state is clear.
9. Toggle metric/unit/time format and verify stats update.
10. Test mobile width.
11. Hard refresh after rebuild to catch cache issues.
12. Check browser console for chart errors.

API sanity checks:

```bash
curl -s 'http://127.0.0.1:3392/api/hal/state' | head
curl -s 'http://127.0.0.1:3392/api/hal/sensors/latest' | head
curl -s 'http://127.0.0.1:3392/api/hal/sensors/history?device=tent_a_co2_1&metric=co2&from=2026-04-29T00:00:00.000Z&to=2026-04-30T23:59:59.000Z' | head
```

Adjust timestamps to the current data window.

For HAL UI chart toggles specifically, the repo guidance requires verifying:

- dashboard and sensors views
- default zone is All Zones
- metric toggles add/remove chart series
- CO2 renders when `co2_monitor` or other CO2 history exists

## Suggested Specialist Roadmap

### Phase 1: Stabilize Current System

- Centralize metric config.
- Remove dead/hidden chart paths or label them clearly as experimental.
- Add a shared chart empty/loading/error component.
- Add a chart data aggregation helper with tests.
- Make time bucketing range-aware.
- Make zone/device/metric availability easier to debug.

### Phase 2: Decide SVG vs ECharts Per View

Keep pure SVG where:

- chart is tiny
- chart is static
- chart is part of a card/KPI
- no tooltip/zoom is needed

Use ECharts where:

- operator needs hover inspection
- long time ranges need zoom
- multiple metrics need toggles
- heatmaps/calendars/timelines are required
- annotations/threshold bands matter

Likely ECharts targets:

- Sensors hero chart
- CO2 detail
- soil moisture heatmap
- relay actuator timeline
- safety/decision funnel
- sensor freshness calendar

Likely pure SVG targets:

- KPI sparklines
- small dashboard cards
- compact status visualizations

### Phase 3: Productionize ECharts

- Add ECharts via npm dependency.
- Implement a wrapper with lifecycle management.
- Add a local FarmPal ECharts theme.
- Convert one chart first.
- Verify bundle size.
- Verify offline/local install behavior.
- Add resize/dispose handling.
- Add accessibility fallbacks and table/detail views for critical data.

## What Not To Do

- Do not edit `src/web/hal-ui/dist/` directly.
- Do not replace all charts at once.
- Do not load ECharts from CDN in production.
- Do not remove calibration handling from the server.
- Do not plot all metrics on a raw shared axis.
- Do not silently drop metrics because they are not temperature/humidity.
- Do not start a second Telegram-enabled host during UI testing.
- Do not treat `data/farm-state/telemetry.ndjson` as HAL chart data unless explicitly changing the data model.
- Do not assume the currently running UI is from the current checkout.

## Current Open Questions

These should be resolved before a larger redesign:

1. Should Sensors default to normalized multi-metric overlay, raw dual-axis mode, or a user-toggle between both?
2. Should CO2, pH, and soil moisture have dedicated detail panels with safe bands?
3. Should chart aggregation happen in the browser, server, or both?
4. Should `data/farm-state/telemetry.ndjson` be exposed through a new API for digital-twin charts?
5. Should ECharts be accepted as a production dependency given local/offline requirements?
6. Should chart color/threshold metadata live in a shared registry used by the agent, HAL UI, and safety views?
7. Should hidden Sensors secondary grids be removed, revived, or replaced by ECharts panels?

## Bottom Line

The current visualization system is functional but split across several custom SVG paths. The biggest technical debt is not rendering; it is inconsistent metric metadata, duplicated chart logic, and ambiguous data-source boundaries. A frontend specialist should first preserve the existing HAL data contract, centralize metric definitions, and then introduce ECharts selectively where interaction and data density justify the dependency.

The safest immediate improvement is an ECharts-powered Sensors hero chart that keeps the current controls and API calls but adds tooltip inspection, legend toggles, dataZoom, safe bands, and robust no-data/stale-data states.
