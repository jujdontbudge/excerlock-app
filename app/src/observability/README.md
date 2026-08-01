# Client observability

Contract: this module owns mobile Sentry configuration and the privacy boundary applied to every
crash event. It hides the vendor option shape and runtime config lookup. `app/index.ts` is the only
caller of `Sentry.init`, and its Sentry package import must remain the first import.

`scrubSentryEvent` removes user, request, message, custom context, tags, transaction/fingerprint,
breadcrumb content, exception messages, mechanism data, and stack-frame variables/source context.
Replay, screenshots, view hierarchy, failed-request capture, sessions, interactions, and performance
tracing remain off; native crash handling stays on. Source-map integration is configured by the
Sentry Expo plugin and Metro wrapper, with the auth token stored as a sensitive EAS environment value.

Fixtures: `__tests__/sentry.test.ts` covers options plus top-level, breadcrumb, exception, and frame
scrubbing. `__tests__/runtimeConfig.test.ts` covers public runtime configuration.

Public surface: `buildSentryOptions`, `scrubSentryEvent`, `readClientObservabilityConfig`, and its
config type through `index.ts`.

Test command: `cd app && npx jest src/observability --runInBand`.
