# runtime

Composition boundary that supplies ports to features, and the one place that enforces. Everything here
lives above every route guard, so it keeps running while the user is still in onboarding, on the paywall,
or in the post-purchase setup sequence, and it survives every tab unmount.

`devFlag.ts` is the single release-hygiene gate for developer-only routes and runtime controls. It is enabled
only by `__DEV__` or an explicit `EXPO_PUBLIC_DEV_MENU=1` build environment value.

`requestFailureMessage` centralizes offline-first error selection for network-backed screens and falls back to
the ordinary error when reachability itself cannot be determined.

## Mount order

`AppRuntimeProvider` creates the runtime and mounts, in this order:

1. **`AppErrorBoundary`** (`features/launch`) — a root render boundary. A throw anywhere below it renders
   the recovery screen instead of a blank window, and `onError` is where P2-T07 wires Sentry. `tryRule`
   keeps an unexpected rule draft from throwing during render in the first place.
2. **`startIdentityBridge`** — follows the session and binds its user id to the subscription and analytics
   ports. `domain/identity` owns the order: identify runs subscription-first so an entitlement fetch is
   already scoped before the first attributed event, and every session carries a user id, so the anonymous
   one at first launch identifies both SDKs too. The matching teardown, `teardownIdentity`, resets
   subscription then analytics and releases the auth provider last; Account calls it on sign-out and deletion.
3. **`bindHaptics`** — applies the Touch feedback preference to the haptics module, so a rehydrated
   `haptics: false` is in force before the first screen renders.
4. **`startEnforcement`** — the enforcement host below.

The three bindings are started in that order inside one effect and stopped in reverse.
`app/locked-apps.tsx` is registered outside every `Stack.Protected` so the shield notification's deep
link always resolves; `lockedAppsDestination` then sends the user to Home or the paywall.

## The single foreground handler

`startEnforcement(runtime): Unsubscribe` owns the **only** `AppState` `'active'` subscription in the app.
A grep test (`__tests__/single-appstate.test.ts`) holds that line; the treadmill scan's listener is the
one allowed exception, because it pauses a camera controller rather than enforcement, and it lives for
the length of one modal. On every foreground transition the handler, in order:

1. re-reads Screen Time, Motion, Health, notification and camera permission statuses;
2. re-verifies the app selection through `describeSelection()`;
3. runs the claim-on-open progress refresh and records `lastClaimAt`, so a run or ride finished while the
   app was closed lands on the progress row instead of freezing the bar;
4. forces a re-apply of the lock.

## The enforcement loop

The host recomputes on rules, rule-day and entitlement store changes and on **one** timer set to
`nextEnforcementAt` — the earliest of the next interval boundary, `relockAt`, `leaseUntil` and
`holdsUntil` — never at 1 Hz. `effectiveNow` clamps a rewound clock. `domain/enforcement`'s
`enforcementPlan` runs first, so a lapsed entitlement clears the shields and unregisters the monitors
before anything else (B21), and an unknown status holds the last applied plan before falling back to the
last known-good one. `domain/monitorPlan` then compiles the absolute windows, and
`applyLock(decision, plan, monitors)` is called only when `{ shields, selectionToken, planHash }` changes.

The result is published to `state/enforcementStore`, which owns `enforcementStatus`, `lastClaimAt` and
the retry token. A result with `applied: false` fails closed: the shields stay up, Home says blocking is
not on, and its Try again action bumps the retry token, which the host turns into a forced re-apply.

`startProgressSync` is owned here too, not by the tabs layout. `useLockDecision` stays a render selector
and never calls a port.
