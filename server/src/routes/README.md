# Routes

This module owns the `/v1/*` Fastify transport for health, user, support and
sync. Handlers validate transport data and delegate; they contain no earning,
ledger, shield, or lock decisions.

Everything under `/v1` except `/health`, `/ready` and the Adapty webhook sits
behind the Supabase auth boundary, and every handler reads its subject through
`authenticatedUser.ts` rather than off the request directly.

## Endpoints

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /v1/health` | none | Liveness. Never touches the database. |
| `GET /v1/ready` | none | Readiness: every table this build needs is present. |
| `POST /v1/webhooks/adapty` | shared secret | Subscription access mirror. |
| `GET /v1/user` | Supabase | `{ id, isAnonymous, createdAt }`. |
| `PUT /v1/user` | Supabase | Idempotent provisioning of the identity row. |
| `DELETE /v1/user` | Supabase | Account erasure across every processor. |
| `POST /v1/support` | Supabase | One support submission. |
| `GET /v1/sync` | Supabase | Everything this account has, for restore. |
| `PUT /v1/sync/rules` | Supabase | Upsert batch under `rules`, max 400. |
| `PUT /v1/sync/rule-days` | Supabase | Upsert batch under `rows`, max 400. |
| `PUT /v1/sync/usage-days` | Supabase | Upsert batch under `rows`, max 400. |
| `PUT /v1/sync/earned-unlocks` | Supabase | Upsert batch under `rows`, max 400. |
| `PUT /v1/sync/history` | Supabase | Sealed days under `rows`, max 400. |
| `PUT /v1/sync/profile` | Supabase | The onboarding answers. |

## User

`PUT /v1/user` idempotently provisions the authenticated Supabase subject as
the minimal Postgres identity-spine row. It never accepts an id from the
request body and never reactivates a deletion tombstone; a tombstoned account
gets `410 ACCOUNT_DELETED`. `DELETE /v1/user` may revisit a tombstone only to
resume downstream erasure checkpoints.

`GET /v1/user` reads `isAnonymous` from the verified token rather than from a
stored copy: linking a provider to an anonymous session changes the claim
without changing the user id. It answers `404 USER_NOT_FOUND` before the
account has been provisioned, so a client can tell "new" from "erased".

## Support

`POST /v1/support` takes one strict JSON shape; unknown keys are rejected.
`category` is `problem`, `question` or `idea` (the registry spellings `bug`,
`support` and `feature` are still accepted for the build on TestFlight).
`replyTo`, `title` and `diagnostics` are all optional:

```json
{
  "category": "problem",
  "message": "My workout did not unlock my apps.",
  "replyTo": "someone@example.com",
  "diagnostics": {
    "appVersion": "1.4.0",
    "appBuild": "412",
    "iosVersion": "18.2",
    "deviceModel": "iPhone15,3",
    "entitlementStatus": "active",
    "permissions": {
      "screenTime": "granted",
      "motion": "granted",
      "location": "whenInUse",
      "health": "notDetermined",
      "camera": "denied",
      "notifications": "granted"
    },
    "ruleCount": 3,
    "lastEnforcementResult": "shielded"
  }
}
```

The diagnostics object is strict, which is the privacy floor: a gym name, a
coordinate or an app name has no field to arrive in and the request is
rejected. It answers `201` with `{ "submissionId": "..." }`. There is no
feature-request listing and no vote route: feature voting is cut (B17).

## Sync

`PUT /v1/sync/*` bodies are strict and batches are capped at 400 rows. The
batch field is `rules` on `/sync/rules`, `rows` on the four row endpoints and
`profile` on `/sync/profile`. Each answers `200` with `{ applied, skipped }`
so the device's sync log can show what actually landed. `GET /v1/sync` answers
`{ rules, ruleDays, usageDays, earnedUnlocks, historyDays, profile }`.

Every endpoint upserts what it is given and leaves everything else alone. A
deletion is an explicit tombstone (`deletedAt` on the rule with a newer
`updatedAt`), never an absence, so a device pushing only what it knows can
never wipe another device's rows. The rest of the rules and the privacy law
are in `src/sync/README.md`.

## Errors

Every failure is `{ "error": { "code": "...", "message": "..." } }`.

- `400 INVALID_SUPPORT_REQUEST` / `400 INVALID_SYNC_PAYLOAD` — the body did
  not validate. Both messages name the offending path and never echo the
  value.
- `400 SYNC_BATCH_TOO_LARGE` — more than 400 rows in one batch.
- `401 UNAUTHORIZED` — missing bearer token, or no verified Supabase identity.
- `404 USER_NOT_FOUND` — the authenticated account has no row here.
- `410 ACCOUNT_DELETED` — a deletion tombstone; the client signs out and starts
  a fresh anonymous session.
- `502 IDENTITY_ERASURE_FAILED` — a processor refused; the caller is still
  authenticated and the deletion is safe to retry.
- `503 AUTH_UNAVAILABLE` / `IDENTITY_UNAVAILABLE` / `SYNC_UNAVAILABLE` /
  `ACCOUNT_DELETION_UNAVAILABLE` / `ADAPTY_WEBHOOK_NOT_CONFIGURED` — the
  server is missing configuration or its database. Fails closed, never
  half-open.

## Tests

```sh
npm run test:server -- routes
```
