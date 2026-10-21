---
status: accepted
date: 2026-09-30
---

# 0052: Verified StoreKit app environment chooses one authorization lane

Startup-only resolution is superseded by [ADR 0087](0087-recoverable-subscription-verification.md). Environment verification and server partitioning remain required.

## Decision

A production-channel iOS binary uses StoreKit's locally verified `AppTransaction.shared.environment` to select one account-bound verification backend at startup. Verified `production` selects the Production API root; verified `sandbox` selects the separate `/testflight` Sandbox API process. An unverified, unavailable, unknown, Xcode or timed-out result selects neither: paid app admission fails closed, while account/privacy and purchase recovery stay accessible. Neither the client HTTP request nor a cached Adapty profile supplies an environment or access claim to the server.

Preview/TestFlight diagnostic binaries remain explicitly Sandbox-configured as before. This decision covers the single production-channel binary submitted for App Review and subsequently delivered through the App Store. TestFlight/App Review transactions are Sandbox; actual App Store transactions are Production. Backend processes independently enforce their configured partition and verified Supabase token subject. No OTA may change this selection rule for an already reviewed binary.

## Context

Build 16 paired a Sandbox-configured Preview client with a separate Sandbox API process, repairing the internal TestFlight endpoint mismatch. It cannot be released publicly: a permanent Sandbox selection would reject real App Store purchases. Conversely, a permanent Production selection would reject App Review's Sandbox transactions. `AppTransaction.shared` supplies Apple's signed app-distribution environment without guessing from a receipt URL or accepting a client-provided backend environment field. iOS deployment target is 17.4, above this API's availability.

## Consequences

The startup selection is process-local and read-only; an unknown result never grants Home. A native code change requires a new signed binary and on-device StoreKit verification. A physical TestFlight/App Review Sandbox transaction and a post-release Production transaction still require separate acceptance evidence; simulator fixtures and a signed IPA prove neither. A modified client can call a public Sandbox endpoint, but it cannot cause the Production endpoint to authorize Sandbox; server account-bound subscription proof remains independently required.

## References

- [ADR 0050](0050-hard-paywall-journey-and-account-bound-admission.md)
- [ADR 0051](0051-testflight-sandbox-sidecar.md)
- [Apple AppTransaction.environment](https://developer.apple.com/documentation/storekit/apptransaction/environment)
- `app-next/modules/excerlock-store-environment/`, `app-next/src/packages/platform/subscriptionBackend.ts`
