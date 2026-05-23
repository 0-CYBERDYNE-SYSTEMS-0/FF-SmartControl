/**
 * Protocol-Level Fault Injection System
 *
 * Injects controlled faults at protocol boundaries to test system resilience.
 * Covers data corruption, communication failures, safety bypass attempts,
 * and edge-case protocol violations.
 *
 * Architecture:
 *   FaultInjectionController — global singleton, manages active faults + interception
 *   Protocol hooks — lightweight intercept() calls at each protocol boundary
 *   Deterministic triggering — probability, count-based, or scheduled faults
 *
 * Usage in tests:
 *   const fic = getFaultInjectionController();
 *   fic.inject('sensor_reading_to_hal', 'value_corruption', { probability: 1.0 });
 *   // ... run protocol operation ...
 *   const triggered = fic.getTriggeredFaults();
 *
 * Usage in simulator:
 *   const fic = getFaultInjectionController();
 *   fic.inject('decision_to_verifier', 'payload_malformation', { count: 3 });
 *   // simulator tick() will automatically intercept at injection points
 */

// ═══════════════════════════════════════════════════════════════════════════
// FAULT TYPES (protocol-level)
// ═══════════════════════════════════════════════════════════════════════════

export type FaultType =
  // Data corruption faults
  | 'value_corruption'       // NaN, Infinity, out-of-range, wrong type in values
  | 'payload_malformation'   // Missing/wrong fields in protocol messages
  | 'type_confusion'         // Wrong TypeScript types at protocol boundaries
  | 'state_inconsistency'    // Device state that doesn't match reality

  // Communication faults
  | 'message_drop'           // Drop protocol messages entirely
  | 'message_delay'          // Add latency to protocol messages
  | 'message_duplicate'      // Duplicate protocol messages
  | 'message_reorder'        // Reorder protocol messages

  // Safety bypass attempts (security testing)
  | 'verifier_bypass'        // Simulate attempt to skip verifier
  | 'estop_suppression'      // Simulate E-Stop suppression
  | 'audit_tampering'        // Simulate audit log manipulation

  // Edge cases
  | 'boundary_injection'     // Inject values at protocol boundary extremes
  | 'race_condition'         // Simulate timing race between verify and execute
  | 'resource_exhaustion';   // Simulate resource exhaustion

// ═══════════════════════════════════════════════════════════════════════════
// INJECTION POINTS (protocol boundaries)
// ═══════════════════════════════════════════════════════════════════════════

export type InjectionPoint =
  | 'sensor_reading_to_hal'   // Sensor → HAL storage
  | 'hal_to_snapshot'         // HAL → sensor snapshot (for decision loop)
  | 'decision_loop_input'     // Snapshot → decision loop
  | 'decision_to_verifier'    // Decision → verifier
  | 'verifier_to_execution'   // Verifier approval → hardware execution
  | 'relay_command'           // Relay toggle command
  | 'estop_check'             // E-Stop state check
  | 'audit_log_write'         // Audit log entry creation
  | 'registry_read'           // Device registry read
  | 'registry_write';         // Device registry write

// ═══════════════════════════════════════════════════════════════════════════
// FAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export interface FaultConfig {
  /** Probability of triggering (0-1). Default: 0.5 */
  probability?: number;
  /** Exact number of times to trigger. Mutually exclusive with probability. */
  count?: number;
  /** Minimum delay before fault triggers (ms). Default: 0 */
  delayMs?: number;
  /** Only trigger every Nth interception. Default: 1 (every time) */
  everyNth?: number;
  /** Custom payload to inject (for value_corruption, payload_malformation) */
  overrideValue?: unknown;
  /** For value_corruption: force NaN instead of random corruption */
  forceNaN?: boolean;
  /** For value_corruption: force Infinity instead of random corruption */
  forceInfinity?: boolean;
  /** For value_corruption: specific offset to apply */
  corruptionOffset?: number;
  /** For message_delay: delay in ms */
  delayAmountMs?: number;
  /** For race_condition: delay before verifier re-check (ms) */
  raceWindowMs?: number;
  /** Human-readable label for this fault (for audit/debug) */
  label?: string;
}

