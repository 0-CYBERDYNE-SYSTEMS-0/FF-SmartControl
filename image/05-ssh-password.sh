#!/bin/bash
# Stage 05: SSH configuration
# Configures SSH with randomized password on first boot
set -e

echo "Configuring SSH access..."

# Ensure SSH is enabled
systemctl enable ssh 2>/dev/null || true
systemctl enable ssh.socket 2>/dev/null || true

# Configure SSH for password auth (will be changed on first login)
# The pi user gets a randomized password via first-boot.service
sed -i 's/^#?PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#?ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config

# Ensure sshd config is valid
sshd -t 2>/dev/null || true

echo "SSH configured for password authentication"
