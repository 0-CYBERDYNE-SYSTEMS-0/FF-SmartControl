// Reactive state store — simple subscriber pattern

import type { FarmMode } from './components/Header.js';
import type { HalDevice, HalDecision, HalState } from './api.js';

export interface HalStore {
  // UI state
  mode: FarmMode;
  activeView: string;

  // HAL data
  devices: HalDevice[];
  decisions: HalDecision[];
  sensors: Record<string, { temperature?: { timestamp: string; value: number }; humidity?: { timestamp: string; value: number } }>;
  cameras: HalDevice[];
  uptime: number; // seconds since page load
  decisionsToday: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();

let state: HalStore = {
  mode: 'GROW',
  activeView: 'dashboard',
  devices: [],
  decisions: [],
  sensors: {},
  cameras: [],
  uptime: 0,
  decisionsToday: 0,
};

export function getStore(): HalStore {
  return state;
}

export function setStore(partial: Partial<HalStore>): void {
  state = { ...state, ...partial };
  listeners.forEach(l => l());
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Apply mode accent CSS variables
export function applyModeAccent(mode: FarmMode): void {
  const root = document.documentElement;
  if (mode === 'GROW') {
    root.style.setProperty('--accent', '#238636');
    root.style.setProperty('--accent-bright', '#3FB950');
  } else if (mode === 'HARVEST') {
    root.style.setProperty('--accent', '#D29922');
    root.style.setProperty('--accent-bright', '#E3B341');
  } else {
    root.style.setProperty('--accent', '#388BFD');
    root.style.setProperty('--accent-bright', '#58A6FF');
  }
}
