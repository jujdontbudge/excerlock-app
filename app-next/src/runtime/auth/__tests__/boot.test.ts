import { SupabaseAuthAdapter } from '../SupabaseAuthAdapter';
import { sessionStore } from '../../../state/sessionStore';
import type { SupabaseClient } from '@supabase/supabase-js';

function anonUser(id: string) {
  return { id, is_anonymous: true, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() } as never;
}
function anonSession(id: string) {
  const user = anonUser(id);
  return { access_token: `access-${id}`, refresh_token: `refresh-${id}`, user } as never;
}

function mockSupabase(overrides: Record<string, jest.Mock> = {}) {
  const auth = {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInAnonymously: jest.fn().mockResolvedValue({ data: { user: anonUser('anon-1'), session: anonSession('anon-1') }, error: null }),
    linkIdentity: jest.fn(),
    signInWithIdToken: jest.fn(),
    updateUser: jest.fn(),
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    ...overrides,
  };
  return { auth } as unknown as SupabaseClient;
}

function appleDeps() {
  return { signInAsync: jest.fn(), digestSHA256Hex: jest.fn().mockResolvedValue('hashed') };
}
function googleDeps() {
  return {
    clientId: 'test-ios-client.apps.googleusercontent.com',
    redirectUri: 'com.test:/oauthredirect',
    buildRequest: jest.fn(),
    exchangeCode: jest.fn(),
  };
}

beforeEach(() => {
  sessionStore.getState().patch({ session: { kind: 'anonymous' } });
  jest.useRealTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('secure hydration restores canonical identity without anonymous call', async () => {
  const supabase = mockSupabase({
    getSession: jest.fn().mockResolvedValue({ data: { session: anonSession('restored-uid') }, error: null }),
    signInAnonymously: jest.fn(),
  });
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: appleDeps() as never,
    googleDeps: googleDeps() as never,
    apiBaseUrl: 'https://api.test',
  });
  const identity = await adapter.boot();
  expect(identity.kind).toBe('canonical');
  expect(identity.userId).toBe('restored-uid');
  expect(supabase.auth.signInAnonymously).not.toHaveBeenCalled();
  // SessionStore holds non-secret Session only.
  expect(sessionStore.getState().data.session).toEqual({ kind: 'anonymous' });
  adapter.dispose();
});

test('unexpected secure hydration failure stays provisional and never creates replacement identity', async () => {
  const supabase = mockSupabase({
    getSession: jest.fn().mockRejectedValue(new Error('keychain unavailable')),
    signInAnonymously: jest.fn(),
  });
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: appleDeps() as never,
    googleDeps: googleDeps() as never,
    apiBaseUrl: 'https://api.test',
  });
  await expect(adapter.boot()).rejects.toMatchObject({ code: 'STORAGE_READ_FAILED' });
  expect(adapter.identity().kind).toBe('provisional');
  expect(supabase.auth.signInAnonymously).not.toHaveBeenCalled();
  adapter.dispose();
});

