# FarmPal Troubleshooting Guide

**Audience: All operators | Reading Level: Grade 8**

This guide covers the most common problems and how to fix them. Each issue has step-by-step instructions.

---

## How to Use This Guide

For each problem, you will see:
1. **What the problem looks like** — how to recognize it
2. **Why it happens** — what causes it
3. **How to fix it** — clear steps to resolve the issue

**Before trying fixes:** Make sure FarmPal is fully shut down (not just asleep) before checking any wiring.

---

## Problem 1: FarmPal Is Not on the Network

### Symptoms
- Cannot open `http://farmpal.local` in the browser
- `farmpal.local` does not resolve
- Cannot find the Pi's IP address on your router

### Why It Happens
- Ethernet cable is loose or not connected
- Pi did not get a network address (DHCP issue)
- mDNS service (farmpal.local) is not working

### Fix Steps

**Step 1: Check the physical connection**
1. Make sure the Ethernet cable is firmly plugged into the Pi
2. Check that the other end is plugged into your router
3. The Ethernet port on the Pi should have a blinking green or amber light

**Step 2: Check your router**
1. Log into your router's admin page (usually `192.168.1.1` or `192.168.0.1`)
2. Look for "Connected Devices" or "DHCP Clients"
3. Find a device named "farmpal" or with a MAC address starting with `dc:a6:32` or `e4:5f:19`
4. Note the IP address (e.g., `192.168.1.105`)
5. Open that IP address in your browser

**Step 3: Try a direct connection**
1. Connect a monitor to the Pi's HDMI port
2. Look at the screen — it will show the IP address if networking is working
3. Type that IP address into your browser

**Step 4: Try a different cable or port**
1. Try a different Ethernet cable
2. Try a different port on your router
3. If using a USB-C hub, try connecting directly to the Pi

---

## Problem 2: Sensor Is Not Responding

### Symptoms
- Sensor shows "No data" in the Dashboard
- Sensor shows "Offline" status
- Sensor readings are stuck at the same value
- Sensor reading shows "ERROR"

### Why It Happens
- Sensor is not connected properly
- Sensor is not receiving power
- Sensor address or configuration is wrong
- Cable is damaged

### Fix Steps

**Step 1: Check the physical connection**
1. Turn off the Pi
2. Unplug the sensor and check the cable for damage
3. Replug the sensor firmly — check both ends (at the sensor and at the Pi)
4. Turn the Pi back on
5. Wait 30 seconds and check the Dashboard

**Step 2: Check the power**
1. Many sensors need 3.3V or 5V power
2. Check that the VCC wire (usually red) is connected to the correct pin
3. Check that the GND wire (usually black) is connected to ground
4. If using a breadboard or hub, try connecting directly to the Pi

**Step 3: Check the wiring for I2C sensors (BME280, etc.)**
1. Make sure SDA (data) is on GPIO 2 (Pin 3)
2. Make sure SCL (clock) is on GPIO 3 (Pin 5)
3. Check that no adjacent pins are accidentally bridged
4. Add a 4.7kΩ pull-up resistor between SDA and 3.3V (if not already on the module)

**Step 4: Check the sensor address**
1. Go to **Settings** → **Devices**
2. Find the sensor and click on it
3. Check that the I2C address or serial number matches the sensor's label
4. If wrong, update the address in the device settings

**Step 5: Test with a known-good sensor**
1. If you have another sensor of the same type, try it
2. If the new sensor works, the original sensor may be broken
3. If the new sensor does not work, the problem is with the Pi or wiring

---

## Problem 3: Relay Will Not Turn On

### Symptoms
- Toggle button clicks but nothing happens
- Relay does not click
- Device connected to relay does not turn on
- Relay status stays "off" after toggling

### Why It Happens
- Relay is not receiving power from USB
- Relay is not connected properly to the Pi
- The connected device has a problem
- The relay itself is defective

### Fix Steps

**Step 1: Check the USB connection**
1. Unplug the relay board's USB cable from the Pi
2. Plug it back in firmly
3. Check the Dashboard — the relay should now show as online
4. If using a USB hub, try connecting directly to the Pi

**Step 2: Check the relay board's power light**
1. Most USB relay boards have a power LED
2. If the LED is off, the board is not getting power
3. Try a different USB port on the Pi
4. If using a hub, try a powered hub

**Step 3: Check the device wiring**
1. Turn off power to the device
2. Check the relay's screw terminals:
   - **COM** (common) should connect to the device
   - **NO** (normally open) should connect to the power source
   - **NC** (normally closed) is not used in most setups
3. Check that wires are securely in the screw terminals
4. Check for corrosion or damage on the wires

**Step 4: Test the relay directly**
1. Turn off the Pi
2. Use a jumper wire to manually short the NO and COM terminals on the relay
3. If the connected device turns on, the relay is working and the Pi-to-relay connection is the problem
4. If the device does not turn on, the device or its power supply is the problem

**Step 5: Check the relay is configured in FarmPal**
1. Go to **Settings** → **Devices**
2. Find your relay board
3. Make sure the correct COM port is selected
4. Check that the relay channel number is correct (1-8)

