/**
 * License server client
 * Handles activation, deactivation, and status checks
 * VAL-LIC-002, VAL-LIC-006, VAL-LIC-015, VAL-LIC-016
 */

import { logger } from '../logger.js';
import type {
  LicenseActivationRequest,
  LicenseActivationResponse,
  LicenseDeactivationRequest,
  LicenseDeactivationResponse,
  LicenseStatusResponse,
  LicenseState,
  LicenseStatus,
} from './types.js';
import { TRIAL_DAYS } from './types.js';
import { getHardwareId } from './hardware-id.js';
import {
  cacheLicenseState,
  clearLicenseCache,
  getCachedLicenseState,
  isCacheValid,
  getTrialDaysRemaining,
  updateExpiredTrial,
  getOfflineCacheExpiresAt,
} from './cache.js';

const LICENSE_SERVER_URL =
  process.env.LICENSE_SERVER_URL || 'https://license.farmpal.io/api';

/**
 * Activate a license key against the license server.
 * There is NO mock mode — production and dev both use the real server.
 * VAL-LIC-002, VAL-LIC-006, VAL-LIC-015
 */
export async function activateLicense(
  licenseKey: string,
): Promise<LicenseActivationResponse> {
  const hardwareId = getHardwareId();
  const normalizedKey = licenseKey.trim().toUpperCase();

  // Check format first (client-side validation)
  if (
    !/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizedKey)
  ) {
    return {
      status: 'UNLICENSED',
      expiresAt: null,
      error: 'Invalid license key format. Expected format: XXXX-XXXX-XXXX-XXXX',
      errorCode: 'INVALID_FORMAT',
    };
  }

  // Try the real server
  if (await isOnline()) {
    return await activateLicenseRemote(normalizedKey, hardwareId);
  }

  // Offline — check if we have a cached license for this key
  const cached = getCachedLicenseState();
  if (cached && cached.licenseKey === normalizedKey && isCacheValid()) {
    logger.info('Using cached license while offline');
    return {
      status: cached.status,
      expiresAt: cached.expiresAt,
    };
  }

  // No server and no valid cache — activation impossible offline
  return {
    status: 'UNLICENSED',
    expiresAt: null,
    error:
      'Could not connect to license server. Please check your internet connection and try again.',
    errorCode: 'NOT_RECOGNIZED',
  };
}

/**
 * Activate license using remote server
 */
async function activateLicenseRemote(
  licenseKey: string,
  hardwareId: string,
): Promise<LicenseActivationResponse> {
  try {
    const response = await fetch(`${LICENSE_SERVER_URL}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey,
        hardwareId,
      } as LicenseActivationRequest),
    });

    const data = (await response.json()) as LicenseActivationResponse;

    if (!response.ok) {
      logger.warn(
        { status: response.status, data },
        'License activation failed',
      );

      if (data.errorCode) {
        return data;
      }

      return {
        status: 'UNLICENSED',
        expiresAt: null,
        error: data.error || 'License activation failed. Please try again.',
        errorCode: 'NOT_RECOGNIZED',
      };
    }

    // Cache successful activation
    const now = new Date().toISOString();
    cacheLicenseState({
      status: data.status,
      licenseKey,
      hardwareId,
      activatedAt: now,
      expiresAt: data.expiresAt,
      trialStartedAt: data.status === 'TRIAL' ? now : null,
    });

    logger.info(
      { licenseKey, hardwareId, status: data.status },
      'License activated via server',
    );

    return data;
  } catch (err) {
    logger.error({ err }, 'License activation request failed');

    // Network error - try to use cache
    if (isCacheValid()) {
      logger.info('Using cached license due to network error');
      const cached = getCachedLicenseState();
      return {
        status: cached?.status || 'UNLICENSED',
        expiresAt: cached?.expiresAt || null,
      };
    }

    return {
      status: 'UNLICENSED',
      expiresAt: null,
      error:
        'Could not connect to license server. Please check your internet connection and try again.',
      errorCode: 'NOT_RECOGNIZED',
    };
  }
}

/**
 * Deactivate the current license
 * VAL-LIC-014
 */
export async function deactivateLicense(): Promise<LicenseDeactivationResponse> {
  const state = getCachedLicenseState();
  const hardwareId = getHardwareId();

  if (!state?.licenseKey) {
    // Nothing to deactivate
    clearLicenseCache();
    return { success: true };
  }

  const licenseKey = state.licenseKey;

  // If online, notify server
  if (await isOnline()) {
    try {
      const response = await fetch(`${LICENSE_SERVER_URL}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey,
          hardwareId,
        } as LicenseDeactivationRequest),
      });

      if (!response.ok) {
        const data = await response.json();
        logger.warn(
          { status: response.status, data },
          'License deactivation server error',
        );
        // Continue with local deactivation anyway
      }
    } catch (err) {
      logger.error({ err }, 'License deactivation request failed');
      // Continue with local deactivation anyway
    }
  }

  // Clear local cache
  clearLicenseCache();

  logger.info({ licenseKey }, 'License deactivated');

  return { success: true };
}

