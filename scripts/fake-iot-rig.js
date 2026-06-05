#!/usr/bin/env node
/**
 * Faithful virtual MQTT sensors for rung-1 testing. Publishes the SAME JSON
 * shape real Tasmota devices emit on `tele/<topic>/SENSOR`, so the controller's
 * real MQTT driver (src/hal/mqtt.ts) parses live telemetry exactly as it would
 * from hardware. Needs a broker: `brew install mosquitto && mosquitto` (1883).
 *
 *   MQTT_BROKER=mqtt://localhost:1883 node scripts/fake-iot-rig.js
 *
 * Subscribe the controller to e.g. `tele/tent_a_temp/SENSOR` with metric
 * `temperature` and it will read these values.
 */
import mqtt from 'mqtt';

const BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const PERIOD = Number(process.env.PERIOD_MS || 3000);

// topic -> generator of a faithful Tasmota SENSOR payload
const sensors = [
  { topic: 'tele/tent_a_temp/SENSOR', sensor: 'BME280', drift: bme(24, 50, 1013) },
  { topic: 'tele/tent_b_temp/SENSOR', sensor: 'BME280', drift: bme(26, 58, 1012) },
  { topic: 'tele/tent_a_co2/SENSOR', sensor: 'SCD40', drift: co2(800) },
  { topic: 'tele/tent_a_soil/SENSOR', sensor: 'ANALOG', drift: soil(35) },
];

function bme(t0, h0, p0) {
  let t = t0, h = h0, p = p0;
  return () => {
    t += (Math.random() - 0.5) * 0.4;
    h += (Math.random() - 0.5) * 1.0;
    p += (Math.random() - 0.5) * 0.3;
    return { Temperature: +t.toFixed(1), Humidity: +h.toFixed(1), Pressure: +p.toFixed(1) };
  };
}
function co2(c0) {
  let c = c0;
  return () => {
    c += (Math.random() - 0.5) * 40;
    return { CarbonDioxide: Math.round(Math.max(400, c)) };
  };
}
function soil(s0) {
  let s = s0;
  return () => {
    s += (Math.random() - 0.5) * 1.5;
    return { Moisture: +Math.max(0, Math.min(100, s)).toFixed(1) };
  };
}

const client = mqtt.connect(BROKER, { clientId: `fake_iot_${Date.now()}`, clean: true });

client.on('connect', () => {
  console.log(`[fake-iot] connected ${BROKER}; publishing faithful Tasmota SENSOR JSON every ${PERIOD}ms`);
  const tick = () => {
    for (const s of sensors) {
      const payload = JSON.stringify({ Time: new Date().toISOString(), [s.sensor]: s.drift() });
      client.publish(s.topic, payload, { qos: 1 });
      console.log(`[fake-iot] ${s.topic} ${payload}`);
    }
  };
  tick();
  setInterval(tick, PERIOD);
});

client.on('error', (e) => console.error('[fake-iot] error:', e.message));
process.on('SIGINT', () => client.end(() => process.exit(0)));
