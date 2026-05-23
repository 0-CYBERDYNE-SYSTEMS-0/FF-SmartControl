/**
 * In-process MQTT broker mock for protocol simulation.
 *
 * Provides a minimal MQTT 3.1.1-compliant TCP broker that enables the
 * real `mqtt` client package to connect without external dependencies.
 * Handles CONNECT, PUBLISH, SUBSCRIBE, PINGREQ, and DISCONNECT packets.
 *
 * Simulates Tasmota/Shelly MQTT telemetry topics:
 *   tele/<device>/SENSOR   – periodic sensor readings
 *   stat/<device>/POWER     – power state updates
 *   tele/<device>/LWT       – last will (Online/Offline)
 *   tele/<device>/STATE     – full device state
 *
 * Fault injection: broker disconnect, message reordering, QoS drops.
 */

import * as net from 'node:net';
import { EventEmitter } from 'node:events';
import type { MockTransport, MockTransportFault, MockDeviceState } from './types.js';

// ── Types ───────────────────────────────────────────────────────────────────

export interface MqttMockConfig {
  /** Device identifier (used in topic prefix, e.g. 'tasmota_grow_light') */
  deviceId: string;
  /** Interval in ms between sensor telemetry publishes (default: 5000) */
  telemetryIntervalMs?: number;
  /** Sensor values to publish */
  sensorValues?: Record<string, number>;
  /** Initial power state */
  initialState?: 'on' | 'off';
  /** Whether to auto-generate sensor data with random walk */
  autoGenerate?: boolean;
}

interface ClientState {
  socket: net.Socket;
  clientId: string;
  connected: boolean;
  will?: { topic: string; payload: Buffer; qos: number; retain: boolean };
  cleanSession: boolean;
  keepAlive: number;
  lastPing: number;
}

interface Subscription {
  clientId: string;
  qos: number;
}

interface RetainedMessage {
  topic: string;
  payload: Buffer;
  qos: number;
}

interface MqttPacket {
  type: string;
  typeNum: number;
  flags: number;
  totalLength: number;
  remainingLength: number;
  variableHeader: Buffer;
  payload: Buffer;
}

type MqttFault =
  | 'broker_disconnect'
  | 'message_reorder'
  | 'qos_drop'
  | 'connect_refused'
  | 'none';

// ── MQTT Packet Constants ───────────────────────────────────────────────────

const MQTT_PACKET_TYPE: Record<number, string> = {
  1: 'CONNECT',
  2: 'CONNACK',
  3: 'PUBLISH',
  4: 'PUBACK',
  5: 'PUBREC',
  6: 'PUBREL',
  7: 'PUBCOMP',
  8: 'SUBSCRIBE',
  9: 'SUBACK',
  10: 'UNSUBSCRIBE',
  11: 'UNSUBACK',
  12: 'PINGREQ',
  13: 'PINGRESP',
  14: 'DISCONNECT',
};

// ── MQTT Mock Device ────────────────────────────────────────────────────────

export class MqttMock implements MockTransport {
  private server: net.Server | null = null;
  private port: number = 0;
  private clients: Map<string, ClientState> = new Map();
  private subscriptions: Map<string, Set<Subscription>> = new Map();
  private retained: Map<string, RetainedMessage> = new Map();
  private deviceState: MockDeviceState;
  private sensorValues: Record<string, number>;
  private telemetryTimer: ReturnType<typeof setInterval> | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private fault: MqttFault = 'none';
  private faultData: { reorderBuffer: Array<{ topic: string; payload: Buffer }> } = {
    reorderBuffer: [],
  };
  private _events = new EventEmitter();

  private readonly deviceId: string;
  private readonly telemetryIntervalMs: number;
  private readonly autoGenerate: boolean;
  private msgIdCounter = 0;

  constructor(config: MqttMockConfig) {
    this.deviceId = config.deviceId;
    this.telemetryIntervalMs = config.telemetryIntervalMs ?? 5000;
    this.autoGenerate = config.autoGenerate ?? true;
    this.sensorValues = config.sensorValues ?? {
      Temperature: 24.5,
      Humidity: 58.2,
      Pressure: 1013.2,
    };

    const isOn = config.initialState === 'on';
    this.deviceState = {
      on: isOn,
      watts: isOn ? 150 : 0,
      healthy: true,
      fault: null,
    };
  }

