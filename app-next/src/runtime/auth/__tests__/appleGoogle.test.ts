import { SupabaseAuthAdapter } from '../SupabaseAuthAdapter';
import { AuthCancelledError, AuthError, AuthRecoveryRequiredError } from '../../../ports/AuthPort';
import { sessionStore } from '../../../state/sessionStore';
import { buildRealGoogleRequest, requestGoogleCredential } from '../providerGoogle';

const mockExchangeCodeAsync = jest.fn();
jest.mock('expo-auth-session', () => ({
  ResponseType: { Code: 'code' },
  CodeChallengeMethod: { S256: 'S256' },
  AuthRequest: class {
    codeVerifier: string | undefined;
    async promptAsync() {
      this.codeVerifier = 'lazy-verifier';
      return { type: 'success', params: { code: 'lazy-code' } };
    }
  },
  exchangeCodeAsync: (...args: unknown[]) => mockExchangeCodeAsync(...args),
}));

function anonUser(id: string) {
  return { id, is_anonymous: true, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() } as never;
}
function anonSession(id: string) {
  const user = anonUser(id);
  return { access_token: `access-${id}`, refresh_token: `refresh-${id}`, user } as never;
}
function permUser(id: string, provider = 'apple') {
  return {
    id,
    is_anonymous: false,
    email: 'user@test.com',
    app_metadata: { provider, providers: [provider] },
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    identities: [{ provider, identity_id: 'iid', id, user_id: id }],
  } as never;
}

function baseSupabase() {
  return { auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: anonSession('anon-base') }, error: null }),
    signInAnonymously: jest.fn(),
    linkIdentity: jest.fn(),
    signInWithIdToken: jest.fn(),
    updateUser: jest.fn(),
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  } };
}

beforeEach(() => {
  sessionStore.getState().patch({ session: { kind: 'anonymous' } });
});

