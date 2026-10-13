---
status: accepted
date: 2026-10-13
---

# 0077: Audited complimentary access by confirmed email

## Decision

The API owns complimentary Premium grants separately from the Adapty subscription mirror. Operators use `./excer access grant|revoke|list`; each grant and revocation records an actor, timestamp and note. Grants may precede account creation and may expire. The server's configured authorization environment selects the grant partition; a Sandbox grant cannot authorize Production or the reverse. The Production VM holds both partitions, so writing either there changes production data and requires explicit authorization.

Emails are trimmed and lowercased, with dots and plus tags preserved. Only Supabase's current administrator user record supplies the email: the canonical ID must match, `is_anonymous` must be false and `email_confirmed_at` must be a valid timestamp. JWT subject remains the only account input. Client bodies, `users.email`, user metadata and provider labels cannot select a grant. Apple Hide My Email matches only its confirmed relay address. No email enters analytics or application logs; operator list output is private personal data.

`POST /v1/subscription/resync` checks a confirmed email grant before the existing paid verification. A matching grant returns an account-bound `active` authorization with source `complimentary` and the server-selected environment. It does not mutate Adapty, create a purchase, claim a trial, or change prices. An independently verified active paid mirror takes precedence, preserving the paid response and offline policy even when a grant also exists. Paid verification retains its environment mirror, Xcode fixture policy and ownership checks. A failed complimentary lookup does not block an independently verified paying user; it cannot revoke remembered complimentary access without an authoritative check.

The response adds source `complimentary` and optional `complimentaryAccessChecked`. Admission leases and remembered admission add optional source `complimentary`, retaining their existing keys and backward-compatible validation for paid records. The client applies this server-verified grant to the subscription package's single Entitlement store, so late empty Adapty profiles cannot erase complimentary access and Screen Time enforcement sees active access. Adapty's observed paid state is kept separately in memory; removing a grant falls back to that state. Source absence preserves paid behavior. If a grant is used during a paid vendor outage, an existing longer, account/environment-matched server-verified paid admission is retained without extending its dates; an active Adapty paid Entitlement also takes precedence over the grant.

Online leases retain the five-minute cap and existing foreground/in-place checks. An indefinite grant produces a rolling response expiry 24 hours after server verification; a finite grant uses the earlier of that boundary and its exact expiry. Complimentary admission has no three-day offline extension. Revoke or expiry denies complimentary access on the next successful check, clears its remembered admission and updates Entitlement; a valid paid subscription remains usable. If paid evidence is unknown, the protected app closes to verification instead of assuming the person can purchase safely. An offline device can retain the last grant until its response boundary, at most 24 hours. A reinstall requires fresh explicit sign-in, then rechecks the grant.

Account deletion anonymizes grants matched to the deleted canonical account, revokes them, clears their notes and audit notes, and keeps only opaque operational audit records. A pending grant that was never matched remains an operator-issued invitation. Grant and revoke serialize per normalized email/environment, and replacement grants preserve the previous audit history.

## Context

The owner needs free Premium for specific creators known only by email, using Welcome's existing Sign in and email code, Apple or Google. Existing Welcome sign-in already calls server admission, but the Adapty-only Entitlement would otherwise leave enforcement unavailable. A client allowlist would leak recipients, evade account verification and require an OTA for each recipient. Adapty manual access would still need an email-to-canonical-ID queue and does not replace the environment-stamped admission contract. Apple offer codes require store redemption. [Research](../research/2026-10-13-complimentary-access.md) describes the alternatives.

This extends the source/remembered-admission contracts from ADR 0050 and 0061 only for complimentary access. It does not change the StoreKit lane selection from ADR 0052 or ordinary sign-in mismatch and identity lifecycle protections. The client implementation is JavaScript-only and uses existing modules on runtimes 4 and 5.

## Consequences

Operators can grant before or after registration in one command, without third-party dashboard changes or sending email. Deploy the forward-only migration and server before the client OTA. Existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` enable confirmed-email lookup; there are no new production secrets or Adapty settings. The local operator command requires an explicit isolated database URL; the production command runs the deployed CLI under the service environment and sends recipient data through stdin rather than the remote command line.

Trade-offs: operational tables retain pending recipient emails until revoke/retention handling; explicit revocation retains an audit-recipient association until account erasure. A previously verified offline device may keep access for up to 24 hours. Real Apple/Google provider sign-in, signed runtime 4/5 OTA activation and physical Screen Time enforcement still require release evidence; simulator and local database proof do not establish those.

## References

- [ADR 0011](0011-canonical-identity-and-durable-erasure.md), [ADR 0022](0022-supabase-auth-lifecycle-quiescence.md), [ADR 0032](0032-posthog-flag-consumers.md): accepted; canonical identity, lifecycle and paid decisions remain.
- [ADR 0043](0043-sign-in-and-permissions-after-the-paywall.md): accepted; ordinary paid Setup ordering remains.
- [ADR 0050](0050-hard-paywall-journey-and-account-bound-admission.md), [ADR 0051](0051-testflight-sandbox-sidecar.md), [ADR 0052](0052-verified-store-environment-selects-authorization-lane.md), [ADR 0059](0059-admission-renews-in-place.md), [ADR 0061](0061-stay-signed-in-and-admitted-across-launches.md): accepted with the complimentary-source extension above.
- `server/src/packages/subscriptions/`, `app-next/src/packages/subscription/`, [operator workflow](../agents/access.md).
