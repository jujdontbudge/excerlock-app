# P2-T18 — Entitlement, identity and paywall

Decisions: B13, B18, B21, B35, C6, D1, D3, D4, D5. Findings: 5, 12, 13, 48, 50, 51, 69, 82, 86, 90.
Per-finding detail: `docs/audit/fix-map.md` § P2-T18. Depends on P2-T14 (`enforcementPlan`) and P2-T17
(the call site and `IdentityBridge` slot).

## 1. A lapse never locks the user out (B21; findings 5, 12, 50)

- `src/domain/entitlementAccess.ts` (NEW): status → `{ appAccess: boolean; paywall: 'hard' | 'modal' | null }`.
  `none` → hard paywall (never subscribed); `expired` and `billingIssue` → app reachable, paywall as a
  dismissible modal (placement `in_app`); `trial`/`active` → no paywall; `unknown` → splash inside the
  3-second budget then the last known-good status. **No `grace` status in v1**: Adapty's billing grace period
  maps to `active` (P2-T06 records it).
- `RootNavigator.tsx`: one guard, `loading || (onboarding.setupComplete && access.appAccess)`; the paywall
  modal is presented over Home, Settings, support, account deletion and both ceremonies. Dismiss lands on Home.
- A lapse is **never** rendered as `noRulesToday`. Home gets its own `lapsed` status branch: "Blocking is
  paused" / "Your subscription ended, so your apps are open. Start a plan to switch blocking back on." /
  "See plans" (branch table owned by P2-T19; the strings land here in `content/home.ts`).
- Ceremonies while lapsed keep booking progress (streaks and history stay honest); their success copy drops the
  unlock claim: "Exercise detected" / "Your apps aren't blocked right now" (P2-T21 renders it).
- Restore that finds nothing never downgrades a live entitlement (finding 12): the fake and P2-T06 both keep
  the current status and show "Nothing to restore".
- `01-product-model.md` §9's "route to the paywall" sentence is rewritten to the table above.

## 2. Identity spine (findings 48, 51)

`Session` gains `userId` on both variants (anonymous ids exist from first launch, per P2-T01). `IdentityBridge`
(mounted by P2-T17) calls `subscription.identify(userId)` and `analytics.identify(userId)` on every session
change and the teardown order on deletion (subscription → analytics → auth last), encoded in
`src/domain/identity.ts`. Signing in from the welcome screen identifies, restores the entitlement and routes
by `entitlementAccess` (`resumeAfterSignIn`).

## 3. Paywall content (B35, C6; findings 13, 82, 86, 90)

`content/subscription.ts`: remove the Lifetime plan; tappable Terms of Use and Privacy Policy plus price and
renewal disclosure on the stand-in (App Review 3.1.2); trial reminder line and timeline derived from the live
offer; the selected plan is passed through `SubscriptionPort.presentPaywall(placement, plan)` so the picker
means something. P2-T06's acceptance requires the real Adapty paywall to carry the same links and disclosure,
and the Phase 2 README tells Johan the dashboard paywall must.

## 4. Offline is its own case (finding 69)

`ReachabilityPort` (fake now, `@react-native-community/netinfo` or Expo equivalent in P2-T06/T01/T10) so the
paywall, sign-in and support screens say "You're offline" instead of the generic error; local-first flows
(rules, progress, ceremonies) never consult it.

## Tests first

"an expired entitlement can still open Settings, support and account deletion"; "the in-app paywall can be
dismissed on a lapse and lands on Home"; "Home says 'Blocking is paused' with 'See plans' when expired"; "a
lapse is never rendered as a rest day"; "a restore that finds nothing keeps the current status"; "every
session carries a userId and the SDKs are identified with it"; "deletion tears down subscription, analytics,
then auth"; "the paywall stand-in renders Terms, Privacy, price and renewal"; "no Lifetime plan is offered";
"offline shows the offline copy, not the generic error".

## Acceptance

- [ ] Sandbox lapse (P2-T11) clears shields within one app run and Settings stays reachable.
- [ ] `02-screen-inventory.md` P (paywall) row lists the links and disclosure; §9 of the product model
      matches `entitlementAccess`.
