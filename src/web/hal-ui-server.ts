import http from 'http';
import fs from 'fs';
import path from 'path';
import { getDb } from '../hal/db.js';
import { halRegistry } from '../hal/registry.js';
import { halSensors } from '../hal/sensors.js';
import { halDecisions } from '../hal/decisions.js';
import { halRelays } from '../hal/relays.js';
import type { MetricType } from '../hal/types.js';
import { logger } from '../logger.js';
import { getSimulator } from '../hal/simulator.js';

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

function sendFile(
  res: http.ServerResponse,
  filePath: string,
  isHtml = false,
): void {
  try {
    const body = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
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

  const server = http.createServer(async (req, res) => {
    const method = (req.method || 'GET').toUpperCase();
    const url = new URL(req.url || '/', `http://${host}`);
    const requestPath = decodeURIComponent(url.pathname || '/');

    // HAL API routes
    if (requestPath.startsWith('/api/hal/')) {
      const apiPath = requestPath.slice('/api/hal'.length);

      if (apiPath === '/state' && method === 'GET') {
        const devices = halRegistry.list();
        const sensorSnapshots: Record<string, Record<string, unknown>> = {};
        const allMetrics: Array<{
          metric: MetricType;
          fn: (id: string) => unknown;
        }> = [
          {
            metric: 'temperature',
            fn: (id: string) => halSensors.latest(id, 'temperature'),
          },
          {
            metric: 'humidity',
            fn: (id: string) => halSensors.latest(id, 'humidity'),
          },
          { metric: 'co2', fn: (id: string) => halSensors.latest(id, 'co2') },
          {
            metric: 'light',
            fn: (id: string) => halSensors.latest(id, 'light'),
          },
          {
            metric: 'soil_moisture',
            fn: (id: string) => halSensors.latest(id, 'soil_moisture'),
          },
          {
            metric: 'water_level',
            fn: (id: string) => halSensors.latest(id, 'water_level'),
          },
          { metric: 'ph', fn: (id: string) => halSensors.latest(id, 'ph') },
          {
            metric: 'weight',
            fn: (id: string) => halSensors.latest(id, 'weight'),
          },
        ];
        for (const dev of devices.filter((d: any) => d.type === 'sensor')) {
          sensorSnapshots[dev.id] = {};
          for (const { metric, fn } of allMetrics) {
            const reading = fn(dev.id);
            if (reading) sensorSnapshots[dev.id][metric] = reading;
          }
        }
        sendJson(res, 200, {
          devices,
          sensorSnapshots,
          recentDecisions: halDecisions.recent(10),
        });
        return;
      }

      if (apiPath === '/devices' && method === 'GET') {
        sendJson(res, 200, halRegistry.list());
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
          // In simulator mode, delegate to simulator instead of real hardware
          const sim = getSimulator();
          if (sim) {
            sim.setDeviceState(deviceId, action);
            halRelays.log({
              device_id: deviceId,
              state: action,
              reason: 'manual',
              triggered_by: 'hal-ui',
            });
          } else {
            await halRegistry.control(deviceId, action);
            halRelays.log({
              device_id: deviceId,
              state: action,
              reason: 'manual',
              triggered_by: 'hal-ui',
            });
          }
          sendJson(res, 200, { ok: true });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      if (apiPath === '/sensors/latest' && method === 'GET') {
        const devices = halRegistry
          .list()
          .filter((d: any) => d.type === 'sensor');
        const readings = [];
        for (const dev of devices) {
          const temp = halSensors.latest(dev.id, 'temperature');
          const hum = halSensors.latest(dev.id, 'humidity');
          if (temp || hum)
            readings.push({ device: dev, temperature: temp, humidity: hum });
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
        sendJson(
          res,
          200,
          halSensors.history(deviceId, metric as MetricType, from, to),
        );
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
          const state = mgr.completeProvisioning();
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
