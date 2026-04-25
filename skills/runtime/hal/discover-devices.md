---
name: hal-discover-devices
description: Scan the local network for Tasmota, Shelly, or Kasa smart devices and auto-register them.
triggers:
  - "discover devices"
  - "scan network"
  - "find devices"
  - "new device"
  - "add device"
  - "auto discover"
---

# HAL Discover Devices

Scan the local network for smart devices and register them in the HAL registry.

## Parameters
- `subnet` (string, optional): The subnet to scan in x.y.z format (default: from HAL_SUBNET env or "192.168.1")
- `types` (array, optional): Device types to scan for: tasmota | shelly | kasa (default: all three)

## How to use

1. Call `discoverDevices({ subnet, types })` to scan the network
2. Each discovered device is probed to confirm type
3. Call `autoRegisterDiscovered(devices)` to add all found devices to the registry
4. Return a summary of what was found and registered

## Example

```typescript
const { discoverDevices, autoRegisterDiscovered, halRegistry } = await import('../hal/index.js');

const subnet = process.env.HAL_SUBNET || '192.168.1';
const found = await discoverDevices({ subnet, types: ['tasmota', 'shelly', 'kasa'] });
await autoRegisterDiscovered(found);

const allDevices = halRegistry.list();
return `Found ${found.length} device(s). Total HAL devices: ${allDevices.length}`;
```

## Notes
- Discovery can take 30-60 seconds on a /24 subnet
- Only tasmota, shelly, and kasa HTTP-based devices are auto-detected
- GPIO and serial devices must be registered manually
- Run discovery sparingly — it's network-intensive
- Check HAL_SUBNET env var to target the correct subnet