  // ── MockTransport Interface ───────────────────────────────────────────

  async start(): Promise<void> {
    if (this.running) return;

    return new Promise<void>((resolve, reject) => {
      this.server = net.createServer((socket) => this.handleConnection(socket));

      this.server.on('error', (err) => {
        this.running = false;
        reject(err);
      });

      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server!.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
        }
        this.running = true;

        // Start telemetry generation
        this.startTelemetry();

        // Start keep-alive checker
        this.startKeepAliveCheck();

        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.running || !this.server) return;

    // Publish LWT Offline for all devices
    for (const [, client] of this.clients) {
      this.publishToSubscribers(
        `tele/${this.deviceId}/LWT`,
        Buffer.from('Offline'),
        { qos: 1, retain: true },
      );
    }

    this.stopTelemetry();
    this.stopKeepAliveCheck();

    return new Promise<void>((resolve) => {
      this.server!.close(() => {
        this.clients.clear();
        this.subscriptions.clear();
        this.retained.clear();
        this.running = false;
        this.server = null;
        resolve();
      });
    });
  }

  getState(): MockDeviceState {
    return { ...this.deviceState, healthy: this.fault === 'none' };
  }

  setFault(fault: MockTransportFault): void {
    // Map MockTransportFault to internal MQTT faults
    switch (fault) {
      case 'connection_reset':
        this.fault = 'broker_disconnect';
        break;
      case 'http_timeout':
      case 'device_offline':
        this.fault = 'connect_refused';
        break;
      default:
        this.fault = 'none';
    }
    this.deviceState.healthy = this.fault === 'none';
    this.deviceState.fault = fault;
  }

  clearFault(): void {
    this.fault = 'none';
    this.deviceState.healthy = true;
    this.deviceState.fault = null;
    this.faultData.reorderBuffer = [];
  }

  isHealthy(): boolean {
    return this.fault === 'none';
  }

  getUrl(): string {
    return `mqtt://127.0.0.1:${this.port}`;
  }

  // ── MQTT-specific public API ──────────────────────────────────────────

  /** Get the assigned port (only valid after start()). */
  getPort(): number {
    return this.port;
  }

  /** Programmatically set device power state and publish stat update. */
  setPower(on: boolean, watts?: number): void {
    this.deviceState.on = on;
    this.deviceState.watts = watts ?? (on ? 150 : 0);

    const powerPayload = JSON.stringify({
      POWER: on ? 'ON' : 'OFF',
      Power: this.deviceState.watts,
    });
    this.publishToSubscribers(
      `stat/${this.deviceId}/POWER`,
      Buffer.from(powerPayload),
      { qos: 1, retain: false },
    );

    // Also publish full STATE
    this.publishDeviceState();
  }

  /** Get the EventEmitter for subscribing to internal events. */
  get events(): EventEmitter {
    return this._events;
  }

  /** Inject a raw message onto a topic (for testing). */
  injectMessage(topic: string, payload: string | Buffer): void {
    const buf = typeof payload === 'string' ? Buffer.from(payload) : payload;
    this.publishToSubscribers(topic, buf, { qos: 1, retain: false });
  }

  /** Set sensor values directly. */
  setSensorValues(values: Record<string, number>): void {
    this.sensorValues = { ...values };
  }

  /** Publish sensor telemetry immediately. */
  publishTelemetry(): void {
    if (this.fault === 'broker_disconnect' || this.fault === 'connect_refused') {
      return;
    }

    const sensorData: Record<string, unknown> = {
      Time: new Date().toISOString(),
      ...this.sensorValues,
    };

    const payload = JSON.stringify(sensorData);
    const qos = this.fault === 'qos_drop' ? 0 : 1;
    this.publishToSubscribers(
      `tele/${this.deviceId}/SENSOR`,
      Buffer.from(payload),
      { qos, retain: false },
    );
  }

