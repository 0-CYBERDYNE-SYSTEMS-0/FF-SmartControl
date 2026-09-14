// Provisioning API client — calls to /api/provisioning/*

import { setCsrfToken } from './api.js';

const BASE = '/api/provisioning';

async function provGet<T>(path: string): Promise<T> {
  const url = BASE + path;
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(
      `Provisioning API ${url} failed: ${res.status} ${res.statusText}`,
    );
  return res.json() as Promise<T>;
}

async function provPost<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok)
    throw new Error(
      `Provisioning API ${path} failed: ${res.status} ${res.statusText}`,
    );
  return res.json() as Promise<T>;
}

async function provPut<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'PUT',
    headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok)
    throw new Error(
      `Provisioning API ${path} failed: ${res.status} ${res.statusText}`,
    );
  return res.json() as Promise<T>;
}

// Provisioning endpoints require an admin session + CSRF token once the system
// is provisioned, so mutating calls echo the captured double-submit token.
let csrfTokenValue: string | null = null;

function withCsrfHeader(
  headers: Record<string, string>,
): Record<string, string> {
  return csrfTokenValue
    ? { ...headers, 'X-CSRF-Token': csrfTokenValue }
    : headers;
}

export function setProvisioningCsrfToken(token: string | null): void {
  csrfTokenValue = token;
  setCsrfToken(token);
}

export interface ProvisioningStatus {
  isUnprovisioned: boolean;
  state: 'unprovisioned' | 'in_progress' | 'completed' | 'failed';
  wizardStep: number;
  farmName: string | null;
  timezone: string | null;
  wifiConfigured: boolean;
  llmProvider: string | null;
  hasNetworkConnectivity: boolean;
  primaryIp: string | null;
  avahiRunning: boolean;
  errorMessage: string | null;
}

export interface WizardSession {
  step: number;
  farmName: string;
  adminPasswordHash?: string;
  timezone: string;
  wifiSsid?: string;
  wifiPassword?: string;
  wifiConfigured?: boolean;
  llmProvider: string;
  llmEndpoint?: string;
  llmApiKey?: string;
  llmModel?: string;
  telegramEnabled: boolean;
  telegramBotToken?: string;
  savedAt: string;
  expiresAt: string;
}

export interface WizardCompleteRequest {
  farmName: string;
  adminPasswordHash: string;
  timezone: string;
  wifiSsid?: string;
  wifiPassword?: string;
  wifiConfigured: boolean;
  llmProvider: string;
  llmEndpoint?: string;
  llmApiKey?: string;
  llmModel?: string;
  telegramEnabled: boolean;
  telegramBotToken?: string;
}

export const provisioningApi = {
  // GET /api/provisioning/status
  async getStatus(): Promise<ProvisioningStatus> {
    return provGet<ProvisioningStatus>('/status');
  },

  // POST /api/provisioning/begin
  async begin(): Promise<{ ok: boolean; state: string }> {
    return provPost<{ ok: boolean; state: string }>('/begin');
  },

  // PUT /api/provisioning/wizard-step — updates wizardStep in ProvisioningManager state
  async updateWizardStep(
    step: number,
    data: {
      farmName?: string;
      timezone?: string;
      wifiConfigured?: boolean;
      llmProvider?: string;
    },
  ): Promise<{ ok: boolean; wizardStep: number }> {
    return provPut<{ ok: boolean; wizardStep: number }>('/wizard-step', {
      step,
      ...data,
    });
  },

  // GET /api/provisioning/wizard-session
  async getWizardSession(): Promise<WizardSession | null> {
    try {
      return await provGet<WizardSession>('/wizard-session');
    } catch {
      return null;
    }
  },

  // POST /api/provisioning/complete
  async complete(
    data: WizardCompleteRequest,
  ): Promise<{ ok: boolean; state: string }> {
    return provPost<{ ok: boolean; state: string }>('/complete', data);
  },

  // POST /api/provisioning/reset
  async reset(): Promise<{ ok: boolean }> {
    return provPost<{ ok: boolean }>('/reset');
  },

  // GET /api/provisioning/network
  async getNetworkInfo(): Promise<{
    hasNetworkConnectivity: boolean;
    primaryIp: string | null;
    avahiRunning: boolean;
    farmpalLocal: string | null;
  }> {
    return provGet<{
      hasNetworkConnectivity: boolean;
      primaryIp: string | null;
      avahiRunning: boolean;
      farmpalLocal: string | null;
    }>('/network');
  },
};
