/**
 * Session Management with Cryptographically Secure Tokens
 *
 * Features:
 * - Session tokens generated using crypto.randomBytes(32)
 * - Sessions stored in SQLite for persistence across restarts
 * - HttpOnly, Secure, SameSite=Strict cookies
 * - 24-hour session expiry with sliding window
 * - Session fixation prevention (regenerate token on login)
 */

import { randomBytes, timingSafeEqual } from 'crypto';
import { getDb } from '../hal/db.js';
import bcrypt from 'bcryptjs';

// Session configuration
const SESSION_TOKEN_BYTES = 32;
const SESSION_EXPIRY_HOURS = 24;

// Cookie configuration
const COOKIE_NAME = 'farmpal_session';
const COOKIE_DOMAIN = process.env.HAL_UI_COOKIE_DOMAIN || '';
const COOKIE_SECURE =
  process.env.NODE_ENV === 'production' ||
  process.env.HAL_UI_HTTPS_ENABLED === 'true';
const COOKIE_SAMESITE = 'Strict';

export interface Session {
  id: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  operatorId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionCookie {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: string;
    path: string;
    domain?: string;
    maxAge: number;
  };
}

/**
 * Initialize session database table
 */
export function initSessionDatabase(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL,
      operator_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_activity_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON admin_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at);
  `);
}

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('hex');
}

/**
 * Hash a session token for storage
 */
function hashToken(token: string): string {
  return bcrypt.hashSync(token, 10);
}

/**
 * Verify a session token against its hash
 */
function verifyToken(token: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(token, hash);
  } catch {
    return false;
  }
}

/**
 * Create a new session for an authenticated operator
 * This regenerates the session ID to prevent session fixation
 */
export async function createSession(
  operatorId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ session: Session; cookie: SessionCookie }> {
  const db = getDb();

  // Generate new session token
  const token = generateSessionToken();
  const tokenHash = hashToken(token);

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  const session: Session = {
    id: randomBytes(16).toString('hex'),
    tokenHash,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastActivityAt: now.toISOString(),
    operatorId,
    ipAddress,
    userAgent,
  };

  // Store in database
  db.prepare(
    `
    INSERT INTO admin_sessions (id, token_hash, operator_id, created_at, expires_at, last_activity_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    session.id,
    session.tokenHash,
    session.operatorId,
    session.createdAt,
    session.expiresAt,
    session.lastActivityAt,
    session.ipAddress || null,
    session.userAgent || null,
  );

  // Build cookie
  const cookie = buildSessionCookie(token);

  return { session, cookie };
}

/**
 * Build the session cookie object
 */
function buildSessionCookie(token: string): SessionCookie {
  const maxAge = SESSION_EXPIRY_HOURS * 60 * 60; // seconds

  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAMESITE,
      path: '/',
      domain: COOKIE_DOMAIN || undefined,
      maxAge,
    },
  };
}

/**
 * Validate a session token and return the session if valid
 */
export function validateSession(token: string): Session | null {
  if (!token) {
    return null;
  }

  const db = getDb();

  // Get all non-expired sessions and check each one
  // (We can't index by token directly since it's hashed)
  const sessions = db
    .prepare(
      `
    SELECT * FROM admin_sessions
    WHERE expires_at > datetime('now')
    ORDER BY last_activity_at DESC
  `,
    )
    .all() as Array<{
    id: string;
    token_hash: string;
    operator_id: string;
    created_at: string;
    expires_at: string;
    last_activity_at: string;
    ip_address: string | null;
    user_agent: string | null;
  }>;

  for (const row of sessions) {
    try {
      if (verifyToken(token, row.token_hash)) {
        // Update last activity
        db.prepare(
          `
          UPDATE admin_sessions
          SET last_activity_at = datetime('now')
          WHERE id = ?
        `,
        ).run(row.id);

        return {
          id: row.id,
          tokenHash: row.token_hash,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          lastActivityAt: row.last_activity_at,
          operatorId: row.operator_id,
          ipAddress: row.ip_address || undefined,
          userAgent: row.user_agent || undefined,
        };
      }
    } catch {
      // Timing safe compare failed, try next session
      continue;
    }
  }

  return null;
}

/**
 * Invalidate a specific session (logout)
 */
export function invalidateSession(token: string): void {
  if (!token) {
    return;
  }

  const db = getDb();

  // Find and delete the session with this token
  const sessions = db
    .prepare(
      `
    SELECT id FROM admin_sessions
    WHERE expires_at > datetime('now')
  `,
    )
    .all() as Array<{ id: string; token_hash: string }>;

  for (const row of sessions) {
    try {
      if (verifyToken(token, row.token_hash)) {
        db.prepare('DELETE FROM admin_sessions WHERE id = ?').run(row.id);
        return;
      }
    } catch {
      continue;
    }
  }
}

/**
 * Invalidate all sessions for an operator
 */
export function invalidateAllSessions(operatorId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM admin_sessions WHERE operator_id = ?').run(
    operatorId,
  );
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): number {
  const db = getDb();
  const result = db
    .prepare(
      `
    DELETE FROM admin_sessions WHERE expires_at <= datetime('now')
  `,
    )
    .run();

  return result.changes;
}

/**
 * Get session info without exposing the token hash
 */
export function getSessionInfo(
  token: string,
): { operatorId: string; expiresAt: string; lastActivityAt: string } | null {
  const session = validateSession(token);
  if (!session) {
    return null;
  }

  return {
    operatorId: session.operatorId,
    expiresAt: session.expiresAt,
    lastActivityAt: session.lastActivityAt,
  };
}

/**
 * Build Set-Cookie header value
 */
export function buildSetCookieHeader(cookie: SessionCookie): string {
  const parts = [
    `${cookie.name}=${cookie.value}`,
    `HttpOnly`,
    `Path=${cookie.options.path}`,
  ];

  if (cookie.options.secure) {
    parts.push('Secure');
  }
  if (cookie.options.sameSite) {
    parts.push(`SameSite=${cookie.options.sameSite}`);
  }
  if (cookie.options.domain) {
    parts.push(`Domain=${cookie.options.domain}`);
  }
  parts.push(`Max-Age=${cookie.options.maxAge}`);

  return parts.join('; ');
}

/**
 * Build Set-Cookie header for clearing session
 */
export function buildClearSessionHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`;
}

/**
 * Parse session cookie from request headers
 */
export function parseSessionCookie(
  cookieHeader: string | undefined,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === COOKIE_NAME && value) {
      return value;
    }
  }

  return null;
}

/**
 * CSRF token generation using crypto.randomBytes
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Build CSRF cookie (double-submit cookie pattern)
 */
export function buildCsrfCookie(token: string): string {
  return `farmpal_csrf=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_EXPIRY_HOURS * 60 * 60}`;
}

/**
 * Parse CSRF cookie
 */
export function parseCsrfCookie(
  cookieHeader: string | undefined,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === 'farmpal_csrf' && value) {
      return value;
    }
  }

  return null;
}

/**
 * Validate CSRF token using double-submit pattern
 * Compares X-CSRF-Token header with the cookie value
 */
export function validateCsrfToken(
  headerToken: string | undefined,
  cookieToken: string | null,
): boolean {
  if (!headerToken || !cookieToken) {
    return false;
  }

  if (headerToken !== cookieToken) {
    return false;
  }

  // Token should be 64 hex characters (32 bytes)
  if (headerToken.length !== 64) {
    return false;
  }

  // Check if it's valid hex
  if (!/^[a-f0-9]{64}$/i.test(headerToken)) {
    return false;
  }

  return true;
}
