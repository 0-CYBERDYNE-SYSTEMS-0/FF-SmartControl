/**
 * Update System Types
 * VAL-UPDT-001 through VAL-UPDT-012, VAL-RBK-001 through VAL-RBK-004
 */

/**
 * Represents a FarmPal release available from the update server
 */
export interface UpdateRelease {
  version: string; // semver string e.g. "1.8.0"
  changelog: string; // Markdown release notes
  downloadUrl: string; // HTTPS URL to release bundle (.tar.gz or .img.xz)
  checksum: string; // SHA-256 hex digest of the bundle
  checksumUrl: string; // HTTPS URL to checksum file
  releaseDate: string; // ISO date string
  prerelease?: boolean; // true if this is a beta/rc release
}

/**
 * Result of comparing local version to available update
 */
export type UpdateStatus =
  | 'none' // No update available, already on latest
  | 'available' // Update available
  | 'prerelease' // Prerelease available (beta opt-in)
  | 'offline' // Cannot reach update server
  | 'error'; // Error checking for updates

/**
 * Current state of the update system
 */
export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string; // e.g. "1.7.2"
  availableVersion?: string; // semver of available update
  changelog?: string;
  releaseDate?: string;
  lastChecked?: string; // ISO timestamp
  errorMessage?: string;
}

/**
 * Progress step during update installation
 */
export type UpdateStep =
  | 'idle'
  | 'backing_up'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'restarting'
  | 'health_check'
  | 'rolling_back';

export interface UpdateProgress {
  step: UpdateStep;
  percent: number; // 0-100
  message: string;
  startedAt: string; // ISO timestamp
}

/**
 * An entry in the update history log
 */
export interface UpdateHistoryEntry {
  id: string;
  fromVersion: string;
  toVersion: string;
  triggeredBy: 'automatic' | 'manual';
  trigger?: string; // 'startup' | 'periodic' | 'manual_check' | 'manual_install' | 'rollback'
  status: 'success' | 'failed' | 'rolled_back';
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

/**
 * Rollback state - stored when an update begins
 */
export interface RollbackState {
  id: string;
  fromVersion: string;
  toVersion: string;
  snapshotPath: string; // path to farmpal.prev snapshot
  startedAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'failed';
  errorMessage?: string;
}

/**
 * Update configuration
 */
export interface UpdateConfig {
  updateServerUrl: string;
  checkIntervalMs: number; // default: 24 * 60 * 60 * 1000 (24 hours)
  healthCheckTimeoutMs: number; // default: 60000 (60 seconds)
  healthCheckEndpoint: string; // default: '/health'
  snapshotName: string; // default: 'farmpal.prev'
}
