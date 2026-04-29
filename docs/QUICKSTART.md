# FarmPal Quick Start Guide

**Time: 15 minutes | Difficulty: Easy | No technical skills needed**

FarmPal is a smart farm controller that runs on a Raspberry Pi computer. It watches your sensors, controls your grow lights and irrigation, and keeps your plants healthy — all automatically.

This guide walks you through setting up FarmPal from start to finish.

---

## What You Need

Before you begin, gather these items:

- **Raspberry Pi 5 or 4** (the computer that runs FarmPal)
- **MicroSD card** (32GB or larger, Class 10 or faster)
- **Computer** (Windows, Mac, or Linux) with an SD card reader
- **Ethernet cable** (for wired internet — this is the easiest setup)
- **Power supply** (USB-C for Pi 5, USB-C for Pi 4)
- **Sensors and relays** for your growing setup (optional for first test)

---

## Step 1: Flash the SD Card

"Flashing" means copying the FarmPal system onto your SD card.

### Download the Image

1. Go to the FarmPal download page
2. Download the latest `farmpal-image.img.xz` file
3. Save it to your computer (this may take a few minutes)

### Flash the Card

You need a program to flash the image onto the SD card.

**Option A: Balena Etcher (Easiest)**
1. Download [Balena Etcher](https://etcher.balena.io/) for free
2. Install and open it
3. Click **Flash from file** and select the downloaded `.img.xz` file
4. Click **Select target** and choose your SD card
5. Click **Flash** and wait (about 10 minutes)

**Option B: Raspberry Pi Imager**
1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Install and open it
3. Click **Choose OS** → scroll down → click **Use custom** and select the downloaded `.img.xz` file
4. Click **Choose Storage** and select your SD card
5. Click the gear icon (⚙️) for advanced options:
   - Set a hostname (e.g., `farmpal`)
   - Enable SSH (for advanced users only)
   - Configure WiFi if you cannot use Ethernet
6. Click **Write** and wait

**Check the card after flashing:**
The SD card will appear in your file explorer as a small drive called `boot`. This is normal.

---

## Step 2: Connect the Hardware

Before turning on the Pi, connect everything:

```
[Router/Modem] ←── Ethernet cable ──→ [Raspberry Pi]
                                              │
                                         Power supply
```

### Minimum Connection (for testing):
1. Connect the Pi to your router with an Ethernet cable
2. Connect the power supply — but **do not turn it on yet**

### Full Connection (for growing):
1. Connect the Pi to your router with an Ethernet cable
2. Connect your USB relay board to the Pi's USB port
3. Connect your sensors to the relay board following the wiring diagrams in the HARDWARE guide
4. Connect the power supply — but **do not turn it on yet**

---

## Step 3: First Boot

Now you are ready to turn on FarmPal for the first time.

1. Insert the SD card into the Raspberry Pi
2. Turn on the power
3. Wait **2-3 minutes** — the Pi is setting itself up on the first boot

**How do you know it's ready?**

The green activity light on the Pi will blink steadily after 1-2 minutes. If you connect a monitor via HDMI, you will see the FarmPal logo appear.

---

## Step 4: Open the Setup Wizard

FarmPal has a web-based setup wizard. You open it from any browser on your network.

### Finding FarmPal

**Option A: Use the easy address (recommended)**
1. Open a web browser (Chrome, Firefox, Safari, Edge)
2. Type in the address bar: `http://farmpal.local`
3. Press Enter

**Option B: Find the IP address**
If `farmpal.local` does not work:

1. Log into your router and look for "connected devices" or "DHCP clients"
2. Find the device named "farmpal" or with an IP address like `192.168.1.xx`
3. Open a browser and type that IP address (e.g., `http://192.168.1.100`)

**What if I have no monitor?**
You do not need a monitor. The Pi works "headlessly" — you control it entirely from your browser.

### The Setup Wizard

The first time you open FarmPal, you will see the setup wizard. This takes about 5 minutes.

**Screen 1: Admin Password**
- Create a password for your FarmPal dashboard
- Must be at least 8 characters
- Write this down — you will need it every time you log in

**Screen 2: Farm Name**
- Give your farm a name (e.g., "Greenhouse #1" or "My Backyard Garden")
- You can leave it blank and it will default to "My Farm"

**Screen 3: Timezone**
- Select your timezone from the list
- This is used for scheduling and logs

**Screen 4: WiFi** (if no Ethernet cable is connected)
- Select your WiFi network from the list
- Enter your WiFi password
- If your network is not listed, click **Enter network name manually**

**Screen 5: AI Provider**
- Select how FarmPal gets its instructions:
  - **Ollama (Local)** — Recommended. Runs AI on your Pi (free, works offline)
  - **Cloud AI** — Uses OpenAI or Anthropic (requires internet and API key)
- For first setup, choose **Ollama (Local)**

**Screen 6: Telegram** (optional)
- Telegram lets you control FarmPal from your phone
- Click **Skip** if you do not want this yet

**After the wizard:**
- FarmPal saves your settings
- You are redirected to the dashboard
- Your farm is now running!

---

## Step 5: Explore the Dashboard

The dashboard is your main control center. Here is what you see:

### Top Header
- **FarmPal logo** — always visible
- **Farm name** — the name you gave in the wizard
- **Mode badge** — shows GROW, HARVEST, or MONITOR
- **Settings gear icon** — click to change settings

### Main Views

Use the tabs at the top to navigate:

1. **Dashboard** — Overview of your farm with key numbers and recent activity
2. **Devices** — All your sensors and relay controls
3. **Sensors** — Charts showing sensor readings over time
4. **Decisions** — Log of what FarmPal has done and why
5. **Cameras** — Live camera feeds (if you have cameras set up)

### KPI Strip
The dashboard shows key numbers at a glance:
- **Temperature** — how warm it is
- **Humidity** — how moist the air is
- **Soil Moisture** — how wet the soil is
- **Light** — how much light your plants are getting
- **CO₂** — carbon dioxide level (if you have a CO₂ sensor)

---

## Step 6: Connect Your Devices

For FarmPal to control your growing environment, you need to add your devices.

1. Click the **Devices** tab
2. Click **Add Device** (or the + button)
3. Choose your device type:
   - **GPIO** — for devices connected directly to the Pi's pins
   - **MQTT** — for smart home devices using the MQTT protocol
   - **HTTP/Tasmota** — for Tasmota smart plugs
   - **HTTP/Shelly** — for Shelly smart switches
   - **Serial** — for USB devices like BME280 sensors

4. Follow the on-screen instructions for your specific device

### Quick Test: Add a Simulated Device

If you do not have real devices yet, you can test with simulated data:

1. Go to **Settings** (gear icon) → **Simulator**
2. Enable **Demo Mode**
3. Return to the dashboard — you will see simulated sensor readings

---

## Understanding the Modes

FarmPal has three operation modes. Switch between them by clicking the mode badge in the header.

### 🌱 GROW Mode (Green)
For active growing. FarmPal makes decisions automatically to keep your plants healthy.

### 🍂 HARVEST Mode (Amber)
For harvest time. Disables automatic watering and lets you manually control everything.

### 👁️ MONITOR Mode (Blue)
For observation only. FarmPal watches and logs data but does not take any actions.

---

## Getting Help

If something is not working, try the TROUBLESHOOTING guide (accessible from **Settings → Help → Troubleshooting**).

For additional support:
- Visit [farmpal.io/support](https://farmpal.io/support)
- Email: support@farmpal.io

---

## What to Do Next

✅ **Congratulations!** Your FarmPal system is up and running.

Now you can:
- Add and configure your sensors
- Set up automation rules
- Check sensor charts to understand your grow environment
- Configure alerts for temperature extremes

The HARDWARE guide has wiring diagrams for common sensor and relay setups.

---

## Quick Reference

| Question | Answer |
|---|---|
| Default address | `http://farmpal.local` |
| Default port | 3392 |
| Admin password | Set during wizard |
| Where is data stored? | On the SD card in the Pi |
| Does it work offline? | Yes, core features work without internet |
| Can I use WiFi instead of Ethernet? | Yes, configure in the wizard or Settings |

---

*FarmPal is designed to run 24/7. Once set up, you rarely need to touch it — it manages your grow environment automatically.*
