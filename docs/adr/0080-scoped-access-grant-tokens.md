---
status: accepted
date: 2026-10-13
---

# 0080: Scoped bearer tokens grant complimentary access over HTTPS

## Decision

`/v1/access/*` lets a non-engineering agent grant, check and revoke complimentary Premium ([0077](0077-email-complimentary-access.md)) without repository, `gcloud` or VM access. `POST /v1/access/grants` takes `email`, `note`, optional `until` and optional `environment`; `POST /v1/access/revocations` takes `email`, `note` and optional `environment`; `GET /v1/access/grants?email=` returns one email's current state: active, dates and whether a signed-in account has matched it. There is no bulk list and no note readback. Each route is limited to 20 requests per minute.

Callers send `Authorization: Bearer <token>`. The server holds only SHA-256 hashes in `ACCESS_GRANT_TOKEN_HASHES`, comma-separated `label:sha256hex`. The audit actor is `token:<label>`. With no hashes configured, the routes are not registered and return 404. The token is generated on the caller's Mac by `excerlock-access setup` and kept in its Keychain; only the hash line travels to the owner.

The client is `tools/marketing-access/excerlock-access/`: an Agent Skill plus a Bash command that uses only macOS built-ins (`curl`, `security`, `osascript`, `openssl`).

## Context

`./excer access --prod` runs through `gcloud compute ssh` and `sudo systemd-run`, so anyone who can grant can also do anything on the VM. The marketing agent runs on a separate MacBook Air and needs only grant and revoke. A restricted SSH forced command was rejected because GCE key and OS Login management would still hand out SSH access and makes revocation per key harder to see. A hashed per-holder token is revoked by deleting its line and restarting the service, and holding the server environment file never yields a usable token.

## Consequences

A leaked token can grant free Premium to arbitrary emails and revoke complimentary grants, but cannot read other people's grants, touch paid subscriptions, or reach any other data. Grant notes and `token:<label>` actors make its use auditable through `./excer access list --prod`. Adding, rotating or removing a token is a production configuration change that needs the owner's approval, followed by restarts of `excerlock-api` and `excerlock-api-testflight`.

## References

- `server/src/routes/access.ts`, `server/src/packages/config/env.ts`
- `tools/marketing-access/excerlock-access/`
- `docs/agents/access.md`
- [0077](0077-email-complimentary-access.md)
