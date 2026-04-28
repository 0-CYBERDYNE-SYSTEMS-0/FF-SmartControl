#!/bin/bash
# First-boot script: 01-resize-partition.sh
# Automatically resizes the root partition to fill the SD card
set -e

LOGFILE="/var/log/farmpal-firstboot.log"
mkdir -p /var/log/farmpal

log() {
    echo "[$(date)] $1" | tee -a "${LOGFILE}"
}

log "Starting partition resize..."

# Check if we're running on a Raspberry Pi
if [[ ! -d /sys/firmware/devicetree/base ]]; then
    log "Not running on Raspberry Pi, skipping resize"
    exit 0
fi

# Check if this is the first boot (partition hasn't been resized yet)
if [[ -f /var/lib/farmpal/.partition_resized ]]; then
    log "Partition already resized, skipping"
    exit 0
fi

# Use raspi-config or parted to resize
if command -v raspi-config &>/dev/null; then
    log "Using raspi-config to expand filesystem..."
    raspi-config --expand-rootfs 2>&1 | tee -a "${LOGFILE}" || true
elif command -v parted &>/dev/null; then
    log "Using parted to expand root partition..."
    
    # Get the root partition device
    ROOT_DEV=$(findmnt / -o source -n | sed 's/p[0-9]*$//' | sed 's/[0-9]*$//')
    ROOT_PART=$(findmnt / -o source -n)
    
    if [[ -z "${ROOT_DEV}" ]] || [[ -z "${ROOT_PART}" ]]; then
        log "Could not determine root device/partition"
        exit 1
    fi
    
    log "Root device: ${ROOT_DEV}, Root partition: ${ROOT_PART}"
    
    # Get the last sector of the disk
    LAST_SECTOR=$(parted -s "${ROOT_DEV}" unit s print | grep "Disk /" | awk '{print $3}' | sed 's/s$//')
    
    if [[ -n "${LAST_SECTOR}" ]]; then
        log "Expanding partition to cover entire disk (last sector: ${LAST_SECTOR})..."
        parted -s "${ROOT_DEV}" resizepart 2 "${LAST_SECTOR}" 2>&1 | tee -a "${LOGFILE}" || true
        partprobe "${ROOT_DEV}" 2>&1 | tee -a "${LOGFILE}" || true
    fi
fi

# Resize the filesystem
if command -v resize2fs &>/dev/null; then
    ROOT_PART=$(findmnt / -o source -n)
    log "Resizing filesystem on ${ROOT_PART}..."
    resize2fs "${ROOT_PART}" 2>&1 | tee -a "${LOGFILE}" || true
fi

# Mark partition as resized
touch /var/lib/farmpal/.partition_resized
log "Partition resize complete"
