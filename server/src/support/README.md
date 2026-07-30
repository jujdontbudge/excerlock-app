# Support

## Contract

This module persists authenticated support submissions and feature-request
votes behind application services. Routes depend on its public `index.ts`
rather than on Drizzle.

## Invariants

- A support analytics event is emitted only after its request is persisted.
- Feature submissions and their listable feature request are one persistence
  operation.
- Vote idempotency is decided by persistence, where the database owns the
  one-user/one-request constraint.
- No earning, minutes, ledger, shield, or locking state crosses this module.

## Tests

```sh
npm run test:server -- support
```
