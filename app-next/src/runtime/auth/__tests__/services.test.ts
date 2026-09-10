import { createAuthServices } from '../createAuthServices';

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
  const services = createAuthServices({
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
    services.dispose();
  }
});