/**
 * Get current license status
 * Returns cached state if valid, otherwise checks with server
 */
export async function getLicenseStatus(): Promise<LicenseStatusResponse> {
  const hardwareId = getHardwareId();

  // First, check if trial has expired and update status if needed
  updateExpiredTrial();

  // If cache is valid and we're not forcing online check, use cache
  if (isCacheValid()) {
    const cached = getCachedLicenseState();
    if (cached) {
      return buildStatusResponse(cached, false);
    }
  }

  // Try online check if we have a license
  const cached = getCachedLicenseState();
  if (cached?.licenseKey && (await isOnline())) {
    try {
      const response = await fetch(`${LICENSE_SERVER_URL}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: cached.licenseKey,
          hardwareId,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          status: LicenseStatus;
          expiresAt: string | null;
        };

        // Update cache with server response
        cacheLicenseState({
          status: data.status,
          licenseKey: cached.licenseKey,
          hardwareId,
          activatedAt: cached.activatedAt,
          expiresAt: data.expiresAt,
          trialStartedAt: cached.trialStartedAt,
        });

        const updated = getCachedLicenseState();
        return buildStatusResponse(updated || cached, false);
      }
    } catch (err) {
      logger.error({ err }, 'License status check failed');
    }
  }

  // Return cached state (may be offline cached)
  if (cached) {
    const isOffline = !isCacheValid();
    return buildStatusResponse(cached, isOffline);
  }

  // No license at all
  return {
    status: 'UNLICENSED',
    expiresAt: null,
    hardwareId,
    activatedAt: null,
    trialStartedAt: null,
    lastCheckedAt: null,
    isOffline: false,
  };
}

/**
 * Build a status response from cached state
 */
function buildStatusResponse(
  state: LicenseState,
  isOffline: boolean,
): LicenseStatusResponse {
  const daysRemaining =
    state.status === 'TRIAL' ? getTrialDaysRemaining() : undefined;

  return {
    status: state.status,
    expiresAt: state.expiresAt,
    hardwareId: state.hardwareId,
    activatedAt: state.activatedAt,
    trialStartedAt: state.trialStartedAt,
    daysRemaining: daysRemaining ?? undefined,
    lastCheckedAt: state.lastCheckedAt,
    isOffline,
    offlineExpiresAt: isOffline
      ? (getOfflineCacheExpiresAt() ?? undefined)
      : undefined,
  };
}

/**
 * Check if we're online by pinging the license server
 */
async function isOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    await fetch(`${LICENSE_SERVER_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a specific feature is allowed
 */
export function isFeatureAllowed(
  feature: 'local' | 'cloud' | 'ai' | 'remote',
): boolean {
  const state = getCachedLicenseState();

  if (!state) {
    // UNLICENSED - only local control
    return feature === 'local';
  }

  updateExpiredTrial();

  const cached = getCachedLicenseState();
  if (!cached) {
    return feature === 'local';
  }

  switch (feature) {
    case 'local':
      return true; // Always allowed
    case 'cloud':
      return cached.status === 'LICENSED' || cached.status === 'TRIAL';
    case 'ai':
      return cached.status === 'LICENSED' || cached.status === 'TRIAL';
    case 'remote':
      return cached.status === 'LICENSED' || cached.status === 'TRIAL';
    default:
      return false;
  }
}

/**
 * Get current license status (synchronous, uses cache only)
 */
export function getLicenseStatusCached(): LicenseState | null {
  updateExpiredTrial();
  return getCachedLicenseState();
}
