#!/bin/bash
# First-boot script: 07-hdmi-console-menu.sh
# Interactive HDMI console menu for local provisioning when no network is available
# Part of FarmPal first-boot provisioning (VAL-IMG-016)
set -e

LOGFILE="/var/log/farmpal-firstboot.log"
DATA_DIR="/var/lib/farmpal"
INSTALL_DIR="/opt/farmpal"
ENV_FILE="${INSTALL_DIR}/.env"
PROVISIONED_FLAG="${DATA_DIR}/provisioned"

log() {
    echo "[$(date)] $1" | tee -a "${LOGFILE}"
}

# Check if network is available - if so, skip HDMI menu
check_network_available() {
    # Check for any global IP address
    if ip -4 addr show scope global 2>/dev/null | grep -q inet; then
        return 0  # Network available
    fi
    
    # Check if we can reach external hosts
    if ping -c 1 -W 2 8.8.8.8 &>/dev/null; then
        return 0  # Network available
    fi
    
    return 1  # No network
}

# Display header on console
display_header() {
    clear
    echo ""
    echo "=============================================="
    echo "  FarmPal First-Boot Setup"
    echo "  Interactive Console Menu"
    echo "=============================================="
    echo ""
}

# Display menu on a TTY
display_on_tty() {
    local tty="$1"
    local message="$2"
    if [[ -e "$tty" ]]; then
        echo "$message" > "$tty" 2>/dev/null || true
    fi
}

# Write provisioning-complete marker
write_provisioned_flag() {
    mkdir -p "${DATA_DIR}"
    echo "provisioned at $(date -Iseconds)" > "${PROVISIONED_FLAG}"
    chmod 0644 "${PROVISIONED_FLAG}"
    log "Provisioned flag written"
}

# Generate minimal .env with local settings
generate_local_env() {
    local farm_name="$1"
    local timezone="$2"
    
    log "Generating .env with local settings"
    log "Farm name: ${farm_name}"
    log "Timezone: ${timezone}"
    
    # Generate secrets
    local session_secret=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -d '/+=')
    local csrf_secret=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -d '/+=')
    
    mkdir -p "${INSTALL_DIR}"
    
    # Write .env atomically
    local tmp_env="${ENV_FILE}.tmp"
    cat > "${tmp_env}" << EOF
# FarmPal Environment Configuration
# Generated via HDMI console menu on $(date -Iseconds)

FARMPAL_VERSION=1.0.0
FARMPAL_DATA_DIR_PATH=${DATA_DIR}
FARMPAL_INSTALL_DIR_PATH=${INSTALL_DIR}
FARMPAL_PROVISIONED=true
FARMPAL_FARM_NAME=${farm_name}
TZ=${timezone}
FARMPAL_LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
SESSION_SECRET=${session_secret}
CSRF_SECRET=${csrf_secret}
FFT_NANO_WEB_ACCESS_MODE=localhost
HAL_UI_ENABLED=true
HAL_UI_PORT=3392
CONTAINER_RUNTIME=host
FFT_NANO_ALLOW_HOST_RUNTIME=1
EOF
    
    chmod 0640 "${tmp_env}"
    mv "${tmp_env}" "${ENV_FILE}"
    
    log ".env generated successfully at ${ENV_FILE}"
}

# Get WiFi interface name
get_wifi_interface() {
    ip link show 2>/dev/null | grep -E "wlan|wl" | head -1 | awk -F": " '{print $2}' || echo "wlan0"
}

# Scan for WiFi networks
scan_wifi() {
    local iface
    iface=$(get_wifi_interface)
    
    log "Scanning for WiFi networks on ${iface}..."
    
    # Bring interface up
    ip link set "$iface" up 2>/dev/null || true
    
    # Scan
    local networks=""
    if command -v iw &>/dev/null; then
        networks=$(iw dev "$iface" scan 2>/dev/null | grep -E "^[[:space:]]*SSID:" | sed 's/[[:space:]]*SSID: //' | grep -v "^$" || true)
    elif command -v iwlist &>/dev/null; then
        networks=$(iwlist "$iface" scan 2>/dev/null | grep "ESSID:" | sed 's/[[:space:]]*ESSID://' | sed 's/"//g' | grep -v "^$" || true)
    fi
    
    echo "$networks"
}

