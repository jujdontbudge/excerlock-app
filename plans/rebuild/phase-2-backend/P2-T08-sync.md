# P2-T08 — Sync rules, results, usage and profile to the VPS (`SyncPort` real adapter)

Decision D5. Sync is a backup and restore channel, not a source of truth for enforcement.

## Rules

- The device is authoritative for **today** (rule days, usage). The server is authoritative for nothing;
  it stores the latest by `updated_at` per row.
- Push: debounced (5 s) after any change to rules/profile; rule_days and usage_days pushed on app background
  and at most every 15 minutes while foregrounded; batches ≤ 400 rows.
- Pull: on sign-in (identity link) and on fresh install with an existing identity; merge by `updated_at`,
  never overwrite a newer local row; app selection (Screen Time handle) is never synced and the restored
  state shows `noAppsSelected` until the user picks apps again.
- Offline: queued, retried with backoff; never blocks UI; failures visible only in the dev menu log.
- Privacy: payloads contain only the schema in P2-T02 §3; a type-level test forbids gym names/coordinates.

## Steps

1. `SyncAdapter implements SyncPort` over the `/v1/sync/*` endpoints with the Supabase access token.
2. Outbox in AsyncStorage (`excerlock-next.sync.outbox.v1`) with idempotent batches.
3. Merge logic in `src/domain/syncMerge.ts` (pure, tested).
4. Restore flow UI: on sign-in with server data and empty local rules, X5-style "Welcome back" summary of
   restored rules; Home shows the no-apps state until the picker is used.

## Acceptance

- [ ] Two simulators (sequentially, same dev account): create rules on A, sign in on B → rules and streak
      restored on B; edit on B, relaunch A → A shows B's edit.
- [ ] Airplane mode: changes queue and flush on reconnect.
- [ ] Type-level privacy test green.

## Audit amendments (2026-09-07; see `fix-plan.md`)

- Payload adds `earned_unlocks` (P2-T14 §3) and sealed `history` rows (P2-T15 §4; immutable, so `updated_at`
  merge is safe). Today's rule-day row stays device-authoritative.
- The type-level privacy test also forbids `GymVisit` rows (they never leave the device).
- Acceptance adds the promise P2-T22's copy makes: conditions, progress and history return on a new phone; the
  app selection does not.
