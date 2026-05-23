/**
 * Native Kasa (TP-Link) protocol client — no CLI wrapper, no execSync.
 *
 * Supports two protocols:
 *   1. LEGACY  — TCP port 9999, XOR autokey encryption (HS100/HS110/KP115, etc.)
 *   2. KLAP    — HTTP port 80, AES-128-CBC with seed handshake (newer firmware)
 *
 * Auto-detection: tries legacy first (fastest), falls back to KLAP.
 * Completely async — nothing blocks the Node.js event loop.
 */

import * as net from 'node:net';
import * as crypto from 'node:crypto';

// ──────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────

export interface DevicePowerResponse {
  state: 'on' | 'off' | 'unknown';
  watts?: number;
}

interface KasaSysInfo {
  system?: {
    get_sysinfo?: {
      relay_state?: number;
      alias?: string;
      deviceId?: string;
      sw_ver?: string;
      hw_ver?: string;
      model?: string;
      [key: string]: unknown;
    };
  };
}

interface KasaEnergy {
  emeter?: {
    get_realtime?: {
      power_mw?: number; // milliwatts
      power?: number;     // watts
      voltage_mv?: number;
      current_ma?: number;
      total_wh?: number;
      [key: string]: unknown;
    };
  };
}

interface KasaError {
  system?: { get_sysinfo?: null };
  err_code?: number;
  err_msg?: string;
}

// ──────────────────────────────────────────────
//  Legacy protocol — TCP port 9999, XOR
// ──────────────────────────────────────────────

const LEGACY_PORT = 9999;
const XOR_INITIAL_KEY = 0xab; // 171

function xorEncrypt(plaintext: string): Buffer {
  const payload = Buffer.from(plaintext, 'utf-8');
  const length = Buffer.allocUnsafe(4);
  length.writeUInt32BE(payload.length, 0);

  let key = XOR_INITIAL_KEY;
  const ciphertext = Buffer.allocUnsafe(payload.length);
  for (let i = 0; i < payload.length; i++) {
    const a = key ^ payload[i];
    key = a;
    ciphertext[i] = a;
  }

  return Buffer.concat([length, ciphertext]);
}

function xorDecrypt(data: Buffer): string {
  let key = XOR_INITIAL_KEY;
  const result = Buffer.allocUnsafe(data.length);
  for (let i = 0; i < data.length; i++) {
    const a = key ^ data[i];
    key = data[i];
    result[i] = a;
  }
  return result.toString('utf-8');
}

