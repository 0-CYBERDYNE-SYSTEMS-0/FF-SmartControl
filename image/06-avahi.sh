#!/bin/bash
# Stage 06: Avahi/mDNS configuration
set -e

echo "Configuring Avahi/mDNS..."

# Install Avahi service files for FarmPal
cat > /etc/avahi/services/farmpal.service << 'EOF'
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">FarmPal on %h</name>
  <service>
    <type>_farmpal._tcp</type>
    <port>3392</port>
    <txt-record>path=/</txt-record>
  </service>
</service-group>
EOF

cat > /etc/avahi/services/ssh.service << 'EOF'
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">FarmPal SSH on %h</name>
  <service>
    <type>_ssh._tcp</type>
    <port>22</port>
  </service>
</service-group>
EOF

# Enable and start Avahi
systemctl enable avahi-daemon
if systemctl is-active avahi-daemon &>/dev/null; then
    echo "Avahi daemon already running"
else
    systemctl start avahi-daemon
    if systemctl is-active avahi-daemon &>/dev/null; then
        echo "Avahi daemon started"
    else
        echo "ERROR: Failed to start avahi-daemon"
        exit 1
    fi
fi

echo "Avahi configured and running"
