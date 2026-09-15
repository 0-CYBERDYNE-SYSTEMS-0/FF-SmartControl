import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_QUESTION,
  PROMPT,
  describeCameraImage,
  captureAndDescribe,
  type LlmFn,
} from '../src/agent/vision.js';
import type { LLMResponse } from '../src/agent/llm.js';

function fakeLlm(
  text: string,
  capture?: (prompt: string, options: any) => void,
): LlmFn {
  return (async (prompt: string, options: any): Promise<LLMResponse> => {
    capture?.(prompt, options);
    return { text, model: 'fake-vision' };
  }) as unknown as LlmFn;
}

test('PROMPT embeds the device and default question', () => {
  const prompt = PROMPT('/dev/video0', DEFAULT_QUESTION);
  assert.match(prompt, /\/dev\/video0/);
  assert.ok(prompt.includes(DEFAULT_QUESTION));
});

test('describeCameraImage passes the default question and image base64 to the LLM', async () => {
  let seenPrompt = '';
  let seenOptions: any;
  const res = await describeCameraImage({
    device: '/dev/video0',
    base64: 'QUJD',
    llm: fakeLlm('Leaves look healthy.', (prompt, options) => {
      seenPrompt = prompt;
      seenOptions = options;
    }),
  });

  assert.equal(res.ok, true);
  assert.equal(res.description, 'Leaves look healthy.');
  assert.ok(seenPrompt.includes(DEFAULT_QUESTION));
  assert.match(seenPrompt, /\/dev\/video0/);
  assert.equal(seenOptions.image, 'QUJD');
});

test('describeCameraImage uses a custom question when given', async () => {
  let seenPrompt = '';
  await describeCameraImage({
    device: 'cam1',
    base64: 'QUJD',
    question: 'Is there powdery mildew?',
    llm: fakeLlm('Yes, on upper leaves.', (prompt) => {
      seenPrompt = prompt;
    }),
  });

  assert.ok(seenPrompt.includes('Is there powdery mildew?'));
  assert.ok(!seenPrompt.includes(DEFAULT_QUESTION));
});

test('describeCameraImage returns ok:false when the LLM throws', async () => {
  const failing = (async () => {
    throw new Error('Ollama vision error: 500');
  }) as unknown as LlmFn;
  const res = await describeCameraImage({
    device: 'cam1',
    base64: 'QUJD',
    llm: failing,
  });

  assert.equal(res.ok, false);
  assert.match(res.error!, /Ollama vision error: 500/);
});

test('describeCameraImage returns ok:false on an empty model answer', async () => {
  const res = await describeCameraImage({
    device: 'cam1',
    base64: 'QUJD',
    llm: fakeLlm(''),
  });

  assert.equal(res.ok, false);
  assert.match(res.error!, /empty/i);
});

test('captureAndDescribe returns ok:false when the camera is unavailable', async () => {
  let llmCalled = false;
  const res = await captureAndDescribe(
    '/dev/nonexistent-farmpal-cam',
    undefined,
    fakeLlm('should not be reached', () => {
      llmCalled = true;
    }),
  );

  assert.equal(res.ok, false);
  assert.ok(res.error && res.error.length > 0);
  assert.equal(llmCalled, false);
});
