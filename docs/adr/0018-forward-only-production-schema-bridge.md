---
status: accepted
date: 2026-09-10
---

# 0018: Bridge superseded production migrations without rewriting history

## Decision

Insert an unapplied compatibility migration after the latest actual production journal timestamp and
before the current identity migration. Renumber only the currently unapplied ship migrations and their
snapshot chain. Never delete, repair, or replace remote applied migration rows, nor rerun rewritten SQL
on the assumption that matching file indices imply matching database state.

On the legacy shape, conditionally restore the old Clerk checkpoint column name so the new migration
can introduce its provider-neutral checkpoint. Refuse ambiguous non-`user_` non-null legacy auth
checkpoints before mutation; a UUID alone does not prove a historic erasure belonged to Clerk. The
measured production UUID/null case stays provider-null until authenticated Supabase provisioning or
deletion supplies identity. Preserve existing users, rules, and orphaned sync tables.

Recreate the five feature/vendor tables dropped by the superseded migration using baseline contracts.
Do not invent lost historical rows. Readiness must check the current required tables, identity and
subscription columns, valid retry index, and environment-partitioned subscription/webhook primary keys,
not merely respond green because the old tables exist.

## Context

Read-only inspection found GCP-local PostgreSQL had applied the original first six migrations plus
superseded `0006_supabase_sync` and `0007_support_details_and_history`. Ship's rewritten0006 would add an
already-existing `auth_deleted_at` and reference a missing `clerk_deleted_at`; five current API tables
were also absent. Hosted Supabase's empty migration history is not evidence about this separate DB.
The live readiness response described old deployed code, not compatibility with ship code.

## Consequences

Prove both fresh migration and an upgrade from the exact legacy SQL/history before activation. Assert
preserved history/data and idempotent migration replay. Ambiguous identity data blocks migration for
explicit classification rather than silently assigning a provider. Catalog readiness is necessary but
not device or provider activation proof. Remote deployment remains release-locked and requires secret
readiness, verified source, and post-deployment schema/API health checks. No remote migration is
performed by this decision record.

## References

- `server/drizzle/meta/_journal.json`
- `server/drizzle/0006_legacy-production-bridge.sql`
- `server/test/migration-compatibility.test.ts`
- `server/src/db/readiness.ts`
- `0011-canonical-identity-and-durable-erasure.md`
- `../agents/operations.md`
