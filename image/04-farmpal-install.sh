#!/bin/bash
# Stage 04: Install FarmPal from release tarball
set -e

FARMPAL_VERSION="${FARMPAL_VERSION:-latest}"
INSTALL_DIR="/opt/farmpal"
DATA_DIR="/var/lib/farmpal"
LOG_DIR="/var/log/farmpal"

echo "Installing FarmPal ${FARMPAL_VERSION}..."

# Create installation directory
mkdir -p "${INSTALL_DIR}"
mkdir -p "${DATA_DIR}"
mkdir -p "${LOG_DIR}"
mkdir -p "${INSTALL_DIR}/backups"
mkdir -p "${INSTALL_DIR}/certs"

# Download FarmPal release tarball
# In production, this downloads from GitHub Releases
# For image building, we use a placeholder that gets replaced at release time
if [[ "${FARMPAL_VERSION}" == "latest" ]]; then
    TARBALL_URL="https://github.com/farmpal/farmpal/releases/latest/download/farmpal-latest.tar.gz"
else
    TARBALL_URL="https://github.com/farmpal/farmpal/releases/download/${FARMPAL_VERSION}/farmpal-${FARMPAL_VERSION}.tar.gz"
fi

echo "Downloading FarmPal from ${TARBALL_URL}..."

# Download with retries
for i in 1 2 3; do
    if curl -fsSL "${TARBALL_URL}" -o /tmp/farmpal.tar.gz; then
        echo "Download successful"
        break
    fi
    echo "Download attempt $i failed, retrying..."
    sleep 5
done

if [[ ! -f /tmp/farmpal.tar.gz ]]; then
    echo "ERROR: Failed to download FarmPal tarball"
    exit 1
fi

# Extract to installation directory
echo "Extracting FarmPal..."
tar -xzf /tmp/farmpal.tar.gz -C "${INSTALL_DIR}" --strip-components=1
rm -f /tmp/farmpal.tar.gz

# Install Node.js dependencies
if [[ -f "${INSTALL_DIR}/package.json" ]]; then
    echo "Installing Node.js dependencies..."
    cd "${INSTALL_DIR}"
    npm ci --production --ignore-scripts
    if [[ ${?} -ne 0 ]]; then
        echo "ERROR: npm ci failed, trying npm install..."
        npm install --production --ignore-scripts
        if [[ ${?} -ne 0 ]]; then
            echo "ERROR: npm install failed"
            exit 1
        fi
    fi
fi

# Build TypeScript
if [[ -f "${INSTALL_DIR}/tsconfig.json" ]]; then
    echo "Building TypeScript..."
    cd "${INSTALL_DIR}"
    npx tsc
    if [[ ${?} -ne 0 ]]; then
        echo "ERROR: tsc failed, trying npm run build..."
        npm run build
        if [[ ${?} -ne 0 ]]; then
            echo "ERROR: TypeScript build failed"
            exit 1
        fi
    fi
fi

# Create symbolic link for CLI
ln -sf "${INSTALL_DIR}/bin/fft.js" /usr/local/bin/farmpal 2>/dev/null || true
ln -sf "${INSTALL_DIR}/bin/fft.js" /usr/local/bin/fft 2>/dev/null || true

# Set permissions
chown -R farmpal:farmpal "${INSTALL_DIR}"
chmod +x "${INSTALL_DIR}/bin/"*.js 2>/dev/null || true

echo "FarmPal installed to ${INSTALL_DIR}"
