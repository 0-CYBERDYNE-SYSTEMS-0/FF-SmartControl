import { getDb } from './db.js';
import { HalDecision, DecisionType, DecisionOutcome } from './types.js';

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class HalDecisionLog {
  private db = getDb();

  log(data: {
    device_id?: string;
    decision: DecisionType;
    confidence?: number;
    reasoning?: string;
    sensor_snapshot?: Record<string, number>;
    outcome?: DecisionOutcome;
    triggered_by?: string;
    pending_status?: string;
  }): HalDecision {
    const id = genId('dec');
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
      INSERT INTO hal_decision_log (id, device_id, decision, confidence, reasoning, sensor_snapshot, outcome, decided_at, completed_at, triggered_by, pending_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `,
      )
      .run(
        id,
        data.device_id ?? null,
        data.decision,
        data.confidence ?? null,
        data.reasoning ?? null,
        data.sensor_snapshot ? JSON.stringify(data.sensor_snapshot) : null,
        data.outcome ?? 'pending',
        now,
        data.triggered_by ?? 'agent',
        data.pending_status ?? null,
      );
    return this.get(id)!;
  }

  get(id: string): HalDecision | undefined {
    return this.db
      .prepare('SELECT * FROM hal_decision_log WHERE id = ?')
      .get(id) as any;
  }

  // Mark a decision as completed
  complete(id: string, outcome: DecisionOutcome): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        'UPDATE hal_decision_log SET outcome = ?, completed_at = ? WHERE id = ?',
      )
      .run(outcome, now, id);
  }

  // Get recent decisions
  recent(limit = 20): HalDecision[] {
    return this.db
      .prepare(
        `
      SELECT * FROM hal_decision_log ORDER BY decided_at DESC LIMIT ?
    `,
      )
      .all(limit) as any[];
  }
}

export const halDecisions = new HalDecisionLog();
