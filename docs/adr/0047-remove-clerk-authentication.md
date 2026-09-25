---
status: accepted
date: 2026-09-24
---

# 0047: Remove Clerk authentication from the API

## Decision

The API accepts only Supabase JWTs. The Clerk and dual auth modes, the Clerk JWKS lookup, `CLERK_SECRET_KEY`/`CLERK_ISSUER`, the Clerk user-deletion call and the `409 ACCOUNT_DELETION_PROVIDER_UNSUPPORTED` branch are removed. The `users.clerk_deleted_at` column and historic `auth_provider` values stay, because the schema is an invariant and readiness checks the column.

## Context

ADR 0011 made the Supabase UUID the canonical identity and kept Clerk as a legacy path during migration. A read-only production check on 2026-09-24 found no `CLERK_*` variables in `/etc/excerlock/env` (names only), 0 of 139 `users.id` values that are not UUIDs, and no `auth_provider = 'clerk'` rows. The legacy path had no users, but every request still paid for its mode resolution, and deletion carried a provider branch that could never run.

## Consequences

Auth is one code path: HS256 with `SUPABASE_JWT_SECRET`, or JWKS derived from `SUPABASE_URL`. A Clerk token now gets `401` instead of being verified. Reintroducing another identity provider needs a new ADR. `./excer server smoke` covers the Supabase path with minted tokens, forged tokens and missing tokens.

## References

- [0011: Canonical identity and durable erasure](0011-canonical-identity-and-durable-erasure.md) (accepted; its Clerk legacy path is retired by this record).
- `server/src/packages/auth/auth.ts`, `server/src/packages/user-deletion/`.
