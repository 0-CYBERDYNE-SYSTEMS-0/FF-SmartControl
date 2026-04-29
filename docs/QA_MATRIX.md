# FarmPal QA Test Matrix

**Version:** 1.0
**Last Updated:** 2024-01-15
**Test Environment:** Raspberry Pi 5 + Tier 1 hardware kit

This matrix documents all formal test cases for FarmPal. Each test can be executed by a QA engineer without developer assistance.

---

## How to Read This Matrix

| Column | Description |
|---|---|
| **Test ID** | Unique identifier (e.g., VAL-QA-IB-001) |
| **Description** | What the test verifies |
| **Pre-conditions** | What must be true before testing |
| **Test Steps** | Numbered steps to execute |
| **Expected Result** | What should happen if the test passes |
| **Pass/Fail** | To be filled in during testing |
| **Tested By** | Name of tester |
| **Date** | Date of test execution |

---

## 1. Installation & Boot

| Test ID | Description | Pre-conditions | Test Steps | Expected Result | Pass/Fail | Tested By | Date |
|---|---|---|---|---|---|---|---|
| VAL-QA-IB-001 | FarmPal image flashes to SD card without errors | Computer with SD card reader, FarmPal image file, 8GB+ SD card | 1. Download FarmPal image<br>2. Insert SD card<br>3. Flash with Balena Etcher<br>4. Verify flash completes without error | Flash completes, no errors shown, SD card is readable as `boot` drive | | | |
| VAL-QA-IB-002 | FarmPal boots to provisioning mode on first boot | Flashed SD card, Pi 5 or 4, Ethernet cable, monitor (optional) | 1. Insert SD card into Pi<br>2. Connect Ethernet<br>3. Apply power<br>4. Wait 2-3 minutes<br>5. Observe boot behavior | Pi boots, green activity light blinks steadily, farmpal.local resolves in browser | | | |
| VAL-QA-IB-003 | FarmPal works without WiFi (Ethernet only) | Flashed SD card, Pi with Ethernet connected to router with DHCP | 1. Boot Pi with Ethernet only<br>2. Check router for assigned IP<br>3. Open http://farmpal.local | Device appears on network, farmpal.local resolves, provisioning wizard loads | | | |
| VAL-QA-IB-004 | FarmPal works with WiFi as fallback | Flashed SD card, Pi with WiFi configured | 1. Disconnect Ethernet<br>2. Configure WiFi in provisioning wizard<br>3. Complete wizard<br>4. Verify connectivity | WiFi connects, dashboard loads, no Ethernet required | | | |

---

## 2. Network & Discovery

| Test ID | Description | Pre-conditions | Test Steps | Expected Result | Pass/Fail | Tested By | Date |
|---|---|---|---|---|---|---|---|
| VAL-QA-ND-001 | farmpal.local resolves on LAN | Pi connected to LAN, computer on same network, browser | 1. Open browser<br>2. Type http://farmpal.local<br>3. Press Enter | FarmPal UI loads without DNS configuration on computer | | | |
| VAL-QA-ND-002 | IP address visible on HDMI during provisioning | Pi connected to monitor via HDMI | 1. Boot unprovisioned Pi<br>2. Observe HDMI output | IP address displayed on screen during provisioning mode | | | |
| VAL-QA-ND-003 | Subnet scan finds FarmPal device | Computer on same subnet as Pi | 1. Use Angry IP Scanner or similar tool<br>2. Scan local subnet<br>3. Look for device named "farmpal" | FarmPal device appears in scan results with correct IP | | | |

---

## 3. First-Boot Wizard

| Test ID | Description | Pre-conditions | Test Steps | Expected Result | Pass/Fail | Tested By | Date |
|---|---|---|---|---|---|---|---|
| VAL-QA-WZ-001 | Wizard completes without Telegram configured | Fresh FarmPal install, no Telegram token | 1. Open farmpal.local<br>2. Complete wizard skipping Telegram step<br>3. Verify dashboard loads | Wizard completes, dashboard loads, Telegram step skipped | | | |
| VAL-QA-WZ-002 | Wizard completes without Ollama/local LLM configured | Fresh FarmPal install, cloud AI API key available | 1. Open farmpal.local<br>2. Select cloud AI provider in wizard<br>3. Complete wizard | Wizard completes, AI features work with cloud provider | | | |
| VAL-QA-WZ-003 | Wizard re-entry from settings preserves values | FarmPal fully provisioned | 1. Go to Settings<br>2. Click "Re-run Setup Wizard"<br>3. Verify current values pre-populated | Wizard opens with all current settings visible and editable | | | |