# Connect to WiFi
connect_wifi_menu() {
    local ssid="$1"
    local psk="$2"
    
    local iface
    iface=$(get_wifi_interface)
    
    log "Connecting to WiFi SSID: ${ssid}"
    
    # Kill existing wpa_supplicant
    pkill -f "wpa_supplicant.*${iface}" 2>/dev/null || true
    sleep 1
    
    # Generate wpa_supplicant config
    local wpa_conf="/etc/wpa_supplicant/wpa_supplicant.conf"
    local wifi_country="${WIFI_COUNTRY:-US}"
    
    # Escape special characters
    local escaped_ssid="${ssid//\\/\\\\}"
    escaped_ssid="${escaped_ssid//\"/\\\"}"
    local escaped_psk="${psk//\\/\\\\}"
    escaped_psk="${escaped_psk//\"/\\\"}"
    
    cat > "${wpa_conf}" << EOF
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=${wifi_country}

network={
    ssid="${escaped_ssid}"
    psk="${escaped_psk}"
    key_mgmt=WPA-PSK
    proto=RSN
    pairwise=CCMP
    group=CCMP
}
EOF
    
    chmod 0600 "${wpa_conf}"
    
    # Start wpa_supplicant
    wpa_supplicant -B -D nl80211,wext -i "${iface}" -c "${wpa_conf}" 2>/dev/null || {
        log "Failed to start wpa_supplicant"
        return 1
    }
    
    # Wait for connection
    local waited=0
    local max_wait=60
    while [[ $waited -lt $max_wait ]]; do
        local ip=$(ip -4 addr show "$iface" 2>/dev/null | grep "inet" | awk '{print $2}' | cut -d/ -f1 || true)
        if [[ -n "$ip" ]]; then
            log "WiFi connected! IP: ${ip}"
            return 0
        fi
        sleep 2
        waited=$((waited + 2))
    done
    
    log "WiFi connection timeout"
    pkill -f "wpa_supplicant.*${iface}" 2>/dev/null || true
    return 1
}

