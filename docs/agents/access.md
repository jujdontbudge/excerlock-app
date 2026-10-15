# Complimentary Premium by email

Use the recipient's exact account email. They open ExcerLock → Welcome → Sign in → email code (or Apple/Google using that same confirmed email). A new account finishes the existing Setup permissions, then enters Home without a purchase. Grant before or after registration; no email is sent by the grant command.

## Local isolated database

Set `EXCER_ACCESS_DATABASE_URL` to an isolated local Postgres database with the current server migrations. No `.env` file is read by the local command. A loopback URL can itself be an SSH tunnel: the operator must verify that their database is isolated; do not point this variable at a production tunnel.

```
./excer access grant creator@example.com --note "UGC Oct"
./excer access grant creator@example.com --note "UGC Oct" --until 2027-01-01
./excer access list creator@example.com
./excer access revoke creator@example.com --note "Campaign ended"
```

The default authorization lane is Production. Add `--environment sandbox` to operate on Sandbox. Grants are partitioned: specify each lane separately if both are needed. `--until 2027-01-01` expires at 00:00 UTC at the start of January 1; an ISO timestamp with a timezone also works. Omit it for indefinite access. Re-grant replaces the previous grant and retains both audit events. Revoke is idempotent.

## Production VM

**Grant and revoke with `--prod` change production data. The owner's explicit approval in the current conversation is required, including for the Sandbox partition on that VM.** Do not infer approval from access to the CLI. Check `gcloud` login as described in `services.md`.

After the server containing migration `0011_complimentary-access` is deployed:

```
./excer access grant creator@example.com --note "UGC Oct" --prod
./excer access list creator@example.com --prod
./excer access revoke creator@example.com --note "Campaign ended" --prod
```

`--prod` runs the deployed command on `excerlock-api`, as the `excerlock` service user with the service's EnvironmentFile. Recipient data travels through stdin. Never print the EnvironmentFile. Grant/revoke output contains only an opaque grant ID, lane and dates; list includes private recipient emails and notes. Do not paste list output into analytics, logs, issues or shared artifacts. The audit actor is the active gcloud account for production, and OS user/host for local work. Audit dates come from the server/database execution, not the device.

## Scoped token for other agents

A non-engineering agent, such as marketing's agent on another Mac, uses `tools/marketing-access/excerlock-access/` instead of `--prod` ([ADR 0082](../adr/0082-scoped-access-grant-tokens.md)). Hand a person that folder plus its `HANDOFF.md`. They run `excerlock-access setup <label>` there and send back the `label:sha256hex` line. With the owner's approval, add it to `ACCESS_GRANT_TOKEN_HASHES` (comma-separated) in `/etc/excerlock/env` with `sudoedit`, then restart `excerlock-api` and `excerlock-api-testflight`. Remove the line and restart to revoke the token. Their audit actor is `token:<label>`. The token can grant, check one email and revoke, and nothing else.

Revocation takes effect on the next successful launch/foreground/renewal check. It never cancels an Apple subscription. A paying account remains entitled. Offline complimentary access lasts until the last server response boundary, at most 24 hours, with no three-day paid grace. Unknown paid evidence after grant removal opens verification; a confirmed unpaid account sees the Paywall. Sign out and account deletion keep their existing protections. Account deletion scrubs matched recipient emails and notes and revokes their grants.

Emails are trimmed and lowercased. Gmail dots and plus tags are **not** rewritten; grant the actual signed-in address. Apple Hide My Email uses the relay address on the Supabase account. A user-supplied profile field cannot claim somebody else's grant.

Deploy the migration/server first, then the JavaScript client OTA for runtimes 4 and 5. Confirm the existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured. No Adapty dashboard change, grant API call, store product or new secret is needed. See [ADR 0077](../adr/0077-email-complimentary-access.md) and the [verification report](access-verification.md) for release limitations.
