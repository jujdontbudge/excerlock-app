import * as Sentry from "@sentry/node";
import type { ErrorEvent } from "@sentry/node";
import "dotenv/config";

const dsn = process.env.SENTRY_DSN?.trim();

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.request;

  for (const breadcrumb of event.breadcrumbs ?? []) {
    delete breadcrumb.data;
    delete breadcrumb.message;
  }

  return event;
}

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend: scrubSentryEvent,
  });
}

export { Sentry };
