---
name: hal-read-sensor
description: Read the latest value from a specific sensor device — temperature, humidity, soil moisture, light, CO2, water level, pH, or weight.
triggers:
  - "read sensor"
  - "check temperature"
  - "what is the humidity"
  - "sensor reading"
  - "soil moisture"
---

# HAL Read Sensor

Read the latest value from a registered sensor.

## Parameters
- `device_id` (string, required): The HAL device ID or label of the sensor
- `metric` (string, required): One of: temperature | humidity | soil_moisture | light | co2 | water_level | ph | weight

## How to use

1. First find the sensor device using `halRegistry.list()` to get device IDs
2. Call `halSensors.latest(device_id, metric)` to get the last reading
3. Return the value with unit

## Example

```typescript
const { halRegistry, halSensors } = await import('../hal/index.js');

const devices = halRegistry.list();
const sensor = devices.find(d => d.type === 'sensor' && (d.label === 'tent' || d.id === 'sensor_1'));
if (!sensor) return "No sensor found.";

const reading = halSensors.latest(sensor.id, 'temperature');
if (!reading) return "No reading available.";

return `${sensor.label || sensor.id}: ${reading.value}°C (quality: ${reading.quality})`;
```

## Notes
- If no reading is found, check if the sensor is online and transmitting via MQTT
- Sensor data arrives via MQTT subscription or serial reader
- Timestamps are ISO 8601 UTC
