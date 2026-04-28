#!/bin/bash
# First-boot script: 05-network-check.sh
# Detects network connectivity (Ethernet/WiFi) and displays IP on HDMI
# Part of FarmPal first-boot provisioning
set -e

LOGFILE="/var/log/farmpal-firstboot.log"
DATA_DIR="/var/lib/farmpal"
INSTALL_DIR="/opt/farmpal"

log() {
    echo "[$(date)] $1" | tee -a "${LOGFILE}"
}

# Display IP on HDMI console
display_ip_console() {
    local ip="$1"
    local hostname="${2:-farmpal}"
    
    # Check if we have a HDMI console
    if command -v tty &>/dev/null && [[ -e /dev/tty1 ]] || [[ -e /dev/tty ]] 2>/dev/null; then
        # Write to all consoles
        for tty in /dev/tty1 /dev/tty2 /dev/tty3 /dev/tty4 /dev/tty5 /dev/tty6; do
            if [[ -e "$tty" ]]; then
                cat > "$tty" << EOF
==============================================
  FarmPal Network Configuration
==============================================

  Hostname: ${hostname}
  IP Address: ${ip}

  Access FarmPal:
    - Web UI: http://${hostname}.local:3392
    - Or directly: http://${ip}:3392

  Subnet scan (if mDNS doesn't work):
    nmap -sn 192.168.1.0/24 | grep FarmPal

  SSH access:
    ssh farmpal@${ip}

==============================================
EOF
            fi
        done 2>/dev/null || true
    fi
}

# Check if Ethernet is connected and has DHCP IP
check_ethernet() {
    local eth_ip=""
    
    # Check for Ethernet interface with global scope IP
    if ip -4 addr show scope global 2>/dev/null | grep -q "eth\|en\|lan"; then
        eth_ip=$(ip -4 addr show scope global 2>/dev/null | grep "inet" | awk '{print $2}' | cut -d/ -f1 | head -1)
        if [[ -n "${eth_ip}" ]]; then
            log "Ethernet detected with IP: ${eth_ip}"
            echo "ethernet:${eth_ip}"
            return 0
        fi
    fi
    
    return 1
}

# Check if WiFi interface exists
check_wifi_interface() {
    if ip link show 2>/dev/null | grep -q "wlan\|wl"; then
        return 0
    fi
    return 1
}

# Get the current hostname
get_hostname() {
    hostname || echo "farmpal"
}

log "Starting network check..."

# Ensure directory exists
mkdir -p "${DATA_DIR}"

# Store network info
NETWORK_INFO_FILE="${DATA_DIR}/network-info.json"

# Detect network state
network_state="unknown"
primary_ip=""
connection_type="none"

# Check Ethernet first (preferred)
ethernet_result=$(check_ethernet 2>/dev/null || echo "")
if [[ "${ethernet_result}" =~ ^ethernet:(.+)$ ]]; then
    primary_ip="${BASH_REMATCH[1]}"
    connection_type="ethernet"
    network_state="connected"
    log "Connected via Ethernet: ${primary_ip}"
fi

# If no Ethernet, check WiFi
if [[ -z "${primary_ip}" ]] && check_wifi_interface; then
    # Check if WiFi is configured and connected
    wifi_ip=$(ip -4 addr show scope global 2>/dev/null | grep "wlan\|wl" | grep "inet" | awk '{print $2}' | cut -d/ -f1 | head -1 || true)
    if [[ -n "${wifi_ip}" ]]; then
        primary_ip="${wifi_ip}"
        connection_type="wifi"
        network_state="connected"
        log "Connected via WiFi: ${primary_ip}"
    else
        # WiFi exists but not connected
        connection_type="wifi_unconfigured"
        network_state="wifi_available"
        log "WiFi interface present but not connected"
    fi
fi

# Check if we have any network connectivity
if [[ -z "${primary_ip}" ]]; then
    # Try to ping gateway to see if any network works
    if ping -c 1 -W 2 192.168.1.1 &>/dev/null 2>/dev/null || ping -c 1 -W 2 8.8.8.8 &>/dev/null 2>/dev/null; then
        # We can reach something - get our IP anyway
        primary_ip=$(ip -4 addr show scope global 2>/dev/null | grep "inet" | awk '{print $2}' | cut -d/ -f1 | head -1 || true)
        if [[ -n "${primary_ip}" ]]; then
            network_state="connected"
            connection_type="other"
        fi
    fi
fi

# Store network info for provisioning
cat > "${NETWORK_INFO_FILE}" << EOF
{
    "state": "${network_state}",
    "connectionType": "${connection_type}",
    "primaryIp": "${primary_ip:-null}",
    "hostname": "$(get_hostname)",
    "checkedAt": "$(date -Iseconds)"
}
EOF

chmod 0644 "${NETWORK_INFO_FILE}"

# Display IP on HDMI console
if [[ -n "${primary_ip}" ]]; then
    display_ip_console "${primary_ip}" "$(get_hostname)"
fi

# Log the network state
log "Network state: ${network_state}"
log "Connection type: ${connection_type}"
log "Primary IP: ${primary_ip:-none}"

# Create network.log with IP for easy discovery
if [[ -n "${primary_ip}" ]]; then
    echo "$(date -Iseconds) ${connection_type} ${primary_ip}" >> "${DATA_DIR}/network.log"
fi

log "Network check complete"
