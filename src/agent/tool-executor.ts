export interface ToolCall {
  tool: string;
  args: Record<string, any>;
}

export async function executeToolCall(
  tc: ToolCall,
  registry: any,
): Promise<any> {
  switch (tc.tool) {
    case 'control_plug':
    case 'control_device': {
      const { device_id, action } = tc.args;
      await registry.control(device_id, action);
      return { ok: true, device_id, action };
    }

    case 'read_sensor': {
      const { device_id, metric } = tc.args;
      const { halSensors } = await import('../hal/sensors.js');
      const reading = halSensors.latest(device_id, metric);
      return {
        ok: true,
        device_id,
        metric,
        value: reading?.value,
        quality: reading?.quality,
      };
    }

    case 'capture_camera': {
      const { device_id } = tc.args;
      const dev = registry.get(device_id);
      if (!dev || dev.type !== 'camera')
        throw new Error(`Device ${device_id} is not a camera`);
      const { V4L2Camera } = await import('../hal/camera.js');
      const cam = new V4L2Camera({ device: dev.host || '/dev/video0' });
      const buf = cam.capture();
      return { ok: true, device_id, size_bytes: buf.length };
    }

    case 'poll_devices': {
      await registry.poll();
      return { ok: true };
    }

    case 'discover_devices': {
      const { discoverDevices } = await import('../hal/discovery.js');
      const found = await discoverDevices();
      return { ok: true, found: found.length };
    }

    default:
      throw new Error(`Unknown tool: ${tc.tool}`);
  }
}
