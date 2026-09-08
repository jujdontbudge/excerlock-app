# adapters/api

The one HTTP boundary to the VPS (`https://api.excerlock.com`, `app.json` `extra.apiBaseUrl` or
`EXPO_PUBLIC_API_BASE_URL` for a dev server). Every call carries the Supabase access token as a
bearer; the real runtime composition supplies `getAccessToken` from P2-T01's auth adapter.

`createApiClient` ports the old `SupportHttpClient` semantics: one timeout (10 s) covers the token
lookup, the request and the body read, the request is aborted when it fires, and nothing retries on
its own. Failures are `ApiError`s with a `kind` the screens branch on: `offline` (never left the
device), `timeout`, `unauthenticated` (no token, or 401), `rejected` (any other 4xx: retrying the same
input will not help) and `unavailable` (5xx: worth a retry later). `apiFailureMessage` turns one into
the sentence a screen shows, letting the reachability check decide for untyped errors.

## Endpoints

- `POST /v1/support` (`support.ts`, a `SupportPort`): body `{ category: 'problem' | 'question' | 'idea',
  message, replyTo, diagnostics }`, where `diagnostics` is rebuilt field by field from
  `domain/supportDiagnostics` (app version and build, iOS version, device model, entitlement status,
  the six permission statuses, rule count, last enforcement result truncated to 200 characters), so
  nothing else can travel; the server's schema is strict on the same fields. Limits agreed with P2-T02:
  `message` 1..4000 trimmed, `replyTo` a valid email of at most 254 characters (the composer caps the
  field), `lastEnforcementResult` at most 200. The server canonicalises the three categories to its
  own enum; the app never sees that mapping. 2xx is sent; anything else throws and the composer keeps
  the draft.
- `PUT /v1/user` and `DELETE /v1/user` (`user.ts`, a `UserApi`; `provisioning.ts` wraps them as
  `createVpsProvisioning(client)`, structurally P2-T01's `AccountProvisioning` with `provision` and
  `remove`), which the runtime composition passes to the Supabase auth adapter, the owner of both calls. `putUser` is idempotent
  provisioning and never throws (`ok`, `deleted` for a tombstoned uid, `failed` means retry later; the
  anonymous bootstrap never waits on it). `deleteUser` returns `ok` on 2xx, `deleted` on 404/410, and
  throws otherwise (502 `IDENTITY_ERASURE_FAILED` and 503 `ACCOUNT_DELETION_UNAVAILABLE` are safe to
  retry; the server checkpoints each processor). Both accept the token the adapter already holds so
  no second session lookup runs. Deletion writes a permanent tombstone, so every later call on that
  uid answers 410: the adapter starts a fresh anonymous session, never reusing the erased one. The
  server needs `SUPABASE_SERVICE_ROLE_KEY` on the box or it answers 503.

The feature-level deletion order stays `domain/identity`'s: subscription reset, analytics reset, then
`auth.deleteAccount()`, which the real adapter implements as server delete first, then the local
sign-out and a fresh anonymous session; a refused server call leaves the session as it was. Local rules,
progress, locked apps and settings stay on the device (D5). `AuthPort.deleteAccount()` means the account
is gone, for the fake and the adapter alike, so there is no decorator in between.
