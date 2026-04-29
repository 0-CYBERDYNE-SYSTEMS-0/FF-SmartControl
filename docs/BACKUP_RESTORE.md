# FarmPal Backup & Restore Guide

**Audience: All operators | Reading Level: Grade 8**

Backing up your FarmPal data protects you from losing your settings, sensor history, and device configuration. This guide explains how to back up, where backups are stored, and how to restore them.

---

## Why Backups Matter

A backup is a copy of your FarmPal settings and data saved in a safe place. You need backups because:

- **SD card failure** — SD cards can fail without warning
- **Power loss during writing** — can corrupt data
- **Accidental changes** — you might change something and need to go back
- **Factory reset** — you may need to start fresh but keep your data
- **Moving to a new Pi** — you can restore your setup on different hardware

**How often should you back up?**
- After any major configuration change
- Weekly as a regular habit
- Before a software update

---

## What Is Included in a Backup

A FarmPal backup includes:

| Data | Included | Description |
|---|---|---|
| **Device registry** | ✅ Yes | All your sensors and relays, names, zones, settings |
| **Sensor calibration** | ✅ Yes | Calibration offsets for each sensor |
| **Automation rules** | ✅ Yes | Thresholds, schedules, and automation rules |
| **Safety policies** | ✅ Yes | Safety rules and dependency configurations |
| **Sensor history** | ✅ Yes | All recorded sensor readings |
| **Decision log** | ✅ Yes | History of automated decisions |
| **Farm settings** | ✅ Yes | Farm name, timezone, network settings |
| **LLM settings** | ✅ Yes | AI provider, model, API keys |
| **System configuration** | ✅ Yes | All Settings面板 preferences |
| **Video/photos** | ❌ No | Camera footage is not included in backups |
| **License key** | ❌ No | License is bound to hardware, not backed up |
| **SD card image** | ❌ No | You need to re-flash the OS separately |

---

## Automatic Backups

FarmPal can back up automatically on a schedule.

### Scheduled Auto-Backup

FarmPal creates an automatic backup **once per day** by default.

The automatic backup:
- Runs in the background — you do not need to do anything
- Is stored in the same location as manual backups
- Uses the filename format: `farmpal-backup-YYYY-MM-DD.tar.gz`

### Configuring Auto-Backup

1. Go to **Settings** → **Backup & Restore**
2. Find **Automatic Backups**
3. Toggle **Enable Scheduled Backup** on or off
4. Choose the backup frequency (Daily recommended)
5. Choose how many backups to keep (7 days recommended)

### Retention Policy

By default, FarmPal keeps **7 daily backups**. Older backups are automatically deleted to save space.

To change retention:
1. Go to **Settings** → **Backup & Restore**
2. Find **Backup Retention**
3. Enter the number of backups to keep
4. FarmPal will delete backups older than this limit

---

## Manual Backups

### How to Create a Manual Backup

1. Open a browser and go to `http://farmpal.local:3392`
2. Log in with your admin account
3. Click the **Settings gear icon (⚙️)** in the header
4. Click **Backup & Restore**
5. Click **Backup Now**
6. Wait for the backup to complete (usually 10-30 seconds)
7. A download dialog will appear — save the `.tar.gz` file to your computer

**Tip:** Name your backup files with the date and what changed:
- `farmpal-backup-2024-01-15.tar.gz` (date only)
- `farmpal-backup-2024-01-15-after-adding-sensors.tar.gz` (with note)

### Where Backups Are Stored

Backups are stored in two places:

**On the Pi (local storage):**
```
/opt/farmpal/backups/
├── farmpal-backup-2024-01-15.tar.gz
├── farmpal-backup-2024-01-14.tar.gz
├── farmpal-backup-2024-01-13.tar.gz
└── ...
```

**On your computer:** Wherever you saved the downloaded file

### Downloading Backups to Your Computer

Backups on the Pi use storage space. To free up space and keep your data safe:

1. Go to **Settings** → **Backup & Restore**
2. Find the backup you want to download
3. Click the **download icon** next to it
4. Save the file to your computer or a cloud drive

---

## Restoring from a Backup

### When to Restore

Restore a backup when:
- FarmPal is not working correctly after a change
- You factory reset and want your old data back
- You set up a new Pi and want to copy your configuration

### How to Restore

**⚠️ WARNING:** Restoring a backup will overwrite your current settings. This cannot be undone.

**Step 1: Go to the restore screen**
1. Open a browser and go to `http://farmpal.local:3392`
2. Log in with your admin account
3. Click **Settings** (⚙️) → **Backup & Restore**
4. Click **Restore**

