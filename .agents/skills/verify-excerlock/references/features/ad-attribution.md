---
id: ad-attribution
title: Meta and TikTok ad events and App Tracking Transparency
routes: []
scenarios: [ads-paid-after-trial, ads-trial-allowed, ads-registration-sent-before, ads-trial-denied, ads-paid-no-trial, ads-trial-ineligible, ads-trial-sent-before, ads-other-account-sent, ads-xcode-purchase, ads-duplicate-callbacks, ads-sdk-start-fails, ads-sdk-log-fails, ads-unconfigured, ads-restore, ads-purchase-cancelled, ads-purchase-pending, ads-purchase-error]
depends: [onboarding, paywall]
---
## Sub-features
- One owner per event (ADR 0084). The app's `ad-attribution` package sends Registration (end of onboarding, once per install), ViewContent (each paywall load), StartTrial and Subscribe (once per account and per App Store original transaction) to the Meta SDK and the TikTok SDK. Install, launch and day-2 retention are the SDKs' own automatic events. Adapty's server sends trial conversions, renewals and refunds to Meta. Nothing goes to TikTok from the server in v1.
- Allowed properties: Subscribe carries `value` and `currency`; every other event carries none. `./excer check` (`ad-attribution`) fails on any other property, and `allowListed` drops it at runtime.
- The App Tracking Transparency prompt appears once, when onboarding hands off to the paywall, and only in builds with real Meta or TikTok credentials. Saying no changes nothing else; both SDKs still receive the events, without the advertising identifier.
- StartTrial or Subscribe is decided from the StoreKit transaction in Adapty's purchase result: a free-trial introductory offer means StartTrial; a paid first purchase means Subscribe, with the transaction's price and currency. Restores, renewals, plan changes, cancelled, failed and pending purchases, and Xcode StoreKit test purchases send nothing.
- A trial bought while the app is killed is sent once on the next launch, from a saved purchase intent and the purchase recovery journal.
- Placeholder or missing credentials leave both SDKs inactive: no Meta plist keys, no SDK start, no network call, no prompt.

## How to get to it (user POV)
Not visible. A user sees only the system tracking prompt after the last onboarding step, then the paywall.

## Driving it with excer
The `ads-*` scenarios run the real `ad-attribution` core, the real `AdaptySubscriptionAdapter` and the identity lab's scripted Adapty SDK, with fake Meta and TikTok sinks. `/dev` shows a running count per platform (`Meta events registration 1 view 1 trial 1 subscribe 0`), the consent each SDK holds, and every `ad_meta` / `ad_tiktok` event with its properties. A count proves exactly-once, because a duplicate would read 2.

```proof
name: trial-sends-each-event-once
scenario: ads-trial-allowed
open: /onboarding/S3c
actions: expect 3-day free trial | tap Continue | expect Day 2 · Reminder | tap Continue | expect Yearly $39.99/year · $0.77 / week | tap Continue
expect: Continue with Apple
wait: 30
then-open: /dev
then-expect: Meta events registration 1 view 1 trial 1 subscribe 0 | TikTok events registration 1 view 1 trial 1 subscribe 0 | Ad tracking meta granted tiktok granted | ad_tracking_prompt {"answer":"granted"} | ad_meta {"name":"start_trial"}
```

```proof
name: registration-once-per-install
scenario: ads-registration-sent-before
open: /onboarding/S3c
actions: expect 3-day free trial | tap Continue | expect Day 2 · Reminder | tap Continue | expect Yearly $39.99/year · $0.77 / week
expect: Continue
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 1 | TikTok events registration 0 view 1
```

```proof
name: denied-tracking-still-sends
scenario: ads-trial-denied
open: /onboarding/S3c
actions: expect 3-day free trial | tap Continue | expect Day 2 · Reminder | tap Continue | expect Yearly $39.99/year · $0.77 / week | tap Continue
expect: Continue with Apple
wait: 30
then-open: /dev
then-expect: Ad tracking meta denied tiktok denied | Meta events registration 1 view 1 trial 1 subscribe 0 | TikTok events registration 1 view 1 trial 1 subscribe 0
```

```proof
name: paid-start-sends-subscribe-with-price
scenario: ads-paid-no-trial
open: /onboarding/S3b
actions: expect Once you hit 10,000 steps | tap Continue | expect Become the best version of yourself | tap Continue | expect Yearly $39.99/year · $0.77 / week | tap Monthly $9.99/month · $2.31 / week | expect Billed as $9.99/month | tap Continue
expect: Continue with Apple
wait: 30
then-open: /dev
then-expect: Meta events registration 1 view 1 trial 0 subscribe 1 | TikTok events registration 1 view 1 trial 0 subscribe 1 | ad_meta {"name":"subscribe","value":9.99,"currency":"USD"} | ad_tiktok {"name":"subscribe","value":9.99,"currency":"USD"}
```

```proof
name: used-trial-sends-subscribe
scenario: ads-trial-ineligible
open: dev?journey=paywall
tap: Continue
expect: Continue with Apple
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 1 trial 0 subscribe 1 | ad_meta {"name":"subscribe","value":39.99,"currency":"USD"}
```

