import { enforcementPlan, EnforcementPlan } from '../enforcement';
import { Entitlement, LockDecision } from '../types';

const entitlement = (status: Entitlement['status']): Entitlement => ({ status, renewsAt: null });
const locked: LockDecision = {
  state: 'locked',
  activeRuleIds: ['walk'],
  nextUnlockHint: { ruleId: 'walk', action: 'progress', remaining: 5000, goal: 5000, unit: 'steps' },
};
const open: LockDecision = { state: 'noRulesToday', nextLockAt: null };

test.each(['expired', 'billingIssue', 'none'] as const)(
  '%s entitlement clears shields and unregisters monitors even while the decision is locked',
  (status) => {
    expect(enforcementPlan({ entitlement: entitlement(status), decision: locked })).toEqual({
      shields: 'clear',
      monitors: 'unregister',
      reason: 'entitlementLapsed',
    });
  },
);

test('active and trial entitlements follow the decision while keeping monitors armed', () => {
  expect(enforcementPlan({ entitlement: entitlement('active'), decision: locked })).toEqual({
    shields: 'apply',
    monitors: 'keep',
    reason: 'decisionLocked',
  });
  expect(enforcementPlan({ entitlement: entitlement('trial'), decision: open })).toEqual({
    shields: 'clear',
    monitors: 'keep',
    reason: 'decisionOpen',
  });
});

test('returning from billingIssue to active produces a monitor-keeping locked plan', () => {
  const lapsed = enforcementPlan({ entitlement: entitlement('billingIssue'), decision: locked });
  const restored = enforcementPlan({ entitlement: entitlement('active'), decision: locked });
  expect(lapsed.monitors).toBe('unregister');
  expect(restored).toMatchObject({ shields: 'apply', monitors: 'keep' });
});

test('unknown keeps the last applied state inside three seconds, then uses persisted known-good status', () => {
  const lastApplied: EnforcementPlan = { shields: 'apply', monitors: 'keep', reason: 'decisionLocked' };
  expect(
    enforcementPlan({
      entitlement: entitlement('unknown'),
      decision: open,
      now: '2026-09-07T19:00:02.999Z',
      unknownSince: '2026-09-07T19:00:00.000Z',
      lastApplied,
      lastKnownGood: 'active',
    }),
  ).toEqual(lastApplied);
  expect(
    enforcementPlan({
      entitlement: entitlement('unknown'),
      decision: open,
      now: '2026-09-07T19:00:03.000Z',
      unknownSince: '2026-09-07T19:00:00.000Z',
      lastApplied,
      lastKnownGood: 'active',
    }),
  ).toEqual({ shields: 'clear', monitors: 'keep', reason: 'decisionOpen' });
});

test('unknown without trusted history fails closed instead of newly clearing', () => {
  expect(enforcementPlan({ entitlement: entitlement('unknown'), decision: open })).toEqual({
    shields: 'apply',
    monitors: 'keep',
    reason: 'unknownFailClosed',
  });
});
