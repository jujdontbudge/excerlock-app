# Shield content

The app-group transport that puts shield copy in front of the two Swift
extensions. Moved from the old app with P2-T03.

**What moved:** `ShieldContentPublisher` (the three app-group keys),
`ShieldContentCoordinator`, `shieldCopySource` (the PostHog override seam) and
the two native edges — `nativeShieldContentPublisher` over
react-native-device-activity and `notificationRouteHomeSource` over
expo-notifications.

**What did not:** `appShieldContent`, `unlockOffer`, `ShieldCauseResolver` and
`shieldContentRuntime`. All four composed copy out of the old condition model,
home store and lock precedence, and app-next already decides the same things in
`domain/shieldContent.ts`, `domain/unlockHint.ts` and `domain/resolveLock.ts`.

**Open for P2-T04.** The transport's `NativeShieldCause` still carries the four
strings the Swift extensions key on (`balanceEmpty`, `fullLock`, `lockWindow`,
`walkAndScrollEnded`), while the domain has three (`locked`, `lockWindow`,
`walkingEnded`). T04 owns the mapping and decides whether the Swift raw values
and `ShieldContent.plist` copy change with it; nothing here invents that copy.

---

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

Lock-window starts can happen while app JavaScript is suspended. The native
schedule writer therefore stores each monitor's lock-window context in the app
group, and the generated monitor calls the app-owned Swift helper before the
shield reads it. The config plugin injects that call on every clean prebuild.

## Contract and invariants

- The four wire causes are `balanceEmpty`, `fullLock`,
  `walkAndScrollEnded`, and `lockWindow`; no default-only production path is
  allowed.
- The subtitle is the cheapest comparable real offer. Immediate offers win;
  numeric offers compare only when they share a unit, otherwise configured
  order breaks the tie.
- Remote title and subtitle values replace bundled copy exactly. The client
  validates one flag payload and never rotates variants.
- The current cause is committed after its runtime context so the extension
  cannot select a new variant with stale details.
- `ScreenTimeModule` remains unchanged; app-group publication is a separate
  boundary.

## Test doubles

Tests inject the app-group writer, offer source, copy source, route-home source,
clock, signal reader, and lock-policy inputs. Production construction lives in
`shieldContentRuntime.ts`; fixtures remain the default Screen Time boundary in
tests.

Run the focused module suite from the repository root:

```sh
npm run test:app -- --runInBand src/shield
```

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
