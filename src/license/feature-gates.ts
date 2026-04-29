/**
 * Feature gates based on license state
 * VAL-LIC-005, VAL-OFFL-001, VAL-OFFL-003
 */

import {
  getCachedLicenseState,
  updateExpiredTrial,
  getTrialDaysRemaining,
} from './cache.js';
import {
  LicenseStatus,
  FEATURE_GATES,
  type FeatureGates,
  type FeatureCategory,
} from './types.js';

// Re-export types and constants for external use
export { FEATURE_GATES };
export type { FeatureGates, FeatureCategory };
export type { LicenseStatus } from './types.js';

/**
 * Get the feature gates for the current license state
 */
export function getFeatureGates(): FeatureGates {
  updateExpiredTrial();
  const state = getCachedLicenseState();

  if (!state) {
    return FEATURE_GATES.UNLICENSED;
  }

  return FEATURE_GATES[state.status];
}

/**
 * Check if a specific feature category is allowed
 */
export function isFeatureAllowedCached(category: FeatureCategory): boolean {
  const gates = getFeatureGates();

  switch (category) {
    case 'local':
      return gates.localControl;
    case 'cloud':
      return gates.cloudFeatures;
    case 'ai':
      return gates.aiFeatures;
    case 'remote':
      return gates.remoteAccess;
    default:
      return false;
  }
}

/**
 * Get a message for blocked features
 */
export function getBlockedFeatureMessage(category: FeatureCategory): string {
  const state = getCachedLicenseState();

  if (!state || state.status === 'UNLICENSED') {
    switch (category) {
      case 'cloud':
        return 'Cloud features require a license. Please activate your license to unlock cloud features.';
      case 'ai':
        return 'AI features require a license. Please activate your license to unlock AI features.';
      case 'remote':
        return 'Remote access requires a license. Please activate your license to unlock remote access.';
      default:
        return 'This feature requires a license.';
    }
  }

  if (state.status === 'EXPIRED') {
    switch (category) {
      case 'cloud':
        return 'Your license has expired. Cloud features are disabled. Please renew your license to continue using cloud features.';
      case 'ai':
        return 'Your license has expired. AI features are disabled. Please renew your license to continue using AI features.';
      case 'remote':
        return 'Your license has expired. Remote access is disabled. Please renew your license to continue using remote access.';
      default:
        return 'This feature requires an active license.';
    }
  }

  if (state.status === 'TRIAL') {
    const daysRemaining = getTrialDaysRemaining() ?? 0;
    if (daysRemaining <= 0) {
      return 'Your trial has expired. Please activate a license to continue using all features.';
    }
    return `Your trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Activate a license to continue using all features.`;
  }

  return 'This feature is not available with your current license.';
}

/**
 * Get the license status badge info for UI display
 * VAL-LIC-010
 */
export interface LicenseBadgeInfo {
  status: LicenseStatus;
  label: string;
  color: {
    bg: string;
    text: string;
    border: string;
  };
  badgeStyle: 'licensed' | 'trial' | 'expired' | 'unlicensed';
}

export function getLicenseBadgeInfo(): LicenseBadgeInfo {
  const state = getCachedLicenseState();
  const status = state?.status || 'UNLICENSED';
  const daysRemaining = status === 'TRIAL' ? getTrialDaysRemaining() : null;

  const badgeInfo: Record<LicenseStatus, LicenseBadgeInfo> = {
    LICENSED: {
      status: 'LICENSED',
      label: 'LICENSED',
      color: { bg: '#238636', text: '#F0F6FC', border: '#3FB950' },
      badgeStyle: 'licensed',
    },
    TRIAL: {
      status: 'TRIAL',
      label:
        daysRemaining !== null && daysRemaining > 0
          ? `TRIAL — ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
          : 'TRIAL',
      color: { bg: '#388BFD', text: '#F0F6FC', border: '#58A6FF' },
      badgeStyle: 'trial',
    },
    EXPIRED: {
      status: 'EXPIRED',
      label: 'EXPIRED',
      color: { bg: '#D29922', text: '#F0F6FC', border: '#E3B341' },
      badgeStyle: 'expired',
    },
    UNLICENSED: {
      status: 'UNLICENSED',
      label: 'UNLICENSED',
      color: { bg: '#6C7278', text: '#F0F6FC', border: '#8B949E' },
      badgeStyle: 'unlicensed',
    },
  };

  return badgeInfo[status];
}
