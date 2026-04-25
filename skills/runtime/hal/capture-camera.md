---
name: hal-capture-camera
description: Capture a photo from a V4L2 camera device and return it as an image.
triggers:
  - "take a photo"
  - "capture image"
  - "see what"
  - "camera"
  - "check the tent"
  - "look at"
---

# HAL Capture Camera

Capture a still image from a registered camera device using V4L2/ffmpeg.

## Parameters
- `device_id` (string, required): The HAL device ID or label of the camera
- `width` (number, optional): Image width in pixels (default: 640)
- `height` (number, optional): Image height in pixels (default: 480)

## How to use

1. Find the camera device using `halRegistry.list()` where `type === 'camera'`
2. Get the device to find the V4L2 device path (e.g. `/dev/video0`)
3. Create `V4L2Camera({ device: '/dev/video0', width, height })`
4. Call `camera.capture()` to get a JPEG Buffer
5. Save to a temp file and return the path

## Example

```typescript
const { halRegistry, V4L2Camera } = await import('../hal/index.js');

const devices = halRegistry.list();
const cam = devices.find(d => d.type === 'camera');
if (!cam) return "No camera found.";

const v4l2 = new V4L2Camera({ 
  device: cam.host || '/dev/video0',
  width: 800,
  height: 600,
});

const buf = v4l2.capture();
const path = `/tmp/hal_cam_${Date.now()}.jpg`;
writeFileSync(path, buf);
return `Camera capture saved to ${path} (${buf.length} bytes)`;
```

## Notes
- Camera capture requires ffmpeg to be installed
- Large images increase memory usage; prefer 640x480 for thumbnails
- JPEG quality is controlled by ffmpeg's -q:v setting
