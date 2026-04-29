/**
 * License cache - SQLite-backed caching with 30-day TTL
 * VAL-LIC-003, VAL-OFFL-001
 */

import { getDb } from '../hal/db.js';
import { logger } from '../logger.js';
import type { LicenseState, LicenseStatus } from './types.js';
import { LICENSE_CACHE_TTL_MS, LICENSE_CACHE_TTL_DAYS } from './types.js';

let cachedLicenseState: LicenseState | null = null;

/**
 * Initialize the license cache table
 */
export function initLicenseCache(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS license_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      status TEXT NOT NULL DEFAULT 'UNLICENSED',
      license_key TEXT,
      hardware_id TEXT NOT NULL,
      activated_at TEXT,
      expires_at TEXT,
      trial_started_at TEXT,
      cached_at TEXT NOT NULL,
      last_checked_at TEXT,
      cached_offline INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT single_row CHECK (id = 1)
    )
  `);

  // Ensure there's always exactly one row
  const existing = db.prepare('SELECT * FROM license_cache WHERE id = 1').get();
  if (!existing) {
    db.prepare(
      `
      INSERT INTO license_cache (id, status, hardware_id, cached_at, cached_offline)
      VALUES (1, 'UNLICENSED', '', datetime('now'), 0)
    `,
    ).run();
  }

  logger.info('License cache initialized');
}

/**
 * Get the current license state from cache
 */
export function getCachedLicenseState(): LicenseState | null {
  if (cachedLicenseState) {
    return cachedLicenseState;
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM license_cache WHERE id = 1').get() as
    | {
        status: string;
        license_key: string | null;
        hardware_id: string;
        activated_at: string | null;
        expires_at: string | null;
        trial_started_at: string | null;
        cached_at: string | null;
        last_checked_at: string | null;
        cached_offline: number;
      }
    | undefined;

  if (!row) {
    return null;
  }

  cachedLicenseState = {
    status: row.status as LicenseStatus,
    licenseKey: row.license_key,
    hardwareId: row.hardware_id,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    trialStartedAt: row.trial_started_at,
    cachedAt: row.cached_at,
    lastCheckedAt: row.last_checked_at,
    cachedOffline: row.cached_offline === 1,
  };

  return cachedLicenseState;
}

/**
 * Check if the cached license is still valid (within TTL)
 */
export function isCacheValid(): boolean {
  const state = getCachedLicenseState();
  if (!state || !state.cachedAt) {
    return false;
  }

  const cachedAt = new Date(state.cachedAt).getTime();
  const now = Date.now();
  const ttlMs = LICENSE_CACHE_TTL_MS;

  return now - cachedAt < ttlMs;
}

/**
 * Check if we're running on a cached offline license
 */
export function isOfflineCached(): boolean {
  const state = getCachedLicenseState();
  return state?.cachedOffline === true && !isCacheValid();
}

/**
 * Get when the offline cache expires (for display)
 */
export function getOfflineCacheExpiresAt(): string | null {
  const state = getCachedLicenseState();
  if (!state || !state.cachedAt) {
    return null;
  }

  const cachedAt = new Date(state.cachedAt).getTime();
  const expiresAt = cachedAt + LICENSE_CACHE_TTL_MS;

  return new Date(expiresAt).toISOString();
}

/**
 * Save license state to cache
 */
export function cacheLicenseState(state: {
  status: LicenseStatus;
  licenseKey: string | null;
  hardwareId: string;
  activatedAt: string | null;
  expiresAt: string | null;
  trialStartedAt: string | null;
}): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE license_cache SET
      status = ?,
      license_key = ?,
      hardware_id = ?,
      activated_at = ?,
      expires_at = ?,
      trial_started_at = ?,
      cached_at = ?,
      last_checked_at = ?,
      cached_offline = 0
    WHERE id = 1
  `,
  ).run(
    state.status,
    state.licenseKey,
    state.hardwareId,
    state.activatedAt,
    state.expiresAt,
    state.trialStartedAt,
    now,
    now,
  );

  // Clear cached state to force reload
  cachedLicenseState = null;

  logger.info({ status: state.status }, 'License state cached');
}

/**
 * Mark license as cached offline (for when we're offline but have valid cache)
 */
export function markLicenseOfflineCached(): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE license_cache SET
      cached_offline = 1,
      last_checked_at = ?
    WHERE id = 1
  `,
  ).run(now);

  cachedLicenseState = null;

  logger.info('License marked as offline cached');
}

/**
 * Clear the license cache (on deactivation)
 */
export function clearLicenseCache(): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE license_cache SET
      status = 'UNLICENSED',
      license_key = NULL,
      hardware_id = '',
      activated_at = NULL,
      expires_at = NULL,
      trial_started_at = NULL,
      cached_at = ?,
      last_checked_at = ?,
      cached_offline = 0
    WHERE id = 1
  `,
  ).run(now, now);

  cachedLicenseState = null;

  logger.info('License cache cleared');
}

/**
 * Get days remaining for a TRIAL license
 */
export function getTrialDaysRemaining(): number | null {
  const state = getCachedLicenseState();
  if (!state || state.status !== 'TRIAL' || !state.trialStartedAt) {
    return null;
  }

  const trialStart = new Date(state.trialStartedAt).getTime();
  const now = Date.now();
  const trialLength = 14 * 24 * 60 * 60 * 1000; // 14 days
  const elapsed = now - trialStart;
  const remaining = trialLength - elapsed;

  if (remaining <= 0) {
    return 0;
  }

  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

/**
 * Check if TRIAL has expired (should transition to EXPIRED)
 */
export function checkTrialExpired(): boolean {
  const state = getCachedLicenseState();
  if (!state || state.status !== 'TRIAL' || !state.trialStartedAt) {
    return false;
  }

  const trialStart = new Date(state.trialStartedAt).getTime();
  const now = Date.now();
  const trialLength = 14 * 24 * 60 * 60 * 1000; // 14 days

  return now - trialStart >= trialLength;
}

/**
 * Update status to EXPIRED if trial has ended
 */
export function updateExpiredTrial(): void {
  if (checkTrialExpired()) {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `
      UPDATE license_cache SET
        status = 'EXPIRED',
        last_checked_at = ?
      WHERE id = 1 AND status = 'TRIAL'
    `,
    ).run(now);

    cachedLicenseState = null;

    logger.info('Trial expired, status updated to EXPIRED');
  }
}

/**
 * Force reload from database (bypass cache)
 */
export function reloadLicenseState(): LicenseState | null {
  cachedLicenseState = null;
  return getCachedLicenseState();
}
