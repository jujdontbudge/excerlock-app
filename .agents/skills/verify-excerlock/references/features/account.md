---
id: account
title: Identity and account deletion
routes: [settings/account, sign-in, recovery]
scenarios: [signed-in-apple, trial-active, returning-unpaid, identity-lab-save, identity-lab-existing-apple, identity-lab-existing-email, identity-lab-email-rate-limited, identity-lab-provider-attempts, identity-lab-apple-unknown]
server: [PUT /v1/user, DELETE /v1/user, GET /v1/subscription/complimentary]
events: []
depends: [setup]
---
## Sub-features
- Guest first: every install gets a Supabase anonymous account at launch. Buying, onboarding and Conditions all work as a guest (ADR 0091).
- Save your account (Settings → Account, or Account and help): Apple and Google link their verified ID token to the same user id (`linkIdentity`); email sends a code to the new address and confirms it as an email change on the same user id. Nothing moves; the purchase is already on this id.
- If the Apple ID, Google account or email already belongs to another ExcerLock account, the app asks first ("You already have an account"). Only after "Sign in to my account" does it switch: the guest's Conditions and onboarding progress carry over when that account has no data on this iPhone, Adapty identifies the account, and the profile is refreshed, so a purchase made on that account follows it.
- Welcome → Sign in uses the same flow but switches without asking, because the person said they already have an account. A new identity simply saves the guest.
- Account screen: save, sign out and delete. Sign out and delete reset onboarding and start a fresh guest; a relaunch opens Welcome.
- An unpaid account keeps a restricted Account and help surface for deletion, data export, subscription management and restore, support, and legal documents without mounting paid Settings.
- Complimentary Premium is read from `GET /v1/subscription/complimentary` after an account loads. `POST /v1/subscription/resync` stays only for App Store builds that still gate on it. It is kept on the device until its expiry or until another account signs in.

## How to get to it (user POV)
Settings → the profile row → Account. From the hard Paywall, open Account and help for the restricted recovery surface. Welcome → Sign in.

## Driving it with excer

Run `./excer demo signed-in-apple --open /settings/account`. The identity-lab scenarios run the production auth adapter, identity sync and Adapty adapter against a scripted Supabase and StoreKit. Real Apple ID, Google and email delivery remain real-iPhone checks. To assert what the server did, run it locally and check the database; `./excer server ready` must pass first.

```proof
name: save-with-apple-keeps-account
scenario: identity-lab-save
open: /
actions: tap Account and help | tap Account and deletion | tap Save your account | tap Continue with Apple
wait: 30
expect: Restore purchases
then-open: /dev
then-expect: lab_link_identity {"provider":"apple","result":"ok","user":"lab-checkout-1"} | auth_started {"provider":"apple","operation":"save"} | auth_completed {"provider":"apple","operation":"save","result":"saved"} | Active account Checkout | Onboarding plan | Staged
```

```proof
name: save-with-google-keeps-account
scenario: identity-lab-save
open: /
actions: tap Account and help | tap Account and deletion | tap Save your account | tap Continue with Google
wait: 30
expect: Restore purchases
then-open: /dev
then-expect: lab_link_identity {"provider":"google","result":"ok","user":"lab-checkout-1"} | Active account Checkout | Onboarding plan | Staged
```

```proof
name: save-with-email-keeps-account
scenario: identity-lab-save
open: /
actions: tap Account and help | tap Account and deletion | tap Save your account | tap Continue with email | type n@b.co | tap Send code | expect Check your email | tap Verification code | type 123456
wait: 30
expect: Restore purchases
absent: That code didn't work
then-open: /dev
then-expect: lab_email_code_sent {"kind":"save","challenge":1,"account":"lab-checkout-1"} | lab_email_verified {"type":"email_change","challenge":1,"ok":true} | Active account Checkout | Onboarding plan | Staged
```

```proof
name: existing-apple-asks-before-switching
scenario: identity-lab-existing-apple
open: /
actions: tap Account and help | tap Account and deletion | tap Save your account | tap Continue with Apple
wait: 30
expect: You already have an account | Sign in to my account | Not now
then-tap: Not now
then-expect: Save your account | Continue with Apple
```

```proof
name: existing-apple-switch-keeps-plan-and-purchase
scenario: identity-lab-existing-apple
open: /
actions: tap Account and help | tap Account and deletion | tap Save your account | tap Continue with Apple | expect You already have an account | tap Sign in to my account
wait: 30
expect: Allow Screen Time
then-open: /dev
then-expect: lab_link_identity {"provider":"apple","result":"conflict","user":"lab-checkout-1"} | auth_completed {"provider":"apple","operation":"save","result":"existing_account"} | auth_completed {"provider":"apple","operation":"switch","result":"switched"} | lab_signed_in {"provider":"apple","user":"lab-existing"} | lab_adapty_identify {"user":"lab-existing"} | Active account Existing
```

