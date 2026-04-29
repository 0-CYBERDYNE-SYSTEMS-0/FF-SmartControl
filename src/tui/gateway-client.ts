import { randomUUID } from 'crypto';

import { WebSocket } from 'ws';

import type {
  GatewayEventFrame,
  GatewayRequestFrame,
  GatewayResponseFrame,
} from './protocol.js';

const DEFAULT_GATEWAY_URL = `ws://127.0.0.1:${process.env.FFT_NANO_TUI_PORT || '3390'}`;
const REQUEST_TIMEOUT_MS = 30_000;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface GatewayClientOptions {
  url?: string;
  onEvent?: (event: GatewayEventFrame) => void;
  onClose?: (code: number, reason: string) => void;
  onReconnecting?: (attempt: number, maxAttempts: number) => void;
  onReconnected?: () => void;
  onReconnectFailed?: () => void;
}

export class GatewayClient {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly onEvent?: (event: GatewayEventFrame) => void;
  private readonly onClose?: (code: number, reason: string) => void;
  private readonly onReconnecting?: (
    attempt: number,
    maxAttempts: number,
  ) => void;
  private readonly onReconnected?: () => void;
  private readonly onReconnectFailed?: () => void;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxReconnectAttempts = 6;

  constructor(options: GatewayClientOptions = {}) {
    this.url = options.url || DEFAULT_GATEWAY_URL;
    this.onEvent = options.onEvent;
    this.onClose = options.onClose;
    this.onReconnecting = options.onReconnecting;
    this.onReconnected = options.onReconnected;
    this.onReconnectFailed = options.onReconnectFailed;
  }

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      // Wait for the in-flight connection to settle
      await new Promise<void>((resolve) => {
        const check = () => {
          if (!this.ws || this.ws.readyState === WebSocket.OPEN) {
            resolve();
            return;
          }
          if (
            this.ws.readyState === WebSocket.CLOSED ||
            this.ws.readyState === WebSocket.CLOSING
          ) {
            resolve();
            return;
          }
          setTimeout(check, 50);
        };
        check();
      });
      if (this.ws && (this.ws.readyState as number) === WebSocket.OPEN) return;
      // If the in-flight connection failed, fall through to create a new one
    }
    if (this.ws) {
      const ready = this.ws.readyState;
      if (ready === WebSocket.CLOSED || ready === WebSocket.CLOSING) {
        this.ws = null;
      } else if (ready !== WebSocket.CONNECTING) {
        try {
          this.ws.close();
        } catch {
          /* ignore */
        }
        this.ws = null;
      }
    }

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.once('open', () => resolve());
      ws.once('error', (err) => {
        reject(err instanceof Error ? err : new Error(String(err)));
      });

      ws.on('message', (raw) => this.handleMessage(raw.toString('utf8')));
      ws.on('close', (code, reason) => {
        this.ws = null;
        const reasonText = reason.toString('utf8');
        for (const [, pending] of this.pending) {
          clearTimeout(pending.timer);
          pending.reject(
            new Error(`Gateway closed (${code}): ${reasonText || 'no reason'}`),
          );
        }
        this.pending.clear();
        this.onClose?.(code, reasonText);
      });
    });
  }

  startReconnectLoop(): void {
    if (this.reconnectTimer || this.reconnectAttempt > 0) return;
    this.reconnectAttempt = 0;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      this.onReconnectFailed?.();
      return;
    }
    const delayMs = Math.min(1000 * 2 ** this.reconnectAttempt, 30000);
    this.reconnectAttempt++;
    this.onReconnecting?.(this.reconnectAttempt, this.maxReconnectAttempts);
    this.reconnectTimer = setTimeout(() => {
      void this.tryReconnect();
    }, delayMs);
  }

  private async tryReconnect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.reconnectAttempt = 0;
      this.reconnectTimer = null;
      this.onReconnected?.();
      return;
    }
    try {
      await this.connect();
      this.reconnectAttempt = 0;
      this.reconnectTimer = null;
      this.onReconnected?.();
    } catch {
      this.scheduleReconnect();
    }
  }

  stopReconnectLoop(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  async request<T>(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Gateway is not connected.');
    }

    const id = randomUUID();
    const frame: GatewayRequestFrame = {
      id,
      method,
      params,
    };

    const result = await new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Gateway request timeout: ${method}`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.ws?.send(JSON.stringify(frame), (err) => {
        if (!err) return;
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });

    return result as T;
  }

  close(): void {
    this.stopReconnectLoop();
    this.ws?.close();
    this.ws = null;
  }

  private handleMessage(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (!parsed || typeof parsed !== 'object') return;
    const frame = parsed as Record<string, unknown>;

    if (typeof frame.id === 'string' && typeof frame.ok === 'boolean') {
      const response: GatewayResponseFrame = {
        id: frame.id,
        ok: frame.ok,
        result: frame.result,
        error: typeof frame.error === 'string' ? frame.error : undefined,
      };
      const pending = this.pending.get(response.id);
      if (!pending) return;
      this.pending.delete(response.id);
      clearTimeout(pending.timer);
      if (response.ok) {
        pending.resolve(response.result);
      } else {
        pending.reject(new Error(response.error || 'Unknown gateway error'));
      }
      return;
    }

    if (typeof frame.event === 'string') {
      const eventFrame: GatewayEventFrame = {
        event: frame.event,
        payload: frame.payload,
      };
      this.onEvent?.(eventFrame);
    }
  }
}
