import { Session } from '../domain/types';
import { Unsubscribe } from './models';

/**
 * Canonical vs provisional vs deleting identity snapshot.
 *
 * Non-secret by design: contains only the Supabase user id (canonical UID),
 * anonymity flag, generation counter and readiness. Never contains access,
 * refresh or provider tokens. Tokens live only in the SecureStore-backed
 * Supabase session (see runtime/auth/secureStorage.ts).
 *
 * - canonical: a Supabase session exists (anonymous or permanent). userId is
 *   the Supabase UID. ready indicates whether the awaited identity spine
 *   (PUT /v1/user -> PostHog identify -> Adapty activate/identify ->
 *   integration attachment) has completed for this generation.
 * - provisional: no Supabase session yet (boot timed out, offline, or secure
 *   hydration pending). userId is null. UI is usable but purchases, restores
 *   and person-bound exposures must wait for canonical + ready.
 * - deleting: an authenticated durable DELETE /v1/user is in flight.
 *   Retries keep auth; only server 204 completes local cleanup.
 */
export type AuthIdentityKind = 'canonical' | 'provisional' | 'deleting';
export type AuthIdentity = {
  readonly kind: AuthIdentityKind;
  readonly userId: string | null;
  readonly isAnonymous: boolean;
  readonly generation: number;
  readonly ready: boolean;
};

/** Apple sheet dismissal. Must be caught separately and shown as a retryable cancel, never a silent no-op. */
export const AUTH_CANCELLED_CODE = 'ERR_REQUEST_CANCELED';
export class AuthCancelledError extends Error {
  readonly code = AUTH_CANCELLED_CODE;
  constructor(message = 'Sign-in was canceled') {
    super(message);
    this.name = 'AuthCancelledError';
  }
}

/** Any non-cancellation auth failure. Always surfaced with a visible retry; never silent. */
export class AuthError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  constructor(message: string, options?: { code?: string; retryable?: boolean }) {
    super(message);
    this.name = 'AuthError';
    this.code = options?.code ?? 'AUTH_FAILED';
    this.retryable = options?.retryable ?? true;
  }
}

/**
 * The provider identity is already owned by a different Supabase user.
 * Callers must NOT adopt an arbitrary source UID or pretend a client-only
 * merge exists. The supported path is returning-account recovery via
 * signInWithIdToken (Apple/Google) or signInWithOtp + verifyOtp type email
 * (email), adopting the server-verified existing canonical UID, preserving
 * local rules, without aliasing analytics people or transferring paid
 * ownership. Server-authorized migration (claim ticket) lives in the server
 * lane; see runtime/auth/README.md.
 */
export class AuthRecoveryRequiredError extends AuthError {
  readonly provider: 'apple' | 'google' | 'email';
  constructor(provider: 'apple' | 'google' | 'email', message?: string) {
    super(
      message ??
        (provider === 'email'
          ? 'This email is already registered. We sent a sign-in code to recover that account.'
          : 'This account is already linked to a different ExcerLock user. Recover that account instead.'),
      { code: 'AUTH_RECOVERY_REQUIRED', retryable: true },
    );
    this.name = 'AuthRecoveryRequiredError';
    this.provider = provider;
  }
}

/**
 * The authenticated DELETE may have succeeded on the server but the response
 * was lost (network drop after provider deletion). Completion depends on the
 * server durable worker, not on the invalidated refresh token. Callers must
 * report pending state, not false completion, and retry with retained auth
 * when possible. 502/503 is never success.
 */
export class AuthPendingDeletionError extends AuthError {
  constructor(message = 'Deletion is pending. Please retry; your sign-in is kept until the server confirms.') {
    super(message, { code: 'AUTH_DELETION_PENDING', retryable: true });
    this.name = 'AuthPendingDeletionError';
  }
}

export function isAuthCancelled(error: unknown): error is AuthCancelledError {
  if (error instanceof AuthCancelledError) return true;
  const code = (error as { code?: unknown } | null)?.code;
  return code === AUTH_CANCELLED_CODE;
}

export function isAuthRecoveryRequired(error: unknown): error is AuthRecoveryRequiredError {
  return error instanceof AuthRecoveryRequiredError;
}

export interface AuthPort {
  session(): Session;
  /** Non-secret canonical/provisional/deleting snapshot. */
  identity(): AuthIdentity;
  signInWithApple(): Promise<Session>;
  signInWithGoogle(): Promise<Session>;
  /** Explicit returning-account recovery via a fresh native credential. Adopts the server-verified existing UID. */
  recoverWithApple(): Promise<Session>;
  recoverWithGoogle(): Promise<Session>;
  sendEmailCode(email: string): Promise<void>;
  verifyEmailCode(code: string): Promise<Session>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  /** Single-flight boot: hydrates secure session, then one anonymous sign-in. 5s UI fallback never starts a second request. */
  boot(): Promise<AuthIdentity>;
  dispose(): void;
  subscribe(callback: (session: Session) => void): Unsubscribe;
  subscribeIdentity(callback: (identity: AuthIdentity) => void): Unsubscribe;
  /**
   * Resolves when a canonical Supabase UID is available for the current
   * generation. Bounded visible retry: rejects with AuthError on timeout so
   * callers show retry instead of hanging. Stale generations never resolve.
   */
  waitForCanonicalIdentity(options?: { timeoutMs?: number }): Promise<AuthIdentity>;
}
