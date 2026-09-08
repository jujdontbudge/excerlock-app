import { Session } from '../domain/types';
import { AuthPort } from '../ports/AuthPort';
import { Unsubscribe } from '../ports/models';
import { sessionStore } from '../state/sessionStore';
import { AccountProvisioning } from './accountProvisioning';
import { NativeIdentityProvider } from './identityProviders';
import { isIdentityAlreadyLinked, SupabaseAuthApi, SupabaseFailure, SupabaseUser } from './supabaseAuthApi';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROVIDERS = ['apple', 'google', 'email'] as const;
type Provider = (typeof PROVIDERS)[number];

/** The server says this user id is gone for good; the app has already started a clean session. */
export class AccountDeletedError extends Error {
  constructor() {
    super('This account was deleted');
    this.name = 'AccountDeletedError';
  }
}

export type SupabaseAuthDeps = {
  client: SupabaseAuthApi;
  apple: NativeIdentityProvider;
  google: NativeIdentityProvider;
  account: AccountProvisioning;
};

export type SupabaseAuth = {
  port: AuthPort;
  /** Restores or mints the session the app runs on. Await it before the first screen reads the port. */
  start(): Promise<void>;
  /**
   * Re-reads the session, retries a provisioning call that could not be made, and restarts the token
   * refresh timer. `runtime/EnforcementHost` owns the app's one `AppState` subscription, so the
   * foreground transition calls this rather than the adapter listening for itself.
   */
  refresh(): Promise<void>;
  /**
   * The live Supabase access token, or `null` when there is no session. `getSession()` refreshes a
   * token inside its expiry margin first, so a caller always gets one it can send. This is not on
   * `AuthPort`: authenticated VPS calls are a composition concern, and the port stays vendor-free.
   */
  accessToken(): Promise<string | null>;
  dispose(): void;
};

const signedInAt = (identity: { last_sign_in_at?: string; created_at?: string }) =>
  Date.parse(identity.last_sign_in_at ?? identity.created_at ?? '') || 0;

function providerOf(user: SupabaseUser): Provider | null {
  const ranked = (user.identities ?? [])
    .filter((identity) => (PROVIDERS as readonly string[]).includes(identity.provider))
    .sort((left, right) => signedInAt(right) - signedInAt(left));
  return (ranked[0]?.provider as Provider | undefined) ?? null;
}

/**
 * A Supabase user as the app models it. An anonymous user, and any user whose identities are all
 * unknown to v1, is `anonymous`: the app's question is only "can this person sign back in", and the
 * user id is the same either way, which is what keeps the identity spine unbroken across a sign-in.
 */
export function toSession(user: SupabaseUser): Session {
  const provider = user.is_anonymous ? null : providerOf(user);
  if (!provider) return { kind: 'anonymous', userId: user.id };
  return { kind: 'signedIn', userId: user.id, provider, email: user.email ?? null };
}

const refuse = (failure: SupabaseFailure | null, fallback: string) => new Error(failure?.message || fallback);

/**
 * The real `AuthPort`: Supabase for identity, the VPS for the account row (see
 * `accountProvisioning`), `sessionStore` for what the screens read.
 *
 * Three laws shape it:
 *
 * - **One id from first launch.** No session means an anonymous sign-in, so the spine exists before
 *   anyone signs in. Linking Apple, Google or an email onto that anonymous user keeps the id (B18);
 *   only when the provider account already belongs to someone else does the app switch id, because
 *   the alternative is stranding a real account.
 * - **The server row comes first.** A sign-in is reported only after `PUT /v1/user` succeeds, as the
 *   old Clerk bridge did, so no screen ever shows a signed-in account the server has not seen. The
 *   anonymous bootstrap is the exception: it publishes first and provisions after, because earning
 *   and locking must work with no network at all.
 * - **Signing out is not deleting.** Every exit ends on a fresh anonymous session and touches no
 *   rule, day or setting. The SDK teardown order lives in `domain/identity`, above this adapter.
 */
