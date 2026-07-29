<<<<<<< HEAD
# Server

Contract: this workspace will host the Fastify, Drizzle, and Postgres product described in
`ARCHITECTURE.md`; Phase 0 establishes and hides its internal module boundaries without a runtime.

Invariants: the server may import analytics and condition-model types, never ledger math. Raw vendor
payloads remain transit-only, and vendor webhooks notify devices rather than evaluating earnings.

Fixtures: PGlite and vendor HTTP fixtures arrive with their first tests. Test with
`npm run test:server` from the repository root.
=======
# ExcerLock server

Self-contained Node 22+ Fastify API skeleton for the ExcerLock VPS backend.

## Contract

- Public liveness is exposed at `GET /v1/health`.
- User-facing APIs live under `/v1` and pass through the Clerk auth boundary.
- Drizzle/Postgres, Sentry, and PostHog initialize lazily or no-op when their
  environment values are absent.

## Hides

SDK construction, database connection details, and route-plugin registration
stay behind the server composition and service boundaries.

## Invariants

- Clerk id is the identity spine across Clerk, Postgres, Adapty, and PostHog.
- The server stores account/integration state and proxies trusted services.
- Earning and screen-time balance computation are always on-device and never
  implemented in this package.

## Fixtures

None. HTTP behavior is exercised in process through `fastify.inject()`.

## Commands

```sh
npm install
npm test
npm run typecheck
npm run build
```
>>>>>>> origin/lane/34-server-skeleton
