# Support

Support is the app-facing seam for support requests, feature requests, votes,
and their durable submission state. Callers import only `index.ts`, obtain the
adapter through `getSupportModule()`, or mount `SupportSettingsCard`.

## Interface and state

`SupportModule` exposes:

- support and feature submission;
- one vote per feature request, with an explicit `alreadyVoted` result;
- manual retry for failed submissions;
- a snapshot of submissions and feature requests;
- snapshot change subscription for renderers.

Each submission is `submitting`, `submitted`, or `failed`. A failure always
carries a user-facing reason. Settings renders those states as `Sending…`,
`Sent`, or `Not sent`; a failed request keeps its content and offers `Try
again`.

## Offline decision: save, report, and retry manually

Offline and failed sends are **not automatically queued**. They are saved under
`excerlock.support.mock.v1`, reported truthfully as not sent, and retried only
after the user taps `Try again`. This keeps support work independent from core
app behavior and avoids implying that a background send will happen when no
such worker exists.

The mock awaits every persistence write before resolving an action. A
submission that was persisted as `submitting` before an app interruption is
restored as `failed` with an interruption explanation, never as a request that
is still sending forever. Persisted values are validated before crossing the
boundary.

## Mock and HTTP swap point

`MockSupportModule` is deterministic and persistent. Its online state, next
submission result, and clock are test drivers only; none cross the public
interface. The mock class is deliberately not exported from `index.ts`.

`getSupportModule()` is the single composition root. The real HTTP client will
replace the constructor in `accessor.ts` without changing Settings or other
callers.

The audited server contract currently exposes only `POST /v1/support`, whose
route returns the shared `501 Not Implemented` response. It exposes no decided
feature-list or vote route in `server/src/routes/support.ts`. This app module
therefore does not invent an endpoint or an HTTP payload. The persistent mock
remains the composition root until those server route shapes exist.

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

The boundary suite covers successful and failed sends, offline/manual retry,
remount persistence, feature submission, voting and double-vote handling. The
renderer suite covers truthful state display and the Settings composer flows.
