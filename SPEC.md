# FarmPal Web UI — SPEC.md

## 1. Concept & Vision

FarmPal's web UI is a **farm-grade control center** — purpose-built for tablet use in the grow room, barn, or greenhouse. It feels like a cross between an industrial SCADA panel and a premium dark-mode dashboard: information-dense but never cluttered, tactile and immediate, readable at arm's length in bright or dark conditions. Every screen answers one question fast ("what's happening right now?") while still letting you drill down ("why did it do that?"). The aesthetic is terminal-organic — amber phosphor for warnings, green for healthy, blue for informational — switching between these palettes instantly with a single tap.

---

## 2. Design Language

### Aesthetic Direction
**Reference:** Retrofuturist terminal meets modern SCADA — think a 1980s Bloomberg Terminal rebuilt for a 2026 grow room. Dark surfaces with high-contrast data, monospace numerics for readings, geometric sans-serif for labels. Dense information grid, not a marketing page.

### Color Palettes (switchable per view)

All themes have the same structure: surface, border, text-primary, text-muted, accent. Only the accent color changes per theme. A CSS variable `--accent` drives everything: buttons, active states, chart lines, status indicators.

#### Dark Base (default for FARM/DESKTOP views)
| Role | Hex | Usage |
|------|-----|-------|
| Surface | `#0D1117` | Page background |
| Surface-raised | `#161B22` | Card/panel background |
| Surface-overlay | `#21262D` | Hover states, selected tabs |
| Border | `#30363D` | Card borders, dividers |
| Text-primary | `#E6EDF3` | Headings, key values |
| Text-muted | `#7D8590` | Labels, secondary info |
| **Accent-green** | `#3FB950` | Healthy/OK state, "on" toggles |
| **Accent-amber** | `#D29922` | Warning state, caution |
| **Accent-blue** | `#58A6FF` | Informational, links, active |

#### Light Base (optional, for bright grow rooms)
| Role | Hex |
|------|-----|
| Surface | `#F6F8FA` |
| Surface-raised | `#FFFFFF` |
| Surface-overlay | `#EAEEF2` |
| Border | `#D0D7DE` |
| Text-primary | `#1F2328` |
| Text-muted | `#656D76` |
| Accent-green | `#1A7F37` |
| Accent-amber | `#9A6700` |
| Accent-blue | `#0969DA` |

#### Theme Combinations (user-selectable)
```
Dark  + Green (default)   ← "GROW" mode — everything healthy/OK
Dark  + Amber             ← "HARVEST" mode — approaching threshold
Dark  + Blue              ← "MONITOR" mode — informational/observation
Light + Green             ← bright display, healthy state
Light + Amber             ← bright display, caution
Light + Blue              ← bright display, informational
```

### Typography
- **Display / Headings:** `JetBrains Mono` — monospace, technical authority
- **Body / Labels:** `IBM Plex Sans` — geometric, highly legible at small sizes
- **Numeric Data / Readings:** `JetBrains Mono` — tabular figures, easy column scanning
- **Scale:** 11px (micro labels) → 13px (body) → 16px (card titles) → 24px (key metric) → 48px (hero reading)

### Spatial System
- Base unit: `4px`
- Card padding: `16px`
- Grid gap: `12px`
- Border-radius: `8px` (cards), `6px` (buttons), `4px` (inputs)
- Shadow: only on raised surfaces in light theme; dark theme uses border + luminance contrast instead

### Motion Philosophy
- **Purpose:** Motion confirms action, never decorates
- Transitions: `150ms ease-out` for hover states, `250ms ease-out` for panel open/close
- No looping animations while idle (no spinners unless waiting for data)
- Loading: skeleton pulse at 1.5s cycle
- Toggle switch: `200ms` spring-feel cubic-bezier

---

## 3. Layout & Structure

### Shell Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  HEADER BAR  [FarmPal logo] [view tabs]        [theme] [⚙]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                     MAIN CONTENT AREA                            │
│              (changes per active tab/view)                       │
│                                                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Header Bar (fixed, 56px tall):**
- Left: FarmPal wordmark (SVG, accent-colored)
- Center: View tabs — `DASHBOARD`, `DEVICES`, `SENSORS`, `DECISIONS`, `CAMERAS`
- Right: Theme accent switcher (3-dot color picker) + settings gear

### View Tabs (5 primary views)

#### Tab 1: DASHBOARD (default)
Single-pane scrollable view. Sections top-to-bottom:
1. **Hero Metric Row** — 3-4 large current readings (temp, humidity, soil, light) with trend arrows
2. **Device Grid** — 2-3 column card grid of all smart plugs with on/off toggle
3. **Mini Chart Row** — Sparklines for last 24h temp and humidity (inline, no axis labels)
4. **Recent Decisions** — Last 5 agent decisions as a compact list

