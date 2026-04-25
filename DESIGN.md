---
name: FarmPal
version: "1.0"
colors:
  primary:   "#0D1117"
  secondary: "#161B22"
  tertiary:  "#21262D"
  on-primary:   "#F0F6FC"
  on-secondary: "#8B949E"
  on-tertiary:  "#484F58"
  outline:        "#30363D"
  outline-subtle: "#21262D"
  green:        "#238636"
  green-bright: "#3FB950"
  amber:        "#D29922"
  amber-bright: "#E3B341"
  blue:         "#388BFD"
  blue-bright:  "#58A6FF"
  red:          "#F85149"
  slate:        "#6C7278"
  success: "#2EA043"
  warning: "#D29922"
  danger:  "#F85149"
  info:    "#388BFD"
typography:
  display:
    fontFamily: [-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif]
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
  h1:
    fontFamily: [-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif]
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  h2:
    fontFamily: [-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif]
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  h3:
    fontFamily: [-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif]
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: [-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif]
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: [-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif]
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: ["SF Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace]
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1
  mono-lg:
    fontFamily: ["SF Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace]
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1
  mono-md:
    fontFamily: ["SF Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace]
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.2
  label:
    fontFamily: [-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif]
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.04em
  caption:
    fontFamily: [-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif]
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm:   4px
  md:   8px
  lg:  12px
  xl:  16px
  pill: 9999px
spacing:
  xs:    4px
  sm:    8px
  md:   16px
  lg:   24px
  xl:   32px
  2xl:  48px
components:
  header:
    backgroundColor: "{colors.primary}"
    height: 48px
  tabs:
    backgroundColor: "{colors.primary}"
    height: 44px
  card:
    backgroundColor: "{colors.secondary}"
    rounded: "{rounded.md}"
    padding: 16px
  card-elevated:
    backgroundColor: "{colors.tertiary}"
    rounded: "{rounded.md}"
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    height: 36px
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    height: 36px
    padding: "0 16px"
  toggle:
    backgroundColor: "{colors.tertiary}"
    rounded: "{rounded.pill}"
    width: 40px
    height: 22px
  toggle-active:
    backgroundColor: "{colors.green}"
  badge:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  badge-slate:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  input:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    height: 36px
    padding: "0 12px"
---

## Overview

FarmPal is a standalone smart farm controller for Raspberry Pi 5. No Docker, no HomeAssistant. Direct device control via HAL protocol layer (HTTP/MQTT/GPIO/Serial/V4L2). The agent runs locally, makes decisions autonomously, and serves a tablet-optimized web UI.

**Brand Personality:** Industrial precision meets agricultural warmth. The UI feels like a professional instrument panel — dense with useful data, never cluttered. Cockpit of a modern tractor meets a Bloomberg terminal.

**Target Audience:** Farmers and growers who want autonomous control of grow equipment without cloud subscriptions or complex setups.

**Emotional Response:** Confident, in control, reassured. The UI conveys "your farm is being watched" — not alarming, not passive.

**Mode System:** Three operation modes, each swapping the accent color across the entire interface. Switching mode changes accent instantly with no page reload.
- **GROW** — green accent. Default. Active growth and automation.
- **HARVEST** — amber accent. Manual override, attention states.
- **MONITOR** — blue accent. Observation mode, sensor focus.

**Accent Swapping:** Each mode maps to its accent pair. GROW uses green/green-bright. HARVEST uses amber/amber-bright. MONITOR uses blue/blue-bright. The CSS variables --accent and --accent-bright are set per-mode and drive all accent-driven elements.

---

## Colors

Dark terminal aesthetic. Deep near-black base surfaces optimized for all-day display in grow tents. All five accent hues are defined so any can serve as the active mode accent.

**Base surfaces** — Three tonal layers:
- primary (#0D1117) — page background
- secondary (#161B22) — cards and panels
- tertiary (#21262D) — elevated surfaces, inputs

**Text** — Off-white (#F0F6FC) rather than pure white, reducing eye strain on dark backgrounds.

**Borders** — outline (#30363D) for default borders, outline-subtle (#21262D) for subtle separators.

**GROW Accent** — Agricultural green. Green (#238636) for text/borders, green-bright (#3FB950) for highlights. HARVEST uses amber. MONITOR uses blue. The accent pair updates to the current mode via CSS variables.

**Status colors** — Fixed, independent of mode: success (#2EA043), warning (#D29922), danger (#F85149), info (#388BFD).

**Chart fills** — Use CSS color-mix(in srgb, var(--accent) 15%, transparent) for chart area fills. Defined in CSS, not in the token schema.

---

## Typography

System UI stack only. No web font downloads. Monospace font for all numeric data and timestamps gives the precision of a digital instrument.

**Display (48px)** — Used only for the largest KPI numbers on the dashboard hero.

**Headings (h1 28px, h2 20px, h3 16px)** — Establish visual hierarchy in card headers and section titles.

**Body (16px/14px)** — Readable dense data and descriptions.

**Mono (14px/20px/36px)** — Monospace for all sensor readings, timestamps, metric values, and numeric data. Fixed-width numerals align in columns and evoke instrument displays.

**Labels (12px uppercase)** — Protocol badges (MQTT, HTTP, GPIO), category labels.

**Captions (11px)** — Timestamps, secondary metadata.

---

## Layout

8px base unit. Strict spacing scale. Responsive fluid grid:
- >= 1024px — 3-column card grid
- 768-1023px — 2-column card grid
- < 768px — 1-column stacked

Page anatomy: Fixed 48px header, 44px tab bar, fluid main content area, max-width 1200px, centered, 24px padding.

No sidebar. Tab bar replaces sidebar for clean tablet UX.

Cards use borderRadius md and padding 16px. Borders applied via CSS border: 1px solid var(--border).

---

## Elevation & Depth

Dark interfaces use tonal contrast and borders, not shadows. Drop shadows are too heavy on dark backgrounds.

**Surface cards** — secondary background. 1px border via CSS border: 1px solid var(--border).

**Interactive hover** — CSS border transitions to --accent color. 150ms ease.

**Overlays** — Modals use rgba(0,0,0,0.6) backdrop. Panel uses tertiary background.

**Borders** — Always 1px solid via CSS. Border color adapts to mode accent via CSS variable --border.

---

## Shapes

radius-sm (4px) — Buttons, inputs, small interactive elements.
radius-md (8px) — Cards, panels, standard container radius.
radius-lg (12px) — Large cards, drawers.
radius-pill (9999px) — Toggles, badges, mode indicators.

---

## Components

**Header** — Fixed 48px, full-width. backgroundColor primary. Logo left, mode badge center, theme toggle + clock right. Bottom border via CSS border-bottom: 1px solid var(--border).

**Mode Badge** — Visual anchor. Pill (radius-pill). Background and text use the active mode accent (--accent, --on-accent CSS variables). Displays GROW / HARVEST / MONITOR.

**View Tabs** — Horizontal bar, 44px. backgroundColor primary. Dashboard / Devices / Sensors / Decisions / Cameras. Active tab: bottom-border 2px --accent, color on-primary. Inactive: color on-secondary.

**Card** — backgroundColor secondary, borderRadius md, padding 16px. Border via CSS border: 1px solid var(--border). Left border 3px colored by device state: --accent (online), danger (offline), slate (unknown).

**Toggle** — Power switch. Track: 40x22px, radius-pill. Off: backgroundColor tertiary. On: --accent background. Thumb: 18px white circle. Transition: 200ms ease.

**Button Primary** — backgroundColor green, textColor on-primary, borderRadius sm, height 36px. Primary action. Active accent updates via CSS variable --button-primary-bg.

**Button Secondary** — backgroundColor tertiary, textColor on-primary. Secondary actions.

**Badge** — borderRadius pill, padding 2px 8px. Protocol badges use badge-slate. Mode badges use badge (accent variant).

**Chart** — uPlot line chart. Height: 120px sparkline, 240px full chart. Line: --accent. Fill: --accent at 15% via CSS color-mix(). Grid: outline-subtle. Axis labels: caption typography.

**Metric Display** — Number: mono-lg typography, --accent color. Label: body, on-secondary.

**Input** — backgroundColor primary, borderRadius sm, height 36px. Border via CSS. Focus: border becomes --accent.

**Modal** — Overlay: rgba(0,0,0,0.6). Panel: backgroundColor secondary, borderRadius lg, max-width 480px. CSS border.

**Toast** — Fixed bottom-right, stacked. backgroundColor tertiary. Left border 4px (success/warning/danger). Auto-dismiss 4s, max 3 visible.

---

## Do's and Don'ts

**Do:**
- Use dark background as default — runs all-day in grow tents
- Show sensor data as charts — trends communicate farm health faster than raw numbers
- Use --accent CSS variable for the active mode accent throughout the view
- Color-code device state with left borders: --accent (online), danger (offline), slate (unknown)
- Keep UI dense but breathable — 16px card padding, 24px page margins
- Use monospace for all numeric data and timestamps
- Switch mode accent instantly by updating --accent and --accent-bright CSS variables
- Ensure all text/icon pairs meet WCAG AA (4.5:1) contrast ratio

**Don't:**
- Don't use drop shadows — use borders instead
- Don't use pure white (#FFF) on dark backgrounds — use on-primary (#F0F6FC)
- Don't mix accent colors within a single mode — one mode, one accent via CSS variables
- Don't show empty states without explanation — "No devices yet" + action button
- Don't use web fonts — system UI stack only for Raspberry Pi performance
- Don't animate beyond 200ms CSS transitions — only for state changes, not decoration
- Don't use the active accent for errors — use danger (red) regardless of mode
- Don't use 8-character hex colors with alpha in the token schema — use CSS color-mix() for transparent fills
