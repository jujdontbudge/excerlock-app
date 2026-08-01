# Subscription

Subscription is the app-facing seam for remote-shaped paywalls, the single
`premium` entitlement, purchases, and restores. Production uses Adapty without
exposing SDK types to callers; tests retain the persistent deterministic mock.

## Interface

Callers import only `index.ts` and obtain the adapter through
`getSubscriptionModule()`. The interface exposes:

- a snapshot containing entitlement, paywall-loading, and purchase/restore
  intent state;
- `loadPaywall(placement)`, whose ready value preserves the returned product
  count, order, prices, trials, badges, surrounding copy, and default selection;
- `purchase(productId)` with purchased, cancelled, and failed outcomes;
- `restore()` with restored, not-found, and failed outcomes;
- snapshot change subscription for renderers.

After the required post-purchase Clerk sign-up, the account composition root
calls `identifySubscriptionCustomer(clerkUserId)`. That is the one identity
handoff: Adapty activates anonymously at app bootstrap, the purchase completes
without an account, and only then is the Clerk id attached.

`SubscriptionPaywall` is the shared renderer. The onboarding step supplies only
its placement, the user's confessed daily phone time, and navigation callbacks.
The surface owns plan selection, loading/error UI, purchase/restore intents, and
locked-versus-entitled rendering.

## Entitlement gate

There is one access level: `premium`. Callers decide whether protected product
behavior is unlocked only through `isPremiumEntitled(snapshot)`; screens must
not inspect product ids, dates, or vendor profile fields themselves.

The onboarding hard paywall cannot advance until purchase or restore produces
an active entitlement. ExcerLock has no free product tier, so every
post-onboarding product surface is premium-gated. Modules that add those gates
must read this boundary rather than create their own subscription state.

## Mock, persistence, and clock

`MockSubscriptionModule` implements the production interface and adds
deterministic driver controls only for its own tests. The mock carries the PRD
fallback offer: annual first and preselected at `$59.99 / year` with a seven-day
trial, then monthly at `$9.99 / month`.

Only durable entitlement data persists under
`excerlock.subscription.mock.v1`; transient loading and error state starts clean
on launch. Persisted data is validated before it crosses the interface. Purchase
and renewal timestamps come exclusively from the injected subscription clock,
and entitlement expires exactly at `renewsAtMs`.

The mock class and clock are deliberately not exported from `index.ts`. No app
module may import them directly. `getSubscriptionModule()` is the single swap
point and returns the mock whenever `NODE_ENV` is `test`.

The build-gated E2E/debug composition root calls
`installFixtureSubscriptionModule()` in `accessor.ts` to seed `free` or
`premium` through that same boundary and a pinned clock. The mock class and its
persistence details stay private to this module.

## Adapty adapter

`react-native-adapty` is installed through Expo and activated once at app
bootstrap. A keyed non-test runtime receives `AdaptySubscriptionModule`; a
keyless runtime receives `NoopSubscriptionModule`, which stays locked and
returns recoverable unavailable states instead of throwing. Only
`EXPO_PUBLIC_ADAPTY_KEY` enters Expo config. `ADAPTY_SECRET_KEY` is never read by
mobile code or copied into the bundle.

The adapter:

- load the requested Adapty placement and translate its returned products into
  `SubscriptionPaywallConfig` without imposing a fixed plan count or order;
- translate the `premium` access level into the entitlement snapshot;
- forward purchase and restore intents and normalize cancellation/errors;
- listen for Adapty profile refreshes so entitlement changes update the shared
  snapshot.

Remote config may provide `title`, `body`, `valueStatement`, `plansTitle`,
`trialStatement`, `defaultProductId`, and a `productBadges` map. Product count,
order, identifiers, localized prices, billing periods, descriptions, and trial
periods always come from Adapty's placement response. Missing remote badges stay
absent; the app never synthesizes scarcity copy.

No other subscription caller changes, and no Adapty type crosses the public
`SubscriptionModule` interface. If a placement cannot load, the hard gate stays
closed and presents its retry surface.

## App Store Connect handoff

The placement may return any configured identifier; the adapter never embeds
this catalog. The orchestrator should create these products and mirror them to
Adapty's `premium` access level:

| Subscription group | Product identifier | Duration | Starting offer |
|---|---|---:|---|
| ExcerLock Premium — Variant A | `com.johansardar.excerlock.premium.a.annual` | 1 year | $59.99, 7-day trial |
| ExcerLock Premium — Variant A | `com.johansardar.excerlock.premium.a.monthly` | 1 month | $9.99, no trial |
| ExcerLock Premium — Variant A | `com.johansardar.excerlock.premium.a.winback.annual` | 1 year | $29.99, 7-day trial |
| ExcerLock Premium — Variant B | `com.johansardar.excerlock.premium.b.annual` | 1 year | $79.99, 7-day trial |
| ExcerLock Premium — Variant B | `com.johansardar.excerlock.premium.b.monthly` | 1 month | $12.99, no trial |
| ExcerLock Premium — Variant B | `com.johansardar.excerlock.premium.b.winback.annual` | 1 year | $39.99, 7-day trial |

There is no weekly or lifetime product. Keeping variants in separate groups is
what lets Adapty own the price experiment. The decline placement must use the
real win-back product for its assigned group; the app generates neither a fake
discount nor a countdown.

No real StoreKit sandbox purchase has been made from this implementation, and
no entitlement has been observed round-tripping through Adapty. A dashboard
fallback export and offline product behavior also require verification after
the ASC catalog exists; the app currently stays hard-locked with a retry state
when the placement or products cannot load.

## Analytics ownership

This boundary emits no purchase outcome or subscription-lifecycle event. The
ten events owned by `adapty` in `@excerlock/analytics-events` come only from
Adapty's native PostHog integration in Phase 5. Purchase success is app logic
here only because it changes the entitlement snapshot; it is never translated
into a client-owned lifecycle event. The onboarding rail keeps its existing
flow instrumentation independently of subscription state.

## Test

From the repository root:

```sh
npm run test:app -- subscription
```
