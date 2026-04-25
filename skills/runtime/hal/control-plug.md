---
name: hal-control-plug
description: Turn a smart plug (Tasmota, Shelly, Kasa) or GPIO relay on or off.
triggers:
  - "turn on"
  - "turn off"
  - "switch off"
  - "plug on"
  - "power on"
  - "shut off"
  - "toggle"
---

# HAL Control Plug

Control a smart plug or relay to turn it on or off.

## Parameters
- `device_id` (string, required): The HAL device ID or label
- `action` (string, required): Either "on" or "off"

## How to use

1. Find the device using `halRegistry.list()` to see registered devices
2. Call `halRegistry.control(device_id, action)` where action is 'on' or 'off'
3. The device state is updated in the database and the command is sent via HTTP/GPIO
4. Log the toggle via `halRelays.log()`

## Example

```typescript
const { halRegistry, halRelays } = await import('../hal/index.js');

const deviceArg = "tent light";
const devices = halRegistry.list();
const dev = devices.find(d => d.label === deviceArg || d.id === deviceArg);
if (!dev) return `Device "${deviceArg}" not found.`;

await halRegistry.control(dev.id, 'on');
halRelays.log({
  device_id: dev.id,
  state: 'on',
  reason: 'agent_decision',
  triggered_by: 'agent',
});

return `${dev.label || dev.id} is now ON`;
```

## Safety notes
- Always confirm the device type is appropriate before sending commands
- Log all control actions with reason="agent_decision" for audit trail
- Use halRegistry.updateState() to keep device state in sync