#### Tab 2: DEVICES
- Full-width device list table: Name | Type | Protocol | State | Last Seen | Actions
- Each row has an inline toggle for on/off and a "..." menu (edit label, remove)
- Bottom FAB: `+ Discover Devices` button

#### Tab 3: SENSORS
- Per-sensor accordion: expand a sensor to see a 24h line chart + reading history table
- Time range selector: 1h / 6h / 24h / 7d
- Metric filter tabs: All | Temperature | Humidity | Soil | CO2 | Light

#### Tab 4: DECISIONS
- Chronological decision log table: Time | Device | Decision | Reasoning | Outcome
- Filter by outcome: All | Success | Failure | Pending
- Expandable rows to see full reasoning + sensor snapshot JSON

#### Tab 5: CAMERAS
- Grid of camera thumbnail cards (each: latest capture + timestamp + device label)
- Click to expand full-size JPEG in a modal
- "Capture Now" button per camera
- "Refresh All" in header

### Responsive Behavior (tablet breakpoints)
The UI must work across three sizes — handled with CSS Grid auto-columns and `clamp()`:

| Breakpoint | Layout |
|---|---|
| `≥1024px` (desktop/tablet landscape) | 3-column device grid, side-by-side panels |
| `768px–1023px` (tablet portrait / small tablet) | 2-column device grid, stacked panels |
| `< 768px` (phone fallback) | 1-column, collapsible sections |

**Critical:** The prototype shows this adapts seamlessly at 768px and 1024px with no content reflow — only column counts change. No content is hidden or reorganized dramatically between sizes.

### Navigation
- Tabs are the primary navigation — always visible, no hamburger menu
- No sidebar — maximizing screen real estate for data
- Keyboard accessible (arrow keys between tabs, Enter to activate)

---

## 4. Features & Interactions

### Theme Switcher (Header Right)
- Three dots: ● ● ● (green / amber / blue)
- Active dot is larger and has a ring
- Click any dot → entire page accent color transitions in 150ms
- Persisted to `localStorage` as `farmpal-accent: 'green' | 'amber' | 'blue'`
- Dark/light mode toggle adjacent — icon button (☀ / ☾), persisted as `farmpal-theme: 'dark' | 'light'`

### Device Toggle (on/off)
- Each device card has a large toggle switch
- Toggle is optimistic — UI updates immediately
- Background request: `halRegistry.control(id, action)` via internal API call
- On failure: toggle snaps back, a toast notification appears: "Failed to toggle [device name]"
- Toggle shows spinner while pending

### Device Discovery
- Click `+ Discover Devices` → modal opens
- Subnet input field (pre-filled from `HAL_SUBNET` env var)
- Progress indicator: "Scanning 192.168.1.1 ... 192.168.1.254" with live count
- Results list as devices are found
- "Register All Found" button at end
- Cancel button available throughout

### Sensor Chart Interaction
- Hover/tap on chart line → tooltip with exact value and timestamp
- Pinch-to-zoom on touch devices (time range)
- Time range selector updates chart without page reload
- Click "Export CSV" link per sensor

### Decision Log Expansion
- Click a row to expand inline
- Expanded view shows: full reasoning text, sensor snapshot (formatted JSON), outcome badge
- "Re-run this decision" button → fires a new decision cycle with same context (for debugging)
- Collapse by clicking again or clicking another row

### Camera Capture
- Click thumbnail → modal with full-size JPEG
- "Capture Now" → calls `V4L2Camera.capture()` via API, replaces thumbnail
- Loading state: thumbnail shows pulse skeleton
- Error state: thumbnail shows broken image icon + "Capture failed" label

### Settings Panel (gear icon)
- Slide-in drawer from right (not a new page)
- Sections: General, HAL Config, About
- General: auto-refresh interval (Off / 30s / 1m / 5m), theme persistence
- HAL Config: MQTT broker URL, subnet, auto mode toggles (read-only, not editable — these are env vars)
- About: FarmPal version, FFT_nano-slim version, commit SHA

### Toast Notifications
- Bottom-center, stacked if multiple
- Auto-dismiss after 4s
- Types: success (green left border), error (red), info (blue), warning (amber)
- Manual dismiss with × button

### Empty States
- No devices: illustration + "No devices yet. Run `/hal discover` in Telegram or tap the button below." + `+ Discover Devices` button
- No sensor data: "Waiting for sensor data..." + explanation text
- No decisions: "No decisions yet. Auto-decisions run every 5 minutes when enabled."

