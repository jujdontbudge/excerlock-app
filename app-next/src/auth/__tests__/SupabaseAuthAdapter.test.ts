import { describeAuthPort } from '../../ports/__tests__/authContract';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { rulesStore } from '../../state/rulesStore';
import { sessionStore } from '../../state/sessionStore';
import { settingsStore } from '../../state/settingsStore';
import { accountProvisioning } from '../accountProvisioning';
import type { NativeIdentityProvider } from '../identityProviders';
import { createSupabaseAuth, SupabaseAuth } from '../SupabaseAuthAdapter';
import { accountServerDouble, OTP_CODE, supabaseDouble, SupabaseDouble } from './supabaseDouble';

const API = 'https://api.excerlock.test';

function identityDouble(token: string): NativeIdentityProvider & { cancel(): void; fail(error: Error): void } {
  let outcome: 'token' | 'cancelled' | Error = 'token';
  return {
    isAvailable: async () => true,
    requestToken: async () => {
      if (outcome instanceof Error) throw outcome;
      if (outcome === 'cancelled') return 'cancelled';
      return { token, email: token.split(':')[1] ?? null };
    },
    cancel: () => {
      outcome = 'cancelled';
    },
    fail: (error) => {
      outcome = error;
    },
  };
}

type Harness = {
  auth: SupabaseAuth;
  client: SupabaseDouble;
  apple: ReturnType<typeof identityDouble>;
  google: ReturnType<typeof identityDouble>;
  server: ReturnType<typeof accountServerDouble>;
};

async function harness(status: () => number = () => 200): Promise<Harness> {
  sessionStore.getState().reset();
  const client = supabaseDouble();
  const apple = identityDouble('apple:alex@example.test');
  const google = identityDouble('google:alex@example.test');
  const server = accountServerDouble(status);
  const auth = createSupabaseAuth({
    client,
    apple,
    google,
    account: accountProvisioning({ baseUrl: API, fetcher: server.fetcher }),
  });
  await auth.start();
  return { auth, client, apple, google, server };
}

describeAuthPort(async () => {
  const { auth } = await harness();
  return { port: auth.port, code: OTP_CODE, dispose: auth.dispose };
});

