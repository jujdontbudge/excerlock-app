import { createIdentityServices } from '../createIdentityServices';
import { createAuthServices } from '../auth/createAuthServices';
jest.mock('../subscription/nativeAdaptySdk', () => ({ nativeAdaptySdk: {} }));
jest.mock('../auth/createAuthServices', () => ({ createAuthServices: jest.fn() }));
test('one auth barrier/readiness gate owns subscription calls; disposal is idempotent', async () => {
  const identity = { kind: 'canonical' as const, userId: 'uid', generation: 1, ready: true, isAnonymous: true };
  const dispose = jest.fn();
  const barrier = jest.fn(async (operation) => operation());
  const ready = jest.fn(async () => identity);
  jest.mocked(createAuthServices).mockReturnValue({ auth: { identity: () => identity, boot: ready }, dispose, runIdentityOperation: barrier, waitForIdentityReady: ready } as never);
  const analytics = { identify: jest.fn(async () => {}), reset: jest.fn(async () => {}), getDistinctId: () => 'uid', dispose: jest.fn() };
  const sdk = { activate: jest.fn(async () => {}), addEventListener: () => ({ remove: jest.fn() }), identify: jest.fn(async () => {}), setIntegrationIdentifier: jest.fn(async () => {}), restorePurchases: jest.fn(async () => ({ customerUserId: 'uid', accessLevels: {} })) };
  const services = await createIdentityServices({
    config: { supabaseUrl: 'https://example.invalid', supabaseAnonKey: 'public', apiBaseUrl: 'https://api.example.invalid', googleIosClientId: 'client', googleRedirectUri: 'excerlock://auth' },
    adaptyPublicKey: 'public', reportError: jest.fn(), analyticsFactory: () => analytics, beforeDelete: async () => {}, afterDelete: async () => {}, sdk: sdk as never,
  });
  const config = jest.mocked(createAuthServices).mock.calls[0]![0];
  await config.subscriptionIdentify('uid');
  await services.subscription.restore();
  expect(ready).toHaveBeenCalledTimes(1);
  expect(barrier).toHaveBeenCalledTimes(1);
  expect(sdk.setIntegrationIdentifier).toHaveBeenCalledWith('posthog_distinct_user_id', 'uid');
  await Promise.all([services.dispose(), services.dispose()]);
  expect(dispose).toHaveBeenCalledTimes(1); expect(analytics.dispose).toHaveBeenCalledTimes(1);
});

test('identity disposal settles every independent resource before rejecting', async () => {
  const identity = { kind: 'canonical' as const, userId: 'uid', generation: 1, ready: true, isAnonymous: true };
  const authFailure = new Error('auth cleanup');
  const authDispose = jest.fn(async () => { throw authFailure; });
  jest.mocked(createAuthServices).mockReturnValue({
    auth: { identity: () => identity, boot: async () => identity }, dispose: authDispose,
    runIdentityOperation: async (operation: () => Promise<unknown>) => operation(), waitForIdentityReady: async () => identity,
  } as never);
  const analyticsDispose = jest.fn(async () => undefined);
  const remove = jest.fn();
  const services = await createIdentityServices({
    config: { supabaseUrl: 'https://example.invalid', supabaseAnonKey: 'public', apiBaseUrl: 'https://api.example.invalid', googleIosClientId: 'client', googleRedirectUri: 'excerlock://auth' },
    adaptyPublicKey: 'public', reportError: jest.fn(), beforeDelete: async () => {}, afterDelete: async () => {},
    analyticsFactory: () => ({ identify: async () => {}, reset: async () => {}, getDistinctId: () => 'uid', dispose: analyticsDispose }),
    sdk: { activate: async () => {}, addEventListener: () => ({ remove }), setIntegrationIdentifier: async () => {} } as never,
  });
  const subscriptionDispose = jest.spyOn(services.subscription, 'dispose');
  await expect(services.dispose()).rejects.toThrow('Identity cleanup failed');
  expect(authDispose).toHaveBeenCalledTimes(1);
  expect(subscriptionDispose).toHaveBeenCalledTimes(1);
  expect(analyticsDispose).toHaveBeenCalledTimes(1);
});
