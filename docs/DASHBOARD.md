# FarmPal Dashboard Guide

**Audience: All operators | Reading Level: Grade 8**

The FarmPal Dashboard is your main control center. This guide explains every view, control, and chart so you can understand your farm at a glance.

---

## Overview

The Dashboard is a web-based interface that works on:
- Desktop and laptop browsers
- Tablets (primary use case)
- Smartphones (for quick checks)

**Access the Dashboard:**
- Open a web browser (Chrome, Firefox, Safari, Edge)
- Go to: `http://farmpal.local:3392`
- Or go to the Pi's IP address (e.g., `http://192.168.1.100:3392`)

**Login:** Enter your admin username and password (set during the setup wizard).

---

## Main Navigation

At the top of every page, you will see:

```
[🌱 FarmPal Logo]  [Farm Name]  [GROW/HARVEST/MONITOR badge]  [⚙️ Settings]
```

### Header Icons

| Icon | What It Does |
|---|---|
| FarmPal Logo | Returns to the main Dashboard view |
| Farm Name | Shows your farm's name |
| Mode Badge | Click to switch between GROW, HARVEST, MONITOR modes |
| Settings Gear | Opens Settings, Help, and other options |

### Tab Bar

Below the header is a row of tabs:

| Tab | What You'll See |
|---|---|
| **Dashboard** | Overview with key numbers and recent activity |
| **Devices** | List of all your sensors and relay controls |
| **Sensors** | Charts showing sensor readings over time |
| **Decisions** | Log of what FarmPal has decided and why |
| **Cameras** | Live camera feeds (if cameras are set up) |

---

## Dashboard View

The Dashboard gives you a quick snapshot of your farm's health.

### KPI Strip (Key Numbers)

At the top of the Dashboard, you will see five key measurements:

| Measurement | What It Shows | Unit |
|---|---|---|
| **Temperature** | How warm or cold it is | °C or °F |
| **Humidity** | Moisture in the air | % (percent) |
| **Soil Moisture** | How wet the soil is | % (percent) |
| **Light** | Light intensity | lux or µmol/m²/s |
| **CO₂** | Carbon dioxide level | ppm (parts per million) |

**Reading the KPI Strip:**
- If a number is **green** — the reading is within the normal range
- If a number is **amber/yellow** — the reading is outside normal range but not critical
- If a number is **red** — the reading is at a critical level
- If a reading shows **"No data"** — the sensor is not reporting

### Recent Decisions Cards

Below the KPI strip, you will see cards showing recent decisions FarmPal has made.

Each card shows:
- **What was decided** (e.g., "Turned on grow light")
- **Confidence** — how sure FarmPal was about the decision (as a percentage)
- **Time** — when the decision was made

### System Status Indicators

In the header or footer, small colored dots show the status of key systems:

| Indicator | Green (OK) | Red (Problem) |
|---|---|---|
| **HAL** | Hardware layer is working | Hardware layer has an error |
| **MQTT** | Message broker is connected | Message broker is disconnected |
| **DB** | Database is working | Database has an error |

---

## Devices View

The Devices view shows all your connected hardware.

### Device List

Each device appears as a card with:
- **Name** — a label you assigned (e.g., "Tent 1 Light")
- **Type icon** — shows what kind of device (sensor, relay, camera)
- **Status dot** — green (online), red (offline), gray (unknown)

### Device States

| State | Color | What It Means |
|---|---|---|
| **Online** | Green | Device is connected and reporting normally |
| **Offline** | Red | Device is not responding — check wiring/power |
| **Unknown** | Gray | FarmPal has not heard from this device yet |

### Relay Controls

If a device is a relay (a switch that turns things on/off), you will see a **power toggle button**.

**To manually control a relay:**
1. Find the device card in the Devices view
2. Click the **toggle button** (⏻)
3. The relay will turn ON or OFF
4. The button will update to show the new state

