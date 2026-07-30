# Routes

This module owns the `/v1/*` Fastify transport for health, support, user, and
vendor endpoints. Handlers validate transport data and delegate; they contain
no earning, ledger, shield, or lock decisions.

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

Route fixtures use `fastify.inject()`:

```sh
npm run test:server
```
