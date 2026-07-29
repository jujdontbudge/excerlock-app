# Database

## Contract

This module exposes the ExcerLock Postgres schema and a lazy Drizzle client.
Importing it never opens a socket. `getDb()` returns `null` when
`DATABASE_URL` is absent so local and test servers remain keyless.

## Invariants

- Clerk user id is the `users.id` primary key and the shared identity spine.
- This schema stores account and integration state only.
- Earning and screen-time balance logic never runs or persists here.

## Test

```sh
cd server && npx vitest run test/db-config.test.ts
```
