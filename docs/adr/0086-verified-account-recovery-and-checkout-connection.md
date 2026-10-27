---
status: superseded
date: 2026-10-20
---

# 0086: Verify the selected account once and reconnect unfinished purchases

## Decision

Continue with Apple, Google or email selects the account proved by that authentication. A different canonical UID is a valid recovery, including when this device already has a signed-in session. Save and deactivate the previous account's local data only after credentials succeed, reset SDK identities, then load the selected account through the serialized identity coordinator. Do not merge accounts, alias established PostHog people, or retry a consumed credential. Adding a login method remains a separate same-UID `linkWithApple` / `linkWithGoogle` operation.

Every email surface uses `signInWithOtp({ shouldCreateUser: true })` and verifies `type: email` once. This supports a new complimentary recipient and an existing account through the same code screen. Do not use `updateUser({ email })` for anonymous conversion: Supabase's auto-confirm setting can confirm the email without sending a code. A local challenge stores only email, checkout UID and resend/expiry times under the new `excerlock-next.email-challenge.v1` key; no code or credential is persisted there. It resumes after process death, expires after one hour, and is cleared after successful authentication, explicit dismissal, sign-out or deletion. A synchronous screen guard and adapter single-flight verification reject duplicate submits. Rate limits retain the current challenge and disable resend for the supplied interval.

When a pending purchase belongs to another UID, authenticating from its recovery flow authorizes an explicit StoreKit restore for the selected account after its identity spine is ready. This is the authenticated restore path permitted by ADR 0011 and ADR 0050. A restore response for the selected UID must include the checkout's active App Store original transaction in the same environment before rebinding its journal. The v1 journal gains an optional `storePurchase` object containing only the opaque original transaction ID and a Sandbox flag; its storage key and version stay unchanged. Old journals are read unchanged and can capture this identifier from the checkout profile before SDK logout. Missing or ambiguous ownership evidence keeps recovery open; an unrelated active target profile never proves transfer. No receipt, signed payload or credential is stored. Empty or failed restores retain unfinished purchase recovery. Server verification must independently admit the selected account in its store environment before the journal is cleared. A complimentary grant or a different paid entitlement alone cannot clear another UID's unfinished checkout. Unknown, delayed or rejected verification offers Retry and never another checkout. No client entitlement is copied between UIDs, and ordinary identify/sign-in without an unfinished checkout does not restore or transfer purchases.

Apple authorization requests the email scope, uses cryptographically random nonce bytes and passes the SHA-256 nonce to Apple and raw nonce to Supabase. Native unknown errors stay on the sign-in screen with retry and email alternatives; cancellation is silent. No automatic provider retry, sign-out or anonymous-account creation follows either failure.

## Context

Incident A's production Supabase account was email-confirmed at 02:46 UTC on October 18, before the later failed reauthentication. A successful code for another UID was consumed, then rejected by the same-UID guard. Reusing it produced `OTP_INVALID`; the recovery action was absent from the code screen. Production also reports `mailer_autoconfirm: true`, so the anonymous conversion implementation could wait for a code never sent. An empty API `users.email` field does not establish whether the Supabase account has a confirmed email.

ADR 0049's same-UID reauthentication requirement was superseded by ADR 0061, while its guard remained in the adapter. ADR 0011 already permits existing-account recovery and requires proof before ownership moves. ADR 0077 requires complimentary recipients to authenticate before or after registration. Requiring a second OTP or native prompt after verified credentials causes avoidable failures and can consume the first credential. Keeping the same-UID guard for explicit login-method linking preserves that operation's different meaning.

Incident B exposes Apple's native `ERR_REQUEST_UNKNOWN`; Expo maps both unknown AuthenticationServices errors and unrecognized native errors to that code. It does not identify an entitlement, Apple service outage, OS defect or nonce fault. Physical iOS 27 reproduction and signed-artifact verification remain necessary to identify that native cause.

## Consequences

A newly verified email may select a new UID rather than convert the checkout UID. The user's pending purchase is restored through the vendor and independently verified by the API, while local account archives stay separate. Adapty's real restore ownership policy and webhook delivery are physical-device release gates; scripted adapters do not establish them. A vendor outage or empty restore can leave a paid user on recoverable verification instead of granting unverified access or risking another charge.

No server contract, production configuration, native module, entitlement or grant policy changes. Existing same-UID users keep their account and subscription. Complimentary access still uses only the confirmed Supabase administrator email and never a local profile email.

## References

- [ADR 0011](0011-canonical-identity-and-durable-erasure.md): accepted, email conversion choice superseded here.
- [ADR 0049](0049-explicit-sign-in-on-every-cold-launch.md): already superseded by [ADR 0061](0061-stay-signed-in-and-admitted-across-launches.md).
- [ADR 0050](0050-hard-paywall-journey-and-account-bound-admission.md): accepted with later launch-policy changes; authenticated restore and server admission retained.
- [ADR 0077](0077-email-complimentary-access.md): accepted; new recipients can authenticate from Welcome.
- `app-next/src/packages/identity/`, `app-next/src/packages/subscription/PurchaseRecoveryJournal.ts`, `app-next/src/packages/journey/index.ts`.

The two additional Incident B rows are separate anonymous first sessions: their Supabase session user agents report Darwin 25.5 and 25.4, versus Darwin 27.0 for the failing Apple user, and all three have different network hashes. They cannot be attributed to that Apple attempt from temporal proximity. An anonymous API user is provisioned before analytics identification by design; closing the app or blocking analytics between those steps can leave a valid API row with no PostHog events. Native Apple failure itself has no account-creation call.

Superseded by [ADR 0091](0091-guest-first-accounts-and-adapty-access.md).
