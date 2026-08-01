export interface ClientObservabilityConfig {
  posthogApiKey: string | undefined;
  posthogHost: string | undefined;
  sentryDsn: string | undefined;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function readClientObservabilityConfig(
  extra: unknown,
): ClientObservabilityConfig {
  const observability = record(record(extra)?.clientObservability);
  return {
    posthogApiKey: optionalString(observability?.posthogApiKey),
    posthogHost: optionalString(observability?.posthogHost),
    sentryDsn: optionalString(observability?.sentryDsn),
  };
}
