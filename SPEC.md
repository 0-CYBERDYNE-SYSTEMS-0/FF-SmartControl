# FarmPal Design Specification

## Overview

**Product:** FarmPal — standalone smart farm controller for Raspberry Pi 5. No Docker, no HomeAssistant. Direct device control via HAL protocol layer (HTTP/MQTT/GPIO/Serial/V4L2).

**Brand Personality:** Industrial precision meets agricultural warmth. The UI should feel like a professional instrument panel — dense with useful data, but never cluttered. Think: the cockpit of a modern tractor meets a Bloomberg terminal.

**Target Audience:** Farmers and growers who want autonomous control of grow equipment (lights, fans, pumps, sensors, cameras) without cloud subscriptions or complex setups.

**Emotional Response:** Confident, in control, reassured. The UI conveys "your farm is being watched and managed" — not alarming, not passive.

---

## Colors

The palette draws from **dark terminal aesthetic with agricultural green accents** — dark enough to run all-day on a tablet in a grow tent, green enough to feel organic and alive.

```yaml
colors:
  # Backgrounds
  bg-base:       "#0D1117"   # Deep near-black — main background
  bg-surface:    "#161B22"   # Card/panel surfaces
  bg-elevated:   "#21262D"   # Elevated elements, hover states
  bg-input:      "#0D1117"   # Input fields

  # Text
  text-primary:  "#F0F6FC"   # Primary text — bright white
  text-secondary:"#8B949E"   # Secondary/muted text
  text-tertiary: "#484F58"   # Disabled/placeholder text

  # Borders
  border-default:"#30363D"   # Default borders
  border-muted:  "#21262D"   # Subtle separators

  # Accent — Agricultural Green (primary action, active states, growth data)
  accent-green:        "#2EA043"   # Primary accent — green (GROW mode)
  accent-green-bright: "#3FB950"   # Hover/active green
  accent-green-muted:  "#238636"   # Pressed green

  # Accent — Harvest Amber (warnings, manual override, attention)
  accent-amber:        "#D29922"   # Amber — HARVEST mode, warnings
  accent-amber-bright: "#E3B341"  # Hover amber
  accent-amber-muted:  "#9E6A03"  # Pressed amber

  # Accent — Monitor Blue (sensors, data viz, cool info)
  accent-blue:         "#388BFD"   # Blue — MONITOR mode, sensor data
  accent-blue-bright:  "#58A6FF"   # Hover blue
  accent-blue-muted:   "#1F6FEB"   # Pressed blue

  # Status
  status-online:  "#2EA043"   # Device online
  status-offline:"#F85149"   # Device offline / error
  status-unknown:"#8B949E"   # Unknown state

  # Data Viz
  chart-line:     "#3FB950"   # Line graphs — green
  chart-fill:     "#2EA04326" # Chart fill (25% opacity)
  chart-grid:     "#21262D"   # Chart gridlines
```

---

## Typography

**Font Stack:** System UI stack for maximum performance on Raspberry Pi. No web font downloads.

```yaml
typography:
  # Headlines
  h1:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em

  h2:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3

  h3:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4

  # Body
  body-lg:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6

  body-md:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5

  body-sm:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5

  # Labels and data — monospace for precision
  label:
    fontFamily: "SF Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace
    fontSize: 12px
    fontWeight: 500
    letterSpacing: 0.02em

  data-lg:       # Big KPI numbers
    fontFamily: "SF Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1

  data-md:       # Medium metric values
    fontFamily: "SF Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.2

  data-sm:       # Small sensor readings
    fontFamily: "SF Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace
    fontSize: 14px
    fontWeight: 400

  # Captions / timestamps
  caption:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
    fontSize: 11px
    fontWeight: 400
    color: text-secondary
```

---

## Layout

**Grid System:** 8px base unit. All spacing is multiples of 8 (or 4px for micro-adjustments).

```yaml
spacing:
  base:   8px
  xs:     4px
  sm:     8px
  md:     16px
  lg:     24px
  xl:     32px
  2xl:    48px
  gutter: 16px
  margin: 16px

grid:
  columns:      12
  maxWidth:     1200px
  tabletBreak:  1024px
  mobileBreak:  768px

# Responsive grid behavior:
# >= 1024px: 3-column card grid
# 768-1023px: 2-column card grid
# < 768px: 1-column stacked
```

**Page Structure:**

```
┌─────────────────────────────────────────────────────┐
│ HEADER: Logo | Mode Badge | Theme Toggle | Time     │  48px fixed
├─────────────────────────────────────────────────────┤
│ VIEW TABS: Dashboard | Devices | Sensors | Decisions | Cameras │  44px
├─────────────────────────────────────────────────────┤
│                                                     │
│  MAIN CONTENT AREA                                  │
│  (view-specific grid of cards/panels)               │
│                                                     │
│  max-width: 1200px, centered                       │
│  padding: 24px                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Left Sidebar (Navigation):** NOT used. Full-width header with tab navigation is cleaner on tablet. The sidebar in the reference image is for design-doc navigation — not applicable to the FarmPal control panel.

---

## Elevation & Depth

**Approach:** Subtle borders and tonal contrast. No drop shadows (too heavy for dark interfaces).

```yaml
elevation:
  surface-1:   # Cards/panels
    background: bg-surface
    border: 1px solid border-default
    borderRadius: 8px

  surface-2:   # Elevated elements (dropdowns, modals)
    background: bg-elevated
    border: 1px solid border-default

  interactive:  # Buttons, toggles
    border: 1px solid border-default
    hoverBorder: accent-green
    transition: border-color 150ms ease
