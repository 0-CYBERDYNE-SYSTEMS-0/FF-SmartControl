#!/usr/bin/env bash
# FarmPal Image Build Script
# Builds a Raspberry Pi OS Bookworm image with FarmPal pre-installed
#
# Usage:
#   ./scripts/build-image.sh [--clean] [--no-cache] [--version VERSION]
#
# Options:
#   --clean      Clean build (remove previous build artifacts)
#   --no-cache   Don't use pi-gen cache
#   --version    Specify FarmPal version (default: latest)
#
# Output:
#   dist/farmpal-bookworm-arm64.img.xz
#   dist/farmpal-bookworm-arm64.img.xz.sha256

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
IMAGE_DIR="${PROJECT_ROOT}/image"
DIST_DIR="${PROJECT_ROOT}/dist/image"

# Build options
CLEAN_BUILD=false
NO_CACHE=false
FARMPAL_VERSION="${FARMPAL_VERSION:-latest}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --version)
            FARMPAL_VERSION="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--clean] [--no-cache] [--version VERSION]"
            echo ""
            echo "Options:"
            echo "  --clean      Clean build (remove previous build artifacts)"
            echo "  --no-cache    Don't use pi-gen cache"
            echo "  --version     Specify FarmPal version (default: latest)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[BUILD]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check prerequisites
check_prereqs() {
    log "Checking build prerequisites..."

    # Check for pi-gen
    if ! command -v pi-gen &>/dev/null && [[ ! -d "${PROJECT_ROOT}/pi-gen" ]]; then
        warn "pi-gen not found. Installing..."
        install_pigen
    fi

    # Check for required commands
    local missing_cmds=()
    for cmd in git curl xz; do
        if ! command -v "$cmd" &>/dev/null; then
            missing_cmds+=("$cmd")
        fi
    done

    if [[ ${#missing_cmds[@]} -gt 0 ]]; then
        error "Missing required commands: ${missing_cmds[*]}"
        error "Install them with: apt install ${missing_cmds[*]}"
        exit 1
    fi

    # Check we're on a supported platform
    if [[ "$(uname -s)" != "Linux" ]]; then
        if [[ "$(uname -s)" == "Darwin" ]] && command -v colima &>/dev/null; then
            warn "Building on macOS with Colima - Docker/Linux VM required"
            warn "For native Linux building, use a Linux machine or WSL2"
        elif [[ "$(uname -s)" == "Darwin" ]]; then
            error "Building on macOS requires Colima or Docker"
            error "Install Colima: brew install colima"
            error "Then ensure Docker/Colima is running"
            exit 1
        fi
    fi

    log "Prerequisites check passed"
}

# Install pi-gen
install_pigen() {
    log "Installing pi-gen..."

    local pigendir="${PROJECT_ROOT}/pi-gen"

    if [[ -d "${pigendir}" ]]; then
        log "pi-gen already exists at ${pigendir}"
        return
    fi

    git clone https://github.com/RPi-Distro/pi-gen.git "${pigendir}"
    cd "${pigendir}"
    git checkout 2024-11-19  # Stable version for Bookworm
    cd "${PROJECT_ROOT}"

    log "pi-gen installed"
}

# Setup build environment
setup_build() {
    log "Setting up build environment..."

    # Create output directory
    mkdir -p "${DIST_DIR}"

    # Clean if requested
    if [[ "${CLEAN_BUILD}" == "true" ]]; then
        warn "Cleaning previous build artifacts..."
        rm -rf "${DIST_DIR:?}"/*
        rm -rf "${PROJECT_ROOT}/pi-gen/work" 2>/dev/null || true
    fi

    # Link image config to pi-gen work directory
    local work_dir="${PROJECT_ROOT}/pi-gen/work"
    mkdir -p "${work_dir}"

    if [[ -L "${work_dir}/FarmPal" ]]; then
        rm "${work_dir}/FarmPal"
    fi
    ln -s "${IMAGE_DIR}" "${work_dir}/FarmPal"

    # Export version for build scripts
    export FARMPAL_VERSION

    log "Build environment ready"
}

# Run pi-gen build
run_build() {
    log "Starting FarmPal image build..."
    log "This may take 30-90 minutes depending on hardware and network speed"
    log "FarmPal version: ${FARMPAL_VERSION}"
    echo ""

    local pigendir="${PROJECT_ROOT}/pi-gen"
    local img_output=""

    # Build with pi-gen
    # Stage 5 = complete image with desktop optional (we use lite + our customizations)
    cd "${pigendir}"

    local build_args=(
        --config FarmPal
        --log-step
        --disable-splash
    )

    if [[ "${NO_CACHE}" == "true" ]]; then
        build_args+=(--no-cache)
    fi

    # Run the build
    if ! sudo ./build.sh "${build_args[@]}"; then
        error "pi-gen build failed"
        error "Check build logs in ${pigendir}/logs/"
        exit 1
    fi

    cd "${PROJECT_ROOT}"

    # Find the output image
    img_output=$(find "${pigendir}/deploy" -name "farmpal-*.img.xz" 2>/dev/null | head -n1)

    if [[ -z "${img_output}" ]] || [[ ! -f "${img_output}" ]]; then
        error "Build succeeded but no image found in ${pigendir}/deploy/"
        exit 1
    fi

    log "Image built: ${img_output}"

    # Move to dist directory
    local final_image="${DIST_DIR}/farmpal-bookworm-arm64.img.xz"
    cp "${img_output}" "${final_image}"

    # Generate SHA256 checksum
    log "Generating SHA256 checksum..."
    (
        cd "${DIST_DIR}"
        sha256sum "farmpal-bookworm-arm64.img.xz" > "farmpal-bookworm-arm64.img.xz.sha256"
    )

    # List output files
    log "Build complete! Output files:"
    ls -lh "${DIST_DIR}"/*

    echo ""
    log "Image checksum:"
    cat "${DIST_DIR}/farmpal-bookworm-arm64.img.xz.sha256"
    echo ""

    echo ""
    log "Next steps:"
    echo "  1. Flash to SD card: xzcat ${DIST_DIR}/farmpal-bookworm-arm64.img.xz | sudo dd of=/dev/sdX bs=4M status=progress"
    echo "  2. Insert SD card and boot Raspberry Pi"
    echo "  3. Find IP address and SSH with randomized password"
    echo "  4. Open http://farmpal.local:3392 for setup wizard"
}

# Main execution
main() {
    echo ""
    echo "========================================"
    echo "  FarmPal Image Builder"
    echo "  Raspberry Pi OS Bookworm + FarmPal"
    echo "========================================"
    echo ""

    check_prereqs
    setup_build
    run_build

    log "Done!"
}

main
