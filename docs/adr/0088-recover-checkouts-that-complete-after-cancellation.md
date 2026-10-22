---
status: proposed
date: 2026-10-21
---

# 0088: Recover checkouts that complete after cancellation

## Decision

The nonvisual storage support is implemented on this branch. The callback integration that reveals the existing recovery action remains uncommitted for owner approval under the investigation brief.

Keep a nonblocking record of checkout attempts independently of the unfinished-purchase journal. The new `excerlock-next.purchase-attempts.v1` key stores version 1 and up to 16 attempts, each containing only the operation ID, checkout canonical UID, vendor product ID and start time. Keep the newest attempt for each account and product. A cancelled result clears the blocking journal and permits an immediate retry, but retains this record. A pending result retains both. A thrown purchase error removes its attempt. A successful or late-confirmed purchase retains the matching product until account admission clears recovery, so another profile cannot fill missing transaction metadata from an unrelated product. Storage failures are reported without preventing checkout.

A later Adapty profile may recreate purchase recovery only for the currently identified account and a matching active App Store product. Capture its original transaction identifier and environment flag when the subscription list supplies them; Xcode offline profiles have only access-level product metadata. Missing transaction metadata never authorizes a transfer to another UID. Serialize this with identity changes and subscription operations. Retain attempts across process death and retain attempts for another product when a user retries a different plan. Duplicate callbacks are idempotent. New tracked pending checkouts also require their matching product; existing journals without an attempt retain their compatibility path.

This record and local Entitlement are recovery hints, never admission. Continue through the existing authentication, transaction-specific restore when required, and independent account-bound subscription verification from ADR 0086. The existing journal key, version, ownership rules and server contract remain unchanged. No new cancellation copy, help prompt or automatic navigation is accepted by this decision; owner approval is required for a visible proposal.

## Context

Seven incident attempts returned Adapty `user_cancelled`. Build 17 and the current main purchase path clear the journal on that result. A later profile calls `confirm`, which cannot confirm a nonexistent journal. The Paywall calls its success continuation only after an immediate purchase/restore return or an explicit recovery action. A cancellation therefore loses the association needed to reconnect an interrupted checkout.

StoreKit cancellation is not proof of user intent. The incident timings and empty profiles do not distinguish a dismissal, authentication failure, unresolved payment interruption or an OS defect. The client recovery regression uses scripted profile callbacks through the production adapter; real-sheet evidence and remaining limits are recorded separately in the investigation.

The existing advertising purchase intent is unsuitable: it is a single conversion record, is dropped on cancellation, and has no authority to create admission recovery. Keeping every cancellation in the blocking journal would instead prevent the immediate retries seen in the incidents.

## Consequences

A matching checkout can reconnect after cancellation, Ask to Buy approval or process death, without blocking another purchase merely because someone closed a sheet. A bounded record can be evicted after enough later attempts; it cannot prove a charge, and StoreKit/Adapty delivery plus server verification remain external requirements. Existing Restore purchases remains available when no record survives. The historical runtime 4 bundle requires a compatible backport; this branch targets the current app.

## References

- [ADR 0050](0050-hard-paywall-journey-and-account-bound-admission.md): account-bound admission retained.
- [ADR 0086](0086-verified-account-recovery-and-checkout-connection.md): transaction-specific authenticated recovery retained.
- [ADR 0087](0087-recoverable-subscription-verification.md): verification retry retained.
- [Investigation](../plans/2026-10-21-storekit-cancellations.md).
- `app-next/src/packages/subscription/AdaptySubscriptionAdapter.ts`, `PurchaseRecoveryJournal.ts` and `lib/purchaseAttempts.ts`.
