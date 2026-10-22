---
status: accepted
date: 2026-10-22
---

# 0090: Correlate client checkout attempts without billing events

## Decision

The subscription adapter owns three client diagnostic events: `checkout_attempt_started`, `checkout_stage_recorded`, and exactly one `checkout_attempt_completed` for each accepted, completed purchase or restore call. A fresh 12-character random hexadecimal `attempt_id`, unrelated to identity, transactions or the durable recovery operation, joins them. Every event carries operation, placement and plan ID; restore uses `none`. The registry declares all transmitted properties and client ownership.

Record entry and outcome at the awaited identity, recovery journal, integration attachment, StoreKit, result and local entitlement-verification boundaries. Integration attachment remains bounded and best effort; its stage can fail or time out without failing checkout. `makePurchase` is never automatically retried. Restore retains its existing bounded retry policy within one attempt. Rejected concurrent calls create no attempt because no checkout is accepted.

Purchase completion reports `success` when StoreKit returns success, even if subsequent journal confirmation or profile publication fails. Preserve that later failure's stage separately. `cancelled`, `pending`, `already_subscribed` and `failed` are the other purchase outcomes. Restore distinguishes a known empty profile (`not_found`) from transport, authentication and profile/ownership verification failures. An SDK no-purchases code also reports `not_found`, without changing the existing return/throw or recovery behavior. Local profile status never proves account-bound paid admission. No new billing, revenue, price, currency, receipt or transaction event is emitted. Adapty retains authoritative subscription lifecycle and revenue ownership; existing Meta/TikTok attribution is unchanged.

Observe React Native AppState only while `makePurchase` is in flight and always remove the listener at settlement. `sheet_observation: inactive` is an iOS payment-sheet proxy, not confirmation of Apple's UI: unrelated interruptions can also cause inactive, and no observation is inconclusive. Distinguish not called and unavailable observation. Measure StoreKit-call and full-attempt durations with a monotonic clock, rounded to milliseconds and capped at one day. Restore timing includes SDK retries; its sheet observation is unavailable because purchase-sheet observation does not apply.

Allow only numeric integer Adapty `failure_code` values from 0 through 9999 and bounded stage, outcome and failure-kind enums. Unknown codes are omitted; no vendor messages, emails, tokens, account IDs, health, location, step, gym or Screen Time details enter these events. Property names avoid `error` so the existing privacy scrubber retains the numeric codes. Analytics invocation is deferred, never awaited, and synchronous throws and rejected or unresolved tracking promises cannot alter checkout. Consent and canonical-generation gates remain in force.

## Context

Three real users received `user_cancelled` from seven Continue taps. The prior intent/failure events could not establish whether the SDK reached StoreKit, observed an inactive transition, or failed during preflight or verification. ADR 0088 restored the client ownership allow-list after a blanket prefix filter had dropped those diagnostics.

The registry migration retires active emissions of `purchase_started`, `purchase_failed`, `restore_started`, `restore_succeeded` and `restore_failed` in favor of the three attempt events. Historical PostHog event names and data are unchanged. Keeping legacy failure/success emitters alongside the new terminal would create two client terminals and let screen-level exceptions misreport a successful purchase. Screens retain their existing navigation, busy state, notices and error reporting.

## Consequences

Completed calls produce one client terminal, not an exactly-once ingestion guarantee. Process death, consent, identity changes, offline queues and vendor failures can leave an attempt incomplete or uncaptured. Attempt IDs stay process-local and are never persisted or reconstructed from recovery. Post-purchase sign-in and server admission remain separate; no local diagnostic admits a user or claims a charge occurred. Existing recovery and uncertain-charge handling are unchanged.

Focused simulator proofs inspect actual emitted events, including the production PostHog boundary, and independently derive correlation, terminal counts, property safety and timing in `/dev`. Scripted inactive observations exercise subscription instrumentation but cannot prove Apple's real sheet behavior; that requires a signed physical-device purchase. No native dependency or runtime change is needed.

## References

- [0078](0078-adapty-onboarding-trial-assignment.md), diagnostic names superseded here; Adapty offer and billing ownership retained.
- [0084](0084-ad-attribution-one-owner-per-event.md), attribution and revenue ownership retained.
- [0086](0086-verified-account-recovery-and-checkout-connection.md), recovery and independent admission retained.
- [0087](0087-recoverable-subscription-verification.md), verification policy retained.
- [0088](0088-purchase-preflight-and-durable-recovery.md), retry and uncertain-charge policies retained.
- `app-next/src/packages/subscription/CheckoutDiagnostics.ts`, `AdaptySubscriptionAdapter.ts`.
- `packages/analytics-events/src/events/paywall.ts`, `packages/analytics-events/README.md`.
- `.agents/skills/verify-excerlock/references/features/paywall.md`.
