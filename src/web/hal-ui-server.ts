import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getDb } from '../hal/db.js';
import { halRegistry } from '../hal/registry.js';
import { halSensors } from '../hal/sensors.js';
import { halDecisions } from '../hal/decisions.js';
import { halRelays } from '../hal/relays.js';
import { mqttSubscriber } from '../hal/mqtt.js';
import type { MetricType } from '../hal/types.js';
import { logger } from '../logger.js';
import { getSimulator } from '../hal/simulator.js';
import {
  generateSelfSignedCert,
  getCertFingerprint,
  getCertInfo,
  getCertPaths,
  hasCertificate,
  handleLogin,
  handleLogout,
  authMiddleware,
  csrfMiddleware,
  parseSessionCookie,
  validateSession,
  buildSetCookieHeader,
  buildClearSessionHeader,
  buildCsrfCookie,
  generateCsrfToken,
  isPasswordSet,
  checkRateLimit,
  getSecurityHeaders,
  initApiRateLimitDatabase,
  checkApiRateLimit,
  recordApiRequest,
  initSecurityAuditDatabase,
  logLoginSuccess,
  logLoginFailure,
  logCsrfFailure,
  logRateLimitHit,
  logAdminAction,
} from '../security/index.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.md': 'text/markdown; charset=utf-8',
};

export interface HalUiServer {
  host: string;
  port: number;
  close: () => Promise<void>;
}

function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

const HAL_SENSOR_METRICS: MetricType[] = [
  'temperature',
  'humidity',
  'co2',
  'light',
  'soil_moisture',
  'water_level',
  'ph',
  'weight',
];

function buildHalStateSnapshot(): {
  devices: ReturnType<typeof halRegistry.list>;
  sensorSnapshots: Record<string, Record<string, unknown>>;
  recentDecisions: ReturnType<typeof halDecisions.recent>;
} {
  const devices = halRegistry.list();
  const sensorSnapshots: Record<string, Record<string, unknown>> = {};

  for (const dev of devices.filter((d: any) => d.type === 'sensor')) {
    sensorSnapshots[dev.id] = {};
    const calibrationOffset = dev.calibration_offset ?? 0;
    for (const metric of HAL_SENSOR_METRICS) {
      const reading = halSensors.latest(dev.id, metric) as
        | { value: number; unit?: string }
        | undefined;
      if (reading) {
        // Apply calibration: calibrated_value = raw + offset (VAL-DISC-060)
        sensorSnapshots[dev.id][metric] = {
          ...reading,
          value: reading.value + calibrationOffset,
        };
      }
    }
  }

  return {
    devices,
    sensorSnapshots,
    recentDecisions: halDecisions.recent(10),
  };
}

function sendHalStateStream(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): void {
  const intervalMs = Math.max(
    1000,
    parseInt(process.env.HAL_UI_STREAM_INTERVAL_MS || '2000', 10),
  );

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  const writeSnapshot = () => {
    try {
      res.write(
        `event: state\ndata: ${JSON.stringify({
          emittedAt: new Date().toISOString(),
          state: buildHalStateSnapshot(),
        })}\n\n`,
      );
    } catch {
      clearInterval(timer);
    }
  };

  const timer = setInterval(writeSnapshot, intervalMs);
  timer.unref?.();
  writeSnapshot();

  req.on('close', () => {
    clearInterval(timer);
    res.end();
  });
}

/**
 * Apply security headers to all responses (VAL-SEC-015)
 */
function applySecurityHeaders(res: http.ServerResponse): void {
  const headers = getSecurityHeaders({
    hsts: !!process.env.HAL_UI_HTTPS_ENABLED,
  });
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
}

/**
 * Check if request is for a protected route
 */
function isProtectedRoute(requestPath: string): boolean {
  // Public paths that don't require authentication
  const publicPaths = [
    '/health',
    '/api/provisioning',
    '/api/auth/login',
    '/_sim',
    '/login',
  ];

  for (const p of publicPaths) {
    if (requestPath.startsWith(p)) {
      return false;
    }
  }

  // Development bypass: skip auth when HAL_UI_AUTH_BYPASS=1 env var is set
  if (process.env.HAL_UI_AUTH_BYPASS === '1') {
    return false;
  }

  // API paths are protected
  if (requestPath.startsWith('/api/')) {
    return true;
  }

  // Static files - the index.html will handle auth redirect
  return false;
}

/**
 * Send authentication error response
 */
