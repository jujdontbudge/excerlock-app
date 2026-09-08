import { createRuntime } from '../../../runtime/createRuntime';
import { entitlementStore } from '../../../state/entitlementStore';
import { bootDestination } from '../../../onboarding/bootDestination';
test('fake offer and restore outcomes are explicit and controllable', async () => {
  const r = createRuntime();
  await r.dev.load('trial-expired');
  expect(r.subscription.entitlement().offer).toMatchObject({ trialDays: 7, reminderDaysBefore: 2 });
  r.dev.setRestoreOutcome('notFound');
  expect((await r.subscription.restore()).status).toBe('expired');
  r.dev.setRestoreOutcome('restored');
  expect((await r.subscription.restore()).status).toBe('active');
  r.dev.setOutcome('error');
  await expect(r.subscription.presentPaywall('in_app', 'annual')).rejects.toThrow();
  expect(entitlementStore.getState().data.entitlement.status).toBe('active');
  r.dispose();
});
test('entitled users resume setup until it is complete', () => {
  expect(bootDestination(false, 'P', 'trial', false, 'X2')).toBe('/setup/X2');
  expect(bootDestination(true, 'P', 'active', true, 'done')).toBe('/(tabs)/home');
  expect(bootDestination(true, 'P', 'expired', true, 'done')).toBe('/(tabs)/home');
  expect(bootDestination(true, 'P', 'billingIssue', true, 'done')).toBe('/(tabs)/home');
});

test('a restore that finds nothing does not write the entitlement store', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  runtime.dev.setRestoreOutcome('notFound');
  const before = entitlementStore.getState().data.entitlement;
  const changed = jest.fn();
  const unsubscribe = entitlementStore.subscribe(changed);
  expect(await runtime.subscription.restore()).toMatchObject(before);
  expect(changed).not.toHaveBeenCalled();
  expect(entitlementStore.getState().data.entitlement).toBe(before);
  unsubscribe();
  runtime.dispose();
});

test.each([
  ['annual', 'trial', '2026-09-14T15:00:00.000Z'],
  ['monthly', 'active', '2026-10-07T15:00:00.000Z'],
] as const)('choosing %s grants the matching entitlement', async (plan, status, renewsAt) => {
  const runtime = createRuntime();
  await runtime.dev.load('trial-expired');
  expect(await runtime.subscription.presentPaywall('in_app', plan)).toMatchObject({ status, renewsAt });
  expect(runtime.dev.snapshot().events.at(-1)).toMatchObject({
    event: 'paywall_completed',
    props: { placement: 'in_app', plan },
  });
  runtime.dispose();
});
