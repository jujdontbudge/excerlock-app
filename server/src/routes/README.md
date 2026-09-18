# Routes

This module owns the `/v1/*` Fastify transport for health, support, user, and
vendor endpoints. Handlers validate transport data and delegate; they contain
no earning, ledger, shield, or lock decisions.

`PUT /v1/user` idempotently provisions the authenticated Clerk subject as the
minimal Postgres identity-spine row. It never accepts an id from the request
body and never reactivates a deletion tombstone. `DELETE /v1/user` may revisit
a tombstone only to resume downstream erasure checkpoints.

## Support and feature requests

All support and feature-request routes are Clerk protected.

### `POST /v1/support`

The request body is one of these strict JSON shapes; unknown keys are rejected:

```json
{
  "category": "support",
  "message": "My workout did not unlock my apps."
}
```

```json
{
  "category": "bug",
  "message": "Permission status is wrong."
}
```

```json
{
  "category": "feature",
  "title": "Home Screen widget",
  "message": "Show my balance without opening the app."
}
```

`message` is trimmed and must contain 1–4,000 characters. A feature `title` is
trimmed and must contain 1–120 characters. Support and bug requests do not
accept `title`.

A persisted support or bug request returns `201`:

```json
{ "submissionId": "…" }
```

A feature-category submission persists the support request and its list entry
in one transaction, then returns `201`:

```json
{ "submissionId": "…", "featureRequestId": "…" }
```

Only after that transaction succeeds, the server emits one
`support_request_submitted` event with the category. The message and title are
never analytics properties.

### `POST /v1/incident-reports`

The in-app "Something not working?" report. Strict body; unknown keys are
rejected:

```json
{
  "whatWentWrong": "Apps stayed locked after my walk.",
  "shouldHaveHappened": "They should have opened at 3,000 steps.",
  "app": { "version": "1.0.0", "build": "2", "osVersion": "18.5" },
  "reportedAt": "2026-09-18T10:15:00.000Z",
  "diagnostics": { "lock": { "state": "shield" }, "walking": { "phase": "inactive" } }
}
```

Both answers are trimmed and must contain 1–4,000 characters. `diagnostics`
is any JSON object up to 32 KB; a key naming raw location, contact details,
credentials or Screen Time app identity (see `incidents/diagnostics.ts`)
rejects the report with `400 DIAGNOSTICS_REJECTED`. A persisted report returns
`201 { "reportId": "…" }`; the row lives in `incident_reports` for later reading.

### `GET /v1/feature-requests`

Returns `200` with newest requests first. `voteCount` is authoritative and
`hasVoted` is scoped to the authenticated user:

```json
{
  "featureRequests": [
    {
      "id": "…",
      "submissionId": "…",
      "title": "Home Screen widget",
      "message": "Show my balance without opening the app.",
      "voteCount": 3,
      "hasVoted": true,
      "createdAt": "2026-07-29T21:00:00.000Z"
    }
  ]
}
```

### `POST /v1/feature-requests/:featureRequestId/votes`

The first vote returns `201` with:

```json
{ "status": "voted", "featureRequestId": "…", "voteCount": 1 }
```

A retry or double-tap by the same user is a database-enforced no-op and returns
`200` with:

```json
{ "status": "alreadyVoted", "featureRequestId": "…", "voteCount": 1 }
```

The unique `(feature_request_id, user_id)` database index is the source of this
decision; handler memory is not.

### Defined support errors

- `400 INVALID_SUPPORT_REQUEST` — malformed or out-of-bounds support body.
- `401 UNAUTHORIZED` — no verified Clerk identity.
- `404 USER_NOT_FOUND` — verified identity has no `users` row.
- `404 FEATURE_REQUEST_NOT_FOUND` — vote target does not exist.

Vendor route boundaries:

- Public: OAuth callbacks and verified webhook challenge/delivery endpoints.
- Clerk protected: connect, disconnect, and device event-feed endpoints.
- The webhook plugin alone replaces Fastify's JSON parser so signature checks
  receive the exact request bytes. That parser is encapsulated and cannot
  alter unrelated API routes.
- Provider/configuration errors are mapped to explicit 4xx/5xx response codes;
  no missing credential is silently ignored.

`POST /v1/webhooks/adapty` is the other intentional public exception. Adapty's
configured Authorization value is compared through fixed-width SHA-256 digests
before an empty verification request or subscription event is accepted. The
route never logs the header, customer id, or payload.

Route fixtures use `fastify.inject()`:

```sh
npm run test:server
```
