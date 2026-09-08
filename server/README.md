# ExcerLock server

Self-contained Node 22+ Fastify API for the ExcerLock VPS backend.

## Contract

- Public liveness is `GET /v1/health`; readiness is `GET /v1/ready`. Neither
  requires auth, and liveness never touches the database.
- Everything else under `/v1` passes through the Supabase auth boundary. The
  Adapty webhook is the one intentional exception: it is authenticated by a
  shared secret instead.
- `GET/PUT/DELETE /v1/user` own the identity spine. `POST /v1/support` takes
  one support submission. `/v1/sync/*` backs up and restores device state.
- Drizzle/Postgres, Sentry, and PostHog initialize lazily or no-op when their
  environment values are absent.

## Hides

SDK construction, database connection details, and route-plugin registration
stay behind the server composition and service boundaries.

## Invariants

- The Supabase user id (`sub`) is the identity spine across Supabase,
  Postgres, Adapty and PostHog.
- The server stores account state and proxies trusted services. Earning,
  progress evaluation and screen-time locking are always on-device and are
  never implemented in this package.
- Sync is a backup channel, never a source of truth (D5). Its privacy law is
  in `src/sync/README.md`: no app names, no bundle ids, no coordinates, no
  health samples.
- Account deletion erases the auth provider last, after every data processor
  confirms, so a failed attempt stays authenticated and retryable.

## Authentication

The server verifies Supabase access tokens against the project's JSON Web Key
Set (ES256/RS256), checking the issuer `<SUPABASE_URL>/auth/v1` and the
`authenticated` audience, and reduces the payload to `{ userId, isAnonymous }`.
`is_anonymous` distinguishes a `signInAnonymously()` session from a linked one;
both are real accounts and both may use every route.

The legacy HS256 shared secret is supported only as a fallback for a project
that has not moved to asymmetric signing keys, and is never consulted while a
JWKS url is configured.

## Environment

Set on the box in `/etc/excerlock/excerlock-api.env` (systemd
`EnvironmentFile`; see `deploy/README.md`). Values are never committed.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres. `postgres:///excerlock` with `PGHOST=/var/run/postgresql`. |
| `PGHOST` | yes | Unix socket directory for peer auth. |
| `SUPABASE_URL` | yes | `https://<ref>.supabase.co`. The JWT issuer, the JWKS url and the Admin API base all derive from it. |
| `SUPABASE_SERVICE_ROLE_KEY` | for deletion | Admin API credential. `DELETE /v1/user` is its only use. |
| `SUPABASE_JWT_JWKS_URL` | no | Overrides the derived JWKS url. |
| `SUPABASE_JWT_SECRET` | no | Legacy HS256 fallback; ignored while a JWKS url exists. |
| `ADAPTY_SECRET_KEY` | for deletion | Server-side Adapty profile erasure. |
| `ADAPTY_WEBHOOK_SECRET` | yes | Exact `Authorization` value configured in Adapty. |
| `POSTHOG_API_KEY` | no | Server event capture; inert without it. |
| `POSTHOG_PERSONAL_API_KEY` | for deletion | Needs `person:write`. |
| `POSTHOG_PROJECT_ID` | for deletion | PostHog project id. |
| `POSTHOG_HOST` / `POSTHOG_API_HOST` | no | Default to the US clouds. |
| `SENTRY_DSN` | no | Crash reporting; inert without it. |
| `NODE_ENV`, `HOST`, `PORT` | no | Default to `development`, `0.0.0.0`, `3000`. |

`CLERK_SECRET_KEY` and every vendor variable (`STRAVA_*`, `OURA_*`, `WHOOP_*`,
`POLAR_*`, `VENDOR_*`) are no longer read. Remove them from the box: a stale
secret in an environment file is a live credential with no owner.

## Deploying

The mechanism is unchanged — `deploy/deploy.sh` rsyncs, builds, migrates and
restarts under systemd behind Caddy. Two things must happen in order for this
release:

1. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to
   `/etc/excerlock/excerlock-api.env`, and delete the Clerk and vendor lines.
2. Deploy. `deploy.sh` runs `node dist/migrate.js`, which applies migration
   `0006_supabase_sync`: it drops the three vendor tables and the two
   feature-request tables, renames `users.clerk_deleted_at` to
   `auth_deleted_at`, and creates `rules`, `rule_days`, `usage_days`,
   `earned_unlocks` and `profiles`.

Then confirm, in this order:

```sh
curl -s https://api.excerlock.com/v1/health          # 200, always
curl -s -i https://api.excerlock.com/v1/ready        # 200 once 0006 has applied
curl -s -i https://api.excerlock.com/v1/user         # 401, no token
curl -s -i -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  https://api.excerlock.com/v1/user                  # 200
```

`/v1/ready` answers `503 {"ready":false,"reason":"schema-missing"}` until every
table this build needs exists, so it is the honest post-deploy gate — a green
`/v1/health` over an unmigrated database is exactly the failure it was added
for. If `/v1/user` answers `503 AUTH_UNAVAILABLE`, `SUPABASE_URL` did not
reach the process; restart after editing the environment file.

Rollback is the previous release plus, if the schema must go back, a restore
from the pre-deploy dump: 0006 drops tables, so it is not reversible by
re-running an older build.

## Analytics

`src/services/analytics.ts` is the server's only PostHog `capture()` forwarder.
Its public wrapper accepts only `ServerEventName` entries from
`@excerlock/analytics-events`, and each payload is typed by the registry's
`PropsOf<Event>`. It remains inert without `POSTHOG_API_KEY` and stamps
`app: "excerlock"` on configured captures. The server owns
`support_request_submitted` and `account_deleted`; the registry still declares
the retired vendor events, and nothing here may emit one.

## Fixtures

None. HTTP behavior is exercised in process through `fastify.inject()`, and
repository behavior against migrated PGlite.

## Commands

```sh
npm test --workspace server
npm run typecheck --workspace server
npm run build --workspace server
```
