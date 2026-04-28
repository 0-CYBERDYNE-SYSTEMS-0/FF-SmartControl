#!/usr/bin/env bash
# FarmPal Image Secret Scanner
# Scans the image contents to verify no secrets, demo data, or sensitive info
#
# Usage:
#   ./scripts/image-secret-scan.sh <image-file-or-directory>
#
# Exit codes:
#   0 - Scan passed (no secrets found)
#   1 - Secrets found

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ISSUES_FOUND=0

warn() {
    echo -e "${YELLOW}[ISSUE]${NC} $1"
    ((ISSUES_FOUND++))
}

pass() {
    echo -e "${GREEN}[OK]${NC} $1"
}

scan_file() {
    local file="$1"
    local content

    # Skip binary files and certain file types
    case "$file" in
        *.png|*.jpg|*.jpeg|*.gif|*.ico|*.mp3|*.mp4|*.zip|*.tar|*.gz|*.xz|*.deb|*.rpm)
            return
            ;;
    esac

    if [[ ! -f "$file" ]] || [[ ! -r "$file" ]]; then
        return
    fi

    # Read file content
    content=$(cat "$file" 2>/dev/null) || return

    # Check for secrets patterns
    local patterns=(
        # API keys (generic)
        'api[_-]?key["\x27]?\s*[:=]\s*["\x27]?[a-zA-Z0-9]{20,}'
        # AWS keys
        'AKIA[0-9A-Z]{16}'
        # Private keys
        '-----BEGIN.*PRIVATE KEY-----'
        # Telegram tokens
        '[0-9]{8,10}:[a-zA-Z0-9_-]{35}'
        # Generic secrets
        'secret["\x27]?\s*[:=]\s*["\x27]?[a-zA-Z0-9]{16,}'
        # Passwords in config
        'password["\x27]?\s*[:=]\s*["\x27]?[^"\x27\n]{8,}'
        # Token patterns
        'token["\x27]?\s*[:=]\s*["\x27]?[a-zA-Z0-9_-]{20,}'
        # JWT tokens
        'eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*'
    )

    for pattern in "${patterns[@]}"; do
        if echo "$content" | grep -Eq "$pattern" 2>/dev/null; then
            warn "Potential secret in $file (pattern matched)"
            return
        fi
    done

    # Check for demo data indicators
    if echo "$content" | grep -qiE '(demo|sample|test[-_]data|fake|mock|example)' 2>/dev/null; then
        # But only warn if it looks like actual demo content, not just docs
        case "$file" in
            *.md|*.txt|README*|LICENSE*)
                ;;
            *)
            if echo "$content" | grep -qiE '(demo.*data|sample.*db|test.*sensor|fake.*user)'; then
                warn "Demo data pattern found in $file"
            fi
            ;;
        esac
    fi
}

scan_directory() {
    local dir="$1"

    echo "Scanning directory: $dir"

    while IFS= read -r -d '' file; do
        scan_file "$file"
    done < <(find "$dir" -type f -print0 2>/dev/null)
}

scan_image() {
    local image="$1"

    echo "Scanning image file: $image"

    # Mount the image (requires root)
    if [[ "$(id -u)" -eq 0 ]]; then
        local mount_point
        mount_point=$(mktemp -d)
        mount_opts="loop,ro"

        if mount -o "$mount_opts" "$image" "$mount_point" 2>/dev/null; then
            scan_directory "$mount_point"
            umount "$mount_point" 2>/dev/null || true
        else
            # Try with xzcat
            if command -v xzcat &>/dev/null; then
                xzcat "$image" | tar -xz -C /tmp 2>/dev/null || true
                if [[ -d /tmp/farmpal-image ]]; then
                    scan_directory "/tmp/farmpal-image"
                    rm -rf /tmp/farmpal-image
                fi
            fi
        fi
        rmdir "$mount_point" 2>/dev/null || true
    else
        warn "Not running as root, skipping image mount scan"
        warn "Run as root for full scan: sudo $0 $image"
    fi
}

main() {
    local target="${1:-}"

    echo ""
    echo "========================================"
    echo "  FarmPal Image Secret Scanner"
    echo "========================================"
    echo ""

    if [[ -z "$target" ]]; then
        echo "Usage: $0 <image-file-or-directory>"
        echo ""
        echo "Examples:"
        echo "  $0 ./dist/farmpal-bookworm-arm64.img.xz"
        echo "  $0 ./image/"
        echo "  $0 /path/to/mounted/image/"
        exit 1
    fi

    if [[ -d "$target" ]]; then
        scan_directory "$target"
    elif [[ -f "$target" ]]; then
        scan_image "$target"
    else
        echo "Error: $target not found"
        exit 1
    fi

    echo ""
    echo "========================================"
    echo "  Scan Complete"
    echo "========================================"
    echo ""

    if [[ ISSUES_FOUND -eq 0 ]]; then
        echo -e "${GREEN}No secrets or demo data found!${NC}"
        exit 0
    else
        echo -e "${RED}Found $ISSUES_FOUND potential issues${NC}"
        echo "Review the warnings above and remove any sensitive data"
        exit 1
    fi
}

main "$@"
