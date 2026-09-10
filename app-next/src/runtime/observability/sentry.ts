import { getOtaObservabilityContext } from '../updates';

export type SentryBuildMetadata = { version: string; build: string; environment: string };
export function sentryRelease(metadata: SentryBuildMetadata) { return `com.johansardar.excerlock@${metadata.version}+${metadata.build}`; }
export function sentryDist(updateId: string | null, runtimeVersion: string | null) { return `${runtimeVersion ?? 'embedded'}-${updateId ?? 'embedded'}`; }
const safeExtra = new Set(['generation', 'duration_ms', 'state', 'reason', 'update_id', 'runtime_version', 'environment']);
export function scrubSentryEvent<T extends Record<string, any>>(event: T): T {
  const ota = getOtaObservabilityContext();
  const extra = Object.fromEntries(Object.entries(event.extra ?? {}).filter(([key, value]) => safeExtra.has(key) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')));
  return { ...event, user: undefined, request: undefined, contexts: undefined, attachments: undefined, breadcrumbs: undefined, extra, tags: { environment: event.tags?.environment, runtime_version: ota.runtime_version ?? 'embedded', update_id: ota.update_id ?? 'embedded' } };
}
export function scrubSentryBreadcrumb<T extends Record<string, any>>(breadcrumb: T): T | null {
  if (!['lock', 'watchdog', 'ota'].includes(String(breadcrumb.category))) return null;
  return { category: breadcrumb.category, level: breadcrumb.level, data: Object.fromEntries(Object.entries(breadcrumb.data ?? {}).filter(([key, value]) => safeExtra.has(key) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'))) } as unknown as T;
}
export function buildSentryOptions(dsn: string | undefined, metadata: SentryBuildMetadata) {
  if (!dsn) return null;
  const ota = getOtaObservabilityContext();
  return { dsn, environment: metadata.environment, release: sentryRelease(metadata), dist: sentryDist(ota.update_id, ota.runtime_version), sendDefaultPii: false, attachScreenshot: false, attachViewHierarchy: false, enableAutoPerformanceTracing: false, enableAppStartTracking: false, enableAutoSessionTracking: false, enableCaptureFailedRequests: false, enableNativeCrashHandling: true, enableNativeFramesTracking: false, enableStallTracking: false, enableUserInteractionTracing: false, tracesSampleRate: 0, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0, beforeSend: scrubSentryEvent, beforeBreadcrumb: scrubSentryBreadcrumb };
}

let initialized = false;
export function initializeSentryOnce(
  init: (options: NonNullable<ReturnType<typeof buildSentryOptions>>) => void,
  dsn: string | undefined,
  metadata: SentryBuildMetadata,
): boolean {
  if (initialized) return false;
  const options = buildSentryOptions(dsn, metadata);
  if (!options) return false;
  init(options);
  initialized = true;
  return true;
}

/** Test-only reset; runtime composition must never call this. */
export function resetSentryInitializationForTests() { initialized = false; }
