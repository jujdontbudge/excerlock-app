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
  nothing else can travel. 2xx is sent; anything else throws and the composer keeps the draft.
- `DELETE /v1/user` (`user.ts`): 204 is deleted, 404 and 410 mean already deleted, anything else throws.
  `withServerDeletion(auth, userApi)` wraps an `AuthPort` so `deleteAccount()` runs the server's
  ordered erasure (Adapty, PostHog, then the Supabase user) before the local session teardown. The
  server goes first because it needs the live token; if it refuses, nothing local changes and the user
  can retry from the same signed-in state.

The feature-level deletion order stays `domain/identity`'s: subscription reset, analytics reset, then
`auth.deleteAccount()`, which is now server delete followed by the local sign-out and a fresh anonymous
session. Local rules, progress, locked apps and settings stay on the device (D5).
