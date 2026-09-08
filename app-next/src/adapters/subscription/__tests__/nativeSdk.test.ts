import { adapty, createFlowView } from 'react-native-adapty';
import { adaptyKey } from '../adaptyKey';
import { nativeAdaptySdk } from '../nativeAdaptySdk';
import { compliantFlow } from './sdkHarness';
import { profile } from './profiles';

jest.mock('react-native-adapty', () => ({
  adapty: {
    activate: jest.fn(async () => undefined),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    getProfile: jest.fn(async () => ({ profileId: 'p' })),
    identify: jest.fn(async () => undefined),
    logout: jest.fn(async () => undefined),
    getFlow: jest.fn(async () => ({ id: 'flow' })),
    getPaywallProducts: jest.fn(async () => []),
    logShowFlow: jest.fn(async () => undefined),
    restorePurchases: jest.fn(async () => ({ profileId: 'p' })),
    setFallback: jest.fn(async () => undefined),
  },
  createFlowView: jest.fn(async () => ({ present: jest.fn(), dismiss: jest.fn(), setEventHandlers: jest.fn() })),
}));

const mocked = adapty as unknown as Record<string, jest.Mock>;

test('activation ignores the second activate that Fast Refresh would cause', async () => {
  await nativeAdaptySdk().activate('public_live_key');
  expect(mocked.activate).toHaveBeenCalledWith('public_live_key', { __ignoreActivationOnFastRefresh: true });
});

test('the profile listener is the latest-profile event, which is how webhooks reach the app', () => {
  const callback = jest.fn();
  nativeAdaptySdk().onProfileLoad(callback);
  expect(mocked.addEventListener).toHaveBeenCalledWith('onLatestProfileLoad', callback);
});

test('a placement is fetched with a load timeout so a slow network cannot hang the paywall', async () => {
  await nativeAdaptySdk().getFlow('onboarding', 5000);
  expect(mocked.getFlow).toHaveBeenCalledWith('onboarding', { loadTimeoutMs: 5000 });
});

test('the Builder view is created with the custom tags and its products prefetched', async () => {
  const flow = compliantFlow();
  await nativeAdaptySdk().createFlowView(flow, { SELECTED_PLAN: 'annual' });
  expect(createFlowView).toHaveBeenCalledWith(flow, {
    customTags: { SELECTED_PLAN: 'annual' },
    prefetchProducts: true,
  });
});

test('identity, restore and fallback go straight through', async () => {
  const sdk = nativeAdaptySdk();
  await sdk.identify('supabase-uid');
  await sdk.logout();
  await sdk.restorePurchases();
  await sdk.getProfile();
  await sdk.logShow(compliantFlow());
  await sdk.setFallback({ ios: { fileName: 'adapty-fallback.json' }, android: { rawResName: 'unused' } });
  expect(mocked.identify).toHaveBeenCalledWith('supabase-uid');
  expect(mocked.logout).toHaveBeenCalled();
  expect(mocked.restorePurchases).toHaveBeenCalled();
  expect(mocked.getProfile).toHaveBeenCalled();
  expect(mocked.logShowFlow).toHaveBeenCalled();
  expect(mocked.setFallback).toHaveBeenCalledWith({
    ios: { fileName: 'adapty-fallback.json' },
    android: { rawResName: 'unused' },
  });
  expect(profile()).toMatchObject({ profileId: 'adapty-profile' });
});

describe('the SDK key', () => {
  const original = process.env.EXPO_PUBLIC_ADAPTY_KEY;
  afterEach(() => {
    process.env.EXPO_PUBLIC_ADAPTY_KEY = original;
  });

  test('comes from the environment Expo inlines at build time', () => {
    process.env.EXPO_PUBLIC_ADAPTY_KEY = ' public_live_key ';
    expect(adaptyKey()).toBe('public_live_key');
  });

  test('is null when the build has none, so the app never half-activates', () => {
    delete process.env.EXPO_PUBLIC_ADAPTY_KEY;
    expect(adaptyKey()).toBeNull();
  });
});
