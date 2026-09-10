import type { Rule } from './types';
import { planScheduleWindows, type ScheduleWindowPlan } from './scheduleWindowPlan';

export type SchedulePlanContext = Readonly<{ now: string; timezone: string }>;

const FIXED_REPRESENTATIVE_CONTEXT: SchedulePlanContext = {
  now: '2026-09-06T12:00:00.000Z',
  timezone: 'UTC',
};

export class SchedulePlanError extends Error {
  readonly reason: Extract<ScheduleWindowPlan, { ok: false }>['reason'];
  readonly required: number;

  constructor(plan: Extract<ScheduleWindowPlan, { ok: false }>) {
    super(`Native schedule cannot represent exact policy: ${plan.reason}`);
    this.name = 'SchedulePlanError';
    this.reason = plan.reason;
    this.required = plan.required;
  }
}

/** Validates the complete enabled-rule union without broadening or truncating it.
 * Production callers must provide their ClockPort context. The fixed default keeps
 * pure compatibility tests deterministic without reaching for the system clock. */
export function assertScheduleRepresentable(
  rules: readonly Rule[],
  context: SchedulePlanContext = FIXED_REPRESENTATIVE_CONTEXT,
) {
  const plan = planScheduleWindows(rules, context.now, context.timezone);
  if (!plan.ok) throw new SchedulePlanError(plan);
}
