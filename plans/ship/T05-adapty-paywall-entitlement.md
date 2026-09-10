# T05 — Adapty, custom paywall, entitlement

Spec: `04-identity-and-money.md` §1 steps 3–4, §3–§6. Facts: `research/infra-audit.md` §2 (old
`AdaptySubscriptionModule`, `SubscriptionPaywall.tsx`, restore-downgrade bug); P2-T18 §1 (lapse never locks
out), §4 (offline).

## Steps

1. `AdaptySubscriptionAdapter implements SubscriptionPort`: `activate` → `identify(uid)`; `onLatestProfileLoad`;
   `getFlow(placement)` + `getPaywallProducts`; `purchase(product)`; `restore`; `logout`; `busy` flag for the
   OTA coordinator. **Before `purchase`/`restore`:** `setIntegrationIdentifier` with the PostHog distinct id
   (verify the key name against Adapty's live docs; record the doc URL in the adapter README).
2. Entitlement mapping table §4 as one pure function with one test file; `unknown` 3 s budget; transient
   error never changes status.
3. Port the existing `PaywallStandIn` into the real `PaywallScreen`: renders fetched products in fetched order,
   paired by `vendorProductId`; variant component chosen by `paywall_variant` flag with exposure at mount;
   Terms/Privacy tappable, price, renewal disclosure, restore; hard on `onboarding`, modal on `in_app`;
   visible fallback on fetch failure; offline branch per P2-T18 §4; no Lifetime (B35).
4. Restore-not-found never downgrades (test from finding 12).
5. Lapse: `enforcementPlan` clears shields (T10); app stays mounted; `in_app` modal.
6. StoreKit configuration file `ExcerLock.storekit` with the six products for simulator purchases; wired into
   an explicit Debug simulator launch/test scheme only. Preview-device/TestFlight verification uses real
   sandbox StoreKit; a bundled .storekit file is not evidence of sandbox/vendor integration.
7. Webhook (server): §5 rules; resync endpoint.

## Tests first

- `entitlementMapping.test.ts` (every row of §4) · `paywall-render.test.tsx` (order/pairing/links from a
  fixture matching a real SDK4 `getFlow` / products response) · `purchase-order.test.ts` (integration identifier set
  before purchase) · `restore-never-downgrades.test.ts`.

## Acceptance

- [ ] Simulator + StoreKit config: trial purchase → `trial` → X1; restore; cancel-auto-renew stays `active`.
- [ ] Device + sandbox, **anonymous** fresh install: purchase → Adapty profile keyed by the Supabase uid →
      webhook row on the VPS → PostHog shows the purchase event on the same person as `paywall_variant`
      exposure. Screenshot each hop in `evidence/T05/`.
- [ ] Paywall renders Terms, Privacy, price, renewal text from a real fetch.

SDK4 implementation correction: `getFlow` replaces the old `getPaywall` API; custom-rendered flows use
`logShowFlow`. Follow the installed SDK types and official docs, not an invented v3 compatibility alias.
