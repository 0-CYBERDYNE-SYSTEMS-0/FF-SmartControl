# Network Setup & Discovery

This guide covers how FarmPal connects to your network and how to find the FarmPal device when mDNS (`farmpal.local`) is not available.

## Network Connection Methods

FarmPal supports two network connection methods:

1. **Ethernet (Preferred)** - Plug an Ethernet cable into the Pi. FarmPal automatically obtains an IP via DHCP.
2. **WiFi** - If no Ethernet is available, configure WiFi during the setup wizard.

### Ethernet Detection

FarmPal automatically detects Ethernet connections. If an Ethernet cable is connected at boot:
- FarmPal uses the Ethernet connection automatically
- WiFi setup is skipped in the setup wizard
- The Ethernet IP is displayed on the HDMI console during first boot

### WiFi Setup

If no Ethernet is detected, the setup wizard presents the WiFi configuration screen:

1. **Select a Network**: Choose from the list of detected WiFi networks, or enter an SSID manually
2. **Enter Password**: Type your WiFi password (WPA2-PSK)
3. **Validate**: FarmPal tests the connection before confirming

#### WiFi Password Requirements

- 8-63 ASCII characters (recommended), or
- Exactly 64 hexadecimal characters (raw PSK)

**Common Issues:**
- **"Invalid characters" error**: Your password contains Unicode or special characters that may cause encoding issues. Try using only ASCII letters and numbers.
- **"Wrong password" error**: The password does not match the network. Check for capitalization and special characters.
- **"Connection failed" error**: FarmPal could not join the network. Verify the network is 2.4GHz (5GHz may not be supported on some Pi models).

## Finding FarmPal on Your Network

### Method 1: mDNS (Recommended)

Open a web browser and navigate to:

```
http://farmpal.local:3392
```

This works on:
- macOS (native Bonjour support)
- Linux (with Avahi installed, default on most distributions)
- Windows 10/11 (with iTunes orBonjour installed)

### Method 2: HDMI Console Display

During first boot and provisioning, FarmPal displays its IP address on the HDMI console:

```
==============================================
  FarmPal Network Configuration
==============================================

  Hostname: farmpal
  IP Address: 192.168.1.100

  Access FarmPal:
    - Web UI: http://farmpal.local:3392
    - Or directly: http://192.168.1.100:3392
==============================================
```

Connect a monitor to the Pi's HDMI port to see this information.

### Method 3: Subnet Scan

If mDNS doesn't work and you don't have HDMI access, use a network scanner.

#### Using nmap (Linux/macOS)

```bash
# Install nmap if needed
sudo apt install nmap    # Debian/Ubuntu
brew install nmap         # macOS

# Scan your local subnet
# Replace 192.168.1.0/24 with your actual subnet
nmap -sn 192.168.1.0/24 | grep -i farmpal

# Or look for port 3392 (HAL UI)
nmap -p 3392 192.168.1.0/24 -open
```

#### Using Angry IP Scanner (Windows/macOS/Linux)

1. Download from https://angryip.org/
2. Enter IP range (e.g., 192.168.1.0-192.168.1.255)
3. Filter for port 3392
4. Look for FarmPal device

#### Using arp-scan (Linux)

```bash
sudo apt install arp-scan
sudo arp-scan --localnet | grep -i farmpal
```

### Method 4: Check Your Router

Log into your router's admin panel and look for:
- Connected devices
- DHCP client list
- Look for "farmpal" or "raspberrypi" hostname
- Note the IP address assigned

### Method 5: FarmPal Network Log

FarmPal records network events in `/var/lib/farmpal/network.log`:

```bash
# On the Pi, check the network log
cat /var/lib/farmpal/network.log

# Example output:
# 2024-01-15T10:30:00+00:00 ethernet 192.168.1.100
```

## Troubleshooting Network Issues

### FarmPal won't connect to WiFi

1. **Verify password** - WiFi passwords are case-sensitive
2. **Check network frequency** - Pi WiFi only supports 2.4GHz networks
3. **Move closer to router** - Weak signal can cause connection failures
4. **Restart router** - Sometimes the router needs a fresh connection attempt
5. **Check for MAC filtering** - Ensure the Pi's MAC isn't blocked in router settings

### farmpal.local doesn't resolve

1. **Install Bonjour/iTunes** (Windows) - Download from apple.com
2. **Try direct IP** - Use the IP address from HDMI or subnet scan
3. **Wait 30 seconds** - mDNS can take time to propagate
4. **Restart Avahi**: `sudo systemctl restart avahi-daemon`

### Ethernet not detected

1. **Check cable** - Try a different Ethernet cable
2. **Check router** - Ensure DHCP is enabled on the router
3. **Check lights** - Ethernet port lights should blink
4. **Manually configure** - Set a static IP if DHCP isn't available

### Network works but can't access FarmPal

1. **Verify port** - FarmPal uses port 3392 (not 80 or 443)
2. **Check firewall** - Ensure port 3392 is not blocked
3. **Try different browser** - Some browsers block localhost addresses

## Network Configuration Files

| File | Purpose |
|------|---------|
| `/etc/wpa_supplicant/wpa_supplicant.conf` | WiFi configuration |
| `/var/lib/farmpal/network.log` | Network connection log |
| `/var/lib/farmpal/network-info.json` | Current network state |
| `/etc/avahi/services/farmpal.service` | mDNS advertisement |

## Advanced: Static IP Configuration

To use a static IP instead of DHCP:

1. Edit `/etc/dhcpcd.conf`:
```bash
sudo nano /etc/dhcpcd.conf
```

2. Add at the end (adjust for your network):
```
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1
```

3. Restart networking:
```bash
sudo systemctl restart dhcpcd
```
