# Support

Support is the app-facing seam for support requests, feature requests, votes,
and their durable submission state. Callers import only `index.ts`, obtain the
adapter through `getSupportModule()`, or mount `SupportSettingsCard`.

## Interface and state

`SupportModule` exposes:

- support and feature submission;
- one vote per feature request, with an explicit `alreadyVoted` result;
- background refresh of the server-authoritative feature-request list;
- manual retry for failed submissions;
- a snapshot of submissions and feature requests;
- snapshot change subscription for renderers.

Each submission is `submitting`, `submitted`, or `failed`. A failure always
carries a user-facing reason. Settings renders those states as `Sending…`,
`Sent`, or `Not sent`; a failed request keeps its content and offers `Try
again`.

## Offline decision: save, report, and retry manually

Offline and failed sends are **not automatically queued**. They are saved under
the legacy `excerlock.support.mock.v1` key, reported truthfully as not sent,
and retried only after the user taps `Try again`. The key name is intentionally
unchanged so requests created with the mock survive the HTTP swap. This keeps
support work independent from core app behavior and avoids implying that a
background send will happen when no such worker exists.

Both adapters await every persistence write before resolving an action. A
submission persisted as `submitting` before an app interruption is restored as
`failed` with an interruption explanation, never as a request that is still
sending forever. Persisted values are validated before crossing the boundary.

HTTP failures are explicit:

- offline and timeout failures remain manually retryable;
- a `5xx` remains manually retryable as temporary server unavailability;
- a `4xx` remains visible but is not retryable as the same request;
- an invalid success receipt fails closed instead of leaving `Sending…`.

An unsent feature remains in submission history but is not presented as
votable. Vote failures resolve as explicit results and never change the visible
count without a valid server receipt.

## Mock and HTTP swap point

`HttpSupportModule` is the production adapter. It posts support and feature
requests to `POST /v1/support`, refreshes from `GET /v1/feature-requests`, and
votes through `POST /v1/feature-requests/:featureRequestId/votes`. Server
identifiers and vote counts replace local placeholders only after a valid
server receipt.

`MockSupportModule` is deterministic and persistent. Its online state, next
submission result, and clock are test drivers only; none cross the public
interface. The mock class is deliberately not exported from `index.ts`.

`getSupportModule()` is the single composition root and constructs the HTTP
adapter. `EXPO_PUBLIC_API_URL` supplies its base URL using Expo's public
build-time configuration; it is a host, not a secret. A missing value degrades
to the same saved offline behavior rather than crashing.

The HTTP adapter accepts an async access-token provider and sends a bearer token
when one exists. The composition root is currently keyless because the app's
separate Clerk adapter has not landed; it embeds no credential and lets the
protected server route return its defined `401` rejection.

## Analytics ownership

This module emits no analytics. `support_request_submitted` is server-owned in
`@excerlock/analytics-events`; the server records the authoritative persisted
action. The app suite exercises support submission, feature submission, and
voting with a recording sink and asserts that no server-owned event is emitted.

## Tests

From the repository root:

```sh
npm run test:app -- support
```

The boundary suite covers authenticated route payloads, feature refresh and
voting, offline/manual retry, timeout, `5xx`, `4xx`, malformed receipts, and
remount persistence. The renderer suite covers truthful state display and the
Settings composer flows. `supportAnalytics.test.tsx` guards the server-owned
analytics boundary.
