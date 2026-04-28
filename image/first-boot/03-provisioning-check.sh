#!/bin/bash
# First-boot script: 03-provisioning-check.sh
# Verifies clean provisioning state and initializes data directories
set -e

LOGFILE="/var/log/farmpal-firstboot.log"
DATA_DIR="/var/lib/farmpal"
INSTALL_DIR="/opt/farmpal"

log() {
    echo "[$(date)] $1" | tee -a "${LOGFILE}"
}

log "Checking provisioning state..."

# Ensure data directory exists and is clean
mkdir -p "${DATA_DIR}"
mkdir -p /var/log/farmpal
mkdir -p "${INSTALL_DIR}/backups"
mkdir -p "${INSTALL_DIR}/certs"

# Verify NO .env exists (clean provisioning state)
if [[ -f "${INSTALL_DIR}/.env" ]]; then
    log "WARNING: .env exists in installation directory - removing for clean provisioning"
    rm -f "${INSTALL_DIR}/.env"
fi

if [[ -f "${DATA_DIR}/farmpal.db" ]]; then
    log "WARNING: Existing database found - removing for clean provisioning"
    rm -f "${DATA_DIR}/farmpal.db"
fi

# Create provisioning flag directory
mkdir -p "${DATA_DIR}"

# Set proper ownership
chown -R farmpal:farmpal "${DATA_DIR}" 2>/dev/null || true
chown -R farmpal:farmpal /var/log/farmpal 2>/dev/null || true
chown -R farmpal:farmpal "${INSTALL_DIR}/backups" 2>/dev/null || true
chown -R farmpal:farmpal "${INSTALL_DIR}/certs" 2>/dev/null || true

# Make FarmPal binary executable
chmod +x "${INSTALL_DIR}/bin/"*.js 2>/dev/null || true
chmod +x /usr/local/bin/farmpal 2>/dev/null || true
chmod +x /usr/local/bin/fft 2>/dev/null || true

log "Provisioning state verified - clean for first-run setup"

# Create a marker file indicating first-boot setup is complete
# The actual provisioning will be done by the setup wizard
touch "${DATA_DIR}/.firstboot_complete"
