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

function sendJson(res: http.ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendFile(res: http.ServerResponse, filePath: string, isHtml = false): void {
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

export async function startHalUiServer(port = 3392, host = '127.0.0.1'): Promise<HalUiServer> {
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
        const allMetrics: Array<{ metric: MetricType; fn: (id: string) => unknown }> = [
          { metric: 'temperature', fn: (id: string) => halSensors.latest(id, 'temperature') },
          { metric: 'humidity', fn: (id: string) => halSensors.latest(id, 'humidity') },
          { metric: 'co2', fn: (id: string) => halSensors.latest(id, 'co2') },
          { metric: 'light', fn: (id: string) => halSensors.latest(id, 'light') },
          { metric: 'soil_moisture', fn: (id: string) => halSensors.latest(id, 'soil_moisture') },
          { metric: 'water_level', fn: (id: string) => halSensors.latest(id, 'water_level') },
          { metric: 'ph', fn: (id: string) => halSensors.latest(id, 'ph') },
          { metric: 'weight', fn: (id: string) => halSensors.latest(id, 'weight') },
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
          await halRegistry.control(deviceId, action);
          halRelays.log({ device_id: deviceId, state: action, reason: 'manual', triggered_by: 'hal-ui' });
          sendJson(res, 200, { ok: true });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      if (apiPath === '/sensors/latest' && method === 'GET') {
        const devices = halRegistry.list().filter((d: any) => d.type === 'sensor');
        const readings = [];
        for (const dev of devices) {
          const temp = halSensors.latest(dev.id, 'temperature');
          const hum = halSensors.latest(dev.id, 'humidity');
          if (temp || hum) readings.push({ device: dev, temperature: temp, humidity: hum });
        }
        sendJson(res, 200, readings);
        return;
      }

      if (apiPath.startsWith('/sensors/history') && method === 'GET') {
        const deviceId = url.searchParams.get('device');
        const metric = url.searchParams.get('metric');
        const from = url.searchParams.get('from') || new Date(Date.now() - 86400000).toISOString();
        const to = url.searchParams.get('to') || new Date().toISOString();
        if (!deviceId || !metric) {
          sendJson(res, 400, { error: 'device and metric are required' });
          return;
        }
        sendJson(res, 200, halSensors.history(deviceId, metric as MetricType, from, to));
        return;
      }

      if (apiPath.startsWith('/decisions') && method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '20');
        sendJson(res, 200, halDecisions.recent(limit));
        return;
      }

      if (apiPath.match(/^\/decisions\/([^/]+)\/complete$/) && method === 'POST') {
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
        sendJson(res, 200, halRegistry.list().filter((d: any) => d.type === 'camera'));
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

      sendJson(res, 404, { error: 'HAL API endpoint not found' });
      return;
    }

    // Static files from src/web/hal-ui/ (or built dist/web/hal-ui/)
    let filePath = path.join(staticDir, requestPath === '/' ? 'index.html' : requestPath);
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
    server.listen(port, host, () => resolve());
  });

  logger.info({ port, host }, 'HAL UI server listening on http://{host}:{port}');
  return { host, port, close: () => new Promise<void>(resolve => server.close((_err?: Error) => resolve())) };
}
