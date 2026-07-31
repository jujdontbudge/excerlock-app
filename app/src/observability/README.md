# Client observability

This module owns app crash initialization and the privacy boundary applied to
every Sentry event. `scrubSentryEvent` removes user/request/custom context and
breadcrumb content before transmission. The app entry file is the only caller
of `Sentry.init`, and its Sentry package import must remain the first import.

PostHog analytics and experiment delivery live in `src/analytics` and
`src/experiments`; Sentry never doubles as an analytics emitter.
