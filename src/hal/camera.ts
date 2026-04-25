import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface CameraConfig {
  device: string;   // e.g. '/dev/video0'
  width?: number;   // default 640
  height?: number;  // default 480
}

export class V4L2Camera {
  constructor(private config: CameraConfig) {}

  // Capture a single JPEG frame
  capture(): Buffer {
    const { device, width = 640, height = 480 } = this.config;
    const tmpPath = join(tmpdir(), `hal_cam_${Date.now()}.jpg`);

    try {
      execSync(
        `ffmpeg -y -f v4l2 -video_size ${width}x${height} -i ${device} -frames:v 1 -q:v 2 ${tmpPath}`,
        { timeout: 10000 }
      );
      const buf = readFileSync(tmpPath);
      return buf;
    } catch (err: any) {
      throw new Error(`Camera capture failed: ${err.message}`);
    } finally {
      try { unlinkSync(tmpPath); } catch {}
    }
  }

  // Check if device is available
  isAvailable(): boolean {
    try {
      const { device } = this.config;
      execSync(`ffprobe -v error -select_streams v:0 -i ${device}`, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}
