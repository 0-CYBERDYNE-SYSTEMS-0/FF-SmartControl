/**
 * Security Audit Log
 *
 * Events logged:
 * - LOGIN_SUCCESS: Successful authentication
 * - LOGIN_FAILURE: Failed authentication attempt
 * - SESSION_CREATED: New session created
 * - SESSION_DESTROYED: Session invalidated
 * - CSRF_FAILURE: CSRF token validation failed
 * - RATE_LIMIT_HIT: Auth or API rate limit exceeded
 * - ADMIN_ACTION: Administrative action performed
 */

import { getSafetyDb } from '../hal/safety-db.js';

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'SESSION_CREATED'
  | 'SESSION_DESTROYED'
  | 'CSRF_FAILURE'
  | 'RATE_LIMIT_HIT'
  | 'ADMIN_ACTION'
  | 'ACCOUNT_LOCKOUT';

export interface SecurityAuditEntry {
  id: string;
  eventType: SecurityEventType;
  sessionId: string | null;
  operatorId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  endpoint: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Initialize security audit log database table
 */
export function initSecurityAuditDatabase(): void {
  const db = getSafetyDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS security_audit (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      session_id TEXT,
      operator_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      endpoint TEXT,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_security_audit_session
      ON security_audit(session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_security_audit_ip
      ON security_audit(ip_address, created_at);
    CREATE INDEX IF NOT EXISTS idx_security_audit_type
      ON security_audit(event_type, created_at);
  `);
}

/**
 * Log a security event
 */
export function logSecurityEvent(
  eventType: SecurityEventType,
  details: Record<string, unknown> = {},
  sessionId?: string | null,
  operatorId?: string | null,
  ipAddress?: string | null,
  userAgent?: string | null,
  endpoint?: string | null,
): SecurityAuditEntry {
  const db = getSafetyDb();
  const id = genId('sec');
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO security_audit (
      id, event_type, session_id, operator_id, ip_address, user_agent, endpoint, details, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    id,
    eventType,
    sessionId ?? null,
    operatorId ?? null,
    ipAddress ?? null,
    userAgent ?? null,
    endpoint ?? null,
    JSON.stringify(details),
    now,
  );

  return {
    id,
    eventType,
    sessionId: sessionId ?? null,
    operatorId: operatorId ?? null,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
    endpoint: endpoint ?? null,
    details,
    createdAt: now,
  };
}

/**
 * Log successful login
 */
export function logLoginSuccess(
  sessionId: string,
  operatorId: string,
  ipAddress: string,
  userAgent?: string,
): SecurityAuditEntry {
  return logSecurityEvent(
    'LOGIN_SUCCESS',
    {},
    sessionId,
    operatorId,
    ipAddress,
    userAgent,
  );
}

/**
 * Log failed login attempt
 */
export function logLoginFailure(
  ipAddress: string,
  userAgent: string | undefined,
  attemptedUsername: string,
  reason: string,
): SecurityAuditEntry {
  return logSecurityEvent(
    'LOGIN_FAILURE',
    { attemptedUsername, reason },
    null,
    null,
    ipAddress,
    userAgent,
  );
}

/**
 * Log account lockout
 */
export function logAccountLockout(
  ipAddress: string,
  attemptedUsername: string,
  retryAfterSeconds: number,
): SecurityAuditEntry {
  return logSecurityEvent(
    'ACCOUNT_LOCKOUT',
    { attemptedUsername, retryAfterSeconds },
    null,
    null,
    ipAddress,
  );
}

/**
 * Log session created
 */
export function logSessionCreated(
  sessionId: string,
  operatorId: string,
  ipAddress: string,
  userAgent?: string,
): SecurityAuditEntry {
  return logSecurityEvent(
    'SESSION_CREATED',
    {},
    sessionId,
    operatorId,
    ipAddress,
    userAgent,
  );
}

/**
 * Log session destroyed
 */
export function logSessionDestroyed(
  sessionId: string,
  operatorId: string,
  reason: string,
  ipAddress?: string,
): SecurityAuditEntry {
  return logSecurityEvent(
    'SESSION_DESTROYED',
    { reason },
    sessionId,
    operatorId,
    ipAddress ?? null,
  );
}

/**
 * Log CSRF failure
 */
export function logCsrfFailure(
  sessionId: string | null,
  ipAddress: string,
  userAgent: string | undefined,
  endpoint: string,
): SecurityAuditEntry {
  return logSecurityEvent(
    'CSRF_FAILURE',
    {},
    sessionId,
    null,
    ipAddress,
    userAgent,
    endpoint,
  );
}

/**
 * Log rate limit hit
 */
export function logRateLimitHit(
  limitType: 'auth' | 'api',
  ipAddress: string | null,
  sessionId: string | null,
  endpoint: string,
  threshold: number,
): SecurityAuditEntry {
  return logSecurityEvent(
    'RATE_LIMIT_HIT',
    { limitType, threshold, endpoint },
    sessionId,
    null,
    ipAddress,
    null,
    endpoint,
  );
}

/**
 * Log admin action
 */
export function logAdminAction(
  sessionId: string,
  operatorId: string,
  actionType: string,
  details: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string,
): SecurityAuditEntry {
  return logSecurityEvent(
    'ADMIN_ACTION',
    { actionType, ...details },
    sessionId,
    operatorId,
    ipAddress ?? null,
    userAgent ?? null,
  );
}

/**
 * Get recent security audit entries
 */
export function getRecentSecurityAuditEntries(
  limit = 100,
): SecurityAuditEntry[] {
  const db = getSafetyDb();
  const rows = db
    .prepare(
      `
    SELECT * FROM security_audit ORDER BY created_at DESC LIMIT ?
  `,
    )
    .all(limit) as Array<Record<string, unknown>>;

  return rows.map(parseSecurityAuditRow);
}

/**
 * Get security audit entries by type
 */
export function getSecurityAuditEntriesByType(
  eventType: SecurityEventType,
  limit = 100,
): SecurityAuditEntry[] {
  const db = getSafetyDb();
  const rows = db
    .prepare(
      `
    SELECT * FROM security_audit
    WHERE event_type = ?
    ORDER BY created_at DESC
    LIMIT ?
  `,
    )
    .all(eventType, limit) as Array<Record<string, unknown>>;

  return rows.map(parseSecurityAuditRow);
}

/**
 * Get security audit entries by IP address
 */
export function getSecurityAuditEntriesByIp(
  ipAddress: string,
  limit = 100,
): SecurityAuditEntry[] {
  const db = getSafetyDb();
  const rows = db
    .prepare(
      `
    SELECT * FROM security_audit
    WHERE ip_address = ?
    ORDER BY created_at DESC
    LIMIT ?
  `,
    )
    .all(ipAddress, limit) as Array<Record<string, unknown>>;

  return rows.map(parseSecurityAuditRow);
}

/**
 * Get security audit entries by session
 */
export function getSecurityAuditEntriesBySession(
  sessionId: string,
  limit = 100,
): SecurityAuditEntry[] {
  const db = getSafetyDb();
  const rows = db
    .prepare(
      `
    SELECT * FROM security_audit
    WHERE session_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `,
    )
    .all(sessionId, limit) as Array<Record<string, unknown>>;

  return rows.map(parseSecurityAuditRow);
}

function parseSecurityAuditRow(
  row: Record<string, unknown>,
): SecurityAuditEntry {
  return {
    id: row.id as string,
    eventType: row.event_type as SecurityEventType,
    sessionId: row.session_id as string | null,
    operatorId: row.operator_id as string | null,
    ipAddress: row.ip_address as string | null,
    userAgent: row.user_agent as string | null,
    endpoint: row.endpoint as string | null,
    details: JSON.parse(row.details as string),
    createdAt: row.created_at as string,
  };
}

/**
 * Export security audit log as JSON
 */
export function exportSecurityAuditLog(
  options: {
    since?: string;
    until?: string;
    eventType?: SecurityEventType;
    ipAddress?: string;
    sessionId?: string;
  } = {},
): string {
  const entries = getFilteredSecurityAuditEntries(options);
  return JSON.stringify(entries, null, 2);
}

function getFilteredSecurityAuditEntries(options: {
  since?: string;
  until?: string;
  eventType?: SecurityEventType;
  ipAddress?: string;
  sessionId?: string;
}): SecurityAuditEntry[] {
  const db = getSafetyDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.since) {
    conditions.push('created_at >= ?');
    params.push(options.since);
  }
  if (options.until) {
    conditions.push('created_at <= ?');
    params.push(options.until);
  }
  if (options.eventType) {
    conditions.push('event_type = ?');
    params.push(options.eventType);
  }
  if (options.ipAddress) {
    conditions.push('ip_address = ?');
    params.push(options.ipAddress);
  }
  if (options.sessionId) {
    conditions.push('session_id = ?');
    params.push(options.sessionId);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db
    .prepare(
      `
    SELECT * FROM security_audit ${where} ORDER BY created_at DESC LIMIT 10000
  `,
    )
    .all(...params) as Array<Record<string, unknown>>;

  return rows.map(parseSecurityAuditRow);
}
