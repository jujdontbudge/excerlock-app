import { SupabaseAuthApi, SupabaseFailure, SupabaseSession, SupabaseUser } from '../supabaseAuthApi';

/**
 * A stand-in for `supabase.auth` that keeps users and identities in memory. It exists so the adapter
 * can be driven through the real GoTrue behaviours that matter to us — anonymous users, identity
 * linking, an already-linked identity, OTP verification — without a network or a project.
 *
 * ID tokens are written as `<provider>:<email>`, which is all the double needs to recognise the same
 * third-party account twice.
 */
export type SupabaseDouble = SupabaseAuthApi & {
  /** Fails the next call to the named method once. */
  failNext(
    method: 'signInWithIdToken' | 'linkIdentity' | 'signInWithOtp' | 'updateUser' | 'signOut',
    failure: SupabaseFailure,
  ): void;
  /** Every user the double has minted, newest last. */
  users(): SupabaseUser[];
  currentUser(): SupabaseUser | null;
  accessToken(): string | null;
  emailsSent: { email: string; kind: 'otp' | 'change' }[];
};

export const OTP_CODE = '123456';

const failure = (message: string, code?: string): SupabaseFailure => ({ message, code, status: 400 });

export function supabaseDouble(): SupabaseDouble {
  let sequence = 0;
  const all: SupabaseUser[] = [];
  const listeners: ((event: string, session: SupabaseSession | null) => void)[] = [];
  const failures = new Map<string, SupabaseFailure>();
  const pendingChange = new Map<string, string>();
  let session: SupabaseSession | null = null;
  const emailsSent: { email: string; kind: 'otp' | 'change' }[] = [];

  const emit = (event: string) => listeners.forEach((listener) => listener(event, session));
  const take = (method: string): SupabaseFailure | null => {
    const next = failures.get(method) ?? null;
    failures.delete(method);
    return next;
  };
  const identityOf = (user: SupabaseUser, provider: string) =>
    (user.identities ?? []).find((identity) => identity.provider === provider);
  const owner = (provider: string, subject: string) =>
    all.find((user) => identityOf(user, provider)?.identity_data?.email === subject);

  const mint = (anonymous: boolean): SupabaseUser => {
    sequence += 1;
    const user = {
      id: `user-${sequence}`,
      app_metadata: { provider: anonymous ? 'anonymous' : undefined, providers: [] as string[] },
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date(sequence * 1000).toISOString(),
      is_anonymous: anonymous,
      email: undefined,
      identities: [],
    } as unknown as SupabaseUser;
    all.push(user);
    return user;
  };
  const open = (user: SupabaseUser) => {
    sequence += 1;
    session = { access_token: `token-${user.id}-${sequence}`, user } as unknown as SupabaseSession;
    return session;
  };
  const attach = (user: SupabaseUser, provider: string, email: string) => {
    const mutable = user as unknown as {
      identities: { provider: string; identity_data: { email: string }; last_sign_in_at: string }[];
      is_anonymous: boolean;
      email: string;
    };
    sequence += 1;
    mutable.identities = [
      ...mutable.identities.filter((identity) => identity.provider !== provider),
      { provider, identity_data: { email }, last_sign_in_at: new Date(sequence * 1000).toISOString() },
    ];
    mutable.is_anonymous = false;
    mutable.email = email;
    return user;
  };
  const settled = (user: SupabaseUser) => ({
    data: { user, session: open(user) },
    error: null,
  });
  const refused = (error: SupabaseFailure) => ({ data: { user: null, session: null }, error });

  return {
    emailsSent,
    failNext: (method, value) => failures.set(method, value),
    users: () => [...all],
    currentUser: () => session?.user ?? null,
    accessToken: () => session?.access_token ?? null,

    getSession: async () => ({ data: { session }, error: null }),

    signInAnonymously: async () => {
      const result = settled(mint(true));
      emit('SIGNED_IN');
      return result;
    },

    signInWithIdToken: async ({ provider, token }) => {
      const denied = take('signInWithIdToken');
      if (denied) return refused(denied);
      const subject = token.split(':')[1] ?? token;
      const existing = owner(provider, subject);
      const result = settled(attach(existing ?? mint(false), provider, subject));
      emit('SIGNED_IN');
      return result;
    },

    linkIdentity: async ({ provider, token }) => {
      const denied = take('linkIdentity');
      if (denied) return refused(denied);
      const current = session?.user;
      if (!current) return refused(failure('Not signed in', 'not_authenticated'));
      const subject = token.split(':')[1] ?? token;
      const existing = owner(provider, subject);
      if (existing && existing.id !== current.id)
        return refused(failure('Identity is already linked to another user', 'identity_already_exists'));
      const result = settled(attach(current, provider, subject));
      emit('USER_UPDATED');
      return result;
    },

    signInWithOtp: async ({ email }) => {
      const denied = take('signInWithOtp');
      if (denied) return { error: denied };
      emailsSent.push({ email, kind: 'otp' });
      return { error: null };
    },

    updateUser: async ({ email }) => {
      const denied = take('updateUser');
      if (denied) return { error: denied };
      const current = session?.user;
      if (!current) return { error: failure('Not signed in', 'not_authenticated') };
      pendingChange.set(current.id, email);
      emailsSent.push({ email, kind: 'change' });
      return { error: null };
    },

    verifyOtp: async ({ email, token, type }) => {
      if (token !== OTP_CODE) return refused(failure('Token has expired or is invalid', 'otp_expired'));
      if (type === 'email_change') {
        const current = session?.user;
        if (!current || pendingChange.get(current.id) !== email)
          return refused(failure('Token has expired or is invalid', 'otp_expired'));
        pendingChange.delete(current.id);
        const result = settled(attach(current, 'email', email));
        emit('USER_UPDATED');
        return result;
      }
      const result = settled(attach(owner('email', email) ?? mint(false), 'email', email));
      emit('SIGNED_IN');
      return result;
    },

    signOut: async () => {
      // GoTrue clears the local session even when the call is refused, which is what happens once
      // the server has already deleted the user out from under this token.
      const denied = take('signOut');
      session = null;
      emit('SIGNED_OUT');
      return { error: denied };
    },

    onAuthStateChange: (callback) => {
      listeners.push(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const index = listeners.indexOf(callback);
              if (index >= 0) listeners.splice(index, 1);
            },
          },
        },
      };
    },

    startAutoRefresh: async () => {},
    stopAutoRefresh: async () => {},
  };
}

/** A `fetch` stand-in for the VPS account endpoints. */
export function accountServerDouble(status: () => number = () => 200) {
  const calls: { method: string; url: string; authorization: string }[] = [];
  const fetcher = async (url: string, init?: { method?: string; headers?: Record<string, string> }) => {
    calls.push({
      method: init?.method ?? 'GET',
      url,
      authorization: init?.headers?.authorization ?? '',
    });
    const code = status();
    return {
      ok: code >= 200 && code < 300,
      status: code,
      json: async () => (code === 410 ? { code: 'ACCOUNT_DELETED' } : {}),
    } as Response;
  };
  return { fetcher: fetcher as unknown as typeof fetch, calls };
}
