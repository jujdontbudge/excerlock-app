# Phase 3 report: tracking, alerts, server

## App events (registry: `packages/analytics-events`)

| Event | Properties | Where |
|---|---|---|
| `auth_started` | provider, operation (`save`, `sign_in`, `switch`) | sign-in screen, every save, sign-in, switch, code |
| `auth_completed` | provider, operation, result (`saved`, `existing_account`, `switched`, `code_sent`, `signed_in`, `cancelled`, `failed`), failure_code | same |
| `paywall_closed` | placement | Paywall Close |
| `journey_resumed` | resume_reason (`welcome`, `onboarding`, `paywall`, `setup`, `app`), access (`paid`, `unpaid`, `checking`) | launch routing |

Already present and kept (names unchanged so existing PostHog insights keep working): `runtime_launched`, `onboarding_screen_viewed`, `paywall_viewed`, `paywall_error`, `checkout_attempt_started` / `checkout_stage_recorded` / `checkout_attempt_completed` (purchase and restore, with `attempt_id`, outcome and failure stage), `sign_in_failed`.

## Sentry signals (rules need dashboard go-ahead)

| Tag `alert` | Fires when | Grouped by |
|---|---|---|
| `paid_locked_out` | a purchase returned success but Premium is still inactive two minutes later while the Paywall waits | entitlement status |
| `apple_sign_in_failed` | an Apple save or sign-in fails for a reason other than cancel, rate limit or an existing account | auth error code |
| `api_5xx` | the API answers 5xx | method + route |
| `api_429` | a signed-in route answers 429 | method + route |

## Server

- One JSON log line per request: request id, method, route template, status, duration, user id. No bodies, headers or query strings. One line per Adapty webhook: event type, Adapty profile id, customer user id.
- `GET /v1/subscription/complimentary`: reads a complimentary grant for the account's confirmed email. No Adapty call; 30 per minute. The new app reads complimentary Premium only from here.
- `POST /v1/subscription/resync` is unchanged on purpose. App Store builds on runtimes 4–7, and runtime 8 until the OTA ships, still gate on it; removing it would lock their paying users out. Delete it when those builds are no longer in use.

## Verified

- `./excer check`: 23 checks pass.
- `./excer server smoke` (throwaway Postgres 16, stubbed vendors) passes, with new steps: the complimentary route refuses no token, reads no grant as none, reads a confirmed email's grant without calling Adapty and records `matched_user_id`; the request log line has request id, route, status, duration and user id; logs contain no headers, tokens or emails. The existing resync, webhook, deletion and tombstone steps still pass.
- Simulator (worker `ExcerLock-payauth`): account/save-with-apple-keeps-account and account/existing-apple-switch-keeps-plan-and-purchase now also assert `auth_started` / `auth_completed`; launch/first-launch-welcome and launch/subscriber-opens-home pass with `journey_resumed`.
- Not verified: Sentry delivery (no DSN in the smoke run or the simulator dev build); PostHog ingestion of the new events.
