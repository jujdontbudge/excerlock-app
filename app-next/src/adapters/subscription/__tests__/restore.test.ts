import { Entitlement } from '../../../domain/types';
import { entitlementStore } from '../../../state/entitlementStore';
import { createSubscriptionAdapter } from '..';
import { premium, profile } from './profiles';
import { flush, sdkHarness, SdkHarnessOptions } from './sdkHarness';

const seed = (entitlement: Entitlement) => entitlementStore.getState().patch({ entitlement });
const started = async (options: SdkHarnessOptions = {}) => {
  const harness = sdkHarness(options);
  const subscription = createSubscriptionAdapter({ apiKey: 'public_live_key', sdk: harness.sdk });
  await subscription.resolved;
  await flush();
  return { harness, subscription };
};

beforeEach(() => entitlementStore.getState().reset());

test('a restore that finds a purchase publishes it', async () => {
  const { subscription } = await started({
    restore: async () => premium({ expiresAt: new Date('2027-01-01T00:00:00.000Z') }),
  });
  await expect(subscription.restore()).resolves.toEqual({ status: 'active', renewsAt: '2027-01-01T00:00:00.000Z' });
  expect(entitlementStore.getState().data.entitlement.status).toBe('active');
  subscription.dispose();
});

test('a restore that finds nothing keeps the live entitlement and writes nothing', async () => {
  const { subscription } = await started({
    profile: async () =>
      premium({ activeIntroductoryOfferType: 'free_trial', expiresAt: new Date('2026-09-14T15:00:00.000Z') }),
    restore: async () => profile(),
  });
  const written = jest.fn();
  const stop = entitlementStore.subscribe(written);

  await expect(subscription.restore()).resolves.toMatchObject({ status: 'trial' });
  expect(written).not.toHaveBeenCalled();
  stop();
  subscription.dispose();
});

test('a restore never trades an active subscription for a trial', async () => {
  const { subscription } = await started({
    profile: async () => premium({ expiresAt: new Date('2027-01-01T00:00:00.000Z') }),
    restore: async () =>
      premium({ activeIntroductoryOfferType: 'free_trial', expiresAt: new Date('2026-09-14T15:00:00.000Z') }),
  });
  await expect(subscription.restore()).resolves.toMatchObject({ status: 'active' });
  subscription.dispose();
});

test('a restore that fails rejects so the screen can explain itself', async () => {
  const { subscription } = await started({ restore: async () => Promise.reject(new Error('offline')) });
  seed({ status: 'expired', renewsAt: null });
  await expect(subscription.restore()).rejects.toThrow('offline');
  expect(entitlementStore.getState().data.entitlement.status).toBe('expired');
  subscription.dispose();
});
