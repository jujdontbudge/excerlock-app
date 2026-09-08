# P2-T06 — Adapty with the Paywall Builder (`SubscriptionPort` real adapter)

## Facts

- `react-native-adapty` 4.x, single access level `premium`, placements `onboarding` and `in_app`, product ids
  in `app/src/subscription/README.md` (two subscription groups, A and B). `EXPO_PUBLIC_ADAPTY_KEY` via
  `app.config.ts` `extra`. Server webhook exists and is unchanged. Adapty's PostHog integration owns all
  lifecycle events (D9) — the app emits none.
- Decision C6: the paywall UI is the **Paywall Builder**; Johan designs it in the dashboard.

## Steps

1. Verify in Adapty docs (via the `adapty` CLI docs or adapty.io/docs, and the Expo MCP for the config
   plugin) the current Builder package for React Native (`@adapty/react-native-ui`) and its Expo setup;
   pin versions.
2. `SubscriptionAdapter implements SubscriptionPort`: port `AdaptySubscriptionModule` logic (activate at
   bootstrap, `onLatestProfileLoad`, entitlement mapping, restore, `identify`, `logout`) and add
   `presentPaywall(placement)` → `getPaywall(placement)` + `createPaywallView` + present; map events
   (purchase completed, restored, closed, error) to `Entitlement` transitions and the Phase 1 slot's states.
   Hard paywall: the Builder view's close is disabled for `onboarding` (configure in the dashboard) and the
   slot re-presents on dismissal.
3. Identity: `identify(supabaseUid)` on every session (anonymous included) so purchases attach to the spine
   from the start; `logout` on account deletion. Adapty `customer_user_id` = Supabase uid.
4. Fallback paywall: bundle the dashboard fallback JSON as before (`fallbackPaywall.ts`), verify export.
5. Tests: adapter contract tests with the `AdaptySDKPort` mock (extend it for the Builder view); entitlement
   mapping for trial/active/expired/billing issue/grace period.
6. Sandbox: with a sandbox Apple ID on the simulator or device, run a trial purchase, verify the Adapty
   dashboard shows the profile keyed by the Supabase uid and the VPS `adapty_subscription_states` row appears
   via the webhook. Record in `evidence/P2-T06/`.

## Acceptance

- [ ] Onboarding P shows the Builder paywall; purchase → `trial` → X1. Restore path works.
- [ ] Sandbox purchase round-trips to the VPS (webhook row present).
- [x] No lifecycle analytics emitted by the app (single-emitter guardrail green).
- [x] The adapter passes the `SubscriptionPort` contract suite, which also runs against the Phase 1 fake.
- [x] Every status transition is mapped: trial, active, expired, billing issue, and billing grace as `active`.
- [x] A restore that finds nothing never downgrades a live entitlement, inside the Builder view as well as
      through `restore()`.
- [x] `unknown` is bounded: with the network cut, a launch settles on the persisted status within 3 seconds
      and never clears a live entitlement; a late profile still publishes.
- [x] A paywall payload missing Terms, Privacy, price or renewal is reported; a bundled fallback missing any
      of them is refused outright (`paywallCompliance`).
- [ ] The dashboard paywall itself carries tappable Terms of Use and Privacy Policy links, the price and the
      renewal disclosure (Johan builds it; verified on device in P2-T11).

## Built (2026-09-07)

`app-next/src/adapters/subscription/` — see its README. Notes that change the steps above:

- **There is no `@adapty/react-native-ui` in 4.x.** The Paywall Builder ships inside `react-native-adapty`
  (`createFlowView` / `FlowViewController`), and v4 renamed paywalls to flows (`getFlow`, `logShowFlow`).
  Pinned at `react-native-adapty` 4.0.2, already in the tree from `app/`.
- **No config plugin entry is needed yet.** The plugin's only iOS job is bundling the dashboard's fallback
  export as a bundle resource; add it with the `fallbackFile` prop when that export exists.
- **No preselected product API.** The chosen plan travels as the custom tag `SELECTED_PLAN`, which the
  dashboard paywall can bind.
- **Not wired into the runtime yet.** `createRuntime` still refuses the real runtime, and `PaywallSlot`
  still presents the Phase 1 stand-in and only calls `presentPaywall` on a tap. The cutover (auto-presenting
  the Builder view in the slot, and composing the adapter in the runtime root) belongs to P2-T12/T17.

## Audit amendments (2026-09-07; see `fix-plan.md`)

- **Lapse presentation (B21).** `expired` / `billingIssue` present the Builder paywall as a dismissible modal
  over the mounted app (placement `in_app`); only `none` is the hard paywall. Routing is P2-T18's
  `entitlementAccess`.
- **Grace period** maps to `active` (no `grace` status in v1; recorded decision in P2-T18 §1).
- **Restore that finds nothing never downgrades** a live entitlement (finding 12).
- **The dashboard paywall must carry** tappable Terms of Use and Privacy Policy links, the price and the
  renewal disclosure (App Review 3.1.2); acceptance test: the fetched paywall renders them and a fallback JSON
  without them fails. Added to the README's "Prerequisites Johan owns".
- **Offline branch**: the paywall shows P2-T18's offline copy when `ReachabilityPort` says offline.
- **Selected plan** flows through `presentPaywall(placement, plan)`; no Lifetime SKU (B35).
- **`unknown` is bounded.** The adapter owns the 3-second fetch budget and the last-known-good cache:
  it must publish a resolved status within 3 seconds of launch, falling back to the last persisted
  known-good status rather than leaving `unknown` in place. P2-T18's `entitlementAccess` maps `unknown`
  to the splash and has no timer of its own, so an adapter that never resolves strands the user there.
  Acceptance test: with the network cut, launch reaches Home (or the paywall) within 3 seconds on the
  persisted status, and never clears a live entitlement.

## Adapty dashboard state (set up via `adapty` CLI, 2026-09-07)

App `ExcerLock` 9b8a6cf2-22c5-46f9-b938-35c27da2c66f (SDK key = `EXPO_PUBLIC_ADAPTY_KEY`), access level `premium`
b95ba4b6-812e-4ce4-b2ac-8416006bc40a. Six products bound to the App Store subscription ids (both variants);
paywalls `Premium A` f3933bd1, `Premium B` 28df5bcc, `Win-back A` 14ae444b, `Win-back B` 6e176aef; placements
`onboarding` and `in_app` both serve `Premium A`, `winback` serves `Win-back A`. Variant B is not yet in an
A/B test (dashboard-only). Paywall Builder designs are still empty. App Store products are in
`MISSING_METADATA` (pricing and localisation still needed in App Store Connect).
