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
- [ ] No lifecycle analytics emitted by the app (single-emitter guardrail green).