---

## 4. Dashboard

| Test ID | Description | Pre-conditions | Test Steps | Expected Result | Pass/Fail | Tested By | Date |
|---|---|---|---|---|---|---|---|
| VAL-QA-DB-001 | Dashboard loads with farm overview within 3 seconds | FarmPal fully provisioned, browser open | 1. Navigate to dashboard<br>2. Measure load time<br>3. Observe content | Dashboard loads in ≤3s with KPI strip and decision cards visible | | | |
| VAL-QA-DB-002 | All three layout modes (CALM/OPERATOR/DIAGNOSTIC) are selectable | Dashboard loaded | 1. Look for layout selector in header<br>2. Click each layout option<br>3. Observe changes | All three layouts render correctly, each visually distinct | | | |
| VAL-QA-DB-003 | GROW/HARVEST/MONITOR mode switching changes accent color | Dashboard loaded | 1. Click mode badge<br>2. Switch to HARVEST<br>3. Switch to MONITOR<br>4. Switch back to GROW | Accent color changes immediately (green/amber/blue) on all elements | | | |
| VAL-QA-DB-004 | KPI strip displays five sensor metrics | At least 5 sensors registered and reporting | 1. Observe KPI strip<br>2. Verify all 5 metrics shown: temp, humidity, soil moisture, light, CO₂ | All 5 KPI cards visible with values or "No data" for missing | | | |

---

## 5. Device Discovery

| Test ID | Description | Pre-conditions | Test Steps | Expected Result | Pass/Fail | Tested By | Date |
|---|---|---|---|---|---|---|---|
| VAL-QA-DD-001 | Discovery wizard opens from Devices view | Devices view loaded | 1. Click Devices tab<br>2. Click "Add Device" or + button<br>3. Verify wizard opens | Discovery wizard opens as modal or full-screen | | | |
| VAL-QA-DD-002 | Serial device discovery finds BME280 sensor | BME280 connected via USB-to-serial adapter | 1. Open Discovery Wizard<br>2. Select Serial protocol<br>3. Run scan<br>4. Verify BME280 detected | BME280 appears in discovered devices list with correct type | | | |
| VAL-QA-DD-003 | Manually added device appears in Devices view | Manual add flow accessible | 1. Click "Add Manually"<br>2. Enter device details<br>3. Complete add flow<br>4. Check Devices view | New device appears in Devices view with correct name and type | | | |

---

## 6. Safety

| Test ID | Description | Pre-conditions | Test Steps | Expected Result | Pass/Fail | Tested By | Date |
|---|---|---|---|---|---|---|---|
| VAL-QA-SF-001 | Safety rule blocks violating action | Safety rule configured, autonomous mode enabled | 1. Set temperature rule: "if > 30°C, block turn_off on exhaust"<br>2. Set temp sensor to 31°C<br>3. Propose exhaust turn_off | Action is DENIED, relay unchanged, audit log shows DENIED entry | | | |
| VAL-QA-SF-002 | E-Stop button is visible and functional in header | Dashboard loaded | 1. Observe header<br>2. Find E-Stop button (red, prominent)<br>3. Click it | E-Stop triggers, red banner appears, autonomous control suspended | | | |
| VAL-QA-SF-003 | E-Stop state persists across restart | E-Stop triggered | 1. Trigger E-Stop<br>2. Restart FarmPal service<br>3. Verify banner still shows | E-Stop banner still visible after restart, no autonomous actions | | | |
| VAL-QA-SF-004 | Watchdog pings systemd regularly | FarmPal running | 1. Run: journalctl -f | Watchdog events ("WATCHDOG=1") appear every ~15 seconds | | | |

---

## 7. Automation

