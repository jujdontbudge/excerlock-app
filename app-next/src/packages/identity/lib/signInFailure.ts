import type { SignInFailureClass } from '@excerlock/analytics-events';
import { AuthError, isAuthRecoveryRequired } from '../../ports/AuthPort';

export function signInFailureClass(error: unknown): SignInFailureClass {
  if (isAuthRecoveryRequired(error)) return 'existing_account';
  const code = error instanceof AuthError ? error.code : '';
  if (code === 'REAUTH_DIFFERENT_ACCOUNT') return 'different_account';
  if (code === 'EMAIL_NO_ACCOUNT') return 'no_account';
  if (code === 'EMAIL_RATE_LIMITED') return 'rate_limited';
  if (/^(APPLE|GOOGLE)_/.test(code)) return 'provider';
  if (/^(OTP|EMAIL)_/.test(code)) return 'code';
  if (/^(REAUTH|IDENTITY|STALE|LINK|RECOVERY|STORAGE)_/.test(code)) return 'session';
  return 'unknown';
}

export const expectedSignInFailure = (reason: SignInFailureClass) =>
  reason === 'existing_account' || reason === 'different_account' || reason === 'code' || reason === 'no_account' || reason === 'rate_limited';