function legacySend(host: string, jsonCmd: string, timeoutMs = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setNoDelay(true);
    const chunks: Buffer[] = [];

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Kasa legacy timeout connecting to ${host}:${LEGACY_PORT}`));
    }, timeoutMs);

    socket.connect(LEGACY_PORT, host, () => {
      const encrypted = xorEncrypt(jsonCmd);
      socket.write(encrypted);
    });

    socket.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    socket.on('close', () => {
      clearTimeout(timer);
      const raw = Buffer.concat(chunks);
      if (raw.length < 4) {
        reject(new Error(`Kasa legacy: empty response from ${host}`));
        return;
      }
      // First 4 bytes = payload length (big-endian)
      const payloadLen = raw.readUInt32BE(0);
      const payload = raw.subarray(4, 4 + payloadLen);
      try {
        const decrypted = xorDecrypt(payload);
        resolve(decrypted);
      } catch (err) {
        reject(new Error(`Kasa legacy: decrypt failed for ${host}: ${err}`));
      }
    });

    socket.on('error', (err: Error) => {
      clearTimeout(timer);
      socket.destroy();
      reject(err);
    });
  });
}

class LegacyKasaClient {
  constructor(private host: string) {}

  private async sendCommand(cmd: Record<string, unknown>): Promise<unknown> {
    const response = await legacySend(this.host, JSON.stringify(cmd), 5000);
    return JSON.parse(response);
  }

  async getSysInfo(): Promise<KasaSysInfo> {
    return this.sendCommand({ system: { get_sysinfo: {} } }) as Promise<KasaSysInfo>;
  }

  async getEnergy(): Promise<KasaEnergy> {
    return this.sendCommand({ emeter: { get_realtime: {} } }) as Promise<KasaEnergy>;
  }

  async setRelayState(state: 0 | 1): Promise<void> {
    await this.sendCommand({ system: { set_relay_state: { state } } });
  }

  async getPower(): Promise<DevicePowerResponse> {
    try {
      const [info, energy] = await Promise.all([
        this.getSysInfo().catch(() => null),
        this.getEnergy().catch(() => null),
      ]);

      const relayState = info?.system?.get_sysinfo?.relay_state;
      let state: 'on' | 'off' | 'unknown' = 'unknown';
      if (relayState === 1) state = 'on';
      else if (relayState === 0) state = 'off';

      let watts: number | undefined;
      if (energy?.emeter?.get_realtime?.power_mw !== undefined) {
        watts = Math.round(energy.emeter.get_realtime.power_mw / 1000);
      } else if (energy?.emeter?.get_realtime?.power !== undefined) {
        watts = Math.round(energy.emeter.get_realtime.power);
      }

      return { state, watts };
    } catch {
      return { state: 'unknown' };
    }
  }

  async setPower(on: boolean): Promise<void> {
    await this.setRelayState(on ? 1 : 0);
  }
}

// ──────────────────────────────────────────────
//  KLAP protocol — HTTP port 80, AES-128-CBC
// ──────────────────────────────────────────────

const KLAP_PORT = 80;

function md5(data: Buffer): Buffer {
  return crypto.createHash('md5').update(data).digest();
}

function sha256(data: Buffer): Buffer {
  return crypto.createHash('sha256').update(data).digest();
}

function sha1(data: Buffer): Buffer {
  return crypto.createHash('sha1').update(data).digest();
}

function generateAuthHash(username: string, password: string): Buffer {
  return md5(Buffer.concat([md5(Buffer.from(username, 'utf-8')), md5(Buffer.from(password, 'utf-8'))]));
}

function randomBytes(length: number): Buffer {
  return crypto.randomBytes(length);
}

interface KlapCipherParams {
  key: Buffer;
  iv: Buffer;
  sig: Buffer;
  seq: number;
}

function deriveCipherParams(localSeed: Buffer, remoteSeed: Buffer, authHash: Buffer): KlapCipherParams {
  const key = sha256(Buffer.concat([
    Buffer.from('lsk', 'utf-8'), localSeed, remoteSeed, authHash,
  ])).subarray(0, 16);

  const fullIv = sha256(Buffer.concat([
    Buffer.from('iv', 'utf-8'), localSeed, remoteSeed, authHash,
  ]));
  const iv = fullIv.subarray(0, 12);
  const seq = fullIv.readInt32BE(12);

  const sig = sha256(Buffer.concat([
    Buffer.from('ldk', 'utf-8'), localSeed, remoteSeed, authHash,
  ])).subarray(0, 28);

  return { key, iv, sig, seq };
}

function pkcs7Pad(data: Buffer, blockSize: number): Buffer {
  const padLen = blockSize - (data.length % blockSize);
  const padding = Buffer.alloc(padLen, padLen);
  return Buffer.concat([data, padding]);
}

function pkcs7Unpad(data: Buffer): Buffer {
  const padLen = data[data.length - 1];
  if (padLen === 0 || padLen > 16) return data;
  return data.subarray(0, data.length - padLen);
}

function aesEncrypt(plaintext: Buffer, params: KlapCipherParams): Buffer {
  const cipher = crypto.createCipheriv('aes-128-cbc', params.key, Buffer.concat([params.iv, writeInt32BE(params.seq)]));
  cipher.setAutoPadding(false);
  const padded = pkcs7Pad(plaintext, 16);
  return Buffer.concat([cipher.update(padded), cipher.final()]);
}

function aesDecrypt(ciphertext: Buffer, params: KlapCipherParams): string {
  const decipher = crypto.createDecipheriv('aes-128-cbc', params.key, Buffer.concat([params.iv, writeInt32BE(params.seq)]));
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const unpadded = pkcs7Unpad(decrypted);
  return unpadded.toString('utf-8');
}

function writeInt32BE(value: number): Buffer {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(value, 0);
  return buf;
}

function klapEncrypt(plaintext: string, params: KlapCipherParams): { payload: Buffer; seq: number } {
  params.seq += 1;
  const ciphertext = aesEncrypt(Buffer.from(plaintext, 'utf-8'), params);
  const signature = sha256(Buffer.concat([
    params.sig,
    writeInt32BE(params.seq),
    ciphertext,
  ]));
  return { payload: Buffer.concat([signature, ciphertext]), seq: params.seq };
}

function klapDecrypt(responseData: Buffer, params: KlapCipherParams): string {
  // Response is 32-byte signature + ciphertext
  const ciphertext = responseData.subarray(32);
  return aesDecrypt(ciphertext, params);
}

class KlapHttpClient {
  private cookieHeader: string | null = null;

  async post(url: string, data: Buffer, timeoutMs = 5000): Promise<{ status: number; data: Buffer; headers: Record<string, string> }> {
    const u = new URL(url);
    const isHttps = u.protocol === 'https:';

    return new Promise((resolve, reject) => {
      const mod = isHttps ? require('node:https') : require('node:http');
      const options = {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': data.length.toString(),
          ...(this.cookieHeader ? { Cookie: this.cookieHeader } : {}),
        },
        rejectUnauthorized: false,
        timeout: timeoutMs,
      };

      const req = mod.request(options, (res: any) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const rawHeaders = res.headers || {};
          const setCookie = rawHeaders['set-cookie'];
          if (setCookie) {
            // Extract TP_SESSIONID from Set-Cookie
            const match = (Array.isArray(setCookie) ? setCookie.join('; ') : setCookie)
              .match(/TP_SESSIONID=([^;]+)/);
            if (match) {
              this.cookieHeader = `TP_SESSIONID=${match[1]}`;
            }
          }
          resolve({ status: res.statusCode || 0, data: Buffer.concat(chunks), headers: rawHeaders });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`KLAP HTTP timeout to ${u.hostname}`));
      });

      req.write(data);
      req.end();
    });
  }
}

class KlapKasaClient {
  private params: KlapCipherParams | null = null;
  private host: string;
  private authHash: Buffer;
  private httpClient: KlapHttpClient;

  constructor(host: string, username = '', password = '') {
    this.host = host;
    this.authHash = generateAuthHash(username, password);
    this.httpClient = new KlapHttpClient();
  }

  private appUrl(path: string): string {
    return `http://${this.host}:${KLAP_PORT}/app/${path}`;
  }

  private async handshake1(): Promise<{ localSeed: Buffer; remoteSeed: Buffer }> {
    const localSeed = randomBytes(16);
    const url = this.appUrl('handshake1');

    const { status, data } = await this.httpClient.post(url, localSeed, 5000);

    if (status !== 200) {
      throw new Error(`KLAP handshake1 failed: HTTP ${status}`);
    }

    const remoteSeed = data.subarray(0, 16);
    const serverHash = data.subarray(16);

    // Verify server hash: sha256(local_seed + auth_hash)
    const expectedHash = sha256(Buffer.concat([localSeed, this.authHash]));
    if (!expectedHash.equals(serverHash)) {
      // Try blank credentials (empty username/password)
      const blankAuth = generateAuthHash('', '');
      const blankExpected = sha256(Buffer.concat([localSeed, blankAuth]));
      if (!blankExpected.equals(serverHash)) {
        throw new Error('KLAP handshake1: auth hash mismatch — check credentials');
      }
      this.authHash = blankAuth;
    }

    return { localSeed, remoteSeed };
  }

  private async handshake2(localSeed: Buffer, remoteSeed: Buffer): Promise<void> {
    const payload = sha256(Buffer.concat([remoteSeed, this.authHash]));
    const url = this.appUrl('handshake2');

    const { status } = await this.httpClient.post(url, payload, 5000);

    if (status !== 200) {
      throw new Error(`KLAP handshake2 failed: HTTP ${status}`);
    }

    this.params = deriveCipherParams(localSeed, remoteSeed, this.authHash);
  }

  private async ensureHandshake(): Promise<KlapCipherParams> {
    if (!this.params) {
      const { localSeed, remoteSeed } = await this.handshake1();
      await this.handshake2(localSeed, remoteSeed);
    }
    return this.params!;
  }

  private async sendCommand(cmd: Record<string, unknown>): Promise<unknown> {
    const params = await this.ensureHandshake();
    const json = JSON.stringify(cmd);
    const { payload, seq } = klapEncrypt(json, params);
    const url = `http://${this.host}:${KLAP_PORT}/app/request?seq=${seq}`;

    const { status, data } = await this.httpClient.post(url, payload, 5000);

    if (status !== 200) {
      // Force re-handshake on security error
      if (status === 403) {
        this.params = null;
      }
      throw new Error(`KLAP request failed: HTTP ${status}`);
    }

    const decrypted = klapDecrypt(data, params);
    return JSON.parse(decrypted);
  }

  async getPower(): Promise<DevicePowerResponse> {
    try {
      const info = await this.sendCommand({ system: { get_sysinfo: {} } }) as KasaSysInfo;
      const relayState = info?.system?.get_sysinfo?.relay_state;
      let state: 'on' | 'off' | 'unknown' = 'unknown';
      if (relayState === 1) state = 'on';
      else if (relayState === 0) state = 'off';

      let watts: number | undefined;
      try {
        const energy = await this.sendCommand({ emeter: { get_realtime: {} } }) as KasaEnergy;
        if (energy?.emeter?.get_realtime?.power_mw !== undefined) {
          watts = Math.round(energy.emeter.get_realtime.power_mw / 1000);
        } else if (energy?.emeter?.get_realtime?.power !== undefined) {
          watts = Math.round(energy.emeter.get_realtime.power);
        }
      } catch {
        // Energy monitoring not available on all devices
      }

      return { state, watts };
    } catch {
      return { state: 'unknown' };
    }
  }

  async setPower(on: boolean): Promise<void> {
    await this.sendCommand({ system: { set_relay_state: { state: on ? 1 : 0 } } });
  }
}

