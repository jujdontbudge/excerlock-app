# Vendor integrations

This module owns OAuth state, provider request/response shapes, encrypted token
storage, refresh, and revocation for Strava, Oura, WHOOP, and Polar. HTTP calls
cross the small `VendorHttpClient` interface so tests use recorded response
shapes without credentials.

## Architectural law: notifications are not earnings

Vendor webhooks are **notify-only**. The server stores the exact, thin callback
notification so an authenticated device can fetch it later. The server does
not fetch activity details in response to a webhook, interpret activity
duration, calculate minutes or value, update a ledger, or decide shield/lock
state. Those decisions belong to the on-device ledger and condition model.

`vendor_earn_recorded` means only that a relevant vendor notification was
durably recorded. It does not mean that the server awarded anything.

## HTTP routes

- `GET /v1/vendors/:vendor/connect` creates a one-use, ten-minute OAuth state
  record and redirects to the provider. It requires Clerk authentication.
- `GET /v1/vendors/:vendor/callback` consumes the state before exchanging the
  authorization code. It is public because the provider redirects to it.
- `DELETE /v1/vendors/:vendor` revokes provider access, deletes the encrypted
  local connection, and emits `vendor_disconnected`. It requires Clerk
  authentication.
- `GET /v1/vendors/events?cursor=...&limit=...` returns the authenticated
  user's recorded notifications in stable receive-time/id order. The opaque
  cursor is device-owned; the device evaluates each notification.

## Provider OAuth contracts

| Vendor | Authorization and exchange | Identity / refresh | Disconnect |
| --- | --- | --- | --- |
| Strava | `https://www.strava.com/oauth/authorize`; form POST to `/oauth/token` | Athlete id comes with the exchange; rotating access and refresh tokens use the same token endpoint | Form POST to the modern `/oauth/revoke` endpoint using HTTP Basic client authentication |
| Oura | `https://cloud.ouraring.com/oauth/authorize`; form POST to `https://api.ouraring.com/oauth/token` | `/v2/usercollection/personal_info`; rotating access and refresh tokens | POST to the documented `/oauth/revoke?access_token=...` URL. Oura's public page does not state the verb, so this must be credential-tested before production |
| WHOOP | `https://api.prod.whoop.com/oauth/oauth2/auth`; form POST to `/oauth/oauth2/token` | `/developer/v2/user/profile/basic`; rotating access and refresh tokens with `offline` scope | DELETE `/developer/v2/user/access` with the bearer token |
| Polar | `https://flow.polar.com/oauth2/authorization`; HTTP Basic form POST to `https://polarremote.com/v2/oauth2/token` | `x_user_id` comes with the exchange, then the user is registered at `POST /v3/users`; Polar supplies no refresh grant | DELETE `/v3/users/{polar-user-id}` with the bearer token |

Provider response bodies are parsed with strict schemas. A non-success response
or an invalid body fails explicitly; it never creates a partial connection.
Polar's documented `409` "already registered" response is accepted during
registration.

Primary documentation:

- [Strava authentication](https://developers.strava.com/docs/authentication/)
- [Strava webhooks](https://developers.strava.com/docs/webhooks/)
- [Oura authentication](https://cloud.ouraring.com/docs/authentication)
- [Oura API v2 and webhooks](https://cloud.ouraring.com/v2/docs)
- [WHOOP OAuth](https://developer.whoop.com/docs/developing/oauth/)
- [WHOOP webhooks](https://developer.whoop.com/docs/developing/webhooks/)
- [Polar AccessLink API](https://www.polar.com/accesslink-api/)

## Secrets and token storage

Every provider operation validates its own settings on first use and reports
the exact missing variable. This is intentional while ticket #24 credentials
do not exist:

- `VENDOR_OAUTH_CALLBACK_BASE_URL`
- `VENDOR_TOKEN_ENCRYPTION_KEY`
- `{STRAVA,OURA,WHOOP,POLAR}_CLIENT_ID`
- `{STRAVA,OURA,WHOOP,POLAR}_CLIENT_SECRET`
- `STRAVA_WEBHOOK_VERIFY_TOKEN`
- `STRAVA_WEBHOOK_SUBSCRIPTION_ID`
- `OURA_WEBHOOK_VERIFY_TOKEN`
- `POLAR_WEBHOOK_SIGNATURE_SECRET`

`VENDOR_TOKEN_ENCRYPTION_KEY` is canonical base64 for exactly 32 random bytes.
Access and refresh tokens are encrypted independently with AES-256-GCM and a
fresh 96-bit IV. The versioned ciphertext stores only IV, authentication tag,
and ciphertext. Refreshed access/refresh ciphertexts and expiry are persisted
in one database update before the new access token is returned.

## Tests

From the repository root:

```sh
npm run test:server
```
