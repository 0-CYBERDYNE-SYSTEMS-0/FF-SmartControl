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
          const calibrationOffset = dev.calibration_offset ?? 0;
          for (const { metric, fn } of allMetrics) {
            const reading = fn(dev.id) as
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
        sendJson(res, 200, {
          devices,
          sensorSnapshots,
          recentDecisions: halDecisions.recent(10),
        });
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
          sendJson(res, 200, { ok: true });
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
        const allMetrics: Array<{
          metric: MetricType;
          fn: (id: string) => { value: number; unit?: string } | undefined;
        }> = [
          {
            metric: 'temperature',
            fn: (id) => halSensors.latest(id, 'temperature'),
          },
          { metric: 'humidity', fn: (id) => halSensors.latest(id, 'humidity') },
          { metric: 'co2', fn: (id) => halSensors.latest(id, 'co2') },
          { metric: 'light', fn: (id) => halSensors.latest(id, 'light') },
          {
            metric: 'soil_moisture',
            fn: (id) => halSensors.latest(id, 'soil_moisture'),
          },
          {
            metric: 'water_level',
            fn: (id) => halSensors.latest(id, 'water_level'),
          },
          { metric: 'ph', fn: (id) => halSensors.latest(id, 'ph') },
          { metric: 'weight', fn: (id) => halSensors.latest(id, 'weight') },
        ];
        const readings = [];
        for (const dev of devices) {
          const calibrationOffset = dev.calibration_offset ?? 0;
          const snapshot: Record<string, { value: number; unit?: string }> = {};
          let hasAny = false;
          for (const { metric, fn } of allMetrics) {
            const reading = fn(dev.id);
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
        const { approveDecision, getPendingDecision } =
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

        sendJson(res, 200, { ok: true, approved: true });
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
            SELECT sa.*, d.name as device_name
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
