# Shield content

This module publishes the app-owned facts that iOS shield extensions cannot
compute for themselves. It is deliberately separate from `ScreenTimeModule`:
that frozen seam still owns authorization, selection, shields, drain ladders,
and schedules; this module owns only the shared app-group content snapshot.

## Flow

`LockController` resolves the policy cause before each shield-up reconcile.
`ShieldCauseResolver` maps balance empty, Full Lock, and lock window directly,
and remembers the verified walking-to-blocked transition for the Walk & Scroll
ended variant. `ShieldContentCoordinator` combines that cause with:

- the closest actionable offer from the user's enabled conditions and current
  on-device signal totals;
- the fixed remote-copy payload selected by the experiment rail; and
- whether local-notification authorization gives ShieldAction a route home.

`nativeShieldContentPublisher` writes the three versioned keys already read by
the generated targets: current cause, runtime context, and copy overrides. It
uses `react-native-device-activity`'s existing shared `UserDefaults` API, so no
new native module or package is involved.

## Copy flag integration (#87)

The PostHog provider owns flag evaluation and exposure. Once it accepts the
`exp-shield-copy` payload inside the rail's control-first timing window, it
calls the public `installShieldCopyOverrides(payload)` function. This module
validates and holds that one payload; it performs no client-side selection or
rotation. Missing or malformed payloads resolve to the bundled four-copy set.

## No route home

A ShieldAction cannot open its host app directly. When notification permission
is approved, balance empty and Full Lock show **Open ExcerLock**, Walk & Scroll
ended shows **Keep walking**, and the action queues the silent local deep-link
notification. Without permission those variants collapse to one **Close**
button rather than presenting a dead route. Lock window is always the decided
single **OK** action and never queues a notification.

## Verification boundary

Jest covers cause resolution, offer selection, remote payload validation, and
app-group writes. The guardrail checks the production caller and generated
target contract; Swift sources typecheck against the iPhoneOS SDK. Shields
cannot render on the simulator, so visual variants and tap-through still need
the #84 physical-device smoke pass.
