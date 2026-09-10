import { SupabaseAuthAdapter } from '../SupabaseAuthAdapter';
import { sessionStore } from '../../../state/sessionStore';
import { rulesStore } from '../../../state/rulesStore';

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
    email: 'perm@test.com',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    identities: [{ provider: 'email', identity_id: 'i', id, user_id: id }],
  } as never;
}

beforeEach(() => {
  sessionStore.getState().patch({ session: { kind: 'anonymous' } });
  rulesStore.getState().patch({ rules: [], lockedApps: { handle: null, isEmpty: true } });
});

test('permanent sign-out creates a NEW anonymous uid and preserves local rules', async () => {
  const perm = permUser('perm-uid-1');
  const supabase = { auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'a', refresh_token: 'r', user: perm } }, error: null }),
    signInAnonymously: jest.fn().mockResolvedValue({ data: { user: anonUser('anon-fresh-1'), session: anonSession('anon-fresh-1') }, error: null }),
    linkIdentity: jest.fn(),
    signInWithIdToken: jest.fn(),
    updateUser: jest.fn(),
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  } } as never;
  // Seed a rule to verify preservation.
  const rule = { id: 'rule-1', activity: 'walking', mode: { kind: 'state', activity: 'walking' }, schedule: { days: [1], window: { kind: 'allDay' } }, enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never;
  rulesStore.getState().patch({ rules: [rule] });
  let resetCount = 0;
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
    onAccountSwitchReset: async () => {
      resetCount += 1;
    },
  });
  await adapter.boot();
  expect(adapter.identity().userId).toBe('perm-uid-1');
  expect(adapter.identity().isAnonymous).toBe(false);
  await adapter.signOut();
  // New anonymous UID, different from permanent.
  expect(adapter.identity().userId).toBe('anon-fresh-1');
  expect(adapter.identity().isAnonymous).toBe(true);
  expect(adapter.identity().userId).not.toBe('perm-uid-1');
  // Session is honest anonymous, not hidden permanent fields.
  expect(adapter.session()).toEqual({ kind: 'anonymous' });
  expect(sessionStore.getState().data.session).toEqual({ kind: 'anonymous' });
  // Rules preserved.
  expect(rulesStore.getState().data.rules).toHaveLength(1);
  expect(resetCount).toBe(1);
  const auth = (supabase as unknown as { auth: Record<string, jest.Mock> }).auth;
  expect(auth.signOut).toHaveBeenCalled();
  expect(auth.signInAnonymously).toHaveBeenCalled();
  adapter.dispose();
});

test('anonymous sign-out is an honest no-op preserving generation', async () => {
  const supabase = { auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: anonSession('anon-noop') }, error: null }),
    signInAnonymously: jest.fn(),
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
  });
  await adapter.boot();
  const gen = adapter.identity().generation;
  const uid = adapter.identity().userId;
  await adapter.signOut();
  expect(adapter.identity().generation).toBe(gen);
  expect(adapter.identity().userId).toBe(uid);
  expect((supabase as unknown as { auth: Record<string, jest.Mock> }).auth.signOut).not.toHaveBeenCalled();
  adapter.dispose();
});

test('sign-out failure leaves visible retry with session intact', async () => {
  const perm = permUser('perm-fail');
  const supabase = { auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'a', refresh_token: 'r', user: perm } }, error: null }),
    signInAnonymously: jest.fn(),
    linkIdentity: jest.fn(),
    signInWithIdToken: jest.fn(),
    updateUser: jest.fn(),
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: { message: 'network' } }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  } } as never;
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapter.boot();
  await expect(adapter.signOut()).rejects.toThrow(/could not sign out/i);
  expect(adapter.identity().userId).toBe('perm-fail');
  expect(adapter.session().kind).toBe('signedIn');
  adapter.dispose();
});

test('permanent sign-out revokes readiness before waiting for serialized SDK reset', async () => {
  let finishReset!: () => void;
  const reset = new Promise<void>((resolve) => {
    finishReset = resolve;
  });
  const perm = permUser('perm-transition');
  const supabase = { auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'a', refresh_token: 'r', user: perm } }, error: null }),
    signInAnonymously: jest.fn().mockResolvedValue({ data: { user: anonUser('fresh-transition'), session: anonSession('fresh-transition') }, error: null }),
    linkIdentity: jest.fn(), signInWithIdToken: jest.fn(), updateUser: jest.fn(), signInWithOtp: jest.fn(), verifyOtp: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  } } as never;
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
    onAccountSwitchReset: () => reset,
  });
  await adapter.boot();
  adapter.markReady('perm-transition', 0);
  const operation = adapter.signOut();
  expect(adapter.identity()).toMatchObject({ kind: 'provisional', userId: null, ready: false, generation: 1 });
  expect((supabase as unknown as { auth: Record<string, jest.Mock> }).auth.signOut).not.toHaveBeenCalled();
  finishReset();
  await operation;
  expect(adapter.identity().userId).toBe('fresh-transition');
  adapter.dispose();
});

test('intentional SDK callbacks before sign-out promises return remain operation-owned', async () => {
  let callback: ((event: string, session: unknown) => void) | null = null;
  const perm = permUser('callback-old');
  const fresh = anonSession('callback-fresh');
  const auth = {
    getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'a', refresh_token: 'r', user: perm } }, error: null }),
    signOut: jest.fn(async () => { callback?.('SIGNED_OUT', null); return { error: null }; }),
    signInAnonymously: jest.fn(async () => { callback?.('SIGNED_IN', fresh); return { data: { user: anonUser('callback-fresh'), session: fresh }, error: null }; }),
    linkIdentity: jest.fn(), signInWithIdToken: jest.fn(), updateUser: jest.fn(), signInWithOtp: jest.fn(), verifyOtp: jest.fn(),
    onAuthStateChange: jest.fn().mockImplementation((next) => { callback = next; return { data: { subscription: { unsubscribe: jest.fn() } } }; }),
  };
  const adapter = new SupabaseAuthAdapter({ supabase: { auth } as never, appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never, googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never, apiBaseUrl: 'https://api.test' });
  await adapter.boot(); await adapter.signOut(); await new Promise((resolve) => setTimeout(resolve, 5));
  expect(adapter.identity()).toMatchObject({ kind: 'canonical', userId: 'callback-fresh', generation: 1 });
  adapter.dispose();
});
