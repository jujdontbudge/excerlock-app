---
id: paywall
title: Paywall, trial and subscription
routes: [paywall, settings/subscription]
scenarios: [fresh-install, trial-active, trial-expired, billing-issue, identity-lab-user-sync-failed, identity-lab-slow-cold-start, identity-lab-anonymous-failed, identity-lab-plans-failed, identity-lab-purchase-cancelled, identity-lab-purchase-error-retry, identity-lab-purchase-busy, identity-lab-existing-subscription, identity-lab-restore-wrong-store, identity-lab-restore-error-retry, identity-lab-apple-linked, trial-reminder-three-days, trial-reminder-too-late, onboarding-offer-fallback-error, onboarding-offer-a, onboarding-offer-b]
server: [POST /v1/subscription/resync, POST /v1/webhooks/adapty]
events: [paywall_viewed, purchase_started, paywall_error]
depends: [launch]
---
## Sub-features
- The Paywall requires verified paid admission before Setup or Home. Account and help stays reachable and Close returns to Welcome. Adapty placements cover onboarding, in-app and win-back. A win-back load failure falls back to the placement the surface would otherwise request.
- The paywall is a flat warm off-white screen: the headline "Get your DREAM BODY with ExcerLock" (DREAM BODY in flat bright orange with a soft breathing glow and a slow white shine sweep; it pops in on open, and Reduce Motion keeps it still), a centred review: five orange stars, the bold title "Life changing", the quote "This finally got me to lose 15 lbs after months of no progress." and "by Alexandra R.", then the two-line tagline "HACK your brain and become / ADDICTED to exercise." (HACK and ADDICTED in the same glowing, shining orange as DREAM BODY, their shine sweeping after the headline's), then one-line Yearly and Monthly plan pills with no free-trial toggle (Apple rejects trial toggles under Guideline 3.1.2): the left side names the plan and its billed price, "Yearly $49.99/year", in both offers, and the right side shows the smaller weekly equivalent; when Adapty serves trial and no-trial twins, an offer with a trial shows only the trial plans and a no-trial offer only the no-trial plans, with the picked pill solid orange and white text. Under the pills the picked plan's billing reads "$49.99/year after your 3-day free trial" (or "Billed as …" without a trial), then automatic renewal/cancellation terms and the orange Continue button. Underlined Terms of Use · Restore purchases · Privacy Policy follow on the same scrollable screen. Account and help and Close remain available for every account, including plan-load failure; Close returns to Welcome without granting admission. The review is preview copy.
- Purchase and restore are serialized and show a busy state. Cancel, error and not-found never grant access. Failed plan loading offers Try again. Unavailable verification with prior or unknown paid access replaces checkout with Try again; an unfinished purchase always blocks checkout (ADR 0087).
- Settings → Manage subscription shows the plan status (trial, active, billing issue) and links to App Store management and restore.
- The server mirrors entitlements from Adapty webhooks and resyncs on request.

## How to get to it (user POV)
Finish onboarding and the paywall appears. A subscriber reaches it through Settings → Manage subscription. A lapsed user sees the win-back paywall at launch.

## Driving it with excer
Dev controls change outcomes without touching StoreKit: add `&outcome=success|cancel|error` or `&restore=restored|notFound` to the dev URL. For example, `./excer sim open "dev?scenario=trial-expired&outcome=error"`.

```proof
name: premium-headline
scenario: fresh-install
open: /sample-paywall
expect: Get your DREAM BODY with ExcerLock | 5 stars | Life changing | This finally got me to lose 15 lbs after months of no progress. | by Alexandra R. | HACK your brain and become ADDICTED to exercise. | Yearly $49.99/year · $0.96 / week | Monthly $9.99/month · $2.31 / week | $49.99/year after your 3-day free trial | Continue
absent: Free trial enabled | Enable free trial
```

```proof
name: trial-plan-rows
scenario: fresh-install
open: /sample-paywall
tap: Monthly $9.99/month · $2.31 / week
expect: $9.99/month after your 3-day free trial | Continue
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
expect: Lab annual $49.99/year · $49.99 / year | Lab monthly $9.99/month · $9.99 / month | Continue
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
expect: Lab annual $49.99/year · $49.99 / year | Lab monthly $9.99/month · $9.99 / month | Continue
```

```proof
name: identity-anonymous-retry
scenario: identity-lab-anonymous-failed
open: /paywall
wait: 25
expect: Lab annual $49.99/year · $49.99 / year | Lab monthly $9.99/month · $9.99 / month | Continue
```

```proof
name: identity-plans-retry
scenario: identity-lab-plans-failed
open: dev?journey=paywall
wait: 25
expect: Lab annual $49.99/year · $49.99 / year | Lab monthly $9.99/month · $9.99 / month | Continue
absent: Retry loading plans | couldn't load
```

```proof
name: identity-purchase-to-setup
scenario: identity-lab-user-sync-failed
open: dev?journey=paywall
tap: Continue | Continue with Apple
wait: 25
expect: Allow Screen Time
then-open: dev
then-expect: Purchase recovery none | Purchase operations 1 | lab_purchase {"result":"success","owner":"lab-checkout-1"} | subscription_proof_verified {"account":"lab-checkout-1","environment":"sandbox"}
```

```proof
name: signin-first-purchase-needs-no-second-signin
scenario: returning-unpaid
open: /
tap: Continue
wait: 25
expect: Home | Locked
then-open: /dev
then-expect: Journey app · paid yes · admitted yes | purchase_started {"placement":"winback","plan_id":"fake.annual"} | Protected route mounts | None
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
expect: Continue | Lab annual $49.99/year · $49.99 / year
absent: Choose a plan | Starting your plan | Please retry
```

```proof
name: identity-purchase-error-retries-original-checkout
scenario: identity-lab-purchase-error-retry
open: dev?journey=paywall
actions: tap Continue | open /dev | expect purchase_failed {"reason_class":"unknown"} | expect paywall_error {"operation":"purchase"} | open /paywall | tap Continue | tap Continue with Apple
wait: 25
expect: Allow Screen Time
absent: could not finish | Starting your plan
then-open: /dev
then-expect: Journey setup · paid yes · admitted no | Active account Checkout | Purchase recovery none | Purchase operations 2 | lab_purchase {"result":"error","owner":"lab-checkout-1"} | lab_purchase_failure {"attempt":1,"owner":"lab-checkout-1","grants":0,"recovery":"none"} | lab_purchase {"result":"success","owner":"lab-checkout-1"} | subscription_proof_verified {"account":"lab-checkout-1","environment":"sandbox"} | Protected route mounts | None
```

```proof
name: identity-purchase-pending
scenario: identity-lab-purchase-pending
open: dev?journey=paywall
tap: Continue
wait: 25
expect: Continue | Lab annual $49.99/year · $49.99 / year
absent: still being confirmed | Check purchase status | pending approval
```

```proof
name: identity-purchase-success-without-access
scenario: identity-lab-purchase-success-without-access
open: dev?journey=paywall
tap: Continue
wait: 25
expect: Sign in to continue
absent: Payment received | being confirmed
then-open: /dev
then-expect: Journey accountRecovery · paid no · admitted no | Purchase recovery accountConnection | Purchase operations 1 | lab_purchase {"result":"successWithoutAccess","owner":"lab-checkout-1"} | lab_purchase_profile {"owner":"lab-checkout-1","access":"none","grants":0} | Protected route mounts | None
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
tap: Continue
wait: 25
expect: Continue with Apple
absent: already has a subscription | Use existing subscription
then-open: /dev
then-expect: Journey signIn · paid no · admitted no | Purchase recovery accountConnection | Purchase operations 1 | Restore operations 1 | Existing subscription store lab.store.annual owner lab-checkout-1 selected lab-checkout-1 charge starts 0 | lab_purchase {"result":"alreadyOwned","owner":"lab-checkout-1"} | lab_restore {"result":"restored","owner":"lab-checkout-1","source":"adapter"} | Protected route mounts | None
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
expect: Try again | Account and help | Close | Restore purchases | Terms of Use | Privacy Policy
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
expect: Yearly $49.99/year · $0.96 / week | Monthly $9.99/month · $2.31 / week | $49.99/year after your 3-day free trial | Renews automatically unless canceled at least 24 hours before the period ends. Cancel in App Store settings. | Continue | Restore purchases | Terms of Use | Privacy Policy
```

```proof
name: offer-b-checkout-selects-monthly-twin
scenario: onboarding-offer-b
open: /onboarding/S3b
actions: expect Once you hit 10,000 steps | expect Once you hit 10,000 steps | tap Continue | expect Become the best version of yourself | tap Continue | expect Yearly $49.99/year · $0.96 / week | expect Billed as $49.99/year | tap Monthly $9.99/month · $2.31 / week | expect Billed as $9.99/month | tap Continue
expect: Continue with Apple
then-open: /dev
then-expect: lab_offer_purchase {"plan":"com.johansardar.excerlock.premium.a.monthly.notrial","trial":false} | Purchase operations 1 | Purchase recovery accountConnection
```

```proof
name: offer-a-checkout-selects-trial-product
scenario: onboarding-offer-a
open: /onboarding/S3c
actions: expect 3-day free trial | tap Continue | expect Day 2 · Reminder | tap Continue | expect Yearly $49.99/year · $0.96 / week | tap Monthly $9.99/month · $2.31 / week | expect $9.99/month after your 3-day free trial | tap Continue
expect: Continue with Apple
then-open: /dev
then-expect: lab_offer_purchase {"plan":"com.johansardar.excerlock.premium.a.monthly","trial":true} | Purchase operations 1 | Purchase recovery accountConnection
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