function sendAuthError(
  res: http.ServerResponse,
  statusCode: number,
  error: string,
  loginUrl?: string,
): void {
  const body = JSON.stringify({
    error,
    ...(loginUrl ? { loginUrl } : {}),
  });
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * Send CSRF error response
 */
function sendCsrfError(res: http.ServerResponse): void {
  const body = JSON.stringify({
    error:
      'Invalid or missing CSRF token. Include X-CSRF-Token header matching the farmpal_csrf cookie.',
  });
  res.writeHead(403, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

// Apply calibration offset to a sensor reading (VAL-DISC-060)
// calibrated_value = raw + offset
function applyCalibration(
  reading: { value: number; unit?: string } | undefined,
  calibrationOffset: number | null,
): { value: number; unit?: string } | undefined {
  if (!reading) return undefined;
  const offset = calibrationOffset ?? 0;
  return { value: reading.value + offset, unit: reading.unit };
}

function sendFile(
  res: http.ServerResponse,
  filePath: string,
  isHtml = false,
  contentTypeOverride?: string,
): void {
  try {
    const body = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      contentTypeOverride || MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=300',
      'Content-Length': body.byteLength,
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

export async function startHalUiServer(
  port = 3392,
  host = '127.0.0.1',
): Promise<HalUiServer> {
  // Allow overriding bind host via env for Tailscale/mobile access
  const bindHost = process.env.HAL_UI_BIND_HOST || host;
  const staticDir = path.resolve(process.cwd(), 'src', 'web', 'hal-ui');

  // Initialize rate limiting and security audit databases
  initApiRateLimitDatabase();
  initSecurityAuditDatabase();

  // Initialize license cache (VAL-LIC-003)
  const { initLicense } = await import('../license/index.js');
  initLicense();

  // Check for interrupted update and recover if needed (VAL-UPDT-009)
  const { checkForInterruptedUpdate } = await import('../update/installer.js');
  // Dummy progress callback for recovery
  const recoveryProgress: Parameters<
    typeof checkForInterruptedUpdate
  >[0] = () => {};
  const recoveryResult = await checkForInterruptedUpdate(recoveryProgress);
  if (recoveryResult.recovered) {
    logger.warn('Recovered from interrupted update via automatic rollback');
  }

  // Start periodic update checker (VAL-UPDT-001)
  const { startUpdateChecker } = await import('../update/checker.js');
  startUpdateChecker();

  // Check if HTTPS is enabled
  const httpsEnabled = process.env.HAL_UI_HTTPS_ENABLED === 'true';
  let server: http.Server | https.Server;

  if (httpsEnabled) {
    // Generate or load certificate
    generateSelfSignedCert();
    const { cert, key } = getCertPaths();
    if (!fs.existsSync(cert) || !fs.existsSync(key)) {
      throw new Error('HTTPS enabled but certificate files not found');
    }
    const httpsOptions: https.ServerOptions = {
      cert: fs.readFileSync(cert),
      key: fs.readFileSync(key),
    };
    server = https.createServer(httpsOptions);
    logger.info(
      { port, bindHost, https: true },
      'HAL UI server listening on https://{bindHost}:{port}',
    );
  } else {
    server = http.createServer();
    logger.info(
      { port, bindHost, https: false },
      'HAL UI server listening on http://{bindHost}:{port}',
    );
  }

  server.on('request', async (req, res) => {
    // Apply security headers to all responses (VAL-SEC-015)
    applySecurityHeaders(res);

    const method = (req.method || 'GET').toUpperCase();
    const url = httpsEnabled
      ? new URL(req.url || '/', `https://${host}`)
      : new URL(req.url || '/', `http://${host}`);
    const requestPath = decodeURIComponent(url.pathname || '/');

    // HTTP → HTTPS redirect if HTTPS is enabled (VAL-SEC-010)
    if (
      httpsEnabled &&
      method === 'GET' &&
      (req.socket as any).encrypted !== true
    ) {
      const redirectUrl = `https://${host}${requestPath}${url.search}`;
      res.writeHead(301, { Location: redirectUrl });
      res.end();
      return;
    }

    // Auth check for protected routes
    if (isProtectedRoute(requestPath)) {
      const authResult = authMiddleware(req);
      if (!authResult.authorized) {
        sendAuthError(
          res,
          authResult.statusCode || 401,
          authResult.error || 'Authentication required',
          '/login',
        );
        return;
      }
      // Check CSRF for mutating requests
      if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        const csrfResult = csrfMiddleware(req);
        if (!csrfResult.valid) {
          // Log CSRF failure to security audit (VAL-SEC-073)
          const ipAddress =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            (req.headers['x-real-ip'] as string) ||
            req.socket.remoteAddress ||
            'unknown';
          logCsrfFailure(
            authResult.authContext?.session?.id ?? null,
            ipAddress,
            req.headers['user-agent'],
            requestPath,
          );
          sendCsrfError(res);
          return;
        }
      }

      // API rate limiting: 100 requests/minute per session (VAL-SEC-061)
      if (
        authResult.authContext?.session?.id &&
        requestPath.startsWith('/api/')
      ) {
        const rateLimitResult = checkApiRateLimit(
          authResult.authContext.session.id,
        );
        if (!rateLimitResult.allowed) {
          // Log rate limit hit to security audit (VAL-SEC-074)
          const ipAddress =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            (req.headers['x-real-ip'] as string) ||
            req.socket.remoteAddress ||
            'unknown';
          logRateLimitHit(
            'api',
            ipAddress,
            authResult.authContext.session.id,
            requestPath,
            100,
          );
          res.writeHead(429, {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfterSeconds || 60),
          });
          res.end(
            JSON.stringify({
              error: 'Too many requests. Please try again later.',
              retryAfterSeconds: rateLimitResult.retryAfterSeconds || 60,
            }),
          );
          return;
        }
        // Record the request
        recordApiRequest(authResult.authContext.session.id, requestPath);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AUTH API — Login, Logout, Session check
    // ═══════════════════════════════════════════════════════════════════════

    // POST /api/auth/login — authenticate and create session (VAL-SEC-001, VAL-SEC-002, VAL-SEC-004, VAL-SEC-010)
    if (requestPath === '/api/auth/login' && method === 'POST') {
      const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        req.socket.remoteAddress ||
        'unknown';
      const userAgent = req.headers['user-agent'];

      let body = '';
      for await (const chunk of req) body += chunk;
      const parsed = body ? JSON.parse(body) : {};
      const result = await handleLogin(req, parsed);
      if (!result.success) {
        // Log login failure to security audit (VAL-SEC-071)
        logLoginFailure(
          ipAddress,
          userAgent,
          parsed.username || 'unknown',
          result.error || 'Authentication failed',
        );
        res.writeHead(result.statusCode, {
          'Content-Type': 'application/json',
          ...(result.statusCode === 429 ? { 'Retry-After': '300' } : {}),
        });
        res.end(JSON.stringify({ error: result.error }));
        return;
      }
      if (result.session) {
        // Log login success to security audit (VAL-SEC-070)
        logLoginSuccess(
          result.session.value, // session token is the cookie value
          'admin', // operator ID
          ipAddress,
          userAgent,
        );
        const cookieHeader = buildSetCookieHeader(result.session);
        const csrfCookie = buildCsrfCookie(result.csrfToken!);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': [cookieHeader, csrfCookie],
        });
        res.end(JSON.stringify({ ok: true, csrfToken: result.csrfToken }));
      } else {
        res.writeHead(result.statusCode, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: result.error }));
      }
      return;
    }

    // POST /api/auth/logout — invalidate session (VAL-SEC-004)
    if (requestPath === '/api/auth/logout' && method === 'POST') {
      const token = parseSessionCookie(req.headers.cookie);
      const result = handleLogout(token || '');
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': result.clearCookie,
      });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // GET /api/auth/session — check if session is valid
    if (requestPath === '/api/auth/session' && method === 'GET') {
      const token = parseSessionCookie(req.headers.cookie);
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ authenticated: false }));
        return;
      }
      const { validateSession } = await import('../security/session.js');
      const session = validateSession(token);
      if (!session) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ authenticated: false }));
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': buildCsrfCookie(generateCsrfToken()),
      });
      res.end(
        JSON.stringify({
          authenticated: true,
          operatorId: session.operatorId,
          expiresAt: session.expiresAt,
        }),
      );
      return;
    }

    // GET /api/auth/rate-limit — check rate limit status
    if (requestPath === '/api/auth/rate-limit' && method === 'GET') {
      const ip = req.socket.remoteAddress || 'unknown';
      const status = checkRateLimit(ip);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          attemptsRemaining: status.remainingAttempts,
          locked: !status.allowed,
          ...(status.retryAfterSeconds
            ? { retryAfterSeconds: status.retryAfterSeconds }
            : {}),
        }),
      );
      return;
    }

    // GET /api/auth/cert — get certificate fingerprint for manual verification (VAL-SEC-013)
    if (requestPath === '/api/auth/cert' && method === 'GET') {
      const fingerprint = getCertFingerprint();
      const certInfo = getCertInfo();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          fingerprint,
          subject: certInfo?.subject,
          issuer: certInfo?.issuer,
          validFrom: certInfo?.validFrom,
          validTo: certInfo?.validTo,
        }),
      );
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UPDATE API — Version checking, updates, rollback (VAL-UPDT-001 through VAL-UPDT-012)
    // ═══════════════════════════════════════════════════════════════════════

    // GET /api/update/status — get current update status (VAL-UPDT-001, VAL-OFFL-002)
    if (requestPath === '/api/update/status' && method === 'GET') {
      try {
        const { checkForUpdate, isOnline } =
          await import('../update/checker.js');
        const { getInstalledVersion, hasSnapshot } =
          await import('../update/installer.js');

        const currentVersion = getInstalledVersion();
        const online = await isOnline();

        if (!online) {
          sendJson(res, 200, {
            status: 'offline',
            currentVersion,
            lastChecked: null,
            errorMessage: 'Offline — updates available when connected',
          });
          return;
        }

        const updateState = await checkForUpdate(currentVersion);
        sendJson(res, 200, {
          ...updateState,
          canRollback: hasSnapshot(),
        });
        return;
      } catch (err) {
        logger.error({ err }, 'Failed to get update status');
        sendJson(res, 500, { error: 'Failed to check for updates' });
        return;
      }
    }

    // POST /api/update/check — manually trigger update check (VAL-UPDT-012)
    if (requestPath === '/api/update/check' && method === 'POST') {
      try {
        const { checkForUpdate, isOnline } =
          await import('../update/checker.js');
        const { getInstalledVersion, hasSnapshot } =
          await import('../update/installer.js');

        const currentVersion = getInstalledVersion();
        const online = await isOnline();

        if (!online) {
          sendJson(res, 200, {
            status: 'offline',
            currentVersion,
            lastChecked: new Date().toISOString(),
            errorMessage: 'Offline — updates available when connected',
          });
          return;
        }

        const updateState = await checkForUpdate(currentVersion);
        sendJson(res, 200, {
          ...updateState,
          canRollback: hasSnapshot(),
        });
        return;
      } catch (err) {
        logger.error({ err }, 'Failed to check for updates');
        sendJson(res, 500, { error: 'Failed to check for updates' });
        return;
      }
    }

    // GET /api/update/history — get update history (VAL-VERS-003)
    if (requestPath === '/api/update/history' && method === 'GET') {
      try {
        const { getUpdateHistory } = await import('../update/installer.js');
        const history = getUpdateHistory(20);
        sendJson(res, 200, { history });
        return;
      } catch (err) {
        logger.error({ err }, 'Failed to get update history');
        sendJson(res, 500, { error: 'Failed to get update history' });
        return;
      }
    }

    // POST /api/update/install — trigger update installation (VAL-UPDT-004, VAL-UPDT-005, VAL-UPDT-006, VAL-UPDT-007, VAL-UPDT-008)
    if (requestPath === '/api/update/install' && method === 'POST') {
      try {
        const { checkForUpdate } = await import('../update/checker.js');
        const { getInstalledVersion, installUpdate } =
          await import('../update/installer.js');

        const currentVersion = getInstalledVersion();
        const updateState = await checkForUpdate(currentVersion);

        if (
          updateState.status !== 'available' &&
          updateState.status !== 'prerelease'
        ) {
          sendJson(res, 400, { error: 'No update available' });
          return;
        }

        // The release info should be included in the request or fetched again
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const release = parsed.release;

        if (!release || !release.version) {
          sendJson(res, 400, { error: 'Missing release information' });
          return;
        }

        // Install with progress tracking
        const progress = await installUpdate(release, (p) => {
          // Progress callback - could emit via SSE in future
          logger.info({ step: p.step, percent: p.percent }, 'Update progress');
        });

        if (progress.success) {
          sendJson(res, 200, {
            success: true,
            newVersion: release.version,
          });
        } else {
          sendJson(res, 500, {
            success: false,
            error: progress.error,
          });
        }
        return;
      } catch (err) {
        logger.error({ err }, 'Failed to install update');
        sendJson(res, 500, { error: 'Failed to install update' });
        return;
      }
    }

    // POST /api/update/rollback — trigger manual rollback (VAL-UPDT-011, VAL-RBK-003)
    if (requestPath === '/api/update/rollback' && method === 'POST') {
      try {
        const { hasSnapshot, performRollback, getInstalledVersion } =
          await import('../update/installer.js');

        if (!hasSnapshot()) {
          sendJson(res, 400, {
            error: 'No previous version available to rollback to',
          });
          return;
        }

        const currentVersion = getInstalledVersion();

        const result = await performRollback((p) => {
          logger.info(
            { step: p.step, percent: p.percent },
            'Rollback progress',
          );
        });

        if (result.success) {
          sendJson(res, 200, { success: true });
        } else {
          sendJson(res, 500, { success: false, error: result.error });
        }
        return;
      } catch (err) {
        logger.error({ err }, 'Failed to rollback');
        sendJson(res, 500, { error: 'Failed to rollback' });
        return;
      }
    }

    // GET /health — returns health status without requiring auth (VAL-SVC-008, VAL-SVC-009, VAL-SVC-010)
    if (method === 'GET' && requestPath === '/health') {
      const uptime_seconds = Math.floor(process.uptime());

      // Check DB connectivity
      let db = false;
      try {
        const database = getDb();
        database.prepare('SELECT 1').get();
        db = true;
      } catch {
        db = false;
      }

      // Check HAL registry accessibility
      let hal = false;
      try {
        halRegistry.list();
        hal = true;
      } catch {
        hal = false;
      }

      // Check MQTT connectivity
      let mqtt = false;
      try {
        // mqttSubscriber.client is the mqtt MqttClient instance
        mqtt = (mqttSubscriber as any).client?.connected === true;
      } catch {
        mqtt = false;
      }

      const ok = db && hal && mqtt;
      const statusCode = ok ? 200 : 503;
      sendJson(res, statusCode, { ok, hal, db, mqtt, uptime_seconds });
      return;
    }

    // HAL API routes
    if (requestPath.startsWith('/api/hal/')) {
      const apiPath = requestPath.slice('/api/hal'.length);

      if (apiPath === '/state' && method === 'GET') {
        sendJson(res, 200, buildHalStateSnapshot());
        return;
      }

      if (apiPath === '/stream' && method === 'GET') {
        sendHalStateStream(req, res);
        return;
      }

      if (apiPath === '/devices' && method === 'GET') {
        // Get all devices and merge in safe states (VAL-DISC-070, VAL-DISC-071)
        const devices = halRegistry.list();
        const { getAllDeviceSafeStates } = await import('../safety/estop.js');
        const safeStates = getAllDeviceSafeStates();
        const safeStateMap = new Map(safeStates.map((ss) => [ss.deviceId, ss]));
        const devicesWithSafeStates = devices.map((device) => ({
          ...device,
          safe_state: safeStateMap.get(device.id)?.safeState ?? 'off',
        }));
        sendJson(res, 200, devicesWithSafeStates);
        return;
      }

      if (apiPath.match(/^\/devices\/([^/]+)\/control$/) && method === 'POST') {
        const deviceId = apiPath.split('/')[2];
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const action = parsed.action;
        if (action !== 'on' && action !== 'off') {
          sendJson(res, 400, { error: 'action must be "on" or "off"' });
          return;
        }
        try {
          // VAL-AUTO-031: Manual override bypasses pending autonomous queue
          // VAL-AUTO-033: Manual override wins over conflicting autonomous decision
          // Find and mark any pending autonomous decisions for this device as overridden
          const { skipPendingDecisionForDevice } =
            await import('../automation/modes.js');
          const overriddenIds = skipPendingDecisionForDevice(
            deviceId,
            action as 'on' | 'off',
          );

          // VAL-AUTO-032: Log manual override to safety audit with triggered_by: 'manual_ui'
          // Capture sensor snapshot for audit entry
          const { captureSensorSnapshot } =
            await import('../safety/verifier.js');
          const { createAuditEntry } = await import('../safety/audit-log.js');
          const sensorSnapshot = captureSensorSnapshot();
          // Map UI action ('on'/'off') to proposedAction format ('turn_on'/'turn_off')
          const proposedAction = action === 'on' ? 'turn_on' : 'turn_off';
          createAuditEntry({
            deviceId,
            proposedAction: proposedAction as 'turn_on' | 'turn_off',
            verifierResult: 'APPROVED',
            deniedReason: null,
            conflictingRuleIds: null,
            sensorSnapshot,
            decisionId: null, // Manual action, not from decision loop
            triggeredBy: 'manual_ui', // VAL-AUTO-032
            executed: true,
            executedState: action as 'on' | 'off',
            interrupted: false,
            interruptedAtStep: null,
            revertedSteps: null,
          });

          // In simulator mode, delegate to simulator instead of real hardware
          const sim = getSimulator();
          if (sim) {
            sim.setDeviceState(deviceId, action);
            halRelays.log({
              device_id: deviceId,
              state: action,
              reason: 'manual',
              triggered_by: 'manual_ui', // VAL-DISC-073: manual toggle logged correctly
            });
          } else {
            await halRegistry.control(deviceId, action);
            halRelays.log({
              device_id: deviceId,
              state: action,
              reason: 'manual',
              triggered_by: 'manual_ui', // VAL-DISC-073: manual toggle logged correctly
            });
          }
          sendJson(res, 200, {
            ok: true,
            overriddenDecisions:
              overriddenIds.length > 0 ? overriddenIds : undefined,
          });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/hal/sensors/latest — latest readings for all sensors and all metrics (VAL-DISC-060)
      if (apiPath === '/sensors/latest' && method === 'GET') {
        const devices = halRegistry
          .list()
          .filter((d: any) => d.type === 'sensor');
        const readings = [];
        for (const dev of devices) {
          const calibrationOffset = dev.calibration_offset ?? 0;
          const snapshot: Record<string, { value: number; unit?: string }> = {};
          let hasAny = false;
          for (const metric of HAL_SENSOR_METRICS) {
            const reading = halSensors.latest(dev.id, metric);
            if (reading) {
              snapshot[metric] = {
                ...reading,
                value: reading.value + calibrationOffset,
              };
              hasAny = true;
            }
          }
          if (hasAny) {
            readings.push({ device: dev, ...snapshot });
          }
        }
        sendJson(res, 200, readings);
        return;
      }

      if (apiPath.startsWith('/sensors/history') && method === 'GET') {
        const deviceId = url.searchParams.get('device');
        const metric = url.searchParams.get('metric');
        const from =
          url.searchParams.get('from') ||
          new Date(Date.now() - 86400000).toISOString();
        const to = url.searchParams.get('to') || new Date().toISOString();
        if (!deviceId || !metric) {
          sendJson(res, 400, { error: 'device and metric are required' });
          return;
        }
        // Get device calibration offset (VAL-DISC-060)
        const device = halRegistry.get(deviceId);
        const calibrationOffset = device?.calibration_offset ?? 0;
        const rawHistory = halSensors.history(
          deviceId,
          metric as MetricType,
          from,
          to,
        );
        // Apply calibration: calibrated_value = raw + offset
        const calibratedHistory = rawHistory.map((reading) => ({
          ...reading,
          value: reading.value + calibrationOffset,
        }));
        sendJson(res, 200, calibratedHistory);
        return;
      }

      if (apiPath.startsWith('/decisions') && method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '20');
        sendJson(res, 200, halDecisions.recent(limit));
        return;
      }

      if (
        apiPath.match(/^\/decisions\/([^/]+)\/complete$/) &&
        method === 'POST'
      ) {
        const decisionId = apiPath.split('/')[2];
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        try {
          halDecisions.complete(decisionId, parsed.outcome);
          sendJson(res, 200, { ok: true });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      if (apiPath === '/cameras' && method === 'GET') {
        sendJson(
          res,
          200,
          halRegistry.list().filter((d: any) => d.type === 'camera'),
        );
        return;
      }

      if (apiPath.match(/^\/cameras\/([^/]+)\/capture$/) && method === 'POST') {
        const deviceId = apiPath.split('/')[2];
        const dev = halRegistry.get(deviceId);
        if (!dev || dev.type !== 'camera') {
          sendJson(res, 404, { error: 'Camera not found' });
          return;
        }
        // Mock capture for demo — return a placeholder response
        sendJson(res, 200, {
          ok: true,
          path: `/tmp/hal_cam_${deviceId}_${Date.now()}.jpg`,
          size_bytes: 0,
          note: 'Demo mode — no real camera',
        });
        return;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // E-STOP API — Emergency stop control and status
      // ═══════════════════════════════════════════════════════════════════════

      // GET /api/hal/estop/status — get current E-Stop state
      if (apiPath === '/estop/status' && method === 'GET') {
        const { getEstopState, isEstopActive } =
          await import('../safety/estop.js');
        const state = getEstopState();
        const { getWatchdogStatus } = await import('../safety/estop.js');
        const { getFarmLoopState } = await import('../safety/estop.js');
        sendJson(res, 200, {
          estop: {
            active: state.active,
            activatedAt: state.activatedAt,
            activatedBy: state.activatedBy,
            clearedAt: state.clearedAt,
            clearedBy: state.clearedBy,
            reason: state.reason,
          },
          farmLoop: getFarmLoopState(),
          watchdog: getWatchdogStatus(),
        });
        return;
      }

      // POST /api/hal/estop — activate emergency stop
      if (apiPath === '/estop' && method === 'POST') {
        const { activateEstop } = await import('../safety/estop.js');
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const reason = parsed.reason || 'operator';
        const reasonText = parsed.reasonText;

        const result = await activateEstop(
          reason as any,
          'operator',
          reasonText,
        );
        sendJson(res, 200, result);
        return;
      }

      // POST /api/hal/estop/clear — clear emergency stop (requires auth)
      if (apiPath === '/estop/clear' && method === 'POST') {
        const { clearEstop } = await import('../safety/estop.js');
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};

        // Check for admin auth
        const operatorId = parsed.operatorId || parsed.operator_id;
        if (!operatorId) {
          sendJson(res, 401, {
            error: 'Authentication required to clear E-Stop',
          });
          return;
        }

        const result = clearEstop(operatorId);
        if (!result.success) {
          sendJson(res, 400, { error: result.error });
          return;
        }
        sendJson(res, 200, { ok: true });
        return;
      }

      // GET /api/hal/estop/safe-states — get all device safe states
      if (apiPath === '/estop/safe-states' && method === 'GET') {
        const { getAllDeviceSafeStates } = await import('../safety/estop.js');
        sendJson(res, 200, getAllDeviceSafeStates());
        return;
      }

      // PUT /api/hal/estop/safe-states/:deviceId — set device safe state
      if (
        apiPath.match(/^\/estop\/safe-states\/([^/]+)$/) &&
        method === 'PUT'
      ) {
        const deviceId = apiPath.split('/')[3];
        const { setDeviceSafeState } = await import('../safety/estop.js');
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};

        const safeState = parsed.safeState;
        if (
          !safeState ||
          !['on', 'off', 'unknown', 'no_change'].includes(safeState)
        ) {
          sendJson(res, 400, {
            error: 'safeState must be one of: on, off, unknown, no_change',
          });
          return;
        }

        setDeviceSafeState(deviceId, safeState, parsed.safeValue);
        sendJson(res, 200, { ok: true });
        return;
      }

      // GET /api/hal/farm-loop/status — get farm loop state (for hang detection)
      if (apiPath === '/farm-loop/status' && method === 'GET') {
        const { getFarmLoopState, getWatchdogStatus } =
          await import('../safety/estop.js');
        sendJson(res, 200, {
          farmLoop: getFarmLoopState(),
          watchdog: getWatchdogStatus(),
        });
        return;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // AUTOMATION MODE API — four automation modes (VAL-AUTO-001 to VAL-AUTO-003)
      // ═══════════════════════════════════════════════════════════════════════

      // GET /api/hal/automation/mode — get current automation mode
      if (apiPath === '/automation/mode' && method === 'GET') {
        const { getAutomationMode, MODE_COLORS } =
          await import('../automation/modes.js');
        const mode = getAutomationMode();
        sendJson(res, 200, {
          mode,
          color: MODE_COLORS[mode],
        });
        return;
      }

      // PUT /api/hal/automation/mode — set automation mode
      if (apiPath === '/automation/mode' && method === 'PUT') {
        const { setAutomationMode, VALID_MODES } =
          await import('../automation/modes.js');
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};

        const mode = parsed.mode;
        if (!mode || !VALID_MODES.includes(mode)) {
          sendJson(res, 400, {
            error: `mode must be one of: ${VALID_MODES.join(', ')}`,
          });
          return;
        }

        setAutomationMode(mode, parsed.operatorId || 'system');
        sendJson(res, 200, { mode, ok: true });
        return;
      }

      // GET /api/hal/automation/pending — get all pending decisions (for ASSISTED and SUGGEST)
      if (apiPath === '/automation/pending' && method === 'GET') {
        const { getAllPendingDecisions, getPendingDecisionsWithTimer } =
          await import('../automation/modes.js');

        // Get the associated decision info for each pending entry
        const db = getDb();
        const pending = getAllPendingDecisions();
        const pendingWithTimer = getPendingDecisionsWithTimer();

        // Build a map of decision_id -> remaining seconds
        const timerMap = new Map(
          pendingWithTimer.map((p) => [p.decision_id, p.remainingSeconds]),
        );

        // Fetch the actual decision records
        const enriched = pending.map((p) => {
          const decision = db
            .prepare('SELECT * FROM hal_decision_log WHERE id = ?')
            .get(p.decision_id) as Record<string, unknown> | undefined;
          return {
            ...p,
            remainingSeconds: timerMap.get(p.decision_id) ?? null,
            decision: decision
              ? {
                  id: decision.id,
                  device_id: decision.device_id,
                  decision: decision.decision,
                  confidence: decision.confidence,
                  reasoning: decision.reasoning,
                  sensor_snapshot: decision.sensor_snapshot,
                  outcome: decision.outcome,
                  decided_at: decision.decided_at,
                  completed_at: decision.completed_at,
                  triggered_by: decision.triggered_by,
                  pending_status: decision.pending_status,
                }
              : null,
          };
        });

        sendJson(res, 200, enriched);
        return;
      }

      // POST /api/hal/automation/veto — veto a pending decision
      if (apiPath === '/automation/veto' && method === 'POST') {
        const { vetoDecision } = await import('../automation/modes.js');
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};

        const decisionId = parsed.decisionId;
        const operatorId = parsed.operatorId || 'operator';

        if (!decisionId) {
          sendJson(res, 400, { error: 'decisionId is required' });
          return;
        }

        const result = vetoDecision(decisionId, operatorId);
        if (!result.success) {
          sendJson(res, 400, { error: result.error });
          return;
        }

        sendJson(res, 200, { ok: true, vetoed: true });
        return;
      }

      // POST /api/hal/automation/approve — approve a pending decision
      if (apiPath === '/automation/approve' && method === 'POST') {
        const { approveDecision, executePendingDecision } =
          await import('../automation/modes.js');
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};

        const decisionId = parsed.decisionId;
        const operatorId = parsed.operatorId || 'operator';

        if (!decisionId) {
          sendJson(res, 400, { error: 'decisionId is required' });
          return;
        }

        const result = approveDecision(decisionId, operatorId);
        if (!result.success) {
          sendJson(res, 400, { error: result.error });
          return;
        }

        // Execute the hardware action after approval
        const executed = await executePendingDecision(decisionId);
        sendJson(res, 200, { ok: true, approved: true, executed });
        return;
      }

      // POST /api/hal/automation/trigger — manually trigger a decision cycle
      if (apiPath === '/automation/trigger' && method === 'POST') {
        const { runDecisionCycle } = await import('../agent/decision-loop.js');

        // Run the decision cycle with manual trigger
        const result = await runDecisionCycle({
          trigger: 'manual',
          message: undefined,
        });

        sendJson(res, 200, {
          ok: true,
          decisionId: result.decision,
          reasoning: result.reasoning,
        });
        return;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // SAFETY RULES API — CRUD for per-device safety rules
      // ═══════════════════════════════════════════════════════════════════════

      // GET /api/hal/safety/rules — list all safety rules
      if (apiPath === '/safety/rules' && method === 'GET') {
        const db = getDb();
        const rows = db
          .prepare(
            `
            SELECT id, device_id, rule_type, rule_config, enabled, priority, created_at, updated_at
            FROM hal_safety_rules
            ORDER BY priority ASC
          `,
          )
          .all() as Array<Record<string, unknown>>;
        const rules = rows.map((row) => ({
          id: row.id,
          deviceId: row.device_id,
          ruleType: row.rule_type,
          ruleConfig: JSON.parse(row.rule_config as string),
          enabled: row.enabled === 1,
          priority: row.priority,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        sendJson(res, 200, rules);
        return;
      }

      // GET /api/hal/safety/rules/:id — get a specific rule
      if (apiPath.match(/^\/safety\/rules\/([^/]+)$/) && method === 'GET') {
        const ruleId = apiPath.split('/')[3];
        const db = getDb();
        const row = db
          .prepare('SELECT * FROM hal_safety_rules WHERE id = ?')
          .get(ruleId) as Record<string, unknown> | undefined;
        if (!row) {
          sendJson(res, 404, { error: 'Rule not found' });
          return;
        }
        sendJson(res, 200, {
          id: row.id,
          deviceId: row.device_id,
          ruleType: row.rule_type,
          ruleConfig: JSON.parse(row.rule_config as string),
          enabled: row.enabled === 1,
          priority: row.priority,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
        return;
      }

      // POST /api/hal/safety/rules — create a new rule
      if (apiPath === '/safety/rules' && method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};

        const {
          deviceId,
          ruleType,
          ruleConfig,
          enabled = true,
          priority = 0,
        } = parsed;

        if (!deviceId || !ruleType || !ruleConfig) {
          sendJson(res, 400, {
            error: 'deviceId, ruleType, and ruleConfig are required',
          });
          return;
        }

        const validRuleTypes = [
          'max_on_duration',
          'min_off_duration',
          'max_activations_per_hour',
          'allowed_schedule_windows',
          'dependency',
        ];
        if (!validRuleTypes.includes(ruleType)) {
          sendJson(res, 400, {
            error: `ruleType must be one of: ${validRuleTypes.join(', ')}`,
          });
          return;
        }

        const id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const now = new Date().toISOString();

        try {
          const db = getDb();
          db.prepare(
            `
            INSERT INTO hal_safety_rules (id, device_id, rule_type, rule_config, enabled, priority, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          ).run(
            id,
            deviceId,
            ruleType,
            JSON.stringify(ruleConfig),
            enabled ? 1 : 0,
            priority,
            now,
            now,
          );

          sendJson(res, 201, {
            id,
            deviceId,
            ruleType,
            ruleConfig,
            enabled,
            priority,
            createdAt: now,
            updatedAt: now,
          });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // PUT /api/hal/safety/rules/:id — update a rule
      if (apiPath.match(/^\/safety\/rules\/([^/]+)$/) && method === 'PUT') {
        const ruleId = apiPath.split('/')[3];
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};

        const { ruleConfig, enabled, priority } = parsed;

        if (
          ruleConfig === undefined &&
          enabled === undefined &&
          priority === undefined
        ) {
          sendJson(res, 400, {
            error:
              'At least one of ruleConfig, enabled, or priority must be provided',
          });
          return;
        }

        const db = getDb();
        const existing = db
          .prepare('SELECT * FROM hal_safety_rules WHERE id = ?')
          .get(ruleId) as Record<string, unknown> | undefined;

        if (!existing) {
          sendJson(res, 404, { error: 'Rule not found' });
          return;
        }

        const now = new Date().toISOString();
        const newConfig =
          ruleConfig !== undefined
            ? JSON.stringify(ruleConfig)
            : existing.rule_config;
        const newEnabled =
          enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled;
        const newPriority =
          priority !== undefined ? priority : existing.priority;

        try {
          db.prepare(
            `
            UPDATE hal_safety_rules
            SET rule_config = ?, enabled = ?, priority = ?, updated_at = ?
            WHERE id = ?
          `,
          ).run(newConfig, newEnabled, newPriority, now, ruleId);

          sendJson(res, 200, {
            id: ruleId,
            deviceId: existing.device_id,
            ruleType: existing.rule_type,
            ruleConfig: JSON.parse(newConfig as string),
            enabled: newEnabled === 1,
            priority: newPriority,
            createdAt: existing.created_at,
            updatedAt: now,
          });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // DELETE /api/hal/safety/rules/:id — delete a rule
      if (apiPath.match(/^\/safety\/rules\/([^/]+)$/) && method === 'DELETE') {
        const ruleId = apiPath.split('/')[3];
        const db = getDb();
        const existing = db
          .prepare('SELECT * FROM hal_safety_rules WHERE id = ?')
          .get(ruleId);

        if (!existing) {
          sendJson(res, 404, { error: 'Rule not found' });
          return;
        }

        try {
          db.prepare('DELETE FROM hal_safety_rules WHERE id = ?').run(ruleId);
          sendJson(res, 200, { ok: true });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/hal/safety/audit — get recent audit log entries
      if (apiPath === '/safety/audit' && method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const deviceId = url.searchParams.get('deviceId');
        const triggeredBy = url.searchParams.get('triggeredBy');
        const result = url.searchParams.get('result');

        let sql = 'SELECT * FROM hal_safety_audit WHERE 1=1';
        const params: unknown[] = [];

        if (deviceId) {
          sql += ' AND device_id = ?';
          params.push(deviceId);
        }
        if (triggeredBy) {
          sql += ' AND triggered_by = ?';
          params.push(triggeredBy);
        }
        if (result) {
          sql += ' AND verifier_result = ?';
          params.push(result);
        }

        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const db = getDb();
        const rows = db.prepare(sql).all(...params) as Array<
          Record<string, unknown>
        >;
        const entries = rows.map((row) => ({
          id: row.id,
          deviceId: row.device_id,
          proposedAction: row.proposed_action,
          verifierResult: row.verifier_result,
          deniedReason: row.denied_reason,
          conflictingRuleIds: row.conflicting_rule_ids
            ? JSON.parse(row.conflicting_rule_ids as string)
            : [],
          sensorSnapshot: JSON.parse(row.sensor_snapshot as string),
          decisionId: row.decision_id,
          triggeredBy: row.triggered_by,
          executed: row.executed === 1,
          executedState: row.executed_state,
          interrupted: row.interrupted === 1,
          interruptedAtStep: row.interrupted_at_step,
          revertedSteps: row.reverted_steps,
          createdAt: row.created_at,
        }));
        sendJson(res, 200, entries);
        return;
      }

      // THRESHOLD API — per-device/zone min/max bounds for sensor metrics (VAL-AUTO-010)

      // GET /api/hal/thresholds — list all thresholds
      if (apiPath === '/thresholds' && method === 'GET') {
        const db = getDb();
        const deviceId = url.searchParams.get('deviceId');
        const zone = url.searchParams.get('zone');
        const metric = url.searchParams.get('metric');

        let sql = 'SELECT * FROM hal_thresholds WHERE 1=1';
        const params: unknown[] = [];

        if (deviceId) {
          sql += ' AND device_id = ?';
          params.push(deviceId);
        }
        if (zone) {
          sql += ' AND zone = ?';
          params.push(zone);
        }
        if (metric) {
          sql += ' AND metric = ?';
          params.push(metric);
        }

        sql += ' ORDER BY created_at DESC';

        try {
          const rows = db.prepare(sql).all(...params) as Array<{
            id: string;
            device_id: string | null;
            zone: string | null;
            metric: string;
            min_value: number | null;
            max_value: number | null;
            enabled: number;
            created_at: string;
            updated_at: string;
          }>;
          const thresholds = rows.map((row) => ({
            id: row.id,
            deviceId: row.device_id,
            zone: row.zone,
            metric: row.metric,
            minValue: row.min_value,
            maxValue: row.max_value,
            enabled: row.enabled === 1,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));
          sendJson(res, 200, thresholds);
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/hal/thresholds/:id — get a specific threshold
      if (apiPath.match(/^\/thresholds\/([^/]+)$/) && method === 'GET') {
        const id = apiPath.match(/^\/thresholds\/([^/]+)$/)![1];
        const db = getDb();
        try {
          const row = db
            .prepare('SELECT * FROM hal_thresholds WHERE id = ?')
            .get(id) as
            | {
                id: string;
                device_id: string | null;
                zone: string | null;
                metric: string;
                min_value: number | null;
                max_value: number | null;
                enabled: number;
                created_at: string;
                updated_at: string;
              }
            | undefined;
          if (!row) {
            sendJson(res, 404, { error: 'Threshold not found' });
            return;
          }
          sendJson(res, 200, {
            id: row.id,
            deviceId: row.device_id,
            zone: row.zone,
            metric: row.metric,
            minValue: row.min_value,
            maxValue: row.max_value,
            enabled: row.enabled === 1,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // POST /api/hal/thresholds — create a new threshold
      if (apiPath === '/thresholds' && method === 'POST') {
        const db = getDb();
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            const {
              deviceId,
              zone,
              metric,
              minValue,
              maxValue,
              enabled = true,
            } = data;

            if (!metric) {
              sendJson(res, 400, { error: 'metric is required' });
              return;
            }

            const validMetrics = [
              'temperature',
              'humidity',
              'soil_moisture',
              'co2',
              'light',
            ];
            if (!validMetrics.includes(metric)) {
              sendJson(res, 400, {
                error: `metric must be one of: ${validMetrics.join(', ')}`,
              });
              return;
            }

            if (minValue === undefined && maxValue === undefined) {
              sendJson(res, 400, {
                error: 'at least one of minValue or maxValue is required',
              });
              return;
            }

            const id = `thr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const now = new Date().toISOString();

            db.prepare(
              `INSERT INTO hal_thresholds (id, device_id, zone, metric, min_value, max_value, enabled, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ).run(
              id,
              deviceId || null,
              zone || null,
              metric,
              minValue ?? null,
              maxValue ?? null,
              enabled ? 1 : 0,
              now,
              now,
            );

            // Log to safety audit (VAL-AUTO-011)
            db.prepare(
              `INSERT INTO hal_safety_audit (id, device_id, proposed_action, verifier_result, denied_reason, sensor_snapshot, triggered_by, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ).run(
              `thr_log_${Date.now()}`,
              deviceId || null,
              'threshold_create',
              'INFO',
              JSON.stringify({
                action: 'create',
                metric,
                minValue,
                maxValue,
                deviceId,
                zone,
              }),
              '{}',
              'operator',
              now,
            );

            sendJson(res, 201, {
              id,
              deviceId,
              zone,
              metric,
              minValue,
              maxValue,
              enabled,
              createdAt: now,
              updatedAt: now,
            });
          } catch (err: any) {
            sendJson(res, 500, { error: err.message });
          }
        });
        return;
      }

      // PUT /api/hal/thresholds/:id — update a threshold
      if (apiPath.match(/^\/thresholds\/([^/]+)$/) && method === 'PUT') {
        const id = apiPath.match(/^\/thresholds\/([^/]+)$/)![1];
        const db = getDb();

        // Get current threshold for audit log
        const current = db
          .prepare('SELECT * FROM hal_thresholds WHERE id = ?')
          .get(id) as
          | {
              id: string;
              device_id: string | null;
              zone: string | null;
              metric: string;
              min_value: number | null;
              max_value: number | null;
              enabled: number;
              created_at: string;
              updated_at: string;
            }
          | undefined;

        if (!current) {
          sendJson(res, 404, { error: 'Threshold not found' });
          return;
        }

        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { deviceId, zone, metric, minValue, maxValue, enabled } =
              data;
            const now = new Date().toISOString();

            db.prepare(
              `UPDATE hal_thresholds
               SET device_id = ?, zone = ?, metric = ?, min_value = ?, max_value = ?, enabled = ?, updated_at = ?
               WHERE id = ?`,
            ).run(
              deviceId !== undefined ? deviceId : current.device_id,
              zone !== undefined ? zone : current.zone,
              metric !== undefined ? metric : current.metric,
              minValue !== undefined ? minValue : current.min_value,
              maxValue !== undefined ? maxValue : current.max_value,
              enabled !== undefined ? (enabled ? 1 : 0) : current.enabled,
              now,
              id,
            );

            // Log to safety audit with old/new values (VAL-AUTO-011)
            db.prepare(
              `INSERT INTO hal_safety_audit (id, device_id, proposed_action, verifier_result, denied_reason, sensor_snapshot, triggered_by, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ).run(
              `thr_log_${Date.now()}`,
              (deviceId !== undefined ? deviceId : current.device_id) || null,
              'threshold_update',
              'INFO',
              JSON.stringify({
                action: 'update',
                id,
                old: {
                  minValue: current.min_value,
                  maxValue: current.max_value,
                  enabled: current.enabled === 1,
                },
                new: {
                  minValue:
                    minValue !== undefined ? minValue : current.min_value,
                  maxValue:
                    maxValue !== undefined ? maxValue : current.max_value,
                  enabled:
                    enabled !== undefined ? enabled : current.enabled === 1,
                },
              }),
              '{}',
              'operator',
              now,
            );

            sendJson(res, 200, {
              id,
              deviceId: deviceId !== undefined ? deviceId : current.device_id,
              zone: zone !== undefined ? zone : current.zone,
              metric: metric !== undefined ? metric : current.metric,
              minValue: minValue !== undefined ? minValue : current.min_value,
              maxValue: maxValue !== undefined ? maxValue : current.max_value,
              enabled: enabled !== undefined ? enabled : current.enabled === 1,
              createdAt: current.created_at,
              updatedAt: now,
            });
          } catch (err: any) {
            sendJson(res, 500, { error: err.message });
          }
        });
        return;
      }

      // DELETE /api/hal/thresholds/:id — delete a threshold
      if (apiPath.match(/^\/thresholds\/([^/]+)$/) && method === 'DELETE') {
        const id = apiPath.match(/^\/thresholds\/([^/]+)$/)![1];
        const db = getDb();

        const current = db
          .prepare('SELECT * FROM hal_thresholds WHERE id = ?')
          .get(id) as
          | {
              id: string;
              device_id: string | null;
              metric: string;
              min_value: number | null;
              max_value: number | null;
            }
          | undefined;

        if (!current) {
          sendJson(res, 404, { error: 'Threshold not found' });
          return;
        }

        try {
          db.prepare('DELETE FROM hal_thresholds WHERE id = ?').run(id);

          // Log deletion to safety audit
          const now = new Date().toISOString();
          db.prepare(
            `INSERT INTO hal_safety_audit (id, device_id, proposed_action, verifier_result, denied_reason, sensor_snapshot, triggered_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            `thr_log_${Date.now()}`,
            current.device_id || null,
            'threshold_delete',
            'INFO',
            JSON.stringify({
              action: 'delete',
              id,
              metric: current.metric,
              minValue: current.min_value,
              maxValue: current.max_value,
            }),
            '{}',
            'operator',
            now,
          );

          sendJson(res, 200, { ok: true });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/hal/safety/state — get current safety state (NORMAL/WARNING/EMERGENCY_STOP)
      if (apiPath === '/safety/state' && method === 'GET') {
        const { getEstopState } = await import('../safety/estop.js');
        const { getFarmLoopState } = await import('../safety/estop.js');
        const db = getDb();

        const estop = getEstopState();
        const farmLoop = getFarmLoopState();

        // Count active rules
        const activeRulesCount = (
          db
            .prepare(
              'SELECT COUNT(*) as count FROM hal_safety_rules WHERE enabled = 1',
            )
            .get() as { count: number }
        ).count;

        // Count warning-state devices (within 10% of rule limits)
        // For now, we check if any recent audit entries have warnings
        const recentWarnings = (
          db
            .prepare(
              `
              SELECT COUNT(DISTINCT device_id) as count
              FROM hal_safety_audit
              WHERE verifier_result = 'APPROVED'
                AND denied_reason IS NOT NULL
                AND created_at > datetime('now', '-1 hour')
              `,
            )
            .get() as { count: number }
        ).count;

        // Count denied actions in last 24h
        const deniedLast24h = (
          db
            .prepare(
              `
              SELECT COUNT(*) as count FROM hal_safety_audit
              WHERE verifier_result IN ('DENIED', 'DENIED_WITH_REASON')
                AND created_at > datetime('now', '-24 hours')
              `,
            )
            .get() as { count: number }
        ).count;

        // Determine overall safety state
        let safetyState: 'NORMAL' | 'WARNING' | 'EMERGENCY_STOP_ACTIVE';
        if (estop.active) {
          safetyState = 'EMERGENCY_STOP_ACTIVE';
        } else if (recentWarnings > 0 || farmLoop.safetyMode) {
          safetyState = 'WARNING';
        } else {
          safetyState = 'NORMAL';
        }

        sendJson(res, 200, {
          safetyState,
          activeRulesCount,
          warningDevicesCount: recentWarnings,
          deniedLast24h,
          estopActive: estop.active,
          farmLoopSafetyMode: farmLoop.safetyMode,
          lastDecisionAt: farmLoop.lastDecisionAt,
          lastHeartbeatAt: farmLoop.lastHeartbeatAt,
        });
        return;
      }

      // GET /api/hal/safety/summary — get safety dashboard summary
      if (apiPath === '/safety/summary' && method === 'GET') {
        const db = getDb();

        // Active rules count
        const activeRulesCount = (
          db
            .prepare(
              'SELECT COUNT(*) as count FROM hal_safety_rules WHERE enabled = 1',
            )
            .get() as { count: number }
        ).count;

        // Denied actions in last 24h
        const deniedLast24h = (
          db
            .prepare(
              `
              SELECT COUNT(*) as count FROM hal_safety_audit
              WHERE verifier_result IN ('DENIED', 'DENIED_WITH_REASON')
                AND created_at > datetime('now', '-24 hours')
              `,
            )
            .get() as { count: number }
        ).count;

        // Recent denied actions (last 10)
        const recentDenied = db
          .prepare(
            `
            SELECT sa.*, d.label as device_name
            FROM hal_safety_audit sa
            LEFT JOIN hal_devices d ON sa.device_id = d.id
            WHERE sa.verifier_result IN ('DENIED', 'DENIED_WITH_REASON')
              AND sa.created_at > datetime('now', '-24 hours')
            ORDER BY sa.created_at DESC
            LIMIT 10
            `,
          )
          .all() as Array<Record<string, unknown>>;

        // E-Stop status
        const { getEstopState } = await import('../safety/estop.js');
        const estop = getEstopState();

        // Farm loop status
        const { getFarmLoopState } = await import('../safety/estop.js');
        const farmLoop = getFarmLoopState();

        // Active rules per device
        const rulesPerDevice = db
          .prepare(
            `
            SELECT device_id, COUNT(*) as rule_count
            FROM hal_safety_rules
            WHERE enabled = 1
            GROUP BY device_id
            `,
          )
          .all() as Array<{ device_id: string; rule_count: number }>;

        sendJson(res, 200, {
          activeRulesCount,
          deniedLast24h,
          recentDenied: recentDenied.map((row) => ({
            id: row.id,
            deviceId: row.device_id,
            deviceName: row.device_name,
            proposedAction: row.proposed_action,
            deniedReason: row.denied_reason,
            triggeredBy: row.triggered_by,
            createdAt: row.created_at,
          })),
          estopActive: estop.active,
          estopActivatedAt: estop.activatedAt,
          estopReason: estop.reason,
          farmLoopSafetyMode: farmLoop.safetyMode,
          lastDecisionAt: farmLoop.lastDecisionAt,
          rulesPerDevice: rulesPerDevice.map((r) => ({
            deviceId: r.device_id,
            ruleCount: r.rule_count,
          })),
        });
        return;
      }

      // ══════════════════════════════════════════════════════════════════════════════
      // DISCOVERY API — Device discovery and registration (VAL-DISC-001 to VAL-DISC-052)
      // ══════════════════════════════════════════════════════════════════════════════

      // GET /api/hal/discovery/gpio/status — check pigpiod availability (VAL-DISC-010)
      if (apiPath === '/discovery/gpio/status' && method === 'GET') {
        const { execSync } = await import('child_process');
        let pigpiodAvailable = false;
        let errorMessage = '';
        try {
          const out = execSync('pgrep pigpiod || true', { timeout: 3000 })
            .toString()
            .trim();
          pigpiodAvailable = out.length > 0 && /^\d+$/.test(out);
        } catch (err: any) {
          errorMessage = err.message;
        }
        sendJson(res, 200, {
          available: pigpiodAvailable,
          error: errorMessage,
        });
        return;
      }

      // GET /api/hal/discovery/gpio/pins — get BCM pin status (VAL-DISC-011)
      if (apiPath === '/discovery/gpio/pins' && method === 'GET') {
        // Returns list of BCM pins with state and pin diagram data
        const db = getDb();
        const devices = halRegistry
          .list()
          .filter((d: any) => d.protocol === 'gpio');
        const usedPins = new Map<string, any>(); // bcm -> device
        const reservedPins = new Set<string>(['2', '3', '4', '14', '15']); // I2C, reserved
        for (const dev of devices) {
          if (dev.host) usedPins.set(dev.host, dev); // host stores BCM pin number
        }

        // Pin diagram data: BCM -> { physical, altFunctions, description }
        // Physical pin numbers for the 40-pin header (Pi 4 / Pi 5)
        const PIN_DIAGRAM: Record<
          number,
          { physical: number; altFunctions: string[]; description: string }
        > = {
          0: { physical: 27, altFunctions: ['SDA1'], description: 'I2C SDA' },
          1: { physical: 28, altFunctions: ['SCL1'], description: 'I2C SCL' },
          2: {
            physical: 3,
            altFunctions: ['SDA0'],
            description: 'I2C SDA (reserved)',
          },
          3: {
            physical: 5,
            altFunctions: ['SCL0'],
            description: 'I2C SCL (reserved)',
          },
          4: {
            physical: 7,
            altFunctions: ['GPCLK0'],
            description: 'General clock (reserved)',
          },
          5: {
            physical: 29,
            altFunctions: ['GPCLK1'],
            description: 'General clock',
          },
          6: {
            physical: 31,
            altFunctions: ['GPCLK2'],
            description: 'General clock',
          },
          7: {
            physical: 26,
            altFunctions: ['SPI_CE1'],
            description: 'SPI chip select',
          },
          8: {
            physical: 24,
            altFunctions: ['SPI_CE0'],
            description: 'SPI chip select',
          },
          9: {
            physical: 21,
            altFunctions: ['SPI_MISO'],
            description: 'SPI data',
          },
          10: {
            physical: 19,
            altFunctions: ['SPI_MOSI'],
            description: 'SPI data',
          },
          11: {
            physical: 23,
            altFunctions: ['SPI_SCLK'],
            description: 'SPI clock',
          },
          12: {
            physical: 32,
            altFunctions: ['PWM0'],
            description: 'PWM channel 0',
          },
          13: {
            physical: 33,
            altFunctions: ['PWM1'],
            description: 'PWM channel 1',
          },
          14: {
            physical: 8,
            altFunctions: ['TXD0'],
            description: 'Serial TX (reserved)',
          },
          15: {
            physical: 10,
            altFunctions: ['RXD0'],
            description: 'Serial RX (reserved)',
          },
          16: { physical: 36, altFunctions: [], description: 'GPIO 16' },
          17: { physical: 11, altFunctions: [], description: 'GPIO 17' },
          18: {
            physical: 12,
            altFunctions: ['PWM0'],
            description: 'PWM channel 0 / GPIO 18',
          },
          19: { physical: 35, altFunctions: [], description: 'GPIO 19' },
          20: { physical: 38, altFunctions: [], description: 'GPIO 20' },
          21: { physical: 40, altFunctions: [], description: 'GPIO 21' },
          22: { physical: 15, altFunctions: [], description: 'GPIO 22' },
          23: { physical: 16, altFunctions: [], description: 'GPIO 23' },
          24: { physical: 18, altFunctions: [], description: 'GPIO 24' },
          25: { physical: 22, altFunctions: [], description: 'GPIO 25' },
          26: { physical: 37, altFunctions: [], description: 'GPIO 26' },
          27: { physical: 13, altFunctions: [], description: 'GPIO 27' },
        };

        // BCM 0-27 common GPIO pins
        const pins = [];
        for (let bcm = 0; bcm <= 27; bcm++) {
          const state = usedPins.has(String(bcm))
            ? 'in_use'
            : reservedPins.has(String(bcm))
              ? 'reserved'
              : 'available';
          const diagram = PIN_DIAGRAM[bcm] || null;
          pins.push({
            bcm,
            state,
            physicalPin: diagram?.physical ?? null,
            altFunctions: diagram?.altFunctions ?? [],
            description: diagram?.description ?? `GPIO ${bcm}`,
            registeredTo: usedPins.has(String(bcm))
              ? (usedPins.get(String(bcm)) as any)?.label
              : null,
          });
        }
        sendJson(res, 200, { pins });
        return;
      }

      // POST /api/hal/discovery/gpio/register — register a GPIO device (VAL-DISC-012)
      if (apiPath === '/discovery/gpio/register' && method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const { bcmPin, label, zone } = parsed;
        if (
          !bcmPin ||
          typeof bcmPin !== 'number' ||
          bcmPin < 0 ||
          bcmPin > 27
        ) {
          sendJson(res, 400, { error: 'Valid BCM pin (0-27) is required' });
          return;
        }
        // Duplicate pin check
        const existingDevices = halRegistry
          .list()
          .filter((d: any) => d.protocol === 'gpio');
        const usedPins = new Set(existingDevices.map((d: any) => d.host));
        if (usedPins.has(String(bcmPin))) {
          const existing = existingDevices.find(
            (d: any) => d.host === String(bcmPin),
          );
          sendJson(res, 409, {
            error: `BCM pin ${bcmPin} is already registered as "${existing?.label || 'GPIO ' + bcmPin}". Remove the existing device first.`,
            conflictingDevice: existing || null,
          });
          return;
        }
        // Reserved pin check
        const reservedPins = new Set(['2', '3', '4', '14', '15']);
        if (reservedPins.has(String(bcmPin))) {
          sendJson(res, 400, {
            error: `BCM pin ${bcmPin} is reserved (I2C or system). Choose a different pin.`,
          });
          return;
        }
        try {
          const dev = halRegistry.register({
            type: 'relay',
            protocol: 'gpio',
            host: String(bcmPin),
            label: label || `GPIO ${bcmPin}`,
            zone: zone || null,
          });
          sendJson(res, 201, dev);
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/hal/discovery/mqtt/devices — subscribe and collect MQTT discovery topics (VAL-DISC-020, VAL-DISC-021)
      if (apiPath === '/discovery/mqtt/devices' && method === 'GET') {
        const MQTT_BROKER =
          process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
        const MQTT_USERNAME = process.env.MQTT_USERNAME;
        const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
        const { connect } = await import('mqtt');

        const discovered = new Map<string, any>();
        const DISCOVERY_TIMEOUT_MS = 10_000;

        let connectionError = '';
        const client = connect(MQTT_BROKER, {
          clientId: `farmpal_discovery_${Date.now()}`,
          clean: true,
          connectTimeout: 5000,
          username: MQTT_USERNAME || undefined,
          password: MQTT_PASSWORD || undefined,
        });

        const cleanup = () => {
          try {
            client.end(true);
          } catch {}
        };

        const timeoutId = setTimeout(() => {
          cleanup();
        }, DISCOVERY_TIMEOUT_MS);

        try {
          await new Promise<void>((resolve, reject) => {
            const rejectOnce = (err: Error) => {
              cleanup();
              reject(err);
            };
            client.on('connect', () => {
              client.subscribe('homeassistant/#', { qos: 1 }, (err) => {
                if (err)
                  console.error(
                    '[MQTT discovery] homeassistant subscribe error:',
                    err.message,
                  );
              });
              client.subscribe('tele/+/SENSOR', { qos: 1 }, (err) => {
                if (err)
                  console.error(
                    '[MQTT discovery] tele subscribe error:',
                    err.message,
                  );
              });
              // Give subscriptions time to establish before resolving
              setTimeout(resolve, 500);
            });
            client.on('error', (err) => {
              connectionError = err.message;
              rejectOnce(err);
            });
            client.on('message', (topic: string, payload: Buffer) => {
              try {
                const msgStr = payload.toString();
                // HomeAssistant auto-discovery: homeassistant/<domain>/<node>/<object>/config
                if (
                  topic.startsWith('homeassistant/') &&
                  topic.endsWith('/config')
                ) {
                  let json: any;
                  try {
                    json = JSON.parse(msgStr);
                  } catch {
                    return;
                  }
                  const parts = topic.split('/');
                  const objectId = parts[2] || parts[1] || topic;
                  const deviceInfo = json.device || {};
                  const name = json.name || deviceInfo.name || objectId;
                  const domain = parts[1] || 'unknown';
                  const key = `ha_${objectId}`;
                  if (!discovered.has(key)) {
                    discovered.set(key, {
                      host: topic,
                      protocol: 'mqtt',
                      type: domain === 'switch' ? 'relay' : 'sensor',
                      label: name,
                      online: true,
                      discoveryType: 'homeassistant',
                      manufacturer: deviceInfo.manufacturer,
                      model: deviceInfo.model,
                    });
                  }
                }
                // Tasmota telemetry: tele/<topic>/SENSOR
                else if (
                  topic.startsWith('tele/') &&
                  topic.endsWith('/SENSOR')
                ) {
                  const parts = topic.split('/');
                  const deviceTopic = parts[1];
                  let json: any;
                  try {
                    json = JSON.parse(msgStr);
                  } catch {
                    return;
                  }
                  const key = `tele_${deviceTopic}`;
                  if (!discovered.has(key)) {
                    const firstSensor = Object.keys(json).find(
                      (k) => k !== 'sn' && k !== 'Version' && k !== 'wifi',
                    );
                    discovered.set(key, {
                      host: topic,
                      protocol: 'mqtt',
                      type: 'sensor',
                      label: `Tasmota ${deviceTopic}`,
                      online: true,
                      discoveryType: 'tasmota',
                      sensorType: firstSensor || 'multi',
                    });
                  }
                }
              } catch (err: any) {
                console.error(
                  '[MQTT discovery] message parse error:',
                  err.message,
                );
              }
            });

            // Connection timeout
            setTimeout(() => {
              if (client.disconnected) {
                rejectOnce(new Error(connectionError || 'Connection timeout'));
              }
            }, 6000);
          });
        } catch (err: any) {
          clearTimeout(timeoutId);
          cleanup();
          sendJson(res, 200, {
            devices: [],
            note: `MQTT broker unreachable (${err.message}). Check MQTT broker URL in settings.`,
            topics: ['homeassistant/#', 'tele/+/SENSOR'],
            error: connectionError,
          });
          return;
        }

        clearTimeout(timeoutId);
        cleanup();
        const devices = Array.from(discovered.values());
        sendJson(res, 200, {
          devices,
          note:
            devices.length === 0
              ? 'No MQTT devices discovered. Ensure devices are publishing to homeassistant/# or tele/+/SENSOR topics.'
              : `${devices.length} device${devices.length !== 1 ? 's' : ''} discovered.`,
          topics: ['homeassistant/#', 'tele/+/SENSOR'],
        });
        return;
      }

      // POST /api/hal/discovery/mqtt/register — register MQTT device (VAL-DISC-022)
      if (apiPath === '/discovery/mqtt/register' && method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const { topic, label, type, zone } = parsed;
        if (!topic) {
          sendJson(res, 400, { error: 'MQTT topic is required' });
          return;
        }
        try {
          const dev = halRegistry.register({
            type: type || 'sensor',
            protocol: 'mqtt',
            host: topic,
            label: label || topic.split('/').pop() || topic,
            zone: zone || null,
          });
          sendJson(res, 201, dev);
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/hal/discovery/http/scan — scan subnet for HTTP devices (VAL-DISC-003, VAL-DISC-005)
      // Query params: subnet (e.g. "192.168.1"), protocol ("tasmota" | "shelly" | "both")
      if (apiPath === '/discovery/http/scan' && method === 'GET') {
        const subnet = url.searchParams.get('subnet') || '192.168.1';
        const protocol = url.searchParams.get('protocol') || 'both';
        const { execSync } = await import('child_process');

        const discovered: Array<{
          host: string;
          protocol: string;
          type: string;
          label: string;
          online: boolean;
        }> = [];

        // Ping scan first to find active hosts
        let hosts: string[] = [];
        try {
          const pingOut = execSync(
            `for i in $(seq 1 254); do ping -c1 -W1 ${subnet}.$i 2>/dev/null & done; wait`,
            { timeout: 15000 },
          ).toString();
          const ipRe = /(\d+\.\d+\.\d+\.\d+)/g;
          const found = new Set<string>();
          let m;
          while ((m = ipRe.exec(pingOut)) !== null) found.add(m[1]);
          hosts = [...found];
        } catch {
          // No hosts found
        }

        // Probe each host for Tasmota or Shelly
        for (const host of hosts.slice(0, 50)) {
          if (protocol === 'shelly' || protocol === 'both') {
            try {
              const out = execSync(
                `curl -s --max-time 2 http://${host}/shelly`,
                { timeout: 3000 },
              ).toString();
              if (out.includes('Shelly') || out.includes('shelly')) {
                discovered.push({
                  host,
                  protocol: 'shelly',
                  type: 'smart_plug',
                  label: `Shelly (${host})`,
                  online: true,
                });
                continue;
              }
            } catch {
              /* not shelly */
            }
          }
          if (protocol === 'tasmota' || protocol === 'both') {
            try {
              const out = execSync(
                `curl -s --max-time 2 http://${host}/cm?cmnd=Status`,
                { timeout: 3000 },
              ).toString();
              if (out.includes('Status') || out.includes('Tasmota')) {
                discovered.push({
                  host,
                  protocol: 'tasmota',
                  type: 'smart_plug',
                  label: `Tasmota (${host})`,
                  online: true,
                });
                continue;
              }
            } catch {
              /* not tasmota */
            }
          }
        }

        sendJson(res, 200, {
          devices: discovered,
          scanned: hosts.length,
          timeout: 30000,
        });
        return;
      }

      // POST /api/hal/discovery/http/register — register HTTP device (VAL-DISC-005, VAL-DISC-007)
      if (apiPath === '/discovery/http/register' && method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const { host, protocol, type, label, zone } = parsed;
        if (!host || !protocol) {
          sendJson(res, 400, { error: 'host and protocol are required' });
          return;
        }
        try {
          const dev = halRegistry.register({
            type: type || 'smart_plug',
            protocol: protocol as any,
            host,
            label: label || `${protocol} (${host})`,
            zone: zone || null,
          });
          sendJson(res, 201, dev);
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/hal/discovery/serial/ports — enumerate serial ports (VAL-DISC-030)
      if (apiPath === '/discovery/serial/ports' && method === 'GET') {
        const { execSync } = await import('child_process');
        const ports: Array<{ path: string; description: string }> = [];
        const isMac = process.platform === 'darwin';
        try {
          if (isMac) {
            // macOS: list /dev/cu.* ports
            const out = execSync('ls -1 /dev/cu.* 2>/dev/null || true', {
              timeout: 3000,
            }).toString();
            for (const line of out.split('\n').filter(Boolean)) {
              const path = line.trim();
              if (path.startsWith('/dev/cu.')) {
                ports.push({
                  path,
                  description: path.replace('/dev/cu.', 'USB Serial '),
                });
              }
            }
          } else {
            // Linux: list common serial port paths
            const commonPaths = [
              '/dev/ttyUSB0',
              '/dev/ttyUSB1',
              '/dev/ttyACM0',
              '/dev/ttyACM1',
              '/dev/serial0',
            ];
            for (const p of commonPaths) {
              try {
                execSync(`test -e ${p} && echo exists`, { timeout: 1000 });
                ports.push({ path: p, description: p });
              } catch {
                /* not found */
              }
            }
          }
        } catch (err: any) {
          // Probing failed, return empty list
        }
        sendJson(res, 200, { ports });
        return;
      }

      // POST /api/hal/discovery/serial/probe — probe a serial port for device type (VAL-DISC-031, VAL-DISC-032)
      if (apiPath === '/discovery/serial/probe' && method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const { port } = parsed;
        if (!port) {
          sendJson(res, 400, { error: 'port is required' });
          return;
        }
        // Probe for BME280, DS18B20, Atlas EZO
        // In simulator mode, return mock data
        const sim = getSimulator();
        if (sim) {
          sendJson(res, 200, {
            port,
            detected: true,
            type: 'sensor',
            protocol: 'serial',
            label: `Serial Sensor (${port})`,
            channels: ['temperature', 'humidity'],
          });
          return;
        }
        // Real probing would use serialport library
        // For now, return a placeholder
        sendJson(res, 200, {
          port,
          detected: false,
          type: 'unknown',
          protocol: 'serial',
          note: 'Serial device probing requires the serialport library. Configure serial devices manually.',
        });
        return;
      }

      // POST /api/hal/discovery/serial/register — register serial device (VAL-DISC-032)
      if (apiPath === '/discovery/serial/register' && method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const { port, type, label, zone } = parsed;
        if (!port) {
          sendJson(res, 400, { error: 'port is required' });
          return;
        }
        try {
          const dev = halRegistry.register({
            type: type || 'sensor',
            protocol: 'serial',
            host: port,
            label: label || `Serial (${port})`,
            zone: zone || null,
          });
          sendJson(res, 201, dev);
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // POST /api/hal/discovery/manual — manually add device with connectivity check (VAL-DISC-040)
      if (apiPath === '/discovery/manual' && method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const { host, port: devPort, protocol, type, label, zone } = parsed;
        if (!host || !protocol) {
          sendJson(res, 400, { error: 'host and protocol are required' });
          return;
        }
        // Validate connectivity by attempting HTTP request for HTTP protocols
        let reachable = false;
        if (protocol === 'tasmota' || protocol === 'shelly') {
          const { execSync } = await import('child_process');
          try {
            execSync(`curl -s --max-time 3 http://${host}/cm?cmnd=Status`, {
              timeout: 4000,
            });
            reachable = true;
          } catch {
            try {
              execSync(`curl -s --max-time 3 http://${host}/shelly`, {
                timeout: 4000,
              });
              reachable = true;
            } catch {
              /* not reachable */
            }
          }
        } else {
          // For non-HTTP protocols, skip connectivity check
          reachable = true;
        }
        if (!reachable && protocol !== 'gpio' && protocol !== 'serial') {
          sendJson(res, 400, {
            error: `Device at ${host} is not reachable. Check the IP address and ensure the device is powered on.`,
          });
          return;
        }
        try {
          const dev = halRegistry.register({
            type: type || 'sensor',
            protocol: protocol as any,
            host,
            label: label || `${protocol} (${host})`,
            zone: zone || null,
          });
          sendJson(res, 201, dev);
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // PUT /api/hal/devices/:id — update device label, zone, and/or description (VAL-DISC-050, VAL-DISC-052, VAL-DISC-070)
      if (apiPath.match(/^\/devices\/([^/]+)$/) && method === 'PUT') {
        const deviceId = apiPath.split('/')[2];
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const { label, zone, controlled_device_description } = parsed;
        try {
          const dev = halRegistry.updateDevice(deviceId, {
            label,
            zone,
            controlled_device_description,
          });
          sendJson(res, 200, dev);
        } catch (err: any) {
          sendJson(res, 404, { error: err.message });
        }
        return;
      }

      // PUT /api/hal/devices/:id/calibration — update calibration offset (VAL-DISC-060, VAL-DISC-061)
      if (
        apiPath.match(/^\/devices\/([^/]+)\/calibration$/) &&
        method === 'PUT'
      ) {
        const deviceId = apiPath.split('/')[2];
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const { offset } = parsed;
        if (typeof offset !== 'number') {
          sendJson(res, 400, { error: 'offset must be a number' });
          return;
        }
        try {
          const dev = halRegistry.updateDeviceCalibration(deviceId, offset);
          sendJson(res, 200, dev);
        } catch (err: any) {
          sendJson(res, 404, { error: err.message });
        }
        return;
      }

      // DELETE /api/hal/devices/:id — remove device
      if (apiPath.match(/^\/devices\/([^/]+)$/) && method === 'DELETE') {
        const deviceId = apiPath.split('/')[2];
        try {
          halRegistry.remove(deviceId);
          sendJson(res, 200, { ok: true });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/hal/zones — list all zones (VAL-DISC-050, VAL-DISC-051)
      if (apiPath === '/zones' && method === 'GET') {
        const db = getDb();
        const devices = halRegistry.list();
        const zoneMap = new Map<
          string,
          { name: string; deviceCount: number }
        >();
        // Always include "No Zone" option
        zoneMap.set('', { name: 'No Zone', deviceCount: 0 });
        for (const dev of devices) {
          const z = (dev as any).zone || '';
          if (!zoneMap.has(z)) {
            zoneMap.set(z, { name: z || 'No Zone', deviceCount: 0 });
          }
          zoneMap.get(z)!.deviceCount++;
        }
        const zones = [...zoneMap.entries()].map(([id, data]) => ({
          id: id || '_none',
          name: data.name,
          deviceCount: data.deviceCount,
        }));
        sendJson(res, 200, zones);
        return;
      }

      // PUT /api/hal/zones/:id — rename a zone
      if (apiPath.match(/^\/zones\/([^/]+)$/) && method === 'PUT') {
        const oldZoneId = decodeURIComponent(apiPath.split('/')[2]);
        const actualOldZone = oldZoneId === '_none' ? '' : oldZoneId;
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const { name: newZoneName } = parsed;
        if (!newZoneName) {
          sendJson(res, 400, { error: 'New zone name is required' });
          return;
        }
        const db = getDb();
        // Update all devices with this zone
        const devices = halRegistry
          .list()
          .filter((d: any) => d.zone === actualOldZone);
        for (const dev of devices) {
          halRegistry.updateDevice(dev.id, { zone: newZoneName });
        }
        sendJson(res, 200, { ok: true, updated: devices.length });
        return;
      }

      // BACKUP API — Manual backup trigger (VAL-SVC-033)
      // POST /api/hal/backup — trigger a manual backup
      if (apiPath === '/backup' && method === 'POST') {
        const { execSync } = await import('child_process');
        const ROOT_DIR = process.cwd();
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        const backupDir = path.join(ROOT_DIR, 'backups');
        const archiveName = `farmpal-backup-${timestamp}.tar.gz`;
        const archivePath = path.join(backupDir, archiveName);

        // Ensure backup directory exists
        try {
          execSync(`mkdir -p "${backupDir}"`, { stdio: 'pipe' });
        } catch {
          sendJson(res, 500, { error: 'Failed to create backup directory' });
          return;
        }

        // Build list of files to backup
        const filesToBackup: string[] = [];
        const envPath = path.join(ROOT_DIR, '.env');
        const dataDir = path.join(ROOT_DIR, 'data');
        const groupsDir = path.join(ROOT_DIR, 'groups');

        if (fs.existsSync(envPath)) {
          filesToBackup.push('.env');
        }
        if (fs.existsSync(dataDir)) {
          filesToBackup.push('data');
        }
        if (fs.existsSync(groupsDir)) {
          filesToBackup.push('groups');
        }

        if (filesToBackup.length === 0) {
          sendJson(res, 400, { error: 'No backup sources found' });
          return;
        }

        // Create backup using tar
        try {
          const tarCmd = `tar -czf "${archivePath}" ${filesToBackup.map((f) => `-C "${ROOT_DIR}" "${f}"`).join(' ')}`;
          execSync(tarCmd, { stdio: 'pipe', cwd: ROOT_DIR });
        } catch (err: any) {
          sendJson(res, 500, { error: `Backup failed: ${err.message}` });
          return;
        }

        // Apply retention policy (keep last 7 daily backups)
        try {
          execSync(
            `find "${backupDir}" -name "farmpal-backup-*.tar.gz" -type f -mtime +7 -delete 2>/dev/null || true`,
            { stdio: 'pipe' },
          );
        } catch {
          // Ignore retention errors
        }

        sendJson(res, 200, {
          ok: true,
          archive: archiveName,
          path: archivePath,
          files: filesToBackup,
          timestamp,
        });
        return;
      }

      sendJson(res, 404, { error: 'HAL API endpoint not found' });
      return;
    }
    // ═══════════════════════════════════════════════════════════════════════
    // PROVISIONING API — Used by the setup wizard
    // All /api/provisioning/* routes are unauthenticated
    // ═══════════════════════════════════════════════════════════════════════
    if (requestPath.startsWith('/api/provisioning/')) {
      // Lazy import to avoid circular deps and allow this module to work standalone
      const {
        getProvisioningManager,
        getProvisionedFlagFile,
        getProvisioningStateFile,
      } = await import('../first-boot.js');
      const mgr = getProvisioningManager();
      const provApiPath = requestPath.slice('/api/provisioning'.length);

      // GET /api/provisioning/status — current provisioning state
      if (provApiPath === '/status' && method === 'GET') {
        const state = mgr.loadState();
        const isUnprovisioned = mgr.isUnprovisioned();
        const hasNetwork = mgr.hasNetworkConnectivity();
        const primaryIp = mgr.getPrimaryIpAddress();
        const avahiRunning = mgr.isAvahiRunning();
        sendJson(res, 200, {
          isUnprovisioned,
          state: state?.state ?? 'unprovisioned',
          wizardStep: state?.wizardStep ?? 0,
          farmName: state?.farmName ?? null,
          timezone: state?.timezone ?? null,
          wifiConfigured: state?.wifiConfigured ?? false,
          llmProvider: state?.llmProvider ?? null,
          hasNetworkConnectivity: hasNetwork,
          primaryIp,
          avahiRunning,
          errorMessage: state?.errorMessage ?? null,
        });
        return;
      }

      // POST /api/provisioning/begin — start provisioning (VAL-IMG-006)
      if (provApiPath === '/begin' && method === 'POST') {
        try {
          // VAL-IMG-020: Acquire lock to prevent concurrent provisioning
          let releaseLock: (() => void) | null = null;
          try {
            releaseLock = mgr.acquireProvisioningLock();
          } catch (lockErr: any) {
            if (lockErr.message === 'PROVISIONING_ALREADY_IN_PROGRESS') {
              sendJson(res, 409, {
                error: 'Provisioning already in progress',
              });
              return;
            }
            throw lockErr;
          }
          const newState = mgr.beginProvisioning();
          releaseLock();
          sendJson(res, 200, { ok: true, state: newState.state });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // PUT /api/provisioning/wizard-step — update wizard step (VAL-IMG-018)
      // Also accepts POST for backward compatibility
      if (
        provApiPath === '/wizard-step' &&
        (method === 'PUT' || method === 'POST')
      ) {
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const { step, farmName, timezone, wifiConfigured, llmProvider } =
          parsed;
        try {
          const state = mgr.updateWizardStep(step ?? 1, {
            farmName,
            timezone,
            wifiConfigured,
            llmProvider,
          });
          // Also auto-save wizard session for VAL-IMG-018
          const existingSession = mgr.loadWizardSession() ?? {
            step: step ?? 1,
            farmName: farmName ?? 'My Farm',
            timezone:
              timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
            llmProvider: llmProvider ?? 'ollama',
            wifiConfigured: wifiConfigured ?? false,
            telegramEnabled: false,
            savedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
          };
          const updatedSession = {
            ...existingSession,
            step: step ?? existingSession.step,
            farmName: farmName ?? existingSession.farmName,
            timezone: timezone ?? existingSession.timezone,
            wifiConfigured: wifiConfigured ?? existingSession.wifiConfigured,
            llmProvider: llmProvider ?? existingSession.llmProvider,
            savedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          };
          mgr.saveWizardSession(updatedSession);
          sendJson(res, 200, { ok: true, wizardStep: state.wizardStep });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/provisioning/wizard-session — load auto-saved session (VAL-IMG-018)
      if (provApiPath === '/wizard-session' && method === 'GET') {
        const session = mgr.loadWizardSession();
        if (!session) {
          sendJson(res, 404, { error: 'No saved wizard session found' });
          return;
        }
        sendJson(res, 200, session);
        return;
      }

      // POST /api/provisioning/complete — write .env and mark complete (VAL-IMG-007, VAL-IMG-019)
      if (provApiPath === '/complete' && method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        try {
          // VAL-IMG-019: Atomic .env write - no partial file left on failure
          // The generateEnv method uses write-to-temp-then-rename
          await mgr.generateEnv(parsed);
          const state = mgr.completeProvisioning(parsed.adminPasswordHash);
          sendJson(res, 200, { ok: true, state: state.state });
        } catch (err: any) {
          // VAL-IMG-019: If write fails, clear error shown, no redirect
          mgr.failProvisioning(err.message);
          sendJson(res, 500, {
            error:
              err.message ?? 'Setup could not be saved — please try again.',
          });
        }
        return;
      }

      // POST /api/provisioning/reset — reset to unprovisioned state (VAL-IMG-015)
      if (provApiPath === '/reset' && method === 'POST') {
        const {
          getProvisioningManager: gm2,
          getFarmPalEnvFile: getEnv,
          getProvisionedFlagFile: getFlag,
          getProvisioningStateFile: getState,
        } = await import('../first-boot.js');
        const mgr2 = gm2();
        try {
          const envFile = getEnv();
          for (const file of [envFile, getFlag(), getState()]) {
            try {
              if (fs.existsSync(file)) fs.unlinkSync(file);
            } catch {
              /* ignore */
            }
          }
          mgr2.clearWizardSession();
          sendJson(res, 200, { ok: true });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/provisioning/network — network status for HDMI fallback (VAL-IMG-016)
      if (provApiPath === '/network' && method === 'GET') {
        const hasNetwork = mgr.hasNetworkConnectivity();
        const primaryIp = mgr.getPrimaryIpAddress();
        const avahiRunning = mgr.isAvahiRunning();
        sendJson(res, 200, {
          hasNetworkConnectivity: hasNetwork,
          primaryIp,
          avahiRunning,
          farmpalLocal: avahiRunning ? 'http://farmpal.local:3392' : null,
        });
        return;
      }

      sendJson(res, 404, { error: 'Provisioning endpoint not found' });
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SETTINGS API — LLM provider/model and other farm settings
    // ═══════════════════════════════════════════════════════════════════════
    if (requestPath.startsWith('/api/settings/')) {
      const settingsPath = requestPath.slice('/api/settings'.length);
      const db = getDb();

      // Import env file path helper
      const { getFarmPalEnvFile } = await import('../first-boot.js');

      // PUT /api/settings/llm — update LLM provider/model settings (VAL-AUTO-040)
      if (settingsPath === '/llm' && method === 'PUT') {
        let body = '';
        for await (const chunk of req) body += chunk;
        try {
          const data = JSON.parse(body);
          const { llmProvider, llmEndpoint, llmApiKey, llmModel } = data;
          const now = new Date().toISOString();

          // Save to database for persistence (VAL-AUTO-040)
          const settings = [
            ['llm_provider', llmProvider || 'ollama'],
            ['llm_endpoint', llmEndpoint || 'http://localhost:11434'],
            ['llm_api_key', llmApiKey || ''],
            ['llm_model', llmModel || ''],
          ];

          for (const [key, value] of settings) {
            db.prepare(
              `INSERT INTO hal_settings (key, value, updated_at)
               VALUES (?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`,
            ).run(key, value, now, value, now);
          }

          // Also update .env file for runtime use
          const envPath = getFarmPalEnvFile();
          try {
            let envContent = '';
            if (fs.existsSync(envPath)) {
              envContent = fs.readFileSync(envPath, 'utf-8');
            }

            const envUpdates: Record<string, string> = {
              LLM_PROVIDER: llmProvider || 'ollama',
              OLLAMA_BASE_URL: llmEndpoint || 'http://localhost:11434',
              OPENAI_API_KEY: llmApiKey || '',
              OLLAMA_MODEL: llmModel || '',
              PI_MODEL: llmModel || '',
            };

            for (const [key, value] of Object.entries(envUpdates)) {
              if (value !== undefined && value !== '') {
                const regex = new RegExp(`^${key}=.*$`, 'm');
                if (regex.test(envContent)) {
                  envContent = envContent.replace(regex, `${key}=${value}`);
                } else {
                  envContent += `\n${key}=${value}`;
                }
              }
            }
            fs.writeFileSync(envPath, envContent.trim() + '\n');
          } catch {
            // Non-fatal - DB save is the primary persistence
          }

          sendJson(res, 200, { ok: true });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/settings/llm — get current LLM settings
      if (settingsPath === '/llm' && method === 'GET') {
        try {
          const rows = db
            .prepare('SELECT key, value FROM hal_settings WHERE key LIKE ?')
            .all('llm_%') as Array<{ key: string; value: string }>;

          const settings: Record<string, string> = {};
          for (const row of rows) {
            settings[row.key] = row.value;
          }

          sendJson(res, 200, {
            llmProvider: settings['llm_provider'] || 'ollama',
            llmEndpoint: settings['llm_endpoint'] || 'http://localhost:11434',
            llmApiKey: settings['llm_api_key'] || '',
            llmModel: settings['llm_model'] || '',
          });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/settings/network — get network access mode (VAL-SEC-051)
      if (settingsPath === '/network' && method === 'GET') {
        try {
          const { getFarmPalEnvFile } = await import('../first-boot.js');
          const envPath = getFarmPalEnvFile();
          let accessMode = 'localhost';
          let httpsEnabled = false;

          if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const accessModeMatch = envContent.match(
              /^FFT_NANO_WEB_ACCESS_MODE=(.+)$/m,
            );
            if (accessModeMatch) {
              accessMode = accessModeMatch[1].trim();
            }
            const httpsMatch = envContent.match(/^HAL_UI_HTTPS_ENABLED=(.+)$/m);
            if (httpsMatch) {
              httpsEnabled = httpsMatch[1].trim() === 'true';
            }
          }

          sendJson(res, 200, {
            accessMode,
            httpsEnabled,
            // Show warning if LAN-bound without HTTPS
            lanWithoutHttps: accessMode === 'lan' && !httpsEnabled,
          });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // PUT /api/settings/network — update network access mode (VAL-SEC-051)
      // Requires admin auth and CSRF token
      if (settingsPath === '/network' && method === 'PUT') {
        // Get session info for audit logging
        const token = parseSessionCookie(req.headers.cookie);
        const session = token ? validateSession(token) : null;
        const ipAddress =
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          (req.headers['x-real-ip'] as string) ||
          req.socket.remoteAddress ||
          'unknown';
        const operatorId = session?.operatorId || 'admin';
        const sessionId = session?.id || 'unknown';

        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        const { accessMode } = parsed;

        // Validate accessMode
        if (
          !accessMode ||
          !['localhost', 'lan', 'remote'].includes(accessMode)
        ) {
          sendJson(res, 400, {
            error: 'accessMode must be localhost, lan, or remote',
          });
          return;
        }

        // Remote (WAN) access requires HTTPS
        if (accessMode === 'remote') {
          const { getFarmPalEnvFile } = await import('../first-boot.js');
          const envPath = getFarmPalEnvFile();
          let httpsEnabled = false;
          if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const httpsMatch = envContent.match(/^HAL_UI_HTTPS_ENABLED=(.+)$/m);
            if (httpsMatch) {
              httpsEnabled = httpsMatch[1].trim() === 'true';
            }
          }
          if (!httpsEnabled) {
            sendJson(res, 400, {
              error:
                'WAN access requires HTTPS to be enabled. Enable HTTPS first.',
            });
            return;
          }
        }

        try {
          const { getFarmPalEnvFile } = await import('../first-boot.js');
          const envPath = getFarmPalEnvFile();

          if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf-8');
            const regex = /^FFT_NANO_WEB_ACCESS_MODE=.*$/m;
            if (regex.test(envContent)) {
              envContent = envContent.replace(
                regex,
                `FFT_NANO_WEB_ACCESS_MODE=${accessMode}`,
              );
            } else {
              envContent += `\nFFT_NANO_WEB_ACCESS_MODE=${accessMode}`;
            }
            fs.writeFileSync(envPath, envContent);
          }

          // Log admin action to security audit (VAL-SEC-075)
          logAdminAction(
            sessionId,
            operatorId,
            'NETWORK_ACCESS_MODE_CHANGE',
            { oldAccessMode: 'localhost', newAccessMode: accessMode },
            ipAddress,
          );

          sendJson(res, 200, {
            ok: true,
            accessMode,
            message:
              'Network access mode updated. Restart FarmPal for changes to take effect.',
          });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      sendJson(res, 404, { error: 'Settings endpoint not found' });
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LICENSE API — License activation, deactivation, and status
    // VAL-LIC-001 through VAL-LIC-016
    // ═══════════════════════════════════════════════════════════════════════

    // GET /api/license/status — get current license status (VAL-LIC-010)
    if (requestPath === '/api/license/status' && method === 'GET') {
      try {
        const { getLicenseStatus, initLicense } =
          await import('../license/index.js');
        initLicense(); // Ensure license cache is initialized
        const status = await getLicenseStatus();
        sendJson(res, 200, status);
      } catch (err: any) {
        sendJson(res, 500, { error: err.message });
      }
      return;
    }

    // GET /api/license/hardware-id — get the hardware ID for this device (VAL-LIC-012)
    if (requestPath === '/api/license/hardware-id' && method === 'GET') {
      try {
        const { getHardwareId, getHardwareIdDisplay } =
          await import('../license/hardware-id.js');
        sendJson(res, 200, {
          hardwareId: getHardwareId(),
          hardwareIdDisplay: getHardwareIdDisplay(),
        });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message });
      }
      return;
    }

    // POST /api/license/activate — activate a license key (VAL-LIC-002, VAL-LIC-015)
    if (requestPath === '/api/license/activate' && method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      try {
        const { licenseKey } = JSON.parse(body);
        if (!licenseKey || typeof licenseKey !== 'string') {
          sendJson(res, 400, { error: 'licenseKey is required' });
          return;
        }

        const { activateLicense, initLicense } =
          await import('../license/index.js');
        initLicense(); // Ensure license cache is initialized
        const result = await activateLicense(licenseKey);

        if (result.error) {
          sendJson(res, 400, {
            error: result.error,
            errorCode: result.errorCode,
            status: result.status,
          });
          return;
        }

        sendJson(res, 200, {
          status: result.status,
          expiresAt: result.expiresAt,
        });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message });
      }
      return;
    }

    // POST /api/license/deactivate — deactivate license (VAL-LIC-014)
    if (requestPath === '/api/license/deactivate' && method === 'POST') {
      try {
        const { deactivateLicense, initLicense } =
          await import('../license/index.js');
        initLicense(); // Ensure license cache is initialized
        const result = await deactivateLicense();

        if (!result.success) {
          sendJson(res, 400, { error: result.error || 'Deactivation failed' });
          return;
        }

        sendJson(res, 200, { ok: true });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message });
      }
      return;
    }

    // GET /api/license/feature-gates — check if a feature is allowed (VAL-LIC-005)
    if (requestPath === '/api/license/feature-gates' && method === 'GET') {
      try {
        const { getFeatureGates, initLicense } =
          await import('../license/index.js');
        initLicense(); // Ensure license cache is initialized
        const gates = getFeatureGates();
        sendJson(res, 200, gates);
      } catch (err: any) {
        sendJson(res, 500, { error: err.message });
      }
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERNAL SIMULATOR CONTROL — NOT exposed in production UI
    // Access via: curl http://localhost:3392/_sim/status
    // ═══════════════════════════════════════════════════════════════════════
    if (requestPath.startsWith('/_sim/')) {
      const sim = getSimulator();
      if (!sim) {
        sendJson(res, 503, { error: 'Simulator not running' });
        return;
      }

      const simPath = requestPath.slice('/_sim'.length);

      if (simPath === '/status' && method === 'GET') {
        sendJson(res, 200, sim.getStatus());
        return;
      }

      if (simPath === '/scenario' && method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        if (parsed.scenario) sim.setScenario(parsed.scenario);
        sendJson(res, 200, { ok: true, scenario: parsed.scenario });
        return;
      }

      if (simPath === '/speed' && method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        if (typeof parsed.speed === 'number') sim.setSpeed(parsed.speed);
        sendJson(res, 200, { ok: true, speed: parsed.speed });
        return;
      }

      if (simPath === '/fault' && method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = body ? JSON.parse(body) : {};
        if (parsed.fault) sim.injectFault(parsed.fault);
        sendJson(res, 200, { ok: true, fault: parsed.fault });
        return;
      }

      sendJson(res, 404, { error: 'Simulator endpoint not found' });
      return;
    }

    // Documentation files (VAL-DOC-012 — docs bundled locally, work offline)
    if (requestPath.startsWith('/docs/')) {
      const docsDir = path.resolve(process.cwd(), 'docs');
      let docsFilePath = path.join(docsDir, requestPath.slice(6)); // remove '/docs/'
      if (!docsFilePath.startsWith(docsDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      if (fs.existsSync(docsFilePath) && fs.statSync(docsFilePath).isFile()) {
        const ext = path.extname(docsFilePath);
        const mimeType = MIME_TYPES[ext] || 'text/plain; charset=utf-8';
        sendFile(res, docsFilePath, false, mimeType);
        return;
      }
      sendJson(res, 404, { error: 'Documentation file not found' });
      return;
    }

    // Static files from src/web/hal-ui/ (or built dist/web/hal-ui/)
    let filePath = path.join(
      staticDir,
      requestPath === '/' ? 'index.html' : requestPath,
    );
    if (!filePath.startsWith(staticDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Try exact file, then index.html fallback
    if (!fs.existsSync(filePath)) {
      const indexTry = path.join(filePath, 'index.html');
      if (fs.existsSync(indexTry)) filePath = indexTry;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(res, filePath, requestPath.endsWith('.html'));
      return;
    }

    // Fallback to index.html for SPA routing
    sendFile(res, path.join(staticDir, 'index.html'), true);
  });

  // Port conflict detection: check if port is already in use before binding
  // This provides a human-readable error with PID and process name (VAL-SVC-012, VAL-SVC-013)
  const { isPortAvailable, getPortInfo } = await import('./port-check.js');
  if (!isPortAvailable(port, bindHost)) {
    const portInfo = getPortInfo(port, bindHost);
    const errorMsg = `Port ${port} is already in use by process ${portInfo.pid} (${portInfo.name}). Stop the other instance before starting FarmPal.`;
    logger.error(
      { port, pid: portInfo.pid, processName: portInfo.name },
      errorMsg,
    );
    console.error(`FATAL: ${errorMsg}`);
    process.exit(1);
  }

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, bindHost, () => resolve());
  });

  logger.info(
    { port, host, bindHost },
    'HAL UI server listening on http://{bindHost}:{port}',
  );
  return {
    host,
    port,
    close: () =>
      new Promise<void>((resolve) => server.close((_err?: Error) => resolve())),
  };
}
