#!/bin/bash
# First-boot script: 06-wifi-setup.sh
# WiFi setup and validation for FarmPal first-boot provisioning
# Handles: SSID scanning, WPA2-PSK validation, connection testing
set -e

LOGFILE="/var/log/farmpal-firstboot.log"
DATA_DIR="/var/lib/farmpal"
INSTALL_DIR="/opt/farmpal"
WPA_CONF="/etc/wpa_supplicant/wpa_supplicant.conf"
WPA_INTERFACE_CONF="/etc/wpa_supplicant/wpa_supplicant-wlan0.conf"

log() {
    echo "[$(date)] $1" | tee -a "${LOGFILE}"
}

# Validate PSK encoding
# Returns 0 if valid, 1 if PSK has invalid characters
validate_psk_encoding() {
    local psk="$1"
    
    # WPA2-PSK must be 8-63 ASCII characters or exactly 64 hex characters
    if [[ ${#psk} -ge 8 ]] && [[ ${#psk} -le 63 ]]; then
        # Check for valid ASCII printable characters
        if [[ "$psk" =~ ^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;':",./<>?`~\-]+$ ]]; then
            return 0
        else
            log "PSK contains non-ASCII or special characters that may cause encoding issues"
            return 1
        fi
    elif [[ ${#psk} -eq 64 ]] && [[ "$psk" =~ ^[a-fA-F0-9]+$ ]]; then
        # 64 hex characters - raw PSK
        return 0
    elif [[ ${#psk} -lt 8 ]]; then
        log "PSK too short (minimum 8 characters)"
        return 2
    fi
    
    return 1
}

# Generate wpa_supplicant configuration
generate_wpa_config() {
    local ssid="$1"
    local psk="$2"
    local conf_file="$3"
    
    log "Generating wpa_supplicant configuration for SSID: ${ssid}"
    
    # Escape special characters in SSID and PSK
    local escaped_ssid="${ssid//\\/\\\\}"
    escaped_ssid="${escaped_ssid//\"/\\\"}"
    local escaped_psk="${psk//\\/\\\\}"
    escaped_psk="${escaped_psk//\"/\\\"}"
    
    cat > "${conf_file}" << EOF
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=US

network={
    ssid="${escaped_ssid}"
    psk="${escaped_psk}"
    key_mgmt=WPA-PSK
    proto=RSN
    pairwise=CCMP
    group=CCMP
}
EOF
    
    chmod 0600 "${conf_file}"
    log "wpa_supplicant configuration written"
}

# Scan for available WiFi networks
scan_wifi_networks() {
    log "Scanning for WiFi networks..."
    
    local interface="$1"
    
    # Ensure interface is up
    ip link set "${interface}" up 2>/dev/null || true
    
    # Scan with iw or iwlist
    local networks=""
    if command -v iw &>/dev/null; then
        # Use iw for scanning
        networks=$(iw dev "${interface}" scan 2>/dev/null | grep -E "^[[:space:]]*SSID:" | sed 's/[[:space:]]*SSID: //' | grep -v "^$" || true)
    elif command -v iwlist &>/dev/null; then
        # Use iwlist as fallback
        networks=$(iwlist "${interface}" scan 2>/dev/null | grep "ESSID:" | sed 's/[[:space:]]*ESSID://' | sed 's/"//g' | grep -v "^$" || true)
    fi
    
    if [[ -z "${networks}" ]]; then
        log "No WiFi networks found"
        echo "[]"
        return 1
    fi
    
    # Create JSON array of networks
    local json="["
    local first=true
    while IFS= read -r network; do
        if [[ -n "${network}" ]]; then
            if [[ "${first}" == "true" ]]; then
                first=false
            else
                json+=","
            fi
            # Escape quotes in network name
            local escaped_network="${network//\"/\\\"}"
            json+="{\"ssid\":\"${escaped_network}\"}"
        fi
    done <<< "${networks}"
    json+="]"
    
    log "Found networks: ${json}"
    echo "${json}"
}

# Connect to WiFi with given credentials
# Returns: 0 on success, 1 on wrong password, 2 on other error
connect_wifi() {
    local ssid="$1"
    local psk="$2"
    local interface="${3:-wlan0}"
    local max_wait=60
    local wait_interval=3
    
    log "Attempting to connect to WiFi SSID: ${ssid}"
    
    # Kill any existing wpa_supplicant
    pkill -f "wpa_supplicant.*${interface}" 2>/dev/null || true
    sleep 1
    
    # Generate configuration
    generate_wpa_config "${ssid}" "${psk}" "${WPA_INTERFACE_CONF}"
    
    # Ensure network directory exists
    mkdir -p /var/run/wpa_supplicant
    mkdir -p /var/lib/wpa_supplicant
    
    # Bring interface up
    ip link set "${interface}" up 2>/dev/null || true
    
    # Start wpa_supplicant in background
    wpa_supplicant -B -D nl80211,wext -i "${interface}" -c "${WPA_INTERFACE_CONF}" -f /var/log/wpa_supplicant.log 2>/dev/null || {
        log "Failed to start wpa_supplicant"
        return 2
    }
    
    # Wait for connection
    local waited=0
    while [[ ${waited} -lt ${max_wait} ]]; do
        # Check if we have an IP
        local ip=$(ip -4 addr show "${interface}" 2>/dev/null | grep "inet" | awk '{print $2}' | cut -d/ -f1 || true)
        if [[ -n "${ip}" ]]; then
            log "WiFi connected! IP: ${ip}"
            
            # Try to reach external host to validate connection
            if validate_internet_connection; then
                log "WiFi connection validated with internet access"
                return 0
            else
                # We have IP but no internet - could be captive portal
                log "WiFi connected but no internet access - possible captive portal"
                return 1
            fi
        fi
        
        # Check wpa_supplicant status for auth errors
        local status=$(wpa_cli -i "${interface}" status 2>/dev/null | grep "wpa_state" | cut -d= -f2 || true)
        if [[ "${status}" == *"WRONG_PSK"* ]] || [[ "${status}" == *"DISCONNECTED"* ]]; then
            # Check for wrong password in logs
            if grep -q "WRONG_PSK\|invalid pairwise" /var/log/wpa_supplicant.log 2>/dev/null; then
                log "Wrong WiFi password detected"
                pkill -f "wpa_supplicant.*${interface}" 2>/dev/null || true
                return 1
            fi
        fi
        
        sleep ${wait_interval}
        waited=$((waited + wait_interval))
        log "Waiting for WiFi connection... (${waited}s/${max_wait}s)"
    done
    
    log "WiFi connection timeout"
    pkill -f "wpa_supplicant.*${interface}" 2>/dev/null || true
    return 2
}

# Validate internet connection
validate_internet_connection() {
    # Try multiple hosts to handle DNS issues
    local hosts="8.8.8.8 1.1.1.1 208.67.222.222"
    
    for host in ${hosts}; do
        if ping -c 1 -W 3 "${host}" &>/dev/null; then
            return 0
        fi
    done
    
    # Try DNS resolution
    if nslookup www.google.com &>/dev/null || host www.google.com &>/dev/null; then
        return 0
    fi
    
    return 1
}

# Configure WiFi for headless operation
configure_wifi_autoconnect() {
    local ssid="$1"
    local psk="$2"
    
    log "Configuring WiFi for auto-connect on boot"
    
    # Update main wpa_supplicant config
    generate_wpa_config "${ssid}" "${psk}" "${WPA_CONF}"
    
    # Enable wpa_supplicant service
    systemctl enable wpa_supplicant 2>/dev/null || true
    
    # Ensure interface configuration exists
    cat > /etc/network/interfaces.d/wlan0 << EOF
auto wlan0
iface wlan0 inet dhcp
    wpa-conf /etc/wpa_supplicant/wpa_supplicant.conf
EOF
    
    log "WiFi auto-connect configured"
}

# Get WiFi signal strength
get_wifi_signal() {
    local interface="${1:-wlan0}"
    
    if command -v iw &>/dev/null; then
        iw dev "${interface}" link 2>/dev/null | grep signal | awk '{print $2}'
    else
        cat "/sys/class/net/${interface}/wireless/link" 2>/dev/null || echo "unknown"
    fi
}

# Main entry point for WiFi setup
main() {
    local action="${1:-}"
    
    case "${action}" in
        scan)
            scan_wifi_networks "${2:-wlan0}"
            ;;
        connect)
            local ssid="${3:-}"
            local psk="${4:-}"
            if [[ -z "${ssid}" ]] || [[ -z "${psk}" ]]; then
                log "Usage: $0 connect <ssid> <psk>"
                exit 1
            fi
            
            # Validate PSK encoding first
            if ! validate_psk_encoding "${psk}"; then
                log "PSK validation failed"
                echo "ERROR:INVALID_ENCODING"
                exit 1
            fi
            
            connect_wifi "${ssid}" "${psk}" "${2:-wlan0}"
            local result=$?
            
            if [[ ${result} -eq 0 ]]; then
                echo "SUCCESS"
                configure_wifi_autoconnect "${ssid}" "${psk}"
            elif [[ ${result} -eq 1 ]]; then
                echo "ERROR:WRONG_PASSWORD"
            else
                echo "ERROR:CONNECTION_FAILED"
            fi
            exit ${result}
            ;;
        validate)
            validate_psk_encoding "${2:-}"
            exit $?
            ;;
        signal)
            get_wifi_signal "${2:-wlan0}"
            ;;
        *)
            log "Usage: $0 {scan|connect|validate|signal} [args]"
            exit 1
            ;;
    esac
}

# Run if executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
