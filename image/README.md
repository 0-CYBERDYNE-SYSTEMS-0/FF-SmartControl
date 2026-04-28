# FarmPal Image Configuration for Pi-gen

This directory contains the configuration files and scripts for building a
Raspberry Pi OS Bookworm image with FarmPal pre-installed.

## Directory Structure

```
image/
├── 00-sysconf.yaml          # System configuration (locale, keyboard, timezone)
├── 01-packages.list         # System packages to install
├── 02-nodesource.list       # NodeSource repository for Node.js 22 LTS
├── 03-farmpal-user.sh       # Create farmpal user and directories
├── 04-farmpal-install.sh    # Download and install FarmPal from release tarball
├── 05-ssh-password.sh       # Configure SSH for password authentication
├── 06-avahi.sh              # Configure Avahi/mDNS for farmpal.local
├── export-image              # Pi-gen output configuration
├── first-boot/              # Scripts that run on first boot
│   ├── 01-resize-partition.sh
│   ├── 02-randomize-ssh-password.sh
│   ├── 03-provisioning-check.sh
│   ├── 04-farmpal-service.sh
│   └── first-boot.service
└── README.md                # This file
```

## Building the Image

### Prerequisites

- Linux x86_64 build machine (or Colima on macOS)
- pi-gen tool: `git clone https://github.com/RPi-Distro/pi-gen.git`
- ~10GB disk space for build

### Build Command

```bash
# Clone pi-gen
git clone https://github.com/RPi-Distro/pi-gen.git
cd pi-gen

# Checkout compatible version
git checkout 2024-11-19

# Link FarmPal image config
ln -s /path/to/farmpal/image ./work/FarmPal

# Build (will take 30-60 minutes)
sudo ./build.sh --config FarmPal

# Output will be in ./deploy/
```

### Using the Build Script

A simpler approach is to use the FarmPal build script:

```bash
cd farmpal
./scripts/build-image.sh
```

This script handles pi-gen setup and configuration automatically.

## Image Contents

### Base System
- Raspberry Pi OS Bookworm 64-bit (lite variant)
- SSH enabled with randomized initial password
- Avahi/mDNS for farmpal.local discovery

### Installed Packages
- Node.js 22 LTS (via NodeSource)
- SQLite3
- Avahi daemon
- NetworkManager
- Build essentials for native modules

### FarmPal Installation
- Installed to `/opt/farmpal`
- Runs as `farmpal` user (non-root)
- Systemd service: `farmpal.service`
- Data directory: `/var/lib/farmpal`
- Logs directory: `/var/log/farmpal`

### First Boot Behavior
1. Partition auto-resizes to fill SD card
2. Randomized SSH password generated for pi user
3. FarmPal service starts in provisioning mode
4. No .env file (clean provisioning state)

## Validation Assertions

This image implementation satisfies the following validation assertions:
- VAL-IMG-001: Image Flash to Clean Provisioning State
- VAL-IMG-002: Randomized Initial SSH Password
- VAL-IMG-003: Partition Auto-Resize on First Boot
- VAL-IMG-004: FarmPal Service Installed and Enabled
- VAL-IMG-005: Image Checksum Verifiable
- VAL-IMG-013: Graceful Handling of Corrupt SD Card

## Security Notes

- No default password (randomized on each flash)
- SSH key authentication recommended after first login
- .env file created only during setup wizard
- No secrets or demo data in image

## Post-Flash Setup

1. Insert SD card and boot Raspberry Pi
2. Find Pi IP address (from router or HDMI display)
3. SSH with initial password (shown on HDMI or in /var/lib/farmpal/.initial_password)
4. Change password: `passwd`
5. Run setup: `farmpal-setup` or open http://farmpal.local:3392
