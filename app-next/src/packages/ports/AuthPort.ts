import { Session } from '../model/types';
import { Unsubscribe } from '../model/models';

export type AuthIdentityKind = 'canonical' | 'provisional' | 'deleting';
export type AuthIdentity = {
  readonly kind: AuthIdentityKind;
  readonly userId: string | null;
  readonly isAnonymous: boolean;
  readonly generation: number;
  readonly ready: boolean;
};

export const AUTH_CANCELLED_CODE = 'ERR_REQUEST_CANCELED';
export class AuthCancelledError extends Error {
  readonly code = AUTH_CANCELLED_CODE;
  constructor(message = 'Sign-in was canceled') {
    super(message);
    this.name = 'AuthCancelledError';
  }
}

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
  identity(): AuthIdentity;
  signInWithApple(): Promise<Session>;
  signInWithGoogle(): Promise<Session>;
  linkWithApple(): Promise<Session>;
  linkWithGoogle(): Promise<Session>;
  recoverWithApple(): Promise<Session>;
  recoverWithGoogle(): Promise<Session>;
  sendEmailCode(email: string): Promise<void>;
  verifyEmailCode(code: string): Promise<Session>;
  recoverWithEmailCode(code: string): Promise<Session>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  boot(): Promise<AuthIdentity>;
  dispose(): void;
  subscribe(callback: (session: Session) => void): Unsubscribe;
  subscribeIdentity(callback: (identity: AuthIdentity) => void): Unsubscribe;
  waitForCanonicalIdentity(options?: { timeoutMs?: number }): Promise<AuthIdentity>;
}
