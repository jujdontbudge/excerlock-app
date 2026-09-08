import Constants from 'expo-constants';

export type ClientObservabilityConfig = {
  posthogApiKey: string | undefined;
  posthogHost: string | undefined;
  sentryDsn: string | undefined;
};

/**
 * Reads the three vendor keys `app.config.ts` copies out of `~/.excerlock/env` (or the EAS
 * environment) into `expo.extra.clientObservability`. Nothing is committed; a build without the
 * dotfile simply has no keys, and both adapters return `null` rather than throwing.
 */
export function readClientObservabilityConfig(
  extra: unknown = Constants.expoConfig?.extra,
): ClientObservabilityConfig {
  const observability = asRecord(asRecord(extra)?.clientObservability);
  return {
    posthogApiKey: text(observability?.posthogApiKey),
    posthogHost: text(observability?.posthogHost),
    sentryDsn: text(observability?.sentryDsn),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