---

## Problem 4: FarmPal Update Fails

### Symptoms
- Update check shows "Update available" but clicking "Install" does nothing
- Update fails partway through
- FarmPal crashes after an update
- Update process hangs

### Why It Happens
- Not enough disk space
- Network connection dropped during download
- Corrupted download
- Update package is incompatible

### Fix Steps

**Step 1: Check disk space**
1. Go to **Settings** → **System** (or **Health**)
2. Check the **Disk Usage** indicator
3. If disk is more than 90% full, you need to free up space
4. Delete old backups: go to **Settings** → **Backup & Restore** → delete old archives
5. Check the SD card size — FarmPal needs at least 4GB free

**Step 2: Retry the update**
1. Wait 1 minute
2. Go to **Settings** → **Updates**
3. Click **Check for Updates**
4. If an update is available, click **Install Update**
5. Keep the browser tab open and do not turn off the Pi during installation

**Step 3: Check network connectivity**
1. Make sure the Pi has a stable internet connection
2. Try a wired Ethernet connection instead of WiFi
3. Check that your router is not blocking access to the update server
4. Try opening `http://farmpal.local:3392` in a different browser

**Step 4: Roll back the update**
1. If FarmPal is still running after a failed update, go to **Settings** → **Updates**
2. Look for a **"Rollback"** button
3. If available, click it to restore the previous version
4. If no rollback is available, you may need to re-flash the SD card

**Step 5: Re-flash the SD card (last resort)**
1. Download the latest FarmPal image from the website
2. Re-flash your SD card (see the QUICKSTART guide)
3. After booting, FarmPal will be in provisioning mode
4. Re-run the setup wizard
5. Restore from your most recent backup

---

## Problem 5: AI/LLM Is Not Responding

### Symptoms
- No autonomous decisions are being made
- Dashboard shows "AI not available" or "LLM offline"
- Decisions view shows only manual actions
- FarmPal makes no decisions even in Autonomous mode

### Why It Happens
- LLM provider (Ollama, OpenAI, etc.) is not configured
- Ollama service is not running
- API key is missing or incorrect
- Network issue preventing cloud AI access

### Fix Steps

**Step 1: Check the LLM provider settings**
1. Go to **Settings** → **AI / LLM Provider**
2. Make sure a provider is selected:
   - **Ollama (Local)** — for running AI on your Pi
   - **OpenAI / Anthropic** — for cloud AI services
3. If using Ollama, make sure Ollama is installed and running on your Pi

**Step 2: Test Ollama locally**
1. Open a terminal on the Pi (or SSH into it)
2. Type: `curl http://localhost:11434/api/tags`
3. If you see a list of models, Ollama is working
4. If you get an error, start Ollama: `sudo systemctl start ollama`

