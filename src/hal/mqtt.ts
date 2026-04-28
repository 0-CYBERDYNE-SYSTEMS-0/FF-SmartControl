import { connect, MqttClient } from 'mqtt';
import { halSensors } from './sensors.js';
import { halRegistry } from './registry.js';
import type { MetricType, SensorUnit, SensorQuality } from './types.js';

const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;

export interface MQTTSensorConfig {
  topic: string; // e.g. 'sensors/living-room/temperature/c/state'
  device_id: string; // maps to a hal_device id
  metric: MetricType;
  unit: SensorUnit;
}

export class MQTTSubscriber {
  private client: MqttClient | null = null;
  private subscriptions: MQTTSensorConfig[] = [];

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: any = {
        clientId: `fft_nano_hal_${Date.now()}`,
        clean: true,
        connectTimeout: 10000,
      };
      if (MQTT_USERNAME) {
        options.username = MQTT_USERNAME;
        options.password = MQTT_PASSWORD;
      }

      this.client = connect(MQTT_BROKER, options);

      this.client.on('connect', () => {
        console.log('[HAL/MQTT] Connected to broker');
        for (const sub of this.subscriptions) {
          this.client!.subscribe(sub.topic, { qos: 1 }, (err) => {
            if (err)
              console.error(
                `[HAL/MQTT] Subscribe error for ${sub.topic}:`,
                err.message,
              );
          });
        }
        resolve();
      });

      this.client.on('message', (topic: string, payload: Buffer) => {
        this.handleMessage(topic, payload);
      });

      this.client.on('error', (err) => {
        console.error('[HAL/MQTT] Error:', err.message);
        reject(err);
      });
    });
  }

  private handleMessage(topic: string, payload: Buffer): void {
    const value = parseFloat(payload.toString());
    if (isNaN(value)) return;

    const sub = this.subscriptions.find((s) => s.topic === topic);
    if (!sub) return;

    try {
      halSensors.store({
        device_id: sub.device_id,
        metric: sub.metric,
        unit: sub.unit,
        value,
        quality: 'good',
        read_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[HAL/MQTT] store error:', err);
    }
  }

  addSubscription(config: MQTTSensorConfig): void {
    this.subscriptions.push(config);
    if (this.client?.connected) {
      this.client.subscribe(config.topic, { qos: 1 });
    }
  }

  stop(): void {
    this.client?.end();
  }
}

export const mqttSubscriber = new MQTTSubscriber();
