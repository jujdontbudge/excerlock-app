import type { ErrorInfo } from 'react';
import * as Sentry from '@sentry/react-native';

/**
 * The one place a caught error becomes a crash report. `AppErrorBoundary` calls it from
 * `componentDidCatch`, so a render error reaches the recovery screen *and* Sentry.
 *
 * The component stack rides along in the one context key `scrubSentryEvent` keeps: it names
 * components, never data, and without it a scrubbed render error says only that something threw.
 * Reporting is best-effort — a failure here must never turn a recoverable render error into a
 * crash loop.
 */
export function reportError(error: Error, info?: ErrorInfo): void {
  try {
    Sentry.captureException(error, {
      mechanism: { type: 'react-error-boundary', handled: true },
      ...(info?.componentStack
        ? { contexts: { react: { componentStack: info.componentStack } } }
        : {}),
    } as Parameters<typeof Sentry.captureException>[1]);
  } catch {
    // A reporting failure is not worth a second error.
  }
}
