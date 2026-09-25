export function reportRuntimeError(error: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
  const { reportSentryError } = require('@sentry-capture') as typeof import('@sentry-capture');
  reportSentryError(error);
}
