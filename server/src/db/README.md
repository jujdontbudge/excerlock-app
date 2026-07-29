# Database

## Contract

This module exposes the ExcerLock Postgres schema and a lazy Drizzle client.
Importing it never opens a socket. `getDb()` returns `null` when
`DATABASE_URL` is absent so local and test servers remain keyless.

## Hides

Connection construction, the postgres-js client, and table definitions stay
behind `index.ts`; consumers do not deep-import them.

## Invariants

- Clerk user id is the `users.id` primary key and the shared identity spine.
- This schema stores account and integration state only.
- Earning and screen-time balance logic never runs or persists here.

## Fixtures

None. Ticket #34 verifies configuration loading without opening a database.

## Test

```sh
cd server && npx vitest run test/db-config.test.ts
```
