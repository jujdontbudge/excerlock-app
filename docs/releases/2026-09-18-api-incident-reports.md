# API deploy: incident reports — 2026-09-18

`main` at `f637b14d` deployed to `api.excerlock.com` with `deploy/deploy.sh`
(host `johansardar@34.134.201.129`, see `deploy/README.md`). This ships
`f0553d04` feat(support): in-app incident reports (ADR 0039), which TestFlight
1.0.0 (4) already calls but the server had never received.

## Why

Send on the "Something not working?" sheet failed from TestFlight. Before this
deploy the live API answered `404` to `POST /v1/incident-reports`; the route and
`0010_incident-reports.sql` existed only in the repository.

## What the deploy did

- `npm run build --workspace server`, rsync of `dist/`, `drizzle/`, pruned
  manifest, lockfile, Caddyfile and unit (Caddyfile and unit were byte-identical
  to what was installed, so Caddy and the site vhost were untouched).
- `node dist/migrate.js` via `systemd-run`: drizzle journal row 13 applied
  `0010_incident-reports.sql`; `incident_reports` now exists in production.
- `excerlock-api.service` restarted; local `/v1/health` and `/v1/ready` passed.

## Live proof (public host, after restart)

| Call | Result |
|---|---|
| `GET https://api.excerlock.com/v1/health` | `200 {"ok":true,"version":"0.1.0"}` |
| `GET https://api.excerlock.com/v1/ready` | `200 {"ready":true,"version":"0.1.0"}` |
| `POST /v1/incident-reports` without a bearer | `401 UNAUTHORIZED` (route exists; was `404` before) |
| `PUT /v1/user` with a real Supabase session | `204` |
| `POST /v1/incident-reports` with a valid body | `201 {"reportId":"33336a5c-68a2-4662-841c-3ca3b042e73f"}` |
| `POST /v1/incident-reports` with `{"nope":1}` | `400 INVALID_INCIDENT_REPORT` |
| `select … from incident_reports where id = …` on the box | one row: user `9d35a66b-…`, app `1.0.0 (4)`, iOS `26.0`, `reported_at 2026-09-18 19:45:26+00` |

The session was minted exactly as the E2E-A3 lane does
(`app-next/e2e-next/supabase.py`: admin-precreated disposable identity
`e2e-incident-d1-1789760724@excerlock.com`, `generate_link` → `verify`), using
the `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` already in `~/.excerlock/env`.
No credentials were created or committed.

Teardown followed the deletion contract: `DELETE /v1/user` → `204`, re-`PUT`
→ `410 ACCOUNT_DELETED`, Supabase admin lookup → `404`. The proof row was then
removed by hand on the box; `incident_reports` is empty again.

## Observations

- `RESEND_API_KEY` is not set on the box, so the best-effort email mirror is
  skipped; persistence is the source of truth and succeeds without it.
- The `users` row is a permanent tombstone after deletion (ADR 0018 /
  `server/src/userDeletion/README.md`), so the `ON DELETE CASCADE` on
  `incident_reports.user_id` never fires: a deleted user's incident reports
  (free text plus diagnostics) outlive the account. Not addressed here; the
  erasure workflow should purge or anonymise `incident_reports` when it
  tombstones the user.
- `deploy/README.md` still described the retired Azure VM as the current host;
  the current-deployment section now names the GCE box.
