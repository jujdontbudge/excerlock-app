export function reportRuntimeError(error: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
  const { reportSentryError } = require('@sentry-capture') as typeof import('@sentry-capture');
  reportSentryError(error);
}

export function reportRuntimeAlert(kind: 'paid_locked_out' | 'apple_sign_in_failed', error: unknown, code?: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
  const { reportSentryAlert } = require('@sentry-capture') as typeof import('@sentry-capture');
  reportSentryAlert(kind, error, code);
}
