// Reactive state store — simple subscriber pattern

import type {
  HalDevice,
  HalDecision,
  HalState,
  SensorMetricSnapshot,
} from './api.js';

export type ThemeName =
  | 'emerald'
  | 'amber'
  | 'blue'
  | 'rose'
  | 'violet'
  | 'cyan'
  | 'orange'
  | 'slate';
export type UnitSystem = 'metric' | 'imperial';
export type TimeFormat = '12h' | '24h';
export type ViewId =
  | 'dashboard'
  | 'devices'
  | 'sensors'
  | 'decisions'
  | 'cameras'
  | 'system'
  | 'terminal'
  | 'safety'
  | 'calibration';
export type DashboardLayout = 'calm' | 'operator' | 'diagnostic';

export interface HalStore {
  // UI state
  theme: ThemeName;
  layout: DashboardLayout;
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

  // Safety state
  safetyState: 'NORMAL' | 'WARNING' | 'EMERGENCY_STOP_ACTIVE';
  safetyActiveRulesCount: number;
  safetyWarningDevicesCount: number;
  safetyDeniedLast24h: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();

let state: HalStore = {
  theme: 'emerald',
  layout: 'operator',
  activeView: 'dashboard',
  unitSystem: 'imperial',
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
  safetyState: 'NORMAL',
  safetyActiveRulesCount: 0,
  safetyWarningDevicesCount: 0,
  safetyDeniedLast24h: 0,
};

export function getStore(): HalStore {
  return state;
}

export function setStore(partial: Partial<HalStore>): void {
  state = { ...state, ...partial };
  listeners.forEach((l) => l());
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Unit conversion helpers
export function convertTemp(celsius: number, to: UnitSystem): number {
  if (to === 'imperial') return (celsius * 9) / 5 + 32;
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
export function formatSensorValue(
  value: number,
  metric: string,
  system: UnitSystem,
): { value: number; unit: string } {
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
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTimeValue(date: Date, format: TimeFormat): string {
  if (format === '12h') {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export interface ThemePalette {
  label: string;
  accent: string;
  accentBright: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderSubtle: string;
  success: string;
  warning: string;
  danger: string;
  glow: string;
}

export const themeDefinitions: Record<ThemeName, ThemePalette> = {
  emerald: {
    label: 'Emerald',
    accent: '#238636',
    accentBright: '#3FB950',
    bgPrimary: '#07110C',
    bgSecondary: '#0E1A14',
    bgTertiary: '#14251B',
    textPrimary: '#E8FFF2',
    textSecondary: '#8FA89B',
    textTertiary: '#4A6356',
    border: '#254332',
    borderSubtle: '#182B20',
    success: '#3FB950',
    warning: '#D29922',
    danger: '#F85149',
    glow: 'rgba(63,185,80,0.12)',
  },
  amber: {
    label: 'Amber',
    accent: '#D29922',
    accentBright: '#E3B341',
    bgPrimary: '#120D05',
    bgSecondary: '#1D160A',
    bgTertiary: '#2A210F',
    textPrimary: '#FFF5D6',
    textSecondary: '#B8A67A',
    textTertiary: '#6B5D3E',
    border: '#4A3714',
    borderSubtle: '#33250E',
    success: '#7EB84A',
    warning: '#E3B341',
    danger: '#E06C5C',
    glow: 'rgba(227,179,65,0.12)',
  },
  blue: {
    label: 'Blue',
    accent: '#388BFD',
    accentBright: '#58A6FF',
    bgPrimary: '#07101E',
    bgSecondary: '#0D1627',
    bgTertiary: '#13213A',
    textPrimary: '#E0F0FF',
    textSecondary: '#7A9EC7',
    textTertiary: '#4A6385',
    border: '#263D63',
    borderSubtle: '#172A47',
    success: '#4FD17A',
    warning: '#D29922',
    danger: '#F85149',
    glow: 'rgba(88,166,255,0.12)',
  },
  rose: {
    label: 'Rose',
    accent: '#F85149',
    accentBright: '#FF7B72',
    bgPrimary: '#1A0A0A',
    bgSecondary: '#271212',
    bgTertiary: '#361A1A',
    textPrimary: '#FFE8E8',
    textSecondary: '#C78F8F',
    textTertiary: '#7A5555',
    border: '#5C2A2A',
    borderSubtle: '#3D1A1A',
    success: '#7EB84A',
    warning: '#E3B341',
    danger: '#FF7B72',
    glow: 'rgba(255,123,114,0.12)',
  },
  violet: {
    label: 'Violet',
    accent: '#A371F7',
    accentBright: '#C084FC',
    bgPrimary: '#0F0A1A',
    bgSecondary: '#18122B',
    bgTertiary: '#231A3D',
    textPrimary: '#F0E8FF',
    textSecondary: '#A08EC7',
    textTertiary: '#6B5D85',
    border: '#3D2A63',
    borderSubtle: '#2A1A47',
    success: '#7EB84A',
    warning: '#D29922',
    danger: '#F85149',
    glow: 'rgba(192,132,252,0.12)',
  },
  cyan: {
    label: 'Cyan',
    accent: '#22B8CF',
    accentBright: '#4FD1E0',
    bgPrimary: '#051015',
    bgSecondary: '#0A1A22',
    bgTertiary: '#0F2530',
    textPrimary: '#E0F7FF',
    textSecondary: '#7AB8C7',
    textTertiary: '#4A7585',
    border: '#1A3D4D',
    borderSubtle: '#102A36',
    success: '#4FD17A',
    warning: '#D29922',
    danger: '#F85149',
    glow: 'rgba(79,209,224,0.12)',
  },
  orange: {
    label: 'Orange',
    accent: '#E07B16',
    accentBright: '#F6A94C',
    bgPrimary: '#140E05',
    bgSecondary: '#1F170A',
    bgTertiary: '#2E2110',
    textPrimary: '#FFF0D6',
    textSecondary: '#C7A87A',
    textTertiary: '#7A6B4A',
    border: '#4D3514',
    borderSubtle: '#36250E',
    success: '#7EB84A',
    warning: '#F6A94C',
    danger: '#F85149',
    glow: 'rgba(246,169,76,0.12)',
  },
  slate: {
    label: 'Slate',
    accent: '#6C7278',
    accentBright: '#8B949E',
    bgPrimary: '#0A0C0F',
    bgSecondary: '#111318',
    bgTertiary: '#181B22',
    textPrimary: '#E8EAED',
    textSecondary: '#8B949E',
    textTertiary: '#555B63',
    border: '#2E333B',
    borderSubtle: '#1E2228',
    success: '#7EB84A',
    warning: '#D29922',
    danger: '#F85149',
    glow: 'rgba(139,148,158,0.12)',
  },
};

export function applyTheme(theme: ThemeName): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const def = themeDefinitions[theme];
  root.style.setProperty('--accent', def.accent);
  root.style.setProperty('--accent-bright', def.accentBright);
  root.style.setProperty('--bg-primary', def.bgPrimary);
  root.style.setProperty('--bg-secondary', def.bgSecondary);
  root.style.setProperty('--bg-tertiary', def.bgTertiary);
  root.style.setProperty('--text-primary', def.textPrimary);
  root.style.setProperty('--text-secondary', def.textSecondary);
  root.style.setProperty('--text-tertiary', def.textTertiary);
  root.style.setProperty('--border', def.border);
  root.style.setProperty('--border-subtle', def.borderSubtle);
  root.style.setProperty('--success', def.success);
  root.style.setProperty('--warning', def.warning);
  root.style.setProperty('--danger', def.danger);
  root.style.setProperty('--glow', def.glow);
}
