/**
 * Authentication Middleware and Login/Logout Logic
 *
 * Features:
 * - bcrypt password verification (cost >= 10)
 * - Session-based auth with cookies
 * - No default password (enforced)
 * - 5 failed logins → 5-minute lockout → 429 response
 */

import http from 'http';
import bcrypt from 'bcryptjs';
import {
  createSession,
  validateSession,
  invalidateSession,
  parseSessionCookie,
  buildSetCookieHeader,
  buildClearSessionHeader,
  generateCsrfToken,
  buildCsrfCookie,
  parseCsrfCookie,
  validateCsrfToken,
  type SessionCookie,
} from './session.js';
import {
  checkRateLimit,
  recordFailedLogin,
  resetRateLimit,
} from './rate-limit.js';
import { getDb } from '../hal/db.js';
import { getProvisioningManager } from '../first-boot.js';

export interface AuthResult {
  success: boolean;
  error?: string;
  statusCode: number;
  session?: SessionCookie;
  csrfToken?: string;
}

export interface AuthContext {
  session: ReturnType<typeof validateSession>;
  operatorId: string;
}

/**
 * Get the admin password hash from the provisioning state
 */
function getAdminPasswordHash(): string | null {
  try {
    const mgr = getProvisioningManager();
    // Durable state survives the wizard-session clear on completion; fall back
    // to the in-progress wizard session (provisioning not yet completed).
    const state = mgr.loadState();
    if (state?.adminPasswordHash) return state.adminPasswordHash;
    const session = mgr.loadWizardSession();
    return session?.adminPasswordHash || null;
  } catch {
    return null;
  }
}

/**
 * Verify admin password against stored hash
 */
export async function verifyPassword(password: string): Promise<boolean> {
  const hash = getAdminPasswordHash();
  if (!hash) {
    return false;
  }

  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

/**
 * Check if admin password is set (provisioning completed)
 */
export function isPasswordSet(): boolean {
  return getAdminPasswordHash() !== null;
}

/**
 * Login handler - verifies credentials and creates session
 */
export async function handleLogin(
  req: http.IncomingMessage,
  body: { username?: string; password?: string },
): Promise<AuthResult> {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  // Check rate limit
  const rateLimitResult = checkRateLimit(ipAddress);
  if (!rateLimitResult.allowed) {
    return {
      success: false,
      error: 'Too many failed login attempts. Please try again later.',
      statusCode: 429,
    };
  }

  // Validate input
  const { username, password } = body;
  if (!username || !password) {
    return {
      success: false,
      error: 'Username and password are required',
      statusCode: 400,
    };
  }

  // For FarmPal, admin user is always "admin"
  // (The wizard only creates one admin account)
  if (username !== 'admin') {
    recordFailedLogin(ipAddress);
    return {
      success: false,
      error: 'Invalid username or password',
      statusCode: 401,
    };
  }

  // Verify password
  const isValid = await verifyPassword(password);
  if (!isValid) {
    recordFailedLogin(ipAddress);
    return {
      success: false,
      error: 'Invalid username or password',
      statusCode: 401,
    };
  }

  // Reset rate limit on successful login
  resetRateLimit(ipAddress);

  // Create new session (regenerates token to prevent fixation)
  const { cookie, session } = await createSession(
    'admin',
    ipAddress,
    userAgent,
  );

  // Generate CSRF token
  const csrfToken = generateCsrfToken();

  return {
    success: true,
    statusCode: 200,
    session: cookie,
    csrfToken,
  };
}

/**
 * Logout handler - invalidates session and clears cookie
 */
export function handleLogout(token: string): { clearCookie: string } {
  invalidateSession(token);
  return { clearCookie: buildClearSessionHeader() };
}

/**
 * Auth middleware - checks for valid session
 * Returns auth context if valid, null if not authenticated
 */
export function authMiddleware(req: http.IncomingMessage): {
  authorized: boolean;
  authContext?: AuthContext;
  error?: string;
  statusCode?: number;
} {
  // Skip auth for certain paths
  const pathname = getPathname(req);
  const skipAuthPaths = [
    '/health',
    '/api/provisioning',
    '/api/auth/login',
    '/_sim',
  ];

  for (const skip of skipAuthPaths) {
    if (pathname.startsWith(skip)) {
      return { authorized: true };
    }
  }

  // Check for provisioning mode - redirect to wizard if no password set
  if (!isPasswordSet()) {
    return {
      authorized: false,
      error: 'System not provisioned',
      statusCode: 401,
    };
  }

  // Get session token from cookie
  const cookieHeader = req.headers.cookie;
  const token = parseSessionCookie(cookieHeader);

  if (!token) {
    return {
      authorized: false,
      error: 'Authentication required',
      statusCode: 401,
    };
  }

  // Validate session
  const session = validateSession(token);
  if (!session) {
    return {
      authorized: false,
      error: 'Session expired or invalid',
      statusCode: 401,
    };
  }

  return {
    authorized: true,
    authContext: {
      session,
      operatorId: session.operatorId,
    },
  };
}

/**
 * CSRF middleware - validates CSRF token on state-changing requests
 */
export function csrfMiddleware(req: http.IncomingMessage): {
  valid: boolean;
  error?: string;
  statusCode?: number;
} {
  const method = req.method?.toUpperCase() || 'GET';

  // Only validate CSRF on mutating methods
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return { valid: true };
  }

  // Get CSRF token from header
  const headerToken = req.headers['x-csrf-token'] as string | undefined;

  // Get CSRF token from cookie
  const cookieHeader = req.headers.cookie;
  const cookieToken = parseCsrfCookie(cookieHeader);

  if (!validateCsrfToken(headerToken, cookieToken)) {
    return {
      valid: false,
      error: 'Invalid or missing CSRF token',
      statusCode: 403,
    };
  }

  return { valid: true };
}

