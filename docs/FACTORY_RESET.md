# FarmPal Factory Reset Guide

**Audience: All operators | Reading Level: Grade 8 | ⚠️ Contains irreversible operations**

A factory reset returns FarmPal to the same state as when you first flashed the SD card. All your data is erased. This guide explains exactly what happens, when to do it, and how to confirm.

---

## What Is a Factory Reset?

A **factory reset** (also called a "hard reset" or "master reset") erases all data from FarmPal and returns it to its original "out of the box" state.

After a factory reset:
- All sensors and devices are removed from the registry
- All automation rules and safety policies are deleted
- All sensor history and decision logs are erased
- Your admin password is cleared
- All settings are returned to defaults

FarmPal then starts in **provisioning mode** — the same state it was in the first time you turned it on. You will need to run the setup wizard again.

---

## When to Use Factory Reset

### ✅ Good Reasons to Factory Reset

**1. You are selling or giving away your FarmPal device**
- Removes all your personal data and settings
- The new owner gets a clean start

**2. FarmPal is so broken it cannot be fixed**
- Database is corrupt and backups will not restore
- You have forgotten the admin password (there is no recovery)
- You want to start fresh after many experimental changes

**3. You are moving FarmPal to a completely different use**
- Switching from one crop to another
- Starting a new farm from scratch

### ❌ Do NOT Factory Reset If

**You just need to fix a problem** — try these first:
- Restart FarmPal: **Settings** → **System** → **Restart**
- Restore from a backup: **Settings** → **Backup & Restore** → **Restore**
- Check the Troubleshooting guide for your specific problem

**You forgot your password** — there is no reset without erasing everything. If you have a backup, you can restore your settings after the reset.

**You want to update FarmPal** — use the normal update process instead. Updates do NOT require a factory reset.

---

## What Is Erased

A factory reset permanently deletes:

### Data That Is Deleted

| Data | Erased | Notes |
|---|---|---|
| **Device registry** | ✅ Yes | All sensors, relays, and cameras are removed |
| **Sensor history** | ✅ Yes | All recorded readings are deleted |
| **Decision log** | ✅ Yes | All autonomous decisions are deleted |
| **Audit log** | ✅ Yes | All safety and action logs are deleted |
| **Automation rules** | ✅ Yes | All thresholds, schedules, and rules are removed |
| **Safety policies** | ✅ Yes | All safety rules and dependencies are deleted |
| **Calibration data** | ✅ Yes | All sensor calibration offsets are removed |
| **Farm settings** | ✅ Yes | Farm name, timezone, all preferences reset |
| **LLM/API settings** | ✅ Yes | AI provider, models, API keys are cleared |
| **Network settings** | ✅ Yes | WiFi, Ethernet, access mode reset to defaults |
| **Admin password** | ✅ Yes | You must create a new password |
| **Backup archives** | ✅ Yes | All local backups are deleted |
| **Control Center token** | ✅ Yes | The `web-control-center-token` file is deleted; a new token is generated on next start |
| **Licenses** | ⚠️ Partial | License key is removed, but hardware binding remains |

### What Is Preserved

| Data | Preserved | Notes |
|---|---|---|
| **SD card image** | ✅ Yes | The operating system stays intact |
| **FarmPal software version** | ✅ Yes | No change to installed version |
| **Docker/container setup** | ✅ Yes | (If applicable — unchanged) |
| **systemd service configuration** | ✅ Yes | Service settings remain |

### What You Will Need to Reconfigure

After a factory reset, you will need to:
1. Run the setup wizard again (farm name, timezone, AI, etc.)
2. Re-add all your devices
3. Recreate all automation rules
4. Reconfigure safety policies
5. Re-calibrate all sensors

---

## Before You Factory Reset: Checklist

Complete these steps **before** starting the factory reset:

- [ ] **Back up your current configuration**
  - Go to **Settings** → **Backup & Restore** → **Backup Now**
  - Save the file somewhere safe (your computer, cloud drive)
  - This lets you restore your settings if needed

- [ ] **Take photos of your device settings**
  - Screenshot your automation rules
  - Screenshot your safety policies
  - Note your device names and zones

- [ ] **Record your hardware setup**
  - Write down which sensors are connected to which ports
  - Note the wiring for any custom setups

- [ ] **Check your license status**
  - Your license is bound to the hardware, not the SD card
  - After the reset, you will not need to reactivate — the hardware binding remains

---

## How to Factory Reset (From the Dashboard)

**Step 1: Open Settings**
1. Open a browser and go to `http://farmpal.local:3392`
2. Log in with your admin account
3. Click the **settings gear icon (⚙️)** in the header

**Step 2: Navigate to Factory Reset**
1. Scroll down to the **Factory Reset** section
2. Click **Factory Reset**

**Step 3: Read the warning**
1. A dialog will appear explaining what will be deleted
2. Read it carefully — this cannot be undone
3. Click **Continue** if you still want to proceed

**Step 4: Confirm with text**
1. You must type `FACTORY RESET` to confirm
2. Type it exactly as shown (capital letters with spaces)
3. The **Reset FarmPal** button will activate

**Step 5: Click Reset**
1. Click **Reset FarmPal**
2. Wait — the reset takes about 1-2 minutes
3. FarmPal will shut down and restart in provisioning mode

