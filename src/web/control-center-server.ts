import fs from 'fs';
import http from 'http';
import path from 'path';
import { randomBytes, timingSafeEqual } from 'crypto';

import type { WebAccessMode } from '../config.js';
import { logger } from '../logger.js';

interface RuntimeStatusPayload {
  runtime: string;
  sessions: number;
  activeRuns: number;
}

interface ProfileStatusPayload {
  profile: string;
  featureFarm: boolean;
  profileDetection: {
    source: string;
    reason: string;
  };
}

interface BuildInfoPayload {
  startedAt: string;
  version: string;
  branch?: string;
  commit?: string;
}

interface GatewayStatusPayload {
  host: string;
  port: number;
  authRequired: boolean;
}

interface OnboardingStatusPayload {
  active: boolean;
  providerPreset: string;
  model: string;
  apiKeyConfigured: boolean;
  telegramBotConfigured: boolean;
  telegramAdminSecretConfigured: boolean;
  whatsappEnabled: boolean;
  configComplete: boolean;
}

interface OnboardingConfigPayload {
  providerPreset?: string;
  model?: string;
  apiKey?: string;
  telegramBotToken?: string;
  whatsappEnabled?: boolean;
}

export interface WebControlCenterFileRoot {
  id: string;
  label: string;
  path: string;
}

interface NormalizedFileRoot {
  id: string;
  label: string;
  path: string;
}

export interface WebControlCenterAdapters {
  getRuntimeStatus: () => RuntimeStatusPayload;
  getProfileStatus: () => ProfileStatusPayload;
  getBuildInfo: () => BuildInfoPayload;
  getGatewayStatus: () => GatewayStatusPayload;
  getOnboardingStatus?: () => OnboardingStatusPayload;
  applyOnboardingConfig?: (
    payload: OnboardingConfigPayload,
  ) => Promise<{ ok: boolean; requiresRestart: boolean; adminSecret?: string }>;
  hostUpdate?: () => { ok: boolean; text: string };
}

export interface WebControlCenterServerOptions {
  host: string;
  port: number;
  accessMode: WebAccessMode;
  authToken: string;
  staticDir: string;
  logsDir: string;
  fileRoots: WebControlCenterFileRoot[];
}

export interface WebControlCenterServer {
  host: string;
  port: number;
  close: () => Promise<void>;
}

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
const MAX_FILE_WRITE_BYTES = 1024 * 1024;
const MAX_FILE_READ_BYTES = 1024 * 1024;
const MAX_SKILLS_SCAN_DIRS = 3000;
const MAX_SKILLS_RESULTS_PER_ROOT = 500;

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

function sendText(
  res: http.ServerResponse,
  statusCode: number,
  body: string,
  contentType = 'text/plain; charset=utf-8',
): void {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function parseLineCount(raw: string | null): number {
  const parsed = Number.parseInt(raw || '', 10);
  if (!Number.isFinite(parsed)) return 120;
  return Math.max(10, Math.min(1000, parsed));
}

async function readJsonBody<T>(
  req: http.IncomingMessage,
  limitBytes = MAX_FILE_WRITE_BYTES,
): Promise<T> {
  const chunks: Buffer[] = [];
  let total = 0;
  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: Buffer | string) => {
      const data = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      total += data.byteLength;
      if (total > limitBytes) {
        reject(new Error(`Request body exceeds ${limitBytes} bytes`));
        req.destroy();
        return;
      }
      chunks.push(data);
    });
    req.on('end', () => resolve());
    req.on('error', reject);
  });

  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw.trim()) return {} as T;
  return JSON.parse(raw) as T;
}

function normalizeSubPath(raw: string): string {
  const trimmed = raw.trim().replace(/^\/+/, '');
  return trimmed || '.';
}

function normalizeRelPosix(raw: string): string {
  const cleaned = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  const normalized = path.posix.normalize(cleaned || '.');
  return normalized === '' ? '.' : normalized;
}

function ensureWithinRoot(rootPath: string, subPath: string): string {
  const resolved = path.resolve(rootPath, subPath);
  const rel = path.relative(rootPath, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes root directory');
  }
  return resolved;
}

