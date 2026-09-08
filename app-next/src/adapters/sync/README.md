# adapters/sync

The real `SyncPort` (P2-T08, decision D5): backup and restore of rules, day facts and the profile against
the VPS `/v1/sync/*` endpoints (P2-T02; shapes in `server/src/sync/payload.ts`, every object `.strict()`). Sync is never a source of truth for enforcement. The device decides every
lock from its own stores; the server only keeps the newest `updated_at` per row so the data comes back on a
new phone. The app selection (the Screen Time handle) never travels, so a restored device shows the
no-apps state until the picker is used again. Local rules survive sign-out.

## Files

- `wire.ts` — the wire contract: paths, camelCase row shapes matching the server's zod payloads,
  `toWire`/`fromWire`, `MAX_BATCH = 400`, and `batchField` (row batches travel under `rows`, rules under
  `rules`, the profile under `profile`; `GET /v1/sync` returns `historyDays`). A disagreement with the
  server is a one-file fix here. Rule ids are UUIDs; `pausedReason` and the warm-up rating never travel;
  null profile columns read back as blanks.
- `SyncClient.ts` — one bearer-authenticated JSON call at a time (Supabase access token). Maps HTTP to
  `SyncError` kinds: `auth` (401, 410 `ACCOUNT_DELETED`, or no token; paused until the session changes),
  `server` (5xx, 408, 429; retried), `network` (fetch threw; retried), `client` (other 4xx such as
  `SYNC_BATCH_TOO_LARGE` or `INVALID_SYNC_PAYLOAD`; batch dropped and logged). Takes an
  `AccessTokenSource` the auth adapter (P2-T01) supplies.
- `SyncAdapter.ts` — `createSyncAdapter(client): SyncPort`. Splits row pushes at 400 and sends them in order;
  a failing batch stops the sequence so the remainder is retried later. **Invariant:** the adapter refuses
  `pushRules` until its own `pull` has succeeded (a retryable `ordering` error, never sent), and the host
  pulls and merges immediately before every rules push. A fresh install therefore always merges the
  account's rules before its first push, whatever the server's replacement semantics.
- `syncStore.ts` — the persisted outbox (`excerlock-next.sync.outbox.v1`): dirty flags for rules and
  profile, row-keyed queues for rule days, usage days, earned unlocks and sealed history, this device's
  rule deletions (reported as tombstones, remembered 90 days), the per-row change clocks the merge
  compares, and the identity the outbox belongs to.
- `changeTracker.ts` — pure diff between two observations of the stores; stamps every changed row with the
  instant it was observed, which is the `updated_at` the server compares.
- `restore.ts` — pull, merge under `domain/syncMerge`, write back to the stores. A restored gym rule with no
  saved gym on this device is paused under the gym dependency rather than enforced blind.
- `SyncHost.ts` — `startSync(runtime, options)`: the schedule and the retry policy.
- `syncLog.ts` — not persisted; the developer menu's view of sync (entries with counts and reasons, never row
  contents, `authRequired`, `lastPushAt`, `lastRestore`).

## Schedule

- Rules and the profile push 5 s after the last change (debounced from the latest edit); a rules push is
  always preceded by a pull and merge.
- Day facts push after their first change, then on the app-background transition and at most every 15 min
  while foregrounded.
- Offline (`ReachabilityPort`) or a server failure: the change stays queued; retry backs off from 30 s,
  doubling to 15 min. Nothing blocks the UI; failures are visible only in `syncLog`.
- A 401 pauses sync, calls `onAuthRequired` once, and stays paused until the session changes.
- An identity change (`${session.kind}:${userId}`, so both a new user id and the anonymous→signed-in link)
  clears the queue, restores first, then marks everything dirty for a full push. Fresh install with a
  surviving session is the same path: the outbox is empty, the identity is new, so restore runs.

## Conflict rule

`domain/syncMerge.mergeSnapshot` (pure, 100% branch coverage). A remote row is taken only when the device
has none, or when the remote `updatedAt` is strictly newer than the device's own change clock for that row.
A local row with no clock is kept. Today's rows are never replaced. Rules use their own `updatedAt`;
deletions are explicit tombstones in both directions, so a stale device can never delete another device's
new rule, and a rule deleted here is not resurrected unless it was edited elsewhere after the deletion.
Locked-app minutes fill only a history day the device recorded without a measurement.

## Wiring (owned by the runtime root)

```ts
const sync = createSyncAdapter(createSyncClient({ accessToken: auth.accessToken }));
const host = startSync(runtime, { appState: AppState, history: historyBridge, onAuthRequired });
// stop() on teardown
```

`startSync` never subscribes to `AppState` itself; the runtime host passes its source in so the single
foreground-owner law in `runtime/README.md` holds. `history` is a bridge to P2-T15's `historyStore`
(`get`/`set`/`subscribe`); without it history and usage are neither restored nor pushed. The "Welcome back" summary
after a sign-in restore is `syncLog.lastRestore` (`localWasEmpty` says whether the device had no rules
before the pull).

## Privacy

`__tests__/privacy.test.ts` forbids, at the type level over every wire shape, any key that could carry an
app name, bundle id, coordinate, gym place, gym visit or health sample, and scans this directory's source
for the same. The warm-up rating and the paused-for-no-gym marker are device-only and never travel.
