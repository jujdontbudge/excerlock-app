# Phase 1 brief: payments

You are working in the git worktree `/Users/johansardar/ExcerLock-payauth` on branch `rebuild/payments-auth`. Commit only to this branch. Never push, merge, deploy, publish an OTA, or change any dashboard (Adapty, App Store Connect, Supabase, PostHog, Sentry). Never print secrets.

Read first: `AGENTS.md`, `ARCHITECTURE.md` (rules 1–8, especially: no comments in TS/JS, no tests, import packages only through their root files, layer order), `CONTEXT.md`, `docs/plans/payments-auth-rebuild/README.md` (the plan, decided by Johan) and `docs/plans/payments-auth-rebuild/01-payments.md` (the research).

## Goal

A paying customer always gets in. Adapty on the phone is the only judge of Premium. Nothing about sign-in or our server can stand between a successful purchase and the app.

The bug this fixes (Oct 24): a guest bought a trial, the app forced sign-in, sign-in produced a different account, the server's `/v1/subscription/resync` answered "unknown", the client retried into its own 5/min rate limit, treated the user as unpaid and sent them back to the paywall. They cancelled.

## Do

1. **New `AccessPort`** in `ports`, replacing `SubscriptionPort` and `SubscriptionAdmissionPort`. Small interface:
   ```ts
   type AccessStatus = 'checking' | 'active' | 'inactive';
   type Access = { status: AccessStatus; plan: { productId: string; period: 'week' | 'month' | 'year' | null; inTrial: boolean; willRenew: boolean; expiresAt: string | null } | null };
   type Offer = { id: string; period: 'month' | 'year'; price: string; weeklyPrice: string | null; trialDays: number | null };
   current(): Access; subscribe(cb): Unsubscribe;
   loadOffers(placement: 'onboarding' | 'in_app'): Promise<Offer[]>;
   buy(offerId: string): Promise<'active' | 'pending' | 'cancelled' | 'failed'>;
   restore(): Promise<'active' | 'none' | 'failed'>;
   setAccount(accountId: string): Promise<void>;
   manage(): Promise<void>;
   ```
   Adjust names or fields only if a real caller needs it; keep it this small.
2. **Adapty adapter** in `subscription` implementing it: activate once with the account id; register the bundled fallback before the first fetch; one `onLatestProfileLoad` listener; premium = `profile.accessLevels.premium.isActive`; cache the last profile so a relaunch starts from it. `checking` becomes `inactive` only from a profile that says so, never from a timeout, network error or identity change. `buy` is single-flight and never retried automatically; apply the returned profile directly. Trial days come only from the offer StoreKit returns on the product, never from SKU names or remote flags. Products are exactly what the placement's paywall returns, in that order.
3. **Gate**: entering the app needs `onboarding complete && access.status === 'active'`. `checking` shows the last known state or a neutral loading view, never the paywall. Remove server admission, leases, renewal timers and `rememberedAdmission` from the journey.
4. **No forced sign-in.** After a successful purchase go straight to Setup. Remove `signInRequired` from paid routes and from Setup. Keep the sign-in screens and the identity package working as they are for people who choose to sign in (phase 2 rebuilds them); the Supabase guest id stays the Adapty customer id.
5. **Paywall**: one catalog from the placement, no trial/no-trial arm assignment (remove the ADR 0078/0079 arm logic and `OnboardingOfferPort` usage if nothing else needs it). Keep the current look; keep Restore, Terms and Privacy. Purchase `pending` shows "Waiting for approval" and stays put. `failed` shows a retry message. A successful purchase with access still `checking` shows a short "Confirming your purchase…" state with Restore, never the paywall again.
6. **Delete** what the new design makes dead: `ServerSubscriptionAdmission`, `PurchaseRecoveryJournal`, purchase preflight, admission leases, `rememberedAdmission`, the arm/offer assignment code, and their exports and uses. Grep until nothing references them. Leave the server route in place (phase 3 changes the server); the app just stops calling it.
7. **Dev harness**: update the fakes (`dev-harness`) to the new port so `./excer demo` scenarios and proofs still run. Keep scenario names where they still make sense; delete scenarios that only exercised removed admission/recovery behavior and remove their proof blocks from `.agents/skills/verify-excerlock/references/features/*.md`.
8. **Events**: keep these working through the existing analytics port, with the same names: `paywall_viewed`, `checkout_attempt_started`, `checkout_attempt_completed` (`outcome` = active/pending/cancelled/failed, plus vendor error code when failed), and add `restore_started` / `restore_completed` (`result` = active/none/failed). Telemetry must never be awaited by a purchase. Make sure the telemetry allow-list actually lets these through.
9. Keep Variant A subscribers working: any product mapped to the `premium` access level counts.

## Done means

- `./excer check` passes (run it from the worktree root).
- `rg` shows no remaining references to the deleted modules.
- One commit (or a few) on `rebuild/payments-auth` with clear messages ending in `Co-Authored-By: GPT-6.1-Sol <noreply@openai.com>`.
- Write `docs/plans/payments-auth-rebuild/phase-1-report.md`: what changed, files deleted and added, line counts before and after for `subscription`, `journey`, `paywall`, anything you were unsure about, and which `./excer prove` proofs should be rerun. Do not run simulator proofs yourself; the lead runs them.
