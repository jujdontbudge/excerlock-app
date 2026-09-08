# Sync

## Contract

A backup-and-restore channel for the device's own state (D5), reachable at
`/v1/sync`. The device is authoritative for everything here; the server is
authoritative for nothing and never evaluates a rule, computes progress, or
decides a lock. Losing this database would cost a user their restore, not
their blocking.

## Hides

Drizzle, the upsert SQL, and the wire schemas stay behind `index.ts`. Routes
depend on `SyncRepository` and the exported request schemas.

## Invariants

- **Last write wins, decided by Postgres.** Every upsert carries
  `where stored.updated_at < excluded.updated_at`, so two devices racing, an
  offline queue flushing late, or a retried batch can never move a row
  backwards. The endpoints are therefore idempotent and safe to replay.
- **Ownership is a predicate, not a convention.** Rule days, usage days,
  earned unlocks and profiles are keyed by `user_id`, so a cross-account write
  is impossible by construction. `rules.id` is a global primary key, so its
  upsert additionally requires `rules.user_id = <caller>`; an attempt on
  someone else's rule is counted as skipped and changes nothing.
- **`PUT /sync/rules` is a full replacement.** Rules in the batch are upserted
  when newer; the caller's rules absent from the batch are tombstoned
  (`deleted_at` stamped, row kept) so a second device learns about a deletion
  instead of resurrecting it. An empty batch therefore deletes everything, and
  repeating it tombstones nothing further.
- **An earned unlock outlives its rule** (B23). `rule_days.rule_id` and
  `earned_unlocks.rule_id` carry no foreign key, so a deleted or paused
  condition cannot revoke a day that was already earned, and batches may
  arrive in any order.
- **A deletion tombstone is final.** A batch queued before erasure and
  delivered after it is refused with `410 ACCOUNT_DELETED`; it never recreates
  the account.
- **Batches are capped at `MAX_SYNC_BATCH` (400) rows** per request, rejected
  with `SYNC_BATCH_TOO_LARGE` before parsing so the device learns to page.
  `GET /sync` returns every rule plus the most recent 400 rule days, usage
  days and earned unlocks.

## Privacy law

Every payload object is `.strict()`. That is the enforcement, not a comment:
an app name, a bundle identifier, a gym label, a latitude or a health sample
has no field to arrive in, so the request is rejected rather than quietly
stored. `rule_days.progress` is one aggregate number in the rule's own unit.

The Screen Time selection is deliberately absent from the snapshot: Apple ties
those tokens to the device, so a restored account shows no selected apps until
the picker is used again.

`pausedReason` is accepted so a rule paused for a missing gym is not rejected,
and is deliberately not stored — gyms never leave the device, so the server
could not restore the reason's meaning. The device re-derives it.

## Fixtures

`test/sync-repository.test.ts` runs the real SQL against migrated PGlite
(last-write-wins, tombstoning, ownership, numeric precision, history limit).
`test/sync-routes.test.ts` covers the HTTP boundary, the privacy law and the
batch cap against a stub repository.

## Test

```sh
cd server && npx vitest run test/sync-repository.test.ts test/sync-routes.test.ts
```