### Loading States
- Initial page load: full-page skeleton with pulsing card outlines
- Data refresh: subtle top-progress bar (2px, accent color)
- API call in progress: button shows spinner + disabled state

---

## 5. Component Inventory

### `<Header />`
- Fixed top, `56px`, full-width
- Contains: Logo, ViewTabs, ThemeSwitcher, SettingsButton
- Border-bottom: `1px solid var(--border)`

### `<ViewTabs />`
- Horizontal scroll on overflow (mobile)
- Active tab: bottom border `2px solid var(--accent)`, text `var(--text-primary)`
- Inactive: text `var(--text-muted)`, no border
- Hover: text `var(--text-primary)` with `50ms` transition

### `<DeviceCard />`
- Surface-raised background, `8px` border-radius, `1px` border
- States: default, hover (slight border lighten), loading (spinner overlay), error (red border)
- Contains: Device icon (by type), Label, Protocol badge, State badge (ON/OFF/UNKNOWN), Toggle switch
- "ON" state: accent-green glow on icon; "OFF": muted; "UNKNOWN": amber

### `<Toggle />`
- `48px × 24px` track, `20px` thumb
- Off: track `var(--surface-overlay)`, thumb `var(--text-muted)`
- On: track `var(--accent)`, thumb white
- Disabled: 40% opacity, cursor not-allowed
- Transition: `200ms cubic-bezier(0.34, 1.56, 0.64, 1)` (spring)

### `<SensorChart />`
- Canvas-based (Chart.js or uPlot)
- Dark theme: grid lines `rgba(255,255,255,0.05)`, axis labels `var(--text-muted)`
- Line colors use accent palette (green for temp, blue for humidity, amber for custom)
- Fill area under line: 15% opacity of line color
- No chart border — only axis lines

### `<DecisionRow />`
- Table row, `48px` min-height
- Expandable: chevron icon rotates `90°` on expand
- Expanded: indented panel with `background: var(--surface-overlay)`
- Outcome badge: `SUCCESS` (green), `FAILURE` (red), `PENDING` (amber)

### `<CameraCard />`
- `16:9` aspect ratio thumbnail
- Overlay at bottom: gradient black `rgba(0,0,0,0.6)` → transparent
- Device label + timestamp overlaid on gradient
- Hover: "Capture Now" button fades in at center
- States: loading (pulse skeleton), error (icon + message)

### `<ThemeSwitcher />`
- Three dots, `16px` diameter each, `8px` gap
- Active dot: `20px` with `2px` ring in accent color
- Click cycles or directly selects

### `<Toast />`
- Fixed bottom-center, `16px` from bottom edge
- `320px` max-width, `8px` border-radius
- Left border `4px` colored by type
- Entry: slide up + fade in `200ms`
- Exit: fade out `150ms`

### `<Modal />`
- Centered, `max-width: 600px`, `8px` border-radius
- Backdrop: `rgba(0,0,0,0.7)` with `backdrop-filter: blur(4px)`
- Entry: fade in backdrop + scale-up modal from `0.95` to `1.0` `200ms`
- Close: × button top-right + backdrop click + Escape key

### `<Drawer />`
- Slides in from right, `320px` wide
- Backdrop same as modal
- Pushes no content (overlay mode)

### `<Badge />`
- `20px` height, `6px` horizontal padding, `4px` border-radius
- Font: `11px` uppercase, `600` weight, letter-spacing `0.5px`
- Color variants: green / amber / blue / red / gray

### `<Skeleton />`
- Pulsing `background: linear-gradient(90deg, var(--surface) 25%, var(--surface-overlay) 50%, var(--surface) 75%)`
- Animation: `background-position` shift `1.5s` infinite
- Matches shape of content it replaces (card shape, row shape, etc.)

---

## 6. Technical Approach

### Stack
- **Framework:** Vanilla TypeScript + HTML + CSS (no framework — single `web/hal-ui/` directory)
- **Build:** `npm run build` via `esbuild` (already in fft_nano dev deps)
- **Charts:** uPlot (lightweight, 15KB gzipped, handles dense sensor data well) — or Chart.js if uPlot is too low-level
- **Icons:** Lucide icons via CDN (consistent stroke-based icon set)
- **Fonts:** Google Fonts (JetBrains Mono + IBM Plex Sans) via `@import`

