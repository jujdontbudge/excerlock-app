---
id: account
title: Identity and account deletion
routes: [settings/account, sign-in, recovery]
scenarios: [signed-in-apple, trial-active, returning-unpaid, identity-lab-linked-providers, identity-lab-provider-attempts, identity-lab-established-provider-conflict]
server: [PUT /v1/user, DELETE /v1/user]
depends: [setup]
---
## Sub-features
- Identity is anonymous, or signed in with Apple, Google or an email code, through Supabase. The server keeps a canonical user (ADR 0011).
- A verified additional Apple or Google login can link to one established canonical account; a provider already owned by another account requires explicit recovery and never merges account data.
- Account screen: sign in, sign out and delete account. Signing out revokes main-app access until a new explicit sign-in.
- Account deletion erases server data and returns the app to an anonymous session behind the sign-in gate.
- An unpaid account keeps a restricted Account and help surface for deletion, data export, subscription management and restore, support, and legal documents without mounting paid Settings.

## How to get to it (user POV)
Settings → the profile row → Account. From the hard Paywall, open Account and help for the restricted recovery surface.

## Driving it with excer
Run `./excer demo signed-in-apple --open /settings/account`. To assert what the server did, run it locally and check the database. `./excer server ready` must pass first.

```proof
name: provider-attempts-fail-closed-until-success
scenario: identity-lab-provider-attempts
open: dev?journey=signIn
tap: Continue with Apple | Continue with Google | Continue with Google
wait: 30
expect: Become ADDICTED to exercise
then-open: /dev
then-expect: Journey paywall · paid no · admitted no | Active account Checkout | Provider attempts Apple canceled · Google failed · Google success · account lab-checkout-1 · grants 0 | lab_provider_attempt {"provider":"apple","attempt":1,"result":"cancelled","account":"lab-checkout-1","grants":0} | lab_provider_attempt {"provider":"google","attempt":1,"result":"failed","account":"lab-checkout-1","grants":0} | lab_provider_attempt {"provider":"google","attempt":2,"result":"success","account":"lab-checkout-1","grants":0} | lab_link_identity {"provider":"google","result":"ok"} | subscription_proof_checked {"account":"lab-checkout-1","result":"ineligible"} | Protected route mounts | None
```

```proof
name: linked-providers-one-account
scenario: identity-lab-linked-providers
open: /dev
tap: Run linked provider isolation
wait: 30
expect: Active account A | Condition owner Account A | History Days 1 | Profile Account A | Saved Gym Gym A | Linked providers canonical lab-user-a Apple lab-user-a Google lab-user-a accounts 1 grants 1 conflict recovery required data A account-a/1/Account A/Gym A data Apple account-a/1/Account A/Gym A data Google account-a/1/Account A/Gym A data conflict account-a/1/Account A/Gym A | lab_link_identity {"provider":"google","result":"ok"} | lab_link_identity {"provider":"apple","result":"conflict"} | lab_recovered_account {"provider":"apple","user":"lab-user-a"} | lab_recovered_account {"provider":"google","user":"lab-user-a"}
```

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

```proof
name: recovery-without-subscription
scenario: returning-unpaid
open: /
tap: Sign in | Continue with Apple | Account and help | Manage subscription in App Store | Export my data | Create export | Restore purchases | Help and feedback | Back | Terms of use | Back | Privacy policy | Back | Account and deletion | Delete account | Keep my account
expect: Account | Signed in with Apple | Delete account
then-open: /dev
then-expect: Journey paywall · paid no · admitted no | subscription_management_opened {} | export_requested {"rules":1,"days":1,"earnedUnlocks":0,"visits":0} | restore {} | Protected route mounts | None
```

```proof
name: deletion-and-late-callbacks-user-path
scenario: identity-lab-deletion-callbacks
open: /dev
tap: Prepare deletion callback user path | Sign in to manage your account | Continue with Apple | Account and help | Account and deletion | Delete account
expect: Delete your account forever? | Deleting your account does not cancel an App Store subscription. | Delete account forever
then-tap: Delete account forever
then-open: /dev
then-expect: Journey welcome · paid no · admitted no | Active account Checkout | Condition owner None | History Days 0 | Profile None | Saved Gym None | Purchase operations 1 | Restore operations 1 | Delayed callbacks 0/2 | Deletion isolation lab-user-a deleted tombstone preserved fresh lab-checkout- | Entitlement none admission ineligible data erased recovery pending callbacks 2/2 | Protected route mounts | None
wait: 30
```

## Gotchas
- A restored signed-in session is not launch approval. `/settings/account` deep links redirect to sign-in until Apple, Google or an email code is completed in this process (ADR 0049; setup/returning-settings-blocked).
- Known gap: account deletion does not erase `incident_reports` rows. The server rebuild fixes this.
- The server reads `SUPABASE_JWKS_URL`. Older docs said `SUPABASE_JWT_JWKS_URL`.