```

---

## Shapes

```yaml
shapes:
  radius-sm:  4px    # Buttons, inputs, small elements
  radius-md:  8px    # Cards, panels, modals
  radius-lg:  12px   # Large cards, drawers
  radius-full: 9999px # Pills, badges, toggles
```

---

## Components

### Header
- Fixed 48px height, full-width
- Left: FarmPal wordmark (text, not logo)
- Center: Mode badge (GROW / HARVEST / MONITOR) — pill shaped, colored
- Right: Theme toggle (dark/light), current time
- Border-bottom: 1px border-default

### View Tabs
- Horizontal tab bar below header, 44px height
- 5 tabs: Dashboard, Devices, Sensors, Decisions, Cameras
- Active tab: bottom border 2px accent-green, text-primary
- Inactive: text-secondary, hover: text-primary

### Cards (Device Card, Sensor Card, Decision Card)
- Background: bg-surface
- Border: 1px solid border-default, radius-md
- Padding: 16px
- Hover: border-color transitions to accent-green (for active/online)
- States: online (green left border), offline (red left border), unknown (gray left border)

### Toggle (Device Power Control)
- Pill-shaped track (40px × 22px)
- Off: bg-elevated, border
- On: bg-accent-green
- Thumb: white circle, 18px
- Transition: 200ms ease

### Sensor Chart
- uPlot line chart
- Line color: chart-line (accent-green)
- Fill: chart-fill (green at 15% opacity)
- Grid: chart-grid
- Axis labels: text-secondary, label typography
- Height: 120px for sparklines, 240px for full charts

### KPI Metric Display
- Large number: data-lg typography
- Label below: body-sm, text-secondary
- Trend indicator: small up/down arrow, colored

### Buttons
- **Primary:** bg accent-green, white text, radius-sm
- **Secondary:** bg-elevated, text-primary, border border-default
- **Ghost:** transparent, text-secondary, hover: bg-elevated
- Height: 36px, padding: 0 16px
- Font: body-md, weight 500

### Modal / Drawer
- Backdrop: black at 60% opacity
- Panel: bg-surface, radius-lg, max-width 480px
- Header: h3, border-bottom
- Close: X button top-right

### Toast Notifications
- Bottom-right corner, stacked
- bg-elevated, border-left 4px (green=success, amber=warning, red=error)
- Auto-dismiss: 4 seconds
- Max 3 visible

### Theme Toggle
- Small pill toggle in header
- Sun/Moon icons
- Dark mode default

---

## Do's and Don'ts

### Do
- Use dark background as default — growers run this in tents
- Show sensor data as charts — trends communicate farm health faster than numbers
- Use the mode color (green/amber/blue) as the primary accent throughout the view
- Show device online/offline state clearly with color-coded left borders
- Keep the UI dense but breathable — 16px padding in cards, 24px page margins

### Don't
- Don't use heavy shadows — use borders instead
- Don't use bright white (#FFFFFF) on dark backgrounds — use text-primary (#F0F6FC)
- Don't mix accent colors within a single view — one mode, one accent
- Don't show empty states without explanation — use placeholder cards with "No devices yet" + action
- Don't use web fonts — system UI stack only for Raspberry Pi performance
- Don't animate gratuitously — CSS transitions only, max 200ms, only for state changes

---

## Views

### Dashboard
- Hero metrics row: 4 KPI cards (Active Devices, Sensors Polling, Decisions Today, Uptime)
- Device grid: 3-column card grid showing device states
- Recent decisions: last 5 decision log entries
- Sensor sparklines: 3 mini charts for temperature, humidity, light

### Devices
- Device cards in 3-column grid
- Each card: device name, type icon, protocol badge, power toggle, last seen
- Top-right: "+" button to add/discover devices
- Filter bar: All / Plugs / Sensors / Cameras / Relays

### Sensors
- Full-width sensor chart (240px height) — uPlot
- Time range selector: 1H / 6H / 24H / 7D
- Sensor history table below chart
- Per-sensor reading cards

### Decisions
- Decision log as expandable rows
- Each row: timestamp, trigger, decision made, confidence
- Color-coded left border by decision type (auto/manual)

### Cameras
- Thumbnail grid (2-column on tablet)
- Click to open camera capture modal
- Manual capture button per camera
- Last capture timestamp

---

## Technical Constraints

- **Framework:** Vanilla TypeScript + CSS only (no React/Vue/Svelte)
- **Build:** esbuild (already in project deps)
- **Source:** `src/web/hal-ui/` (TypeScript source, not compiled by tsc)
- **Serve:** Via `src/web/control-center-server.ts` static handler at `/hal-ui/`
- **No external dependencies** beyond what's already in package.json
- **Performance target:** < 200ms interaction response on Raspberry Pi 5
