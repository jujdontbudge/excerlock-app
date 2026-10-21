---
status: accepted
date: 2026-09-10
---

# 0011: Canonical identity, provider linking, and durable erasure

Email anonymous conversion is superseded by [ADR 0086](0086-verified-account-recovery-and-checkout-connection.md); the remaining identity and erasure decisions stay accepted.

## Decision

Use canonical Supabase anonymous identity as the shared VPS, Adapty and PostHog ID. A bounded boot may
show offline UI with a separately represented provisional identity, but purchases, restores and
person-bound exposures wait for canonical auth, VPS provisioning, analytics identification, Adapty
identification and integration-identifier attachment. One serialized coordinator owns that ordering.
Never upload provisional IDs as if they were Supabase users or manufacture a UUID merge.

Link a NEW Apple/Google provider using Supabase's supported native ID-token `linkIdentity` overload.
Email anonymous conversion uses `updateUser({email})` and the corresponding email-change verification.
Normal existing-account recovery adopts the existing account UID. Preserve local rules; do not alias
established analytics people or transfer paid ownership without an authenticated migration/restore path.
Permanent-account sign-out creates a fresh anonymous user; already-anonymous sign-out may be a no-op.

Account deletion is an authenticated, idempotent server operation. Preserve the existing durable
prepare/tombstone -> Adapty erasure -> PostHog erasure -> auth-provider deletion-last workflow and add
retry handling that survives invalidated auth credentials. Migrate provider-specific checkpoint fields
explicitly. Client logout/reset is not remote erasure. Retain authentication for retries until server
acceptance, then clear account-local data/enforcement and bootstrap a new anonymous identity.

## Context

The installed auth-js 2.116.0 implements both OAuth and ID-token linkIdentity overloads. Plain
signInWithIdToken creates/recovers a session; it does not preserve the anonymous identity. The original
ship spec also assumed a permanent user could be signed out while retaining that authenticated UID,
and ordered auth deletion before a separate VPS request. Those assumptions cannot provide the claimed
ownership or retry guarantees. The current server verifies Clerk-only JWTs and already has durable
vendor deletion checkpoints; Supabase client integration alone cannot authenticate its existing routes.

## Consequences

Introduce provider-neutral verified request identity with configured Supabase issuer/audience/JWKS,
strict expiry/algorithm checks, anonymous support and tombstone enforcement. Keep secrets exclusively
in secure session storage/server environment. Auth callbacks and identity operations require generation
guards; late requests cannot restore a deleted identity. An offline user keeps local usability but has
a visible retry path before monetization. Existing-account migration requires proof of both identities,
not a caller-supplied source UID. Deletion failures remain visible and durably retryable.

Same-UID acceptance applies to new provider linking, not existing-account recovery or permanent sign-out.
Device Apple/Google/email provider activation, anonymous StoreKit attribution and vendor erasure remain
end-to-end verification gates; SDK source and unit tests are necessary but insufficient evidence.

## References

- [Supabase anonymous auth](https://supabase.com/docs/guides/auth/auth-anonymous), manual linking/email conversion.
- Installed `@supabase/auth-js/src/GoTrueClient.ts`, ID-token linkIdentity implementation.
- Existing `server/src/userDeletion/` durable deletion implementation.
- `plans/ship/04-identity-and-money.md`, `plans/ship/T04-supabase-auth.md` (corrected contract).
