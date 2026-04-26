// Reactive state store — simple subscriber pattern

import type { HalDevice, HalDecision, HalState, SensorMetricSnapshot } from './api.js';

export type FarmMode = 'CALM' | 'OPERATOR' | 'DIAGNOSTIC';
export type UnitSystem = 'metric' | 'imperial';
export type TimeFormat = '12h' | '24h';
export type ViewId = 'dashboard' | 'devices' | 'sensors' | 'decisions' | 'cameras';

export interface HalStore {
  // UI state
  mode: FarmMode;
  activeView: ViewId;
  unitSystem: UnitSystem;
  timeFormat: TimeFormat;
  sidebarCollapsed: boolean;

  // HAL data
  devices: HalDevice[];
  decisions: HalDecision[];
  sensors: Record<string, SensorMetricSnapshot>;
  cameras: HalDevice[];
  uptime: number; // seconds since page load
  decisionsToday: number;

  // System status
  agentStatus: 'active' | 'idle' | 'error';
  halStatus: 'online' | 'offline' | 'degraded';
  mqttStatus: 'connected' | 'disconnected';
  dbStatus: 'healthy' | 'error';
  autoMode: boolean;
}

type Listener = () => void;
const listeners = new Set<Listener>();

let state: HalStore = {
  mode: 'CALM',
  activeView: 'dashboard',
  unitSystem: 'metric',
  timeFormat: '24h',
  sidebarCollapsed: false,
  devices: [],
  decisions: [],
  sensors: {},
  cameras: [],
  uptime: 0,
  decisionsToday: 0,
  agentStatus: 'active',
  halStatus: 'online',
  mqttStatus: 'connected',
  dbStatus: 'healthy',
  autoMode: true,
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

// Unit conversion helpers
export function convertTemp(celsius: number, to: UnitSystem): number {
  if (to === 'imperial') return (celsius * 9 / 5) + 32;
  return celsius;
}

export function tempUnit(system: UnitSystem): string {
  return system === 'imperial' ? 'F' : 'C';
}

export function convertWeight(kg: number, to: UnitSystem): number {
  if (to === 'imperial') return kg * 2.20462;
  return kg;
}

export function weightUnit(system: UnitSystem): string {
  return system === 'imperial' ? 'lb' : 'kg';
}

export function convertDistance(m: number, to: UnitSystem): number {
  if (to === 'imperial') return m * 3.28084;
  return m;
}

export function distanceUnit(system: UnitSystem): string {
  return system === 'imperial' ? 'ft' : 'm';
}

// Format value with proper unit conversion
export function formatSensorValue(value: number, metric: string, system: UnitSystem): { value: number; unit: string } {
  switch (metric) {
    case 'temperature':
      return { value: convertTemp(value, system), unit: tempUnit(system) };
    case 'weight':
      return { value: convertWeight(value, system), unit: weightUnit(system) };
    default:
      return { value, unit: getMetricUnit(metric) };
  }
}

function getMetricUnit(metric: string): string {
  switch (metric) {
    case 'humidity':
    case 'soil_moisture':
    case 'water_level':
      return '%';
    case 'co2':
      return 'ppm';
    case 'light':
      return 'lux';
    case 'ph':
      return '';
    default:
      return '';
  }
}

// Time formatting helpers
export function formatTimeValue(date: Date, format: TimeFormat): string {
  if (format === '12h') {
    return date.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

export function formatDateTimeValue(date: Date, format: TimeFormat): string {
  if (format === '12h') {
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true
    });
  }
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
}

// Mode accent definitions
const modeDefinitions: Record<FarmMode, {
  accent: string;
  accentBright: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  border: string;
  borderSubtle: string;
}> = {
  CALM: {
    accent: '#238636',
    accentBright: '#3FB950',
    bgPrimary: '#07110C',
    bgSecondary: '#0E1A14',
    bgTertiary: '#14251B',
    border: '#254332',
    borderSubtle: '#182B20',
  },
  OPERATOR: {
    accent: '#E0A11B',
    accentBright: '#F6C453',
    bgPrimary: '#120D05',
    bgSecondary: '#1D160A',
    bgTertiary: '#2A210F',
    border: '#4A3714',
    borderSubtle: '#33250E',
  },
  DIAGNOSTIC: {
    accent: '#2F81F7',
    accentBright: '#58A6FF',
    bgPrimary: '#07101E',
    bgSecondary: '#0D1627',
    bgTertiary: '#13213A',
    border: '#263D63',
    borderSubtle: '#172A47',
  },
};

export function applyModeAccent(mode: FarmMode): void {
  const root = document.documentElement;
  root.dataset.mode = mode.toLowerCase();
  const def = modeDefinitions[mode];
  root.style.setProperty('--accent', def.accent);
  root.style.setProperty('--accent-bright', def.accentBright);
  root.style.setProperty('--bg-primary', def.bgPrimary);
  root.style.setProperty('--bg-secondary', def.bgSecondary);
  root.style.setProperty('--bg-tertiary', def.bgTertiary);
  root.style.setProperty('--border', def.border);
  root.style.setProperty('--border-subtle', def.borderSubtle);
}
