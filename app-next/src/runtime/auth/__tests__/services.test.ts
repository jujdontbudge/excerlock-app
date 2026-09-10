import { createAuthServices } from '../createAuthServices';
import { IdentityCoordinator } from '../identityCoordinator';

function anonymousSession() {
  const user = {
    id: 'canonical-user',
    is_anonymous: true,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };
  return { access_token: 'test-access', refresh_token: 'test-refresh', user };
}

test('factory awaits exact Adapty PostHog integration key before readiness', async () => {
  const session = anonymousSession();
  const integration = jest.fn(async () => {});
  const services = await createAuthServices({
    supabaseUrl: 'https://supabase.test',
    supabaseAnonKey: 'public-anon-key',
    apiBaseUrl: 'https://api.test',
    googleIosClientId: 'google-client',
    googleRedirectUri: 'excerlock://auth',
    supabase: {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session }, error: null }),
        signInAnonymously: jest.fn(),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: { subscription: { unsubscribe: jest.fn() } },
        }),
      },
    } as never,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: {
      clientId: 'google-client',
      redirectUri: 'excerlock://auth',
      buildRequest: jest.fn(),
      exchangeCode: jest.fn(),
    } as never,
    fetchImpl: jest.fn().mockResolvedValue({ status: 200 }) as never,
    analyticsIdentify: jest.fn(async () => {}),
    analyticsReset: jest.fn(async () => {}),
    subscriptionIdentify: jest.fn(async () => {}),
    subscriptionReset: jest.fn(async () => {}),
    getPosthogDistinctId: () => 'posthog-person',
    setIntegrationIdentifier: integration,
    onBeforeDelete: jest.fn(async () => {}),
    onAfterDelete: jest.fn(async () => {}),
  });

  try {
    await services.auth.boot();
    const ready = await services.waitForIdentityReady({ timeoutMs: 1000 });
    expect(integration).toHaveBeenCalledTimes(1);
    expect(integration).toHaveBeenCalledWith('posthog_distinct_user_id', 'posthog-person');
    expect(ready.ready).toBe(true);
  } finally {
    await services.dispose();
  }
});

test('factory rolls back auth callback ownership when coordinator startup throws', async () => {
  const unsubscribe = jest.fn();
  const start = jest.spyOn(IdentityCoordinator.prototype, 'start').mockImplementationOnce(() => { throw new Error('coordinator startup'); });
  const supabase = { auth: {
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe } } })),
  } } as never;
  await expect(createAuthServices({
    supabaseUrl: 'https://supabase.test', supabaseAnonKey: 'public', apiBaseUrl: 'https://api.test',
    googleIosClientId: 'google', googleRedirectUri: 'excerlock://auth', supabase,
    appleDeps: {} as never, googleDeps: {} as never,
    analyticsIdentify: async () => {}, analyticsReset: async () => {}, subscriptionIdentify: async () => {}, subscriptionReset: async () => {},
    getPosthogDistinctId: () => null, setIntegrationIdentifier: async () => {}, onBeforeDelete: async () => {}, onAfterDelete: async () => {},
  })).rejects.toThrow('coordinator startup');
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  start.mockRestore();
});

test('disposing services does not tear down a caller-owned injected client', async () => {
  const unsubscribe = jest.fn();
  const initialize = jest.fn(async () => undefined);
  const stopAutoRefresh = jest.fn(async () => undefined);
  const disposeClient = jest.fn(async () => undefined);
  const services = await createAuthServices({
    supabaseUrl: 'https://supabase.test', supabaseAnonKey: 'public', apiBaseUrl: 'https://api.test',
    googleIosClientId: 'google', googleRedirectUri: 'excerlock://auth',
    supabase: { auth: { initialize, stopAutoRefresh, dispose: disposeClient, onAuthStateChange: () => ({ data: { subscription: { unsubscribe } } }) } } as never,
    appleDeps: {} as never, googleDeps: {} as never, analyticsIdentify: async () => {}, analyticsReset: async () => {},
    subscriptionIdentify: async () => {}, subscriptionReset: async () => {}, getPosthogDistinctId: () => null,
    setIntegrationIdentifier: async () => {}, onBeforeDelete: async () => {}, onAfterDelete: async () => {},
  });
  await services.dispose();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(initialize).not.toHaveBeenCalled();
  expect(stopAutoRefresh).not.toHaveBeenCalled();
  expect(disposeClient).not.toHaveBeenCalled();
});
