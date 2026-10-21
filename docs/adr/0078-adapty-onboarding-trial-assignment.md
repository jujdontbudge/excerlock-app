---
status: accepted; assignment superseded by 0079
date: 2026-10-13
---

# 0078: One Adapty offer determines the onboarding tail and checkout

## Decision

The arm assignment below is superseded by [0079](0079-install-split-onboarding-trial-assignment.md); the rest stands.

Adapty owns the trial versus no-trial experiment on `onboarding`, with a 50/50 A/B test. Each localized remote config must contain a JSON boolean `trial`: `true` for A and `false` for B. B is accepted only with exactly the approved Variant A monthly and annual `.notrial` twins and no introductory offer. Missing, malformed, failed or late assignments fall back to A. Product eligibility never assigns B.

Before fetching the experiment the client uses the already-shipped SDK profile update API to set the non-sensitive numeric custom attribute `onboarding_offer_version: 1`. The experiment audience requires this attribute; its All Users/default audience remains A. This limits B to profiles that have run the updated client during ordinary rollout. The marker persists across a rollback and can be shared by an account on multiple devices; it is not a per-request version attestation. Disable B before a JavaScript rollback and validate these audience edge cases. A marker update failure follows the A fallback, without waiting on the first frame.

Prefetch starts in the background on entry to Onboarding. Navigation freezes the offer synchronously before entering `S3e`, or on entry to a resumed trial step. Nothing awaits this fetch before painting or advancing. The same response, product handles and variation are retained for checkout and Adapty's paywall impression. A late response cannot replace them. A fallback fetch uses the control-only `onboarding_trial_fallback` placement, which must serve A without an experiment. Superseded adapter requests cannot overwrite the active product handles. Identity changes invalidate the session. A cold launch starts a new session; a persisted `S3c` or `S3d` keeps A to finish the existing trial promise.

B skips exactly `S3c` (the free Premium preview, currently headed “We want you to try ExcerLock Premium for free”) and `S3d` (“We'll send you a reminder before your trial ends”). It retains `S3e` (“Become the best version of yourself”), the research, rating and Condition demo. Its paywall has ordinary billing, Continue, no trial switch and no trial wording. A keeps the existing switch between the trial plans and their no-trial twins. A with a known unavailable introductory offer skips the two unavailable trial promises but remains arm A; its paywall has ordinary billing. Unknown eligibility uses the normal A fallback.

Trial length comes from the returned free-trial phase's `subscriptionPeriod.numberOfUnits × numberOfPeriods`, with day/week conversion and a three-day fallback for absent or invalid metadata. Calendar-month/year trials use the current calendar duration for the preview timeline. The reminder is always one day before the verified `accessExpiresAt`; its identifier remains `trial_ending`. Three days therefore means Day 2 reminder and Day 3 billing. Preview copy, timeline, fake products and billing use the same offer shape. The app must continue to state a returned seven-day offer correctly during the transition before App Store Connect changes.

PostHog receives a consent- and identity-gated `onboarding_offer_exposed` UI event once when the frozen offer affects navigation or is displayed at the paywall, with `arm`, `source`, `intro_offer` and optional `variation_id`. `paywall_viewed` includes `offer_arm` and `offer_source`. This is not a PostHog feature flag and creates no `$feature_flag_called` exposure for this experiment. Adapty records the rendered variation's impression and purchases. The client PostHog boundary sends only client-owned registry events: Adapty-owned trial and subscription lifecycle events stay out, while the client-owned checkout and restore diagnostics (`purchase_started`, `purchase_failed`, `restore_*`, `subscription_verification_failed`) are sent. A blanket prefix block silently dropped those diagnostics from 2026-10-13 to 2026-10-21. Unknown introductory eligibility is reported as `unknown`, not eligible.

## Context

The owner requested a three-day trial and a no-trial arm on October 13. Existing seven-day copy and a two-day reminder would disagree with the new offer. Inferring B from a missing intro offer would misassign users who had already consumed the subscription group's one trial. Independently assigning the screens in PostHog and the products in Adapty would mix promises and checkout.

The bundled SDK supports remote configs, free-trial phases and placement fetches in the existing native surface. The implementation changes only JavaScript and documentation, preserving native modules, dependencies, runtime versions, storage schemas, notification IDs and account admission. It is compatible with runtime 4/build 17 and runtime 5/build 18. This is a skip of existing reviewed steps and selection of approved products, with no new PostHog flag or reachable native capability. Publication still requires the OTA ship gate for each runtime. The current checkout targets runtime 5 and the gate has no runtime selector; preparing and certifying a separate runtime-4-compatible payload is a lead-owned release prerequisite. Relabeling the whole runtime-5 bundle is unsafe.

## Consequences

The Adapty operator must create the control-only fallback placement before enabling B, include both trial plans and twins on A for its toggle, and use the twins alone on B. An invalid B catalog fails to A. If even the fallback cannot load, the paywall retains its ordinary first frame, Restore and legal links; Continue retries loading. It never grants access or sells mismatched handles. An outage cannot guarantee available StoreKit products; retry remains available.

The PostHog `onboarding_variant` rail can still vary other bundled steps, but Adapty now owns inclusion of `S3c` and `S3d`, and `S3e` stays before the trial/paywall tail. This supersedes only the independent trial-step dropping described in ADR 0032. A process-local session avoids a new persistence schema, but a relaunch can re-evaluate the Adapty placement before the offer freezes. Real Sandbox purchase, attribution and cross-runtime OTA installation require lead verification; scripted SDK proofs do not certify them.

## References

- [Subscription setup and release order](../subscriptions.md#three-day-trial-versus-no-trial-experiment).
- `app-next/src/packages/subscription/createOnboardingOffer.ts`, `trialOffer.ts`, `AdaptySubscriptionAdapter.ts`.
- `app-next/src/packages/onboarding/lib/flow.ts`, `useOnboarding.ts`, `app-next/src/packages/paywall/lib/PaywallScreen.tsx`.
- `app-next/src/packages/notifications/notificationPlan.ts`.
- [0032](0032-posthog-flag-consumers.md), partly superseded here; [0043](0043-sign-in-and-permissions-after-the-paywall.md), [0050](0050-hard-paywall-journey-and-account-bound-admission.md), [0061](0061-stay-signed-in-and-admitted-across-launches.md), [0066](0066-onboarding-stages-several-conditions.md) and [0068](0068-ota-ship-gate.md), accepted and otherwise unchanged.
