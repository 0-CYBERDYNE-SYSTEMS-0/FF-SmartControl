/**
 * FarmPal v1.0 "golden kit" device presets (D3).
 *
 * Data-driven twin of docs/REFERENCE_BOM.md: the exact off-the-shelf devices
 * the discovery wizard ships quick-picks for. This module is pure data and is
 * imported by both the Node-side HAL and the browser-side HAL UI bundle —
 * keep it free of Node-only imports.
 *
 * These are SUGGESTIONS only. FarmPal stocks no hardware; the golden kit is
 * the customer's purchase. A preset never claims support the HAL does not
 * have — see the SPEC.md hardware truth table.
 */

import type { DeviceProtocol, DeviceType, MetricType } from './types.js';

/** Protocol ids used by the Discovery Wizard front end. */
export type WizardScanProtocol =
  | 'gpio'
  | 'mqtt'
  | 'http_tasmota'
  | 'http_shelly'
  | 'serial'
  | 'manual';

export interface GoldenKitPreset {
  /** Stable preset id (used by tests and as the wizard chip key). */
  id: string;
  /** Suggested operator-facing device label. */
  label: string;
  /** One-line description shown on the wizard quick-pick chip. */
  description: string;
  deviceType: DeviceType;
  /** How the Discovery Wizard finds this device. */
  wizardProtocol: WizardScanProtocol;
  /** Protocol value persisted on the HAL device record. */
  halProtocol: DeviceProtocol;
  /** Metrics this device is expected to report (empty for actuators). */
  metrics: MetricType[];
  /** Suggested polling interval in milliseconds. */
  pollIntervalMs: number;
  /** Optional golden-kit items are nice-to-have, not required. */
  optional: boolean;
  /** Section anchor in docs/REFERENCE_BOM.md. */
  bomRef: string;
}

export const GOLDEN_KIT_PRESETS: GoldenKitPreset[] = [
  {
    id: 'tasmota_plug',
    label: 'Tasmota Plug',
    description: 'Tasmota-flashable smart plug (HTTP, watts + relay)',
    deviceType: 'smart_plug',
    wizardProtocol: 'http_tasmota',
    halProtocol: 'tasmota',
    metrics: [],
    pollIntervalMs: 10_000,
    optional: false,
    bomRef: 'reference-bom',
  },
  {
    id: 'shelly_plug',
    label: 'Shelly Plug',
    description: 'Shelly WiFi smart plug (HTTP, watts + relay)',
    deviceType: 'smart_plug',
    wizardProtocol: 'http_shelly',
    halProtocol: 'shelly',
    metrics: [],
    pollIntervalMs: 10_000,
    optional: false,
    bomRef: 'reference-bom',
  },
  {
    id: 'kasa_plug',
    label: 'Kasa Plug',
    description: 'TP-Link Kasa WiFi smart plug (add by IP address)',
    deviceType: 'smart_plug',
    wizardProtocol: 'manual',
    halProtocol: 'kasa',
    metrics: [],
    pollIntervalMs: 10_000,
    optional: false,
    bomRef: 'reference-bom',
  },
  {
    id: 'soil_moisture_probe',
    label: 'Soil Moisture Probe',
    description: 'Capacitive soil-moisture probe via USB serial/ADC bridge',
    deviceType: 'sensor',
    wizardProtocol: 'serial',
    halProtocol: 'serial',
    metrics: ['soil_moisture'],
    pollIntervalMs: 60_000,
    optional: false,
    bomRef: 'reference-bom',
  },
  {
    id: 'temp_humidity_sensor',
    label: 'Temp / Humidity Sensor',
    description: 'BME280 / SHT-class sensor via USB serial bridge',
    deviceType: 'sensor',
    wizardProtocol: 'serial',
    halProtocol: 'serial',
    metrics: ['temperature', 'humidity'],
    pollIntervalMs: 60_000,
    optional: false,
    bomRef: 'reference-bom',
  },
  {
    id: 'co2_sensor',
    label: 'CO2 Sensor',
    description: 'NDIR CO2 sensor (SCD/MH-Z class) — optional',
    deviceType: 'sensor',
    wizardProtocol: 'serial',
    halProtocol: 'serial',
    metrics: ['co2'],
    pollIntervalMs: 300_000,
    optional: true,
    bomRef: 'reference-bom',
  },
  {
    id: 'relay_board',
    label: 'Relay Board',
    description: 'GPIO relay board via pigpiod — optional',
    deviceType: 'relay',
    wizardProtocol: 'gpio',
    halProtocol: 'gpio',
    metrics: [],
    pollIntervalMs: 10_000,
    optional: true,
    bomRef: 'reference-bom',
  },
];

/** Required (non-optional) golden-kit preset ids. */
export const GOLDEN_KIT_REQUIRED_IDS: string[] = GOLDEN_KIT_PRESETS.filter(
  (p) => !p.optional,
).map((p) => p.id);

export function getGoldenKitPreset(id: string): GoldenKitPreset | undefined {
  return GOLDEN_KIT_PRESETS.find((p) => p.id === id);
}
