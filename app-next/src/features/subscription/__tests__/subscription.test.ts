import { createRuntime } from '../../../runtime/createRuntime';
import { entitlementStore } from '../../../state/entitlementStore';
import { bootDestination } from '../../../onboarding/bootDestination';
test('fake offer and restore outcomes are explicit and controllable', async () => {
  const r = createRuntime();
  await r.dev.load('trial-expired');
  expect(r.subscription.entitlement().offer).toMatchObject({ trialDays: 7, reminderDaysBefore: 2 });
  r.dev.setRestoreOutcome('notFound');
  expect((await r.subscription.restore()).status).toBe('none');
  r.dev.setRestoreOutcome('restored');
  expect((await r.subscription.restore()).status).toBe('active');
  r.dev.setOutcome('error');
  await expect(r.subscription.presentPaywall('in_app')).rejects.toThrow();
  expect(entitlementStore.getState().data.entitlement.status).toBe('active');
  r.dispose();
});
test('entitled users go home; one who has not finished setup goes to sign-in and permissions', () => {
  expect(bootDestination(false, 'P', 'trial', false)).toBe('/setup/X1');
  expect(bootDestination(true, 'P', 'active', false)).toBe('/setup/X1');
  expect(bootDestination(true, 'P', 'active', true)).toBe('/(tabs)/home');
  expect(bootDestination(true, 'P', 'expired', true)).toBe('/(tabs)/home');
  expect(bootDestination(true, 'P', 'billingIssue', true)).toBe('/(tabs)/home');
  expect(bootDestination(true, 'P', 'unknown', true)).toBe('/(tabs)/home');
  expect(bootDestination(true, 'P', 'expired', false)).toBe('/paywall');
});
