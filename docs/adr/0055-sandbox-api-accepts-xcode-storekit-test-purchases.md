---
status: accepted
date: 2026-09-30
---

# 0055: The Sandbox API accepts pinned Xcode StoreKit test purchases

## Decision

The isolated TestFlight Sandbox API process (ADR 0051) also admits a purchase made in Xcode's local StoreKit test store. A Sandbox-configured client sends the device's current Xcode-environment entitlement JWS as `{ storeKitTestTransaction }` with `POST /v1/subscription/resync`. The server accepts it only when `XCODE_STOREKIT_ROOT_SHA256` is set and the process authorizes Sandbox. It then checks four things:
- the JWS is ES256;
- its `x5c` chain ends at the pinned "StoreKit Testing in Xcode" root;
- every link and the JWS signature verify;
- `bundleId` is ExcerLock, `environment` is `Xcode`, there's no revocation, and `expiresDate` is in the future.

A pass returns an active Sandbox authorization for the token's account; Adapty and the mirror aren't consulted. The Production process never reads the setting and still rejects any request body.

## Context

Apple's Sandbox can't complete purchases on the simulator ("Password reuse not available for account"). Adapty doesn't record Xcode test-store purchases. So a simulator purchase reached sign-in but always failed account admission. The normal pattern for a server-checked purchase in Xcode testing is to verify the signed transaction against Xcode's exported test certificate. We pin its SHA-256 instead of shipping the file.

## Consequences

The full purchase → sign-in → server admission → setup path now runs on the simulator against the real Sandbox API. It needs the app launched through Xcode with the StoreKit file (`app-next/scripts/storekit-sim.sh`).

The pinned root belongs to the Xcode StoreKit test certificate on Johan's Mac. A different Mac or a regenerated certificate needs a new pin. The transaction isn't bound to the account: anyone holding a valid test JWS signed by the pinned key can get Sandbox access. That's accepted because only this Mac holds the key, and Sandbox access was never revenue-bearing. Clear the setting to turn it off. This doesn't prove App Store Sandbox receipts, Adapty attribution or Production admission.

## References

- [ADR 0051](0051-testflight-sandbox-sidecar.md), [ADR 0052](0052-verified-store-environment-selects-authorization-lane.md)
- `server/src/packages/subscriptions/lib/xcodeStoreKit.ts`, `server/src/routes/subscription.ts`, `deploy/excerlock-api-testflight.service`
- `app-next/modules/excerlock-store-environment/`, `app-next/src/packages/subscription/ServerSubscriptionAdmission.ts`, `app-next/storekit/README.md`
- [Setting up StoreKit Testing in Xcode](https://developer.apple.com/documentation/Xcode/setting-up-storekit-testing-in-xcode)
