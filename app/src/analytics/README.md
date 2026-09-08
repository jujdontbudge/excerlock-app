# AnalyticsKit — explicit client analytics

Contract: this module is the app's only analytics emitter. It accepts only client-owned names and
payloads from `@excerlock/analytics-events`, applies that registry's transmission allowlist at the
final boundary, and forwards to an installed sink. It hides the PostHog SDK, boot-time configuration,
super properties, identity calls, and the no-op behavior used when configuration is absent.
Its `flush()` boundary is awaited before account deletion so identified events reach PostHog before
the server queues erasure; `reset()` then clears the deleted identity after success. If a restored
Clerk session discovers that server erasure already completed, `discardPending()` durably removes
the SDK queues without sending them before reset, preventing stale events from recreating the user.

PostHog is initialized once from `app/index.ts`. `postHogSink.ts` fixes the SDK policy: app lifecycle
capture, UI autocapture, exception autocapture, surveys, GeoIP, heatmaps/session replay, and retries
are off. Product analytics use explicit `analytics.track(...)` calls only. Screen tracking accepts
only the fixed `LegacyFlowScreen` registry, preventing UI labels such as condition or gym names
from becoming `$screen_name` values. That union is the retired seven-screen rail this app renders;
`@excerlock/analytics-events` keeps it in `src/legacy.ts` for this workspace alone, and the shipping
`FlowScreen` union belongs to `app-next`. Both go when P2-T12 deletes `app/`.

The canonical event entry declares `owner` and `transmittedProperties`. TypeScript rejects wrong
names and payloads, while `privacyPolicy.ts` drops undeclared keys from JavaScript or adapter calls.
Health, motion, location, workout metrics, balances, and screen-time answers therefore remain on
device. `onboarding_answer` records the fixed funnel screen only; its answer argument is consumed by
the local rail and is never placed in the event payload.

`postHogRuntime.ts` keeps the anonymous `$device_id`, waits for SDK readiness, and reloads flags
before the experiment rail reads them. Missing or blank configuration leaves the existing no-op sink
installed, so analytics cannot crash app startup.

Fixtures:

- `__tests__/AnalyticsKit.test.ts` — ownership, transport privacy, arbitrary screen-label rejection.
- `__tests__/postHogSink.test.ts` — explicit-only SDK options and adapter behavior.
- `__tests__/postHogRuntime.test.ts` — configuration and `$device_id` flag priming.
- `__tests__/flowTracker.test.ts` — centralized funnel sequence and value-free answers.
- `__typechecks__/trackTypeLaw.ts` — compile-time event/payload law.

Public surface: `analytics`, `flowTracker`, kit/sink factories and types, recording/no-op sinks,
PostHog option/adapter/runtime helpers, and `SUPER_PROPERTIES`, all through `index.ts`.

Test command: `cd app && npx jest src/analytics --runInBand`.
