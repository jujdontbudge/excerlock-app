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

After persist and analytics, the server best-effort emails
`SUPPORT_NOTIFY_EMAIL` (default `johansardar77@gmail.com`) through Resend when
`RESEND_API_KEY` is set. A missing key or send failure never fails
`POST /v1/support`. Default `SUPPORT_FROM_EMAIL` is
`ExcerLock <onboarding@resend.dev>`, which only delivers to the Resend account
owner until a domain is verified. Do not commit API keys. App labels map as
Problem→bug, Question→support, Idea→support; the server still accepts
`support`, `bug`, and `feature`.

## Tests

```sh
npm run test:server -- support
```
