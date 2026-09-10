import { SupabaseAuthAdapter } from '../SupabaseAuthAdapter';
import { sessionStore } from '../../../state/sessionStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

function anonUser(id: string) {
  return { id, is_anonymous: true, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() } as never;
}
function anonSession(id: string) {
  const user = anonUser(id);
  return { access_token: `access-token-secret-${id}`, refresh_token: `refresh-token-secret-${id}`, user } as never;
}

beforeEach(async () => {
  sessionStore.getState().patch({ session: { kind: 'anonymous' } });
  await AsyncStorage.clear();
});

test('no secrets in sessionStore, AsyncStorage, logs or errors', async () => {
  const supabase = { auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: anonSession('s1') }, error: null }),
    signInAnonymously: jest.fn(),
    linkIdentity: jest.fn().mockImplementation(async (args: { token: string; nonce: string }) => {
      // Adapter must pass tokens to Supabase but never log them.
      expect(args.token).toBe('apple-id-token-secret');
      const user = { id: 's1', is_anonymous: false, email: 'a@test.com', app_metadata: { provider: 'apple' }, user_metadata: {}, aud: 'a', created_at: new Date().toISOString(), identities: [{ provider: 'apple' }] } as never;
      return { data: { user, session: { access_token: 'new-access-secret', refresh_token: 'new-refresh-secret', user } }, error: null };
    }),
    signInWithIdToken: jest.fn(),
    updateUser: jest.fn(),
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  } } as never;
  const logs: string[] = [];
  const origLog = console.log;
  const origError = console.error;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(' '));
  };
  console.error = (...args: unknown[]) => {
    logs.push(args.map(String).join(' '));
  };
  const adapter = new SupabaseAuthAdapter({
    supabase,
    appleDeps: {
      signInAsync: jest.fn().mockResolvedValue({ identityToken: 'apple-id-token-secret', authorizationCode: 'c', user: 'u' }),
      digestSHA256Hex: jest.fn().mockResolvedValue('hashed-secret'),
    } as never,
    googleDeps: { clientId: 'c', redirectUri: 'r', buildRequest: jest.fn(), exchangeCode: jest.fn() } as never,
    apiBaseUrl: 'https://api.test',
  });
  try {
    await adapter.boot();
    await adapter.signInWithApple();
    // Force an error path with tokens in flight; error must not contain them.
    (supabase as unknown as { auth: { updateUser: jest.Mock } }).auth.updateUser.mockResolvedValue({ data: {}, error: { message: 'fail' } });
    await expect(adapter.sendEmailCode('a@test.com')).rejects.toThrow();
  } finally {
    console.log = origLog;
    console.error = origError;
    adapter.dispose();
  }
  const sessionRaw = JSON.stringify(sessionStore.getState().data);
  expect(sessionRaw).not.toMatch(/access-token-secret|refresh-token-secret|apple-id-token-secret|hashed-secret/);
  expect(sessionRaw).not.toMatch(/access_token|refresh_token|identityToken/);
  const keys = await AsyncStorage.getAllKeys();
  let allValues = '';
  for (const k of keys) {
    const v = await AsyncStorage.getItem(k);
    if (v) allValues += v;
  }
  expect(allValues).not.toMatch(/access-token-secret|refresh-token-secret|apple-id-token-secret/);
  expect(logs.join('\n')).not.toMatch(/access-token-secret|refresh-token-secret|apple-id-token-secret/);
  // Identity snapshot is non-secret.
  const identityRaw = JSON.stringify(adapter.identity());
  expect(identityRaw).not.toMatch(/access|refresh|token/i);
});
