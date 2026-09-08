# Database

## Contract

This module exposes the ExcerLock Postgres schema and a lazy Drizzle client.
Importing it never opens a socket. `getDb()` returns `null` when
`DATABASE_URL` is absent so local and test servers remain keyless.

## Hides

Connection construction, the postgres-js client, and table definitions stay
behind `index.ts`; consumers do not deep-import them.

## Invariants

- The Supabase user id (`sub`) is the `users.id` primary key and the shared
  identity spine across Postgres, Adapty and PostHog.
- `adapty_subscription_states` mirrors only current access for active users.
  `adapty_webhook_events` keeps an opaque delivery id and event type for retry
  idempotency, never the Adapty body or purchase metadata. Deletion removes the
  state row and nulls delivery-ledger user links.
- `support_requests` stores the submitted category and content. There is no
  feature-request or vote table: the form is the whole feature (B17).
- The sync tables (`rules`, `rule_days`, `usage_days`, `earned_unlocks`,
  `profiles`) are a backup-and-restore mirror of device state (D5). The device
  is authoritative; nothing here drives enforcement.
- Privacy law for the sync tables: no app names, no bundle identifiers, no
  location coordinates, no health samples. `rule_days.progress` is one
  aggregate number in the rule's own unit. Gym place names and coordinates
  never leave the device.
- `rule_days.rule_id` and `earned_unlocks.rule_id` deliberately carry no
  foreign key. Sync batches arrive in any order, and a day that was met must
  survive the deletion of the rule that earned it (B23).
- Earning and screen-time balance logic never runs or persists here.

## Fixtures

`test/support-repository.test.ts` compares every `schema.ts` column against the
migrated Postgres catalog by name, ordinal, exact type, nullability and
default, so schema and migrations cannot drift apart silently.

## Test

```sh
cd server && npx vitest run test/support-repository.test.ts test/sync-repository.test.ts
```
