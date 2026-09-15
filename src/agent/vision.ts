import { callLLM } from './llm.js';
import { V4L2Camera } from '../hal/camera.js';

export const DEFAULT_QUESTION =
  'Describe the plant/grow conditions visible in this camera frame: ' +
  'health, issues (pests, mold, deficiency, wilting), and anything needing ' +
  'action. Be concise.';

/** Grower-facing prompt template for camera frame inspection. */
export const PROMPT = (device: string, question: string): string =>
  `You are a grow-space assistant inspecting a frame from camera "${device}".\n${question}`;

export type LlmFn = typeof callLLM;

export interface VisionResult {
  ok: boolean;
  description?: string;
  error?: string;
}

/**
 * Describe a camera frame with a vision-capable LLM (Ollama-first).
 * `llm` is injectable for tests; it defaults to the real callLLM.
 */
export async function describeCameraImage(params: {
  device: string;
  base64: string;
  question?: string;
  llm?: LlmFn;
}): Promise<VisionResult> {
  const { device, base64, question, llm = callLLM } = params;
  try {
    const res = await llm(PROMPT(device, question || DEFAULT_QUESTION), {
      image: base64,
    });
    if (!res.text || res.text.trim().length === 0) {
      return { ok: false, error: 'Vision model returned an empty description' };
    }
    return { ok: true, description: res.text.trim() };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Vision description failed' };
  }
}

/**
 * Capture a frame from a V4L2 camera and describe it. Mirrors camera.ts
 * error semantics: any capture failure yields ok:false with a clear error.
 */
export async function captureAndDescribe(
  device: string,
  question?: string,
  llm?: LlmFn,
): Promise<VisionResult> {
  try {
    const camera = new V4L2Camera({ device });
    if (!camera.isAvailable()) {
      return { ok: false, error: `Camera device unavailable: ${device}` };
    }
    const frame: Buffer = camera.capture();
    return await describeCameraImage({
      device,
      base64: frame.toString('base64'),
      question,
      llm,
    });
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || `Camera capture failed: ${device}`,
    };
  }
}