  /** Publish full device state. */
  publishDeviceState(): void {
    const stateData = {
      Time: new Date().toISOString(),
      Uptime: '0T00:00:10',
      POWER: this.deviceState.on ? 'ON' : 'OFF',
      Power: this.deviceState.watts,
      Wifi: { AP: 1, SSId: 'MockNetwork', BSSId: 'AA:BB:CC:DD:EE:FF', Channel: 6, RSSI: 58 },
    };

    this.publishToSubscribers(
      `tele/${this.deviceId}/STATE`,
      Buffer.from(JSON.stringify(stateData)),
      { qos: 1, retain: false },
    );
  }

  // ── Telemetry Generation ──────────────────────────────────────────────

  private startTelemetry(): void {
    if (this.telemetryTimer) return;

    // Publish LWT Online immediately
    this.publishToSubscribers(
      `tele/${this.deviceId}/LWT`,
      Buffer.from('Online'),
      { qos: 1, retain: true },
    );

    this.publishDeviceState();
    this.publishTelemetry();

    this.telemetryTimer = setInterval(() => {
      if (!this.running) return;
      if (this.fault === 'broker_disconnect') return;

      // Auto-generate sensor data with random walk
      if (this.autoGenerate) {
        this.sensorValues.Temperature = this.walk(
          this.sensorValues.Temperature ?? 24.5,
          0.5,
          15,
          35,
        );
        this.sensorValues.Humidity = this.walk(
          this.sensorValues.Humidity ?? 58.2,
          2,
          20,
          95,
        );
        this.sensorValues.Pressure = this.walk(
          this.sensorValues.Pressure ?? 1013.2,
          0.5,
          980,
          1040,
        );
      }

      // Handle message reorder fault: buffer messages and release reordered
      if (this.fault === 'message_reorder') {
        const sensorData = {
          Time: new Date().toISOString(),
          ...this.sensorValues,
        };
        const payload = Buffer.from(JSON.stringify(sensorData));
        this.faultData.reorderBuffer.push({
          topic: `tele/${this.deviceId}/SENSOR`,
          payload,
        });

        // Every 3 buffered messages, release them in reverse order
        if (this.faultData.reorderBuffer.length >= 3) {
          const reordered = this.faultData.reorderBuffer.reverse();
          for (const msg of reordered) {
            const qos = 1;
            this.publishToSubscribers(msg.topic, msg.payload, { qos, retain: false });
          }
          this.faultData.reorderBuffer = [];
        }
      } else {
        this.publishTelemetry();
      }

      this._events.emit('telemetry', {
        deviceId: this.deviceId,
        values: this.sensorValues,
        timestamp: Date.now(),
      });
    }, this.telemetryIntervalMs);
  }

  private stopTelemetry(): void {
    if (this.telemetryTimer) {
      clearInterval(this.telemetryTimer);
      this.telemetryTimer = null;
    }
  }

  private walk(current: number, step: number, min: number, max: number): number {
    const delta = (Math.random() - 0.5) * step;
    const next = +(current + delta).toFixed(1);
    return Math.max(min, Math.min(max, next));
  }

