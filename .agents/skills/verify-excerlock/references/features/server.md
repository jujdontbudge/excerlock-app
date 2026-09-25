---
id: server
title: API server
routes: []
server: [GET /v1/health, GET /v1/ready, POST /v1/webhooks/adapty, POST /v1/subscription/resync, GET /v1/user, PUT /v1/user, DELETE /v1/user, POST /v1/support, POST /v1/incident-reports]
depends: [account, paywall, support]
---
## Sub-features
- Fastify at `https://api.excerlock.com`, backed by PostgreSQL through Drizzle and deployed on GCE (`deploy/README.md`).
- Health (the process is up) and ready (the database and schema are reachable).
- Identity mirroring from Supabase JWTs, Adapty webhooks, entitlement resync, support and incident storage, and user deletion.

## How to get to it (user POV)
Indirectly: sign-in, purchases, feedback and incident reports.

## Driving it with excer
`./excer server smoke` builds the server, runs it against a throwaway Postgres container with stubbed Adapty, PostHog and Supabase admin, and walks one account from provisioning through a support request, an incident report, Adapty webhooks and deletion. It asserts HTTP statuses and the rows left behind. Run it after any server change.

For a manual session, start the server with `npm run dev -w server`, then run `./excer server health` and `./excer server ready`. `--prod` checks production, which is read-only.

## Gotchas
- Health alone does not prove readiness. Check both.
- Vendor routes (`/v1/vendors/*`, `/v1/webhooks/<vendor>`) and `/v1/feature-requests` have no caller in the app. They are kept on purpose (PRD §3.5c: reviving a rail is configuration, not redesign).
- A raw `Date` inside a drizzle `sql` template fails in postgres-js. Bind values through column operators (`lt`, `eq`) so the column type serializes them.
- Account deletion keeps the `users` row as a tombstone, so `onDelete: cascade` never fires. Every user-owned table needs an explicit delete in `user-deletion`'s transaction, and the smoke asserts each one.
- Never print `/etc/excerlock/env`. Deploy only through `deploy/deploy.sh`, and only with authorization.