```proof
name: welcome-sign-in-existing-email-switches
scenario: identity-lab-existing-email
open: dev?journey=signIn
actions: tap Continue with email | type e@b.co | tap Send code | expect Check your email | tap Verification code | type 123456
wait: 30
expect: Allow Screen Time
absent: You already have an account
then-open: /dev
then-expect: lab_email_exists {"account":"lab-checkout-1"} | lab_email_code_sent {"kind":"signIn","challenge":1,"account":"lab-checkout-1"} | lab_email_verified {"type":"email","challenge":1,"ok":true} | lab_adapty_identify {"user":"lab-existing"} | Active account Existing
```

```proof
name: rate-limit-retains-verifiable-code
scenario: identity-lab-email-rate-limited
open: /
actions: tap Account and help | tap Account and deletion | tap Save your account | tap Continue with email | type e@b.co | tap Send code | expect Resend code in | tap Verification code | type 123456
wait: 30
expect: Restore purchases
then-open: /dev
then-expect: sign_in_failed {"provider":"email","surface":"sign_up","reason_class":"rate_limited","failure_code":"EMAIL_RATE_LIMITED"} | lab_email_verified {"type":"email_change","challenge":1,"ok":true}
```

```proof
name: provider-attempts-save-once
scenario: identity-lab-provider-attempts
open: /
actions: tap Account and help | tap Account and deletion | tap Save your account | tap Continue with Apple | tap Continue with Google | tap Continue with Google
wait: 30
expect: Restore purchases
then-open: /dev
then-expect: lab_provider_attempt {"provider":"apple","attempt":1,"result":"cancelled","account":"lab-checkout-1","grants":0} | lab_provider_attempt {"provider":"google","attempt":1,"result":"failed","account":"lab-checkout-1","grants":0} | lab_provider_attempt {"provider":"google","attempt":2,"result":"success","account":"lab-checkout-1","grants":0} | lab_link_identity {"provider":"google","result":"ok","user":"lab-checkout-1"} | Active account Checkout
```

```proof
name: apple-unknown-cancel-retry-stays-on-signin
scenario: identity-lab-apple-unknown
open: dev?journey=signIn
actions: tap Continue with Apple | expect Apple sign-in is unavailable. Try again or continue with email. | tap Continue with Apple | expect Continue with email | tap Continue with Apple
wait: 30
expect: Restore purchases
then-open: /dev
then-expect: lab_provider_attempt {"provider":"apple","attempt":1,"result":"unknown","account":"lab-checkout-1","grants":0} | lab_provider_attempt {"provider":"apple","attempt":2,"result":"cancelled","account":"lab-checkout-1","grants":0} | lab_provider_attempt {"provider":"apple","attempt":3,"result":"success","account":"lab-checkout-1","grants":0} | lab_link_identity {"provider":"apple","result":"ok","user":"lab-checkout-1"}
```

```proof
name: welcome-email-code-allows-new-account
scenario: fresh-install
open: /onboarding/O01
actions: tap Sign in | tap Continue with email | type new@a.co | tap Send code
expect: Check your email | We sent a six-digit code to new@a.co | Verification code
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
expect: Not saved yet | Save your account | Delete account
```

```proof
name: anonymous-save-opens-save
scenario: trial-active
open: /settings/account
tap: Save your account
expect: Save your account | Continue with Apple | Continue with Google | Continue with email
```

```proof
name: email-entry
scenario: fresh-install
open: /sample-paywall?stage=sign-in
tap: Continue with email
expect: Sign in with email | Email address | Send code
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
name: sign-in-layout
scenario: fresh-install
open: /onboarding/O01
actions: tap Sign in
expect: Welcome back | Continue with Apple | Continue with Google | Continue with email
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

## Gotchas

- iPad uses the shipping iPhone compatibility presentation (`supportsTablet: false`). `excer` maps its accessibility coordinates into the physical touch surface and records the letterboxed viewport in centring evidence. On a new dev client, scroll the Expo introduction sheet to bring Continue into view before closing it; this sheet is absent from the release app.
- Every install starts as a guest: a Supabase anonymous account with a real user id. Saving links Apple, Google or email to that same id. Only "Sign in to my account" (or Welcome's Sign in with an identity that already has an account) changes the id.
- In the identity lab, `existing: { provider, paid }` seeds the account `lab-existing` that already owns that identity. The email for it is any address; the code is always 123456.
- Known gap: account deletion does not erase `incident_reports` rows. The server rebuild fixes this.
- The server reads `SUPABASE_JWKS_URL`. Older docs said `SUPABASE_JWT_JWKS_URL`.
