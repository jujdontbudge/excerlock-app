import { projectEnforcement, type EnforcementProjection } from '../enforcement/projectEnforcement';
const base: EnforcementProjection = {
  revision: 1, now: 1000, activeUntil: 1000000,
  context: { policyGeneration: 1, accountGeneration: 2, selectionVersion: 'opaque-v1' },
  decision: { state: 'unlockedWalking', ruleId: 'walk', since: new Date(0).toISOString() },
  entitlement: { status: 'active', renewsAt: null }, deleting: false,
  screenTimeAuthorized: true, selectionEmpty: false,
  windows: [{ id: 'weekly', start: -2000000, end: -1000000 }],
};
test('uses current instance end, not past recurring anchor', () => {
  expect(projectEnforcement(base)).toMatchObject({ state: 'conditional', eligibleUntil: 1000000, windows: base.windows });
});
test.each(['none', 'expired', 'billingIssue'] as const)('confirmed %s clears enforcing authority', status => {
  expect(projectEnforcement({ ...base, entitlement: { status, renewsAt: null } })).toMatchObject({ state: 'open', openReason: 'lapsed', windows: [], futureEnforcementEligible: false });
});
test('unknown preserves native state but explicit cleanup still wins', () => {
  const unknown = { ...base, entitlement: { status: 'unknown' as const, renewsAt: null } };
  expect(projectEnforcement(unknown).state).toBe('unknown');
  expect(projectEnforcement({ ...unknown, deleting: true }).openReason).toBe('deleting');
  expect(projectEnforcement({ ...unknown, selectionEmpty: true }).openReason).toBe('disabled');
});
test('earned suppression expires at NEXT relock, not current window end', () => {
  expect(projectEnforcement({ ...base, decision: { state: 'unlockedMet', byRuleId: 'walk', byName: 'Walk', metAt: new Date(0).toISOString(), relockAt: new Date(9000000).toISOString() } })).toMatchObject({ state: 'open', openReason: 'earned', eligibleUntil: 9000000, windows: base.windows });
});
test('outside-window retains future authority; stale active decision is rejected', () => {
  expect(projectEnforcement({ ...base, activeUntil: null, decision: { state: 'afterWindow', nextLockAt: null } }).openReason).toBe('outsideWindow');
  expect(() => projectEnforcement({ ...base, activeUntil: null })).toThrow('no current window');
});
test('expiry not renewal ends access; explicit active grace remains valid', () => {
  expect(projectEnforcement({ ...base, entitlement: { status: 'active', renewsAt: new Date(0).toISOString() } }).state).toBe('conditional');
  const entitlement = { status: 'active' as const, renewsAt: null, accessExpiresAt: new Date(0).toISOString() };
  expect(projectEnforcement({ ...base, entitlement }).openReason).toBe('lapsed');
  expect(projectEnforcement({ ...base, entitlement: { ...entitlement, isInGracePeriod: true } }).state).toBe('conditional');
});
