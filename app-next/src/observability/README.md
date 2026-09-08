# observability

Crash reporting. Sentry only, project `excerlock-mobile` in org `edge-ix`.

## Where it starts

`app-next/index.ts` is the app entry (`package.json` `main`), and it initialises Sentry *before* it
requires `expo-router/entry`. That order is the point: a throw while a module evaluates happens
before any React boundary exists, and those are the failures worth reporting most. The guardrail
`guardrails/client-observability.test.ts` holds the order, the plugin position and the metro config.

## What it collects

`buildSentryOptions` turns everything off except native and JavaScript crash handling: no
performance tracing, no session replay, no screenshots, no view hierarchy, no failed-request
capture, no default PII. A stack trace is what a crash report is for.

`scrubSentryEvent` then runs on every event on its way out. ExcerLock writes its own error messages,
but not the values interpolated into them: a gym name, a saved address, a file path or an app
selection can all end up inside an exception message, a breadcrumb or a captured local. So the shape
is kept and the content is dropped — user, request, message, extra, tags, transaction, fingerprint,
breadcrumb data, exception values, and every frame's source context and variables.

The one thing kept is the React component stack, which names components and nothing else. Without it
a scrubbed render error says only that something threw.

## Where errors come in

- `AppErrorBoundary` (`features/launch`) catches a render error below the runtime provider and calls
  `reportError` from `componentDidCatch`.
- `RouteErrorBoundary`, which `app/_layout.tsx` exports as Expo Router's `ErrorBoundary`, reports too
  — router-level errors never reach the root boundary.

`reportError` marks the report handled, so a caught render error is not counted as a crash, and it
swallows its own failures: a reporting problem must never turn a recoverable error into a loop.

## Keys

`SENTRY_DSN_MOBILE` lives in `~/.excerlock/env` (or the EAS environment) and reaches the app through
`app.config.ts` → `expo.extra.clientObservability`. Without it `buildSentryOptions` returns `null`
and Sentry is simply not initialised. Uploading source maps additionally needs `SENTRY_AUTH_TOKEN` in
the build environment; without it the build still succeeds and stack traces stay minified.
