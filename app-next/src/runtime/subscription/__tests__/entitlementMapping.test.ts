import { mapEntitlement, reduceEntitlement } from '../entitlementMapping';

const profile = (premium?: Record<string, unknown>) => ({
  customerUserId: 'uid',
  accessLevels: premium ? { premium } : {},
});
const base = { isActive: false, isLifetime: false, isInGracePeriod: false, willRenew: false };

test.each([
  ['trial', { ...base, isActive: true, activeIntroductoryOfferType: 'free_trial' }],
  ['active', { ...base, isActive: true, willRenew: true, expiresAt: new Date('2030-01-01') }],
  ['active', { ...base, isActive: true, willRenew: false, expiresAt: new Date('2030-01-01') }],
  ['active', { ...base, isActive: true, isInGracePeriod: true, expiresAt: new Date('2020-01-01') }],
  ['active', { ...base, isActive: true, isLifetime: true }],
  ['expired', { ...base, isInGracePeriod: true }],
  ['expired', { ...base, isLifetime: true }],
  ['billingIssue', { ...base, billingIssueDetectedAt: new Date('2026-01-01') }],
  ['expired', { ...base, expiresAt: new Date('2025-01-01') }],
] as const)('maps premium access to %s', (status, premium) => {
  expect(mapEntitlement(profile(premium) as never)).toMatchObject({ status });
});

test('missing/error is unknown, confirmed empty is none', () => {
  expect(mapEntitlement(null).status).toBe('unknown');
  expect(mapEntitlement(profile() as never).status).toBe('none');
});

test('paired empty restore cannot downgrade active, independent listener can expire', () => {
  const active = { status: 'active' as const, renewsAt: null };
  const empty = { status: 'none' as const, renewsAt: null };
  expect(reduceEntitlement(active, empty, 'restore-return')).toBe(active);
  expect(reduceEntitlement(active, empty, 'restore-callback')).toBe(active);
  expect(reduceEntitlement(active, { status: 'expired', renewsAt: null }, 'listener').status).toBe('expired');
});
