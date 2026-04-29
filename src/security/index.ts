/**
 * Security Module - HTTPS, Authentication, CSRF, Rate Limiting, Security Headers
 *
 * Re-exports all security functionality for easy importing.
 */

// HTTPS and certificates
export {
  generateSelfSignedCert,
  getCertFingerprint,
  getCertInfo,
  validateUploadedCert,
  installUploadedCert,
  getCertPaths,
  hasCertificate,
  initHttps,
  type CertInfo,
} from './https.js';

// Session management
export {
  initSessionDatabase,
  generateSessionToken,
  createSession,
  validateSession,
  invalidateSession,
  invalidateAllSessions,
  cleanupExpiredSessions,
  getSessionInfo,
  buildSetCookieHeader,
  buildClearSessionHeader,
  parseSessionCookie,
  generateCsrfToken,
  buildCsrfCookie,
  parseCsrfCookie,
  validateCsrfToken,
  type Session,
  type SessionCookie,
} from './session.js';

// Authentication
export {
  verifyPassword,
  isPasswordSet,
  handleLogin,
  handleLogout,
  authMiddleware,
  csrfMiddleware,
  requireAuth,
  isProtectedPath,
  buildAuthChallenge,
  buildCsrfError,
  type AuthResult,
  type AuthContext,
} from './auth.js';

// Rate limiting
export {
  initRateLimitDatabase,
  recordFailedLogin,
  recordSuccessfulLogin,
  resetRateLimit,
  checkRateLimit,
  getRateLimitStatus,
  clearAllRateLimits,
  type RateLimitResult,
} from './rate-limit.js';

// Security headers
export {
  getSecurityHeaders,
  applySecurityHeaders,
  securityHeadersMiddleware,
  conditionalSecurityHeaders,
  handleCspViolationReport,
  type SecurityHeadersOptions,
} from './headers.js';
