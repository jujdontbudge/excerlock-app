# Subscription adapter — Adapty with the Paywall Builder

`SubscriptionPort` on `react-native-adapty` 4.0.2. One access level, `premium`; two placements,
`onboarding` and `in_app`; the paywall itself is designed in the Adapty dashboard (decision C6), so this
module never renders plans, prices or legal copy — it fetches a placement, presents the Builder view and
translates what comes back.

## The one published state

`state/entitlementStore` is both the app's entitlement and the persisted last known-good status. Every
path — launch, purchase, restore, and the profile refresh that mirrors a server-side webhook — writes
through `publish`, which ignores no-op writes so subscribers only hear about real changes.

## Laws

- **Grace is active.** v1 has no `grace` status: `isInGracePeriod` maps to `active`, so a card Apple is
  still retrying never clears a shield (B21).
- **`unknown` is bounded.** A launch has `LAUNCH_BUDGET_MS` (3 s) to produce a status. If Adapty has not
  answered, the adapter settles on the persisted status instead — reaching Home or the paywall rather than
  stranding the splash — and a late answer still publishes when it arrives. It never writes a status the
  device did not already trust, so an offline launch cannot clear a live entitlement.
- **A restore that finds nothing never downgrades** (`domain/mergeRestoredEntitlement`), inside the Builder
  view as well as through `restore()`.
- **The app emits no subscription analytics** (D9). Adapty's PostHog integration owns every lifecycle
  event; problems here go to `onIssue`, which P2-T07 points at Sentry.

## Presenting

`presentPaywall(placement, plan)` fetches the placement, creates the Builder view and settles on the first
terminal event. A handler's return value decides whether the view closes: a completed purchase, a
successful restore, a close tap and an error close it; a cancelled App Store sheet and a restore that found
nothing leave the user on the paywall. A dismissal that settled nothing resolves with the unchanged
entitlement, which is what makes the hard paywall re-present. Errors reject, so `PaywallSlot` can tell
offline apart from a generic failure through `ReachabilityPort`.

The selected plan travels as the custom tag `SELECTED_PLAN`: Adapty 4.x has no API for preselecting a
product, so the dashboard paywall binds that tag if Johan wants the picker to carry through.

`trialOfferFromProducts` reads the trial the T1–T4 screens describe from the live catalog, and only for a
user with nothing to lose (`none`); an entitled launch costs no placement fetch.

## App Review 3.1.2

`paywallCompliance` scans the payload for tappable Terms of Use and Privacy Policy links, a price and the
renewal disclosure. It is a text scan, not a renderer: it catches a paywall published without the legal
block and cannot prove a link resolves. A fetched paywall's violations are reported through `onIssue` and
still shown — refusing a live paywall would cost the purchase — while a fallback bundled into the binary is
ours to fix, so a non-compliant one is refused outright.

## Composition

The runtime root builds it, and a keyless build keeps the fake rather than half-activating:

```ts
const key = adaptyKey();
const subscription = key ? createSubscriptionAdapter({ apiKey: key, sdk: nativeAdaptySdk() }) : fake.subscription;
```

`nativeAdaptySdk` is imported from its own module on purpose: it is the only file that loads the native
SDK. `identify(userId)` is queued behind activation, so the identity spine can call it from first launch.

## What lives in the dashboard, not here

- The paywall design for both placements, including the legal block, price and renewal disclosure.
- The close button, disabled for `onboarding` so B13's hard paywall holds.
- The fallback paywall export. Once Johan exports it, bundle it as `assets/adapty-fallback.json`, add the
  plugin entry to `app.json`, and pass `fallback` to the adapter:

```json
["react-native-adapty", { "fallbackFile": { "ios": "./assets/adapty-fallback.json" } }]
```

`EXPO_PUBLIC_ADAPTY_KEY` comes from `~/.excerlock/env` and is inlined at build time; it is never committed.

## Test

```sh
npm test --workspace app-next -- src/adapters/subscription
```

The port contract (`src/ports/__tests__/subscriptionContract.ts`) runs against both this adapter and the
Phase 1 fake, so the two cannot drift.
