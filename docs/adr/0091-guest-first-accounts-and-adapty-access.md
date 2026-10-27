---
status: accepted
date: 2026-10-27
---

# 0091: Guest-first accounts, Adapty decides Premium

## Decision

Every install starts as a guest: a Supabase anonymous account with a real user id, created at launch. People buy, onboard and use ExcerLock as that guest. Signing in is never required.

"Save your account" adds Apple, Google or email to the same user id. Apple and Google link their native ID token with `linkIdentity`. Email sends a code to the new address with `updateUser({ email })` and confirms it with `verifyOtp` type `email_change`, then refreshes the session. The id does not change, so the purchase, Conditions and progress stay where they are.

If that identity already belongs to another account (`identity_already_exists`, `email_exists`), the app asks first. Only "Sign in to my account" switches: it signs in with the same credential (or an email code with `shouldCreateUser: false`), then identifies the account in Adapty and refreshes access. The guest's Conditions and onboarding progress carry to the account when it has no data on this iPhone. Welcome's Sign in uses the same flow without the question, because the person said they already have an account. Sign out and Delete account reset onboarding and start a fresh guest.

Adapty on the phone is the only judge of Premium: `profile.accessLevels.premium.isActive`, cached in the `entitlement` store, with "unknown" treated as "checking", never as unpaid. An auto-renewing profile whose renewal date passed while offline keeps access for three days. Complimentary Premium from `POST /v1/subscription/resync` adds to it and is kept on the device until its expiry or another account. The server never blocks access; it keeps webhooks for support and revenue. Adapty's "Sharing paid access between user accounts" stays enabled, so an Apple ID's purchase unlocks whichever ExcerLock account is on that iPhone.

## Context

From September to October 2026 payments and sign-in grew to about 200 commits and 17 ADRs: forced sign-in on every cold launch (0049), server-bound admission with leases (0050, 0059, 0061, 0087), a purchase journal and preflight (0088), verified account recovery (0086) and install-split trial arms (0078, 0079). On 24 October a trial buyer was forced to sign in, landed on a new account through email `signInWithOtp` with account creation on, the server answered "unknown", the app retried into its own rate limit and sent a paying customer back to the Paywall. They cancelled. The causes were the forced sign-in, an email path that created new accounts, provider sign-in that switched accounts silently and wiped guest Conditions, and an admission gate that failed closed on its own errors.

Plan: `docs/plans/payments-auth-rebuild/README.md` (decisions D1–D7, decided 2026-10-26; D5 keeps Google). Apple guideline 5.1.1(v) also favours not requiring an account for features that do not need one.

Alternatives considered: keep server admission with better retries (it remains a second judge that can disagree with Adapty); require sign-in before checkout (the Oct 24 failure mode).

## Consequences

- One judge of Premium and no forced sign-in. A paying guest never sees sign-in on the way to Home.
- A guest who never saves loses the account on reinstall. Restore purchases still finds an Apple ID's purchase through Adapty access sharing, but Conditions and history do not come back.
- Supabase must allow anonymous sign-ins and manual identity linking, and its "change email" template must send the six-digit `{{ .Token }}`.
- Real Apple ID, Google and email delivery are verified on a real iPhone; the simulator lab scripts Supabase and StoreKit.
- Follow-up: Phase 3 removes the server admission route as a gate and adds the account and access events from the plan.

## References

- Code: `app-next/src/packages/identity/lib/SupabaseAuthAdapter.ts`, `identity/lib/identitySync.ts`, `identity/SignInScreen.tsx`, `runtime/AccountDataCoordinator.ts`, `journey/index.ts`, `subscription/AdaptySubscriptionAdapter.ts`.
- Proofs: `.agents/skills/verify-excerlock/references/features/account.md`, `paywall.md`, `launch.md`.
- Supersedes: [0043](0043-sign-in-and-permissions-after-the-paywall.md) (sign-in part), [0049](0049-explicit-sign-in-on-every-cold-launch.md), [0050](0050-hard-paywall-journey-and-account-bound-admission.md), [0059](0059-admission-renews-in-place.md), [0061](0061-stay-signed-in-and-admitted-across-launches.md), [0078](0078-adapty-onboarding-trial-assignment.md), [0079](0079-install-split-onboarding-trial-assignment.md), [0086](0086-verified-account-recovery-and-checkout-connection.md), [0087](0087-recoverable-subscription-verification.md), [0088](0088-purchase-preflight-and-durable-recovery.md).