| Test ID | Description | Pre-conditions | Test Steps | Expected Result | Pass/Fail | Tested By | Date |
|---|---|---|---|---|---|---|---|
| VAL-QA-AM-001 | Threshold-based automation triggers correctly | Temperature sensor, exhaust relay, threshold rule configured | 1. Set threshold: temp > 28°C = turn on exhaust<br>2. Raise room temp above 28°C<br>3. Wait 30 seconds | Exhaust relay turns on, decision logged in Decisions view | | | |
| VAL-QA-AM-002 | Autonomous execution respects safety policies | Autonomous mode enabled, safety rule active | 1. Set safety rule blocking certain action<br>2. Configure automation that would trigger that action<br>3. Trigger the condition | Action blocked by safety, audit log shows DENIED_WITH_REASON | | | |
| VAL-QA-AM-003 | SUGGEST mode creates pending review items | Mode set to SUGGEST | 1. Configure automation<br>2. Trigger automation condition<br>3. Check Decisions view | Decision appears with "Pending Review" status, no action taken | | | |
| VAL-QA-AM-004 | Manual override works during autonomous mode | Autonomous mode, relay under automation | 1. Find relay under autonomous control<br>2. Click toggle to manually override<br>3. Verify confirmation dialog appears | Confirmation dialog shown, manual action logged with triggered_by=manual_ui | | | |

---

## 8. Service

| Test ID | Description | Pre-conditions | Test Steps | Expected Result | Pass/Fail | Tested By | Date |
|---|---|---|---|---|---|---|---|
| VAL-QA-SV-001 | Service restarts automatically after crash | FarmPal running, terminal access | 1. Find FarmPal process PID<br>2. Kill process: kill -9 <pid><br>3. Wait 30 seconds | Service restarts automatically, dashboard becomes accessible again | | | |
| VAL-QA-SV-002 | Clean shutdown sets relays to safe state | Relays active, terminal access | 1. Trigger shutdown: sudo systemctl stop farmpal<br>2. Observe relays | All relays go to configured safe state before process exits | | | |
| VAL-QA-SV-003 | Health endpoint returns correct JSON | FarmPal running | 1. curl http://127.0.0.1:3390/health | JSON response with ok, hal, db, mqtt fields, 200 status | | | |
| VAL-QA-SV-004 | Port conflict is detected and reported | Another service using port 3392 | 1. Start another service on port 3392<br>2. Try to start FarmPal | Clear error message mentioning port 3392 and conflicting process, non-zero exit | | | |

---

## 9. Security

| Test ID | Description | Pre-conditions | Test Steps | Expected Result | Pass/Fail | Tested By | Date |
|---|---|---|---|---|---|---|---|
| VAL-QA-SC-001 | Login session expires after timeout | Browser logged in to FarmPal | 1. Wait 24 hours of inactivity (or set shorter timeout for testing)<br>2. Try to access dashboard | Redirected to login page, session rejected | | | |
| VAL-QA-SC-002 | CSRF token is required for state-changing requests | Browser logged in, CSRF token configured | 1. Send POST request without CSRF header to API<br>2. Observe response | 403 Forbidden returned | | | |
| VAL-QA-SC-003 | Rate limiting triggers after threshold exceeded | API client making rapid requests | 1. Send 100+ requests in under 1 minute to API<br>2. Observe response | 429 Too Many Requests returned with Retry-After header | | | |
| VAL-QA-SC-004 | No secrets appear in image or logs | FarmPal SD card image (pre-provisioning) | 1. Search image for API key patterns (sk-, OPENAI_, ANTHROPIC_)<br>2. Check startup logs | No API keys or secrets found in image or startup logs | | | |

---

## 10. Updates

