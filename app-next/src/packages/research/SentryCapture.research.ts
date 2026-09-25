export function reportSentryError(error: unknown): void {
  if (__DEV__) console.error(error);
}
