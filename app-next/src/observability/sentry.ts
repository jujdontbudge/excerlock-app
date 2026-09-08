import type { ErrorEvent, ReactNativeOptions } from '@sentry/react-native';

/**
 * Crash reporting only, with everything that could carry a gym, a location, a locked app or a
 * health value switched off. Performance tracing, replay, screenshots and view hierarchies are all
 * disabled: a stack trace is what a crash report is for.
 *
 * Returns `null` when no DSN is configured, so a local build simply does not initialise Sentry.
 */
export function buildSentryOptions(dsn: string | undefined): ReactNativeOptions | null {
  const configuredDsn = dsn?.trim();
  if (!configuredDsn) return null;
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

/**
 * The payload scrub, applied to every event before it leaves the device.
 *
 * ExcerLock's error messages are written by the app, but the values interpolated into them are
 * not: a gym name, a saved address, a file path or an app selection can all end up inside an
 * exception message, a breadcrumb or a local variable. So the shape is kept and the content is
 * dropped — type, module, and frames are enough to find the bug.
 *
 * The one exception is the React component stack, which names components and nothing else. It is
 * what turns a scrubbed render error from "something threw" into "this screen threw".
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.request;
  delete event.message;
  delete event.extra;
  event.contexts = componentStackOnly(event.contexts);
  delete event.tags;
  delete event.transaction;
  delete event.fingerprint;

  for (const breadcrumb of event.breadcrumbs ?? []) {
    delete breadcrumb.data;
    delete breadcrumb.message;
  }

  for (const exception of event.exception?.values ?? []) {
    delete exception.value;
    if (exception.mechanism) delete exception.mechanism.data;
    for (const frame of exception.stacktrace?.frames ?? []) {
      delete frame.context_line;
      delete frame.pre_context;
      delete frame.post_context;
      delete frame.vars;
    }
  }

  return event;
}

function componentStackOnly(contexts: ErrorEvent['contexts']): ErrorEvent['contexts'] {
  const componentStack = contexts?.react?.componentStack;
  return typeof componentStack === 'string' ? { react: { componentStack } } : undefined;
}
