/**
 * License types for FarmPal licensing system
 * VAL-LIC-001 through VAL-LIC-016
 */

export type LicenseStatus = 'UNLICENSED' | 'TRIAL' | 'LICENSED' | 'EXPIRED';

export interface LicenseState {
  status: LicenseStatus;
  licenseKey: string | null;
  hardwareId: string;
  activatedAt: string | null; // ISO timestamp
  expiresAt: string | null; // ISO timestamp, null for UNLICENSED
  trialStartedAt: string | null;
  cachedAt: string | null; // ISO timestamp of when we last synced with server
  lastCheckedAt: string | null; // ISO timestamp of last server contact
  cachedOffline: boolean; // True if we're running on cached license offline
}

export interface LicenseActivationRequest {
  licenseKey: string;
  hardwareId: string;
}

export interface LicenseActivationResponse {
  status: LicenseStatus;
  expiresAt: string | null; // ISO timestamp
  error?: string;
  errorCode?:
    | 'INVALID_FORMAT'
    | 'NOT_RECOGNIZED'
    | 'ALREADY_USED'
    | 'REVOKED'
    | 'EXPIRED';
}

export interface LicenseDeactivationRequest {
  licenseKey: string;
  hardwareId: string;
}

export interface LicenseDeactivationResponse {
  success: boolean;
  error?: string;
}

export interface LicenseStatusResponse {
  status: LicenseStatus;
  expiresAt: string | null;
  hardwareId: string;
  activatedAt: string | null;
  trialStartedAt: string | null;
  daysRemaining?: number; // For TRIAL status
  lastCheckedAt: string | null;
  isOffline: boolean;
  offlineExpiresAt?: string; // When offline cache expires
}

// Feature gates based on license state
export type FeatureCategory = 'local' | 'cloud' | 'ai' | 'remote';

export interface FeatureGates {
  // Local control - always available (VAL-OFFL-003)
  localControl: boolean;
  // Cloud/remote features - depend on license
  cloudFeatures: boolean;
  // AI/autonomous decisions
  aiFeatures: boolean;
  // Remote access
  remoteAccess: boolean;
  // All features (only LICENSED or TRIAL)
  allFeatures: boolean;
}

export const FEATURE_GATES: Record<LicenseStatus, FeatureGates> = {
  UNLICENSED: {
    localControl: true,
    cloudFeatures: false,
    aiFeatures: false,
    remoteAccess: false,
    allFeatures: false,
  },
  TRIAL: {
    localControl: true,
    cloudFeatures: true,
    aiFeatures: true,
    remoteAccess: true,
    allFeatures: true,
  },
  LICENSED: {
    localControl: true,
    cloudFeatures: true,
    aiFeatures: true,
    remoteAccess: true,
    allFeatures: true,
  },
  EXPIRED: {
    localControl: true, // VAL-OFFL-003: local works even when expired
    cloudFeatures: false,
    aiFeatures: false,
    remoteAccess: false,
    allFeatures: false,
  },
};

// Trial period in days
export const TRIAL_DAYS = 14;

// Cache TTL in days
export const LICENSE_CACHE_TTL_DAYS = 30;
export const LICENSE_CACHE_TTL_MS =
  LICENSE_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

// License key format: XXXX-XXXX-XXXX-XXXX (alphanumeric uppercase)
export const LICENSE_KEY_FORMAT =
  /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function validateLicenseKeyFormat(key: string): boolean {
  return LICENSE_KEY_FORMAT.test(key.trim().toUpperCase());
}
