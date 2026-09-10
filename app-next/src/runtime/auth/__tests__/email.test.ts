import { SupabaseAuthAdapter } from '../SupabaseAuthAdapter';
import { AuthError, AuthRecoveryRequiredError } from '../../../ports/AuthPort';
import { sessionStore } from '../../../state/sessionStore';

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
    email: 'alex@example.test',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    identities: [{ provider: 'email', identity_id: 'i', id, user_id: id }],
  } as never;
}
function baseSupabase() {
  return { auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: anonSession('anon-email') }, error: null }),
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

test('email validation rejects invalid addresses with visible error', async () => {
  const supabase = baseSupabase() as never;
  const adapter = new SupabaseAuthAdapter({
    supabase: supabase as never,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapter.boot();
  await expect(adapter.sendEmailCode('not-an-email')).rejects.toBeInstanceOf(AuthError);
  await expect(adapter.sendEmailCode('  ')).rejects.toThrow(/valid email/i);
  adapter.dispose();
});

test('anonymous conversion uses updateUser then verifyOtp email_change, keeps UID', async () => {
  const supabase = baseSupabase() as never;
  const auth = (supabase as unknown as { auth: Record<string, jest.Mock> }).auth;
  auth.updateUser.mockResolvedValue({ data: { user: anonUser('anon-email') }, error: null });
  const convertedUser = { ...(permUser('anon-email') as unknown as Record<string, unknown>), email: 'new@test.com' } as never;
  auth.verifyOtp.mockResolvedValue({ data: { user: convertedUser, session: { access_token: 'a', refresh_token: 'r', user: convertedUser } }, error: null });
  const adapter = new SupabaseAuthAdapter({
    supabase: supabase as never,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapter.boot();
  const before = adapter.identity().userId;
  await adapter.sendEmailCode('new@test.com');
  expect(auth.updateUser).toHaveBeenCalledWith({ email: 'new@test.com' });
  expect(auth.signInWithOtp).not.toHaveBeenCalled();
  expect(adapter.pendingEmailFlow()).toBe('conversion');
  const session = await adapter.verifyEmailCode('123456');
  expect(auth.verifyOtp).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@test.com', type: 'email_change' }));
  expect(adapter.identity().userId).toBe(before);
  expect(session.kind).toBe('signedIn');
  adapter.dispose();
});

test('existing-account email conflict sends recovery OTP and throws explicit recovery error', async () => {
  const supabase = baseSupabase() as never;
  const auth = (supabase as unknown as { auth: Record<string, jest.Mock> }).auth;
  auth.updateUser.mockResolvedValue({ data: { user: null }, error: { message: 'User already registered', code: 'email_exists' } });
  auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
  const adapter = new SupabaseAuthAdapter({
    supabase: supabase as never,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapter.boot();
  const before = adapter.identity().userId;
  await expect(adapter.sendEmailCode('taken@test.com')).rejects.toBeInstanceOf(AuthRecoveryRequiredError);
  expect(auth.signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ email: 'taken@test.com' }));
  expect(adapter.pendingEmailFlow()).toBe('recovery');
  expect(adapter.identity().userId).toBe(before);
  // Recovery verify uses type email and adopts existing UID.
  const existing = permUser('existing-email-uid');
  auth.verifyOtp.mockResolvedValue({ data: { user: existing, session: { access_token: 'a3', refresh_token: 'r3', user: existing } }, error: null });
  const session = await adapter.verifyEmailCode('654321');
  expect(auth.verifyOtp).toHaveBeenCalledWith(expect.objectContaining({ type: 'email' }));
  expect(adapter.identity().userId).toBe('existing-email-uid');
  expect(session.kind).toBe('signedIn');
  adapter.dispose();
});

test('verify without pending and invalid code leave visible retry with token intact', async () => {
  const supabase = baseSupabase() as never;
  const auth = (supabase as unknown as { auth: Record<string, jest.Mock> }).auth;
  const adapter = new SupabaseAuthAdapter({
    supabase: supabase as never,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapter.boot();
  await expect(adapter.verifyEmailCode('123456')).rejects.toThrow(/request a code/i);
  auth.updateUser.mockResolvedValue({ data: {}, error: null });
  await adapter.sendEmailCode('ok@test.com');
  auth.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'invalid' } });
  await expect(adapter.verifyEmailCode('000000')).rejects.toThrow(/did not work/i);
  // Pending retained for retry.
  expect(adapter.pendingEmailFlow()).toBe('conversion');
  // Short code validation.
  await expect(adapter.verifyEmailCode('12')).rejects.toThrow(/did not work/i);
  adapter.dispose();
});

test('permanent account email send uses recovery OTP directly', async () => {
  const perm = permUser('perm-1');
  const supabase = { auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'a', refresh_token: 'r', user: perm } }, error: null }),
    signInAnonymously: jest.fn(),
    linkIdentity: jest.fn(),
    signInWithIdToken: jest.fn(),
    updateUser: jest.fn(),
    signInWithOtp: jest.fn().mockResolvedValue({ data: {}, error: null }),
    verifyOtp: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  } } as never;
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: { signInAsync: jest.fn(), digestSHA256Hex: jest.fn() } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
  });
  await adapter.boot();
  expect(adapter.identity().isAnonymous).toBe(false);
  await adapter.sendEmailCode('other@test.com');
  const auth = (supabase as unknown as { auth: Record<string, jest.Mock> }).auth;
  expect(auth.signInWithOtp).toHaveBeenCalled();
  expect(auth.updateUser).not.toHaveBeenCalled();
  expect(adapter.pendingEmailFlow()).toBe('recovery');
  adapter.dispose();
});
