import { createSubscriptionAdapter } from '..';
import { entitlementStore } from '../../../state/entitlementStore';
import { flush, sdkHarness } from './sdkHarness';

const location = { ios: { fileName: 'adapty-fallback.json' }, android: { rawResName: 'adapty_fallback' } };
const compliant = {
  paywall: 'ExcerLock Premium',
  price: '$59.99 / year',
  renewal: 'Renews automatically unless canceled.',
  links: [
    { label: 'Terms of Use', url: 'https://excerlock.com/terms' },
    { label: 'Privacy Policy', url: 'https://excerlock.com/privacy' },
  ],
};

beforeEach(() => entitlementStore.getState().reset());

test('the bundled fallback is registered once Adapty is activated', async () => {
  const harness = sdkHarness();
  const subscription = createSubscriptionAdapter({
    apiKey: 'public_live_key',
    sdk: harness.sdk,
    fallback: { location, payload: compliant },
  });
  await subscription.resolved;
  await flush();
  expect(harness.setFallback).toHaveBeenCalledWith(location);
  subscription.dispose();
});

test('a fallback that would fail App Review is refused before the app can ship it', () => {
  const harness = sdkHarness();
  expect(() =>
    createSubscriptionAdapter({
      apiKey: 'public_live_key',
      sdk: harness.sdk,
      fallback: { location, payload: { paywall: 'ExcerLock Premium', price: '$59.99 / year' } },
    }),
  ).toThrow(/renewal/);
  expect(harness.activate).not.toHaveBeenCalled();
});
