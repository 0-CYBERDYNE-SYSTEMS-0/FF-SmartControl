#!/usr/bin/env bash
# FarmPal Image Smoke Test Script
# Runs on a Raspberry Pi after flashing the FarmPal image
#
# Usage:
#   ./scripts/smoke-test-pi.sh [--quick]
#
# Options:
#   --quick    Run only essential tests (skip extended checks)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
QUICK_MODE=false

[[ "${1:-}" == "--quick" ]] && QUICK_MODE=true

pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

section() {
    echo ""
    echo "========================================"
    echo "  $1"
    echo "========================================"
}

# Test: SSH service running
test_ssh() {
    section "SSH Service"
    if systemctl is-active ssh &>/dev/null; then
        pass "SSH service is active"
    else
        fail "SSH service is not active"
    fi
}

# Test: FarmPal user exists
test_farmpal_user() {
    section "FarmPal User"
    if id farmpal &>/dev/null; then
        pass "farmpal user exists"
    else
        fail "farmpal user does not exist"
    fi
}

# Test: FarmPal installation directory
test_install_dir() {
    section "FarmPal Installation"
    if [[ -d /opt/farmpal ]]; then
        pass "/opt/farmpal exists"
    else
        fail "/opt/farmpal does not exist"
    fi

    if [[ -f /opt/farmpal/package.json ]]; then
        pass "FarmPal package.json found"
    else
        fail "FarmPal package.json not found"
    fi
}

# Test: No .env file (clean provisioning)
test_clean_env() {
    section "Clean Provisioning State"

    if [[ -f /opt/farmpal/.env ]]; then
        fail ".env exists (should not exist on clean image)"
    else
        pass ".env does not exist (clean provisioning)"
    fi

    if [[ -f /opt/farmpal/farmpal.db ]]; then
        fail "farmpal.db exists (should not exist on clean image)"
    else
        pass "farmpal.db does not exist (clean provisioning)"
    fi
}

# Test: FarmPal service
test_farmpal_service() {
    section "FarmPal Service"

    if systemctl is-enabled farmpal &>/dev/null; then
        pass "farmpal service is enabled"
    else
        fail "farmpal service is not enabled"
    fi

    if systemctl is-active farmpal &>/dev/null; then
        pass "farmpal service is active"
    else
        # This might fail if provisioning hasn't been done yet
        warn "farmpal service is not active (may need provisioning)"
    fi
}

# Test: Node.js version
test_node() {
    section "Node.js"

    if command -v node &>/dev/null; then
        local version
        version=$(node -v)
        pass "Node.js installed: ${version}"

        # Check version is 20+
        local major
        major=$(echo "$version" | sed 's/v//' | cut -d. -f1)
        if [[ "$major" -ge 20 ]]; then
            pass "Node.js version >= 20"
        else
            fail "Node.js version < 20"
        fi
    else
        fail "Node.js not installed"
    fi
}

# Test: SQLite
test_sqlite() {
    section "SQLite"

    if command -v sqlite3 &>/dev/null; then
        pass "sqlite3 CLI installed"
    else
        fail "sqlite3 CLI not installed"
    fi
}

# Test: Avahi/mDNS
test_avahi() {
    section "Avahi/mDNS"

    if systemctl is-active avahi-daemon &>/dev/null; then
        pass "Avahi daemon is active"
    else
        warn "Avahi daemon is not active"
    fi

    # Check for farmpal.local resolution capability
    if command -v avahi-resolve &>/dev/null; then
        pass "avahi-resolve available"
    else
        warn "avahi-resolve not available"
    fi
}

# Test: Initial password file
test_initial_password() {
    section "Initial SSH Password"

    if [[ -f /var/lib/farmpal/.initial_password ]]; then
        pass "Initial password file exists"
    else
        warn "Initial password file not found (may regenerate on first boot)"
    fi
}

# Test: Partition resize marker
test_partition_resize() {
    section "Partition Resize"

    if [[ -f /var/lib/farmpal/.partition_resized ]]; then
        pass "Partition resize marker exists"
    else
        warn "Partition resize not yet done (normal on first boot)"
    fi
}

# Test: Directory permissions
test_permissions() {
    section "Directory Permissions"

    local dirs=(
        "/opt/farmpal"
        "/var/lib/farmpal"
        "/var/log/farmpal"
        "/opt/farmpal/backups"
        "/opt/farmpal/certs"
    )

    for dir in "${dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            local owner
            owner=$(stat -c '%U' "$dir" 2>/dev/null || stat -f '%Su' "$dir" 2>/dev/null)
            if [[ "$owner" == "farmpal" ]] || [[ "$owner" == "root" ]]; then
                pass "${dir} owned by ${owner}"
            else
                fail "${dir} has unexpected owner: ${owner}"
            fi
        fi
    done
}

# Test: No demo data
test_no_demo_data() {
    section "No Demo Data"

    # Check for common demo data patterns
    local demo_patterns=(
        "/opt/farmpal/demo"
        "/opt/farmpal/sample"
        "/opt/farmpal/test-data"
        "/var/lib/farmpal/demo"
    )

    local found_demo=false
    for pattern in "${demo_patterns[@]}"; do
        if [[ -d "$pattern" ]] || [[ -f "$pattern" ]]; then
            fail "Demo data found at ${pattern}"
            found_demo=true
        fi
    done

    if ! $found_demo; then
        pass "No demo data directories found"
    fi
}

# Test: Network ports (FarmPal should bind to its ports)
test_farmpal_ports() {
    if [[ "${QUICK_MODE}" == "true" ]]; then
        return
    fi

    section "FarmPal Ports (3390-3399)"

    for port in 3390 3391 3392 3393; do
        if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
            pass "Port ${port} is listening"
        else
            warn "Port ${port} not listening (FarmPal may not be started)"
        fi
    done
}

# Summary
summary() {
    section "Test Summary"
    echo ""
    echo -e "Passed: ${GREEN}${PASS_COUNT}${NC}"
    echo -e "Failed: ${RED}${FAIL_COUNT}${NC}"
    echo ""

    if [[ FAIL_COUNT -eq 0 ]]; then
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed. Review output above.${NC}"
        return 1
    fi
}

# Main
main() {
    echo ""
    echo "========================================"
    echo "  FarmPal Image Smoke Test"
    echo "========================================"

    # Run all tests
    test_ssh
    test_farmpal_user
    test_install_dir
    test_clean_env
    test_farmpal_service
    test_node
    test_sqlite
    test_avahi
    test_initial_password
    test_partition_resize
    test_permissions
    test_no_demo_data

    if [[ "${QUICK_MODE}" == "false" ]]; then
        test_farmpal_ports
    fi

    summary
}

main
