# Support

## Contract

This module persists authenticated support submissions behind an application
service. Routes depend on its public `index.ts` rather than on Drizzle.

## Invariants

- A support analytics event is emitted only after its request is persisted.
- One submission is one row. Feature voting is cut (B17), so an "idea"
  submission is stored and answered exactly like a problem or a question and
  is never published back for other users to see or vote on.
- **The wire speaks the product's words, storage speaks the registry's.** The
  app sends `problem`, `question` or `idea`; `payload.ts` maps them onto the
  `bug` / `support` / `feature` enum that `@excerlock/analytics-events` locks,
  and that map is the only place the two vocabularies meet. The registry
  spellings are still accepted so the build on TestFlight keeps working
  against the box; P2-T12 can drop them.
- **`replyTo` is optional.** An anonymous user with no address must still be
  able to report a problem, and a report nobody can answer beats a report that
  was rejected.
- **The diagnostics bundle is `.strict()`, which is the privacy floor rather
  than a description of it.** App version, build, iOS version, device model,
  entitlement status, the six permission statuses, the rule count and the last
  enforcement result have fields; a gym name, a coordinate, an app name or a
  bundle id does not, so such a request is rejected. A rejection names the
  path and never echoes the value.
- No earning, minutes, ledger, shield, or locking state crosses this module.

## Tests

```sh
npm run test:server -- support
```
