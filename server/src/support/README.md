# Support

## Contract

This module persists authenticated support submissions behind an application
service. Routes depend on its public `index.ts` rather than on Drizzle.

## Invariants

- A support analytics event is emitted only after its request is persisted.
- One submission is one row. Feature voting is cut (B17), so an "idea"
  submission is stored and answered exactly like a problem or a question and
  is never published back for other users to see or vote on.
- No earning, minutes, ledger, shield, or locking state crosses this module.

## Tests

```sh
npm run test:server -- support
```
