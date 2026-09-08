import { Entitlement, LockDecision } from './types';

export type EnforcementPlan = {
  shields: 'apply' | 'clear';
  monitors: 'keep' | 'unregister';
  reason: 'decisionLocked' | 'decisionOpen' | 'entitlementLapsed' | 'unknownFailClosed';
};

type KnownEntitlement = Exclude<Entitlement['status'], 'unknown'>;
type EnforcementInput = {
  entitlement: Entitlement;
  decision: LockDecision;
  now?: string;
  unknownSince?: string;
  lastApplied?: EnforcementPlan;
  lastKnownGood?: KnownEntitlement;
};

const planForKnown = (status: KnownEntitlement, decision: LockDecision): EnforcementPlan => {
  if (status === 'expired' || status === 'billingIssue' || status === 'none') {
    return { shields: 'clear', monitors: 'unregister', reason: 'entitlementLapsed' };
  }
  return decision.state === 'locked'
    ? { shields: 'apply', monitors: 'keep', reason: 'decisionLocked' }
    : { shields: 'clear', monitors: 'keep', reason: 'decisionOpen' };
};

export function enforcementPlan({
  entitlement,
  decision,
  now,
  unknownSince,
  lastApplied,
  lastKnownGood,
}: EnforcementInput): EnforcementPlan {
  if (entitlement.status !== 'unknown') return planForKnown(entitlement.status, decision);
  if (lastApplied && now && unknownSince && Date.parse(now) - Date.parse(unknownSince) < 3_000) {
    return lastApplied;
  }
  if (lastKnownGood) return planForKnown(lastKnownGood, decision);
  return { shields: 'apply', monitors: 'keep', reason: 'unknownFailClosed' };
}
