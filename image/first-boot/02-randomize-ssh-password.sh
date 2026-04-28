#!/bin/bash
# First-boot script: 02-randomize-ssh-password.sh
# Generates a random SSH password for the pi user on first boot
set -e

LOGFILE="/var/log/farmpal-firstboot.log"
PASSWORD_FILE="/var/lib/farmpal/.initial_password"

log() {
    echo "[$(date)] $1" | tee -a "${LOGFILE}"
}

log "Generating randomized SSH password..."

# Check if already done
if [[ -f "${PASSWORD_FILE}" ]]; then
    log "SSH password already randomized"
    exit 0
fi

# Generate a random 12-character password
RANDOM_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | head -c 12)

if [[ -z "${RANDOM_PASSWORD}" ]]; then
    # Fallback if openssl not available
    RANDOM_PASSWORD=$(head -c 100 /dev/urandom | base64 | tr -d '/+=' | head -c 12)
fi

if [[ -z "${RANDOM_PASSWORD}" ]]; then
    log "ERROR: Could not generate random password"
    exit 1
fi

# Get the default user (pi on Raspberry Pi OS, or farmpal if we created it)
TARGET_USER="pi"
if ! id -u "${TARGET_USER}" &>/dev/null; then
    TARGET_USER="farmpal"
fi

if ! id -u "${TARGET_USER}" &>/dev/null; then
    log "ERROR: Could not find target user for password set"
    exit 1
fi

# Set the password
echo "${TARGET_USER}:${RANDOM_PASSWORD}" | chpasswd

# Store the password in a readable file for HDMI display
cat > "${PASSWORD_FILE}" << EOF
FarmPal Initial SSH Password
================================
User: ${TARGET_USER}
Password: ${RANDOM_PASSWORD}

This file will be deleted after first login.
Access: ssh ${TARGET_USER}@<pi-ip-address>
EOF

chmod 0600 "${PASSWORD_FILE}"

log "SSH password randomized for user ${TARGET_USER}"
log "Password stored in ${PASSWORD_FILE}"

# Also display on console
cat << EOF > /etc/motd
==============================================
  FarmPal - First Boot Configuration
==============================================

  Initial SSH Password: ${RANDOM_PASSWORD}
  SSH User: ${TARGET_USER}
  
  Connect: ssh ${TARGET_USER}@<pi-ip-address>
  
  Change password with: passwd
  
  Run 'sudo farmpal-setup' for initial configuration
==============================================
EOF

# Enable焈怹
systemctl enable ssh 2>/dev/null || true
systemctl start ssh 2>/dev/null || true

log "SSH password setup complete"
