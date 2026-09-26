export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  system?: string;
  image?: string; // Base64 encoded image for vision models
}

export interface LLMResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

/**
 * Ollama-first provider detection.
 * Priority: ollama (local) > anthropic > openai > others
 */
function getProvider():
  | 'openai'
  | 'anthropic'
  | 'zai'
  | 'ollama'
  | 'lm-studio' {
  // Check explicit override first
  const explicit = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (explicit) {
    if (explicit === 'anthropic' || explicit === 'claude') return 'anthropic';
    if (explicit === 'zai' || explicit === 'glm') return 'zai';
    if (explicit === 'ollama') return 'ollama';
    if (explicit === 'lm-studio' || explicit === 'lmstudio') return 'lm-studio';
    if (explicit === 'openai') return 'openai';
  }

  // Default to Ollama if available (local-first)
  if (process.env.OLLAMA_BASE_URL || isOllamaRunning()) {
    return 'ollama';
  }

  // Fall back to cloud providers
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY || process.env.PI_API_KEY) return 'openai';
  if (process.env.ZAI_API_KEY) return 'zai';

  // Ultimate fallback to Ollama
  return 'ollama';
}

/**
 * Check if Ollama is running locally
 */
function isOllamaRunning(): boolean {
  try {
    const { execSync } = require('child_process');
    execSync('curl -s http://localhost:11434/api/tags', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function callLLM(
  prompt: string,
  options: LLMOptions = {},
): Promise<LLMResponse> {
  const provider = getProvider();

  if (provider === 'anthropic') return callAnthropic(prompt, options);
  if (provider === 'zai') return callZai(prompt, options);
  if (provider === 'ollama') return callOllama(prompt, options);
  if (provider === 'lm-studio') return callLMStudio(prompt, options);
  return callOpenAI(prompt, options);
}

// ============================================================
// Cloud escalation (D5 hybrid LLM posture)
// The local model owns routine cycles; hard or anomalous ones
// may escalate once to a cloud provider. No new providers are
// introduced: the escalation reuses the same cloud keys and
// per-provider callers as the default selection chain above,
// in the same priority order (anthropic > openai > zai).
// ============================================================

export type CloudProvider = 'anthropic' | 'openai' | 'zai';

/**
 * Pick a cloud provider from configured API keys, using the same fallback
 * order as the main provider chain. Returns null when no cloud key is set —
 * callers must treat that as "escalation unavailable" and keep the local
 * answer, never as an error that kills the decision cycle.
 */
export function getCloudProvider(): CloudProvider | null {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY || process.env.PI_API_KEY) return 'openai';
  if (process.env.ZAI_API_KEY) return 'zai';
  return null;
}

/**
 * One-shot cloud escalation call. Throws when no cloud provider is
 * configured; the caller decides whether that is fatal (it should not be).
 */
export async function callCloudLLM(
  prompt: string,
  options: LLMOptions = {},
): Promise<LLMResponse> {
  const provider = getCloudProvider();
  if (!provider) {
    throw new Error('No cloud LLM provider configured (D5 escalation)');
  }
  if (provider === 'anthropic') return callAnthropic(prompt, options);
  if (provider === 'zai') return callZai(prompt, options);
  return callOpenAI(prompt, options);
}

async function callOpenAI(
  prompt: string,
  options: LLMOptions,
): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.PI_API_KEY;
  const model = options.model || process.env.PI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(options.system
          ? [{ role: 'system', content: options.system }]
          : []),
        { role: 'user', content: prompt },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });
  if (!res.ok)
    throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
    model?: string;
  };
  return {
    text: data.choices?.[0]?.message?.content || '',
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        }
      : undefined,
    model: data.model || model,
    finishReason: data.choices?.[0]?.finish_reason,
  };
}

async function callAnthropic(
  prompt: string,
  options: LLMOptions,
): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model =
    options.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';
  // Base URL override enables any Anthropic-compatible provider (MiniMax,
  // Kimi, etc.). The provider appends /v1/messages — do not include it here.
  const baseUrl = (
    process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
  ).replace(/\/+$/, '');
  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      system: options.system,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });
  if (!res.ok)
    throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    model?: string;
    stop_reason?: string;
  };
  // Concatenate text blocks, skipping thinking/reasoning blocks. Reasoning
  // models (MiniMax-M3, Claude extended thinking) emit a thinking block at
  // content[0] and the answer in a later text block.
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text' || (b.type === undefined && b.text))
    .map((b) => b.text ?? '')
    .join('');
  return {
    text,
    model: data.model || model,
    finishReason: data.stop_reason,
  };
}

async function callZai(
  prompt: string,
  options: LLMOptions,
): Promise<LLMResponse> {
  const apiKey = process.env.ZAI_API_KEY;
  const model = options.model || process.env.ZAI_MODEL || 'glm-4.7';
  const res = await fetch(
    'https://open.bigmodel.cn/api/paas/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(options.system
            ? [{ role: 'system', content: options.system }]
            : []),
          { role: 'user', content: prompt },
        ],
        temperature: options.temperature ?? 0.7,
      }),
    },
  );
  if (!res.ok) throw new Error(`Zai API error: ${res.status}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  return {
    text: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
  };
}

async function callOllama(
  prompt: string,
  options: LLMOptions,
): Promise<LLMResponse> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  // Default to qwen3.5:2b for local-first (vision model with tool calling)
  const model = options.model || process.env.OLLAMA_MODEL || 'qwen3.5:2b';

  // Support vision models (like qwen3.5) with image input
  if (options.image) {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        images: [options.image],
        system: options.system,
        temperature: options.temperature ?? 0.7,
        options: { num_predict: options.maxTokens ?? 2048 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama vision error: ${res.status}`);
    const data = (await res.json()) as { response?: string; model?: string };
    return { text: data.response || '', model: data.model || model };
  }

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      system: options.system,
      temperature: options.temperature ?? 0.7,
      options: { num_predict: options.maxTokens ?? 2048 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = (await res.json()) as { response?: string; model?: string };
  return { text: data.response || '', model: data.model || model };
}

async function callLMStudio(
  prompt: string,
  options: LLMOptions,
): Promise<LLMResponse> {
  const baseUrl = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234';
  const model = options.model || 'local';
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        ...(options.system
          ? [{ role: 'system', content: options.system }]
          : []),
        { role: 'user', content: prompt },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });
  if (!res.ok) throw new Error(`LM Studio error: ${res.status}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  return {
    text: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
  };
}

export async function streamLLM(
  prompt: string,
  onChunk: (text: string) => void,
  options: LLMOptions = {},
): Promise<LLMResponse> {
  const result = await callLLM(prompt, options);
  onChunk(result.text);
  return result;
}