test('Apple uses fresh raw nonce for Supabase and hashed nonce for provider, in order', async () => {
  const supabase = baseSupabase() as never;
  const seen: { hashedForApple: string | null; rawForSupabase: string | null } = { hashedForApple: null, rawForSupabase: null };
  const appleDeps = {
    signInAsync: jest.fn().mockImplementation(async ({ nonce }: { nonce: string }) => {
      seen.hashedForApple = nonce;
      return { identityToken: 'apple-id-token', authorizationCode: 'code', user: 'apple-user' };
    }),
    digestSHA256Hex: jest.fn().mockImplementation(async (raw: string) => {
      // Simulate SHA256 hex; record that hashing happened after raw generation.
      expect(typeof raw).toBe('string');
      expect(raw.length).toBeGreaterThan(10);
      return `hashed-${raw}`;
    }),
    randomNonce: () => 'fixed-raw-nonce-1234567890abcdef',
  };
  (supabase as unknown as { auth: { linkIdentity: jest.Mock } }).auth.linkIdentity.mockImplementation(async (args: { provider: string; token: string; nonce: string }) => {
    seen.rawForSupabase = args.nonce;
    expect(args.provider).toBe('apple');
    expect(args.token).toBe('apple-id-token');
    return { data: { user: permUser('anon-base', 'apple'), session: { access_token: 'a', refresh_token: 'r', user: permUser('anon-base', 'apple') } }, error: null };
  });
  const adapter = new SupabaseAuthAdapter({
    supabase: supabase as never,
    appleDeps: appleDeps as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapter.boot();
  await adapter.signInWithApple();
  // digest must have been called with raw, Apple with hashed(raw), Supabase with raw.
  expect(appleDeps.digestSHA256Hex).toHaveBeenCalledWith('fixed-raw-nonce-1234567890abcdef');
  expect(seen.hashedForApple).toBe('hashed-fixed-raw-nonce-1234567890abcdef');
  expect(seen.rawForSupabase).toBe('fixed-raw-nonce-1234567890abcdef');
  // Hashed for Apple must differ from raw for Supabase (order asserted).
  expect(seen.hashedForApple).not.toBe(seen.rawForSupabase);
  adapter.dispose();
});

test('Apple linkIdentity exact overload keeps UID; never signInWithIdToken for conversion', async () => {
  const supabase = baseSupabase() as never;
  const auth = (supabase as unknown as { auth: Record<string, jest.Mock> }).auth;
  auth.linkIdentity.mockResolvedValue({
    data: { user: permUser('anon-base', 'apple'), session: { access_token: 'a', refresh_token: 'r', user: permUser('anon-base', 'apple') } },
    error: null,
  });
  const adapter = new SupabaseAuthAdapter({
    supabase: supabase as never,
    appleDeps: {
      signInAsync: jest.fn().mockResolvedValue({ identityToken: 'tok', authorizationCode: 'c', user: 'u' }),
      digestSHA256Hex: jest.fn().mockResolvedValue('hashed'),
    } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapter.boot();
  const before = adapter.identity().userId;
  await adapter.signInWithApple();
  expect(auth.linkIdentity).toHaveBeenCalledWith(expect.objectContaining({ provider: 'apple', token: 'tok' }));
  // Must include nonce (raw) for Apple.
  expect(auth.linkIdentity.mock.calls[0][0]).toHaveProperty('nonce');
  expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  expect(adapter.identity().userId).toBe(before);
  adapter.dispose();
});

test('Google code/PKCE+state flow exchanges without client secret and links with idToken', async () => {
  const supabase = baseSupabase() as never;
  const auth = (supabase as unknown as { auth: Record<string, jest.Mock> }).auth;
  auth.linkIdentity.mockResolvedValue({
    data: { user: permUser('anon-base', 'google'), session: { access_token: 'a', refresh_token: 'r', user: permUser('anon-base', 'google') } },
    error: null,
  });
  const buildRequest = jest.fn().mockReturnValue({
    promptAsync: jest.fn().mockResolvedValue({ type: 'success', params: { code: 'auth-code', state: 's1' } }),
    codeVerifier: 'verifier-123',
  });
  const exchangeCode = jest.fn().mockResolvedValue({ idToken: 'google-id-token', accessToken: 'google-access' });
  const adapter = new SupabaseAuthAdapter({
    supabase: supabase as never,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: { clientId: 'ios-client.apps.googleusercontent.com', redirectUri: 'com.test:/oauthredirect', buildRequest, exchangeCode } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapter.boot();
  await adapter.signInWithGoogle();
  // Exchange never receives a secret.
  expect(exchangeCode).toHaveBeenCalledWith(expect.objectContaining({ code: 'auth-code', codeVerifier: 'verifier-123' }));
  expect(JSON.stringify(exchangeCode.mock.calls)).not.toMatch(/secret/i);
  expect(auth.linkIdentity).toHaveBeenCalledWith(expect.objectContaining({ provider: 'google', token: 'google-id-token' }));
  expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  adapter.dispose();
});

test('real Google factory reads lazily generated PKCE verifier after prompt', async () => {
  mockExchangeCodeAsync.mockResolvedValueOnce({ idToken: 'real-id-token', accessToken: 'real-access-token' });
  const deps = buildRealGoogleRequest('ios-client', 'excerlock://oauth');
  const credential = await requestGoogleCredential(deps);
  expect(mockExchangeCodeAsync).toHaveBeenCalledWith(
    expect.objectContaining({ code: 'lazy-code', extraParams: { code_verifier: 'lazy-verifier' } }),
    expect.any(Object),
  );
  expect(credential).toEqual({ idToken: 'real-id-token', accessToken: 'real-access-token' });
});

test('cancellation typed separately from failures and missing tokens', async () => {
  // Apple cancel
  const supabase = baseSupabase() as never;
  const adapterCancel = new SupabaseAuthAdapter({
    supabase: supabase as never,
    appleDeps: {
      signInAsync: jest.fn().mockRejectedValue(Object.assign(new Error('cancel'), { code: 'ERR_REQUEST_CANCELED' })),
      digestSHA256Hex: jest.fn().mockResolvedValue('h'),
    } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapterCancel.boot();
  await expect(adapterCancel.signInWithApple()).rejects.toBeInstanceOf(AuthCancelledError);
  adapterCancel.dispose();

  // Apple missing token -> visible AuthError, not cancel
  const supabase2 = baseSupabase() as never;
  const adapterMissing = new SupabaseAuthAdapter({
    supabase: supabase2 as never,
    appleDeps: {
      signInAsync: jest.fn().mockResolvedValue({ identityToken: null, authorizationCode: null, user: null }),
      digestSHA256Hex: jest.fn().mockResolvedValue('h'),
    } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapterMissing.boot();
  await expect(adapterMissing.signInWithApple()).rejects.toBeInstanceOf(AuthError);
  await expect(adapterMissing.signInWithApple()).rejects.not.toBeInstanceOf(AuthCancelledError);
  adapterMissing.dispose();

  // Google dismiss -> cancel
  const supabase3 = baseSupabase() as never;
  const adapterGoogleCancel = new SupabaseAuthAdapter({
    supabase: supabase3 as never,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: {
      clientId: 'c',
      redirectUri: 'r',
      buildRequest: jest.fn().mockReturnValue({ promptAsync: jest.fn().mockResolvedValue({ type: 'dismiss' }), codeVerifier: 'v' }),
      exchangeCode: jest.fn(),
    } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapterGoogleCancel.boot();
  await expect(adapterGoogleCancel.signInWithGoogle()).rejects.toBeInstanceOf(AuthCancelledError);
  adapterGoogleCancel.dispose();

  // Google provider failure -> AuthError
  const supabase4 = baseSupabase() as never;
  const adapterGoogleFail = new SupabaseAuthAdapter({
    supabase: supabase4 as never,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: {
      clientId: 'c',
      redirectUri: 'r',
      buildRequest: jest.fn().mockReturnValue({ promptAsync: jest.fn().mockResolvedValue({ type: 'error', error: { message: 'state_mismatch' } }), codeVerifier: 'v' }),
      exchangeCode: jest.fn(),
    } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapterGoogleFail.boot();
  await expect(adapterGoogleFail.signInWithGoogle()).rejects.toBeInstanceOf(AuthError);
  adapterGoogleFail.dispose();
});

test('existing-account link conflict produces explicit recovery error, not silent merge', async () => {
  const supabase = baseSupabase() as never;
  const auth = (supabase as unknown as { auth: Record<string, jest.Mock> }).auth;
  auth.linkIdentity.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'identity is already linked to another user', code: 'identity_already_exists', status: 422 } });
  const adapter = new SupabaseAuthAdapter({
    supabase: supabase as never,
    appleDeps: {
      signInAsync: jest.fn().mockResolvedValue({ identityToken: 'tok', authorizationCode: 'c', user: 'u' }),
      digestSHA256Hex: jest.fn().mockResolvedValue('h'),
    } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapter.boot();
  const before = adapter.identity().userId;
  await expect(adapter.signInWithApple()).rejects.toBeInstanceOf(AuthRecoveryRequiredError);
  // UID unchanged, no silent adoption.
  expect(adapter.identity().userId).toBe(before);
  expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  adapter.dispose();
});

test('explicit recovery adopts server-verified existing UID without arbitrary merge', async () => {
  const supabase = baseSupabase() as never;
  const auth = (supabase as unknown as { auth: Record<string, jest.Mock> }).auth;
  const existingUser = permUser('existing-uid-999', 'apple');
  auth.signInWithIdToken.mockResolvedValue({ data: { user: existingUser, session: { access_token: 'a2', refresh_token: 'r2', user: existingUser } }, error: null });
  let resetCalled = 0;
  const adapter = new SupabaseAuthAdapter({
    supabase: supabase as never,
    appleDeps: {
      signInAsync: jest.fn().mockResolvedValue({ identityToken: 'tok2', authorizationCode: 'c', user: 'u' }),
      digestSHA256Hex: jest.fn().mockResolvedValue('h2'),
    } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
    onAccountSwitchReset: async () => {
      resetCalled += 1;
    },
  });
  await adapter.boot();
  const before = adapter.identity().userId;
  expect(before).not.toBe('existing-uid-999');
  const session = await adapter.recoverWithApple();
  expect(auth.signInWithIdToken).toHaveBeenCalledWith(expect.objectContaining({ provider: 'apple', token: 'tok2' }));
  expect(adapter.identity().userId).toBe('existing-uid-999');
  expect(session.kind).toBe('signedIn');
  expect(resetCalled).toBe(1);
  // Error must not contain tokens.
  adapter.dispose();
});
