# AnalyticsKit — the app's client emitter

**Contract.** This module is the only place in `app/` that turns an event into a transport call.
It promises: *if it compiles, it is a registered, client-owned event carrying exactly the payload
`@excerlock/analytics-events` declares for it.* It hides: which vendor receives the event, whether
one is configured at all, the D2 super property, and the `$screen` / `identify` / `reset` calls.

**Screens call `track()`. Nothing else calls `capture()`.** `guardrails/single-emitter.test.ts`
allowlists `app/src/analytics/` as the one app path that may hand a *dynamic* event name to
`capture()` — that forward lives in `AnalyticsKit.track()`, one line, and it is the reason the
guardrail can stay strict everywhere else. A screen that reaches past this module for a raw
`capture()` either fails the guardrail (dynamic name outside the allowlist) or fails the
owner-side check (literal name owned by the server or Adapty).

## The type law

`track<E extends ClientEventName>(event, ...props: TrackArgs<E>)`. Both halves come from the
registry, never redeclared here:

- **Name** — `E` is constrained to `ClientEventName`, the registry's *client* partition (D4/D5).
  A server-owned name (`support_request_submitted`), an Adapty-owned name (`trial_started`), an
  unregistered name, or a `string` computed at runtime are all compile errors.
- **Payload** — `PropsOf<E>` exactly: a missing, misspelled, mistyped, or excess property is a
  compile error. Events whose registry props are empty (`sick_day_override_used`,
  `diagnostics_shared`, `data_export_requested`) take no payload argument at all.

`__typechecks__/trackTypeLaw.ts` is the proof: legal calls sit un-annotated, illegal ones sit
behind `@ts-expect-error`, so the file has zero diagnostics **iff** the law holds in both
directions. `__tests__/typeLaw.test.ts` compiles it with the app's own `tsconfig.json` and asserts
that. Loosening the types (an unused directive) or breaking a legal call both fail the suite.

## The sink seam — where PostHog lands in Phase 5

`AnalyticsSink` is five vendor-free methods (`register` · `capture` · `screen` · `identify` ·
`reset`) shaped one-for-one like the PostHog client, so the adapter is a thin forward and nothing
above the seam knows a vendor exists. **PostHog is deliberately not wired and the library is not
installed** — keys arrive with §10.10 provisioning (ARCHITECTURE §6: instrumentation is written in
Phase 2 in no-op mode).

| Sink | Use |
|---|---|
| `noopSink` | the default — instrumentation runs everywhere and goes nowhere, so a missing key is never a crash and never a branch at a call site |
| `createRecordingSink(limit?)` | tests, and the §3.15 debug menu's live event stream — a bounded ring buffer with `signals` / `captured()` / `eventNames()` / `clear()` |
| *(Phase 5)* `postHogSink` | the one file to add here; nothing else in the app changes |

Installing it is one call in the app entry, next to the Sentry import (§10.7):

```ts
// Phase 5 only — this module ships with no vendor dependency today.
analytics.installSink({
  register: (props) => posthog.register(props),
  capture: (event, props) => posthog.capture(event, props),
  screen: (screen, props) => posthog.screen(screen, props),
  identify: (distinctId, props) => posthog.identify(distinctId, props),
  reset: () => posthog.reset(),
});
```

`installSink()` re-registers `SUPER_PROPERTIES` (`{ app: 'excerlock' }`, D2) on whatever it is
given, so the super property holds no matter when the real transport arrives.

## FLOW funnel helpers (PRD §10.5)

`createFlowTracker(kit)` implements the registry's `TrackOnboardingScreen` /
`TrackOnboardingAnswer` signatures: `trackOnboardingScreen(screen)` fires `$screen` then
`onboarding_screen_viewed { screen }`; `trackOnboardingAnswer(screen, value)` fires
`onboarding_answer`. Both take a `FlowScreen` from the imported `FLOW_SCREENS` — the order and the
union live in the registry, and the tests assert the emitted sequence against that constant. They
are called from the onboarding rail's **single central renderer**, never per screen, so a screen
added to `FLOW_SCREENS` is instrumented with zero new code.

## Identity

`identify(distinctId)` is a passthrough only — the Clerk user id, called once at post-purchase
sign-up (D6); the whole onboarding and paywall funnel stays anonymous on `$device_id`. `reset()`
drops it on sign-out. No vendor SDK call, no session bookkeeping, no experiment bucketing here —
flags bucket on `$device_id` and live in the ExperimentRail (§10.6).

## Invariants

- The app never redeclares an event name, a props shape, `FLOW_SCREENS`, or the owner partition —
  everything is imported from `@excerlock/analytics-events`.
- The only dynamic-name `capture()` in `app/` is `AnalyticsKit.track()`.
- The default transport is a no-op; no module here imports a vendor SDK.
- Autocapture and session replay stay off; screens are tracked manually (D11).
- Payloads are ids/enums/numbers/booleans only — free text and health values never leave the
  device (D12, enforced by the registry's props types).

**Current state:** the kit only. Instrumenting the funnel (call sites in screens) is a separate
ticket; there are deliberately none yet.

**Public surface.** `analytics` / `flowTracker` (the app-wide instances), `createAnalyticsKit`,
`createFlowTracker`, `noopSink`, `createRecordingSink`, `SUPER_PROPERTIES`, and the
`AnalyticsSink` / `AnalyticsSignal` / `AnalyticsPayload` / `TrackArgs` types — all from `index.ts`.

**Test command:** `npm run test --workspace app -- analytics`.
