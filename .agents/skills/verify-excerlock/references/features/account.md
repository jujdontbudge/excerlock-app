---
id: account
title: Identity and account deletion
routes: [settings/account, sign-in]
scenarios: [signed-in-apple, trial-active]
server: [PUT /v1/user, DELETE /v1/user]
depends: [setup]
---
## Sub-features
- Identity is anonymous, or signed in with Apple, Google or an email code, through Supabase. The server keeps a canonical user (ADR 0011).
- Account screen: sign in, sign out and delete account.
- Account deletion erases server data and returns the app to an anonymous session.

## How to get to it (user POV)
Settings → the profile row → Account.

## Driving it with excer
Run `./excer demo signed-in-apple --open /settings/account`. To assert what the server did, run it locally and check the database. `./excer server ready` must pass first.

```proof
name: signed-in
scenario: signed-in-apple
open: /settings/account
expect: Account | Signed in with Apple | Delete account
```

```proof
name: anonymous
scenario: trial-active
open: /settings/account
expect: Not signed in | Sign in
```

## Gotchas
- Known gap: account deletion does not erase `incident_reports` rows. The server rebuild fixes this.
- The server reads `SUPABASE_JWKS_URL`. Older docs said `SUPABASE_JWT_JWKS_URL`.