```proof
name: counted-store-subscription-not-repeated
scenario: ads-trial-sent-before
open: dev?journey=paywall
tap: Continue
expect: Continue with Apple
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 1 trial 0 subscribe 0 | TikTok events registration 0 view 1 trial 0 subscribe 0 | lab_offer_purchase
```

```proof
name: other-account-flags-stay-separate
scenario: ads-other-account-sent
open: dev?journey=paywall
tap: Continue
expect: Continue with Apple
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 1 trial 1 subscribe 0
```

```proof
name: xcode-test-purchase-dropped
scenario: ads-xcode-purchase
open: dev?journey=paywall
tap: Continue
expect: Continue with Apple
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 1 trial 0 subscribe 0 | lab_offer_purchase
```

```proof
name: duplicate-callbacks-send-once
scenario: ads-duplicate-callbacks
open: dev?journey=paywall
tap: Continue
expect: Continue with Apple
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 1 trial 1 subscribe 0 | TikTok events registration 0 view 1 trial 1 subscribe 0
```

```proof
name: sdk-start-failure-keeps-purchase
scenario: ads-sdk-start-fails
open: /onboarding/S3c
actions: expect 3-day free trial | tap Continue | expect Day 2 · Reminder | tap Continue | expect Yearly $39.99/year · $0.77 / week | tap Continue
expect: Continue with Apple
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 0 trial 0 subscribe 0 | Ad tracking meta not started tiktok not started · errors 2 | Purchase operations 1
```

```proof
name: sdk-log-failure-keeps-purchase
scenario: ads-sdk-log-fails
open: /onboarding/S3c
actions: expect 3-day free trial | tap Continue | expect Day 2 · Reminder | tap Continue | expect Yearly $39.99/year · $0.77 / week | tap Continue
expect: Continue with Apple
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 0 trial 0 subscribe 0 | Ad tracking meta granted tiktok granted · errors 6 | Purchase operations 1
```

```proof
name: placeholder-credentials-stay-inactive
scenario: ads-unconfigured
open: /onboarding/S3c
actions: expect 3-day free trial | tap Continue | expect Day 2 · Reminder | tap Continue | expect Yearly $39.99/year · $0.77 / week | tap Continue
expect: Continue with Apple
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 0 trial 0 subscribe 0 | Ad tracking meta not started tiktok not started | Purchase operations 1
```

```proof
name: restore-sends-nothing
scenario: ads-restore
open: dev?journey=paywall&restore=restored
tap: Restore purchases | Continue with Apple
expect: Allow Screen Time
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 1 trial 0 subscribe 0 | TikTok events registration 0 view 1 trial 0 subscribe 0 | lab_restore
```

```proof
name: cancelled-purchase-sends-nothing
scenario: ads-purchase-cancelled
open: dev?journey=paywall
tap: Continue
expect: Continue | Yearly $39.99/year · $0.77 / week
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 1 trial 0 subscribe 0 | purchase_failed {"reason_class":"cancelled"}
```

```proof
name: pending-purchase-sends-nothing
scenario: ads-purchase-pending
open: dev?journey=paywall
tap: Continue
expect: Continue | Yearly $39.99/year · $0.77 / week
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 1 trial 0 subscribe 0 | lab_purchase {"result":"pending"
```

```proof
name: failed-purchase-sends-nothing
scenario: ads-purchase-error
open: dev?journey=paywall
tap: Continue
expect: Continue | Yearly $39.99/year · $0.77 / week
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 1 trial 0 subscribe 0 | purchase_failed {"reason_class":"unknown"}
```

```proof
name: paid-after-trial-does-not-send-second-conversion
scenario: ads-paid-after-trial
open: dev?journey=paywall
tap: Continue
expect: Continue with Apple
wait: 30
then-open: /dev
then-expect: Meta events registration 0 view 1 trial 0 subscribe 0 | TikTok events registration 0 view 1 trial 0 subscribe 0 | lab_offer_purchase
```

## Gotchas
- The fake counts live in memory, so a cold relaunch resets them to 0. `ads-interrupted-trial` therefore reads `/dev` in the launch that loads it: its seeded purchase intent is tagged as coming from an earlier launch, which is what the recovery path keys on. A scenario's ledger (`ads.sentBefore`) stands in for what an earlier launch, install or account already sent; the real ledger is the keychain, which survives a reinstall.
- The real SDKs, the real ATT dialog, Meta Events Manager, TikTok Events Manager and Adapty's Event Feed cannot be proven here. They need a keyed development/preview build on a physical phone (TestFlight is not required) (ADR 0084, "Device verification").
- In a TestFlight build (sandbox App Store environment) TikTok runs in debug mode, so its events arrive as test events and never reach TikTok reporting. The owner accepted this preview/TestFlight policy on 2026-10-18 (B7); verified production keeps test mode off. Meta has no SDK test mode in this implementation; lack of an ad click does not isolate production ingestion. The owner accepted sandbox events in Meta's live dataset on 2026-10-18 (A14), so this is no longer a policy release gate. Platform receipts still require device/dashboard evidence.

- A keyed real-runtime simulator run initialized both SDKs, then failed because Core Motion activity, live cadence and step counting are unavailable. Fakes do not establish platform receipts, physical ATT, StoreKit sandbox behavior or network payload privacy. Evidence: `.excer/ad-setup/native-blocker.json`.
