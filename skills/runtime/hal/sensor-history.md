---
name: hal-sensor-history
description: Get historical sensor readings over a time period — useful for charts, trends, and decision-making.
triggers:
  - "history"
  - "chart"
  - "trend"
  - "overnight"
  - "last 24 hours"
  - "reading over time"
---

# HAL Sensor History

Get historical sensor readings for trend analysis or charting.

## Parameters
- `device_id` (string, required): The HAL device ID or label
- `metric` (string, required): The metric type (temperature | humidity | soil_moisture | light | co2 | water_level | ph | weight)
- `from` (string, optional): ISO 8601 start time (default: 24 hours ago)
- `to` (string, optional): ISO 8601 end time (default: now)

## How to use

1. Get the device ID (use `halRegistry.list()` to find it)
2. Call `halSensors.history(device_id, metric, fromISO, toISO)` to get an array of readings
3. Format as a summary, table, or return raw data for charting

## Example

```typescript
const { halRegistry, halSensors } = await import('../hal/index.js');

const deviceArg = "tent";
const dev = halRegistry.list().find(d => d.label === deviceArg || d.id === deviceArg);
if (!dev) return `Device "${deviceArg}" not found.`;

const from = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
const to = new Date().toISOString();
const readings = halSensors.history(dev.id, 'temperature', from, to);

if (!readings.length) return "No readings in the last 24 hours.";

const avg = readings.reduce((s, r) => s + r.value, 0) / readings.length;
const min = Math.min(...readings.map(r => r.value));
const max = Math.max(...readings.map(r => r.value));

return `Last 24h for ${dev.label || dev.id}: avg=${avg.toFixed(1)}°C min=${min}°C max=${max}°C (${readings.length} readings)`;
```

## Notes
- Historical data is useful for detecting patterns (nightly temperature drops, watering cycles)
- High reading counts may need sampling for display
- Data retention depends on storage policy — old readings can be pruned
