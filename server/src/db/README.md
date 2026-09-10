# Database

## Contract

This module exposes the ExcerLock Postgres schema and a lazy Drizzle client.
Importing it never opens a socket. `getDb()` returns `null` when
`DATABASE_URL` is absent so local and test servers remain keyless.

## Hides

Connection construction, the postgres-js client, and table definitions stay
behind `index.ts`; consumers do not deep-import them.

## Invariants

- Canonical Supabase UUID is the current `users.id` identity spine. Legacy Clerk IDs
  and historic tombstones retain explicit provider lineage; never infer a provider
  from a renamed checkpoint alone. See ADR0011 and ADR0018.
- `vendor_oauth_states` stores only a SHA-256 state hash and expires each
  one-use OAuth state after ten minutes.
- `vendor_connections` stores access and refresh tokens only as versioned
  AES-256-GCM ciphertext. Its unique keys allow one connection per user/vendor
  and one owner per vendor external id.
- `vendor_webhook_events` retains the exact thin callback notification while
  an account is active. Account deletion is the sole exception: it replaces
  the body and external user id with non-identifying placeholders but retains
  the delivery key. The `(vendor, delivery_key)` unique index therefore keeps
  replays idempotent after deletion, while `(user_id, received_at, id)` supports
  stable device cursor reads.
- `adapty_subscription_states` mirrors only current access for active users.
  `adapty_webhook_events` keeps an opaque delivery id and event type for retry
  idempotency, never the Adapty body or purchase metadata. Deletion removes the
  state row and nulls delivery-ledger user links.
- `support_requests` stores the submitted category and content.
  Feature-category submissions create one linked `feature_requests` row.
- `feature_request_votes` has a unique `(feature_request_id, user_id)` index,
  making retry and double-tap votes idempotent at the database boundary.
- This schema stores account and integration transport state only.
- Earning and screen-time balance logic never runs or persists here.

## Fixtures

The Drizzle schema tests assert that no minutes, earnings, ledger, or shield
columns enter vendor persistence.

## Test

```sh
cd server && npx vitest run test/vendor-schema.test.ts test/vendor-repository.test.ts
```

## Production migration compatibility

Use the complete current Drizzle journal. The forward-only legacy bridge runs
after the actual superseded production migration timestamps and before new
identity columns. It restores dropped API tables without deleting existing sync
data or rewriting applied history, and refuses ambiguous auth tombstones.
Readiness validates current columns, valid retry indexing and environment-scoped
primary keys as well as table presence. A green old deployment is not schema
compatibility proof for new code. See `test/migration-compatibility.test.ts`.
