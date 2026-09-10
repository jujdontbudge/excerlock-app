# 04 — Identity and money (B46–B48)

Owned by T04 (auth), T05 (Adapty + paywall), T06 (PostHog/Sentry). Every rule maps to a Recovi
incident (`research/recovery-postmortem.md` §PAY/§AUTH) or the playbook
(`/Users/johansardar/reform/docs/AB-TESTING-ANALYTICS-PLAYBOOK.md`).

## 1. The spine (B48)

One id. Supabase user id, created **anonymously on first launch** before any screen renders after the boot
gate. It is, simultaneously: VPS `users.id`, Adapty `customer_user_id`, PostHog `distinct_id`. Sign-in
*links* the anonymous user (`linkIdentity`) and keeps the id; it never creates a second person.

Ordering contract (a test asserts the call order with mocked SDKs):

1. Boot: Supabase anonymous session (bounded 5 s; on timeout proceed with a locally generated provisional id
   and reconcile later — never hang a fresh install, TICKET-27). Provisional identity is explicitly
   noncanonical: gate purchase/restore/person-bound exposures until canonical identity and the awaited spine
   below are ready. Provision the VPS user with its authenticated token before monetization (ADR 0011).
2. PostHog `identify(uid)`; register super-properties `environment` (`dev|preview|prod`, from the build
   profile, re-registered after every `reset`), `runtime_version`, `update_id`.
3. Adapty `activate` then `identify(uid)`.
4. **Before every purchase or restore call:** `adapty.setIntegrationIdentifier('posthog_distinct_user_id',
   posthog.getDistinctId())` — verify the exact key against Adapty's live PostHog-integration docs at
   implementation time. Verified SDK4 call: `(key, value)`, official https://adapty.io/docs/posthog.
   This is the F1 fix; without it the purchase lands on a person the exposure never met.
5. New provider linking: native ID-token `linkIdentity` → same uid → no duplicate identification. Existing
   account recovery adopts its canonical uid; never automatically alias established people or transfer paid
   ownership. Permanent-account sign-out creates a fresh anonymous uid; anonymous sign-out can be a no-op.
   Account deletion: retain auth for the authenticated durable VPS deletion job; tombstone/local VPS erasure
   → Adapty erasure → PostHog erasure → Supabase deletion last, with durable retries. Only after server
   acceptance finish local logout/reset and create a fresh anonymous session (ADR 0011).
6. Experiments bucket on the **device id** (`$device_id`), primed before the first flags call; the first
   flagged surface gates on flags-ready with a control fallback and a 2 s timeout.

## 2. Auth (B47; absorbs P2-T01)

- Providers: Apple (native `expo-apple-authentication` → Supabase native-token `linkIdentity` for anonymous conversion;
  `signInWithIdToken` only for returning-account recovery), Google (`expo-auth-session`
  → id token), email OTP. Supabase native-app registration (Team ID + bundle ID) is a T00 prerequisite;
  verify the configured native bundle audience on a device; provider failures must be surfaced, never hidden.
- **A failed sign-in is never silent.** Distinguish "user dismissed the sheet" (`ERR_REQUEST_CANCELED`) from
  "attempt ran and failed" (anything else) and surface the latter. The Recovi masking line
  `if (!sessionId) return;` is the anti-pattern.
- Tokens in `expo-secure-store`; the AsyncStorage session store keeps only the non-secret `Session` shape.
- `signInRequired` PostHog flag (default `false`) gates whether the X4 "Skip for now" button exists and whether
  Settings nags. Flipping it is an OTA-free change.
- Account deletion screen exists and works for anonymous users too (5.1.1(v)).

## 3. Adapty adapter (B46; absorbs P2-T06 minus the Builder, P2-T18)

- `getFlow(placement)` + `getPaywallProducts(flow)` render **the returned products in the returned order**.
  No hardcoded prices, plan count or order; pair by `vendorProductId` from the response, never by a constant.
  A fetch failure shows a visible fallback ("Plans couldn't load — retry") that reports itself to Sentry;
  never a silent static price list (F8).
- Placements: `onboarding` (hard paywall, no dismiss), `in_app` (modal over the mounted app on lapse), `winback`.
- Paywall variant: PostHog flag `paywall_variant` → chooses layout/copy component; exposure fires when the
  paywall mounts, once per assignment. Price/trial variation is **not** done here (B46).
- Required on the screen: tappable Terms of Use and Privacy Policy, price, renewal disclosure, restore link.
  Acceptance test renders them from a real fetched paywall.
- **Restore that finds nothing never downgrades** a live entitlement.
- Purchase outcome events fire on the confirmed outcome (Adapty's PostHog integration is the single emitter for
  subscription lifecycle; the app emits none).

## 4. Entitlement mapping (one table, one test file)

| Adapty state | App `Entitlement.status` | Notes |
| --- | --- | --- |
| active, trial | `trial` / `active` | |
| active, auto-renew **off** (cancellation) | `active` until `expiresAt` | Recovi mapped this to lost access (#151) |
| billing grace | `active` | no `grace` status in v1 |
| billing issue past grace | `billingIssue` | unshield (B21), `in_app` paywall modal |
| expired | `expired` | unshield, modal |
| non-renewing / promotional grant | `active` until `expiresAt` | explicitly handled |
| transfer | re-identify, then whichever of the above | explicitly handled |
| unknown (SDK not ready, offline) | `unknown` | 3 s budget, keep last applied lock state, never unshield on unknown |

A **transient vendor error never changes the lock state** (Recovi #157). Only a resolved status transition does.

## 5. Webhook (VPS, unchanged route)

Ack `200` for anonymous customer ids nothing can bind to (never `503` — infinite retry). Check `environment`
on every payload and drop cross-environment events. Write through a monotonic guard. Expose a resync endpoint
the client calls on an entitlement `403`.

## 6. App Store products (prerequisite, T00)

ASC app `6787265352` has 51 subscriptions, all `MISSING_METADATA`. The paywall renders these six:
`com.johansardar.excerlock.premium.{a,b}.{monthly,annual,winback.annual}`. Each needs localized name and
description, a review screenshot, pricing, and must be attached to the first version submission. The other
45 (the `.{price}.t{0,3,7}` grid) are left unsubmitted or deleted — Johan's call; the app never references
them. Paid Apps Agreement, banking and tax confirmed before T05 starts.

SDK4 implementation correction: `getFlow` replaces the old `getPaywall` API; custom-rendered flows use
`logShowFlow`. Follow the installed SDK types and official docs, not an invented v3 compatibility alias.
