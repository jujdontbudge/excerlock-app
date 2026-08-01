# ExcerLock server

Self-contained Node 22+ Fastify API skeleton for the ExcerLock VPS backend.

## Contract

- Public liveness is exposed at `GET /v1/health`.
- User-facing APIs live under `/v1` and pass through the Clerk auth boundary.
- Support submissions persist through `POST /v1/support`; feature requests are
  listed and voted on through `/v1/feature-requests`.
- OAuth callbacks and signed vendor webhook receivers are the intentionally
  public exceptions; connect, disconnect, and cursor reads require Clerk.
- The shared-secret-verified Adapty webhook mirrors subscription access and
  remains retry-safe after account deletion.
- Drizzle/Postgres, Sentry, and PostHog initialize lazily or no-op when their
  environment values are absent.

## Hides

SDK construction, database connection details, and route-plugin registration
stay behind the server composition and service boundaries.

## Invariants

- Clerk id is the identity spine across Clerk, Postgres, Adapty, and PostHog.
- The server stores account/integration state and proxies trusted services.
- Vendor webhooks are notify-only: the server records thin raw notifications
  but does not fetch or interpret activity details in the webhook path.
- Support and feature persistence records submitted content and votes only.
  A database unique index allows one vote per user and feature request.
- Earning and screen-time balance computation are always on-device and never
  implemented in this package.

## Analytics

`src/services/analytics.ts` is the server's only PostHog `capture()` forwarder.
Its public wrapper accepts only `ServerEventName` entries from
`@excerlock/analytics-events`, and each event payload is typed by the registry's
`PropsOf<Event>`. It remains inert without `POSTHOG_API_KEY` and stamps
`app: "excerlock"` on configured captures.

## Fixtures

None. HTTP behavior is exercised in process through `fastify.inject()`.

## Commands

```sh
npm install
npm test
npm run typecheck
npm run build
```
