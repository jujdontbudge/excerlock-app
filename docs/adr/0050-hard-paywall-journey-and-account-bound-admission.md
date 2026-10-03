---
status: accepted
date: 2026-09-29
---

# 0050: Welcome-first hard Paywall and account-bound admission

Partly superseded by [ADR 0061](0061-stay-signed-in-and-admitted-across-launches.md): cold launches resume a remembered account, and the last server-verified admission is remembered on the device.

## Decision

Every cold app launch starts a new Journey at the first Onboarding page, including an admitted subscriber reopening after force quit. A user chooses the entire Onboarding → Paywall → purchase/restore → authentication → needed Setup path, or explicitly signs in from Welcome. An existing subscriber may use Sign in from Welcome; only that explicit authentication plus verified eligible account-bound subscription may enter the app. Saved Setup, local session labels, a cached Entitlement, and a paid receipt on the same phone are not admission by themselves. Cold-launch reset clears only process-local Journey admission and does not erase accounts, Conditions, History, profile, saved permissions, native schedules, or unfinished transaction recovery. Account deletion, purchase restoration, support and legal access remain outside the paid routes.

A purchase before authentication must be recoverable and connected to the selected canonical account. Existing accounts can be selected; a same-device different UID is not inherently an error. Moving a subscription between two established accounts does not merge their personal data. Automatic sharing of one subscription across arbitrarily many accounts is not the proposed policy.

Fresh admission uses authenticated `POST /v1/subscription/resync`. The verified Supabase token is the only account input. The server reaches Adapty, then reads only the environment-stamped webhook mirror partition selected by server configuration and returns the canonical account, selected environment, source observation time and server verification time. The client cannot submit an account, environment or access claim. Production authorization reads Production; TestFlight verification requires a separately configured Sandbox deployment. Missing, unknown, ambiguous or wrong-environment evidence denies admission. The Adapty profile aggregate remains read-only because its documented shape does not bind premium access to one store environment.

The response is an online account-bound mirror proof, not proof that the profile call itself supplied fresh StoreKit ownership. App admission may hold it only as a process-local lease capped by the subscription/grace boundary and five minutes from server verification; a failed refresh never creates or extends a lease. Webhook delivery, real restore/transfer behavior, and the isolated TestFlight backend remain acceptance and deployment gates.

Purchase recovery is separate from admission. Subscription owns the versioned local `excerlock-next.purchase-recovery.v1` journal, which stores only an operation kind, opaque operation ID, checkout canonical UID and timestamps. Pending or store-confirmed recovery survives process interruption, never grants Home, and blocks a second checkout until restore/reconciliation either clears it or authenticated account-bound verification succeeds. It contains no receipt, transaction payload, provider credential or activity data.

An OTA resume envelope is navigation continuity only. It is consumed once and cleared before navigation, and it can restore only an existing OTA-safe tab root after the current Journey independently admits the selected account. It cannot restore Identity, Entitlement, Journey admission, unlock routes or payment authority.

## Context

TestFlight build 14 implemented ADR 0049's explicit sign-in on launch but opened sign-in immediately for a returning install, then entered Home after authentication without an account-bound subscription check. ADR 0024 deliberately allowed post-Setup Home after lapse. Both conflict with the owner's explicit hard Paywall request. ADR 0043's payment-then-sign-in order remains the default full-Onboarding path; a Welcome sign-in is the shortcut for existing subscribers.

The ownership transfer policy, Adapty production/sandbox sharing settings, webhook delivery behavior, and same-device private-data isolation remain open implementation/release gates. The owner has explicitly settled ordinary cold reopens as Welcome-first on every cold launch; a cached admitted state must never resume Home.

## Consequences

A Journey package owns admission and the launch package consumes it. Identity and Subscription remain separate lower-layer concepts. An unknown verification state shows retry and cannot enter Home; lapsed premium routes are removed while privacy/account recovery stays available. Simulator proofs need negative route-history assertions and real receipt/account ownership fixtures. Signed real-device/provider/StoreKit, server-environment, and native Enforcement proofs are mandatory before describing a build as fixed.

No production settings, transfers, data, pricing or releases change by accepting this ADR. Foreground return in the same process remains operation continuity; it must not be confused with a cold process launch.

## References

- [Implementation and proof plan](../plans/hard-paywall-journey.md).
- ADR 0011 (canonical identity, still accepted), ADR 0024 (post-Setup account access, to be partly superseded), ADR 0043 (Paywall before Setup, still accepted), ADR 0049 (cold-launch sign-in gate, to be superseded).
- [Adapty access-sharing semantics](https://adapty.io/docs/general), [RevenueCat restore behavior as comparison](https://www.revenuecat.com/docs/projects/restore-behavior), [Apple App Review requirements](https://developer.apple.com/app-store/review/guidelines/).
