export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  system?: string;
  image?: string; // Base64 encoded image for vision models
}

export interface LLMResponse {
  text: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  model: string;
  finishReason?: string;
}

/**
 * Ollama-first provider detection.
 * Priority: ollama (local) > anthropic > openai > others
 */
function getProvider(): 'openai' | 'anthropic' | 'zai' | 'ollama' | 'lm-studio' {
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

export async function callLLM(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
  const provider = getProvider();

  if (provider === 'anthropic') return callAnthropic(prompt, options);
  if (provider === 'zai') return callZai(prompt, options);
  if (provider === 'ollama') return callOllama(prompt, options);
  if (provider === 'lm-studio') return callLMStudio(prompt, options);
  return callOpenAI(prompt, options);
}

async function callOpenAI(prompt: string, options: LLMOptions): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.PI_API_KEY;
  const model = options.model || process.env.PI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    model?: string;
  };
  return {
    text: data.choices?.[0]?.message?.content || '',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens ?? 0,
      completionTokens: data.usage.completion_tokens ?? 0,
      totalTokens: data.usage.total_tokens ?? 0,
    } : undefined,
    model: data.model || model,
    finishReason: data.choices?.[0]?.finish_reason,
  };
}

async function callAnthropic(prompt: string, options: LLMOptions): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = options.model || 'claude-3-5-haiku-20241022';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
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
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  const data = await res.json() as {
    content?: Array<{ text?: string }>;
    model?: string;
    stop_reason?: string;
  };
  return {
    text: data.content?.[0]?.text || '',
    model: data.model || model,
    finishReason: data.stop_reason,
  };
}

async function callZai(prompt: string, options: LLMOptions): Promise<LLMResponse> {
  const apiKey = process.env.ZAI_API_KEY;
  const model = options.model || process.env.ZAI_MODEL || 'glm-4.7';
  const res = await fetch('https://open.bigmodel.cn/api/paas/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: options.temperature ?? 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Zai API error: ${res.status}`);
  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  return {
    text: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
  };
}

async function callOllama(prompt: string, options: LLMOptions): Promise<LLMResponse> {
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
    const data = await res.json() as { response?: string; model?: string };
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
  const data = await res.json() as { response?: string; model?: string };
  return { text: data.response || '', model: data.model || model };
}

async function callLMStudio(prompt: string, options: LLMOptions): Promise<LLMResponse> {
  const baseUrl = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234';
  const model = options.model || 'local';
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });
  if (!res.ok) throw new Error(`LM Studio error: ${res.status}`);
  const data = await res.json() as {
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
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const result = await callLLM(prompt, options);
  onChunk(result.text);
  return result;
}
