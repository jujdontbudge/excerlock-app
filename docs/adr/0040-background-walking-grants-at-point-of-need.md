---
status: accepted
date: 2026-09-18
---

# 0040: Background walking asks for its grants on Home and reports every shield move

## Decision

Hands-free unlock needs two grants the app never asked for: Motion & Fitness (Core Motion) and Location **Always** (the lock-window keep-alive from ADR 0036). Instead of restoring a setup step, the Home walking card asks for both at the point of need and the enforcement host reports every shield transition it applies:

- `backgroundWalkingReadiness(permissions)` (`app-next/src/domain/backgroundWalking.ts`) is the single rule: `ready` only with `motion: granted` **and** `location: always`; `ask` while anything is merely unasked or While Using; `settings` once anything is denied or restricted.
- `useBackgroundWalkingSetup` drives the walking card: in `ask` it shows "Turn on background walking", which runs `runtime.steps.request()` then `runtime.gym.requestBackgroundLocation()` for whatever is missing and emits `permission_resolved` for each; anything still missing after one attempt (iOS shows the Always upgrade prompt only once) and every `settings` case shows "Open Settings". Both real requests already patch `permissionsStore` and run a full reconcile, which starts Core Motion and, inside an active window, the keep-alive.
- The location purpose strings in `app-next/config/native.ts` now say what Always is for: keeping walk detection and gym auto-detect running while the app is closed. The While Using string drops the "Walk Session" claim.
- `enforcementTransitionEvents(previous, next, context)` (`app-next/src/runtime/enforcement/enforcementAnalytics.ts`) turns two applied policies into `unlock_completed` (`method`), `shields_lifted` (`reason`) and `shields_applied` (`cause`), each carrying `app_state` (iOS `AppState` at apply time) and `source` (the wake that ran the reconcile). `createRealRuntime` emits them only after `EnforcementHost.reconcile` returns `applied` for the same revision — the host is the sole native shield writer, so this is the one place that knows a lock or unlock actually landed and whether ExcerLock was closed at the time.

Keep-alive scope, detection thresholds, reducers and the watchdog are unchanged.

## Context

The captain walked with ExcerLock backgrounded, then opened a locked canary app: still shielded. Opening ExcerLock while standing still then unlocked everything. Root cause, established from code and the PostHog timeline of the reporting user:

- Commit 3056cab3 removed the Screen Time / motion / location setup screens; `setupSteps` is `X3 (gym only) → X4 → X5`, so a walking-only user finishes setup with `motion` and `location` both `notDetermined`. Motion was only requested implicitly by "Check walking"; Always location was never requested anywhere in the walking flow (issue #140).
- `AwakeSession.reconcile` starts the keep-alive only at `authorizedAlways`. Without it iOS suspends ExcerLock seconds after backgrounding, live Core Motion delivery stops, `reduceWalking` never sees the walk, and the JS host — the only code that ever unshields for walking (native callbacks only `apply(true)` at watchdog/window start and `apply(false)` at window end) — never runs. The canary stays shielded until ExcerLock is opened, by which time the user is standing still.
- None of `permission_resolved`, `unlock_completed`, `shields_applied` or `shields_lifted` had an emitter, so the timeline could not show whether any lock or unlock ever happened outside the app.

Alternatives considered:

- Restoring a permission step in setup was rejected: 3056cab3 dropped those screens deliberately, and a setup prompt would ask gym-only users for Always they do not need. Point of need keeps the ask on the card whose promise depends on it.
- Requesting Always at cold start or from `detection.start` was rejected: Apple shows the Always upgrade once, and a prompt with no visible reason is exactly what got the earlier strings called dishonest (#140).
- Widening the keep-alive beyond the lock window (so a window that begins while the app is already suspended still gets residency) was deferred: ADR 0036 scoped residency to the window on battery grounds, and this change ships without the phone proof that decision asked for. See Consequences.
- Reporting shield moves from `EnforcementHost` itself was rejected: the host has no analytics dependency and no notion of app state or wake source; the runtime already owns both.

## Consequences

- A walking-only user sees the card explain that background walking is off and can turn it on in one tap; after the grant, backgrounding ExcerLock during a lock window keeps it resident, and a pocket walk lifts the shields without opening the app. Tests: `src/domain/__tests__/backgroundWalking.test.ts`, `src/features/home/__tests__/background-walking.test.tsx`, `src/runtime/__tests__/enforcementAnalytics.test.ts`, the pocket-walk case in `src/runtime/__tests__/createRealRuntime.test.ts`, and the registry props pin in `packages/analytics-events/__tests__/registry.test.ts`.
- PostHog can now answer "did the shields move with the app closed?": `unlock_completed`/`shields_lifted` with `app_state: background` and `source: manual` is the committed-walk path; `shields_applied` with `cause: relock` is the walk ending. A fresh JS context reports shields it finds up as `cause: boot` and relief it finds live, but an ordinary open day is silent.
- Known gap, unchanged: the keep-alive stops at window end, so ExcerLock is suspended when the next window starts unless the user opens it (or a geofence relaunch runs). The DeviceActivity watchdog still shields natively, but a pocket walk during such a window cannot unshield until the app is opened once. Force-quit can never be covered on iOS. Widening residency is a product/battery call for a follow-up ADR with the ADR 0036 phone proof (issue #143).
- Secondary, unverified: opening the app right after a walk can qualify the walk from Core Motion's redelivered "current" activity or from a first `currentCadence` sample that carries the last walk's rate (the adapter documents 8–30 s of carried cadence; the first sample has no accrual baseline). That would read as "standing still unlocked everything" for the qualify + silence + grace span. ADR 0012 forbids retuning those measured thresholds without fixtures, so this ships as a documented hypothesis, not a change (issue #144).
- `app-next/src/demo/fakes/GymFake.ts` now models iOS for `requestBackgroundLocation`: a granted upgrade becomes `always`, a refused upgrade keeps While Using, a refused first ask is `denied`.

## References

- Issue #140 — walking setup never requests the Always Location permission required by its background keep-alive (addressed here).
- Issue #143 — keep-alive cannot arm for a window that starts while ExcerLock is suspended (open gap).
- Issue #144 — standing-still unlock right after a walk (unverified hypothesis).
- [`app-next/src/domain/backgroundWalking.ts`](../../app-next/src/domain/backgroundWalking.ts), [`app-next/src/features/home/useBackgroundWalkingSetup.ts`](../../app-next/src/features/home/useBackgroundWalkingSetup.ts), [`app-next/src/features/home/HomeScreen.tsx`](../../app-next/src/features/home/HomeScreen.tsx).
- [`app-next/src/runtime/enforcement/enforcementAnalytics.ts`](../../app-next/src/runtime/enforcement/enforcementAnalytics.ts), [`app-next/src/runtime/createRealRuntime.ts`](../../app-next/src/runtime/createRealRuntime.ts), [`packages/analytics-events/src/events/shield.ts`](../../packages/analytics-events/src/events/shield.ts), [`packages/analytics-events/README.md`](../../packages/analytics-events/README.md).
- [`app-next/src/runtime/detection/AwakeSession.ts`](../../app-next/src/runtime/detection/AwakeSession.ts), [`app-next/config/native.ts`](../../app-next/config/native.ts).
- Related ADRs: [0036](0036-walk-keep-alive-no-background-indicator.md) (accepted; keep-alive options and window scope), [0012](0012-persisted-detection-and-conditional-watchdog.md) (accepted; persisted detection, watchdog, measured thresholds).
