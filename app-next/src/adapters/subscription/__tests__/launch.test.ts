import { Entitlement } from '../../../domain/types';
import { entitlementStore } from '../../../state/entitlementStore';
import { createSubscriptionAdapter } from '..';
import { premium, profile } from './profiles';
import { flush, never, sdkHarness } from './sdkHarness';

const status = () => entitlementStore.getState().data.entitlement.status;
const seed = (entitlement: Entitlement) => entitlementStore.getState().patch({ entitlement });
const adapter = (sdk: Parameters<typeof createSubscriptionAdapter>[0]['sdk']) =>
  createSubscriptionAdapter({ apiKey: 'public_live_key', sdk });

beforeEach(() => {
  jest.useFakeTimers();
  entitlementStore.getState().reset();
});
afterEach(() => jest.useRealTimers());

test('launch publishes the status Adapty reports', async () => {
  const harness = sdkHarness({ profile: async () => premium({ expiresAt: new Date('2027-01-01T00:00:00.000Z') }) });
  const subscription = adapter(harness.sdk);
  await expect(subscription.resolved).resolves.toEqual({ status: 'active', renewsAt: '2027-01-01T00:00:00.000Z' });
  expect(status()).toBe('active');
  expect(harness.activate).toHaveBeenCalledWith('public_live_key');
  subscription.dispose();
});

test('a launch that never answers settles on the persisted status inside three seconds', async () => {
  seed({ status: 'trial', renewsAt: '2026-09-14T15:00:00.000Z' });
  const written = jest.fn();
  const stop = entitlementStore.subscribe(written);
  const subscription = adapter(sdkHarness({ profile: () => never() }).sdk);
  const settled = jest.fn();
  void subscription.resolved.then(settled);

  jest.advanceTimersByTime(2999);
  await flush();
  expect(settled).not.toHaveBeenCalled();

  jest.advanceTimersByTime(1);
  await expect(subscription.resolved).resolves.toMatchObject({ status: 'trial' });
  expect(status()).toBe('trial');
  expect(written).not.toHaveBeenCalled();
  stop();
  subscription.dispose();
});

test('an unknown status is never left in place: launch reaches the paywall on the budget', async () => {
  seed({ status: 'unknown', renewsAt: null });
  const subscription = adapter(sdkHarness({ activate: () => never() }).sdk);
  jest.advanceTimersByTime(3000);
  await expect(subscription.resolved).resolves.toEqual({ status: 'none', renewsAt: null });
  expect(status()).toBe('none');
  subscription.dispose();
});

test('a failed activation never clears a live entitlement', async () => {
  seed({ status: 'active', renewsAt: '2027-01-01T00:00:00.000Z' });
  const written = jest.fn();
  const stop = entitlementStore.subscribe(written);
  const subscription = adapter(sdkHarness({ activate: async () => Promise.reject(new Error('offline')) }).sdk);
  await expect(subscription.resolved).resolves.toMatchObject({ status: 'active' });
  expect(written).not.toHaveBeenCalled();
  stop();
  subscription.dispose();
});

test('a profile that arrives after the budget still wins', async () => {
  seed({ status: 'trial', renewsAt: '2026-09-14T15:00:00.000Z' });
  let answer = (value: ReturnType<typeof profile>) => {
    void value;
  };
  const late = new Promise<ReturnType<typeof profile>>((resolve) => {
    answer = resolve;
  });
  const subscription = adapter(sdkHarness({ profile: () => late }).sdk);
  jest.advanceTimersByTime(3000);
  await expect(subscription.resolved).resolves.toMatchObject({ status: 'trial' });

  answer(premium({ isActive: false, willRenew: false, expiresAt: new Date('2026-09-14T15:00:00.000Z') }));
  await flush();
  expect(status()).toBe('expired');
  subscription.dispose();
});

test('a profile refresh mirrors a change made outside the app, with no purchase in sight', async () => {
  const harness = sdkHarness({ profile: async () => premium({ expiresAt: new Date('2027-01-01T00:00:00.000Z') }) });
  const subscription = adapter(harness.sdk);
  await subscription.resolved;
  const seen: Entitlement[] = [];
  const stop = subscription.subscribe((entitlement) => seen.push(entitlement));

  harness.emitProfile(premium({ isActive: false, billingIssueDetectedAt: new Date('2026-09-06T00:00:00.000Z') }));
  expect(status()).toBe('billingIssue');
  expect(seen).toEqual([{ status: 'billingIssue', renewsAt: null }]);
  stop();
  subscription.dispose();
});

test('the offer comes from the live catalog while the user has nothing, and is not fetched once entitled', async () => {
  const unentitled = sdkHarness();
  const first = adapter(unentitled.sdk);
  await first.resolved;
  await flush();
  expect(unentitled.getFlow).toHaveBeenCalledWith('onboarding', expect.any(Number));
  expect(first.entitlement().offer).toEqual({ trialDays: 7, reminderDaysBefore: 2, label: '7-day free trial' });
  first.dispose();

  const entitled = sdkHarness({ profile: async () => premium() });
  const second = adapter(entitled.sdk);
  await second.resolved;
  await flush();
  expect(entitled.getFlow).not.toHaveBeenCalled();
  second.dispose();
});

test('disposing stops listening for profile refreshes', async () => {
  const harness = sdkHarness();
  const subscription = adapter(harness.sdk);
  await subscription.resolved;
  expect(harness.listeners).toBe(1);
  subscription.dispose();
  expect(harness.listeners).toBe(0);
});