test('deferred null SIGNED_OUT callback fails closed instead of keeping ready identity', async () => {
  let callback: ((event: string, session: null) => void) | null = null;
  const supabase = mockSupabase({
    getSession: jest.fn().mockResolvedValue({ data: { session: anonSession('revoked') }, error: null }),
    onAuthStateChange: jest.fn().mockImplementation((next) => {
      callback = next;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
  });
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: appleDeps() as never,
    googleDeps: googleDeps() as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapter.boot();
  const generation = adapter.identity().generation;
  (callback as unknown as (event: string, session: null) => void)('SIGNED_OUT', null);
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(adapter.identity()).toMatchObject({ kind: 'provisional', userId: null, ready: false });
  expect(adapter.identity().generation).toBe(generation + 1);
  adapter.dispose();
});

test('boot timeout returns provisional but late success reconciles with single flight', async () => {
  jest.useFakeTimers();
  let resolveAnon!: (v: never) => void;
  const anonPromise = new Promise((resolve) => {
    resolveAnon = resolve as never;
  });
  const supabase = mockSupabase({
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInAnonymously: jest.fn().mockReturnValue(anonPromise),
  });
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: appleDeps() as never,
    googleDeps: googleDeps() as never,
    apiBaseUrl: 'https://api.test',
    bootTimeoutMs: 5000,
  });
  const bootPromise = adapter.boot();
  // Advance past 5s UI fallback.
  await jest.advanceTimersByTimeAsync(5100);
  await Promise.race([bootPromise, Promise.resolve(null)]);
  // Boot resolved provisional (or is still pending but identity is provisional).
  const current = adapter.identity();
  expect(current.kind).toBe('provisional');
  expect(current.userId).toBeNull();
  expect(supabase.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  // Late success reconciles without a second request.
  resolveAnon({ data: { user: anonUser('late-uid'), session: anonSession('late-uid') }, error: null } as never);
  await jest.advanceTimersByTimeAsync(0);
  // Allow microtasks + setTimeout(0) auth propagation.
  await Promise.resolve();
  await jest.advanceTimersByTimeAsync(10);
  const after = adapter.identity();
  expect(after.kind).toBe('canonical');
  expect(after.userId).toBe('late-uid');
  expect(supabase.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  adapter.dispose();
  jest.useRealTimers();
});

test('concurrent boot calls share single anonymous request', async () => {
  const supabase = mockSupabase();
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: appleDeps() as never,
    googleDeps: googleDeps() as never,
    apiBaseUrl: 'https://api.test',
  });
  const [a, b, c] = await Promise.all([adapter.boot(), adapter.boot(), adapter.boot()]);
  expect(supabase.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  expect(a.userId).toBe(b.userId);
  expect(b.userId).toBe(c.userId);
  adapter.dispose();
});

test('stale anonymous result after sign-out cannot restore old identity', async () => {
  jest.useFakeTimers();
  let resolveAnon!: (v: never) => void;
  const anonPromise = new Promise((resolve) => {
    resolveAnon = resolve as never;
  });
  const supabase = mockSupabase({
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInAnonymously: jest.fn().mockReturnValueOnce(anonPromise).mockResolvedValueOnce({
      data: { user: anonUser('fresh-after-signout'), session: anonSession('fresh-after-signout') },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  });
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: appleDeps() as never,
    googleDeps: googleDeps() as never,
    apiBaseUrl: 'https://api.test',
    bootTimeoutMs: 5000,
  });
  const bootPromise = adapter.boot();
  // Let getSession resolve so the first (pending) anonymous request is
  // definitely owned by boot before handleTombstone starts its fresh request.
  await jest.advanceTimersByTimeAsync(0);
  expect(supabase.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(100);
  // Provisional local deletion changes generation while the original request
  // remains in flight; its late result must be discarded.
  await adapter.deleteAccount();
  const genAfter = adapter.identity().generation;
  resolveAnon({ data: { user: anonUser('stale-uid'), session: anonSession('stale-uid') }, error: null } as never);
  await jest.advanceTimersByTimeAsync(20);
  expect(adapter.identity().generation).toBe(genAfter);
  expect(adapter.identity().userId).not.toBe('stale-uid');
  adapter.dispose();
  jest.useRealTimers();
  void bootPromise;
});

test('no tokens in sessionStore after boot', async () => {
  const supabase = mockSupabase();
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: appleDeps() as never,
    googleDeps: googleDeps() as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapter.boot();
  const raw = JSON.stringify(sessionStore.getState().data);
  expect(raw).not.toMatch(/access-|refresh-|Bearer|eyJ/);
  expect(raw).not.toMatch(/access_token|refresh_token/);
  adapter.dispose();
});

test('waitForCanonicalIdentity rejects with visible retry on timeout and generation change', async () => {
  const supabase = mockSupabase({
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInAnonymously: jest.fn().mockImplementation(() => new Promise(() => undefined)),
  });
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: appleDeps() as never,
    googleDeps: googleDeps() as never,
    apiBaseUrl: 'https://api.test',
    bootTimeoutMs: 50,
  });
  void adapter.boot().catch(() => undefined);
  await expect(adapter.waitForCanonicalIdentity({ timeoutMs: 100 })).rejects.toThrow(/longer than expected|retry/i);
  adapter.dispose();
});