| Test ID | Description | Pre-conditions | Test Steps | Expected Result | Pass/Fail | Tested By | Date |
|---|---|---|---|---|---|---|---|
| VAL-QA-UP-001 | Update check runs and reports status | FarmPal running, internet connection | 1. Go to Settings → Updates<br>2. Click "Check for Updates" | Status shown: "Up to date" or "Update available" with version | | | |
| VAL-QA-UP-002 | Update installs and service restarts | Update available, FarmPal running | 1. Click "Install Update"<br>2. Confirm installation<br>3. Wait for restart | Update installs, FarmPal restarts, new version confirmed | | | |
| VAL-QA-UP-003 | Rollback reverts to previous version | Previous version snapshot available | 1. After update, go to Settings → Updates<br>2. Click "Rollback"<br>3. Confirm | System reverts to previous version, restarts | | | |
| VAL-QA-UP-004 | License activation succeeds with valid key | Unlicensed FarmPal, valid license key | 1. Go to Settings → License<br>2. Click "Activate License"<br>3. Enter license key<br>4. Submit | License activated, features unlocked, confirmation shown | | | |

---

## 11. Recovery

| Test ID | Description | Pre-conditions | Test Steps | Expected Result | Pass/Fail | Tested By | Date |
|---|---|---|---|---|---|---|---|
| VAL-QA-RC-001 | Power loss during operation does not corrupt data | FarmPal running, writing sensor data | 1. While FarmPal is active, unplug power suddenly<br>2. Wait 10 seconds<br>3. Restore power<br>4. Boot | FarmPal boots normally, no database corruption, recent data intact | | | |
| VAL-QA-RC-002 | Database corruption handled gracefully | FarmPal running with active SQLite database | 1. Corrupt the SQLite WAL file (append random bytes to farmpal.db-wal)<br>2. Corrupt the database header (overwrite first 100 bytes with nulls)<br>3. Restart FarmPal service<br>4. Observe startup behavior | FarmPal detects corruption, logs clear error message ("Database corruption detected"), displays recovery options (restore from backup or factory reset). Does NOT start with corrupt data silently. | | | |
| VAL-QA-RC-003 | Graceful degradation when sensor goes offline | Multiple sensors reporting, one sensor disconnects | 1. Unplug one sensor<br>2. Observe dashboard<br>3. Reconnect sensor | Offline sensor shows "Offline" status, other sensors continue working, reconnection restores data | | | |
| VAL-QA-RC-004 | Backup can be restored after factory reset | FarmPal with data, valid backup file | 1. Create backup<br>2. Perform factory reset<br>3. Re-provision<br>4. Upload and restore backup | Most settings restored correctly, devices and rules reappear | | | |

---

## Test Summary

| Area | Test Count |
|---|---|
| Installation & Boot | 4 |
| Network & Discovery | 3 |
| First-Boot Wizard | 3 |
| Dashboard | 4 |
| Device Discovery | 3 |
| Safety | 4 |
| Automation | 4 |
| Service | 4 |
| Security | 4 |
| Updates | 4 |
| Recovery | 4 |
| **TOTAL** | **41** |

---

## Test Environment Setup

Before executing tests, ensure the following:

### Hardware
- Raspberry Pi 5 (recommended) or Pi 4
- 32GB+ Class 10 SD card
- Ethernet cable
- Monitor with HDMI (optional)
- USB keyboard (optional, for headless operation)

### Software
- FarmPal image (latest release)
- Balena Etcher or Raspberry Pi Imager
- Web browser (Chrome or Firefox)
- Angry IP Scanner or similar (for network tests)

### Network
- Home router with DHCP
- Computer on same network as Pi
- Internet connection for cloud AI tests

### Test Data
- Valid FarmPal license key (for license tests)
- OpenAI or Anthropic API key (for cloud AI tests)
- Backup file from a working FarmPal system (for restore tests)

---

## Known Limitations

| Test | Limitation | Workaround |
|---|---|---|
| VAL-QA-IB-003 | Requires specific router model | Test with any Ethernet-connected device |
| VAL-QA-ND-001 | mDNS may not work on all networks | Use IP address instead |
| VAL-QA-SF-004 | Requires journalctl access | SSH into Pi or use serial console |
| VAL-QA-SC-001 | 24-hour wait impractical | Configure SESSION_TIMEOUT_MS to 5 minutes for testing |

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.1 | 2026-04-29 | Fixed VAL-QA-RC-002 to test database corruption handling; added VAL-QA-RC-004 for backup/restore; Recovery section now has 4 tests |
| 1.0 | 2024-01-15 | Initial release with 40 test cases |
