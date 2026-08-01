# Notify-only vendor webhooks

This module verifies callbacks, extracts only routing metadata, records the
exact callback body idempotently, and exposes a cursor feed to the device.
Account deletion later anonymizes the retained body and external user id while
preserving the delivery key; that is the only exact-body retention exception.

## The law

The server never converts a notification into exercise minutes or an earning
amount. It never writes an earning ledger and never decides a shield or lock
state. A webhook says only, "this vendor reports that something changed." The
authenticated device reads the notification and evaluates it on-device.

The receiver deliberately does not follow Oura or Polar object URLs and does
not call any vendor activity endpoint. The retained body is the thin webhook
notification, not a fetched workout or health record. Before production,
retention should still receive a policy review against Oura and WHOOP data
terms and an explicit deletion window.

## Verification

All HMACs use the exact UTF-8 request bytes captured by the scoped Fastify JSON
parser. Re-serializing parsed JSON would change signatures.

| Vendor | Verification | Relevant notifications recorded |
| --- | --- | --- |
| Strava | GET challenge compares `hub.verify_token`; POST compares `subscription_id`. Strava's public webhook documentation does not define a POST signature. | `activity.*`; `athlete` deauthorization is recorded and removes the connection |
| Oura | GET compares `verification_token`; POST verifies uppercase hex HMAC-SHA256 of `x-oura-timestamp + raw body` with the OAuth client secret | `daily_activity.*`, `workout.*` |
| WHOOP | POST verifies base64 HMAC-SHA256 of `X-WHOOP-Signature-Timestamp + raw body` with the OAuth client secret | `workout.*` |
| Polar | POST verifies lowercase hex HMAC-SHA256 of the raw body with the one-time webhook `signature_secret_key` | `EXERCISE`, `ACTIVITY_SUMMARY` |

Missing secrets return a clear `503 VENDOR_NOT_CONFIGURED`; a failed challenge
or signature returns `401 WEBHOOK_VERIFICATION_FAILED`. Unknown providers
return 404.

## Idempotency and feed

The canonical JSON body is SHA-256 hashed into a delivery key. The database
unique index on `(vendor, delivery_key)` makes replay insertion atomic.
`vendor_earn_recorded` is emitted only for the winning insert. Ignored
notification kinds and notifications that cannot be mapped to a connection
are acknowledged but are not recorded.

The device reads `GET /v1/vendors/events`. Rows are scoped by Clerk user id and
ordered by `(received_at, id)`. The response cursor encodes that pair so two
events with the same timestamp cannot be skipped.

## Coverage limits

Webhook presence is not proof of every condition:

- Strava and WHOOP can notify about workouts, but the device must read and
  evaluate the relevant vendor record.
- Oura can notify about daily activity and workouts; it cannot prove arbitrary
  live exercise merely because a callback arrived.
- Polar exercise/activity summary notifications point to newly available
  data; only the device's condition evaluation decides whether it satisfies a
  configured condition.

Fixtures cover valid and forged signatures for every vendor, exact raw-body
dispatch, replay, deauthorization, and cursor paging:

```sh
npm run test:server
```
