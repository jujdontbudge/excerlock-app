---
id: account
title: Identity and account deletion
routes: [settings/account, sign-in, recovery]
scenarios: [signed-in-apple, trial-active, returning-unpaid, identity-lab-linked-providers, identity-lab-provider-attempts, identity-lab-email-challenges, identity-lab-established-provider-conflict, review-verification-unavailable, review-store-null, review-store-timeout, review-server-error, review-server-timeout, review-offline, review-server-unknown, review-store-retry, review-verification-retry, review-pending-unavailable, review-admission-network-retry, review-admission-timeout-retry, review-admission-mirror-retry]
server: [PUT /v1/user, DELETE /v1/user, POST /v1/subscription/resync]
events: [subscription_verification_failed]
depends: [setup]
---
## Sub-features
- Identity is anonymous, or signed in with Apple, Google or an email code, through Supabase. The server keeps a canonical user (ADR 0011).
- A verified additional Apple or Google login can link to one established canonical account; a provider already owned by another account requires explicit recovery and never merges account data.
- Account screen: sign in, sign out and delete account. Signing out revokes main-app access until a new explicit sign-in.
- Account deletion erases server data and returns the app to an anonymous session behind the sign-in gate.
- An unpaid account keeps a restricted Account and help surface for deletion, data export, subscription management and restore, support, and legal documents without mounting paid Settings.
- Successful sign-in with no unfinished purchase opens the Paywall even when verification is unavailable. Prior or unknown paid access requires verification before another checkout; unfinished purchases retain recovery. Try again restarts the failed identity, StoreKit or admission step (ADR 0087).

## How to get to it (user POV)
Settings → the profile row → Account. From the hard Paywall, open Account and help for the restricted recovery surface.

## Driving it with excer

Run `./excer demo signed-in-apple --open /settings/account`. To assert what the server did, run it locally and check the database. `./excer server ready` must pass first.

```proof
name: fresh-apple-unavailable-reaches-paywall
scenario: review-verification-unavailable
open: /onboarding/O01
actions: tap Sign in | tap Continue with Apple
expect: Restore purchases | Continue
absent: Let's try that again
then-open: /dev
then-expect: Journey paywall · paid no · admitted no | Protected route mounts | None
```

```proof
name: provider-attempts-fail-closed-until-success
scenario: identity-lab-provider-attempts
open: dev?journey=signIn
tap: Continue with Apple | Continue with Google | Continue with Google
wait: 30
expect: HACK your brain and become ADDICTED to exercise.
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
name: established-provider-selects-isolated-account
scenario: identity-lab-established-provider-conflict
open: dev?journey=signIn
tap: Continue with Apple
wait: 30
expect: Restore purchases
then-open: /dev
then-expect: Journey paywall · paid no · admitted no | Active account A | Condition owner Account A | History Days 1 | Profile Account A | Saved Gym Gym A | lab_recovered_account {"provider":"apple","user":"lab-user-a"}
```

Welcome's Sign in opens the full-screen sign-in. A verified email can select a new or existing account, including a new complimentary recipient. Resending within 60 seconds keeps the current code available.

```proof
name: welcome-email-code-allows-new-account
scenario: fresh-install
open: /onboarding/O01
actions: tap Sign in | tap Continue with email | type new@a.co | tap Send code
expect: Check your email | We sent a six-digit code to new@a.co | Verification code
absent: No account found
```

```proof
name: welcome-new-email-can-sign-in
scenario: identity-lab-email-new
open: /onboarding/O01
actions: tap Sign in | tap Continue with email | type n@b.co | tap Send code | tap Verification code | type 123456
expect: Restore purchases
then-open: /dev
then-expect: lab_email_verified {"challenge":1,"ok":true,"consumed":false} | lab_adapty_identify {"user":"lab-email-account"} | Journey paywall · paid no · admitted no
```

