import { getOtaObservabilityContext } from '../../updates/updates';

export type SentryBuildMetadata = { version: string; build: string; environment: string };
export function sentryRelease(metadata: SentryBuildMetadata) { return `com.johansardar.excerlock@${metadata.version}+${metadata.build}`; }
export function sentryDist(updateId: string | null, runtimeVersion: string | null) { return `${runtimeVersion ?? 'embedded'}-${updateId ?? 'embedded'}`; }
const safeExtra = new Set(['generation', 'duration_ms', 'state', 'reason', 'update_id', 'runtime_version', 'environment']);
function safeDiagnosticValue(value: unknown): value is string | number | boolean {
  return typeof value === 'number' || typeof value === 'boolean' ||
    (typeof value === 'string' && /^[a-z0-9_.:+-]{1,128}$/i.test(value));
}
function scrubStacktrace(stacktrace: any) {
  if (!stacktrace?.frames || !Array.isArray(stacktrace.frames)) return undefined;
  const safeText = (value: unknown) => typeof value === 'string' && /^[a-z0-9_./:@~+\-]{1,256}$/i.test(value) ? value : undefined;
  return { frames: stacktrace.frames.map((frame: Record<string, unknown>) => ({
    filename: safeText(frame.filename), abs_path: safeText(frame.abs_path), module: safeText(frame.module), function: safeText(frame.function),
    lineno: typeof frame.lineno === 'number' ? frame.lineno : undefined, colno: typeof frame.colno === 'number' ? frame.colno : undefined,
    instruction_addr: safeText(frame.instruction_addr), package: safeText(frame.package), platform: safeText(frame.platform),
    in_app: typeof frame.in_app === 'boolean' ? frame.in_app : undefined,
  })) };
}
function scrubExceptionValue(exception: Record<string, unknown>): string {
  const mechanism = exception.mechanism as { synthetic?: unknown } | undefined;
  if (typeof exception.value === 'string' && mechanism?.synthetic !== true) return exception.value;
  return '[redacted]';
}
export function scrubSentryEvent<T extends Record<string, any>>(event: T): T {
  const ota = getOtaObservabilityContext();
  const extra = Object.fromEntries(Object.entries(event.extra ?? {}).filter(([key, value]) => safeExtra.has(key) && safeDiagnosticValue(value)));
  const exception = event.exception?.values ? { values: event.exception.values.map((value: Record<string, unknown>) => ({
    type: typeof value.type === 'string' && /^[a-z0-9_.:$-]{1,128}$/i.test(value.type) ? value.type : 'Error',
    value: scrubExceptionValue(value),
    stacktrace: scrubStacktrace(value.stacktrace),
  })) } : undefined;
  const threads = event.threads?.values ? { values: event.threads.values.map((thread: Record<string, unknown>) => ({
    id: typeof thread.id === 'number' || typeof thread.id === 'string' ? thread.id : undefined,
    current: typeof thread.current === 'boolean' ? thread.current : undefined,
    crashed: typeof thread.crashed === 'boolean' ? thread.crashed : undefined,
    stacktrace: scrubStacktrace(thread.stacktrace),
  })) } : undefined;
  return { ...event, message: undefined, logentry: undefined, transaction: undefined, culprit: undefined, server_name: undefined, logger: undefined, fingerprint: undefined, user: undefined, request: undefined, contexts: undefined, attachments: undefined, breadcrumbs: undefined, exception, threads, extra, tags: { environment: event.tags?.environment, runtime_version: ota.runtime_version ?? 'embedded', update_id: ota.update_id ?? 'embedded' } };
}
export function scrubSentryBreadcrumb<T extends Record<string, any>>(breadcrumb: T): T | null {
  if (!['lock', 'watchdog', 'ota'].includes(String(breadcrumb.category))) return null;
  return { category: breadcrumb.category, level: breadcrumb.level, data: Object.fromEntries(Object.entries(breadcrumb.data ?? {}).filter(([key, value]) => safeExtra.has(key) && safeDiagnosticValue(value))) } as unknown as T;
}
export function buildSentryOptions(dsn: string | undefined, metadata: SentryBuildMetadata) {
  if (!dsn) return null;
  const ota = getOtaObservabilityContext();
  return { dsn, environment: metadata.environment, release: sentryRelease(metadata), dist: sentryDist(ota.update_id, ota.runtime_version), sendDefaultPii: false, attachScreenshot: false, attachViewHierarchy: false, enableAutoPerformanceTracing: false, enableAppStartTracking: false, enableAutoSessionTracking: false, enableCaptureFailedRequests: false, enableNativeCrashHandling: true, enableNativeFramesTracking: false, enableStallTracking: false, enableUserInteractionTracing: false, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0, beforeSend: scrubSentryEvent, beforeBreadcrumb: scrubSentryBreadcrumb };
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

export function resetSentryInitializationForTests() { initialized = false; }
