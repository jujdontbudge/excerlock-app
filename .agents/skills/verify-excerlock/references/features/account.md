---
id: account
title: Identity and account deletion
routes: [settings/account, sign-in, recovery]
scenarios: [signed-in-apple, trial-active, returning-unpaid, identity-lab-established-provider-conflict]
server: [PUT /v1/user, DELETE /v1/user]
depends: [setup]
---
## Sub-features
- Identity is anonymous, or signed in with Apple, Google or an email code, through Supabase. The server keeps a canonical user (ADR 0011).
- Account screen: sign in, sign out and delete account. Signing out revokes main-app access until a new explicit sign-in.
- Account deletion erases server data and returns the app to an anonymous session behind the sign-in gate.

## How to get to it (user POV)
Settings → the profile row → Account.

## Driving it with excer
Run `./excer demo signed-in-apple --open /settings/account`. To assert what the server did, run it locally and check the database. `./excer server ready` must pass first.

```proof
name: established-provider-conflict-stays-separated
scenario: identity-lab-established-provider-conflict
open: dev?journey=signIn
tap: Continue with Apple
wait: 30
expect: Sign in with the account already on this device. | Recover with Apple
then-open: /dev
then-expect: Journey signIn · paid no · admitted no | Active account B | Condition owner Account B | History Days 1 | Profile Account B | Saved Gym Gym B | Provider conflict B preserved Apple owner lab-user-a links 0 session restores 1 Entitlement none data account-b/1/Account B/Gym B | lab_recovered_account {"provider":"apple","user":"lab-user-a"} | lab_session_restored {"user":"lab-user-b"}
```

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

```proof
name: email-entry
scenario: trial-active
open: /sign-in
tap: Continue with email
expect: Sign in with email | Email address | Send code
```

```proof
name: unpaid-account-recovery
scenario: returning-unpaid
open: /
tap: Sign in | Continue with Apple | Account and help
expect: Account and help | Account and deletion | Manage subscription in App Store | Help and feedback
```

## Gotchas
- A restored signed-in session is not launch approval. `/settings/account` deep links redirect to sign-in until Apple, Google or an email code is completed in this process (ADR 0049; setup/returning-settings-blocked).
- Known gap: account deletion does not erase `incident_reports` rows. The server rebuild fixes this.
- The server reads `SUPABASE_JWKS_URL`. Older docs said `SUPABASE_JWT_JWKS_URL`.
