/**
 * Security Headers Middleware
 *
 * Adds the following headers to all responses:
 * - Strict-Transport-Security (HSTS)
 * - X-Frame-Options: DENY
 * - Content-Security-Policy
 * - Referrer-Policy
 * - X-Content-Type-Options: nosniff
 * - X-XSS-Protection
 */

import http from 'http';

export interface SecurityHeadersOptions {
  /** Enable HSTS (only used when HTTPS is active) */
  hsts?: boolean;
  /** HSTS max-age in seconds (default: 1 year) */
  hstsMaxAge?: number;
  /** Include subdomains in HSTS (default: true) */
  hstsIncludeSubDomains?: boolean;
  /** Content-Security-Policy (default: restrictive default) */
  csp?: string;
  /** Referrer-Policy (default: strict-origin-when-cross-origin) */
  referrerPolicy?: string;
}

const DEFAULT_HSTS_MAX_AGE = 31536000; // 1 year in seconds
const DEFAULT_REFERRER_POLICY = 'strict-origin-when-cross-origin';

const DEFAULT_CSP = [
  "default-src 'self'",
  // Allow inline styles for HAL UI (inline CSS in views)
  "style-src 'self' 'unsafe-inline'",
  // Scripts only from same origin
  "script-src 'self'",
  // Images from same origin and data URIs for SVG icons
  "img-src 'self' data:",
  // Fonts from same origin
  "font-src 'self'",
  // Connect only to same origin (no external API calls)
  "connect-src 'self'",
  // Frames not allowed
  "frame-ancestors 'none'",
  // Base-URI restricted
  "base-uri 'self'",
  // Form action to same origin
  "form-action 'self'",
  // Block object/embed/applet
  "object-src 'none'",
  // Upgrade insecure requests in production
  process.env.NODE_ENV === 'production' ? 'upgrade-insecure-requests' : '',
]
  .filter(Boolean)
  .join('; ');

/**
 * Get the default security headers
 */
export function getSecurityHeaders(
  options: SecurityHeadersOptions = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    // XSS protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',
    // Clickjacking protection
    'X-Frame-Options': 'DENY',
    // Content Security Policy
    'Content-Security-Policy': options.csp || DEFAULT_CSP,
    // Referrer Policy
    'Referrer-Policy': options.referrerPolicy || DEFAULT_REFERRER_POLICY,
    // Permissions Policy (disable unnecessary browser features)
    'Permissions-Policy':
      'geolocation=(), microphone=(), camera=(), payment=()',
  };

  // HSTS header (only when HTTPS is enabled)
  if (options.hsts !== false) {
    const hstsValue = [
      `max-age=${options.hstsMaxAge || DEFAULT_HSTS_MAX_AGE}`,
      options.hstsIncludeSubDomains !== false ? 'includeSubDomains' : '',
      // Use preload flag for added security
      'preload',
    ]
      .filter(Boolean)
      .join('; ');

    headers['Strict-Transport-Security'] = hstsValue;
  }

  return headers;
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(
  res: http.ServerResponse,
  options?: SecurityHeadersOptions,
): void {
  const headers = getSecurityHeaders(options);

  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
}

/**
 * Create security headers middleware for Express-like use
 */
export function securityHeadersMiddleware(
  options?: SecurityHeadersOptions,
): (req: http.IncomingMessage, res: http.ServerResponse) => void {
  return (req: http.IncomingMessage, res: http.ServerResponse) => {
    applySecurityHeaders(res, options);
  };
}

/**
 * Add security headers to specific paths only
 */
export function conditionalSecurityHeaders(
  paths: string[],
  options?: SecurityHeadersOptions,
): (req: http.IncomingMessage, res: http.ServerResponse) => void {
  return (req: http.IncomingMessage, res: http.ServerResponse) => {
    const pathname = getPathname(req);

    for (const path of paths) {
      if (pathname.startsWith(path)) {
        applySecurityHeaders(res, options);
        return;
      }
    }
  };
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
 * CSP violation reporting endpoint handler
 */
export function handleCspViolationReport(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): void {
  // Log the violation (could be sent to a SIEM in production)
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    console.warn('[security] CSP violation:', body);
    res.writeHead(204).end();
  });
}
