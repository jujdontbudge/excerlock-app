---
id: paywall
title: Paywall, trial and subscription
routes: [paywall, settings/subscription]
scenarios: [fresh-install, trial-active, trial-expired, billing-issue, identity-lab-user-sync-failed, identity-lab-slow-cold-start, identity-lab-anonymous-failed, identity-lab-plans-failed, identity-lab-purchase-cancelled, identity-lab-integration-failed, identity-lab-integration-hangs, identity-lab-purchase-error-retry, identity-lab-purchase-busy, identity-lab-existing-subscription, identity-lab-restore-wrong-store, identity-lab-restore-error-retry, identity-lab-apple-linked, trial-reminder-three-days, trial-reminder-too-late, onboarding-offer-fallback-error, onboarding-offer-a, onboarding-offer-b]
server: [POST /v1/subscription/resync, POST /v1/webhooks/adapty]
events: [paywall_viewed, checkout_attempt_started, checkout_stage_recorded, checkout_attempt_completed, paywall_error]
depends: [launch]
---
## Sub-features
- Client checkout diagnostics correlate one process-local attempt through identity, recovery, integration, StoreKit, result and entitlement verification. Exactly one completion reports the SDK outcome independently of paid admission; Adapty retains revenue ownership. `/dev` derives its Checkout labels from the emitted event log, checking IDs, terminal counts, property safety and timing. Inactive observations are a sheet proxy, not proof of Apple UI.
- The Paywall requires verified paid admission before Setup or Home. Close returns an onboarding user to the step before the Paywall with answers kept, and anyone else to Welcome. Adapty placements cover onboarding, in-app and win-back. A win-back load failure falls back to the placement the surface would otherwise request.
- The paywall is a flat warm off-white screen: the headline "Get your DREAM BODY with ExcerLock" (DREAM BODY in flat bright orange with a soft breathing glow and a slow white shine sweep; it pops in on open, and Reduce Motion keeps it still), a centred review: five orange stars, the bold title "Life changing", the quote "This finally got me to lose 15 lbs after months of no progress." and "by Alexandra R.", then the two-line tagline "HACK your brain and become / ADDICTED to exercise." (HACK and ADDICTED in the same glowing, shining orange as DREAM BODY, their shine sweeping after the headline's), then one-line Yearly and Monthly plan pills with no free-trial toggle (Apple rejects trial toggles under Guideline 3.1.2): the left side names the plan and its billed price, "Yearly $39.99/year", in both offers, and the right side shows the smaller weekly equivalent; when Adapty serves trial and no-trial twins, an offer with a trial shows only the trial plans and a no-trial offer only the no-trial plans, with the picked pill solid orange and white text. Under the pills the picked plan's billing reads "3-day free trial, then $39.99/year" (or "Billed as …" without a trial), then automatic renewal/cancellation terms and the orange Continue button. Underlined Terms of Use · Restore purchases · Privacy Policy follow on the same scrollable screen. There is no header row or Account and help link: the headline starts just under the status bar and Close sits at the right edge on the headline's first line. Close remains available for every account, including plan-load failure; Close never grants admission: it returns an onboarding user to the step before the Paywall and anyone else to Welcome. The review is preview copy.
- Purchase and restore are serialized and show a busy state. Cancel, error and not-found never grant access. Failed plan loading offers Try again. Unavailable verification with prior or unknown paid access replaces checkout with Try again; an unfinished purchase always blocks checkout (ADR 0087).
- Settings → Manage subscription shows the plan status (trial, active, billing issue) and links to App Store management and restore.
- The server mirrors entitlements from Adapty webhooks and resyncs on request.

## How to get to it (user POV)
Finish onboarding and the paywall appears. A subscriber reaches it through Settings → Manage subscription. A lapsed user sees the win-back paywall at launch.

## Driving it with excer
```proof
name: purchase-events-use-production-analytics
scenario: identity-lab-payment-analytics
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
expect: Continue | Yearly $39.99/year
then-open: /dev
then-expect: lab_purchase {"result":"cancel","owner":"lab-checkout-1"} | lab_posthog_capture {"event":"checkout_attempt_started"} | lab_posthog_capture {"event":"checkout_stage_recorded"} | lab_posthog_capture {"event":"checkout_attempt_completed"} | Checkout 1 purchase cancelled · terminals 1 · joined yes · safe yes · timing yes | Checkout context 1 · placement onboarding · plan lab.annual | kind none · code none · sheet inactive · entitlement not_checked | Checkout stages 1 · identity_ready > recovery_journal > integration_attach > storekit > result > recovery_journal
```

```proof
name: purchase-preflight-retries-without-relaunch
scenario: identity-lab-purchase-preflight
open: dev?journey=paywall
tap: Continue
expect: Continue with Apple
then-open: /dev
then-expect: Purchase operations 1 | lab_preflight {"activation":2,"identify":2,"flowRecovered":true,"journalRecovered":true} | Purchase recovery accountConnection
```

```proof
name: purchase-interrupted-response-keeps-recovery
scenario: identity-lab-purchase-response-interrupted
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year | tap Continue | open /dev | expect Purchase recovery pending | expect lab_purchase_failure {"attempt":1,"owner":"lab-checkout-1","grants":1,"recovery":"pending"} | open /paywall | tap Continue
expect: Continue with Apple
then-open: /dev
then-expect: Purchase operations 1 | Restore operations 1 | Purchase recovery accountConnection | Checkout 1 purchase failed · terminals 1 · joined yes · safe yes · timing yes | failure storekit · kind transport · code 2005 · sheet inactive
```

```proof
name: purchase-encoded-response-keeps-recovery
scenario: identity-lab-purchase-response-encoding
open: dev?journey=paywall
actions: tap Continue | open /dev | expect Purchase recovery pending | expect lab_purchase_failure {"attempt":1,"owner":"lab-checkout-1","grants":1,"recovery":"pending"} | open /paywall | tap Continue
expect: Continue with Apple
then-open: /dev
then-expect: Purchase operations 1 | Restore operations 1 | Purchase recovery accountConnection
```

```proof
name: purchase-journal-confirm-can-retry
scenario: identity-lab-purchase-journal-confirm
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year | tap Continue | open /dev | expect Purchase recovery pending | expect lab_journal_failure {"operation":"confirm"} | open /paywall | tap Continue
expect: Continue with Apple
then-open: /dev
then-expect: Purchase operations 1 | Restore operations 1 | Purchase recovery accountConnection | Checkout 1 purchase success · terminals 1 · joined yes · safe yes · timing yes | failure recovery_journal · kind storage · code none · sheet inactive · entitlement not_checked
```

```proof
name: purchase-journal-clear-can-retry
scenario: identity-lab-purchase-journal-clear
open: dev?journey=paywall
actions: tap Continue | open /dev
expect: Purchase operations 1 | Restore operations 0 | Purchase recovery none | lab_journal_failure {"operation":"clear"} | lab_journal_cleared {"attempt":2,"durable":"none"}
```

Dev controls change outcomes without touching StoreKit: add `&outcome=success|cancel|error` or `&restore=restored|notFound` to the dev URL. For example, `./excer sim open "dev?scenario=trial-expired&outcome=error"`.

```proof
name: premium-headline
scenario: fresh-install
open: /sample-paywall
expect: Get your DREAM BODY with ExcerLock | 5 stars | Life changing | This finally got me to lose 15 lbs after months of no progress. | by Alexandra R. | HACK your brain and become ADDICTED to exercise. | Yearly $39.99/year · $0.77 / week | Monthly $9.99/month · $2.31 / week | 3-day free trial, then $39.99/year | Continue
absent: Free trial enabled | Enable free trial
```

```proof
name: trial-plan-rows
scenario: fresh-install
open: /sample-paywall
tap: Monthly $9.99/month · $2.31 / week
expect: 3-day free trial, then $9.99/month | Continue
absent: Free trial enabled | Enable free trial
```

```proof
name: subscription-billing-issue
scenario: billing-issue
open: /settings/subscription
expect: Subscription | Billing issue | Manage in App Store | Restore purchases
```

```proof
name: winback-after-trial
scenario: trial-lapsed-while-closed
relaunch: true
tap: Sign in | Continue with Apple
expect: Get your DREAM BODY with ExcerLock | Continue
wait: 45
then-open: dev
then-expect: "placement":"winback"
```

```proof
name: lapse-in-session
scenario: trial-lapses-in-session
open: /home
expect: Close | Get your DREAM BODY with ExcerLock | Continue
wait: 45
then-open: dev
then-expect: "placement":"winback"
```

```proof
name: identity-sync-retry
scenario: identity-lab-user-sync-failed
open: /paywall
wait: 25
expect: Lab annual $39.99/year · $39.99 / year | Lab monthly $9.99/month · $9.99 / month | Continue
```

```proof
name: identity-slow-cold-start-loading
scenario: identity-lab-slow-cold-start
relaunch: true
open: dev?journey=paywall
wait: 8
expect: Continue | Restore purchases
absent: Loading plans | Starting ExcerLock
```

```proof
name: identity-slow-cold-start
scenario: identity-lab-slow-cold-start
relaunch: true
wait: 25
expect: Lab annual $39.99/year · $39.99 / year | Lab monthly $9.99/month · $9.99 / month | Continue
```

```proof
name: identity-anonymous-retry
scenario: identity-lab-anonymous-failed
open: /paywall
wait: 25
expect: Lab annual $39.99/year · $39.99 / year | Lab monthly $9.99/month · $9.99 / month | Continue
```

```proof
name: identity-plans-retry
scenario: identity-lab-plans-failed
open: dev?journey=paywall
wait: 25
expect: Lab annual $39.99/year · $39.99 / year | Lab monthly $9.99/month · $9.99 / month | Continue
absent: Retry loading plans | couldn't load
```

```proof
name: identity-purchase-to-setup
scenario: identity-lab-user-sync-failed
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue | Continue with Apple
wait: 25
expect: Allow Screen Time
then-open: dev
then-expect: Purchase recovery none | Purchase operations 1 | lab_purchase {"result":"success","owner":"lab-checkout-1"} | subscription_proof_verified {"account":"lab-checkout-1","environment":"sandbox"}
```

An attribution identifier failure never blocks checkout: a network error or a silent Adapty call still reaches Apple's sheet and Setup.

```proof
name: identity-purchase-survives-integration-failure
scenario: identity-lab-integration-failed
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue | Continue with Apple
wait: 25
expect: Allow Screen Time
then-open: dev
then-expect: lab_integration {"result":"networkFailed"} | lab_purchase {"result":"success","owner":"lab-checkout-1"} | Purchase recovery none | Checkout 1 purchase success · terminals 1 · joined yes · safe yes · timing yes | Checkout integration 1 · failed · code 2005 · kind transport
```

```proof
name: identity-purchase-survives-integration-hang
scenario: identity-lab-integration-hangs
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue | Continue with Apple
wait: 30
expect: Allow Screen Time
then-open: dev
then-expect: lab_integration {"result":"hang"} | lab_purchase {"result":"success","owner":"lab-checkout-1"} | Purchase recovery none | Checkout 1 purchase success · terminals 1 · joined yes · safe yes · timing yes | Checkout integration 1 · timed_out · code none · kind timeout
```

```proof
name: signin-first-purchase-needs-no-second-signin
scenario: returning-unpaid
open: /
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
wait: 25
expect: Home | Locked
then-open: /dev
then-expect: Journey app · paid yes · admitted yes | Checkout context 1 · placement winback · plan fake.annual | Protected route mounts | None
```

```proof
name: identity-restore-to-required-signin
scenario: identity-lab-user-sync-failed
open: dev?journey=paywall&restore=restored
tap: Restore purchases | Continue with Apple
wait: 25
expect: Allow Screen Time
```

```proof
name: identity-purchase-cancelled
scenario: identity-lab-purchase-cancelled
open: dev?journey=paywall
tap: Continue
wait: 25
expect: Continue | Lab annual $39.99/year · $39.99 / year
absent: Choose a plan | Starting your plan | Please retry
```

```proof
name: identity-purchase-error-retries-original-checkout
scenario: identity-lab-purchase-error-retry
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year | tap Continue | open /dev | expect Checkout 1 purchase failed · terminals 1 · joined yes · safe yes · timing yes | expect paywall_error {"operation":"purchase"} | open /paywall | tap Continue | expect Continue with Apple | tap Continue with Apple
wait: 25
expect: Allow Screen Time
absent: could not finish | Starting your plan
then-open: /dev
then-expect: Journey setup · paid yes · admitted no | Active account Checkout | Purchase recovery none | Purchase operations 2 | lab_purchase {"result":"error","owner":"lab-checkout-1"} | lab_purchase_failure {"attempt":1,"owner":"lab-checkout-1","grants":0,"recovery":"none"} | lab_purchase {"result":"success","owner":"lab-checkout-1"} | subscription_proof_verified {"account":"lab-checkout-1","environment":"sandbox"} | Protected route mounts | None | Checkout 2 purchase success · terminals 1 · joined yes · safe yes · timing yes | failure storekit · kind vendor · code 1002 · sheet not_observed
```

```proof
name: identity-purchase-pending
scenario: identity-lab-purchase-pending
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
wait: 25
expect: Continue | Yearly $39.99/year · $0.77 / week
absent: still being confirmed | Check purchase status | pending approval
then-open: /dev
then-expect: Purchase recovery pending | Purchase operations 1 | Restore operations 0 | lab_purchase {"result":"pending","owner":"lab-checkout-1"} | Protected route mounts | None | Checkout 1 purchase pending · terminals 1 · joined yes · safe yes · timing yes | sheet inactive · entitlement not_checked
```

```proof
name: identity-purchase-success-without-access
scenario: identity-lab-purchase-success-without-access
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
wait: 25
expect: Sign in to continue
absent: Payment received | being confirmed
then-open: /dev
then-expect: Journey accountRecovery · paid no · admitted no | Purchase recovery accountConnection | Purchase operations 1 | lab_purchase {"result":"successWithoutAccess","owner":"lab-checkout-1"} | lab_purchase_profile {"owner":"lab-checkout-1","access":"none","grants":0} | Protected route mounts | None | Checkout 1 purchase success · terminals 1 · joined yes · safe yes · timing yes | sheet inactive · entitlement none
```

```proof
name: identity-purchase-double-tap-is-serialized
scenario: identity-lab-purchase-busy
open: dev?journey=paywall
tap: Continue
wait: 25
expect: Continue with Apple
then-open: /dev
then-expect: Purchase recovery accountConnection | Purchase operations 1 | Restore operations 0 | Purchase serialization duplicate A subscription operation is already running restore A subscription operation is already running owner stable operation stable | lab_purchase {"result":"success","owner":"lab-checkout-1"} | Protected route mounts | None
```

```proof
name: identity-existing-subscription-checkout-reconciles
scenario: identity-lab-existing-subscription
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
wait: 25
expect: Continue with Apple
absent: already has a subscription | Use existing subscription
then-open: /dev
then-expect: Journey signIn · paid no · admitted no | Purchase recovery accountConnection | Purchase operations 1 | Restore operations 1 | Existing subscription store lab.store.annual owner lab-checkout-1 selected lab-checkout-1 charge starts 0 | lab_purchase {"result":"alreadyOwned","owner":"lab-checkout-1"} | lab_restore {"result":"restored","owner":"lab-checkout-1","source":"adapter"} | Protected route mounts | None | Checkout 1 purchase already_subscribed · terminals 1 · joined yes · safe yes · timing yes | code 107 · sheet not_observed | Checkout 2 restore success · terminals 1 · joined yes · safe yes · timing yes
```

```proof
name: identity-interrupted-purchase-recovery
scenario: identity-lab-purchase-interrupted
relaunch: true
open: dev?journey=paywall
wait: 25
expect: Sign in to continue
absent: Payment received
```

```proof
name: identity-restore-not-found
scenario: identity-lab-user-sync-failed
open: dev?journey=paywall
tap: Restore purchases
wait: 25
expect: No purchase found
absent: Restoring purchases
```

```proof
name: restore-wrong-store-account-stays-unpaid
scenario: identity-lab-restore-wrong-store
open: dev?journey=paywall
tap: Restore purchases
wait: 25
expect: No purchase found | Restore purchases
then-open: /dev
then-expect: Journey paywall · paid no · admitted no | Restore operations 1 | Restore isolation wrong Store owner lab-user-a selected lab-checkout-1 transfers 0 | lab_restore {"result":"notFound","owner":"lab-checkout-1","source":"adapter"} | Protected route mounts | None
```

```proof
name: restore-failure-retries-original-account
scenario: identity-lab-restore-error-retry
open: dev?journey=paywall
tap: Restore purchases
wait: 25
expect: That didn't go through. Please try again. | Restore purchases
then-tap: Restore purchases
then-open: /dev
then-expect: Journey signIn · paid no · admitted no | Purchase recovery accountConnection | Restore operations 2 | lab_restore {"result":"error","owner":"lab-checkout-1","source":"adapter"} | lab_restore {"result":"restored","owner":"lab-checkout-1","source":"adapter"} | Protected route mounts | None
```

```proof
name: identity-account-switch-connects-checkout
scenario: identity-lab-apple-linked
open: dev?journey=paywall
tap: Continue | Continue with Apple
wait: 25
expect: Allow Screen Time
then-open: dev
then-expect: Purchase recovery none | Purchase operations 1 | Restore operations 1 | lab_recovered_account {"provider":"apple","user":"lab-user-a"} | lab_adapty_identify {"user":"lab-user-a"} | lab_restore {"result":"restored","owner":"lab-user-a","source":"adapter"}
```

```proof
name: trial-reminder-one-day-before-expiry
scenario: trial-reminder-three-days
open: /dev
expect: Trial reminder Your trial ends tomorrow · 2026-09-09T15:00:00.000Z · 24 hours before expiry
```

```proof
name: trial-reminder-past-time-is-not-scheduled
scenario: trial-reminder-too-late
open: /dev
expect: Trial reminder None
```

```proof
name: offer-fallback-outage-keeps-retry
scenario: onboarding-offer-fallback-error
open: /sample-paywall
expect: Try again | Close | Restore purchases | Terms of Use | Privacy Policy
absent: Free trial | Enable free trial | free trial | Loading plans
then-tap: Try again
then-open: /dev
then-expect: paywall_error {"operation":"load"} | onboarding_trial_fallback
wait: 20
```

```proof
name: billing-disclosures
scenario: fresh-install
open: /sample-paywall
swipe: 0.5,0.8,0.5,0.25
expect: Yearly $39.99/year · $0.77 / week | Monthly $9.99/month · $2.31 / week | 3-day free trial, then $39.99/year | Continue | Restore purchases | Terms of Use | Privacy Policy
```

```proof
name: offer-b-checkout-selects-monthly-twin
scenario: onboarding-offer-b
open: /onboarding/S3b
actions: expect Once you hit 10,000 steps | expect Once you hit 10,000 steps | tap Continue | expect Become the best version of yourself | tap Continue | expect Yearly $39.99/year · $0.77 / week | expect Billed as $39.99/year | tap Monthly $9.99/month · $2.31 / week | expect Billed as $9.99/month | tap Continue
expect: Continue with Apple
then-open: /dev
then-expect: lab_offer_purchase {"plan":"com.johansardar.excerlock.premium.a.monthly.notrial","trial":false} | Purchase operations 1 | Purchase recovery accountConnection
```

```proof
name: offer-a-checkout-selects-trial-product
scenario: onboarding-offer-a
open: /onboarding/S3c
actions: expect 3-day free trial | tap Continue | expect Day 2 · Reminder | tap Continue | expect Yearly $39.99/year · $0.77 / week | tap Monthly $9.99/month · $2.31 / week | expect 3-day free trial, then $9.99/month | tap Continue
expect: Continue with Apple
then-open: /dev
then-expect: lab_offer_purchase {"plan":"com.johansardar.excerlock.premium.a.monthly","trial":true} | Purchase operations 1 | Purchase recovery accountConnection
```

```proof
name: checkout-cancel-without-inactive
scenario: identity-lab-checkout-no-sheet
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
expect: Continue | Yearly $39.99/year
then-open: /dev
then-expect: Checkout 1 purchase cancelled · terminals 1 · joined yes · safe yes · timing yes | sheet not_observed · entitlement not_checked
```

```proof
name: checkout-restore-not-found
scenario: identity-lab-purchase-cancelled
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Restore purchases
expect: Continue | Yearly $39.99/year
then-open: /dev
then-expect: Checkout 1 restore not_found · terminals 1 · joined yes · safe yes · timing yes | Checkout context 1 · placement onboarding · plan none | failure none · kind none · code none
```

```proof
name: checkout-restore-transport
scenario: identity-lab-restore-transport
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Restore purchases
expect: Continue | Yearly $39.99/year
then-open: /dev
then-expect: lab_posthog_capture {"event":"checkout_attempt_completed"} | Checkout 1 restore failed · terminals 1 · joined yes · safe yes · timing yes | failure storekit · kind transport · code 2005
```

```proof
name: checkout-restore-auth
scenario: identity-lab-restore-auth
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Restore purchases
expect: Continue | Yearly $39.99/year
then-open: /dev
then-expect: lab_posthog_capture {"event":"checkout_attempt_completed"} | Checkout 1 restore failed · terminals 1 · joined yes · safe yes · timing yes | failure storekit · kind auth · code 2002
```

```proof
name: checkout-restore-unverified
scenario: identity-lab-restore-unverified
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Restore purchases
expect: Continue | Yearly $39.99/year
then-open: /dev
then-expect: lab_posthog_capture {"event":"checkout_attempt_completed"} | Checkout 1 restore failed · terminals 1 · joined yes · safe yes · timing yes | failure entitlement_verification · kind verification · code none
```

```proof
name: checkout-analytics-throw
scenario: identity-lab-checkout-analytics-throw
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
expect: Continue with Apple
then-open: /dev
then-expect: lab_posthog_capture {"event":"checkout_attempt_completed"} | lab_checkout_analytics {"result":"throw"} | Checkout 1 purchase success · terminals 1 · joined yes · safe yes · timing yes | Purchase operations 1
```

```proof
name: checkout-analytics-reject
scenario: identity-lab-checkout-analytics-reject
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
expect: Continue with Apple
then-open: /dev
then-expect: lab_posthog_capture {"event":"checkout_attempt_completed"} | lab_checkout_analytics {"result":"reject"} | Checkout 1 purchase success · terminals 1 · joined yes · safe yes · timing yes | Purchase operations 1
```

```proof
name: checkout-analytics-hang
scenario: identity-lab-checkout-analytics-hang
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
expect: Continue with Apple
then-open: /dev
then-expect: lab_posthog_capture {"event":"checkout_attempt_completed"} | lab_checkout_analytics {"result":"hang"} | Checkout 1 purchase success · terminals 1 · joined yes · safe yes · timing yes | Purchase operations 1
```

## Gotchas
- The purchase-error retry proof checks the recorded error before retrying, because the floating error notice can disappear while the simulator accessibility query runs.
- The app uses Adapty, not RevenueCat.
- In a dev build the paywall is a local stand-in with dash prices. Seeing real prices means the real runtime is running (see the launch Gotchas).
- A new PostHog flag, or a new consumer of `paywall_variant`, is App Store submission material, never an OTA (`docs/ota.md`, `excer check` `flag-registry`).
- The win-back paywall appears when the first live entitlement of a launch is `expired`, even though the persisted store still says `trial` from the last run (the real app hydrates `trial`, then Adapty's first profile says `expired`). `trial-lapsed-while-closed` reproduces it: Home mounts on the hydrated `trial`, and the fake publishes `expired` 20 s after launch (`entitlementTimeline`). `trial-lapses-in-session` publishes a live `trial` at 1 s and `expired` at 20 s, which must show the in-app placement instead. Both proofs read the placement from the fake `paywall_viewed` event on `dev`. A lapse observed live after a live `trial`/`active` in the same session (`subscription/winbackSession.ts`) does not trigger it. Do not deep-link after the relaunch: opening a URL rebuilds navigation and remounts Home.
- The `identity-lab-*` scenarios swap demo mode's `AuthFake` and `SubscriptionFake` for the real `createAuthServices` (SupabaseAuthAdapter + IdentityCoordinator) and `AdaptySubscriptionAdapter`, over a scripted Supabase client, a scripted `PUT /v1/user` and a scripted Adapty SDK (`dev-harness/lib/fakes/IdentityLab.ts`). The scenario's `identityLab` script makes one edge fail once or run slow (8 s). They reproduce App Review 2.1(b) on Build 12: a user-sync failure at launch left the identity spine unready for the whole session, and a cold start onto the paywall raced the spine. Plans are named "Lab annual" / "Lab monthly" so a lab screenshot is never mistaken for StoreKit data. Checkout, account A and account B have independent ownership. Delayed-callback scenarios queue immutable purchase/restore profiles and deliver them after an account transition. They prove identity generation, journal and admission gating only, not StoreKit, Adapty transfer behavior or a sandbox account.
- The dev client's floating tools button (gear) sits on top of the paywall's Restore link; turn it off in the dev menu (Tools button) before `identity-restore-not-found`, or the tap opens the dev menu.

- ADR 0078: the onboarding offer is retained from its early Adapty response, including product handles and impression variation. B requires `trial: false` and the two approved `.notrial` twins. A includes both base and twin plans for the toggle; introductory ineligibility remains A with ordinary billing. Notification timing diagnostics run the production `trialReminderPlan`; they are not proof of iOS delivery.
