# Subscription

Subscription is the app-facing seam for remote-shaped paywalls, the single
`premium` entitlement, purchases, and restores. Phase 2 uses a persistent mock.
Phase 5 replaces that adapter with Adapty without changing callers.

## Interface

Callers import only `index.ts` and obtain the adapter through
`getSubscriptionModule()`. The interface exposes:

- a snapshot containing entitlement, paywall-loading, and purchase/restore
  intent state;
- `loadPaywall(placement)`, whose ready value preserves the returned product
  count, order, prices, trials, badges, and default selection;
- `purchase(productId)` with purchased, cancelled, and failed outcomes;
- `restore()` with restored, not-found, and failed outcomes;
- snapshot change subscription for renderers.

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
module may import them directly. `getSubscriptionModule()` is the single
Phase-5 swap point and returns the mock today.

## Phase-5 Adapty swap

Phase 5 changes the constructor in `accessor.ts` to an Adapty-backed
`SubscriptionModule`. That adapter will:

- load the requested Adapty placement and translate its returned products into
  `SubscriptionPaywallConfig` without imposing a fixed plan count or order;
- translate the `premium` access level into the entitlement snapshot;
- forward purchase and restore intents and normalize cancellation/errors;
- keep bundled fallback paywalls available for offline first launch.

No other subscription caller changes, and no Adapty type crosses this module.
The SDK and keys are intentionally absent until tickets #22/#24.

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