**Step 6: Set up FarmPal again**
1. Open `http://farmpal.local` in your browser
2. The setup wizard will appear
3. Complete all steps
4. Optionally restore from your backup: **Settings** → **Backup & Restore** → **Restore**

---

## How to Factory Reset (From the Command Line)

For advanced users with SSH access to the Pi:

**Step 1: Connect to the Pi**
```bash
ssh pi@farmpal.local
# Enter your password
```

**Step 2: Run the reset command**
```bash
sudo farmpal-reset
```

**Step 3: Confirm the reset**
```
This will permanently delete all FarmPal data.
Type "FACTORY RESET" to confirm: FACTORY RESET
```

**Step 4: Wait for completion**
```
Resetting FarmPal...
Deleting database...
Clearing configuration...
Reset complete. Restarting...
```

---

## How to Factory Reset (Emergency Method)

If FarmPal will not start and you cannot access the dashboard:

**Step 1: Access the Pi directly**
1. Connect a monitor to the Pi's HDMI port
2. Connect a keyboard to the Pi's USB port

**Step 2: Boot into recovery mode**
1. Turn on the Pi while holding the **SHIFT key**
2. Or: wait for the Pi to boot, then press **Ctrl+Alt+F2** to open a terminal

**Step 3: Run the reset command**
```bash
sudo farmpal-reset --emergency
```

**Step 4: Restart**
```bash
sudo reboot
```

---

## After the Factory Reset

### What You Will See

After the reset completes:
1. The Dashboard will redirect to the setup wizard
2. You will need to log in again (admin account is reset)
3. All your devices will be gone from the Devices view
4. The Decisions log will be empty

### Restoring from Backup

After setting up FarmPal again, you can restore most of your data from a backup:

**Step 1: Complete the setup wizard**
1. Run through all wizard steps
2. You do not need to re-add devices yet

**Step 2: Upload your backup**
1. Go to **Settings** → **Backup & Restore**
2. Click **Upload Backup**
3. Select your saved `.tar.gz` backup file

**Step 3: Restore**
1. Click **Restore** next to the uploaded backup
2. Wait for the restore to complete
3. FarmPal will restart with your restored settings

**What restores cleanly:**
- Device registry ✅
- Automation rules ✅
- Safety policies ✅
- Calibration offsets ✅
- Farm settings ✅

**What does NOT restore from backup (you must re-do):**
- Sensor history (may be too old to be useful)
- Decision logs (fresh start is better)

---

## Confirmation: Why the Text Confirmation Exists

FarmPal requires you to type `FACTORY RESET` because:

1. **Accidental clicks** — the button could be pressed by mistake
2. **Serious consequences** — this deletes data that cannot be recovered
3. **Prevents prank resets** — someone cannot reset your system without knowing the magic words
4. **Forces review** — typing the words makes you think about what you are doing

**If you are not 100% sure you want to reset, do not type the confirmation.**

---

## Reactivating Your License After Reset

Your FarmPal license is bound to the hardware (Raspberry Pi's serial number), not to the SD card. After a factory reset:

- **You do NOT need a new license key**
- The license reactivates automatically when you connect to the license server
- If asked for your license key again, use the same key you used before

If you have issues reactivating:
1. Go to **Settings** → **License**
2. Click **Reactivate**
3. If it still fails, contact support@farmpal.io

---

## Emergency Data Recovery

If you factory reset by accident and did NOT have a backup:

**Unfortunately, there is no way to recover data that was erased.** This is why backups are so important.

If you need your data back urgently:
1. Contact support@farmpal.io with your hardware ID
2. Explain the situation
3. In some cases, we may be able to extract partial data from system logs — but this is not guaranteed

---

## Common Questions

**Q: Will a factory reset damage my Raspberry Pi?**
A: No. A factory reset only erases data on the SD card. The Pi hardware is unaffected.

**Q: Can I cancel a factory reset once it starts?**
A: No. Once the reset process begins, it completes. Do not turn off the Pi during the reset.

**Q: Will my SD card wear out faster if I factory reset often?**
A: SD cards have a limited number of write cycles. Frequent factory resets (more than once a month) may reduce the card's lifespan. For normal use, this is not a concern.

**Q: Can I factory reset without deleting sensor history?**
A: No. Sensor history is part of the database and is deleted in a factory reset. Back up first if you want to keep it.

**Q: My FarmPal is stuck on the login screen. Do I need to factory reset?**
A: Probably not. Try restarting first: **Settings** → **System** → **Restart**. If you forgot your password, a factory reset is the only way — there is no password recovery.

**Q: Can I run the factory reset from another computer on the network?**
A: Yes — if you have the admin credentials. Open `http://farmpal.local:3392` from any browser on the same network.

---

## Getting Help

Before factory resetting, if you are unsure:
- Visit the Troubleshooting guide
- Search for your issue at [farmpal.io/support](https://farmpal.io/support)
- Email: support@farmpal.io

---

## Summary

| Question | Answer |
|---|---|
| Does it delete everything? | Yes, all data is erased |
| Does it delete the OS? | No, the software stays |
| Does it need confirmation? | Yes, type "FACTORY RESET" |
| Can I undo it? | No, there is no undo |
| Can I restore from backup after? | Yes, most settings restore |
| Do I need a new license? | No, license is hardware-bound |
| How long does it take? | 1-2 minutes |

---

*Factory reset is a powerful tool. Use it wisely, back up first, and you will be back up and running quickly.*
