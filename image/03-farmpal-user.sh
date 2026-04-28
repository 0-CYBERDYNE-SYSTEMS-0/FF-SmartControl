#!/bin/bash
# Stage 03: Create farmpal user and configure permissions
set -e

echo "Creating farmpal user..."

# Create farmpal user if it doesn't exist
if ! id -u farmpal &>/dev/null; then
    useradd -m -s /bin/bash -G gpio,i2c,spi,dialout farmpal
    echo "farmpal user created"
fi

# Create required directories
mkdir -p /opt/farmpal
mkdir -p /var/log/farmpal
mkdir -p /var/lib/farmpal
mkdir -p /opt/farmpal/backups
mkdir -p /opt/farmpal/certs

# Set ownership
chown -R farmpal:farmpal /opt/farmpal
chown -R farmpal:farmpal /var/log/farmpal
chown -R farmpal:farmpal /var/lib/farmpal

# Allow farmpal user to run systemctl for service management
echo "farmpal ALL=(ALL) NOPASSWD: /bin/systemctl *" > /etc/sudoers.d/farmpal
chmod 0440 /etc/sudoers.d/farmpal

echo "FarmPal user and directories configured"
