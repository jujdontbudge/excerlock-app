import { entitlementAccess } from '../entitlementAccess';

test('an expired entitlement keeps app access and asks for a modal paywall', () => {
  expect(entitlementAccess('expired')).toEqual({ appAccess: true, paywall: 'modal' });
  expect(entitlementAccess('billingIssue')).toEqual({ appAccess: true, paywall: 'modal' });
});

test('a never-subscribed user is held at the hard paywall', () => {
  expect(entitlementAccess('none')).toEqual({ appAccess: false, paywall: 'hard' });
});

test('active access needs no paywall and unknown access stays on splash', () => {
  expect(entitlementAccess('trial')).toEqual({ appAccess: true, paywall: null });
  expect(entitlementAccess('active')).toEqual({ appAccess: true, paywall: null });
  expect(entitlementAccess('unknown')).toEqual({ appAccess: false, paywall: null });
});
