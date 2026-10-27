---
id: paywall
title: Paywall, trial and subscription
routes: [paywall, close-offer, settings/subscription]
scenarios: [fresh-install, trial-active, trial-expired, billing-issue, identity-lab-user-sync-failed, identity-lab-slow-cold-start, identity-lab-anonymous-failed, identity-lab-plans-failed, identity-lab-purchase-cancelled, identity-lab-integration-failed, identity-lab-integration-hangs, identity-lab-purchase-error-retry, identity-lab-purchase-busy, identity-lab-existing-subscription, identity-lab-restore-wrong-store, identity-lab-restore-error-retry, trial-reminder-three-days, trial-reminder-too-late, onboarding-offer-fallback-error, onboarding-offer-a]
server: [POST /v1/webhooks/adapty]
events: [paywall_viewed, checkout_attempt_started, checkout_stage_recorded, checkout_attempt_completed, paywall_error]
depends: [launch]
---
## Sub-features
- Adapty on the phone is the only judge of Premium (`accessLevels.premium.isActive`). The server never gates access. A guest buys without signing in, and a successful purchase goes straight to Setup (or Home after a lapse). Signing in is optional and never follows a purchase.
- Checkout diagnostics correlate one process-local attempt through identity, integration, StoreKit, result and entitlement verification. Exactly one completion reports the SDK outcome. `/dev` derives its Checkout labels from the emitted event log, checking IDs, terminal counts, property safety and timing. Inactive observations are a sheet proxy, not proof of Apple UI.
- Close returns an onboarding user to the step before the Paywall with answers kept, and anyone else to Welcome. Close never grants access. Adapty placements cover onboarding, in-app and win-back. A win-back load failure falls back to the placement the surface would otherwise request.
- The paywall is a flat warm off-white screen: the headline "Get your DREAM BODY with ExcerLock" (DREAM BODY in flat bright orange with a soft breathing glow and a slow white shine sweep; it pops in on open, and Reduce Motion keeps it still), a centred review: five orange stars, the bold title "Life changing", the quote "This finally got me to lose 15 lbs after months of no progress." and "by Alexandra R.", then the two-line tagline "HACK your brain and become / ADDICTED to exercise." (HACK and ADDICTED in the same glowing, shining orange as DREAM BODY, their shine sweeping after the headline's), then one-line Yearly and Monthly plan pills with no free-trial toggle (Apple rejects trial toggles under Guideline 3.1.2): the left side names the plan and its billed price, "Yearly $39.99/year", in both offers, and the right side shows the smaller weekly equivalent, with the picked pill solid orange and white text. Under the pills the picked plan's billing reads "3-day free trial, then $39.99/year" (or "Billed as …" without a trial), then automatic renewal/cancellation terms and the orange Continue button. Underlined Terms of Use · Restore purchases · Privacy Policy follow on the same scrollable screen. Close sits on the headline's first line at the right edge and stays available for every account, including plan-load failure; there is no header row and no account, help or sign-in link (ADR 0092). Close never grants admission: it returns an onboarding user to the step before the Paywall and anyone else to Welcome. The review is preview copy.
- The first Close on the onboarding Paywall opens the one-time close offer (ADR 0093): the ExcerLock mark, "ONE TIME OFFER", "You will never see this again.", a soft grey card where the discount counts up to 75% in the glowing orange with "DISCOUNT", "THIS OFFER WILL EXPIRE SOON", then the solid orange Yearly pill with the monthly equivalent and a "3-day free trial" badge, the billed line against the monthly price, a breathing "CLAIM YOUR OFFER NOW" button and Terms of Use · Restore purchases · Privacy Policy. It sells the approved $29.99 yearly plan from the Adapty `close_offer` placement. It shows once per install; closing it, a later Close, or an offer that fails to load returns one step like the plain Close. Claiming admits like any purchase.
- Restore with nothing to restore opens a sheet, "No purchase found", with OK and "Account and deletion", which opens the restricted account screen. A restore that is still confirming a purchase shows the confirming notice instead.
- Purchase and restore are single-flight and show a busy state; a purchase is never retried automatically. Cancel and error never grant access; error shows a retry message. `pending` (Ask to Buy) shows "Waiting for approval" and stays put. A successful purchase whose profile does not show Premium yet shows "Payment received. Confirming your purchase…" with Restore, and moves on by itself when Adapty reports access; it never shows the plans again. Failed plan loading offers Try again. An already-owned product restores.
- Settings → Manage subscription shows the plan status (trial or active) and links to App Store management and restore. A billing issue keeps access only while Apple's grace period keeps the access level active; after that it opens the Paywall.
- The server keeps Adapty webhooks for support and revenue only.

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
then-expect: lab_purchase {"result":"cancel","owner":"lab-checkout-1"} | lab_posthog_capture {"event":"checkout_attempt_started"} | lab_posthog_capture {"event":"checkout_stage_recorded"} | lab_posthog_capture {"event":"checkout_attempt_completed"} | Checkout 1 purchase cancelled · terminals 1 · joined yes · safe yes · timing yes | Checkout context 1 · placement onboarding · plan lab.annual | Checkout stages 1 · identity_ready > integration_attach > storekit > result
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
name: billing-issue-after-grace-opens-paywall
scenario: billing-issue
open: /
expect: Continue | Restore purchases
absent: Apps blocked until
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
expect: Yearly $39.99/year · $0.77 / week | Monthly $9.99/month · $2.31 / week | Continue
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
expect: Yearly $39.99/year · $0.77 / week | Monthly $9.99/month · $2.31 / week | Continue
```

```proof
name: identity-anonymous-retry
scenario: identity-lab-anonymous-failed
open: /paywall
wait: 25
expect: Yearly $39.99/year · $0.77 / week | Monthly $9.99/month · $2.31 / week | Continue
```

```proof
name: identity-plans-retry
scenario: identity-lab-plans-failed
open: dev?journey=paywall
wait: 25
expect: Yearly $39.99/year · $0.77 / week | Monthly $9.99/month · $2.31 / week | Continue
absent: Retry loading plans | couldn't load
```

```proof
name: identity-purchase-to-setup
scenario: identity-lab-user-sync-failed
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
wait: 25
expect: Allow Screen Time
absent: Continue with Apple | Sign in to continue
then-open: dev
then-expect: Journey setup · paid yes | Purchase operations 1 | lab_purchase {"result":"success","owner":"lab-checkout-1"} | Checkout 1 purchase success · terminals 1 · joined yes · safe yes · timing yes | entitlement active
```

An attribution identifier failure never blocks checkout: a network error or a silent Adapty call still reaches Apple's sheet and Setup.

```proof
name: identity-purchase-survives-integration-failure
scenario: identity-lab-integration-failed
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
wait: 25
expect: Allow Screen Time
then-open: dev
then-expect: lab_integration {"result":"networkFailed"} | lab_purchase {"result":"success","owner":"lab-checkout-1"} | Checkout 1 purchase success · terminals 1 · joined yes · safe yes · timing yes | Checkout integration 1 · failed · code 2005 · kind transport
```

```proof
name: identity-purchase-survives-integration-hang
scenario: identity-lab-integration-hangs
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
wait: 30
expect: Allow Screen Time
then-open: dev
then-expect: lab_integration {"result":"hang"} | lab_purchase {"result":"success","owner":"lab-checkout-1"} | Checkout 1 purchase success · terminals 1 · joined yes · safe yes · timing yes | Checkout integration 1 · timed_out · code none · kind timeout
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
name: identity-restore-to-setup
scenario: identity-lab-user-sync-failed
open: dev?journey=paywall&restore=restored
open-wait: 3
actions: expect Yearly $39.99/year
tap: Restore purchases
wait: 25
expect: Allow Screen Time
absent: Continue with Apple | Sign in to continue
```

```proof
name: identity-purchase-cancelled
scenario: identity-lab-purchase-cancelled
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
wait: 25
expect: Continue | Yearly $39.99/year · $0.77 / week
absent: Choose a plan | Starting your plan | Please retry | Confirming your purchase
```

```proof
name: identity-purchase-error-retries-original-checkout
scenario: identity-lab-purchase-error-retry
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year | tap Continue | open /dev | expect Checkout 1 purchase failed · terminals 1 · joined yes · safe yes · timing yes | expect paywall_error {"operation":"purchase"} | open /paywall | expect Yearly $39.99/year | tap Continue
wait: 25
expect: Allow Screen Time
absent: could not finish | Starting your plan | Continue with Apple
then-open: /dev
then-expect: Journey setup · paid yes | Purchase operations 2 | lab_purchase {"result":"error","owner":"lab-checkout-1"} | lab_purchase {"result":"success","owner":"lab-checkout-1"} | Checkout 2 purchase success · terminals 1 · joined yes · safe yes · timing yes
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
absent: Allow Screen Time | Confirming your purchase
then-open: /dev
then-expect: Journey paywall · paid no | Purchase operations 1 | Restore operations 0 | lab_purchase {"result":"pending","owner":"lab-checkout-1"} | Checkout 1 purchase pending · terminals 1 · joined yes · safe yes · timing yes
```

```proof
name: identity-purchase-success-without-access
scenario: identity-lab-purchase-success-without-access
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
wait: 25
expect: Payment received. Confirming your purchase… | Restore purchases
absent: No purchase found | Sign in to continue | Yearly $39.99/year · $0.77 / week
then-open: /dev
then-expect: Journey paywall · paid no | Purchase operations 1 | Restore operations 0 | lab_purchase {"result":"successWithoutAccess","owner":"lab-checkout-1"} | Checkout 1 purchase success · terminals 1 · joined yes · safe yes · timing yes
```

```proof
name: identity-purchase-double-tap-is-serialized
scenario: identity-lab-purchase-busy
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
wait: 25
expect: Allow Screen Time
then-open: /dev
then-expect: Purchase operations 1 | Restore operations 0 | Purchase serialization duplicate | lab_purchase {"result":"success","owner":"lab-checkout-1"}
```

```proof
name: identity-existing-subscription-checkout-reconciles
scenario: identity-lab-existing-subscription
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Continue
wait: 25
expect: Allow Screen Time
absent: already has a subscription | Use existing subscription | Continue with Apple
then-open: /dev
then-expect: Journey setup · paid yes | Purchase operations 1 | Restore operations 1 | lab_purchase {"result":"alreadyOwned","owner":"lab-checkout-1"} | lab_restore {"result":"restored","owner":"lab-checkout-1","source":"adapter"} | Checkout 1 purchase already_subscribed · terminals 1 · joined yes · safe yes · timing yes | Checkout 2 restore success · terminals 1 · joined yes · safe yes · timing yes
```

```proof
name: identity-restore-not-found
scenario: identity-lab-user-sync-failed
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year
tap: Restore purchases
wait: 25
expect: No purchase found
absent: Restoring purchases
```

```proof
name: restore-wrong-store-account-stays-unpaid
scenario: identity-lab-restore-wrong-store
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year | tap Restore purchases | open /dev | expect lab_restore {"result":"notFound","owner":"lab-checkout-1","source":"adapter"} | open /paywall
expect: Continue | Restore purchases
then-open: /dev
then-expect: Journey paywall · paid no | Restore operations 1
```

```proof
name: restore-failure-retries-original-account
scenario: identity-lab-restore-error-retry
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year | tap Restore purchases | open /dev | expect lab_restore {"result":"error","owner":"lab-checkout-1","source":"adapter"} | expect paywall_error {"operation":"restore"} | open /paywall | expect Yearly $39.99/year | tap Restore purchases
wait: 25
expect: Allow Screen Time
then-open: /dev
then-expect: Journey setup · paid yes | Restore operations 2 | lab_restore {"result":"restored","owner":"lab-checkout-1","source":"adapter"}
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
absent: Account and help | Free trial | Enable free trial | free trial | Loading plans
then-tap: Try again
then-open: /dev
then-expect: paywall_error {"operation":"load"}
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
name: checkout-selects-trial-product
scenario: onboarding-offer-a
open: /onboarding/S3c
actions: expect 3-day free trial | tap Continue | expect Day 2 · Reminder | tap Continue | expect Yearly $39.99/year · $0.77 / week | tap Monthly $9.99/month · $2.31 / week | expect 3-day free trial, then $9.99/month | tap Continue
expect: Apps blocked until
absent: Continue with Apple
then-open: /dev
then-expect: Journey app · paid yes | lab_offer_purchase {"plan":"com.johansardar.excerlock.premium.a.monthly","trial":true} | Purchase operations 1 | screen {"name":"/paywall"} | screen {"name":"/setup/X1"}
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
expect: Allow Screen Time
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
expect: Allow Screen Time
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
expect: Allow Screen Time
then-open: /dev
then-expect: lab_posthog_capture {"event":"checkout_attempt_completed"} | lab_checkout_analytics {"result":"hang"} | Checkout 1 purchase success · terminals 1 · joined yes · safe yes · timing yes | Purchase operations 1
```

## Gotchas
- The purchase-error retry proof checks the recorded error before retrying, because the floating error notice can disappear while the simulator accessibility query runs.
- The app uses Adapty, not RevenueCat.
- In a dev build the paywall is a local stand-in with dash prices. Seeing real prices means the real runtime is running (see the launch Gotchas).
- A new PostHog flag, or a new consumer of `paywall_variant`, is App Store submission material, never an OTA (`docs/ota.md`, `excer check` `flag-registry`).
- The win-back paywall appears when the first live entitlement of a launch is `expired`, even though the persisted store still says `trial` from the last run (the real app hydrates `trial`, then Adapty's first profile says `expired`). `trial-lapsed-while-closed` reproduces it: Home mounts on the hydrated `trial`, and the fake publishes `expired` 20 s after launch (`entitlementTimeline`). `trial-lapses-in-session` publishes a live `trial` at 1 s and `expired` at 20 s, which must show the in-app placement instead. Both proofs read the placement from the fake `paywall_viewed` event on `dev`. A lapse observed live after a live `trial`/`active` in the same session (`subscription/winbackSession.ts`) does not trigger it. Do not deep-link after the relaunch: opening a URL rebuilds navigation and remounts Home.
- The `identity-lab-*` scenarios swap demo mode's `AuthFake` and `SubscriptionFake` for the real `createAuthServices` (SupabaseAuthAdapter + IdentityCoordinator) and `AdaptySubscriptionAdapter`, over a scripted Supabase client, a scripted `PUT /v1/user` and a scripted Adapty SDK (`dev-harness/lib/fakes/IdentityLab.ts`). The scenario's `identityLab` script makes one edge fail once or run slow (8 s). They reproduce App Review 2.1(b) on Build 12: a user-sync failure at launch left the identity spine unready for the whole session, and a cold start onto the paywall raced the spine. Plans are named "Lab annual" / "Lab monthly" so a lab screenshot is never mistaken for StoreKit data. Checkout, account A and account B have independent ownership. Delayed-callback scenarios queue immutable purchase/restore profiles and deliver them after an account transition. They prove identity generation and purchase handling only, not StoreKit, Adapty transfer behavior or a sandbox account.
- The dev client's floating tools button (gear) sits exactly on the paywall's Close button, so a Close tap opens the dev menu. Turn it off once per simulator: `xcrun simctl --set ~/.local/share/excer/worker-simulators spawn <udid> defaults write com.johansardar.excerlock EXDevMenuShowFloatingActionButton -bool false`, then relaunch.

- The onboarding offer is retained from its early Adapty response. There are no trial/no-trial arms; trial wording comes only from the offer StoreKit returns. Notification timing diagnostics run the production `trialReminderPlan`; they are not proof of iOS delivery.
- A fresh worker simulator has no location. The gym fake waits for a location fix while the scenario loads, so `excer demo` silently keeps the previous scenario. Set one first: `xcrun simctl --set ~/.local/share/excer/worker-simulators location <udid> set 40.1106,-88.2073`.

```proof
name: no-account-link-on-paywall
scenario: returning-unpaid
open: /
expect: Get your | Close | Continue | Restore purchases
absent: Account and help | Sign in
```

```proof
name: restore-nothing-offers-account
scenario: returning-unpaid
open: /
tap: Restore purchases
wait: 20
expect: No purchase found | This Apple ID has no ExcerLock subscription to restore. | OK | Account and deletion
then-tap: Account and deletion
then-expect: Account and help | Account and deletion | Manage subscription in App Store | Help and feedback
```

```proof
name: close-offer-once
scenario: fresh-install
open: dev?journey=paywall
open-wait: 3
actions: expect Continue | tap Close | expect ONE TIME OFFER | expect 75% discount | expect CLAIM YOUR OFFER NOW | tap Close | expect Get started | open dev?journey=paywall | expect Continue | tap Close
expect: Get started
absent: ONE TIME OFFER | CLAIM YOUR OFFER NOW
```

```proof
name: close-offer-claim-to-setup
scenario: identity-lab-user-sync-failed
open: dev?journey=paywall
open-wait: 3
actions: expect Yearly $39.99/year | tap Close | expect CLAIM YOUR OFFER NOW
tap: CLAIM YOUR OFFER NOW
wait: 25
expect: Allow Screen Time
absent: ONE TIME OFFER
```

```proof
name: close-offer-layout
scenario: fresh-install
open: dev?journey=paywall
open-wait: 3
actions: expect Continue | tap Close
wait: 6
expect: ExcerLock | ONE TIME OFFER | You will never see this again. | 75% discount | THIS OFFER WILL EXPIRE SOON | Save 75% with the yearly plan. | Yearly · $2.50/mo | Billed $29.99/year after 3-day free trial · vs $9.99/month | CLAIM YOUR OFFER NOW | Terms of Use | Restore purchases | Privacy Policy
absent: Continue
```
