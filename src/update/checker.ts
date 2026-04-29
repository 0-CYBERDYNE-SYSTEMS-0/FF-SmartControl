/**
 * Update Checker - Version comparison and update availability checking
 * VAL-UPDT-001, VAL-UPDT-002, VAL-OFFL-002
 */

import { logger } from '../logger.js';
import type { UpdateRelease, UpdateState, UpdateStatus } from './types.js';

const UPDATE_SERVER_URL =
  process.env.UPDATE_SERVER_URL || 'https://updates.farmpal.io/api';

const MOCK_UPDATE_SERVER = !process.env.UPDATE_SERVER_URL;

// Mock data for development
const MOCK_RELEASES: UpdateRelease[] = [
  {
    version: '1.8.0',
    changelog: `# FarmPal v1.8.0

## New Features
- **New Dashboard**: Redesigned KPI strip with 6 metrics
- **Safety Dashboard**: View all active safety rules and denied actions
- **Camera Grid**: Dedicated cameras view with thumbnail grid

## Improvements
- Improved sensor polling latency
- Better error messages for network failures
- Updated setup wizard with better WiFi handling

## Bug Fixes
- Fixed relay toggle not reflecting hardware state
- Fixed timezone offset in scheduled tasks
- Fixed CO2 chart not rendering when data exists`,
    downloadUrl: 'https://updates.farmpal.io/releases/v1.8.0/farmpal.tar.gz',
    checksum:
      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    checksumUrl: 'https://updates.farmpal.io/releases/v1.8.0/SHA256SUMS',
    releaseDate: '2024-03-15T10:00:00Z',
    prerelease: false,
  },
  {
    version: '1.9.0-beta.1',
    changelog: `# FarmPal v1.9.0-beta.1

## Beta Features
- **AI Decision Assistant**: New natural language interface
- **Multi-Zone Support**: Manage multiple grow zones

*This is a beta release. Not recommended for production.*`,
    downloadUrl:
      'https://updates.farmpal.io/releases/v1.9.0-beta.1/farmpal.tar.gz',
    checksum:
      'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
    checksumUrl: 'https://updates.farmpal.io/releases/v1.9.0-beta.1/SHA256SUMS',
    releaseDate: '2024-04-01T10:00:00Z',
    prerelease: true,
  },
];

/**
 * Parse a semver string into components
 */
