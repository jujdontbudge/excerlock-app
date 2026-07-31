import type { ErrorEvent, ReactNativeOptions } from "@sentry/react-native";

export function buildSentryOptions(dsn: string | undefined): ReactNativeOptions | null {
  const configuredDsn = dsn?.trim();
  if (!configuredDsn) {
    return null;
  }
  return {
    dsn: configuredDsn,
    attachScreenshot: false,
    attachThreads: false,
    attachViewHierarchy: false,
    beforeSend: scrubSentryEvent,
    enableAppStartTracking: false,
    enableAutoPerformanceTracing: false,
    enableAutoSessionTracking: false,
    enableCaptureFailedRequests: false,
    enableNativeCrashHandling: true,
    enableNativeFramesTracking: false,
    enableStallTracking: false,
    enableUserInteractionTracing: false,
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  };
}

/** Client-side equivalent of the server scrub, tightened for device-local data. */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.request;
  delete event.message;
  delete event.extra;
  delete event.contexts;
  delete event.tags;
  delete event.transaction;
  delete event.fingerprint;

  for (const breadcrumb of event.breadcrumbs ?? []) {
    delete breadcrumb.data;
    delete breadcrumb.message;
  }

  return event;
}
