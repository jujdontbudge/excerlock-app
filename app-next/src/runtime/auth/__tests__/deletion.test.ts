import { SupabaseAuthAdapter } from '../SupabaseAuthAdapter';
import { AuthError, AuthPendingDeletionError } from '../../../ports/AuthPort';
import { sessionStore } from '../../../state/sessionStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

function anonUser(id: string) {
  return { id, is_anonymous: true, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() } as never;
}
function anonSession(id: string) {
  const user = anonUser(id);
  return { access_token: `access-${id}`, refresh_token: `refresh-${id}`, user } as never;
}
function permUser(id: string) {
  return {
    id,
    is_anonymous: false,
    email: 'del@test.com',
    app_metadata: { provider: 'apple', providers: ['apple'] },
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    identities: [{ provider: 'apple', identity_id: 'i', id, user_id: id }],
  } as never;
}
function permSession(id: string) {
  const user = permUser(id);
  return { access_token: `access-${id}`, refresh_token: `refresh-${id}`, user } as never;
}

beforeEach(async () => {
  sessionStore.getState().patch({ session: { kind: 'anonymous' } });
  await AsyncStorage.clear();
});

function adapterWith(session: never, fetchImpl: typeof fetch, opts: Record<string, unknown> = {}) {
  const supabase = { auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session }, error: null }),
    signInAnonymously: jest.fn().mockImplementation(async () => {
      const fresh = anonSession('anon-fresh-after-delete');
      (supabase as unknown as { auth: { getSession: jest.Mock } }).auth.getSession.mockResolvedValue({ data: { session: fresh }, error: null });
      return { data: { user: (fresh as unknown as { user: unknown }).user, session: fresh }, error: null };
    }),
    linkIdentity: jest.fn(),
    signInWithIdToken: jest.fn(),
    updateUser: jest.fn(),
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  } } as never;
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
    fetchImpl,
    onBeforeDelete: (opts.onBeforeDelete as never) ?? (async () => undefined),
    onAccountSwitchReset: (opts.onAccountSwitchReset as never) ?? (async () => undefined),
  });
  return { adapter, supabase: supabase as unknown as { auth: Record<string, jest.Mock> } };
}

test('canonical anonymous deletion waits for 204 then boots fresh anonymous, no account_deleted event', async () => {
  const fetchImpl = jest.fn().mockResolvedValue({ status: 204 } as Response);
  let cleanup = 0;
  const { adapter, supabase } = adapterWith(anonSession('anon-del-1') as never, fetchImpl as never, {
    onBeforeDelete: async () => {
      cleanup += 1;
    },
  });
  await adapter.boot();
  expect(adapter.identity().userId).toBe('anon-del-1');
  const events: string[] = [];
  // Spy on analytics-like logs via fetch only; adapter must not track account_deleted.
  await adapter.deleteAccount();
  expect(cleanup).toBe(1);
  expect(fetchImpl).toHaveBeenCalledWith(
    'https://api.test/v1/user',
    expect.objectContaining({ method: 'DELETE', headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }) }),
  );
  // Bearer must be the canonical token, not empty.
  const authHeader = (fetchImpl.mock.calls[0][1] as { headers: Record<string, string> }).headers.Authorization;
  expect(authHeader).toMatch(/^Bearer access-anon-del-1$/);
  expect(authHeader).not.toMatch(/refresh/);
  // After 204, fresh anonymous.
  expect(adapter.identity().userId).toBe('anon-fresh-after-delete');
  expect(adapter.session()).toEqual({ kind: 'anonymous' });
  // No account_deleted emission: sessionStore and AsyncStorage contain no such event, no tokens.
  expect(JSON.stringify(sessionStore.getState().data)).not.toMatch(/account_deleted/);
  const keys = await AsyncStorage.getAllKeys();
  expect(keys.join(',')).not.toMatch(/account_deleted/);
  void events;
  void supabase;
  adapter.dispose();
});