/**
 * Combined auth + CSRF middleware for protected routes
 */
export function requireAuth(req: http.IncomingMessage): {
  authorized: boolean;
  authContext?: AuthContext;
  csrfValid?: boolean;
  error?: string;
  statusCode?: number;
} {
  // First check authentication
  const authResult = authMiddleware(req);
  if (!authResult.authorized) {
    return {
      authorized: false,
      error: authResult.error,
      statusCode: authResult.statusCode,
    };
  }

  // Then check CSRF for mutating requests
  const csrfResult = csrfMiddleware(req);
  if (!csrfResult.valid) {
    return {
      authorized: true, // Auth is valid, but CSRF failed
      authContext: authResult.authContext,
      csrfValid: false,
      error: csrfResult.error,
      statusCode: csrfResult.statusCode,
    };
  }

  return {
    authorized: true,
    authContext: authResult.authContext,
    csrfValid: true,
  };
}

/**
 * Get client IP address from request
 */
function getClientIp(req: http.IncomingMessage): string {
  // Check for forwarded headers (reverse proxy)
  const forwarded = req.headers['x-forwarded-for'] as string | undefined;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'] as string | undefined;
  if (realIp) {
    return realIp;
  }

  // Fallback to socket address
  const socket = req.socket;
  return socket?.remoteAddress || 'unknown';
}

/**
 * Get pathname from request URL
 */
function getPathname(req: http.IncomingMessage): string {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    return url.pathname;
  } catch {
    return '/';
  }
}

/**
 * Check if the request is for a protected API endpoint
 */
export function isProtectedPath(pathname: string): boolean {
  // Public paths that don't require auth
  const publicPaths = [
    '/health',
    '/api/provisioning',
    '/api/auth/login',
    '/_sim',
  ];

  for (const path of publicPaths) {
    if (pathname.startsWith(path)) {
      return false;
    }
  }

  // API paths are protected
  if (pathname.startsWith('/api/')) {
    return true;
  }

  // HAL UI static files are protected
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/_sim/')) {
    return true;
  }

  return false;
}

/**
 * Build auth challenge response for unauthorized requests
 */
export function buildAuthChallenge(): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  return {
    statusCode: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'FarmPal',
    },
    body: JSON.stringify({
      error: 'Authentication required',
      loginUrl: '/login',
    }),
  };
}

/**
 * Build CSRF error response
 */
export function buildCsrfError(): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  return {
    statusCode: 403,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error:
        'Invalid or missing CSRF token. Include X-CSRF-Token header matching the farmpal_csrf cookie.',
    }),
  };
}