**Note:** If the relay is under autonomous control (automated by FarmPal), you will see a confirmation dialog asking if you want to override the automatic decision.

### Device Filters

If you have many devices, use the filter bar:
- **Search by name** — type to filter devices by name
- **Filter by type** — show only sensors, only relays, or only cameras
- **Filter by status** — show only online or only offline devices
- **Filter by zone** — show devices in a specific area

---

## Sensors View

The Sensors view shows charts of all your sensor readings over time.

### Hero Chart

The large chart at the top shows your sensor data as **area charts** — filled-in line graphs.

**How to read the chart:**
- **X-axis (horizontal)** — Time (left is older, right is newer)
- **Y-axis (vertical)** — The sensor value (temperature, humidity, etc.)
- **Filled area** — The color fill under the line represents the data range
- **Line** — The line itself shows the exact value at each point

### Time Range Buttons

Above the chart, buttons let you choose the time window:

| Button | Time Window | Best For |
|---|---|---|
| **1H** | 1 hour | Watching what is happening right now |
| **6H** | 6 hours | Seeing the day's trend |
| **24H** | 24 hours | Daily patterns |
| **7D** | 7 days | Weekly patterns |
| **30D** | 30 days | Monthly overview |

### Metric Toggles

Below the chart, toggle buttons let you show or hide different measurements:
- **Temperature** — shows/hides temperature data
- **Humidity** — shows/hides humidity data
- **Soil Moisture** — shows/hides soil moisture data
- **Light** — shows/hides light level data
- **CO₂** — shows/hides CO₂ data (only appears if you have a CO₂ sensor)

### Zone Filter

If you have multiple growing areas (zones), a dropdown lets you filter the chart to show only one zone:
- **All Zones** — shows data from all sensors
- **[Zone Name]** — shows only data from that zone

### Data Quality Indicators

Each reading has a quality badge:

| Badge | Meaning |
|---|---|
| **Green dot** | Fresh data (received within the last 5 minutes) |
| **Amber "STALE"** | Old data (more than 5 minutes since last reading) |
| **Red "ERROR"** | The sensor had a problem reading the value |

---

## Decisions View

The Decisions view shows a log of everything FarmPal has decided to do.

### Decision Log

Each row in the log shows one decision. Click on a row to expand it and see more details.

**Collapsed row shows:**
- What was decided (e.g., "Turned off watering pump")
- Confidence percentage
- How long ago (e.g., "5 minutes ago")

**Expanded row shows:**
- The **full decision** — exactly what was done
- **Sensor snapshot** — what the sensor readings were at the time
- **Reasoning** — why FarmPal made this decision
- **Outcome** — what happened as a result (success or failure)

### Status Filter

Filter the log by decision outcome:

| Filter | What It Shows |
|---|---|
| **All** | Every decision |
| **Success** | Only decisions that completed successfully |
| **Failure** | Only decisions that had problems |
| **Pending** | Decisions that are still in progress |

### Activity Heatmap

Below the log, a heatmap shows when FarmPal is most active:
- **X-axis:** Hour of the day (0–23)
- **Y-axis:** Day of the week (Mon–Sun)
- **Color intensity:** How many decisions were made (darker = more)

This helps you see patterns in your farm's automation.

### Decision Trend Chart

A bar chart shows how many decisions were made per hour over the last 24 hours. Tall bars mean lots of activity. This helps you understand your farm's rhythm.

---

## Cameras View

The Cameras view shows live feeds from your connected cameras.

### Camera Grid

Cameras appear as a grid of cards, each showing:
- **Camera name** — a label you assigned (e.g., "Tent 1 Camera")
- **Thumbnail** — a snapshot from the camera
- **Last capture** — when the last image was taken
- **Status** — online (showing feed) or offline (no connection)

### Capture Button

Click the **Capture** button on a camera card to take a new snapshot. The thumbnail will update within a few seconds.

### Demo Mode

If you have not set up any cameras yet, you will see a **demo/placeholder image** with a "Demo Mode" label. This is normal — real camera feeds will appear once you add cameras.

