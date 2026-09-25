import { AuthError } from '../../ports/AuthPort';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export type EmailFlowKind = 'conversion' | 'recovery';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized)) {
    throw new AuthError('Enter a valid email address.', { code: 'EMAIL_INVALID' });
  }
  return normalized;
}

export function normalizeOtpCode(code: string): string {
  return code.replace(/\D/g, '').slice(0, 6);
}

export function validateOtpCode(code: string): string {
  const normalized = normalizeOtpCode(code);
  if (normalized.length !== 6) {
    throw new AuthError('That code did not work. Please try again.', { code: 'OTP_INVALID' });
  }
  return normalized;
}

export function isExistingAccountError(error: unknown): boolean {
  const message = ((error as { message?: unknown })?.message ?? '').toString().toLowerCase();
  const code = ((error as { code?: unknown })?.code ?? '').toString().toLowerCase();
  return (
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('already linked') ||
    message.includes('identity_already_exists') ||
    message.includes('email_exists') ||
    message.includes('user already registered') ||
    code.includes('email_exists') ||
    code.includes('identity_already_exists')
  );
}

export function isLinkConflictError(error: unknown): boolean {
  const message = ((error as { message?: unknown })?.message ?? '').toString().toLowerCase();
  const code = ((error as { code?: unknown })?.code ?? '').toString().toLowerCase();
  const status = (error as { status?: unknown })?.status;
  return (
    isExistingAccountError(error) ||
    message.includes('already') ||
    message.includes('linked to another') ||
    message.includes('identity is already') ||
    code.includes('conflict') ||
    status === 422 ||
    status === 409
  );
}
