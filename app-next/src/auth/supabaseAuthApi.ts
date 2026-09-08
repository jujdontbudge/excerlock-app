import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';

export type { SupabaseSession, SupabaseUser };

/** Every failure supabase-js reports arrives as a value, not a throw. */
export type SupabaseFailure = { message: string; code?: string; status?: number };
type Result<T> = Promise<{ data: T; error: SupabaseFailure | null }>;
type SessionResult = Result<{ user: SupabaseUser | null; session: SupabaseSession | null }>;

/**
 * The only shape of supabase-js this module depends on. It is deliberately narrower than the SDK:
 * `createSupabaseAuthApi` in `supabaseClient.ts` assigns a real client to it, so a breaking SDK
 * change fails the typecheck there instead of at runtime, and the tests can drive a small double.
 */
export interface SupabaseAuthApi {
  getSession(): Result<{ session: SupabaseSession | null }>;
  signInAnonymously(): SessionResult;
  signInWithIdToken(credentials: { provider: string; token: string; nonce?: string }): SessionResult;
  linkIdentity(credentials: { provider: string; token: string; nonce?: string }): SessionResult;
  signInWithOtp(credentials: {
    email: string;
    options?: { shouldCreateUser?: boolean };
  }): Promise<{ error: SupabaseFailure | null }>;
  updateUser(attributes: { email: string }): Promise<{ error: SupabaseFailure | null }>;
  verifyOtp(params: { email: string; token: string; type: 'email' | 'email_change' }): SessionResult;
  signOut(): Promise<{ error: SupabaseFailure | null }>;
  onAuthStateChange(callback: (event: string, session: SupabaseSession | null) => void): {
    data: { subscription: { unsubscribe(): void } };
  };
  startAutoRefresh(): Promise<void>;
  stopAutoRefresh(): Promise<void>;
}

/** GoTrue's code for "this provider account already belongs to a different user". */
export const IDENTITY_ALREADY_LINKED = 'identity_already_exists';

export function isIdentityAlreadyLinked(failure: SupabaseFailure): boolean {
  return failure.code === IDENTITY_ALREADY_LINKED || /already/i.test(failure.message);
}
