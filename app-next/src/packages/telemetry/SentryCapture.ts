import { captureException } from '@sentry/react-native';

export type AlertKind = 'paid_locked_out' | 'apple_sign_in_failed';

export function reportSentryError(error: unknown): void {
  captureException(error);
}

export function reportSentryAlert(kind: AlertKind, error: unknown, code = 'none'): void {
  captureException(error, { level: 'error', tags: { alert: kind, alert_code: code }, fingerprint: ['alert', kind, code] });
}