describe('SupabaseAuthAdapter', () => {
  test('a fresh install provisions the anonymous user on the server', async () => {
    const { auth, client, server } = await harness();
    expect(auth.port.session()).toEqual({ kind: 'anonymous', userId: client.currentUser()!.id });
    expect(server.calls).toEqual([
      { method: 'PUT', url: `${API}/v1/user`, authorization: `Bearer ${client.accessToken()}` },
    ]);
    auth.dispose();
  });

  test('a session restored from the keychain is not signed in again', async () => {
    const { auth, client, server } = await harness();
    const restored = client.currentUser()!.id;
    await auth.refresh();
    expect(client.currentUser()!.id).toBe(restored);
    expect(server.calls).toHaveLength(2);
    auth.dispose();
  });

  test('signing in provisions the linked user before the session is reported', async () => {
    const { auth, client, server } = await harness();
    const session = await auth.port.signInWithApple();
    expect(session).toMatchObject({ kind: 'signedIn', provider: 'apple', email: 'alex@example.test' });
    expect(server.calls.at(-1)).toEqual({
      method: 'PUT',
      url: `${API}/v1/user`,
      authorization: `Bearer ${client.accessToken()}`,
    });
    auth.dispose();
  });

  test('a server that reports the account deleted starts a clean anonymous session', async () => {
    let status = 200;
    const { auth, client } = await harness(() => status);
    const anonymousId = auth.port.session().userId;
    status = 410;
    await expect(auth.port.signInWithApple()).rejects.toThrow(/deleted/i);
    expect(auth.port.session()).toMatchObject({ kind: 'anonymous' });
    expect(auth.port.session().userId).not.toBe(anonymousId);
    expect(client.currentUser()!.is_anonymous).toBe(true);
    auth.dispose();
  });

  test('a server that cannot be reached leaves the session anonymous', async () => {
    let status = 200;
    const { auth } = await harness(() => status);
    const anonymousId = auth.port.session().userId;
    status = 500;
    await expect(auth.port.signInWithApple()).rejects.toThrow();
    expect(auth.port.session()).toEqual({ kind: 'anonymous', userId: anonymousId });
    auth.dispose();
  });

  test('a cancelled Apple sheet leaves the session untouched and raises nothing', async () => {
    const { auth, apple } = await harness();
    const before = auth.port.session();
    apple.cancel();
    await expect(auth.port.signInWithApple()).resolves.toEqual(before);
    auth.dispose();
  });

  test('a cancelled Google sheet leaves the session untouched and raises nothing', async () => {
    const { auth, google } = await harness();
    const before = auth.port.session();
    google.cancel();
    await expect(auth.port.signInWithGoogle()).resolves.toEqual(before);
    auth.dispose();
  });

  test('a failing Apple sheet surfaces the failure', async () => {
    const { auth, apple } = await harness();
    apple.fail(new Error('Apple is unavailable'));
    await expect(auth.port.signInWithApple()).rejects.toThrow('Apple is unavailable');
    expect(auth.port.session()).toMatchObject({ kind: 'anonymous' });
    auth.dispose();
  });

  test('an Apple account that already exists is signed back into, not duplicated', async () => {
    const { auth, client } = await harness();
    const owner = (await auth.port.signInWithApple()).userId;
    await auth.port.signOut();
    const anonymousId = auth.port.session().userId;
    expect(anonymousId).not.toBe(owner);

    // Linking onto the fresh anonymous id is refused because the Apple account already belongs to
    // the first user, so the adapter must sign into that account rather than strand it.
    const session = await auth.port.signInWithApple();
    expect(session).toMatchObject({ kind: 'signedIn', provider: 'apple', userId: owner });
    expect(client.users().filter((user) => !user.is_anonymous)).toHaveLength(1);
    auth.dispose();
  });

  test('a refused provider token surfaces to the caller', async () => {
    const { auth, client } = await harness();
    client.failNext('linkIdentity', { message: 'Bad ID token', code: 'validation_failed' });
    await expect(auth.port.signInWithGoogle()).rejects.toThrow();
    expect(auth.port.session()).toMatchObject({ kind: 'anonymous' });
    auth.dispose();
  });

  test('an anonymous user is emailed a change code and a signed-in user a sign-in code', async () => {
    const { auth, client } = await harness();
    await auth.port.sendEmailCode('alex@example.test');
    expect(client.emailsSent).toEqual([{ email: 'alex@example.test', kind: 'change' }]);
    await auth.port.verifyEmailCode(OTP_CODE);
    await auth.port.sendEmailCode('alex@example.test');
    expect(client.emailsSent.at(-1)).toEqual({ email: 'alex@example.test', kind: 'otp' });
    auth.dispose();
  });

  test('a code that cannot be sent surfaces to the caller', async () => {
    const { auth, client } = await harness();
    client.failNext('updateUser', { message: 'Network request failed' });
    await expect(auth.port.sendEmailCode('alex@example.test')).rejects.toThrow();
    auth.dispose();
  });

  test('verifying before any code was requested is refused', async () => {
    const { auth } = await harness();
    await expect(auth.port.verifyEmailCode(OTP_CODE)).rejects.toThrow();
    auth.dispose();
  });

  test('deleting the account asks the server first and keeps the failure local', async () => {
    let status = 200;
    const { auth, client, server } = await harness(() => status);
    await auth.port.signInWithApple();
    const signedInId = auth.port.session().userId;
    const token = client.accessToken();

    status = 500;
    await expect(auth.port.deleteAccount()).rejects.toThrow();
    expect(auth.port.session()).toMatchObject({ kind: 'signedIn', userId: signedInId });

    status = 200;
    await auth.port.deleteAccount();
    expect(server.calls.filter((call) => call.method === 'DELETE')).toEqual([
      { method: 'DELETE', url: `${API}/v1/user`, authorization: `Bearer ${token}` },
      { method: 'DELETE', url: `${API}/v1/user`, authorization: `Bearer ${token}` },
    ]);
    expect(auth.port.session()).toMatchObject({ kind: 'anonymous' });
    expect(auth.port.session().userId).not.toBe(signedInId);
    auth.dispose();
  });

  test('a deletion the server already applied still lands on a fresh anonymous session', async () => {
    let status = 200;
    const { auth } = await harness(() => status);
    await auth.port.signInWithApple();
    const signedInId = auth.port.session().userId;
    status = 410;
    await auth.port.deleteAccount();
    expect(auth.port.session()).toMatchObject({ kind: 'anonymous' });
    expect(auth.port.session().userId).not.toBe(signedInId);
    auth.dispose();
  });

  test('signing out and deleting the account leave every rule, day and setting on the device', async () => {
    // The local-first law: whatever an account exit does to the session, nothing that decides
    // earning or locking moves with it.
    const { auth } = await harness();
    settingsStore.getState().patch({ units: 'mi' });
    rulesStore.getState().patch({ lockedApps: { handle: { token: 'chosen-apps' }, appCount: 3, categoryCount: 1 } });
    const local = JSON.stringify([rulesStore, ruleDaysStore, settingsStore].map((store) => store.getState().data));

    await auth.port.signInWithApple();
    await auth.port.signOut();
    expect(JSON.stringify([rulesStore, ruleDaysStore, settingsStore].map((store) => store.getState().data))).toBe(
      local,
    );

    await auth.port.signInWithApple();
    await auth.port.deleteAccount();
    expect(JSON.stringify([rulesStore, ruleDaysStore, settingsStore].map((store) => store.getState().data))).toBe(
      local,
    );
    expect(auth.port.session()).toMatchObject({ kind: 'anonymous' });
    auth.dispose();
  });

  test('disposing stops the adapter from publishing further sessions', async () => {
    const { auth, client } = await harness();
    const published: string[] = [];
    const stop = auth.port.subscribe((session) => published.push(session.userId));
    auth.dispose();
    await client.signInAnonymously();
    expect(published).toEqual([]);
    stop();
  });
});