export function createSupabaseAuth({ client, apple, google, account }: SupabaseAuthDeps): SupabaseAuth {
  let disposed = false;
  let listening = true;
  let pending: { email: string; type: 'email' | 'email_change' } | null = null;
  let authSubscription: { unsubscribe(): void } | null = null;

  const session = (): Session => sessionStore.getState().data.session;
  const publish = (user: SupabaseUser | null | undefined) => {
    if (disposed || !user) return;
    sessionStore.getState().patch({ session: toSession(user) });
  };
  const accessToken = async () => (await client.getSession()).data.session?.access_token ?? null;
  const isAnonymous = async () => (await client.getSession()).data.session?.user?.is_anonymous === true;

  const bootstrapAnonymous = async (options: { provision: boolean }) => {
    const { data, error } = await client.signInAnonymously();
    if (error || !data.user) throw refuse(error, 'Could not start a session');
    publish(data.user);
    if (options.provision) await provisionCurrent();
  };

  /** The server has erased this id: drop the stale session and start a clean anonymous one. */
  const recoverFromDeletion = async () => {
    await client.signOut();
    pending = null;
    await bootstrapAnonymous({ provision: false });
  };

  async function provisionCurrent() {
    const token = await accessToken();
    if (!token) return 'failed' as const;
    const outcome = await account.provision(token);
    if (outcome === 'deleted') await recoverFromDeletion();
    return outcome;
  }

  /** Runs a sign-in with the auth listener muted, so only a provisioned session reaches the screens. */
  const exclusively = async <T>(work: () => Promise<T>): Promise<T> => {
    listening = false;
    try {
      return await work();
    } finally {
      listening = true;
    }
  };

  const settle = async (user: SupabaseUser): Promise<Session> => {
    const outcome = await provisionCurrent();
    if (outcome === 'deleted') throw new AccountDeletedError();
    if (outcome === 'failed') throw new Error('Could not reach ExcerLock to finish signing in');
    pending = null;
    publish(user);
    return session();
  };

  const linkOrSignIn = async (provider: Provider, token: string): Promise<SupabaseUser> => {
    if (await isAnonymous()) {
      const linked = await client.linkIdentity({ provider, token });
      if (!linked.error && linked.data.user) return linked.data.user;
      if (linked.error && !isIdentityAlreadyLinked(linked.error)) throw refuse(linked.error, 'Sign-in failed');
    }
    const signedIn = await client.signInWithIdToken({ provider, token });
    if (signedIn.error || !signedIn.data.user) throw refuse(signedIn.error, 'Sign-in failed');
    return signedIn.data.user;
  };

  const signInWith = async (provider: Provider, source: NativeIdentityProvider): Promise<Session> => {
    const credential = await source.requestToken();
    if (credential === 'cancelled') return session();
    return exclusively(async () => settle(await linkOrSignIn(provider, credential.token)));
  };

  const port: AuthPort = {
    session,
    signInWithApple: () => signInWith('apple', apple),
    signInWithGoogle: () => signInWith('google', google),

    sendEmailCode: async (value) => {
      const email = value.trim();
      if (!EMAIL.test(email)) throw new Error('Enter a valid email address');
      // An anonymous user attaches the address to the id it already has; a signed-in one is asking
      // for a plain sign-in code. Both arrive as a six-digit code, never a link.
      const anonymous = await isAnonymous();
      const { error } = anonymous
        ? await client.updateUser({ email })
        : await client.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw refuse(error, 'Could not send the code');
      pending = { email, type: anonymous ? 'email_change' : 'email' };
    },

    verifyEmailCode: async (code) => {
      const request = pending;
      if (!request) throw new Error('Ask for a code first');
      return exclusively(async () => {
        const { data, error } = await client.verifyOtp({ email: request.email, token: code, type: request.type });
        if (error || !data.user) throw refuse(error, 'That code did not work');
        return settle(data.user);
      });
    },

    signOut: () =>
      exclusively(async () => {
        await client.signOut();
        pending = null;
        await bootstrapAnonymous({ provision: true });
      }),

    deleteAccount: async () => {
      const token = await accessToken();
      if (!token) throw new Error('There is no account to delete');
      const outcome = await account.remove(token);
      await exclusively(async () => {
        await client.signOut();
        pending = null;
        await bootstrapAnonymous({ provision: outcome === 'ok' });
      });
    },

    subscribe: (callback): Unsubscribe => sessionStore.subscribe((state) => callback(state.data.session)),
  };

  const refresh = async () => {
    if (disposed) return;
    void client.startAutoRefresh();
    const user = (await client.getSession()).data.session?.user;
    if (!user) return bootstrapAnonymous({ provision: true });
    publish(user);
    await provisionCurrent();
  };

  return {
    port,
    accessToken,
    start: async () => {
      authSubscription = client.onAuthStateChange((_event, next) => {
        if (listening) publish(next?.user);
      }).data.subscription;
      const restored = (await client.getSession()).data.session?.user;
      if (restored) {
        publish(restored);
        await provisionCurrent();
      } else {
        await bootstrapAnonymous({ provision: true });
      }
      void client.startAutoRefresh();
    },
    refresh,
    dispose: () => {
      disposed = true;
      authSubscription?.unsubscribe();
      authSubscription = null;
      void client.stopAutoRefresh();
    },
  };
}
