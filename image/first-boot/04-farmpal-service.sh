#!/bin/bash
# First-boot script: 04-farmpal-service.sh
# Installs and enables the FarmPal systemd service
set -e

LOGFILE="/var/log/farmpal-firstboot.log"
INSTALL_DIR="/opt/farmpal"

log() {
    echo "[$(date)] $1" | tee -a "${LOGFILE}"
}

log "Setting up FarmPal systemd service..."

# Create systemd service file
cat > /etc/systemd/system/farmpal.service << 'EOF'
[Unit]
Description=FarmPal Smart Farm Controller
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=120
StartLimitBurst=3

[Service]
Type=simple
User=farmpal
Group=farmpal
WorkingDirectory=/opt/farmpal
ExecStart=/usr/bin/env node /opt/farmpal/dist/index.js
Restart=always
RestartSec=5
TimeoutStopSec=30

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/farmpal /var/lib/farmpal /var/log/farmpal

# Environment
EnvironmentFile=/opt/farmpal/farmpal.env

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=farmpal

# Watchdog
WatchdogSec=30

[Install]
WantedBy=multi-user.target
EOF

# Create environment file template (will be replaced by wizard)
cat > /opt/farmpal/farmpal.env << 'EOF'
# FarmPal Environment Configuration
# Generated on first boot - update via FarmPal setup wizard

# FarmPal will auto-detect unprovisioned state and run setup wizard
# This file is replaced during provisioning
EOF

chmod 0644 /etc/systemd/system/farmpal.service
chmod 0644 /opt/farmpal/farmpal.env

# Enable the service
systemctl daemon-reload
systemctl enable farmpal

# Start the service (will enter provisioning mode since no .env exists)
systemctl start farmpal

log "FarmPal service installed and started"

# Mark service setup complete
touch /var/lib/farmpal/.service_setup_complete
