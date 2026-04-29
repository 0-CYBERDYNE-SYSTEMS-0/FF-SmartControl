/**
 * License module - public API
 */

export * from './types.js';
export * from './hardware-id.js';
export * from './cache.js';
export * from './client.js';
export * from './feature-gates.js';

import {
  initLicenseCache,
  getCachedLicenseState,
  getTrialDaysRemaining,
} from './cache.js';
import {
  getLicenseStatus,
  activateLicense,
  deactivateLicense,
  getLicenseStatusCached,
  isFeatureAllowed,
} from './client.js';
import {
  getFeatureGates,
  FEATURE_GATES,
  type FeatureCategory,
  type FeatureGates,
} from './feature-gates.js';
import { getHardwareId, getHardwareIdDisplay } from './hardware-id.js';

// Re-export everything for convenience
export {
  initLicenseCache,
  getCachedLicenseState,
  getTrialDaysRemaining,
  getLicenseStatus,
  activateLicense,
  deactivateLicense,
  getLicenseStatusCached,
  isFeatureAllowed,
  getFeatureGates,
  getHardwareId,
  getHardwareIdDisplay,
  FEATURE_GATES,
  type FeatureCategory,
  type FeatureGates,
};

/**
 * Initialize the license system
 */
export function initLicense(): void {
  initLicenseCache();
}
