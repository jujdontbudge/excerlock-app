---
id: paywall
title: Paywall, trial and subscription
routes: [paywall, settings/subscription]
scenarios: [fresh-install, trial-active, trial-expired, billing-issue, identity-lab-user-sync-failed, identity-lab-slow-cold-start, identity-lab-anonymous-failed, identity-lab-plans-failed, identity-lab-purchase-cancelled, identity-lab-purchase-error-retry, identity-lab-purchase-busy, identity-lab-existing-subscription, identity-lab-restore-wrong-store, identity-lab-restore-error-retry, identity-lab-apple-linked]
server: [POST /v1/subscription/resync, POST /v1/webhooks/adapty]
events: [paywall_viewed, purchase_started, paywall_error]
depends: [launch]
---
## Sub-features
- The onboarding hard wall: no decline and no close. Adapty placements for onboarding, in-app and win-back. A win-back load failure falls back to the placement the surface would otherwise request.
- A tilted field of locked TikTok, Instagram, YouTube, Snapchat, X, Facebook, Reddit, Threads, Netflix and Pinterest App Store icons, mixed with orange SF Symbol exercise and health marks, fills the top of the orange screen. Tiles touching the headline go faint and tiles behind the frosted Benefits card show through at reduced strength. Below sit the free trial switch, the white Yearly and Monthly rows (Best offer pill on the recommended plan), "No payment due now", and the orange Start for $0.00 button. With the trial on, each row reads "FREE" on top and "<days> day trial then <price>/wk" underneath, with no yearly amount. With the trial off, each row shows the plan name and billed price (Yearly $49.99/year) over the per-week price. Underlined Terms of Use · Restore purchases · Privacy Policy sit in the safe area underneath; there is no back arrow, and account recovery remains a separate route, not a paywall footer link.
- The Benefits card lists the selected fat and/or muscle targets (or the maintain/fallback line), the chosen Condition ("Walk 10,000 steps to unlock apps"; the O08 goal line when no Condition is staged yet), and the O10 estimate as hours less screen time a day.
- The free trial switch appears only when the paywall serves a trial and a no-trial product for the same period. On selects the trial products and Start for $0.00; off selects the no-trial products, hides "No payment due now" and shows Continue. Tapping a plan keeps the switch state. Turning it on plays a spark burst, glow ring and layered haptics. The dev fake serves both kinds; production serves trial-only plans until no-trial twins are attached in Adapty.
- Purchase and restore are serialized and show a busy state. Cancel, error and not-found never grant access.
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
expect: Become ADDICTED to exercise | Benefits | Lose 15.0 pounds of fat | Walk 10,000 steps to unlock apps | 3 hours less screen time a day | Free trial enabled | Start for $0.00
```

```proof
name: trial-switch
open: /sample-paywall
tap: Free trial enabled
expect: Enable free trial | Yearly $49.99/year · $0.96/wk | Monthly $9.99/month · $2.31/wk | Continue
then-tap: Enable free trial
then-expect: Free trial enabled | Yearly FREE · 7 day trial then $0.96/wk | Monthly FREE · 7 day trial then $2.31/wk | Start for $0.00
```

```proof
name: personalized-fat-goal
scenario: fresh-install
open: /onboarding/O08
tap: Less screen time | Continue | Lose fat | Continue | Continue
expect: How many hours do you currently spend scrolling each day?
then-open: /sample-paywall?answers=keep
then-expect: Lose 15.0 pounds of fat | Walk 10,000 steps to unlock apps | 3 hours less screen time a day
```

```proof
name: personalized-muscle-goal
scenario: fresh-install
open: /onboarding/O08
tap: More exercise | Continue | Gain muscle | Continue | Continue
expect: How many hours do you currently spend scrolling each day?
then-open: /sample-paywall?answers=keep
then-expect: Gain 10.0 pounds of muscle | Walk 10,000 steps to unlock apps | 3 hours less screen time a day
```

```proof
name: personalized-both-goals
scenario: fresh-install
open: /onboarding/O08
tap: More exercise | Continue | Gain muscle | Lose fat | Continue | Continue | Continue
expect: How many hours do you currently spend scrolling each day?
then-open: /sample-paywall?answers=keep
then-expect: Lose 15.0 pounds of fat | Gain 10.0 pounds of muscle | Walk 10,000 steps to unlock apps | 3 hours less screen time a day
```

```proof
name: personalized-maintain-goal
scenario: fresh-install
open: /onboarding/O08
tap: Overall wellness | Continue | Maintain | Continue
expect: How many hours do you currently spend scrolling each day?
then-open: /sample-paywall?answers=keep
then-expect: Stay fit, strong and healthy for life | Walk 10,000 steps to unlock apps | 3 hours less screen time a day
```

```proof
name: personalized-other-goal
scenario: fresh-install
open: /onboarding/O08
tap: Something else | Continue | Maintain | Continue
expect: How many hours do you currently spend scrolling each day?
then-open: /sample-paywall?answers=keep
then-expect: Stay fit, strong and healthy for life | Walk 10,000 steps to unlock apps | 3 hours less screen time a day
```

```proof
name: personalized-screen-time-estimate
scenario: fresh-install
open: /onboarding/O10
tap: 4 to 6 hours
expect: How many hours do you currently spend scrolling each day?
then-open: /sample-paywall?answers=keep
then-expect: 5 hours less screen time a day
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
expect: Become ADDICTED to exercise | Start for $0.00
wait: 45
then-open: dev
then-expect: "placement":"winback"
```

```proof
name: lapse-in-session
scenario: trial-lapses-in-session
open: /home
expect: Close | Become ADDICTED to exercise | Start for $0.00
wait: 45
then-open: dev
then-expect: "placement":"winback"
```

```proof
name: identity-sync-retry
scenario: identity-lab-user-sync-failed
open: /paywall
wait: 25
expect: Lab annual · $49.99 / year | Lab monthly · $9.99 / month | Start for $0.00
```

```proof
name: identity-slow-cold-start-loading
scenario: identity-lab-slow-cold-start
relaunch: true
open: dev?journey=paywall
wait: 8
expect: Start for $0.00 | Restore purchases
absent: Loading plans | Starting ExcerLock
```

```proof
name: identity-slow-cold-start
scenario: identity-lab-slow-cold-start
relaunch: true
wait: 25
expect: Lab annual · $49.99 / year | Lab monthly · $9.99 / month | Start for $0.00
```

```proof
name: identity-anonymous-retry
scenario: identity-lab-anonymous-failed
open: /paywall
wait: 25
expect: Lab annual · $49.99 / year | Lab monthly · $9.99 / month | Start for $0.00
```

```proof
name: identity-plans-retry
scenario: identity-lab-plans-failed
open: dev?journey=paywall
wait: 25
expect: Lab annual · $49.99 / year | Lab monthly · $9.99 / month | Start for $0.00
absent: Retry loading plans | couldn't load
```

```proof
name: identity-purchase-to-setup
scenario: identity-lab-user-sync-failed
open: dev?journey=paywall
tap: Start for $0.00 | Continue with Apple
wait: 25
expect: Allow Screen Time
then-open: dev
then-expect: Purchase recovery none | Purchase operations 1 | lab_purchase {"result":"success","owner":"lab-checkout-1"} | subscription_proof_verified {"account":"lab-checkout-1","environment":"sandbox"}
```

```proof
name: signin-first-purchase-needs-no-second-signin
scenario: returning-unpaid
open: /
tap: Sign in | Continue with Apple | Start for $0.00
wait: 25
expect: Home | Locked
then-open: /dev
then-expect: Journey app · paid yes · admitted yes | signed_in {"provider":"apple"} | purchase_started {"placement":"winback","plan_id":"fake.annual"} | Protected route mounts | None
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
tap: Start for $0.00
wait: 25
expect: Start for $0.00 | Lab annual · $49.99 / year
absent: Choose a plan | Starting your plan | Please retry
```

```proof
name: identity-purchase-error-retries-original-checkout
scenario: identity-lab-purchase-error-retry
open: dev?journey=paywall
tap: Start for $0.00
wait: 25
expect: That didn't go through. Please try again. | Start for $0.00
absent: could not finish | Starting your plan
then-tap: Start for $0.00 | Continue with Apple
then-open: /dev
then-expect: Journey setup · paid yes · admitted no | Active account Checkout | Purchase recovery none | Purchase operations 2 | lab_purchase {"result":"error","owner":"lab-checkout-1"} | lab_purchase_failure {"attempt":1,"owner":"lab-checkout-1","grants":0,"recovery":"none"} | lab_purchase {"result":"success","owner":"lab-checkout-1"} | subscription_proof_verified {"account":"lab-checkout-1","environment":"sandbox"} | Protected route mounts | None
```

```proof
name: identity-purchase-pending
scenario: identity-lab-purchase-pending
open: dev?journey=paywall
tap: Start for $0.00
wait: 25
expect: Continue | Lab annual · $49.99 / year
absent: still being confirmed | Check purchase status | pending approval
```

```proof
name: identity-purchase-success-without-access
scenario: identity-lab-purchase-success-without-access
open: dev?journey=paywall
tap: Start for $0.00
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
tap: Start for $0.00
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
name: identity-account-switch-does-not-reuse-checkout
scenario: identity-lab-apple-linked
open: dev?journey=paywall
tap: Start for $0.00 | Continue with Apple | Recover with Apple
wait: 25
expect: Sign in to continue
then-open: dev
then-expect: Purchase recovery accountConnection | Purchase operations 1 | lab_recovered_account {"provider":"apple","user":"lab-user-a"} | lab_adapty_identify {"user":"lab-user-a"}
```

## Gotchas
- The app uses Adapty, not RevenueCat.
- In a dev build the paywall is a local stand-in with dash prices. Seeing real prices means the real runtime is running (see the launch Gotchas).
- A new PostHog flag, or a new consumer of `paywall_variant`, is App Store submission material, never an OTA (`docs/ota.md`, `excer check` `flag-registry`).
- The win-back paywall appears when the first live entitlement of a launch is `expired`, even though the persisted store still says `trial` from the last run (the real app hydrates `trial`, then Adapty's first profile says `expired`). `trial-lapsed-while-closed` reproduces it: Home mounts on the hydrated `trial`, and the fake publishes `expired` 20 s after launch (`entitlementTimeline`). `trial-lapses-in-session` publishes a live `trial` at 1 s and `expired` at 20 s, which must show the in-app placement instead. Both proofs read the placement from the fake `paywall_viewed` event on `dev`. A lapse observed live after a live `trial`/`active` in the same session (`subscription/winbackSession.ts`) does not trigger it. Do not deep-link after the relaunch: opening a URL rebuilds navigation and remounts Home.
- The `identity-lab-*` scenarios swap demo mode's `AuthFake` and `SubscriptionFake` for the real `createAuthServices` (SupabaseAuthAdapter + IdentityCoordinator) and `AdaptySubscriptionAdapter`, over a scripted Supabase client, a scripted `PUT /v1/user` and a scripted Adapty SDK (`dev-harness/lib/fakes/IdentityLab.ts`). The scenario's `identityLab` script makes one edge fail once or run slow (8 s). They reproduce App Review 2.1(b) on Build 12: a user-sync failure at launch left the identity spine unready for the whole session, and a cold start onto the paywall raced the spine. Plans are named "Lab annual" / "Lab monthly" so a lab screenshot is never mistaken for StoreKit data. Checkout, account A and account B have independent ownership. Delayed-callback scenarios queue immutable purchase/restore profiles and deliver them after an account transition. They prove identity generation, journal and admission gating only, not StoreKit, Adapty transfer behavior or a sandbox account.
- The dev client's floating tools button (gear) sits on top of the paywall's Restore link; turn it off in the dev menu (Tools button) before `identity-restore-not-found`, or the tap opens the dev menu.
