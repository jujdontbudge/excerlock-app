import { Entitlement, LockDecision, Rule } from '../domain/types';

// merge: replace these compatibility types and this function with P2-T14's domain/enforcement exports.
export type EnforcementPlan = {
  shields: 'apply' | 'clear';
  monitors: 'keep' | 'unregister';
  reason: string;
  planHash: string;
};

export type ApplyResult = {
  applied: boolean;
  shields: 'up' | 'down';
  monitors: number;
  reason?: string;
};

export function enforcementPlan(input: {
  entitlement: Entitlement;
  decision: LockDecision;
  rules: Rule[];
  timezone: string;
}): EnforcementPlan {
  const lapsed = ['expired', 'billingIssue', 'none'].includes(input.entitlement.status);
  return {
    shields: !lapsed && input.decision.state === 'locked' ? 'apply' : 'clear',
    monitors: lapsed ? 'unregister' : 'keep',
    reason: lapsed ? 'entitlementLapsed' : input.decision.state,
    planHash: JSON.stringify(
      input.rules
        .filter((rule) => rule.enabled)
        .map(({ id, schedule, updatedAt }) => ({ id, schedule, updatedAt, timezone: input.timezone })),
    ),
  };
}

// merge: replace with P2-T14's domain/watermark exports.
export function effectiveNow(observed: string, watermark: string): string {
  const rewind = Date.parse(watermark) - Date.parse(observed);
  if (rewind > 26 * 60 * 60 * 1_000) return observed;
  return Date.parse(observed) < Date.parse(watermark) ? watermark : observed;
}

export function nextWatermark(observed: string, watermark: string): string {
  return effectiveNow(observed, watermark);
}