function ensureRealPathWithinRoot(
  rootPath: string,
  candidatePath: string,
): string {
  const resolvedReal = fs.realpathSync(candidatePath);
  const rootReal = fs.realpathSync(rootPath);
  const rel = path.relative(rootReal, resolvedReal);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes root directory via symlink');
  }
  return resolvedReal;
}

function ensureWritePathWithinRoot(rootPath: string, filePath: string): void {
  const rootReal = fs.realpathSync(rootPath);
  const parentPath = path.dirname(filePath);
  const parentReal = fs.realpathSync(parentPath);
  const relParent = path.relative(rootReal, parentReal);
  if (relParent.startsWith('..') || path.isAbsolute(relParent)) {
    throw new Error('Path escapes root directory via symlink');
  }

  if (!fs.existsSync(filePath)) return;
  const existing = fs.lstatSync(filePath);
  if (existing.isSymbolicLink()) {
    throw new Error('Refusing to write through symlink path');
  }
  ensureRealPathWithinRoot(rootPath, filePath);
}

function ensureWritableParentDirWithinRoot(
  rootPath: string,
  filePath: string,
): void {
  const rootReal = fs.realpathSync(rootPath);
  const targetDir = path.dirname(filePath);
  const relDir = path.relative(rootPath, targetDir);
  if (!relDir || relDir === '.') return;

  const parts = relDir.split(path.sep).filter(Boolean);
  let current = rootPath;
  for (const part of parts) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) {
      fs.mkdirSync(current);
      continue;
    }
    const existing = fs.lstatSync(current);
    if (existing.isSymbolicLink()) {
      throw new Error('Refusing to traverse symlink directory path');
    }
    if (!existing.isDirectory()) {
      throw new Error('Parent path is not a directory');
    }
    const currentReal = fs.realpathSync(current);
    const rel = path.relative(rootReal, currentReal);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error('Path escapes root directory via symlink');
    }
  }
}

