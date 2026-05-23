import { EventEmitter } from 'events';
import { ReadlineParser } from '@serialport/parser-readline';

export interface SerialSensorConfig {
  path: string; // e.g. '/dev/ttyUSB0'
  baudRate?: number; // default 9600
  protocol: 'bme280' | 'ds18b20' | 'atlas' | 'generic';
}

// BME280 I2C over USB adapter (returns T, H, P)
function parseBME280(
  line: string,
): { temperature: number; humidity: number; pressure: number } | null {
  // Format expected: "22.5,65.2,1013.25" (temp C, humidity %, pressure hPa)
  const parts = line.split(',').map(Number);
  if (parts.length >= 3 && parts.every((p) => !isNaN(p))) {
    return { temperature: parts[0], humidity: parts[1], pressure: parts[2] };
  }
  return null;
}

// Atlas Scientific EZO sensors (returns "value")
function parseAtlas(line: string): number | null {
  const cleaned = line.replace(/[^0-9.\-]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

export class SerialSensorReader extends EventEmitter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ports: Map<string, any> = new Map();

  async open(config: SerialSensorConfig): Promise<void> {
    const { path, baudRate = 9600, protocol } = config;

    // When HAL_SIM_MODE=1, use SerialMock instead of real hardware
    if (process.env.HAL_SIM_MODE === '1') {
      return this.openMock(config);
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SerialPort = require('serialport') as {
      new (path: string, opts: object): any;
    };
    const port = new SerialPort(path, {
      baudRate,
      autoOpen: false,
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    return new Promise((resolve, reject) => {
      port.open((err: Error | null | undefined) => {
        if (err) {
          reject(err);
          return;
        }
        console.log(`[HAL/Serial] Opened ${path} @ ${baudRate}`);
        this.ports.set(path, port);

        parser.on('data', (line: string) => {
          try {
            if (protocol === 'bme280') {
              const data = parseBME280(line);
              if (data) {
                this.emit('bme280_data', data);
              }
            } else if (protocol === 'atlas') {
              const val = parseAtlas(line);
              if (val !== null) {
                this.emit('atlas_data', val);
              }
            }
          } catch {}
        });

        port.on('error', (err: Error) =>
          console.error(`[HAL/Serial] ${path} error:`, err.message),
        );
        resolve();
      });
    });
  }

  private async openMock(config: SerialSensorConfig): Promise<void> {
    const { path, baudRate = 9600, protocol } = config;
    const { getSerialMock } = await import('./mock-transport/serial-mock.js');

    const mock = getSerialMock({
      path,
      protocol: protocol === 'ds18b20' ? 'ds18b20' : protocol,
      baudRate,
    });

    await mock.open();
    console.log(`[HAL/Serial] Opened mock ${path} @ ${baudRate}`);

    this.ports.set(path, mock);

    mock.on('data', (line: string) => {
      try {
        if (protocol === 'bme280') {
          const data = parseBME280(line);
          if (data) {
            this.emit('bme280_data', data);
          }
        } else if (protocol === 'atlas') {
          const val = parseAtlas(line);
          if (val !== null) {
            this.emit('atlas_data', val);
          }
        }
      } catch {}
    });

    mock.on('error', (err: Error) =>
      console.error(`[HAL/Serial] ${path} error:`, err.message),
    );
  }

  async read(
    deviceId: string,
    sensorId: string,
    metric: string,
    unit: string,
  ): Promise<number | null> {
    // For polled sensors (DS18B20 via 1-Wire file), read the w1_sys file
    if (sensorId.startsWith('w1_')) {
      return this.readDS18B20(sensorId);
    }
    return null;
  }

  private async readDS18B20(sensorId: string): Promise<number | null> {
    // 1-Wire DS18B20: /sys/bus/w1/devices/<sensor_id>/w1_slave
    try {
      const { readFileSync } = await import('fs');
      const content = readFileSync(
        `/sys/bus/w1/devices/${sensorId}/w1_slave`,
        'utf-8',
      );
      const matches = content.match(/t=(-?\d+)/);
      if (matches) return parseInt(matches[1]) / 1000;
    } catch {}
    return null;
  }

  close(path: string): void {
    this.ports.get(path)?.close();
    this.ports.delete(path);
  }
}

export const serialReader = new SerialSensorReader();
