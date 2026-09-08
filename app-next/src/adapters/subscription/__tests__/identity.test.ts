import { entitlementStore } from '../../../state/entitlementStore';
import { createSubscriptionAdapter } from '..';
import { premium } from './profiles';
import { flush, never, sdkHarness } from './sdkHarness';

beforeEach(() => entitlementStore.getState().reset());

test('the Supabase id becomes the Adapty customer id, once the SDK is activated', async () => {
  const harness = sdkHarness();
  const subscription = createSubscriptionAdapter({ apiKey: 'public_live_key', sdk: harness.sdk });
  subscription.identify('supabase-uid');
  await subscription.resolved;
  await flush();

  expect(harness.identify).toHaveBeenCalledWith('supabase-uid');
  expect(harness.order.indexOf('activate')).toBeLessThan(harness.order.indexOf('identify:supabase-uid'));
  subscription.dispose();
});

test('identifying before activation finishes is queued, not dropped', async () => {
  let activated = () => undefined as void;
  const harness = sdkHarness({ activate: () => new Promise<void>((resolve) => (activated = () => resolve())) });
  const subscription = createSubscriptionAdapter({ apiKey: 'public_live_key', sdk: harness.sdk });
  subscription.identify('anonymous-uid');
  await flush();
  expect(harness.identify).not.toHaveBeenCalled();

  activated();
  await flush();
  expect(harness.identify).toHaveBeenCalledWith('anonymous-uid');
  subscription.dispose();
});

test('two ids identify in the order the session changed them', async () => {
  const harness = sdkHarness();
  const subscription = createSubscriptionAdapter({ apiKey: 'public_live_key', sdk: harness.sdk });
  subscription.identify('anonymous-uid');
  subscription.identify('signed-in-uid');
  await flush(8);
  expect(harness.order.filter((entry) => entry.startsWith('identify:'))).toEqual([
    'identify:anonymous-uid',
    'identify:signed-in-uid',
  ]);
  subscription.dispose();
});

test('an identify the SDK refuses is reported, never thrown at the caller', async () => {
  const issues: string[] = [];
  const harness = sdkHarness();
  harness.identify.mockRejectedValue(new Error('bad key'));
  const subscription = createSubscriptionAdapter({
    apiKey: 'public_live_key',
    sdk: harness.sdk,
    onIssue: (scope) => issues.push(scope),
  });
  expect(() => subscription.identify('supabase-uid')).not.toThrow();
  await flush(8);
  expect(issues).toContain('identify');
  subscription.dispose();
});

test('reset logs the customer out and leaves no entitlement behind', async () => {
  const harness = sdkHarness({ profile: async () => premium() });
  const subscription = createSubscriptionAdapter({ apiKey: 'public_live_key', sdk: harness.sdk });
  await subscription.resolved;
  expect(entitlementStore.getState().data.entitlement.status).toBe('active');

  subscription.reset();
  await flush(8);
  expect(harness.logout).toHaveBeenCalled();
  expect(entitlementStore.getState().data.entitlement).toEqual({ status: 'none', renewsAt: null });
  subscription.dispose();
});

test('a launch that never activates still lets the app call identify', async () => {
  const harness = sdkHarness({ activate: () => never() });
  const subscription = createSubscriptionAdapter({ apiKey: 'public_live_key', sdk: harness.sdk });
  expect(() => subscription.identify('supabase-uid')).not.toThrow();
  await flush();
  expect(harness.identify).not.toHaveBeenCalled();
  subscription.dispose();
});