---

## Mode Switching

FarmPal has three operation modes. The current mode is shown as a badge in the header.

### 🌱 GROW Mode (Green)

**For:** Active growing season

What happens in GROW mode:
- FarmPal makes decisions **automatically**
- Autonomous control is **enabled**
- Sensors are monitored continuously
- FarmPal acts on thresholds and schedules

### 🍂 HARVEST Mode (Amber)

**For:** Harvest time

What happens in HARVEST mode:
- **Disables automatic watering** and some automated actions
- Lets you **control everything manually**
- Still monitors sensors and logs data
- Emergency stop is still active

### 👁️ MONITOR Mode (Blue)

**For:** Observation only

What happens in MONITOR mode:
- **No automatic actions are taken**
- FarmPal only **watches and records** data
- Useful for checking sensor trends without triggering devices
- Good for quiet periods or troubleshooting

### How to Switch Modes

1. Click the **mode badge** in the header (it shows GROW, HARVEST, or MONITOR)
2. A menu appears with the three mode options
3. Click the mode you want
4. The badge and accent color change immediately

**Note:** Only users with admin access can change modes.

---

## Settings Panel

Click the **gear icon (⚙️)** in the header to open Settings.

### Settings Sections

| Section | What You Can Do |
|---|---|
| **Farm Info** | Change farm name |
| **Timezone** | Change timezone (affects schedules and logs) |
| **AI / LLM Provider** | Change AI settings (Ollama, OpenAI, etc.) |
| **Updates** | Check for FarmPal software updates |
| **Backup & Restore** | Download or restore backups |
| **License** | View and manage your FarmPal license |
| **Network Access** | Configure who can access FarmPal |
| **Factory Reset** | Reset FarmPal to first-boot state |

### Help and Documentation

In Settings, look for the **Help** section with links to:
- **Quick Start Guide** — this guide
- **Hardware Guide** — wiring diagrams and pinouts
- **Safety Guide** — electrical safety and warnings
- **Automation Guide** — how autonomous control works
- **Troubleshooting Guide** — common problems and fixes
- **Backup & Restore Guide** — how to back up your data
- **Factory Reset Guide** — how to reset FarmPal

Click any guide to open it in a new browser tab.

---

## Chart Interpretation Tips

### Understanding Sensor Trends

**Temperature:**
- Look for gradual rises or falls over hours
- Sudden jumps may indicate a door opened, equipment turned on, or a sensor problem
- Daily cycles are normal — temperature typically rises during lights-on periods

**Humidity:**
- Inversely related to temperature (when temp rises, humidity typically drops)
- Spikes can indicate water events (irrigation, condensation)
- Very low humidity may stress plants

**Soil Moisture:**
- Step-pattern drops indicate irrigation events
- Gradual decline between waterings is normal
- Flat readings may indicate a sensor problem or saturated soil

**Light:**
- Square-wave patterns indicate grow lights cycling on/off
- Gradual curves indicate natural sunlight changes
- Light sensors may read 0 in complete darkness

### What the Colors Mean

Charts use your current mode's accent color:
- **Green accent** — GROW mode (active growing)
- **Amber accent** — HARVEST mode
- **Blue accent** — MONITOR mode

The chart line color is set by your mode, but the data itself is always the same.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `D` | Go to Dashboard |
| `V` | Go to Devices |
| `S` | Go to Sensors |
| `L` | Go to Decisions (Log) |
| `C` | Go to Cameras |
| `,` (comma) | Open Settings |
| `Esc` | Close any open panel/modal |

---

## Getting Help

If you need help understanding something on the Dashboard:
1. Click **Settings** (⚙️)
2. Click **Help** section
3. Select the guide you need

Or visit: [farmpal.io/support](https://farmpal.io/support)

---

*Use the Dashboard daily to monitor your farm's health. The more familiar you are with each view, the easier it will be to spot problems early.*