export function parseSemver(version: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
} {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?$/);
  if (!match) {
    throw new Error(`Invalid semver string: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
  };
}

/**
 * Compare two semver versions.
 * Returns:
 *   < 0 if a is less than b
 *   = 0 if a equals b
 *   > 0 if a is greater than b
 *
 * Prerelease rules per semver spec:
 * - 1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0
 * - Without prerelease, version is "release" and beats any prerelease
 */
export function compareSemver(a: string, b: string): number {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);

  // Compare major.minor.patch
  if (parsedA.major !== parsedB.major) {
    return parsedA.major - parsedB.major;
  }
  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor - parsedB.minor;
  }
  if (parsedA.patch !== parsedB.patch) {
    return parsedA.patch - parsedB.patch;
  }

  // No patch difference - compare prerelease
  // Higher prerelease count means more mature
  // No prerelease (null) beats having prerelease
  if (parsedA.prerelease === null && parsedB.prerelease === null) {
    return 0;
  }
  if (parsedA.prerelease === null) {
    return 1; // Release beats prerelease
  }
  if (parsedB.prerelease === null) {
    return -1; // Release beats prerelease
  }

  // Both have prerelease - compare them
  // Split by '.' and compare numerically where possible
  const partsA = parsedA.prerelease.split('.');
  const partsB = parsedB.prerelease.split('.');

  const minLen = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < minLen; i++) {
    const numA = parseInt(partsA[i], 10);
    const numB = parseInt(partsB[i], 10);
    const isNumA = !isNaN(numA);
    const isNumB = !isNaN(numB);

    if (isNumA && isNumB) {
      if (numA !== numB) return numA - numB;
    } else if (isNumA) {
      return -1; // Numeric prerelease < non-numeric at same position
    } else if (isNumB) {
      return 1;
    } else {
      // Both non-numeric, lexicographic compare
      if (partsA[i] !== partsB[i]) {
        return partsA[i].localeCompare(partsB[i]);
      }
    }
  }

  // All compared parts equal - longer prerelease string is more mature
  return partsA.length - partsB.length;
}

/**
 * Check if version a is greater than version b (semver gt)
 */
export function isNewer(a: string, b: string): boolean {
  return compareSemver(a, b) > 0;
}

/**
 * Check if an update is available
 * Returns the update state with status
 */
export async function checkForUpdate(
  currentVersion: string,
  options: { includePrerelease?: boolean } = {},
): Promise<UpdateState> {
  const { includePrerelease = false } = options;

  // Try to fetch latest release from server
  if (MOCK_UPDATE_SERVER) {
    return checkForUpdateMock(currentVersion, { includePrerelease });
  }

  return checkForUpdateRemote(currentVersion, { includePrerelease });
}

/**
 * Mock implementation for development
 */
function checkForUpdateMock(
  currentVersion: string,
  options: { includePrerelease?: boolean },
): UpdateState {
  const { includePrerelease } = options;
  const now = new Date().toISOString();

  // Find the latest non-prerelease
  const stableReleases = MOCK_RELEASES.filter((r) => !r.prerelease);
  const latestStable = stableReleases[0];

  if (!latestStable) {
    return {
      status: 'none',
      currentVersion,
      lastChecked: now,
    };
  }

  const comparison = compareSemver(latestStable.version, currentVersion);

  if (comparison <= 0) {
    return {
      status: 'none',
      currentVersion,
      lastChecked: now,
    };
  }

  // There's a newer stable release
  if (latestStable.prerelease) {
    // If latest is prerelease and we don't want prereleases
    if (!includePrerelease) {
      return {
        status: 'none',
        currentVersion,
        lastChecked: now,
      };
    }
    return {
      status: 'prerelease',
      currentVersion,
      availableVersion: latestStable.version,
      changelog: latestStable.changelog,
      releaseDate: latestStable.releaseDate,
      lastChecked: now,
    };
  }

  return {
    status: 'available',
    currentVersion,
    availableVersion: latestStable.version,
    changelog: latestStable.changelog,
    releaseDate: latestStable.releaseDate,
    lastChecked: now,
  };
}

/**
 * Remote implementation - calls actual update server
 */
async function checkForUpdateRemote(
  currentVersion: string,
  options: { includePrerelease?: boolean },
): Promise<UpdateState> {
  const { includePrerelease } = options;
  const now = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const url = `${UPDATE_SERVER_URL}/latest?current=${encodeURIComponent(currentVersion)}${
      includePrerelease ? '&prerelease=true' : ''
    }`;
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn(
        { status: response.status, currentVersion },
        'Update server returned error',
      );
      return {
        status: 'error',
        currentVersion,
        errorMessage: `Update server returned ${response.status}`,
        lastChecked: now,
      };
    }

    const release = (await response.json()) as UpdateRelease;

    // Compare versions
    const comparison = compareSemver(release.version, currentVersion);

    if (comparison <= 0) {
      return {
        status: 'none',
        currentVersion,
        lastChecked: now,
      };
    }

    if (release.prerelease && !includePrerelease) {
      return {
        status: 'prerelease',
        currentVersion,
        availableVersion: release.version,
        changelog: release.changelog,
        releaseDate: release.releaseDate,
        lastChecked: now,
      };
    }

    return {
      status: release.prerelease ? 'prerelease' : 'available',
      currentVersion,
      availableVersion: release.version,
      changelog: release.changelog,
      releaseDate: release.releaseDate,
      lastChecked: now,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      logger.warn({ currentVersion }, 'Update check timed out');
      return {
        status: 'offline',
        currentVersion,
        errorMessage: 'Update server did not respond',
        lastChecked: now,
      };
    }

    logger.warn({ err, currentVersion }, 'Update check failed');
    return {
      status: 'offline',
      currentVersion,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
      lastChecked: now,
    };
  }
}

/**
 * Check if we're currently online (can reach external hosts)
 */
export async function isOnline(): Promise<boolean> {
  if (MOCK_UPDATE_SERVER) {
    return true; // Mock is always "online"
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    await fetch(`${UPDATE_SERVER_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Periodic Update Checker
// VAL-UPDT-001: Update check runs at startup + every 24 hours
// ============================================================

const UPDATE_CHECK_INTERVAL_MS =
  parseInt(process.env.UPDATE_CHECK_INTERVAL_MS || '', 10) ||
  24 * 60 * 60 * 1000; // Default: 24 hours

let updateCheckTimer: ReturnType<typeof setInterval> | null = null;
let updateCheckLogger: any = null;

/**
 * Get the logger instance (lazily imported to avoid circular deps)
 */
async function getLogger() {
  if (!updateCheckLogger) {
    const { logger } = await import('../logger.js');
    updateCheckLogger = logger;
  }
  return updateCheckLogger;
}

/**
 * Perform a single update check and log the result
 */
async function performUpdateCheck(): Promise<void> {
  const logger = await getLogger();

  try {
    const { getInstalledVersion } = await import('./installer.js');
    const currentVersion = getInstalledVersion();
    const updateState = await checkForUpdate(currentVersion);

    if (updateState.status === 'available') {
      logger.info(
        {
          currentVersion,
          availableVersion: updateState.availableVersion,
        },
        'Update available: v{availableVersion}',
      );
    } else if (updateState.status === 'none') {
      logger.debug({ currentVersion }, 'No update available');
    } else if (updateState.status === 'offline') {
      logger.debug({ currentVersion }, 'Update check skipped - offline');
    } else if (updateState.status === 'error') {
      logger.warn(
        { currentVersion, error: updateState.errorMessage },
        'Update check failed',
      );
    }
  } catch (err) {
    logger.warn({ err }, 'Periodic update check failed');
  }
}

/**
 * Start the periodic update checker.
 * Checks at startup and then every UPDATE_CHECK_INTERVAL_MS.
 * VAL-UPDT-001: FarmPal checks update server at startup then every 24 hours.
 */
export function startUpdateChecker(): void {
  if (updateCheckTimer !== null) {
    return; // Already started
  }

  // Check immediately on startup
  void performUpdateCheck();

  // Then check periodically
  updateCheckTimer = setInterval(() => {
    void performUpdateCheck();
  }, UPDATE_CHECK_INTERVAL_MS);

  void getLogger().then((logger) => {
    logger.info(
      { everyMs: UPDATE_CHECK_INTERVAL_MS },
      'Update checker started (periodic every {everyMs}ms)',
    );
  });
}

/**
 * Stop the periodic update checker.
 * For testing and graceful shutdown.
 */
export function stopUpdateChecker(): void {
  if (updateCheckTimer !== null) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
    void getLogger().then((logger) => {
      logger.info('Update checker stopped');
    });
  }
}

/**
 * Trigger an immediate update check.
 * Resets the periodic timer.
 */
export async function triggerUpdateCheck(): Promise<void> {
  await performUpdateCheck();
}