# Show interactive menu on TTY (reads from stdin)
show_interactive_menu() {
    local choice
    local farm_name="My Farm"
    local timezone="UTC"
    local wifi_configured=false
    local ssid=""
    local psk=""
    
    while true; do
        display_header
        echo "No network detected. FarmPal can operate in standalone mode."
        echo ""
        echo "  1) Configure Farm Name (current: ${farm_name})"
        echo "  2) Configure Timezone (current: ${timezone})"
        echo "  3) Set Up WiFi (connect to a wireless network)"
        echo "  4) Skip WiFi (continue in standalone mode)"
        echo "  5) Complete Setup and Start FarmPal"
        echo "  0) Exit Menu"
        echo ""
        echo -n "Select option: "
        
        read -r choice
        
        case "$choice" in
            1)
                echo -n "Enter Farm Name: "
                read -r farm_name
                if [[ -z "$farm_name" ]]; then
                    farm_name="My Farm"
                fi
                ;;
            2)
                echo -n "Enter Timezone (e.g., America/New_York): "
                read -r timezone
                if [[ -z "$timezone" ]]; then
                    timezone="UTC"
                fi
                ;;
            3)
                echo "Scanning for WiFi networks..."
                local networks
                networks=$(scan_wifi)
                if [[ -z "$networks" ]]; then
                    echo ""
                    echo "No WiFi networks found. Make sure WiFi adapter is connected."
                    echo "Press Enter to continue..."
                    read -r
                else
                    echo ""
                    echo "Available networks:"
                    local i=1
                    local network_list=""
                    while IFS= read -r network; do
                        if [[ -n "$network" ]]; then
                            echo "  $i) $network"
                            network_list="${network_list}${network}"$'\n'
                            i=$((i + 1))
                        fi
                    done <<< "$networks"
                    
                    echo ""
                    echo -n "Select network number (or 'm' for manual entry): "
                    read -r net_choice
                    
                    if [[ "$net_choice" == "m" ]]; then
                        echo -n "Enter SSID: "
                        read -r ssid
                    elif [[ "$net_choice" =~ ^[0-9]+$ ]]; then
                        ssid=$(echo "$network_list" | sed -n "${net_choice}p")
                    fi
                    
                    if [[ -n "$ssid" ]]; then
                        echo -n "Enter WiFi Password: "
                        read -r -s psk
                        echo ""
                        
                        if [[ ${#psk} -lt 8 ]]; then
                            echo "Password too short (minimum 8 characters)"
                            echo "Press Enter to continue..."
                            read -r
                        else
                            echo "Connecting to ${ssid}..."
                            if connect_wifi_menu "$ssid" "$psk"; then
                                wifi_configured=true
                                echo "WiFi connected successfully!"
                            else
                                echo "WiFi connection failed. Please try again."
                            fi
                            echo "Press Enter to continue..."
                            read -r
                        fi
                    fi
                fi
                ;;
            4)
                echo "Continuing in standalone mode..."
                sleep 1
                ;;
            5)
                log "Completing setup via HDMI console"
                generate_local_env "$farm_name" "$timezone"
                write_provisioned_flag
                
                display_header
                echo "Setup Complete!"
                echo ""
                echo "Farm Name: ${farm_name}"
                echo "Timezone: ${timezone}"
                echo "WiFi: $(if $wifi_configured; then echo "Configured"; else echo "Not configured (standalone mode)"; fi)"
                echo ""
                echo "FarmPal will start automatically."
                echo "Access the web UI at: http://farmpal.local:3392"
                echo "(or find the IP address using your router)"
                echo ""
                echo "Press Enter to continue..."
                read -r
                
                # Disable this service so it doesn't run again
                systemctl disable farmpal-firstboot 2>/dev/null || true
                return 0
                ;;
            0)
                log "HDMI menu exited by user"
                return 1
                ;;
            *)
                echo "Invalid option. Press Enter to continue..."
                read -r
                ;;
        esac
    done
}

# Main entry point
main() {
    log "Starting HDMI console menu check..."
    
    # Check if already provisioned
    if [[ -f "${PROVISIONED_FLAG}" ]]; then
        log "Already provisioned, skipping HDMI menu"
        exit 0
    fi
    
    # Check if network is available
    if check_network_available; then
        log "Network is available, skipping HDMI console menu"
        exit 0
    fi
    
    log "No network detected - starting HDMI console menu"
    
    # Display on all TTYs
    local ttys="/dev/tty1 /dev/tty2 /dev/tty3 /dev/tty4 /dev/tty5 /dev/tty6 /dev/tty"
    for tty in $ttys; do
        if [[ -e "$tty" ]]; then
            display_header > "$tty" 2>/dev/null || true
            echo "No network detected." >> "$tty" 2>/dev/null || true
            echo "Starting interactive setup..." >> "$tty" 2>/dev/null || true
            echo "" >> "$tty" 2>/dev/null || true
        fi
    done
    
    # Try to run interactive menu on current TTY or tty1
    local target_tty=""
    if [[ -t 0 ]]; then
        target_tty=$(tty)
    elif [[ -e /dev/tty1 ]]; then
        target_tty="/dev/tty1"
    fi
    
    if [[ -n "$target_tty" ]] && [[ -e "$target_tty" ]]; then
        # Open the TTY for interactive input
        exec < "$target_tty"
        show_interactive_menu
    else
        # Fallback: just log and exit
        log "No interactive TTY available, skipping HDMI menu"
    fi
    
    log "HDMI console menu complete"
}

main "$@"
