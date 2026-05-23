/**
 * API Rate Limiting
 *
 * Features:
 * - 100 authenticated API requests per minute per session
 * - 429 response with Retry-After header when limit exceeded
 * - Rate limit hits logged to audit log
 */

import { getSafetyDb } from '../hal/safety-db.js';

// Rate limit configuration
const MAX_REQUESTS_PER_MINUTE = 100;
const WINDOW_SECONDS = 60; // 60 second rolling window

export interface ApiRateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  retryAfterSeconds?: number;
}

/**
 * Initialize API rate limit database table
 */
export function initApiRateLimitDatabase(): void {
  const db = getSafetyDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS api_rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      requested_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_api_rate_limits_session
      ON api_rate_limits(session_id, requested_at);
  `);
}

/**
 * Check rate limit for a session
 */
export function checkApiRateLimit(sessionId: string): ApiRateLimitResult {
  const db = getSafetyDb();
  const windowStart = new Date(
    Date.now() - WINDOW_SECONDS * 1000,
  ).toISOString();

  // Count requests for this session in the current window
  const recentRequests = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM api_rate_limits
    WHERE session_id = ?
      AND requested_at > ?
  `,
    )
    .get(sessionId, windowStart) as { count: number };

  const remaining = MAX_REQUESTS_PER_MINUTE - recentRequests.count;

  if (remaining <= 0) {
    // Find when the window started to calculate retry-after
    const oldestRequest = db
      .prepare(
        `
      SELECT requested_at
      FROM api_rate_limits
      WHERE session_id = ?
      ORDER BY requested_at ASC
      LIMIT 1
    `,
      )
      .get(sessionId) as { requested_at: string } | undefined;

    let retryAfterSeconds = WINDOW_SECONDS;
    if (oldestRequest) {
      const oldestTime = new Date(oldestRequest.requested_at).getTime();
      const windowEnd = oldestTime + WINDOW_SECONDS * 1000;
      const now = Date.now();
      retryAfterSeconds = Math.ceil((windowEnd - now) / 1000);
      if (retryAfterSeconds < 1) retryAfterSeconds = 1;
    }

    return {
      allowed: false,
      remainingRequests: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remainingRequests: remaining,
  };
}

/**
 * Record an API request for rate limiting
 */
export function recordApiRequest(sessionId: string, endpoint: string): void {
  const db = getSafetyDb();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO api_rate_limits (session_id, endpoint, requested_at)
    VALUES (?, ?, ?)
  `,
  ).run(sessionId, endpoint, now);

  // Clean up old entries (older than 2 minutes)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  db.prepare(
    `
    DELETE FROM api_rate_limits WHERE requested_at < ?
  `,
  ).run(twoMinutesAgo);
}

/**
 * Clear rate limit data for a session (on logout)
 */
export function clearApiRateLimit(sessionId: string): void {
  const db = getSafetyDb();
  db.prepare('DELETE FROM api_rate_limits WHERE session_id = ?').run(sessionId);
}

/**
 * Get rate limit status for a session (for debugging/UI)
 */
export function getApiRateLimitStatus(sessionId: string): {
  remainingRequests: number;
  resetInSeconds: number;
} {
  const db = getSafetyDb();
  const windowStart = new Date(
    Date.now() - WINDOW_SECONDS * 1000,
  ).toISOString();

  const recentRequests = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM api_rate_limits
    WHERE session_id = ?
      AND requested_at > ?
  `,
    )
    .get(sessionId, windowStart) as { count: number };

  const remaining = Math.max(0, MAX_REQUESTS_PER_MINUTE - recentRequests.count);

  // Calculate when the window will reset
  const oldestRequest = db
    .prepare(
      `
    SELECT requested_at
    FROM api_rate_limits
    WHERE session_id = ?
    ORDER BY requested_at ASC
    LIMIT 1
  `,
    )
    .get(sessionId) as { requested_at: string } | undefined;

  let resetInSeconds = 0;
  if (oldestRequest) {
    const oldestTime = new Date(oldestRequest.requested_at).getTime();
    const windowEnd = oldestTime + WINDOW_SECONDS * 1000;
    resetInSeconds = Math.max(0, Math.ceil((windowEnd - Date.now()) / 1000));
  }

  return { remainingRequests: remaining, resetInSeconds };
}

/**
 * Clear all rate limit data (for testing)
 */
export function clearAllApiRateLimits(): void {
  const db = getSafetyDb();
  db.prepare('DELETE FROM api_rate_limits').run();
}
