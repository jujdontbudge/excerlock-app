import type { AdaptyPurchaseResult } from 'react-native-adapty';
import { Entitlement } from '../../../domain/types';
import { entitlementStore } from '../../../state/entitlementStore';
import { createSubscriptionAdapter } from '..';
import { annualProduct, premium, profile } from './profiles';
import { compliantFlow, flush, sdkHarness, SdkHarnessOptions } from './sdkHarness';

const trial = () =>
  premium({ activeIntroductoryOfferType: 'free_trial', expiresAt: new Date('2026-09-14T15:00:00.000Z') });
const purchased = (): AdaptyPurchaseResult => ({ type: 'success', profile: trial() });
const status = () => entitlementStore.getState().data.entitlement.status;
const seed = (entitlement: Entitlement) => entitlementStore.getState().patch({ entitlement });

const started = async (options: SdkHarnessOptions = {}) => {
  const harness = sdkHarness(options);
  const subscription = createSubscriptionAdapter({ apiKey: 'public_live_key', sdk: harness.sdk });
  await subscription.resolved;
  await flush();
  return { harness, subscription };
};

beforeEach(() => entitlementStore.getState().reset());

test('the paywall is the Builder view for the placement, carrying the plan the user picked', async () => {
  const { harness, subscription } = await started();
  const presented = subscription.presentPaywall('onboarding', 'monthly');
  await flush();

  expect(harness.getFlow).toHaveBeenLastCalledWith('onboarding', expect.any(Number));
  expect(harness.createFlowView).toHaveBeenCalledWith(expect.anything(), { SELECTED_PLAN: 'monthly' });
  expect(harness.view().presents).toBe(1);
  expect(harness.logShow).toHaveBeenCalled();

  harness.view().fire('onPurchaseCompleted', purchased(), annualProduct());
  await expect(presented).resolves.toMatchObject({ status: 'trial' });
  subscription.dispose();
});

test('a completed purchase publishes the entitlement and closes the Builder', async () => {
  const { harness, subscription } = await started();
  const presented = subscription.presentPaywall('onboarding', 'annual');
  await flush();
  expect(harness.view().fire('onPurchaseCompleted', purchased(), annualProduct())).toBe(true);

  await expect(presented).resolves.toEqual({ status: 'trial', renewsAt: '2026-09-14T15:00:00.000Z' });
  expect(status()).toBe('trial');
  subscription.dispose();
});

test('a cancelled purchase keeps the paywall open and settles only when it goes away', async () => {
  const { harness, subscription } = await started();
  const presented = subscription.presentPaywall('onboarding', 'annual');
  await flush();
  const settled = jest.fn();
  void presented.then(settled);

  expect(harness.view().fire('onPurchaseCompleted', { type: 'user_cancelled' }, annualProduct())).toBe(false);
  await flush();
  expect(settled).not.toHaveBeenCalled();

  harness.view().fire('onDisappeared');
  await expect(presented).resolves.toEqual({ status: 'none', renewsAt: null });
  expect(status()).toBe('none');
  subscription.dispose();
});

test('a purchase awaiting approval leaves the user unentitled and closes the Builder', async () => {
  const { harness, subscription } = await started();
  const presented = subscription.presentPaywall('onboarding', 'annual');
  await flush();
  expect(harness.view().fire('onPurchaseCompleted', { type: 'pending' }, annualProduct())).toBe(true);
  await expect(presented).resolves.toMatchObject({ status: 'none' });
  subscription.dispose();
});

test('closing the in-app paywall returns the entitlement untouched', async () => {
  seed({ status: 'expired', renewsAt: '2026-09-06T00:00:00.000Z' });
  const { harness, subscription } = await started({
    profile: async () =>
      premium({ isActive: false, willRenew: false, expiresAt: new Date('2026-09-06T00:00:00.000Z') }),
  });
  const presented = subscription.presentPaywall('in_app', 'annual');
  await flush();
  expect(harness.getFlow).toHaveBeenLastCalledWith('in_app', expect.any(Number));
  expect(harness.view().fire('onCloseButtonPress')).toBe(true);
  await expect(presented).resolves.toMatchObject({ status: 'expired' });
  subscription.dispose();
});

test('restoring inside the Builder never downgrades a live entitlement', async () => {
  const { harness, subscription } = await started({ profile: async () => trial() });
  const presented = subscription.presentPaywall('in_app', 'annual');
  await flush();

  expect(harness.view().fire('onRestoreCompleted', profile())).toBe(false);
  await flush();
  expect(status()).toBe('trial');

  harness.view().fire('onDisappeared');
  await expect(presented).resolves.toMatchObject({ status: 'trial' });
  subscription.dispose();
});

test('restoring inside the Builder that finds a purchase publishes it and closes', async () => {
  const { harness, subscription } = await started();
  const presented = subscription.presentPaywall('in_app', 'annual');
  await flush();
  expect(harness.view().fire('onRestoreCompleted', premium({ expiresAt: new Date('2027-01-01T00:00:00.000Z') }))).toBe(
    true,
  );
  await expect(presented).resolves.toMatchObject({ status: 'active' });
  expect(status()).toBe('active');
  subscription.dispose();
});

test('a paywall that cannot load rejects, so the slot can say what went wrong', async () => {
  const { subscription } = await started({ flow: async () => Promise.reject(new Error('no network')) });
  await expect(subscription.presentPaywall('onboarding', 'annual')).rejects.toThrow('no network');
  expect(status()).toBe('none');
  subscription.dispose();
});

test('an error raised by the Builder rejects rather than pretending the user cancelled', async () => {
  const { harness, subscription } = await started();
  const presented = subscription.presentPaywall('onboarding', 'annual');
  await flush();
  const failure = new Error('view failed');
  expect(harness.view().fire('onError', failure as never)).toBe(true);
  await expect(presented).rejects.toBe(failure);
  subscription.dispose();
});

test('a paywall missing its legal block is reported but still shown', async () => {
  const issues: { scope: string; detail: unknown }[] = [];
  const harness = sdkHarness({ flow: async () => ({ ...compliantFlow(), payloadData: '{"blocks":[]}' }) as never });
  const subscription = createSubscriptionAdapter({
    apiKey: 'public_live_key',
    sdk: harness.sdk,
    onIssue: (scope, detail) => issues.push({ scope, detail }),
  });
  await subscription.resolved;
  const presented = subscription.presentPaywall('onboarding', 'annual');
  await flush();

  expect(harness.view().presents).toBe(1);
  expect(issues).toContainEqual({
    scope: 'paywallCompliance',
    detail: { placement: 'onboarding', missing: ['terms', 'privacy', 'price', 'renewal'] },
  });
  harness.view().fire('onPurchaseCompleted', purchased(), annualProduct());
  await expect(presented).resolves.toMatchObject({ status: 'trial' });
  subscription.dispose();
});
