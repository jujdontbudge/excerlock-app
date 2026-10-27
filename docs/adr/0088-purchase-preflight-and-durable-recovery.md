---
status: superseded
date: 2026-10-21
---

# 0088: Retry purchase preflight and preserve uncertain checkout recovery

## Decision

Retry transient Adapty activation, identification, profile reads, placement/product reads and explicit restores at most twice, after 300 ms and 900 ms. Every identity-bound attempt rechecks the canonical generation. A failed activation releases the process-local promise so a subsequent user action can retry. The legacy onboarding audience attribute is best-effort; it cannot veto loading plans.

Do not automatically resubmit `makePurchase`. A failure before that call can release the checkout journal. After calling it, retain the journal and attribution intent unless the SDK reports a definite cancellation, pending approval or a known pre-transaction restriction/configuration/product failure. Pending approval retains the recovery journal but drops the attribution intent, preserving ADR 0084's accepted Ask to Buy attribution policy. An interrupted response, an unknown error, a profile change, response encoding/decoding/persistence errors, and ambiguous network failures retain recovery and intent. A returned successful transaction is recorded for the checkout account before checking whether the live identity changed. That observation never admits another account.

An Adapty code alone does not establish whether Apple charged. In the pinned iOS SDK 4.0.2, backend validation of a verified purchase falls back to a success profile, but an unverified StoreKit transaction can also become error 2005. The native plugin can also report 2009 while encoding a successful purchase response. Therefore 2005 and 2009 thrown by `makePurchase` retain recovery; a 2005 from activation or a placement read is safe to retry. Restores reconcile an uncertain checkout without submitting a second purchase. Unknown or empty recovery remains subject to ADR 0086 and cannot be cleared merely to enable checkout.

Serialize journal mutations, persist each mutation before publishing it, and keep the last committed state on failure. A failed read or write must not poison later attempts. Keep the existing v1 storage key and shape. A failed clear retains recovery; a failed confirmation retains the durable pending operation. Neither failure grants admission.

Use the analytics registry's client ownership to decide which events the client can capture. Checkout intent/failure, restore diagnostics and verification failures remain client-owned. Adapty retains sole ownership of revenue/subscription lifecycle events under ADR 0084. Consent, canonical identity and generation gates remain mandatory for capture.

## Context

The payment incident exposed error 2005 on a path with a pre-StoreKit dependency, with only `paywall_error` visible. The failed endpoint itself was not established. The adapter permanently cached rejected activation promises. A legacy prefix filter dropped registered client events such as `purchase_started`, `purchase_failed`, all restore diagnostics and `subscription_verification_failed`. Historical source checkouts and the incident's build 21/22 event pattern are consistent with that filter; the signed build artifacts were not inspected. Every thrown purchase error also cleared recovery, including errors after a possible charge. Journal writes were chained only on fulfillment, so one storage failure prevented every subsequent write or clear in the process; clear published `none` before removing the durable record.

The owner's incident brief authorizes robustness fixes with existing copy, on an isolated branch. The Paywall close/reset and integration-identifier blockers are being fixed separately and are not changed here. No SDK upgrade or native rebuild is included.

## Consequences

Transient preflight failures recover without a relaunch and uncertain paid operations retain their original checkout. A device/storage or vendor outage can still leave recovery unresolved; another checkout is intentionally blocked until transaction-specific restoration and independent account admission succeed. This preserves the paid-account boundary and avoids treating a network error as proof of nonpayment.

Proofs exercise the production adapter, production analytics adapter and journal with scripted dependencies. Real Apple payment sheets, transaction verification, Ask to Buy delivery, iOS 27 and vendor ownership transfers still require a signed physical device. No copy or design changes are included. Existing recovery behavior is visible in the proof screenshots and requires owner review before release under the incident brief.

## References

- [ADR 0086](0086-verified-account-recovery-and-checkout-connection.md), transaction-specific restore and admission retained.
- [ADR 0087](0087-recoverable-subscription-verification.md), verification recovery retained.
- [ADR 0084](0084-ad-attribution-one-owner-per-event.md), event ownership retained.
- [Purchase incident audit](../plans/2026-10-21-purchase-path-audit.md).
- [Adapty SDK error handling](https://adapty.io/docs/ios-sdk-error-handling).
- [Pinned StoreKit purchaser](https://github.com/adaptyteam/AdaptySDK-iOS/blob/4.0.2/Sources/StoreKit/StoreKitPurchaser.swift).
- [Pinned error mapping](https://github.com/adaptyteam/AdaptySDK-iOS/blob/4.0.2/Sources/Errors/CustomAdaptyError.swift).
- [Apple pending purchase result](https://developer.apple.com/documentation/storekit/product/purchaseresult/pending).

Superseded by [ADR 0091](0091-guest-first-accounts-and-adapty-access.md).