**Step 3: Check the API key (for cloud AI)**
1. Go to **Settings** → **AI / LLM Provider**
2. Find the **API Key** field
3. Make sure the key is entered correctly — no extra spaces
4. Check that the key has not expired or been revoked
5. For OpenAI: go to [platform.openai.com](https://platform.openai.com) and check your API usage
6. For Anthropic: go to [console.anthropic.com](https://console.anthropic.com) and check your account

**Step 4: Switch to a different provider**
1. If one provider is not working, try another:
   - Ollama is free and works offline
   - OpenAI and Anthropic require internet and API keys
2. Go to **Settings** → **AI / LLM Provider**
3. Select a different provider
4. Save and wait 30 seconds

**Step 5: Check the model name**
1. Make sure the model name matches exactly what you have installed
2. For Ollama, common models: `llama3.2`, `mistral`, `phi3`
3. Check the Ollama website or local models list

---

## Problem 6: Dashboard Is Slow or Unresponsive

### Symptoms
- Pages take more than 5 seconds to load
- Clicks do not register immediately
- Charts do not update
- Browser tab freezes

### Why It Happens
- Too many sensors or devices generating data
- Browser has too many tabs open
- Network latency between browser and Pi
- Pi is overloaded with other tasks

### Fix Steps

**Step 1: Refresh the browser**
1. Press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows/Linux) for a hard refresh
2. This clears the browser cache and reloads the page

**Step 2: Close other browser tabs**
1. Having many tabs open uses browser memory
2. Close tabs you are not using
3. Keep only the FarmPal tab open

**Step 3: Use a faster browser**
1. Chrome and Firefox work best with FarmPal
2. Safari and Edge may have slower JavaScript performance
3. Try Chrome if you are using another browser

**Step 4: Check the Pi's performance**
1. Go to **Settings** → **Health** or **System**
2. Check **CPU Usage** — if it is above 80%, the Pi is overloaded
3. Check **Memory Usage** — if above 90%, the Pi is running low on RAM
4. If overloaded, reduce the number of sensors or increase polling intervals

**Step 5: Reduce data load**
1. Go to **Settings** → **Sensors**
2. Reduce the **polling interval** (how often sensors are read)
3. Set a shorter **history retention** period
4. Reduce the number of charts visible at once

---

## Problem 7: Calibration Is Wrong

### Symptoms
- Sensor readings seem off (e.g., shows 25°C but it feels hotter)
- Two sensors of the same type read different values
- Calibration offset does not seem to apply

### Why It Happens
- Sensor needs calibration
- Reference value was entered incorrectly
- Calibration was applied to the wrong channel
- Sensor is placed in a bad location

### Fix Steps

**Step 1: Verify with a reference instrument**
1. Use a trusted thermometer or hygrometer as a reference
2. Place it next to the sensor you want to calibrate
3. Wait 10 minutes for both to stabilize
4. Compare readings

**Step 2: Apply a calibration offset**
1. Go to **Settings** → **Devices**
2. Find the sensor and click on it
3. Find **Calibration** settings
4. Enter the correct reference value
5. Click **Apply Offset**
6. The reading should now match your reference

**Step 3: Reset calibration**
1. Go to **Settings** → **Devices** → [your sensor]
2. Find the **Calibration** section
3. Click **Reset to Zero**
4. The sensor will return to its raw, uncalibrated reading

**Step 4: Check sensor placement**
1. Is the sensor in direct sunlight? This will heat it up.
2. Is the sensor near a heat source (lamp, heater, Pi)?
3. Is the sensor in a place with good airflow?
4. Move the sensor to a better location if needed

---

## Problem 8: Alert Notifications Not Working

### Symptoms
- No alerts arrive even when sensor readings are extreme
- Telegram messages are not coming through
- Email alerts are not received

### Why It Happens
- Alerts are not configured
- Notification channel (Telegram/email) is not set up
- Alert thresholds are set too wide
- Notifications are blocked by settings

### Fix Steps

**Step 1: Check alert configuration**
1. Go to **Settings** → **Alerts**
2. Make sure alerts are **enabled**
3. Check that the sensor you want alerts for is selected

**Step 2: Set alert thresholds**
1. Find the sensor in **Settings** → **Alerts**
2. Set the **Min threshold** (alert when below this)
3. Set the **Max threshold** (alert when above this)
4. Save the settings

**Step 3: Set up Telegram (if not working)**
1. Go to **Settings** → **Notifications**
2. Check that Telegram is enabled
3. Check that the bot token is entered correctly
4. Start a chat with your FarmPal bot — alerts need an active chat

**Step 4: Set up Email (if not working)**
1. Go to **Settings** → **Notifications** → **Email**
2. Enter your SMTP server settings (from your email provider)
3. Enter the recipient email address
4. Click **Send Test Email** to verify

---

## Problem 9: Database Errors

### Symptoms
- Dashboard shows "Database error"
- Sensor history is missing or corrupt
- FarmPal crashes on startup
- Error message mentions "SQLite" or "database"

### Why It Happens
- SD card is failing or full
- Database file is corrupt
- Power loss during a write operation
- Disk space is exhausted

### Fix Steps

**Step 1: Check disk space**
1. Go to **Settings** → **Health**
2. Look at the **Disk Usage** indicator
3. If the disk is full, delete old data:
   - Go to **Settings** → **Backup & Restore**
   - Delete old backup archives
   - Go to **Settings** → **Sensors** → **History**
   - Reduce the history retention period
   - Delete old history data

**Step 2: Restart FarmPal**
1. Go to **Settings** → **System**
2. Click **Restart FarmPal**
3. Wait 2 minutes for it to come back up
4. Check if the error persists

**Step 3: Restore from backup**
1. Go to **Settings** → **Backup & Restore**
2. Find your most recent working backup
3. Click **Restore**
4. This will overwrite the current database with the backup

**Step 4: Factory reset (last resort)**
1. If no backup works, you may need to factory reset
2. See the **Factory Reset Guide** (accessible from **Settings → Help → Factory Reset**)
3. After the reset, re-run the setup wizard
4. Restore from your most recent backup

---

## Getting More Help

If none of these fixes work:

1. **Collect information:**
   - Screenshot any error messages
   - Note what you were doing when the problem started
   - Check the system log: go to **Settings** → **System** → **View Logs**

2. **Search for known issues:**
   - Visit [farmpal.io/support](https://farmpal.io/support)
   - Check the FAQ section
   - Search for your error message

3. **Contact support:**
   - Email: support@farmpal.io
   - Include:
     - Your FarmPal version (found in **Settings** → **About**)
     - What you were trying to do
     - What happened instead
     - Screenshots of any errors
     - Your system log (if available)

---

## Prevention Tips

- **Use a quality SD card** — Class 10 or better, from a known brand
- **Keep FarmPal updated** — updates include bug fixes
- **Monitor disk space** — do not let it fill above 90%
- **Shut down properly** — use the restart/shutdown button in Settings, not by unplugging
- **Back up regularly** — keep regular backups of your configuration
- **Keep sensors clean** — dust and debris affect accuracy
- **Check wiring periodically** — loose wires cause many problems

---

*Most problems can be solved by checking connections, restarting FarmPal, or restoring from backup. If in doubt, contact support.*
