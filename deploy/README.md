# ExcerLock API deployment

The production path is deliberately small: build the `server` workspace
locally, rsync the compiled output and package manifests to one Google Compute
Engine VM, install production dependencies there, and restart a hardened systemd
service behind Caddy. There is no Docker layer.

## Current deployment

`api.excerlock.com` points at this VM. `deploy/deploy.sh` is host-agnostic: it
only needs `DEPLOY_HOST` and `DEPLOY_SSH_KEY`.

| | |
|---|---|
| Public IP | `34.134.201.129` (`dig +short api.excerlock.com A`) |
| SSH | `DEPLOY_HOST=johansardar@34.134.201.129 DEPLOY_SSH_KEY=~/.ssh/google_compute_engine` |
| Instance | `excerlock-api`, `us-central1-a`, `e2-micro`, GCP project `174877771548` (**x86_64**) |
| Stack | Debian 12 · Node 22.23.2 · Postgres 15 (local socket) · Caddy 2.11.4 |
| Health | `curl https://api.excerlock.com/v1/health` → `{"ok":true,...}`; `/v1/ready` → `{"ready":true,...}` |

The same box serves the public site; `deploy/site.sh` and `deploy/deploy.sh`
both install `deploy/Caddyfile` over `/etc/caddy/Caddyfile`, so every vhost must
live in that one file. Internal TestFlight uses a second `excerlock-api-testflight.service`
process on port 3002, exposed only through the path-stripped
`https://api.excerlock.com/testflight/` base URL. It selects the Sandbox
subscription partition server-side; the Production process on port 3000
continues to select only Production. Both processes use the existing database,
so this is authorization isolation, not a separate identity or data environment.
The TestFlight process disables its duplicate account-deletion retry worker. `/etc/excerlock/env` carries the Supabase identity
variables (`SUPABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
in addition to the baseline below; `RESEND_API_KEY` is unset, so incident-report
emails are skipped while persistence still succeeds (`server/src/packages/incidents/lib/notify.ts`).

Latest API deploy: `docs/releases/2026-09-18-api-incident-reports.md`
(migration `0010_incident-reports.sql`, `POST /v1/incident-reports`).

## 1. Environment file

`excerlock-api.service` reads `/etc/excerlock/env`. To create or edit it:

```sh
ssh -t -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST"

sudo install -d -m 0755 -o root -g root /etc/excerlock
if ! sudo test -e /etc/excerlock/env; then
  sudo install -m 0600 -o root -g root /dev/null /etc/excerlock/env
fi
sudoedit /etc/excerlock/env
sudo chown root:root /etc/excerlock/env
sudo chmod 0600 /etc/excerlock/env
exit
```

Use systemd `EnvironmentFile` syntax: one `KEY=value` per line, without
`export`. At minimum, set the runtime and local Postgres connection; add the
server secrets below without ever committing their values:

**The database URL must be exactly this pair of lines.** `postgres-js` only opens a
unix socket when the *host* contains a `/`, and it never reads a `?host=` query
parameter — so the obvious-looking
`postgres://excerlock@/excerlock?host=/var/run/postgresql` is both an invalid URL
(Node's `new URL` throws `Invalid URL` on it) and, if it parsed, would silently
fall back to TCP on `127.0.0.1`, where `pg_hba.conf` demands a password the
service does not have. `postgres:///excerlock` leaves the host empty so the
driver falls through to `PGHOST`, whose slash selects the socket and lets
`peer` auth match the `excerlock` service user to the `excerlock` role.

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
DATABASE_URL=postgres:///excerlock
PGHOST=/var/run/postgresql
SENTRY_DSN=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADAPTY_SECRET_KEY=
ADAPTY_WEBHOOK_SECRET=
POSTHOG_API_KEY=
POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_PERSONAL_API_KEY=
POSTHOG_PROJECT_ID=
POSTHOG_API_HOST=https://us.posthog.com
```

## 2. Deploy

Run from any directory. `DEPLOY_HOST` is the SSH destination and
`DEPLOY_SSH_KEY` is its private key, not the `.pub` file. Use
`DEPLOY_SSH_PORT` only when SSH is not on port 22. The deploy script requires
`StrictHostKeyChecking=yes` for both SSH and rsync; it will not trust a new
host key automatically.

```sh
export DEPLOY_HOST="johansardar@34.134.201.129"
export DEPLOY_SSH_KEY="$HOME/.ssh/google_compute_engine"

./deploy/deploy.sh --dry-run
./deploy/deploy.sh
```

Always inspect the dry run first. It validates local prerequisites and prints
every command without building, opening an SSH connection, running rsync, or
changing either machine. A real deploy then:

1. checks key-based SSH, passwordless sudo, and `/etc/excerlock/env`;
2. runs `npm run build --workspace server` locally;
3. rsyncs `server/dist/`, the complete `server/drizzle/` journal, the
   production-pruned `package.json`, the lockfile, and the Caddy/systemd files
   to `/opt/excerlock/server`;
4. runs `npm ci --omit=dev` as the `excerlock` user;
5. runs `node dist/migrate.js` through `systemd-run` with the service's
   `/etc/excerlock/env`, **before** restarting the service;
6. validates and installs the Caddy/systemd files, reloads Caddy, restarts
   both `excerlock-api.service` and `excerlock-api-testflight.service`, and
   checks both local `/v1/health` and `/v1/ready` endpoints and active states;
7. checks public Production and path-isolated TestFlight health/readiness.
   The Production environment file must never select Sandbox. The second
   unit overrides only its process-local port, Sandbox authorization and
   duplicate deletion-worker setting after systemd loads that file.

The migration step is part of every real deploy. Drizzle's journal makes an
up-to-date deploy a no-op, but a pending migration changes the database before
the new process starts. The current journal is forward-only; for the legacy
production shape it applies `0006_legacy-production-bridge.sql`, then
`0007_supabase-identity-and-durable-erasure.sql`, `0008_deletion-retry-index.sql`,
`0009_deep_firebrand.sql` and `0010_incident-reports.sql`. Never rewrite applied journal rows or substitute
the superseded migrations by matching file number.

Re-running the same revision is safe: rsync converges the built files,
`npm ci` recreates dependencies from the lockfile, config installation is
replace-in-place, and systemd restart is idempotent.

## 3. Status and logs

Public and local health checks:

```sh
curl --fail --show-error https://api.excerlock.com/v1/health
ssh -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" \
  'curl --fail --show-error http://127.0.0.1:3000/v1/health'
curl --fail --show-error https://api.excerlock.com/v1/ready
ssh -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" \
  'curl --fail --show-error http://127.0.0.1:3000/v1/ready'
curl --fail --show-error https://api.excerlock.com/testflight/v1/health
curl --fail --show-error https://api.excerlock.com/testflight/v1/ready
ssh -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" \
  'curl --fail --show-error http://127.0.0.1:3002/v1/ready'
```

`/v1/health` is liveness only: it proves that the process answers and does not
inspect the database. `/v1/ready` checks the current schema and, when
`NODE_ENV=production`, requires the complete account-erasure configuration,
including `POSTHOG_PERSONAL_API_KEY` and `POSTHOG_PROJECT_ID`. A green health
response is therefore not readiness or erasure proof. Check both host-local and
public responses after a deploy; a public response from an older process does
not identify the revision that is running.

Service status and recent logs:

```sh
ssh -t -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" \
  'sudo systemctl --no-pager --full status excerlock-api.service'
ssh -t -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" \
  'sudo journalctl -u excerlock-api.service -n 200 --no-pager'
ssh -t -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" \
  'sudo journalctl -u caddy -n 200 --no-pager'
```

For a live tail, replace `-n 200 --no-pager` with `-f`.

## 4. Rollback

Deploys can apply pending database migrations before restarting the service.
Those migrations are forward-only and are not rolled back by redeploying older
application code. Roll back application code only by redeploying a known-good
Git revision whose server is compatible with the schema already applied; its
lockfile restores the matching production dependencies. A separate worktree
avoids disturbing local work:

```sh
git worktree add ../excerlock-rollback <known-good-commit>
cd ../excerlock-rollback

DEPLOY_HOST="$DEPLOY_HOST" DEPLOY_SSH_KEY="$DEPLOY_SSH_KEY" \
  ./deploy/deploy.sh --dry-run
DEPLOY_HOST="$DEPLOY_HOST" DEPLOY_SSH_KEY="$DEPLOY_SSH_KEY" \
  ./deploy/deploy.sh

cd -
git worktree remove ../excerlock-rollback
```

If migration completed and the new service then fails readiness, do not restore
old migration files or delete journal rows. Keep the forward schema and either
correct the deployment configuration or redeploy a schema-compatible revision.
If migration itself fails, `deploy/deploy.sh` aborts before its restart step, so
the previous service remains running while the migration error is investigated.

Choose a known-good revision at or after ticket #37 so it contains this deploy
tooling. If the first-ever deploy has no earlier application revision, stop the
service while investigating:

```sh
ssh -t -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" \
  'sudo systemctl stop excerlock-api.service'
```
