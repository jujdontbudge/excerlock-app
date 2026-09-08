import { entitlementFromProfile } from '../entitlementFromProfile';
import { premium, profile } from './profiles';

test('no premium access level is a user who never subscribed', () => {
  expect(entitlementFromProfile(profile())).toEqual({ status: 'none', renewsAt: null });
  expect(entitlementFromProfile(profile({}))).toEqual({ status: 'none', renewsAt: null });
});

test('an active subscription carries its renewal date', () => {
  expect(entitlementFromProfile(premium({ expiresAt: new Date('2027-09-01T15:00:00.000Z') }))).toEqual({
    status: 'active',
    renewsAt: '2027-09-01T15:00:00.000Z',
  });
});

test('an active free trial reads as trial, not active', () => {
  expect(
    entitlementFromProfile(
      premium({ activeIntroductoryOfferType: 'free_trial', expiresAt: new Date('2026-09-14T15:00:00.000Z') }),
    ),
  ).toEqual({ status: 'trial', renewsAt: '2026-09-14T15:00:00.000Z' });
});

test('billing grace maps to active: v1 has no grace status and the user keeps their apps working', () => {
  expect(
    entitlementFromProfile(
      premium({
        isInGracePeriod: true,
        billingIssueDetectedAt: new Date('2026-09-05T15:00:00.000Z'),
        expiresAt: new Date('2026-09-20T15:00:00.000Z'),
      }),
    ),
  ).toEqual({ status: 'active', renewsAt: '2026-09-20T15:00:00.000Z' });
});

test('a grace period that started during a trial still reads as active', () => {
  expect(
    entitlementFromProfile(
      premium({ isInGracePeriod: true, activeIntroductoryOfferType: 'free_trial', expiresAt: undefined }),
    ),
  ).toMatchObject({ status: 'active' });
});

test('an inactive access level with a billing issue is a billing issue, not an expiry', () => {
  expect(
    entitlementFromProfile(
      premium({
        isActive: false,
        willRenew: false,
        billingIssueDetectedAt: new Date('2026-09-05T15:00:00.000Z'),
        expiresAt: new Date('2026-09-06T15:00:00.000Z'),
      }),
    ),
  ).toEqual({ status: 'billingIssue', renewsAt: '2026-09-06T15:00:00.000Z' });
});

test('an inactive access level that simply lapsed is expired', () => {
  expect(
    entitlementFromProfile(premium({ isActive: false, willRenew: false, expiresAt: new Date('2026-09-06T15:00:00.000Z') })),
  ).toEqual({ status: 'expired', renewsAt: '2026-09-06T15:00:00.000Z' });
});

test('a refund is an expiry even when a billing issue was recorded', () => {
  expect(
    entitlementFromProfile(
      premium({ isActive: false, isRefund: true, billingIssueDetectedAt: new Date('2026-09-05T15:00:00.000Z') }),
    ),
  ).toMatchObject({ status: 'expired' });
});

test('a lifetime access level has no renewal date', () => {
  expect(entitlementFromProfile(premium({ isLifetime: true, expiresAt: undefined }))).toEqual({
    status: 'active',
    renewsAt: null,
  });
});

test('another product access level never grants premium', () => {
  expect(entitlementFromProfile(profile({ pro: { ...premium().accessLevels!.premium, id: 'pro' } }))).toEqual({
    status: 'none',
    renewsAt: null,
  });
});