export interface FaultInjection {
  id: string;
  point: InjectionPoint;
  type: FaultType;
  config: FaultConfig;
  createdAt: number;
  triggerCount: number;
  lastTriggeredAt: number | null;
  active: boolean;
}

export interface FaultTriggerRecord {
  faultId: string;
  point: InjectionPoint;
  type: FaultType;
  triggeredAt: number;
  originalValue?: unknown;
  modifiedValue?: unknown;
  intercepted: boolean;
}

export interface FaultStatus {
  activeFaults: number;
  totalTriggers: number;
  faultsByPoint: Partial<Record<InjectionPoint, number>>;
  faultsByType: Partial<Record<FaultType, number>>;
  recentTriggers: FaultTriggerRecord[];
}

// ═══════════════════════════════════════════════════════════════════════════
// FAULT INJECTION CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

let idCounter = 0;

function genFaultId(): string {
  return `fault_${Date.now()}_${++idCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

export class FaultInjectionController {
  private faults: Map<string, FaultInjection> = new Map();
  private triggers: FaultTriggerRecord[] = [];
  private maxTriggers: number;
  private interceptionCounts: Map<InjectionPoint, number> = new Map();

  constructor(maxTriggers = 1000) {
    this.maxTriggers = maxTriggers;
  }

  // ── Core API ──────────────────────────────────────────────────────────

  /**
   * Inject a fault at a protocol boundary.
   * Returns fault ID for later clearing/verification.
   */
  inject(
    point: InjectionPoint,
    type: FaultType,
    config: FaultConfig = {},
  ): string {
    const id = genFaultId();
    const fault: FaultInjection = {
      id,
      point,
      type,
      config: { probability: 0.5, ...config },
      createdAt: Date.now(),
      triggerCount: 0,
      lastTriggeredAt: null,
      active: true,
    };
    this.faults.set(id, fault);
    return id;
  }

  /**
   * Inject a sequence of faults across multiple injection points.
   */
  injectSequence(
    faults: Array<{ point: InjectionPoint; type: FaultType; config?: FaultConfig }>,
  ): string[] {
    return faults.map((f) => this.inject(f.point, f.type, f.config));
  }

  /**
   * Inject a battery of faults designed to test a specific safety property.
   */
  injectTestBattery(
    battery:
      | 'safety_verifier_stress'
      | 'estop_resilience'
      | 'sensor_corruption'
      | 'communication_failure'
      | 'full_protocol_chaos',
    intensity: 'low' | 'medium' | 'high' = 'medium',
  ): string[] {
    const p = intensity === 'high' ? 1.0 : intensity === 'medium' ? 0.5 : 0.2;
    const ids: string[] = [];

    switch (battery) {
      case 'safety_verifier_stress':
        ids.push(
          this.inject('decision_to_verifier', 'payload_malformation', { probability: p }),
          this.inject('decision_to_verifier', 'type_confusion', { probability: p * 0.7 }),
          this.inject('verifier_to_execution', 'race_condition', {
            probability: p * 0.5,
            raceWindowMs: 50,
          }),
          this.inject('verifier_to_execution', 'verifier_bypass', { probability: p * 0.3 }),
          this.inject('decision_loop_input', 'value_corruption', { probability: p * 0.4 }),
        );
        break;

      case 'estop_resilience':
        ids.push(
          this.inject('estop_check', 'estop_suppression', { probability: p }),
          this.inject('estop_check', 'message_delay', { delayAmountMs: 5000, probability: p }),
          this.inject('estop_check', 'state_inconsistency', { probability: p * 0.5 }),
          this.inject('audit_log_write', 'audit_tampering', { probability: p * 0.3 }),
          this.inject('relay_command', 'message_drop', { probability: p * 0.6 }),
        );
        break;

      case 'sensor_corruption':
        ids.push(
          this.inject('sensor_reading_to_hal', 'value_corruption', {
            probability: p,
            forceNaN: intensity === 'high',
          }),
          this.inject('sensor_reading_to_hal', 'boundary_injection', { probability: p * 0.6 }),
          this.inject('hal_to_snapshot', 'message_drop', { probability: p * 0.3 }),
          this.inject('hal_to_snapshot', 'message_delay', {
            delayAmountMs: 2000,
            probability: p * 0.3,
          }),
        );
        break;

      case 'communication_failure':
        ids.push(
          this.inject('relay_command', 'message_drop', { probability: p }),
          this.inject('relay_command', 'message_delay', {
            delayAmountMs: 10000,
            probability: p,
          }),
          this.inject('relay_command', 'message_duplicate', { probability: p * 0.5 }),
          this.inject('registry_write', 'state_inconsistency', { probability: p * 0.4 }),
          this.inject('registry_read', 'message_drop', { probability: p * 0.3 }),
        );
        break;

      case 'full_protocol_chaos':
        // Inject faults at EVERY injection point
        const allPoints: InjectionPoint[] = [
          'sensor_reading_to_hal',
          'hal_to_snapshot',
          'decision_loop_input',
          'decision_to_verifier',
          'verifier_to_execution',
          'relay_command',
          'estop_check',
          'audit_log_write',
          'registry_read',
          'registry_write',
        ];
        for (const point of allPoints) {
          const types = this.getApplicableFaultTypes(point);
          const type = types[Math.floor(Math.random() * types.length)];
          ids.push(this.inject(point, type, { probability: p * 0.5 }));
        }
        break;
    }

    return ids;
  }

  /**
   * Clear a specific fault by ID.
   */
  clear(faultId: string): boolean {
    return this.faults.delete(faultId);
  }

  /**
   * Clear all active faults.
   */
  clearAll(): void {
    this.faults.clear();
    this.triggers = [];
    this.interceptionCounts.clear();
  }

  /**
   * Clear faults at a specific injection point.
   */
  clearPoint(point: InjectionPoint): number {
    let count = 0;
    for (const [id, fault] of this.faults) {
      if (fault.point === point) {
        this.faults.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Deactivate a fault without removing it (for tracking).
   */
  deactivate(faultId: string): boolean {
    const fault = this.faults.get(faultId);
    if (!fault) return false;
    fault.active = false;
    return true;
  }

  /**
   * Reactivate a deactivated fault.
   */
  activate(faultId: string): boolean {
    const fault = this.faults.get(faultId);
    if (!fault) return false;
    fault.active = true;
    return true;
  }

  /**
   * List all active faults.
   */
  listActive(): FaultInjection[] {
    return Array.from(this.faults.values()).filter((f) => f.active);
  }

  /**
   * List all faults (including inactive).
   */
  listAll(): FaultInjection[] {
    return Array.from(this.faults.values());
  }

  /**
   * Get triggered fault records.
   */
  getTriggeredFaults(): FaultTriggerRecord[] {
    return [...this.triggers];
  }

  /**
   * Get fault injection status summary.
   */
  getStatus(): FaultStatus {
    const active = this.listActive();
    const faultsByPoint: Partial<Record<InjectionPoint, number>> = {};
    const faultsByType: Partial<Record<FaultType, number>> = {};

    for (const f of active) {
      faultsByPoint[f.point] = (faultsByPoint[f.point] || 0) + 1;
      faultsByType[f.type] = (faultsByType[f.type] || 0) + 1;
    }

    return {
      activeFaults: active.length,
      totalTriggers: this.triggers.length,
      faultsByPoint,
      faultsByType,
      recentTriggers: this.triggers.slice(-20),
    };
  }

  /**
   * Verify that a specific fault was triggered at least once.
   */
  verifyFaultTriggered(faultId: string): boolean {
    return this.triggers.some((t) => t.faultId === faultId);
  }

  /**
   * Verify that a specific fault was triggered at least N times.
   */
  verifyFaultTriggeredCount(faultId: string, minCount: number): boolean {
    const count = this.triggers.filter((t) => t.faultId === faultId).length;
    return count >= minCount;
  }

  /**
   * Get the interception count for a specific injection point.
   */
  getInterceptionCount(point: InjectionPoint): number {
    return this.interceptionCounts.get(point) || 0;
  }

  // ── Protocol Interception ────────────────────────────────────────────

  /**
   * Intercept a protocol message at an injection point.
   * Returns { intercepted: boolean, data: modified data, faultId?: string }
   *
   * Called at every protocol boundary. If no fault triggers, data passes through unchanged.
   */
  intercept<T>(
    point: InjectionPoint,
    data: T,
  ): { intercepted: boolean; data: T; faultId?: string; faultType?: FaultType } {
    // Track interception count
    this.interceptionCounts.set(
      point,
      (this.interceptionCounts.get(point) || 0) + 1,
    );

    const interceptionIdx = this.interceptionCounts.get(point)!;

    // Find active faults at this injection point
    const activeFaults = Array.from(this.faults.values()).filter(
      (f) => f.active && f.point === point,
    );

    if (activeFaults.length === 0) {
      return { intercepted: false, data };
    }

    // Check each fault (first match wins)
    for (const fault of activeFaults) {
      if (!this.shouldTriggerFault(fault, interceptionIdx)) continue;

      fault.triggerCount++;
      fault.lastTriggeredAt = Date.now();

      let modifiedData: T;

      try {
        modifiedData = this.applyFault(fault, data);
      } catch {
        // If fault application fails, pass through original data
        modifiedData = data;
      }

      const record: FaultTriggerRecord = {
        faultId: fault.id,
        point: fault.point,
        type: fault.type,
        triggeredAt: Date.now(),
        originalValue: data,
        modifiedValue: modifiedData,
        intercepted: true,
      };
      this.triggers.push(record);
      this.pruneTriggers();

      return {
        intercepted: true,
        data: modifiedData,
        faultId: fault.id,
        faultType: fault.type,
      };
    }

    return { intercepted: false, data };
  }

  // ── Internal Methods ─────────────────────────────────────────────────

  private shouldTriggerFault(fault: FaultInjection, interceptionIdx: number): boolean {
    const cfg = fault.config;

    // everyNth check
    if (cfg.everyNth && cfg.everyNth > 1) {
      if (interceptionIdx % cfg.everyNth !== 0) return false;
    }

    // Delay check
    if (cfg.delayMs && cfg.delayMs > 0) {
      const elapsed = Date.now() - fault.createdAt;
      if (elapsed < cfg.delayMs) return false;
    }

    // Count-based: exact number of triggers
    if (cfg.count !== undefined && cfg.count > 0) {
      return fault.triggerCount < cfg.count;
    }

    // Probability-based
    const prob = cfg.probability ?? 0.5;
    return Math.random() < prob;
  }

  private applyFault<T>(fault: FaultInjection, data: T): T {
    const cfg = fault.config;

    switch (fault.type) {
      case 'value_corruption':
        return this.corruptValue(data, cfg);

      case 'payload_malformation':
        return this.malformPayload(data, cfg);

      case 'type_confusion':
        return this.confuseType(data);

      case 'state_inconsistency':
        return this.inconsistentState(data);

      case 'message_drop':
        return undefined as T; // Signals "dropped"

      case 'message_delay':
        return data; // Pass through (delay is advisory — caller handles timing)

      case 'message_duplicate':
        return data; // Pass through (duplicate is advisory — caller handles)

      case 'message_reorder':
        return data; // Pass through (reorder is advisory — caller handles buffering)

      case 'verifier_bypass':
        return this.spoofVerifierBypass(data);

      case 'estop_suppression':
        return this.suppressEstop(data);

      case 'audit_tampering':
        return this.tamperAudit(data);

      case 'boundary_injection':
        return this.injectBoundaryValue(data, cfg);

      case 'race_condition':
        return data; // Advisory — caller handles timing

      case 'resource_exhaustion':
        return this.simulateExhaustion(data);

      default:
        return data;
    }
  }

  private corruptValue<T>(data: T, cfg: FaultConfig): T {
    if (cfg.overrideValue !== undefined) {
      return cfg.overrideValue as T;
    }

    // For object payloads, find the first numeric field and corrupt it
    if ((cfg.forceNaN || cfg.forceInfinity) && data && typeof data === 'object' && !Array.isArray(data)) {
      const obj = { ...data as object } as Record<string, unknown>;
      // Find first numeric field to corrupt
      let corrupted = false;
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'number') {
          obj[key] = cfg.forceNaN ? NaN : Infinity;
          corrupted = true;
          break;
        }
      }
      // If no numeric field found, add a corrupted field
      if (!corrupted) {
        obj['value'] = cfg.forceNaN ? NaN : Infinity;
      }
      return obj as T;
    }

    if (cfg.forceNaN && (typeof data === 'number' || data === null || data === undefined)) {
      return NaN as T;
    }

    if (cfg.forceInfinity && (typeof data === 'number' || data === null || data === undefined)) {
      return Infinity as T;
    }

    if (cfg.corruptionOffset !== undefined && typeof data === 'number') {
      return (data + cfg.corruptionOffset) as T;
    }

    // Random corruption based on type
    if (typeof data === 'number') {
      const corruptionType = Math.random();
      if (corruptionType < 0.25) return NaN as T;
      if (corruptionType < 0.45) return Infinity as T;
      if (corruptionType < 0.65) return -Infinity as T;
      if (corruptionType < 0.85) return (data * (Math.random() * 10 - 5)) as T;
      return (data + (Math.random() > 0.5 ? 999999 : -999999)) as T;
    }

    if (typeof data === 'string') {
      const corruptionType = Math.random();
      if (corruptionType < 0.3) return '' as T;
      if (corruptionType < 0.6) return 'undefined' as T;
      if (corruptionType < 0.85) return (data + '\x00CORRUPTED\x00') as T;
      return null as T;
    }

    if (typeof data === 'boolean') {
      return (!data) as T;
    }

    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        if (data.length > 0) {
          const corrupted = [...data];
          const idx = Math.floor(Math.random() * corrupted.length);
          corrupted[idx] = this.corruptValue(corrupted[idx], {}) as typeof corrupted[number];
          return corrupted as T;
        }
        return ([] as T);
      }
      // Corrupt a random numeric property first (more likely to matter), fall back to any property
      const obj = data as Record<string, unknown>;
      const keys = Object.keys(obj);
      if (keys.length > 0) {
        const corrupted = { ...obj };
        // Prefer numeric fields for corruption (80% chance)
        const numericKeys = keys.filter((k) => typeof obj[k] === 'number');
        if (numericKeys.length > 0 && Math.random() < 0.8) {
          const key = numericKeys[Math.floor(Math.random() * numericKeys.length)];
          corrupted[key] = this.corruptValue(corrupted[key], {});
        } else {
          const key = keys[Math.floor(Math.random() * keys.length)];
          corrupted[key] = this.corruptValue(corrupted[key], {});
        }
        return corrupted as T;
      }
    }

    return data;
  }

  private malformPayload<T>(data: T, cfg: FaultConfig): T {
    if (cfg.overrideValue !== undefined) {
      return cfg.overrideValue as T;
    }

    if (!data || typeof data !== 'object') {
      return data;
    }

    const obj = { ...data as object } as Record<string, unknown>;

    // Various malformation strategies
    const strategy = Math.random();

    if (strategy < 0.2) {
      // Remove a required field
      const keys = Object.keys(obj);
      if (keys.length > 0) {
        delete obj[keys[Math.floor(Math.random() * keys.length)]];
      }
    } else if (strategy < 0.4) {
      // Set a required field to null
      const keys = Object.keys(obj);
      if (keys.length > 0) {
        obj[keys[Math.floor(Math.random() * keys.length)]] = null;
      }
    } else if (strategy < 0.6) {
      // Change the type of a field
      const keys = Object.keys(obj);
      if (keys.length > 0) {
        const key = keys[Math.floor(Math.random() * keys.length)];
        const val = obj[key];
        if (typeof val === 'string') obj[key] = 0;
        else if (typeof val === 'number') obj[key] = 'corrupted';
        else if (typeof val === 'boolean') obj[key] = 'not-a-boolean';
        else obj[key] = {};
      }
    } else if (strategy < 0.8) {
      // Inject extra unexpected field
      obj['__malformed__'] = 'INJECTED_FAULT';
    } else {
      // Replace entire payload with garbage
      return { __fault__: 'MALFORMED_PAYLOAD', _garbage: Math.random() } as T;
    }

    return obj as T;
  }

  private confuseType<T>(data: T): T {
    if (data === null || data === undefined) return data;

    const typeConfusions = [
      () => (typeof data === 'number' ? String(data) : Number(data)),
      () => (Array.isArray(data) ? (data.length > 0 ? data[0] : null) : [data]),
      () => (typeof data === 'object' ? JSON.stringify(data) : { value: data }),
      () => (typeof data === 'string' ? parseInt(data, 10) || 0 : String(data)),
      () => null,
      () => undefined,
    ];

    const fn = typeConfusions[Math.floor(Math.random() * typeConfusions.length)];
    try {
      return fn() as T;
    } catch {
      return null as T;
    }
  }

  private inconsistentState<T>(data: T): T {
    // Return a state that contradicts reality
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      // Invert on/off states
      if (obj.state === 'on') return { ...obj, state: 'off' } as T;
      if (obj.state === 'off') return { ...obj, state: 'on' } as T;
      if (obj.last_state === 'on') return { ...obj, last_state: 'off' } as T;
      if (obj.last_state === 'off') return { ...obj, last_state: 'on' } as T;
      if (obj.active === true) return { ...obj, active: false } as T;
      if (obj.active === false) return { ...obj, active: true } as T;
      // Add a contradictory field
      return { ...obj, _inconsistent: true } as T;
    }
    return data;
  }

  private spoofVerifierBypass<T>(data: T): T {
    // Simulate what a bypassed verifier response would look like
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return {
        ...(data as object),
        approved: true,
        result: 'APPROVED',
        reason: null,
        conflictingRuleIds: [],
        _verifier_bypassed: true,
      } as T;
    }
    return { approved: true, _verifier_bypassed: true } as T;
  }

  private suppressEstop<T>(data: T): T {
    // Simulate suppressed E-Stop state
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return {
        ...(data as object),
        active: false,
        _estop_suppressed: true,
      } as T;
    }
    return { active: false, _estop_suppressed: true } as T;
  }

  private tamperAudit<T>(data: T): T {
    // Simulate tampered audit entry
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      return {
        ...obj,
        verifierResult: 'APPROVED',
        deniedReason: null,
        conflictingRuleIds: null,
        _audit_tampered: true,
      } as T;
    }
    return { verifierResult: 'APPROVED', _audit_tampered: true } as T;
  }

  private injectBoundaryValue<T>(data: T, cfg: FaultConfig): T {
    if (cfg.overrideValue !== undefined) {
      return cfg.overrideValue as T;
    }

    if (typeof data === 'number') {
      const boundaries = [
        Number.MAX_VALUE,
        Number.MIN_VALUE,
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Number.EPSILON,
        0,
        -0,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
      ];
      return boundaries[Math.floor(Math.random() * boundaries.length)] as T;
    }

    if (typeof data === 'string') {
      const boundaries = [
        '',
        '\x00',
        'A'.repeat(1_000_000), // large string
        '<script>alert(1)</script>',
        'null',
        'undefined',
        'NaN',
        '{}',
        '[]',
      ];
      return boundaries[Math.floor(Math.random() * boundaries.length)] as T;
    }

    if (Array.isArray(data)) {
      return ([] as T);
    }

    if (data && typeof data === 'object') {
      return ({} as T);
    }

    return data;
  }

  private simulateExhaustion<T>(data: T): T {
    // Return error-like objects that signal resource exhaustion
    const exhaustionSignals = [
      { error: 'EMFILE: too many open files' },
      { error: 'ENOMEM: out of memory' },
      { error: 'ECONNREFUSED: connection refused' },
      { error: 'ETIMEDOUT: connection timed out' },
      null,
      undefined,
    ];
    return exhaustionSignals[
      Math.floor(Math.random() * exhaustionSignals.length)
    ] as T;
  }

  private getApplicableFaultTypes(point: InjectionPoint): FaultType[] {
    switch (point) {
      case 'sensor_reading_to_hal':
        return ['value_corruption', 'boundary_injection', 'type_confusion'];
      case 'hal_to_snapshot':
        return ['message_drop', 'message_delay', 'value_corruption'];
      case 'decision_loop_input':
        return ['value_corruption', 'payload_malformation', 'message_drop'];
      case 'decision_to_verifier':
        return [
          'payload_malformation',
          'type_confusion',
          'verifier_bypass',
          'message_drop',
          'value_corruption',
        ];
      case 'verifier_to_execution':
        return ['race_condition', 'verifier_bypass', 'message_drop', 'state_inconsistency'];
      case 'relay_command':
        return [
          'message_drop',
          'message_delay',
          'message_duplicate',
          'state_inconsistency',
          'resource_exhaustion',
        ];
      case 'estop_check':
        return ['estop_suppression', 'message_delay', 'state_inconsistency'];
      case 'audit_log_write':
        return ['audit_tampering', 'resource_exhaustion', 'message_drop'];
      case 'registry_read':
        return ['state_inconsistency', 'message_drop', 'message_delay'];
      case 'registry_write':
        return ['state_inconsistency', 'message_drop', 'resource_exhaustion'];
      default:
        return ['value_corruption'];
    }
  }

  private pruneTriggers(): void {
    while (this.triggers.length > this.maxTriggers) {
      this.triggers.shift();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON + FACTORY
// ═══════════════════════════════════════════════════════════════════════════

let globalController: FaultInjectionController | null = null;

/**
 * Get or create the global fault injection controller.
 */
export function getFaultInjectionController(): FaultInjectionController {
  if (!globalController) {
    globalController = new FaultInjectionController();
  }
  return globalController;
}

/**
 * Create an isolated fault injection controller (for parallel tests).
 */
export function createFaultInjectionController(
  maxTriggers = 1000,
): FaultInjectionController {
  return new FaultInjectionController(maxTriggers);
}

/**
 * Reset the global controller (between tests).
 */
export function resetFaultInjectionController(): void {
  globalController = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROTOCOL HELPERS — convenience functions for common interceptions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Intercept a sensor reading before it's stored in HAL.
 * Returns undefined if the reading should be dropped.
 */
export function interceptSensorReading(
  deviceId: string,
  metric: string,
  value: number,
): { value: number; faultId?: string; faultType?: FaultType } | undefined {
  const fic = getFaultInjectionController();
  const data = { deviceId, metric, value, timestamp: Date.now() };
  const result = fic.intercept('sensor_reading_to_hal', data);

  if (result.intercepted && result.data === undefined) {
    return undefined; // Dropped
  }

  return {
    value: (result.data as typeof data).value,
    faultId: result.faultId,
    faultType: result.faultType,
  };
}

/**
 * Intercept a decision before it goes to the verifier.
 * Returns { intercepted, decision } — caller should use modified decision.
 */
export function interceptDecision<T extends { decision: string; deviceId: string | null; confidence?: number }>(
  decision: T,
): { intercepted: boolean; decision: T; faultId?: string; faultType?: FaultType } {
  const fic = getFaultInjectionController();
  const result = fic.intercept('decision_to_verifier', decision);
  return {
    intercepted: result.intercepted,
    decision: result.data,
    faultId: result.faultId,
    faultType: result.faultType,
  };
}

/**
 * Intercept a verifier result before execution.
 */
export function interceptVerifierResult<T extends { approved: boolean }>(
  result: T,
): { intercepted: boolean; result: T; faultId?: string; faultType?: FaultType } {
  const fic = getFaultInjectionController();
  const out = fic.intercept('verifier_to_execution', result);
  return {
    intercepted: out.intercepted,
    result: out.data,
    faultId: out.faultId,
    faultType: out.faultType,
  };
}

/**
 * Intercept an E-Stop state check.
 */
export function interceptEstopCheck(
  state: { active: boolean },
): { intercepted: boolean; state: { active: boolean }; faultId?: string; faultType?: FaultType } {
  const fic = getFaultInjectionController();
  const out = fic.intercept('estop_check', state);
  return {
    intercepted: out.intercepted,
    state: out.data,
    faultId: out.faultId,
    faultType: out.faultType,
  };
}