function listDirectoryEntries(dirPath: string): Array<{
  name: string;
  relPath: string;
  kind: 'file' | 'dir';
  size: number;
  modifiedAt: string;
}> {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => !entry.name.startsWith('.'))
    .map((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      const lstat = fs.lstatSync(fullPath);
      if (lstat.isSymbolicLink()) return null;
      const stat = fs.statSync(fullPath);
      const kind: 'file' | 'dir' = entry.isDirectory() ? 'dir' : 'file';
      return {
        name: entry.name,
        relPath: entry.name,
        kind,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        name: string;
        relPath: string;
        kind: 'file' | 'dir';
        size: number;
        modifiedAt: string;
      } => entry !== null,
    )
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function parseSkillDescription(raw: string): string {
  const text = raw.trim();
  if (!text) return '';

  const frontmatterMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (frontmatterMatch) {
    const body = frontmatterMatch[1] || '';
    const descriptionMatch = body.match(/^description:\s*["']?(.+?)["']?\s*$/m);
    if (descriptionMatch?.[1]) {
      return descriptionMatch[1].trim();
    }
  }

  const headingMatch = text.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) return headingMatch[1].trim();

  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine || '';
}

function scanSkillsCatalogForRoot(root: NormalizedFileRoot): Array<{
  name: string;
  path: string;
  dir: string;
  description: string;
}> {
  const entries: Array<{
    name: string;
    path: string;
    dir: string;
    description: string;
  }> = [];
  const queue = ['.'];
  let visitedDirs = 0;

  while (queue.length > 0) {
    if (
      visitedDirs >= MAX_SKILLS_SCAN_DIRS ||
      entries.length >= MAX_SKILLS_RESULTS_PER_ROOT
    ) {
      break;
    }
    const relDir = queue.shift() || '.';
    const absDir = ensureWithinRoot(root.path, relDir);
    let dirEntries: fs.Dirent[];
    try {
      dirEntries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      continue;
    }
    visitedDirs += 1;

    const hasSkill = dirEntries.some(
      (entry) => entry.isFile() && entry.name === 'SKILL.md',
    );
    if (hasSkill) {
      const skillRelPath = normalizeRelPosix(
        path.posix.join(relDir === '.' ? '' : relDir, 'SKILL.md'),
      );
      const skillPath = ensureWithinRoot(root.path, skillRelPath);
      let description = '';
      try {
        description = parseSkillDescription(
          fs.readFileSync(skillPath, 'utf-8'),
        );
      } catch {
        description = '';
      }
      const name = relDir === '.' ? root.label : path.basename(relDir);
      entries.push({
        name,
        path: skillRelPath,
        dir: normalizeRelPosix(relDir),
        description,
      });
    }

    for (const entry of dirEntries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const childRel = normalizeRelPosix(
        path.posix.join(relDir === '.' ? '' : relDir, entry.name),
      );
      queue.push(childRel);
    }
  }

  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

function tailFile(filePath: string, lineCount: number): string {
  if (!fs.existsSync(filePath)) return '';
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return '';
  if (stat.size === 0) return '';

  const maxBytes = 768 * 1024;
  const readSize = Math.min(stat.size, maxBytes);
  const offset = stat.size - readSize;
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(readSize);
  try {
    fs.readSync(fd, buffer, 0, readSize, offset);
  } finally {
    fs.closeSync(fd);
  }

  const raw = buffer.toString('utf-8');
  const lines = raw.split(/\r?\n/);
  if (offset > 0 && lines.length > 0) {
    lines.shift();
  }
  return lines.slice(-lineCount).join('\n');
}

function resolveGatewayWsUrl(
  req: http.IncomingMessage,
  gateway: GatewayStatusPayload,
): string {
  const hostHeader = req.headers.host || '';
  const hostFromHeader = hostHeader.split(':')[0]?.trim();
  const selectedHost =
    gateway.host === '0.0.0.0' ? hostFromHeader || '127.0.0.1' : gateway.host;

  const xfProtoRaw = req.headers['x-forwarded-proto'];
  const xfProto = Array.isArray(xfProtoRaw) ? xfProtoRaw[0] : xfProtoRaw;
  const protocol = (xfProto || '').toLowerCase() === 'https' ? 'wss' : 'ws';
  return `${protocol}://${selectedHost}:${gateway.port}`;
}

function isAuthorized(
  req: http.IncomingMessage,
  authRequired: boolean,
  authToken: string,
): boolean {
  if (!authRequired) return true;
  const header = req.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return false;
  const presented = header.slice(7).trim();
  if (presented.length !== authToken.length) return false;
  return timingSafeEqual(Buffer.from(presented), Buffer.from(authToken));
}

/**
 * Resolve the bearer token used for mutating routes. When no token is
 * configured, generate a cryptographically random one at server startup and
 * persist it to a 0600 file in the FarmPal data dir. The file path is logged —
 * never the token itself. Operators paste this token into the Control Center
 * frontend token input.
 */
async function resolveControlCenterAuthToken(
  provided: string,
): Promise<{ token: string; tokenFile: string }> {
  const { getFarmPalDataDir } = await import('../first-boot.js');
  const tokenFile = path.join(getFarmPalDataDir(), 'web-control-center-token');
  if (provided) return { token: provided, tokenFile };
  let token = '';
  try {
    token = fs.readFileSync(tokenFile, 'utf-8').trim();
  } catch {
    token = '';
  }
  if (!token) {
    token = randomBytes(32).toString('hex');
    try {
      fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
      // Refuse to write through a symlink planted at the token-file path.
      let lstat: fs.Stats | null = null;
      try {
        lstat = fs.lstatSync(tokenFile);
      } catch {
        lstat = null; // does not exist yet
      }
      if (lstat?.isSymbolicLink()) {
        throw new Error(
          `refusing to write Control Center token file: ${tokenFile} is a symlink`,
        );
      }
      // 'wx' is exclusive: if the file appears between the read and the
      // write (creation race), the EEXIST handler below reuses its token
      // instead of clobbering it.
      fs.writeFileSync(tokenFile, `${token}\n`, { mode: 0o600, flag: 'wx' });
      logger.info(
        { tokenFile },
        'No FFT_NANO_WEB_AUTH_TOKEN configured; generated Control Center token for mutating routes',
      );
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | null)?.code;
      if (code === 'EEXIST') {
        // Lost a creation race: reuse the token in the existing file.
        try {
          const existing = fs.readFileSync(tokenFile, 'utf-8').trim();
          if (!existing) throw new Error('existing token file is empty');
          token = existing;
          logger.info(
            { tokenFile },
            'Using existing Control Center token file for mutating routes',
          );
        } catch (reuseErr) {
          // Persistence is best-effort: keep the in-memory token so mutations
          // still work for callers that have it (e.g. read-only data dir).
          logger.warn(
            {
              tokenFile,
              err:
                reuseErr instanceof Error ? reuseErr.message : String(reuseErr),
            },
            'Could not reuse existing Control Center token file; using in-memory token only',
          );
        }
      } else {
        // Persistence is best-effort: keep the in-memory token so mutations
        // still work for callers that have it (e.g. read-only data dir).
        logger.warn(
          { tokenFile, err: err instanceof Error ? err.message : String(err) },
          'Could not persist Control Center token file; using in-memory token only',
        );
      }
    }
  } else {
    logger.info(
      { tokenFile },
      'Using existing Control Center token file for mutating routes',
    );
  }
  try {
    fs.chmodSync(tokenFile, 0o600);
  } catch {
    // Best-effort permission tightening
  }
  return { token, tokenFile };
}

export async function startWebControlCenterServer(
  adapters: WebControlCenterAdapters,
  options: WebControlCenterServerOptions,
): Promise<WebControlCenterServer> {
  // Mutating routes always require a bearer token; generate + persist one when
  // the operator has not configured FFT_NANO_WEB_AUTH_TOKEN.
  const { token: authToken, tokenFile: ccTokenFile } =
    await resolveControlCenterAuthToken(options.authToken.trim());
  const authRequired = options.accessMode !== 'localhost';

  const staticDir = path.resolve(options.staticDir);
  const logsDir = path.resolve(options.logsDir);
  const fileRoots: NormalizedFileRoot[] = options.fileRoots
    .map((root) => {
      const id = root.id.trim();
      const label = root.label.trim() || id;
      const resolved = path.resolve(root.path);
      if (!id) return null;
      try {
        // If the root exists at startup, normalize through realpath to reduce aliasing.
        // If it does not exist yet (lazy bootstrap), keep the resolved path so the root
        // still appears in /api/files/roots and becomes available once created.
        return {
          id,
          label,
          path: fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved,
        };
      } catch {
        return {
          id,
          label,
          path: resolved,
        };
      }
    })
    .filter((root): root is NormalizedFileRoot => root !== null);
  const fileRootsById = new Map(fileRoots.map((root) => [root.id, root]));
  const skillsRoots = fileRoots.filter((root) =>
    root.id.toLowerCase().includes('skill'),
  );
  const indexPath = path.join(staticDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `Control Center build is missing (${indexPath}). Run npm run web:build.`,
    );
  }

  const server = http.createServer(async (req, res) => {
    const method = (req.method || 'GET').toUpperCase();
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const requestPath = decodeURIComponent(url.pathname || '/');

    if (method === 'GET' && requestPath === '/api/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    // Note: /api/hal/* routes are handled in their own block below with the
    // same rule: mutating methods require bearer auth in EVERY access mode,
    // read-only GETs may stay auth-free in localhost mode.
    if (
      requestPath.startsWith('/api/') &&
      !requestPath.startsWith('/api/hal/')
    ) {
      const isMutatingMethod =
        method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
      if (!isAuthorized(req, isMutatingMethod || authRequired, authToken)) {
        res.setHeader('WWW-Authenticate', 'Bearer');
        sendJson(res, 401, {
          ok: false,
          error: `Unauthorized. Bearer token required for mutating requests. Token file: ${ccTokenFile}`,
        });
        return;
      }

      if (requestPath === '/api/runtime/status') {
        if (method !== 'GET') {
          sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          return;
        }
        const runtime = adapters.getRuntimeStatus();
        const profile = adapters.getProfileStatus();
        const build = adapters.getBuildInfo();
        const gateway = adapters.getGatewayStatus();
        sendJson(res, 200, {
          ok: true,
          serverTime: new Date().toISOString(),
          runtime,
          profile,
          build,
          web: {
            accessMode: options.accessMode,
            host: options.host,
            port: options.port,
            authRequired,
          },
          gateway: {
            ...gateway,
            wsUrl: resolveGatewayWsUrl(req, gateway),
          },
        });
        return;
      }

      if (requestPath === '/api/onboarding/status') {
        if (method !== 'GET') {
          sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          return;
        }
        if (!adapters.getOnboardingStatus) {
          sendJson(res, 200, {
            ok: true,
            onboarding: {
              active: false,
              providerPreset: 'manual',
              model: '(unset)',
              apiKeyConfigured: false,
              telegramBotConfigured: false,
              telegramAdminSecretConfigured: false,
              whatsappEnabled: false,
              configComplete: false,
            },
          });
          return;
        }
        sendJson(res, 200, {
          ok: true,
          onboarding: adapters.getOnboardingStatus(),
        });
        return;
      }

      if (requestPath === '/api/onboarding/configure') {
        if (method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          return;
        }
        if (!adapters.applyOnboardingConfig) {
          sendJson(res, 404, {
            ok: false,
            error: 'Onboarding config API unavailable',
          });
          return;
        }
        try {
          const payload = await readJsonBody<OnboardingConfigPayload>(req);
          const result = await adapters.applyOnboardingConfig(payload);
          sendJson(res, 200, {
            ok: result.ok,
            requiresRestart: result.requiresRestart,
            adminSecret: result.adminSecret,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          sendJson(res, 400, { ok: false, error: message });
        }
        return;
      }

      if (requestPath === '/api/profile') {
        if (method !== 'GET') {
          sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          return;
        }
        sendJson(res, 200, {
          ok: true,
          ...adapters.getProfileStatus(),
        });
        return;
      }

      if (requestPath === '/api/logs/recent') {
        if (method !== 'GET') {
          sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          return;
        }
        const target = (url.searchParams.get('target') || 'host').toLowerCase();
        const lines = parseLineCount(url.searchParams.get('lines'));
        const fileName =
          target === 'error' ? 'fft_nano.error.log' : 'fft_nano.log';
        const filePath = path.join(logsDir, fileName);
        const text = tailFile(filePath, lines);
        sendJson(res, 200, {
          ok: true,
          target,
          lines,
          filePath,
          content: text,
        });
        return;
      }

      if (requestPath === '/api/files/roots') {
        if (method !== 'GET') {
          sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          return;
        }
        sendJson(res, 200, {
          ok: true,
          roots: fileRoots.map((root) => ({
            id: root.id,
            label: root.label,
          })),
        });
        return;
      }

      if (requestPath === '/api/skills/catalog') {
        if (method !== 'GET') {
          sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          return;
        }
        const rootFilter = (url.searchParams.get('root') || '').trim();
        const query = (url.searchParams.get('q') || '').trim().toLowerCase();
        const roots = rootFilter
          ? skillsRoots.filter((root) => root.id === rootFilter)
          : skillsRoots;
        if (rootFilter && roots.length === 0) {
          sendJson(res, 400, {
            ok: false,
            error: `Unknown skill root: ${rootFilter}`,
          });
          return;
        }

        const groups = roots.map((root) => {
          const skills = scanSkillsCatalogForRoot(root)
            .filter((entry) => {
              if (!query) return true;
              const haystack =
                `${entry.name} ${entry.path} ${entry.description}`.toLowerCase();
              return haystack.includes(query);
            })
            .map((entry) => ({
              ...entry,
              rootId: root.id,
              rootLabel: root.label,
            }));
          return {
            root: {
              id: root.id,
              label: root.label,
            },
            skills,
          };
        });

        sendJson(res, 200, { ok: true, groups });
        return;
      }

      if (requestPath === '/api/files/tree') {
        if (method !== 'GET') {
          sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          return;
        }
        const rootId = (url.searchParams.get('root') || '').trim();
        const root = fileRootsById.get(rootId);
        if (!root) {
          sendJson(res, 400, {
            ok: false,
            error: `Unknown file root: ${rootId}`,
          });
          return;
        }
        const relPath = normalizeSubPath(url.searchParams.get('path') || '.');
        try {
          const dirPath = ensureRealPathWithinRoot(
            root.path,
            ensureWithinRoot(root.path, relPath),
          );
          const stat = fs.statSync(dirPath);
          if (!stat.isDirectory()) {
            sendJson(res, 400, {
              ok: false,
              error: 'Requested path is not a directory',
            });
            return;
          }
          const entries = listDirectoryEntries(dirPath).map((entry) => ({
            ...entry,
            relPath: path.posix.join(
              relPath === '.' ? '' : relPath,
              entry.relPath,
            ),
          }));
          sendJson(res, 200, {
            ok: true,
            root: { id: root.id, label: root.label },
            path: relPath,
            entries,
          });
        } catch (err) {
          sendJson(res, 400, {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        return;
      }

      if (requestPath === '/api/files/read') {
        if (method !== 'GET') {
          sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          return;
        }
        const rootId = (url.searchParams.get('root') || '').trim();
        const root = fileRootsById.get(rootId);
        if (!root) {
          sendJson(res, 400, {
            ok: false,
            error: `Unknown file root: ${rootId}`,
          });
          return;
        }
        const relPath = normalizeSubPath(url.searchParams.get('path') || '');
        try {
          const filePath = ensureRealPathWithinRoot(
            root.path,
            ensureWithinRoot(root.path, relPath),
          );
          const stat = fs.statSync(filePath);
          if (!stat.isFile()) {
            sendJson(res, 400, {
              ok: false,
              error: 'Requested path is not a file',
            });
            return;
          }
          if (stat.size > MAX_FILE_READ_BYTES) {
            sendJson(res, 413, {
              ok: false,
              error: `File is larger than ${MAX_FILE_READ_BYTES} bytes`,
            });
            return;
          }
          const content = fs.readFileSync(filePath, 'utf-8');
          sendJson(res, 200, {
            ok: true,
            root: { id: root.id, label: root.label },
            path: relPath,
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            content,
          });
        } catch (err) {
          sendJson(res, 400, {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        return;
      }

      if (requestPath === '/api/files/write') {
        if (method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          return;
        }
        try {
          const body = await readJsonBody<{
            root?: string;
            path?: string;
            content?: string;
          }>(req);
          const rootId = (body.root || '').trim();
          const root = fileRootsById.get(rootId);
          if (!root) {
            sendJson(res, 400, {
              ok: false,
              error: `Unknown file root: ${rootId}`,
            });
            return;
          }
          const relPath = normalizeSubPath(body.path || '');
          const content = typeof body.content === 'string' ? body.content : '';
          if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_WRITE_BYTES) {
            sendJson(res, 413, {
              ok: false,
              error: `Content exceeds ${MAX_FILE_WRITE_BYTES} bytes`,
            });
            return;
          }
          // Roots may be created lazily after startup; create on first write.
          fs.mkdirSync(root.path, { recursive: true });
          const filePath = ensureWithinRoot(root.path, relPath);
          ensureWritableParentDirWithinRoot(root.path, filePath);
          ensureWritePathWithinRoot(root.path, filePath);
          fs.writeFileSync(filePath, content, 'utf-8');
          const stat = fs.statSync(filePath);
          sendJson(res, 200, {
            ok: true,
            root: { id: root.id, label: root.label },
            path: relPath,
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
          });
        } catch (err) {
          sendJson(res, 400, {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        return;
      }

      if (requestPath === '/api/update') {
        if (method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          return;
        }
        if (!adapters.hostUpdate) {
          sendJson(res, 501, {
            ok: false,
            error: 'Update not available',
          });
          return;
        }
        try {
          const result = adapters.hostUpdate();
          sendJson(res, result.ok ? 200 : 500, {
            ok: result.ok,
            text: result.text,
          });
        } catch (err) {
          sendJson(res, 500, {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        return;
      }

      sendJson(res, 404, { ok: false, error: 'Not found' });
      return;
    }

    // HAL API routes
    if (requestPath.startsWith('/api/hal/')) {
      // SECURITY: mutating HAL routes drive real hardware (relays, discovery,
      // cameras) and always require bearer auth regardless of accessMode.
      // Read-only GETs may stay auth-free in localhost mode.
      const isMutatingMethod =
        method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
      if (!isAuthorized(req, isMutatingMethod || authRequired, authToken)) {
        res.setHeader('WWW-Authenticate', 'Bearer');
        sendJson(res, 401, {
          ok: false,
          error: `Unauthorized. Bearer token required for mutating requests. Token file: ${ccTokenFile}`,
        });
        return;
      }
      const path = requestPath.slice('/api/hal'.length);

      // GET /api/hal/state — full HAL snapshot
      if (path === '/state' && method === 'GET') {
        const { halRegistry } = await import('../hal/registry.js');
        const { halSensors } = await import('../hal/sensors.js');
        const { halDecisions } = await import('../hal/decisions.js');
        const devices = halRegistry.list();
        const sensorSnapshots: Record<string, any> = {};
        for (const dev of devices.filter((d: any) => d.type === 'sensor')) {
          sensorSnapshots[dev.id] = {
            temperature: halSensors.latest(dev.id, 'temperature'),
            humidity: halSensors.latest(dev.id, 'humidity'),
          };
        }
        sendJson(res, 200, {
          devices,
          sensorSnapshots,
          recentDecisions: halDecisions.recent(10),
        });
        return;
      }

      // GET /api/hal/devices — list all devices
      if (path === '/devices' && method === 'GET') {
        const { halRegistry } = await import('../hal/registry.js');
        sendJson(res, 200, halRegistry.list());
        return;
      }

      // POST /api/hal/devices/:id/control — { action: 'on' | 'off' }
      if (path.match(/^\/devices\/[^/]+\/control$/) && method === 'POST') {
        const deviceId = path.split('/')[2];
        let body: any;
        try {
          body = await readJsonBody(req);
        } catch {
          body = {};
        }
        const action = body.action;
        if (action !== 'on' && action !== 'off') {
          sendJson(res, 400, { error: 'action must be "on" or "off"' });
          return;
        }
        try {
          // Unified actuation chokepoint: e-stop gate, advisory policy check,
          // safety audit entry and relay log (triggered_by 'web-ui').
          const { executeActuation } = await import('../safety/verifier.js');
          const outcome = await executeActuation({
            deviceId,
            action,
            triggeredBy: 'web-ui',
            source: 'manual',
          });
          if (!outcome.executed) {
            sendJson(res, 409, { ok: false, error: outcome.reason });
            return;
          }
          sendJson(res, 200, { ok: true });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // POST /api/hal/devices/discover — { subnet: string }
      if (path === '/devices/discover' && method === 'POST') {
        const { discoverDevices, autoRegisterDiscovered } =
          await import('../hal/discovery.js');
        let body: any;
        try {
          body = await readJsonBody(req);
        } catch {
          body = {};
        }
        const subnet = body.subnet || process.env.HAL_SUBNET || '192.168.1';
        try {
          const found = await discoverDevices({ subnet });
          await autoRegisterDiscovered(found);
          sendJson(res, 200, { ok: true, found: found.length, devices: found });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/hal/sensors/latest — latest readings
      if (path === '/sensors/latest' && method === 'GET') {
        const { halRegistry } = await import('../hal/registry.js');
        const { halSensors } = await import('../hal/sensors.js');
        const devices = halRegistry
          .list()
          .filter((d: any) => d.type === 'sensor');
        const readings: any[] = [];
        for (const dev of devices) {
          const temp = halSensors.latest(dev.id, 'temperature');
          const hum = halSensors.latest(dev.id, 'humidity');
          if (temp || hum)
            readings.push({ device: dev, temperature: temp, humidity: hum });
        }
        sendJson(res, 200, readings);
        return;
      }

      // GET /api/hal/sensors/history?device=:id&metric=:m&from=&to=
      if (path.startsWith('/sensors/history') && method === 'GET') {
        const { halSensors } = await import('../hal/sensors.js');
        const url = new URL(requestPath, 'http://localhost');
        const deviceId = url.searchParams.get('device');
        const metric = url.searchParams.get('metric') as any;
        const from =
          url.searchParams.get('from') ||
          new Date(Date.now() - 86400000).toISOString();
        const to = url.searchParams.get('to') || new Date().toISOString();
        if (!deviceId || !metric) {
          sendJson(res, 400, { error: 'device and metric are required' });
          return;
        }
        const history = halSensors.history(deviceId, metric, from, to);
        sendJson(res, 200, history);
        return;
      }

      // GET /api/hal/decisions?limit=20
      if (path.startsWith('/decisions') && method === 'GET') {
        const { halDecisions } = await import('../hal/decisions.js');
        const url = new URL(requestPath, 'http://localhost');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        sendJson(res, 200, halDecisions.recent(limit));
        return;
      }

      // POST /api/hal/decisions/:id/complete — { outcome: 'success' | 'failure' }
      if (path.match(/^\/decisions\/[^/]+\/complete$/) && method === 'POST') {
        const { halDecisions } = await import('../hal/decisions.js');
        const decisionId = path.split('/')[2];
        let body: any;
        try {
          body = await readJsonBody(req);
        } catch {
          body = {};
        }
        try {
          halDecisions.complete(decisionId, body.outcome);
          sendJson(res, 200, { ok: true });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // GET /api/hal/cameras — list camera devices
      if (path === '/cameras' && method === 'GET') {
        const { halRegistry } = await import('../hal/registry.js');
        const cameras = halRegistry
          .list()
          .filter((d: any) => d.type === 'camera');
        sendJson(res, 200, cameras);
        return;
      }

      // POST /api/hal/cameras/:id/capture — trigger a camera capture
      if (path.match(/^\/cameras\/[^/]+\/capture$/) && method === 'POST') {
        const { halRegistry } = await import('../hal/registry.js');
        const { V4L2Camera } = await import('../hal/camera.js');
        const deviceId = path.split('/')[2];
        const dev = halRegistry.get(deviceId);
        if (!dev || dev.type !== 'camera') {
          sendJson(res, 404, { error: 'Camera not found' });
          return;
        }
        try {
          const cam = new V4L2Camera({ device: dev.host || '/dev/video0' });
          const buf = cam.capture();
          const filename = `/tmp/hal_cam_${deviceId}_${Date.now()}.jpg`;
          const { writeFileSync } = await import('fs');
          writeFileSync(filename, buf);
          sendJson(res, 200, {
            ok: true,
            path: filename,
            size_bytes: buf.length,
          });
        } catch (err: any) {
          sendJson(res, 500, { error: err.message });
        }
        return;
      }

      // Catch-all for /api/hal/* — 404
      sendJson(res, 404, { error: 'HAL API endpoint not found' });
      return;
    }

    // Root redirect → FarmPal dashboard
    if (requestPath === '/') {
      res.writeHead(302, { Location: '/hal-ui/' });
      res.end();
      return;
    }

    // HAL UI static files (src/web/hal-ui/)
    if (requestPath.startsWith('/hal-ui')) {
      const halUiDir = path.resolve(process.cwd(), 'src', 'web', 'hal-ui');
      const halUiPath =
        requestPath === '/hal-ui' || requestPath === '/hal-ui/'
          ? path.join(halUiDir, 'index.html')
          : path.join(halUiDir, requestPath.replace('/hal-ui/', ''));
      if (!halUiPath.startsWith(halUiDir)) {
        sendJson(res, 403, { ok: false, error: 'Forbidden' });
        return;
      }
      const ext = path.extname(halUiPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      try {
        const body = fs.readFileSync(halUiPath);
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
          'Content-Length': body.byteLength,
        });
        res.end(body);
      } catch {
        // SPA fallback for deep routes
        try {
          const fallback = fs.readFileSync(path.join(halUiDir, 'index.html'));
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Content-Length': fallback.byteLength,
          });
          res.end(fallback);
        } catch {
          sendText(res, 404, 'Not found');
        }
      }
      return;
    }

    const normalizedPath =
      requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const candidatePath = path.resolve(staticDir, normalizedPath);
    if (!candidatePath.startsWith(staticDir)) {
      sendJson(res, 403, { ok: false, error: 'Forbidden' });
      return;
    }

    const servePath =
      fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()
        ? candidatePath
        : indexPath;

    const ext = path.extname(servePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    try {
      const body = fs.readFileSync(servePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
        'Content-Length': body.byteLength,
      });
      res.end(body);
    } catch (err) {
      logger.error({ err, servePath }, 'Failed to serve control center asset');
      sendText(res, 500, 'Internal server error');
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', (err) => reject(err));
    server.listen(options.port, options.host, () => resolve());
  });

  logger.info(
    {
      host: options.host,
      port: options.port,
      accessMode: options.accessMode,
      authRequired,
    },
    'FFT Control Center server listening',
  );

  return {
    host: options.host,
    port: options.port,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}