```proof
name: welcome-sign-in-code-rate-limited
scenario: fresh-install
open: /onboarding/O01
actions: tap Sign in | tap Continue with email | type me@a.co | tap Send code | expect Check your email | tap Use a different email | tap Send code
expect: Check your email | We sent a six-digit code to me@a.co | Resend code in
absent: That didn't work
```

```proof
name: welcome-sign-in-code-verifies-itself
scenario: fresh-install
open: /onboarding/O01
actions: tap Sign in | tap Continue with email | type me@a.co | tap Send code | expect Check your email | tap Verification code | type 123456
expect: Restore purchases
absent: That code didn't work | That didn't work
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
expect: Continue | Restore purchases | Account and help
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

The complimentary local harness is enabled only in a development bundle with `EXPO_PUBLIC_EXCER_LOCAL_ACCESS=1`. It requires loopback `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_API_URL` and a local `EXPO_PUBLIC_SUPABASE_ANON_KEY`. It runs the production Supabase email-code adapter, identity coordinator, Adapty Entitlement adapter and server admission adapter. Session storage is namespaced local AsyncStorage because the reused simulator Debug binary cannot use Keychain. Adapty SDK, telemetry, sensors and Screen Time are local stand-ins; it cannot purchase or prove native shields. Provision a local confirmed email grant in the Sandbox lane, then use Welcome → Sign in → Continue with email → Send code → Verify code from the local mail sink and finish Setup. Never connect this harness to real accounts or vendor services. The following proof starts from that established user path, captures the admitted app and proves a cold relaunch. The sign-in actions and sink/database evidence are recorded separately because OTPs must not be committed.

```proof
name: complimentary-email-code-keeps-access
open: /
expect: Add condition | Home
absent: Get your DREAM BODY with ExcerLock | Let's try that again
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
absent: Get your DREAM BODY with ExcerLock | Let's try that again
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

ADR 0086 replaces same-UID reauthentication with verified account recovery. These focused proofs use the production auth adapter, coordinator, purchase journal and subscription adapter with scripted provider/StoreKit responses. Native purchases and Apple ID authorization remain physical-device gates.

```proof
name: checkout-new-email-verifies-once
scenario: identity-lab-email-new
open: /dev?journey=paywall
actions: tap Continue | tap Continue with email | type n@b.co | tap Send code | tap Verification code | type 123456
expect: Allow Screen Time
absent: That code didn't work | Let's try that again
then-open: /dev
then-expect: lab_email_verified {"challenge":1,"ok":true,"consumed":false} | lab_adapty_identify {"user":"lab-email-account"} | lab_restore {"result":"restored","owner":"lab-email-account","source":"adapter"} | Journey setup · paid yes · admitted no
wait: 30
```

```proof
name: checkout-existing-email-connects-purchase
scenario: identity-lab-email-existing
open: /dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year | tap Continue | expect Continue with email | tap Continue with email | type e@b.co | tap Send code | tap Verification code | type 123456
expect: Allow Screen Time
absent: That code didn't work | Let's try that again
then-open: /dev
then-expect: lab_email_verified {"challenge":1,"ok":true,"consumed":false} | lab_restore {"result":"restored","owner":"lab-email-account","source":"adapter"} | Journey setup · paid yes · admitted no
wait: 30
```

```proof
name: checkout-paid-email-keeps-both-entitlements
scenario: identity-lab-email-paid
open: /dev?journey=paywall
actions: tap Continue | tap Continue with email | type p@b.co | tap Send code | tap Verification code | type 123456
expect: Allow Screen Time
then-open: /dev
then-expect: lab_email_verified {"challenge":1,"ok":true,"consumed":false} | lab_restore {"result":"restored","owner":"lab-email-account","source":"adapter"} | Journey setup · paid yes · admitted no
wait: 30
```