### File Structure
```
src/web/
├── hal-ui/
│   ├── index.html          # Entry point
│   ├── main.ts             # App bootstrap, router
│   ├── styles/
│   │   ├── reset.css
│   │   ├── tokens.css      # CSS custom properties (all colors, spacing)
│   │   ├── themes.css      # Dark/light + accent combinations
│   │   └── components.css  # All component styles
│   ├── components/
│   │   ├── Header.ts
│   │   ├── ViewTabs.ts
│   │   ├── DeviceCard.ts
│   │   ├── SensorChart.ts
│   │   ├── DecisionRow.ts
│   │   ├── CameraCard.ts
│   │   ├── Toggle.ts
│   │   ├── Modal.ts
│   │   ├── Drawer.ts
│   │   ├── Toast.ts
│   │   └── ThemeSwitcher.ts
│   ├── views/
│   │   ├── DashboardView.ts
│   │   ├── DevicesView.ts
│   │   ├── SensorsView.ts
│   │   ├── DecisionsView.ts
│   │   └── CamerasView.ts
│   ├── api/
│   │   └── hal.ts          # Internal HAL API client (calls FFT_nano HAL routes)
│   └── utils/
│       ├── dom.ts
│       └── format.ts
```

### API Integration (HAL Web Server)
FFT_nano's existing `src/web/control-center-server.ts` is extended to serve HAL UI and expose REST endpoints. New endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hal/devices` | List all hal_devices |
| POST | `/api/hal/devices/:id/control` | `{ action: 'on' \| 'off' }` |
| POST | `/api/hal/devices/discover` | `{ subnet: string }` |
| GET | `/api/hal/sensors/latest` | Latest reading per device/metric |
| GET | `/api/hal/sensors/history?device=:id&metric=:m&from=&to=` | Time-series |
| GET | `/api/hal/decisions?limit=20` | Recent decisions |
| GET | `/api/hal/cameras/:id/capture` | Trigger capture, return JPEG path |
| GET | `/api/hal/state` | Full HAL state snapshot (devices + latest readings) |

### Data Flow
```
Web Browser (HAL UI)
  ↕ fetch /api/hal/*
FFT_nano Web Server (control-center-server.ts)
  ↕ internal calls
HAL Layer (src/hal/*.ts) ← already built
  ↕
SQLite (data/fft_nano.db)
```

### State Management
- No framework-level state — vanilla JS with a simple reactive store
- `store.ts` — single `createStore(initialState)` that components subscribe to
- State shape:
```typescript
interface AppState {
  view: 'dashboard' | 'devices' | 'sensors' | 'decisions' | 'cameras';
  theme: 'dark' | 'light';
  accent: 'green' | 'amber' | 'blue';
  devices: HalDevice[];
  sensors: Record<string, HalSensorReading[]>;
  decisions: HalDecision[];
  toasts: Toast[];
  drawer: { open: boolean; content: string } | null;
}
```

### Responsive Strategy
- Single CSS file (`components.css`) with `@media` queries at `768px` and `1024px`
- CSS Grid with `auto-fill` and `minmax()` for device grids — no JavaScript layout logic
- `clamp()` for font sizes: `clamp(13px, 1.5vw, 16px)` etc.

### Performance
- Sensor chart updates: poll every 30s (configurable), replace canvas data not DOM nodes
- Camera thumbnails: lazy-load with `loading="lazy"`
- Decision log: virtual scroll if > 100 rows (use a lightweight virtual scroller)
- No framework overhead: target `<100ms` interaction response

---

## 7. Implementation Order

1. **tokens.css + themes.css** — all CSS custom properties, dark/light + accent combinations
2. **reset.css + index.html shell** — base HTML with Google Fonts loaded
3. **Header + ViewTabs + ThemeSwitcher** — shell navigation
4. **Dashboard view** — hero metrics + device grid + sparklines
5. **HAL API client** — connect to FFT_nano's existing web server
6. **Devices view** — full device list with toggles
7. **Sensors view** — charts + history table
8. **Decisions view** — expandable log table
9. **Cameras view** — thumbnail grid + capture modal
10. **Modal + Drawer + Toast** — shared overlay components
11. **Settings drawer** — general config + HAL info
12. **Build + serve + verify** — `http://100.72.41.118:<port>` confirmed live

---

## 8. Verification Criteria

- [ ] All 5 views render without console errors
- [ ] Theme accent color switch is instant (< 150ms) across entire UI
- [ ] Dark ↔ Light toggle applies to all components without flash
- [ ] Device toggle is optimistic with rollback on failure
- [ ] Sensor chart renders last 24h of data from SQLite
- [ ] Decision log rows expand to show full reasoning
- [ ] Camera thumbnails load lazily
- [ ] Layout reflows cleanly at 768px and 1024px (no horizontal scroll at any breakpoint)
- [ ] Served at `http://100.72.41.118:<port>/hal-ui/` — verified with curl
