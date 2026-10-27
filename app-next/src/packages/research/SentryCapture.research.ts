export type AlertKind = 'paid_locked_out' | 'apple_sign_in_failed';

export function reportSentryError(error: unknown): void {
  if (__DEV__) console.error(error);
}

export function reportSentryAlert(_kind: AlertKind, error: unknown, _code = 'none'): void {
  if (__DEV__) console.error(error);
}