```proof
name: wrong-email-code-then-right-code
scenario: identity-lab-email-existing
open: /dev?journey=signIn
actions: tap Continue with email | type e@b.co | tap Send code | tap Verification code | type 000000 | expect That code didn't work | tap Verification code | type 123456
expect: Restore purchases
absent: That code didn't work
then-open: /dev
then-expect: lab_email_verified {"challenge":1,"ok":false,"consumed":false} | lab_email_verified {"challenge":1,"ok":true,"consumed":false} | Journey paywall · paid no · admitted no
wait: 30
```

```proof
name: rate-limit-retains-verifiable-code
scenario: identity-lab-email-rate-limited
open: /dev?journey=signIn
actions: tap Continue with email | type e@b.co | tap Send code | expect Resend code in | tap Verification code | type 123456
expect: Restore purchases
then-open: /dev
then-expect: sign_in_failed {"provider":"email","surface":"sign_up","reason_class":"rate_limited","failure_code":"EMAIL_RATE_LIMITED"} | lab_email_verified {"challenge":1,"ok":true,"consumed":false}
wait: 30
```

```proof
name: apple-unknown-cancel-retry-stays-on-signin
scenario: identity-lab-apple-unknown
open: /dev?journey=signIn
actions: tap Continue with Apple | expect Apple sign-in is unavailable. Try again or continue with email. | tap Continue with Apple | expect Continue with email | tap Continue with Apple
expect: Restore purchases
then-open: /dev
then-expect: lab_provider_attempt {"provider":"apple","attempt":1,"result":"unknown","account":"lab-checkout-1","grants":0} | lab_provider_attempt {"provider":"apple","attempt":2,"result":"cancelled","account":"lab-checkout-1","grants":0} | lab_provider_attempt {"provider":"apple","attempt":3,"result":"success","account":"lab-checkout-1","grants":0}
wait: 30
```

The following focused proof starts after sending a real code through the isolated local Supabase/mail harness. It cold-launches the actual simulator app without resetting the scenario or storing the code. Fixture email and database assertions stay in the ignored evidence directory.

```proof
name: pending-email-code-survives-relaunch
open: /
expect: Check your email | Verification code | We sent a six-digit code
absent: Let's try that again
relaunch-after-expect: true
after-relaunch-expect: Check your email | Verification code | We sent a six-digit code
wait: 30
```

With the same local email grant, sign out through Settings → Account, load the completed Screen Time fixture, and sign in again using the next delivered code. Seed coordinates on the owned simulator before cold launch so the fixture's authorized location lookup can complete. The account must enter Home without another Screen Time page and keep access after process death.

```proof
name: email-sign-in-after-completed-setup
open: /
expect: Home | Conditions
absent: Allow Screen Time | Check your email | Let's try that again
relaunch-after-expect: true
after-relaunch-expect: Home | Conditions
wait: 30
```

```proof
name: fresh-store-null-reaches-paywall
scenario: review-store-null
open: /onboarding/O01
actions: tap Sign in | tap Continue with Apple
expect: Restore purchases | Continue
absent: Let's try that again
wait: 35
```

```proof
name: fresh-store-timeout-reaches-paywall
scenario: review-store-timeout
open: /onboarding/O01
actions: tap Sign in | tap Continue with Apple
expect: Restore purchases | Continue
absent: Let's try that again
wait: 35
```

```proof
name: fresh-server-error-reaches-paywall
scenario: review-server-error
open: /onboarding/O01
actions: tap Sign in | tap Continue with Apple
expect: Restore purchases | Continue
absent: Let's try that again
wait: 35
```

```proof
name: fresh-server-timeout-reaches-paywall
scenario: review-server-timeout
open: /onboarding/O01
actions: tap Sign in | tap Continue with Apple
expect: Restore purchases | Continue
absent: Let's try that again
wait: 50
then-open: /dev
then-expect: Journey paywall · paid no · admitted no | review_admission_request {"attempt":2 | request_timeout
```

