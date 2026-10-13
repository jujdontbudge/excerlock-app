---
id: account
title: Identity and account deletion
routes: [settings/account, sign-in, recovery]
scenarios: [signed-in-apple, trial-active, returning-unpaid, identity-lab-linked-providers, identity-lab-provider-attempts, identity-lab-email-challenges, identity-lab-established-provider-conflict]
server: [PUT /v1/user, DELETE /v1/user, POST /v1/subscription/resync]
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
name: email-code-failures-use-only-current-challenge
scenario: identity-lab-email-challenges
open: dev?journey=signIn
actions: tap Continue with email | type a@b.co | tap Send code | tap Verification code | type 111111 | tap Verify code | tap Verification code | type 222222 | tap Verify code | tap Resend code | tap Verification code | type 333333 | tap Verify code | tap Verification code | type 444444 | tap Verify code
wait: 30
expect: Become ADDICTED to exercise
then-open: /dev
then-expect: Journey paywall · paid no · admitted no | Active account Checkout | Email challenges invalid · expired · superseded · success · account lab-checkout-1 · grants 0 | lab_email_challenge {"challenge":1,"result":"invalid","account":"lab-checkout-1","grants":0} | lab_email_challenge {"challenge":1,"result":"expired","account":"lab-checkout-1","grants":0} | lab_email_challenge {"challenge":1,"result":"superseded","account":"lab-checkout-1","grants":0} | lab_email_challenge {"challenge":2,"result":"success","account":"lab-checkout-1","grants":0} | subscription_proof_checked {"account":"lab-checkout-1","result":"ineligible"} | Protected route mounts | None
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
expect: Please use the account you signed up with. | Recover with Apple
absent: already on this device
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
scenario: fresh-install
open: /sample-paywall?stage=sign-in
tap: Continue with email
expect: Sign up with email | Email address | Send code
```

```proof
name: unpaid-account-recovery
scenario: returning-unpaid
open: /
tap: Account and help
expect: Account and help | Account and deletion | Manage subscription in App Store | Help and feedback
```

```proof
name: account-and-help-back-returns-to-paywall
scenario: returning-unpaid
open: /
tap: Account and help | Back
expect: Start for $0.00 | Restore purchases | Account and help
```

```proof
name: recovery-without-subscription
scenario: returning-unpaid
open: /
tap: Account and help | Manage subscription in App Store | Export my data | Create export | Restore purchases | Help and feedback | Back | Terms of use | Back | Privacy policy | Back | Account and deletion | Delete account | Keep my account
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
- A sign-in is remembered on this install until Sign out or Delete account, so `/settings/account` opens directly for a returning account (ADR 0061; setup/returning-settings-opens). A reinstall asks for sign-in again.
- Known gap: account deletion does not erase `incident_reports` rows. The server rebuild fixes this.
- The server reads `SUPABASE_JWKS_URL`. Older docs said `SUPABASE_JWT_JWKS_URL`.

The complimentary local harness is enabled only in a development bundle with `EXPO_PUBLIC_EXCER_LOCAL_ACCESS=1`. It requires loopback `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_API_URL` and a local `EXPO_PUBLIC_SUPABASE_ANON_KEY`. It runs the production Supabase email-code adapter, identity coordinator, Adapty Entitlement adapter and server admission adapter. Session storage is namespaced local AsyncStorage because the reused simulator Debug binary cannot use Keychain. Adapty SDK, telemetry, sensors and Screen Time are local stand-ins; it cannot purchase or prove native shields. Provision a local confirmed email grant in the Sandbox lane, then use Welcome → Sign in → Continue with email → Send code → Verify code from the local mail sink and finish Setup. Never connect this harness to real accounts or vendor services. The following proof starts from that established user path, captures the admitted app and proves a cold relaunch. The sign-in actions and sink/database evidence are recorded separately because OTPs must not be committed.

```proof
name: complimentary-email-code-keeps-access
open: /
expect: Add condition | Home
absent: Start for $0.00 | Let's try that again
relaunch-after-expect: true
after-relaunch-expect: Add condition | Home
wait: 30
```

After revoking that grant in the local CLI and a successful foreground check, this focused proof verifies loss of protected access. Its precondition is a confirmed inactive paid mirror; unknown paid evidence opens verification instead.

```proof
name: complimentary-revoked-opens-paywall
open: /
expect: Restore purchases | Account and help
absent: Add condition
wait: 30
```

Sign out of the granted account, then use Welcome's email code to recover a different confirmed unpaid account with no grant and an inactive Sandbox paid mirror. The previous account's grant must not follow it.

```proof
name: complimentary-non-granted-opens-paywall
open: /
expect: Restore purchases | Account and help
absent: Add condition
wait: 30
```

The next two proofs use a verified finite complimentary grant, then stop only the isolated local API/auth services while keeping Metro running. The first runs before the response expiry; the second runs after it. Both capture cold process launches. This distinguishes cached offline access from the absence of a three-day paid grace for grants.

```proof
name: complimentary-offline-keeps-home
open: /
expect: Add condition | Home
absent: Start for $0.00 | Let's try that again
relaunch-after-expect: true
after-relaunch-expect: Add condition | Home
wait: 30
```

```proof
name: complimentary-offline-expiry-closes-access
open: /
expect: Let's try that again | Try again | Account and help
absent: Add condition
wait: 30
```
