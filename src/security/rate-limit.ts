/**
 * Rate Limiting for Authentication Endpoints
 *
 * Features:
 * - 5 failed logins in 60 seconds → 5-minute lockout → 429 response
 * - Lockout logged to audit log
 * - Per-IP tracking
 */

import { getDb } from '../hal/db.js';

// Rate limit configuration
const MAX_FAILED_ATTEMPTS = 5;
const FAILED_ATTEMPT_WINDOW_SECONDS = 60; // 60 second window
const LOCKOUT_DURATION_SECONDS = 5 * 60; // 5 minute lockout

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
}

/**
 * Initialize rate limit database table
 */
export function initRateLimitDatabase(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL,
      attempted_at TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 0,
      user_agent TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, attempted_at);
  `);
}

/**
 * Record a failed login attempt
 */
export function recordFailedLogin(ipAddress: string, userAgent?: string): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO login_attempts (ip_address, attempted_at, success, user_agent)
    VALUES (?, ?, 0, ?)
  `,
  ).run(ipAddress, now, userAgent || null);

  // Clean up old entries (older than 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  db.prepare(
    `
    DELETE FROM login_attempts WHERE attempted_at < ?
  `,
  ).run(oneHourAgo);
}

/**
 * Record a successful login (clears failed attempts)
 */
export function recordSuccessfulLogin(ipAddress: string): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO login_attempts (ip_address, attempted_at, success, user_agent)
    VALUES (?, ?, 1, NULL)
  `,
  ).run(ipAddress, now);
}

/**
 * Reset rate limit (on successful login)
 */
export function resetRateLimit(ipAddress: string): void {
  const db = getDb();

  // Delete all failed attempts for this IP
  db.prepare(
    `
    DELETE FROM login_attempts WHERE ip_address = ? AND success = 0
  `,
  ).run(ipAddress);
}

/**
 * Check if the IP is currently locked out
 */
function isLockedOut(ipAddress: string): {
  locked: boolean;
  retryAfterSeconds: number;
} {
  const db = getDb();

  // Find the most recent failed attempt within the lockout window
  const lockoutStart = new Date(
    Date.now() - LOCKOUT_DURATION_SECONDS * 1000,
  ).toISOString();

  const recentFailedAttempts = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM login_attempts
    WHERE ip_address = ?
      AND success = 0
      AND attempted_at > ?
  `,
    )
    .get(ipAddress, lockoutStart) as { count: number };

  // If there are MAX_FAILED_ATTEMPTS or more in the window, IP is locked out
  if (recentFailedAttempts.count >= MAX_FAILED_ATTEMPTS) {
    // Find when the last failed attempt was
    const lastFailed = db
      .prepare(
        `
      SELECT attempted_at
      FROM login_attempts
      WHERE ip_address = ? AND success = 0
      ORDER BY attempted_at DESC
      LIMIT 1
    `,
      )
      .get(ipAddress) as { attempted_at: string } | undefined;

    if (lastFailed) {
      const lastFailedTime = new Date(lastFailed.attempted_at).getTime();
      const lockoutEnd = lastFailedTime + LOCKOUT_DURATION_SECONDS * 1000;
      const now = Date.now();

      if (now < lockoutEnd) {
        const retryAfterSeconds = Math.ceil((lockoutEnd - now) / 1000);
        return { locked: true, retryAfterSeconds };
      }
    }
  }

  return { locked: false, retryAfterSeconds: 0 };
}

/**
 * Check rate limit for an IP address
 */
export function checkRateLimit(ipAddress: string): RateLimitResult {
  // First check if currently locked out
  const lockoutCheck = isLockedOut(ipAddress);
  if (lockoutCheck.locked) {
    // Log lockout to audit
    logLockoutEvent(ipAddress, lockoutCheck.retryAfterSeconds);

    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: lockoutCheck.retryAfterSeconds,
    };
  }

  // Count recent failed attempts
  const db = getDb();
  const windowStart = new Date(
    Date.now() - FAILED_ATTEMPT_WINDOW_SECONDS * 1000,
  ).toISOString();

  const recentFailed = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM login_attempts
    WHERE ip_address = ?
      AND success = 0
      AND attempted_at > ?
  `,
    )
    .get(ipAddress, windowStart) as { count: number };

  const remaining = MAX_FAILED_ATTEMPTS - recentFailed.count;

  if (remaining <= 0) {
    // This shouldn't happen since isLockedOut should catch it
    // But handle it just in case
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: LOCKOUT_DURATION_SECONDS,
    };
  }

  return {
    allowed: true,
    remainingAttempts: remaining,
  };
}

/**
 * Log lockout event to audit log
 */
function logLockoutEvent(ipAddress: string, retryAfterSeconds: number): void {
  try {
    const db = getDb();

    // Check if we already logged this lockout recently (avoid spam)
    const recentLockout = db
      .prepare(
        `
      SELECT id
      FROM login_attempts
      WHERE ip_address = ?
        AND success = -1  -- Use success=-1 to indicate lockout event
        AND attempted_at > datetime('now', '-5 minutes')
    `,
      )
      .get(ipAddress);

    if (recentLockout) {
      return; // Already logged recently
    }

    // Log the lockout event
    db.prepare(
      `
      INSERT INTO login_attempts (ip_address, attempted_at, success, user_agent)
      VALUES (?, datetime('now'), -1, ?)
    `,
    ).run(
      ipAddress,
      `Locked out for ${retryAfterSeconds} seconds. Too many failed login attempts.`,
    );
  } catch {
    // Ignore logging errors
  }
}

/**
 * Get rate limit status for an IP (for UI display)
 */
export function getRateLimitStatus(ipAddress: string): {
  attemptsRemaining: number;
  isLocked: boolean;
  retryAfterSeconds?: number;
} {
  const lockoutCheck = isLockedOut(ipAddress);
  if (lockoutCheck.locked) {
    return {
      attemptsRemaining: 0,
      isLocked: true,
      retryAfterSeconds: lockoutCheck.retryAfterSeconds,
    };
  }

  const result = checkRateLimit(ipAddress);
  return {
    attemptsRemaining: result.remainingAttempts,
    isLocked: false,
  };
}

/**
 * Clear all rate limit data (for testing)
 */
export function clearAllRateLimits(): void {
  const db = getDb();
  db.prepare('DELETE FROM login_attempts').run();
}