  private startKeepAliveCheck(): void {
    this.keepAliveTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, client] of this.clients) {
        if (client.keepAlive > 0 && now - client.lastPing > client.keepAlive * 1500) {
          // Client timed out
          client.socket.destroy();
          this.clients.delete(id);
          this.removeClientSubscriptions(id);

          // Publish LWT if set
          if (client.will) {
            this.publishToSubscribers(client.will.topic, client.will.payload, {
              qos: client.will.qos,
              retain: client.will.retain,
            });
          }
        }
      }
    }, 5000);
  }

  private stopKeepAliveCheck(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  // ── Connection Handling ───────────────────────────────────────────────

  private handleConnection(socket: net.Socket): void {
    if (this.fault === 'connect_refused') {
      socket.destroy();
      return;
    }

    const clientId = `mock_client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const client: ClientState = {
      socket,
      clientId,
      connected: false,
      cleanSession: true,
      keepAlive: 60,
      lastPing: Date.now(),
    };

    this.clients.set(clientId, client);

    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length >= 2) {
        const packet = this.tryParsePacket(buffer);
        if (!packet) break; // Need more data

        buffer = buffer.subarray(packet.totalLength);
        this.handlePacket(client, packet);
      }
    });

    socket.on('error', () => {
      this.clients.delete(clientId);
      this.removeClientSubscriptions(clientId);
    });

    socket.on('close', () => {
      this.clients.delete(clientId);
      this.removeClientSubscriptions(clientId);

      // Publish LWT if set
      if (client.will) {
        this.publishToSubscribers(client.will.topic, client.will.payload, {
          qos: client.will.qos,
          retain: client.will.retain,
        });
      }
    });
  }

  // ── MQTT Packet Parsing ───────────────────────────────────────────────

  private tryParsePacket(buffer: Buffer): MqttPacket | null {
    if (buffer.length < 2) return null;

    const byte0 = buffer[0];
    const typeNum = byte0 >> 4;
    const flags = byte0 & 0x0f;

    // Decode remaining length
    let multiplier = 1;
    let remainingLength = 0;
    let pos = 1;

    for (let i = 0; i < 4; i++) {
      if (pos >= buffer.length) return null;
      const byte = buffer[pos++];
      remainingLength += (byte & 0x7f) * multiplier;
      if ((byte & 0x80) === 0) break;
      multiplier *= 128;
    }

    const totalLength = pos + remainingLength;
    if (buffer.length < totalLength) return null;

    const variableHeaderAndPayload = buffer.subarray(pos, totalLength);

    return {
      type: MQTT_PACKET_TYPE[typeNum] ?? `UNKNOWN_${typeNum}`,
      typeNum,
      flags,
      totalLength,
      remainingLength,
      variableHeader: variableHeaderAndPayload,
      payload: Buffer.alloc(0),
    };
  }

  private handlePacket(client: ClientState, packet: MqttPacket): void {
    switch (packet.typeNum) {
      case 1: // CONNECT
        this.handleConnect(client, packet);
        break;
      case 3: // PUBLISH
        this.handlePublish(client, packet);
        break;
      case 8: // SUBSCRIBE
        this.handleSubscribe(client, packet);
        break;
      case 12: // PINGREQ
        this.handlePingreq(client);
        break;
      case 14: // DISCONNECT
        this.handleDisconnect(client);
        break;
      default:
        break;
    }
  }

  // ── MQTT Handlers ─────────────────────────────────────────────────────

  private handleConnect(client: ClientState, packet: MqttPacket): void {
    const buf = packet.variableHeader;

    // Parse protocol name (2-byte length prefix + UTF-8 string)
    if (buf.length < 2) {
      client.socket.destroy();
      return;
    }
    const protoLen = buf.readUInt16BE(0);
    let offset = 2 + protoLen;
    if (offset > buf.length) {
      client.socket.destroy();
      return;
    }

    // Protocol level + connect flags = 2 bytes
    if (offset + 1 >= buf.length) {
      client.socket.destroy();
      return;
    }
    offset++; // skip protocol level
    const connectFlags = buf[offset++];
    const hasWill = (connectFlags & 0x04) !== 0;
    client.cleanSession = (connectFlags & 0x02) !== 0;

    // Keep alive
    if (offset + 1 >= buf.length) {
      client.socket.destroy();
      return;
    }
    client.keepAlive = buf.readUInt16BE(offset);
    offset += 2;

    // Parse client ID
    if (offset + 1 >= buf.length) {
      client.socket.destroy();
      return;
    }
    const clientIdLen = buf.readUInt16BE(offset);
    offset += 2;
    if (offset + clientIdLen > buf.length) {
      client.socket.destroy();
      return;
    }
    client.clientId = buf.subarray(offset, offset + clientIdLen).toString('utf8');
    offset += clientIdLen;

    // Parse will if present
    if (hasWill) {
      if (offset + 1 >= buf.length) {
        client.socket.destroy();
        return;
      }
      const willTopicLen = buf.readUInt16BE(offset);
      offset += 2;
      if (offset + willTopicLen > buf.length) {
        client.socket.destroy();
        return;
      }
      const willTopic = buf.subarray(offset, offset + willTopicLen).toString('utf8');
      offset += willTopicLen;

      if (offset + 1 >= buf.length) {
        client.socket.destroy();
        return;
      }
      const willPayloadLen = buf.readUInt16BE(offset);
      offset += 2;
      if (offset + willPayloadLen > buf.length) {
        client.socket.destroy();
        return;
      }
      const willPayload = buf.subarray(offset, offset + willPayloadLen);
      offset += willPayloadLen;

      client.will = {
        topic: willTopic,
        payload: willPayload,
        qos: (connectFlags & 0x18) >> 3,
        retain: (connectFlags & 0x20) !== 0,
      };
    }

    client.connected = true;
    client.lastPing = Date.now();

    // Send CONNACK: Connection Accepted
    const connack = Buffer.from([0x20, 0x02, 0x00, 0x00]);
    client.socket.write(connack);

    this._events.emit('client_connect', { clientId: client.clientId });
  }

  private handleSubscribe(client: ClientState, packet: MqttPacket): void {
    const buf = packet.variableHeader;
    if (buf.length < 2) return;

    const packetId = buf.readUInt16BE(0);
    let offset = 2;

    const qosResults: number[] = [];

    // Parse topic filters
    while (offset < buf.length) {
      // Topic length
      if (offset + 1 >= buf.length) break;
      const topicLen = buf.readUInt16BE(offset);
      offset += 2;

      if (offset + topicLen > buf.length) break;
      const topic = buf.subarray(offset, offset + topicLen).toString('utf8');
      offset += topicLen;

      // Requested QoS
      if (offset >= buf.length) break;
      const requestedQos = buf[offset++];
      const grantedQos = this.fault === 'qos_drop' ? Math.min(requestedQos, 0) : requestedQos;
      qosResults.push(grantedQos);

      // Add subscription
      if (!this.subscriptions.has(topic)) {
        this.subscriptions.set(topic, new Set());
      }
      this.subscriptions.get(topic)!.add({
        clientId: client.clientId,
        qos: grantedQos,
      });

      // Send retained message if available
      const retained = this.retained.get(topic);
      if (retained) {
        this.sendPublish(client, retained.topic, retained.payload, retained.qos, true);
      }
    }

    // Send SUBACK
    const subackPayload = Buffer.alloc(2 + qosResults.length);
    subackPayload.writeUInt16BE(packetId, 0);
    for (let i = 0; i < qosResults.length; i++) {
      subackPayload[2 + i] = qosResults[i];
    }

    const remainingLength = subackPayload.length;
    const fixedHeader = Buffer.from([0x90, remainingLength]);
    client.socket.write(Buffer.concat([fixedHeader, subackPayload]));
  }

  private handlePublish(client: ClientState, packet: MqttPacket): void {
    const buf = packet.variableHeader;
    if (buf.length < 2) return;

    const topicLen = buf.readUInt16BE(0);
    if (2 + topicLen > buf.length) return;

    const topic = buf.subarray(2, 2 + topicLen).toString('utf8');
    let offset = 2 + topicLen;

    // Packet identifier for QoS > 0
    if (packet.flags & 0x06) {
      if (offset + 1 >= buf.length) return;
      const packetId = buf.readUInt16BE(offset);
      offset += 2;

      // Send PUBACK for QoS 1
      if ((packet.flags & 0x06) === 0x02) {
        const puback = Buffer.from([0x40, 0x02, (packetId >> 8) & 0xff, packetId & 0xff]);
        client.socket.write(puback);
      }
    }

    const payload = buf.subarray(offset);
    const retain = (packet.flags & 0x01) !== 0;

    // Store retained message
    if (retain) {
      if (payload.length === 0) {
        this.retained.delete(topic);
      } else {
        const qos = (packet.flags & 0x06) >> 1;
        this.retained.set(topic, { topic, payload, qos });
      }
    }

    // Forward to subscribers
    const qos = (packet.flags & 0x06) >> 1;
    this.publishToSubscribers(topic, payload, { qos, retain });

    this._events.emit('message', {
      topic,
      payload: payload.toString(),
      clientId: client.clientId,
    });
  }

  private handlePingreq(client: ClientState): void {
    client.lastPing = Date.now();
    const pingresp = Buffer.from([0xd0, 0x00]);
    client.socket.write(pingresp);
  }

  private handleDisconnect(client: ClientState): void {
    client.connected = false;
    client.socket.end();
    this.clients.delete(client.clientId);
    this.removeClientSubscriptions(client.clientId);
  }

  // ── Publishing ────────────────────────────────────────────────────────

  private publishToSubscribers(
    topic: string,
    payload: Buffer,
    opts: { qos: number; retain: boolean },
  ): void {
    // Store retained if needed
    if (opts.retain) {
      this.retained.set(topic, { topic, payload, qos: opts.qos });
    }

    const subs = this.subscriptions.get(topic);
    if (subs && subs.size > 0) {
      for (const sub of subs) {
        const c = this.clients.get(sub.clientId);
        if (!c || !c.connected) continue;
        const effectiveQos = this.fault === 'qos_drop' ? 0 : Math.min(opts.qos, sub.qos);
        this.sendPublish(c, topic, payload, effectiveQos, opts.retain);
      }
    }

    // Also check wildcard subscriptions
    this.publishToWildcard(topic, payload, opts);
  }

  private publishToWildcard(
    topic: string,
    payload: Buffer,
    opts: { qos: number; retain: boolean },
  ): void {
    for (const [filter, subs] of this.subscriptions) {
      if (!filter.includes('+') && !filter.includes('#')) continue;

      if (this.topicMatches(filter, topic)) {
        for (const sub of subs) {
          const c = this.clients.get(sub.clientId);
          if (!c || !c.connected) continue;
          const effectiveQos = this.fault === 'qos_drop' ? 0 : Math.min(opts.qos, sub.qos);
          this.sendPublish(c, topic, payload, effectiveQos, opts.retain);
        }
      }
    }
  }

  private sendPublish(
    client: ClientState,
    topic: string,
    payload: Buffer,
    qos: number,
    retain: boolean,
  ): void {
    const topicBuf = Buffer.from(topic, 'utf8');
    const topicLenBuf = Buffer.alloc(2);
    topicLenBuf.writeUInt16BE(topicBuf.length, 0);

    let packetIdBytes = Buffer.alloc(0);
    if (qos > 0) {
      this.msgIdCounter = (this.msgIdCounter + 1) % 65536;
      const pid = this.msgIdCounter || 1;
      packetIdBytes = Buffer.alloc(2);
      packetIdBytes.writeUInt16BE(pid, 0);
    }

    const variableAndPayload = Buffer.concat([topicLenBuf, topicBuf, packetIdBytes, payload]);

    const flags = (retain ? 0x01 : 0) | ((qos & 0x03) << 1);
    const fixedHeaderByte = 0x30 | flags;

    // Encode remaining length
    let remainingLength = variableAndPayload.length;
    const rlBytes: number[] = [];
    do {
      let byte = remainingLength % 128;
      remainingLength = Math.floor(remainingLength / 128);
      if (remainingLength > 0) byte |= 0x80;
      rlBytes.push(byte);
    } while (remainingLength > 0);

    const packet = Buffer.concat([
      Buffer.from([fixedHeaderByte]),
      Buffer.from(rlBytes),
      variableAndPayload,
    ]);

    try {
      client.socket.write(packet);
    } catch {
      // Socket may be closed
    }
  }

  private topicMatches(filter: string, topic: string): boolean {
    const filterParts = filter.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < filterParts.length; i++) {
      const fp = filterParts[i];
      const tp = topicParts[i];

      if (fp === '#') return true; // Multi-level wildcard matches everything below
      if (fp === '+') {
        if (tp === undefined) return false;
        continue;
      }
      if (fp !== tp) return false;
    }

    return filterParts.length === topicParts.length;
  }

  private removeClientSubscriptions(clientId: string): void {
    for (const [, subs] of this.subscriptions) {
      for (const sub of subs) {
        if (sub.clientId === clientId) {
          subs.delete(sub);
        }
      }
    }
  }
}

// ── Singleton-like MqttMock Manager ─────────────────────────────────────────

let mockBrokerInstance: MqttMock | null = null;

/** Get or create the singleton MQTT mock broker. */
export function getMqttMock(config?: MqttMockConfig): MqttMock {
  if (!mockBrokerInstance) {
    if (!config) {
      throw new Error('MqttMock requires config on first creation');
    }
    mockBrokerInstance = new MqttMock(config);
  }
  return mockBrokerInstance;
}

/** Reset the singleton MQTT mock broker. */
export function resetMqttMock(): void {
  if (mockBrokerInstance) {
    mockBrokerInstance.stop().catch(() => {});
    mockBrokerInstance = null;
  }
}
