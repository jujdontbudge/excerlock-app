import type { ErrorEvent } from "@sentry/react-native";

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
