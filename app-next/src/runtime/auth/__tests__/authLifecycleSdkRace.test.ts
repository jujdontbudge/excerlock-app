import { createAuthServices } from '../createAuthServices';
import { SUPABASE_STORAGE_KEY, type SecureStoreBackend } from '../secureStorage';
import { RuntimeSingleton } from '../../RuntimeSingleton';

const waitUntil = async (condition: () => boolean) => {
  for (let i = 0; i < 100 && !condition(); i++) await new Promise((resolve) => setTimeout(resolve, 0));
  expect(condition()).toBe(true);
};

test('real auth SDK mutation and secure write finish before disposal resolves', async () => {
  const values = new Map<string, string>();
  const writes: string[] = [];
  const backend: SecureStoreBackend = {
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => { writes.push(key); values.set(key, value); },
    deleteItemAsync: async (key) => { values.delete(key); },
  };
  let releaseResponse!: () => void;
  const heldResponse = new Promise<void>((resolve) => { releaseResponse = resolve; });
  let signupStarted = false;
  const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
    if (!String(input).includes('/auth/v1/signup')) throw new Error(`Unexpected request: ${String(input)}`);
    signupStarted = true;
    await heldResponse;
    const now = Math.floor(Date.now() / 1000);
    return new Response(JSON.stringify({
      access_token: 'access', refresh_token: 'refresh', expires_in: 3600, expires_at: now + 3600,
      token_type: 'bearer', user: {
        id: 'anonymous-user', aud: 'authenticated', role: 'authenticated', is_anonymous: true,
        app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString(),
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  const services = await createAuthServices({
    supabaseUrl: 'https://project.supabase.co', supabaseAnonKey: 'public', apiBaseUrl: 'https://api.invalid',
    googleIosClientId: 'google', googleRedirectUri: 'excerlock://auth', secureBackend: backend, fetchImpl,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: { clientId: 'google', redirectUri: 'excerlock://auth', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    analyticsIdentify: async () => undefined, analyticsReset: async () => undefined,
    subscriptionIdentify: async () => undefined, subscriptionReset: async () => undefined,
    getPosthogDistinctId: () => 'person', setIntegrationIdentifier: async () => undefined,
    onBeforeDelete: async () => undefined, onAfterDelete: async () => undefined,
  });
  const boot = services.auth.boot();
  await waitUntil(() => signupStarted);
  const disposal = services.dispose();
  let disposed = false;
  void disposal.then(() => { disposed = true; });
  await Promise.resolve();
  expect(disposed).toBe(false);
  await expect(services.auth.getAccessToken()).resolves.toBeNull();
  releaseResponse();
  await boot;
  await disposal;
  expect(writes).toContain(SUPABASE_STORAGE_KEY);
  const writesAtDisposal = writes.length;
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(writes).toHaveLength(writesAtDisposal);
});

test('replacement waits for real SDK initialization refresh and its secure write', async () => {
  const now = Math.floor(Date.now() / 1000);
  const session = JSON.stringify({
    access_token: 'expired-access', refresh_token: 'old-refresh', expires_in: 3600, expires_at: now - 1,
    token_type: 'bearer', user: { id: 'user', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() },
  });
  const values = new Map([[SUPABASE_STORAGE_KEY, session]]);
  let refreshStarted = false;
  let releaseRefresh!: () => void;
  const refreshGate = new Promise<void>((resolve) => { releaseRefresh = resolve; });
  let writeStarted = false;
  let releaseWrite!: () => void;
  const writeGate = new Promise<void>((resolve) => { releaseWrite = resolve; });
  const backend: SecureStoreBackend = {
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => {
      if (key === SUPABASE_STORAGE_KEY) { writeStarted = true; await writeGate; }
      values.set(key, value);
    },
    deleteItemAsync: async (key) => { values.delete(key); },
  };
  const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
    expect(String(input)).toContain('/auth/v1/token?grant_type=refresh_token');
    refreshStarted = true;
    await refreshGate;
    return new Response(JSON.stringify({
      access_token: 'fresh-access', refresh_token: 'fresh-refresh', expires_in: 3600, expires_at: now + 3600,
      token_type: 'bearer', user: { id: 'user', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  let creates = 0;
  const owner = new RuntimeSingleton(async () => {
    creates += 1;
    if (creates > 1) return { disposeAsync: async () => undefined };
    const services = await createAuthServices({
      supabaseUrl: 'https://project.supabase.co', supabaseAnonKey: 'public', apiBaseUrl: 'https://api.invalid',
      googleIosClientId: 'google', googleRedirectUri: 'excerlock://auth', secureBackend: backend, fetchImpl,
      appleDeps: {} as never, googleDeps: {} as never, analyticsIdentify: async () => {}, analyticsReset: async () => {},
      subscriptionIdentify: async () => {}, subscriptionReset: async () => {}, getPosthogDistinctId: () => 'person',
      setIntegrationIdentifier: async () => {}, onBeforeDelete: async () => {}, onAfterDelete: async () => {},
    });
    return { disposeAsync: services.dispose };
  });
  await owner.get();
  await waitUntil(() => refreshStarted);
  const shutdown = owner.dispose();
  const replacement = owner.get();
  expect(creates).toBe(1);
  releaseRefresh();
  await waitUntil(() => writeStarted);
  expect(creates).toBe(1);
  releaseWrite();
  await shutdown;
  await replacement;
  expect(creates).toBe(2);
  const writesAtReplacement = values.get(SUPABASE_STORAGE_KEY);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(values.get(SUPABASE_STORAGE_KEY)).toBe(writesAtReplacement);
});