**Step 2: Select the backup to restore**
1. You will see a list of available backups
2. Select the backup you want to restore:
   - Choose a recent backup (no more than a few days old)
   - The filename contains the date (e.g., `farmpal-backup-2024-01-15.tar.gz`)
3. Click **Restore This Backup**

**Step 3: Confirm the restore**
1. A confirmation dialog will appear
2. Read the warning: "This will replace all current settings with the backup."
3. Click **Confirm Restore**
4. Wait for the restore to complete (usually 30-60 seconds)
5. FarmPal will restart automatically

**Step 4: Verify the restore**
1. After FarmPal restarts, log back in
2. Check that your devices are listed correctly
3. Check that your automation rules are in place
4. Check that sensor history is restored

---

## Restoring from a Downloaded Backup File

If you have a backup file on your computer but it is not in the Pi's backup list:

**Step 1: Upload the backup file**
1. Go to **Settings** → **Backup & Restore**
2. Click **Upload Backup**
3. Select the `.tar.gz` file from your computer
4. Wait for the upload to complete

**Step 2: Restore the uploaded backup**
1. The uploaded backup will now appear in the backup list
2. Click **Restore** next to it
3. Confirm the restore
4. Wait for FarmPal to restart

---

## Backing Up Before Major Changes

Always back up before:
- Installing a FarmPal software update
- Making significant configuration changes
- Factory resetting
- Moving the SD card to a different Pi

### Quick Backup Before Update

1. Go to **Settings** → **Backup & Restore**
2. Click **Backup Now**
3. Wait for the download and save it somewhere safe
4. Proceed with your update/change
5. If anything goes wrong, restore from this backup

---

## Backup Storage Best Practices

### Keep Multiple Copies

| Storage Location | Recommended | Notes |
|---|---|---|
| On the Pi | ✅ Yes | Convenient for quick restores |
| On your computer | ✅ Yes | Protects against SD card failure |
| Cloud drive (Google Drive, Dropbox, iCloud) | ✅ Yes | Best protection against physical loss |
| External USB drive | ✅ Yes | Good for large setups |
| Another SD card | ⚠️ Use with caution | Good for offline backup, but SD cards can fail |

**Minimum recommendation:** Keep at least 2 copies — one on the Pi and one on your computer or cloud.

### Verify Your Backups

Periodically test that your backups work:

1. Factory reset FarmPal (this is safe — you have a backup!)
2. Restore from your backup
3. Verify all devices, rules, and history are there
4. If the restore works, you know your backup is good

### Backup File Security

Backup files contain sensitive information:
- API keys for cloud AI services
- Network passwords (if stored)
- Device configuration

**Protect your backup files:**
- Store them in a secure location
- Do not share them publicly
- Use password protection if storing in the cloud

---

## Troubleshooting Backup Issues

### Backup Fails

**Problem:** "Backup failed" error when clicking Backup Now

**Solutions:**
1. Check disk space — go to **Settings** → **Health** → check disk usage
2. Clear old backups to free space
3. Try again

### Restore Fails

**Problem:** "Restore failed" or FarmPal does not restart after restore

**Solutions:**
1. The backup file may be corrupt — try a different backup
2. The backup is from a much older FarmPal version — some old backups may not be compatible
3. Try uploading the backup file again before restoring

### Backup File Is Too Large

**Problem:** Backup file is very large and slow to download

**Solutions:**
1. Reduce history retention: go to **Settings** → **Sensors** → **History** → set shorter retention
2. Delete old backups from the Pi (they are still saved on your computer if you downloaded them)
3. Camera footage is not included in backups — you cannot reduce this

---

## Backup Command Line (Advanced)

For advanced users who prefer the command line:

### Create a backup manually
```bash
sudo systemctl stop farmpal
sudo tar -czf farmpal-backup-$(date +%Y-%m-%d).tar.gz \
  -C /opt/farmpal/data \
  farmpal.db .env 2>/dev/null
sudo systemctl start farmpal
```

### Restore from backup
```bash
sudo systemctl stop farmpal
sudo tar -xzf farmpal-backup-YYYY-MM-DD.tar.gz -C /opt/farmpal/data
sudo systemctl start farmpal
```

---

## Summary Checklist

- [ ] Back up after any major configuration change
- [ ] Back up weekly as a routine
- [ ] Download backups to your computer or cloud
- [ ] Keep at least 2 copies of important backups
- [ ] Verify backups occasionally by test-restoring
- [ ] Store backups securely (they contain sensitive data)
- [ ] Back up before any software update or factory reset

---

## Getting Help

For additional support:
- Visit [farmpal.io/support](https://farmpal.io/support)
- Email: support@farmpal.io

---

*Backups are your safety net. Take them regularly and keep them in a safe place.*