test('502/503 is not success: visible retry with token intact', async () => {
  for (const status of [502, 503, 500]) {
    const fetchImpl = jest.fn().mockResolvedValue({ status } as Response);
    const { adapter } = adapterWith(permSession('perm-del-1') as never, fetchImpl as never);
    await adapter.boot();
    const before = adapter.identity().userId;
    await expect(adapter.deleteAccount()).rejects.toBeInstanceOf(AuthError);
    expect(adapter.identity().userId).toBe(before);
    // Token intact: getSession still returns canonical.
    expect(await adapter.getAccessToken()).toMatch(/^access-/);
    adapter.dispose();
  }
});

test('lost-response network failure reports pending, not false completion', async () => {
  const fetchImpl = jest.fn().mockRejectedValue(new TypeError('network down'));
  const { adapter } = adapterWith(permSession('perm-pending') as never, fetchImpl as never);
  await adapter.boot();
  const before = adapter.identity().userId;
  await expect(adapter.deleteAccount()).rejects.toBeInstanceOf(AuthPendingDeletionError);
  // Still deleting or canonical with same UID, never fresh anonymous success.
  expect(adapter.identity().userId).toBe(before);
  expect(adapter.session().kind).toBe('signedIn');
  adapter.dispose();
});

test('provisional-only local erase needs no server UID and makes no fetch', async () => {
  const fetchImpl = jest.fn();
  const supabase = { auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInAnonymously: jest.fn().mockImplementation(() => new Promise(() => undefined)),
    linkIdentity: jest.fn(),
    signInWithIdToken: jest.fn(),
    updateUser: jest.fn(),
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  } } as never;
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
    fetchImpl: fetchImpl as never,
    bootTimeoutMs: 20,
  });
  await adapter.boot();
  expect(adapter.identity().kind).toBe('provisional');
  await adapter.deleteAccount();
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(adapter.identity().kind).toBe('provisional');
  adapter.dispose();
});

test('stale auth callbacks after delete are ignored', async () => {
  const fetchImpl = jest.fn().mockResolvedValue({ status: 204 } as Response);
  let capturedCallback: ((event: string, session: never) => void) | null = null;
  const supabase = { auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: anonSession('anon-stale') }, error: null }),
    signInAnonymously: jest.fn().mockImplementation(async () => {
      const fresh = anonSession('anon-fresh-stale');
      return { data: { user: (fresh as unknown as { user: unknown }).user, session: fresh }, error: null };
    }),
    linkIdentity: jest.fn(),
    signInWithIdToken: jest.fn(),
    updateUser: jest.fn(),
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockImplementation((cb: (event: string, session: never) => void) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
  } } as never;
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
    fetchImpl: fetchImpl as never,
  });
  await adapter.boot();
  const genBefore = adapter.identity().generation;
  await adapter.deleteAccount();
  const genAfter = adapter.identity().generation;
  expect(genAfter).not.toBe(genBefore);
  const freshUid = adapter.identity().userId;
  // Late stale callback with old session must not restore old UID.
  const staleSession = anonSession('anon-stale') as never;
  (capturedCallback as unknown as ((event: string, session: unknown) => void) | null)?.('SIGNED_IN', staleSession);
  await new Promise((r) => setTimeout(r, 10));
  expect(adapter.identity().userId).toBe(freshUid);
  expect(adapter.identity().userId).not.toBe('anon-stale');
  adapter.dispose();
});

test('each deletion failure keeps deleting visible with token intact and cleanup ran', async () => {
  const fetchImpl = jest.fn().mockResolvedValue({ status: 500 } as Response);
  let cleanup = 0;
  const { adapter } = adapterWith(permSession('perm-cleanup') as never, fetchImpl as never, {
    onBeforeDelete: async () => {
      cleanup += 1;
    },
  });
  await adapter.boot();
  await expect(adapter.deleteAccount()).rejects.toThrow(/incomplete|try again/i);
  expect(cleanup).toBe(1);
  expect(await adapter.getAccessToken()).toBe('access-perm-cleanup');
  adapter.dispose();
});