```proof
name: fresh-offline-reaches-paywall
scenario: review-offline
open: /onboarding/O01
actions: tap Sign in | tap Continue with Apple
expect: Restore purchases | Continue
absent: Let's try that again
wait: 35
```

```proof
name: fresh-email-unavailable-reaches-paywall
scenario: review-server-unknown
open: /onboarding/O01
actions: tap Sign in | tap Continue with email | tap Email address | type r@a.co | expect Email address r@a.co | tap Send code | expect Check your email | tap Verification code | type 123456
expect: Restore purchases | Continue | Account and help
absent: Let's try that again
then-open: /dev
then-expect: Journey paywall · paid no · admitted no | subscription_verification_failed | subscription_unknown
```

```proof
name: store-environment-recovers-on-retry
scenario: review-store-retry
open: /onboarding/O01
actions: tap Sign in | tap Continue with Apple | expect Try again
swipe: 0.5,0.8,0.5,0.25
expect: Try again | Restore purchases
then-tap: Try again
then-open: /dev
then-expect: Journey app · paid yes · admitted yes | review_store_environment {"attempt":5 | /testflight/v1/subscription/resync
```

```proof
name: admission-recovers-on-retry
scenario: review-verification-retry
open: /onboarding/O01
actions: tap Sign in | tap Continue with Apple
expect: Home | Conditions
wait: 45
then-open: /dev
then-expect: Journey app · paid yes · admitted yes | review_admission_request {"attempt":2
```

Admission retries use the production server adapter with scripted HTTP responses. One retry covers a transient 5xx, network failure, timeout, or unknown webhook mirror; a permanent timeout remains unpaid after two bounded attempts. They do not establish real Adapty webhook timing.

```proof
name: admission-recovers-after-network-error
scenario: review-admission-network-retry
open: /onboarding/O01
actions: tap Sign in | tap Continue with Apple
expect: Home | Conditions
wait: 45
then-open: /dev
then-expect: Journey app · paid yes · admitted yes | review_admission_request {"attempt":2
```

```proof
name: admission-recovers-after-timeout
scenario: review-admission-timeout-retry
open: /onboarding/O01
actions: tap Sign in | tap Continue with Apple
expect: Home | Conditions
wait: 45
then-open: /dev
then-expect: Journey app · paid yes · admitted yes | review_admission_request {"attempt":2
```

```proof
name: admission-recovers-after-delayed-webhook
scenario: review-admission-mirror-retry
open: /onboarding/O01
actions: tap Sign in | tap Continue with Apple
expect: Home | Conditions
wait: 45
then-open: /dev
then-expect: Journey app · paid yes · admitted yes | review_admission_request {"attempt":2
```

```proof
name: pending-unavailable-blocks-checkout
scenario: review-pending-unavailable
open: /
swipe: 0.5,0.8,0.5,0.25
expect: Sign in to continue | Restore purchases
then-tap: Sign in to continue | Continue with Apple | Try again
then-open: /dev
then-expect: Journey verifying · paid no · admitted no | Purchase recovery accountConnection | Purchase operations 0
absent: Continue
```

```proof
name: sign-in-layout
scenario: fresh-install
open: /onboarding/O01
actions: tap Sign in
expect: Welcome back | Continue with Apple | Continue with Google | Continue with email
```

## Gotchas

- iPad uses the shipping iPhone compatibility presentation (`supportsTablet: false`). `excer` maps its accessibility coordinates into the physical touch surface and records the letterboxed viewport in centring evidence. On a new dev client, scroll the Expo introduction sheet to bring Continue into view before closing it; this sheet is absent from the release app.
- A sign-in is remembered on this install until Sign out or Delete account, so `/settings/account` opens directly for a returning account (ADR 0061; setup/returning-settings-opens). A reinstall asks for sign-in again.
- Known gap: account deletion does not erase `incident_reports` rows. The server rebuild fixes this.
- The server reads `SUPABASE_JWKS_URL`. Older docs said `SUPABASE_JWT_JWKS_URL`.
