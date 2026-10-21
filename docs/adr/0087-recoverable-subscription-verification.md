---
status: accepted
date: 2026-10-20
---

# 0087: Retry subscription verification without trapping a signed-in account

## Decision

An unknown StoreKit app environment is a retryable observation, never a launch-long admission adapter. Resolve the verified environment again when admission is requested; share concurrent resolution, make at most two bounded attempts per check, and retain a successful environment for the process. Production still selects only the Production API; Sandbox still selects only `/testflight`. Neither an unknown environment nor a local Entitlement grants admission. This supersedes only ADR 0052's startup-only resolution and permanent failure behavior.

A successful sign-in can open the Paywall when admission is unavailable and there is no unfinished purchase. This is navigation, not admission. A known empty subscription profile with no remembered admission can offer checkout. Unknown or previously paid access instead offers verification retry and Restore purchases before another checkout. An unfinished purchase always stays in purchase recovery, blocks another checkout, and clears only under ADR 0086's transaction-specific restore and independent account-bound admission rules. Wrong-account or wrong-environment responses never grant access.

Retry restarts identity setup, environment resolution, or admission as needed. Verification keeps a visible screen and ignores duplicate submits. Failures emit only a bounded reason code and operation context to Sentry and the new `subscription_verification_failed` analytics event; no credentials, receipts, provider payloads, activity, location, health or Screen Time data are reported.

A temporary protected-Keychain error never means an absent or corrupt session. Wait while the app is inactive, then retry the same storage operation after foregrounding. Keep existing Keychain accessibility and storage keys. Do not create an anonymous replacement, clear remembered sign-in, or delete the stored session because the device is locked. Foreground storage that remains unavailable retains the recoverable startup retry.

Paywall prices state the full billed amount and billing period prominently; trial copy leads with that amount and includes automatic renewal/cancellation terms. Account/help and an exit to Welcome stay reachable during plan-load failure. Neither exit opens protected routes.

## Context

App Review rejected 1.0.2 build 22 with the verification-error screen after Apple authentication succeeded on both review accounts. The original runtime resolved StoreKit once and bound `unavailableSubscriptionAdmission()` on a null result. Every subsequent retry returned unavailable without another environment lookup or HTTP request. Separately, every Journey verification exception was swallowed into the same screen, including API errors, identity readiness timeouts and recovery failures. Simulator and adapter evidence is recorded in the linked investigation. These paths are reproduced; Apple's exact initiating failure remains unproven because the old path emitted no diagnostic reason and request logs are unavailable.

Build 21's source already required explicit sign-in after purchase and on Welcome's sign-in route. The live 1.0.2 review notes incorrectly describe optional sign-in. Making login optional for protected use would change canonical-account admission and returning-account policies across identity, subscription and launch. This fix preserves those security rules and corrects the draft notes. Guideline 5.1.1(v) remains an owner decision: on-device Conditions do not inherently need an account, so anonymous, independently verified paid admission is recommended as a separate policy change, not represented as fixed by allowing access to the Paywall.

## Consequences

A transient environment or API failure cannot permanently poison the launch, and a new account can continue toward purchase without granting unverified Home access. Existing purchase hints and unfinished transactions remain conservative to avoid a second charge. Real Apple authorization on iOS 27 and actual Sandbox/Production StoreKit behavior still require signed physical-device verification. JavaScript changes can target runtime 7 without a native rebuild; other runtimes need compatible backports.

## References

- [ADR 0052](0052-verified-store-environment-selects-authorization-lane.md): environment routing retained, startup-only failure policy superseded here.
- [ADR 0050](0050-hard-paywall-journey-and-account-bound-admission.md): account-bound paid admission retained; unknown verification may navigate to the Paywall without admission.
- [ADR 0061](0061-stay-signed-in-and-admitted-across-launches.md): remembered sign-in/admission retained.
- [ADR 0086](0086-verified-account-recovery-and-checkout-connection.md): unfinished purchase ownership retained.
- [App Review investigation](../plans/2026-10-20-review-221-recovery.md).
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), sections 2.1, 2.3.1, 3.1.2 and 5.1.1(v).