// ──────────────────────────────────────────────
//  KasaClient — auto-detecting unified client
// ──────────────────────────────────────────────

/**
 * Native Kasa client that tries the legacy XOR/TCP protocol first,
 * then falls back to KLAP if the legacy connection is refused.
 *
 * Replaces the old CLI-wrapper KasaClient that used execSync('kasa device ...').
 */
export class KasaClient {
  private host: string;
  private legacyClient: LegacyKasaClient;
  private klapClient: KlapKasaClient | null = null;
  private detectedProtocol: 'legacy' | 'klap' | null = null;

  constructor(host: string) {
    this.host = host;
    this.legacyClient = new LegacyKasaClient(host);
  }

  private async detectProtocol(): Promise<'legacy' | 'klap'> {
    if (this.detectedProtocol) return this.detectedProtocol;

    // Try legacy first (faster, covers ~90% of devices)
    try {
      await this.legacyClient.getSysInfo();
      this.detectedProtocol = 'legacy';
      return 'legacy';
    } catch {
      // Legacy failed, try KLAP
    }

    // Try KLAP (newer devices, port 80 HTTP)
    try {
      if (!this.klapClient) {
        this.klapClient = new KlapKasaClient(this.host);
      }
      await this.klapClient.getPower();
      this.detectedProtocol = 'klap';
      return 'klap';
    } catch (err) {
      throw new Error(`Kasa device ${this.host} unreachable via legacy or KLAP protocol: ${err}`);
    }
  }

  async getPower(): Promise<DevicePowerResponse> {
    try {
      const protocol = await this.detectProtocol();
      if (protocol === 'legacy') {
        return this.legacyClient.getPower();
      }
      return this.klapClient!.getPower();
    } catch {
      return { state: 'unknown' };
    }
  }

  async setPower(on: boolean): Promise<void> {
    const protocol = await this.detectProtocol();
    if (protocol === 'legacy') {
      await this.legacyClient.setPower(on);
    } else {
      await this.klapClient!.setPower(on);
    }
  }
}
