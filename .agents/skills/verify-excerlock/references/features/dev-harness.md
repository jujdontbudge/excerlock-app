---
id: dev-harness
title: Developer harness and research screens
routes: [dev, sample-paywall, treadmill-preview, diagnostics/sensors, linked-trace]
scenarios: [dynamic-type-xl, reduce-motion, returning-signed-in, identity-lab-account-isolation, identity-lab-delayed-callbacks, identity-lab-deletion-callbacks, identity-lab-established-transfer, identity-lab-transfer-second-subscription, identity-lab-concurrent-restore, identity-lab-local-signout, identity-lab-stale-product-handle, identity-lab-independent-restore, identity-lab-passive-entry, identity-lab-lifecycle-revocation]
depends: [launch]
---
## Sub-features
- `excerlock://sample-paywall` (simulator dev builds only, real or fake services): fills a complete, realistic onboarding (walking 10,000 steps, weekdays 9 AM–9 PM, lose 15 lb, 3 h scrolling), stages its Condition and opens the onboarding paywall. Use it instead of tapping through onboarding when you need the real paywall. Add `?stage=sign-in` to open the "Create your account" sign-in step that follows a successful purchase, skipping only Apple's payment sheet. For a real StoreKit purchase on the simulator, launch with `app-next/scripts/storekit-sim.sh` (see `app-next/storekit/README.md`), then use the plain link and tap Start for $0.00.
- `excerlock://treadmill-preview` (simulator dev builds only): opens the treadmill unlock with the fake walking gait, plus a Replay pill at the top. Each tap restarts the whole scan, progress ring and unlock ceremony from the start, so you can watch the loading and animation over and over.
- `/dev`: the dev menu, scenario loading (`dev?scenario=<id>`), outcome controls (`restore`, `outcome`, `prompt`, `setup=X1..X5`), the component preview gallery, and the shield preview.
- `/diagnostics/sensors`: a sensor smoke screen, available only in dev builds.
- `/linked-trace`: the Linked Recorder research screen. It is compiled in only for research builds and is disabled in the App Store bundle.

## How to get to it (user POV)
Not user-facing. In a dev build, tap the Settings version footer seven times.

## Driving it with excer
`./excer demo <id>` uses `dev?scenario=`. Use `./excer demo list` for the ids.

```proof
name: dev-menu
scenario: trial-active
open: /dev
expect: Developer menu | Local scenarios and component previews.
```

```proof
name: account-data-a-b-a-isolation
scenario: identity-lab-account-isolation
open: /dev
tap: Run A B A isolation
expect: Account data | Active account A | Legacy data Quarantined | Condition owner Account A | History Days 1 | Profile Account A | Saved Gym Gym A | Checkpoints A account-a/1/Account A/Gym A · B account-b/1/Account B/Gym B · A account-a/1/Account A/Gym A | Activity checkpoints A activity-a/11/110/1 · B activity-b/22/220/2 · A activity-a/11/110/1
```

```proof
name: account-switch-preserves-enforcement-until-ready
scenario: identity-lab-account-isolation
open: /dev
tap: Run account switch ordering
wait: 30
expect: Account data | Active account A | Condition owner Account A | Saved Gym Gym A | Switch ordering Preserved while unready · B loaded before ready · Screen Time rotated after target loaded · B ready · Preserved while unready · A loaded before ready · Screen Time rotated after target loaded · A ready
```

```proof
name: delayed-subscription-callbacks-fail-closed
scenario: identity-lab-delayed-callbacks
open: /dev
tap: Run delayed callback isolation
wait: 30
expect: Purchase operations 1 | Restore operations 1 | Delayed callbacks 0/2 | Callback isolation lab-user-b Entitlement none admission ineligible recovery pending callbacks 2/2
```

```proof
name: deletion-and-late-callbacks-fail-closed
scenario: identity-lab-deletion-callbacks
open: /dev
tap: Run deletion callback isolation
wait: 30
expect: Active account Checkout | Condition owner None | History Days 0 | Profile None | Saved Gym None | Purchase operations 1 | Restore operations 1 | Delayed callbacks 0/2 | Deletion isolation lab-user-a deleted tombstone preserved fresh lab-checkout- | Entitlement none admission ineligible data erased recovery pending callbacks 2/2
```

```proof
name: established-restore-transfer-is-account-bound
scenario: identity-lab-established-transfer
open: /dev
tap: Run established restore transfer
wait: 30
expect: Active account B | Condition owner Account B | History Days 1 | Profile Account B | Saved Gym Gym B | Restore operations 3 | Transfer isolation lab-user-a source profile ineligible retry ineligible transfer eligible repeat eligible source after ineligible target return eligible transfers 1 data A account-a/1/Account A/Gym A data B account-b/1/Account B/Gym B
```

```proof
name: transfer-preserves-independent-subscription
scenario: identity-lab-transfer-second-subscription
open: /dev
tap: Run established restore transfer
wait: 30
expect: Active account B | Condition owner Account B | History Days 1 | Profile Account B | Saved Gym Gym B | Restore operations 3 | Transfer isolation lab-user-a source profile ineligible retry ineligible transfer eligible repeat eligible source after eligible target return eligible transfers 1 grants transferred lab.store.annual to lab-user-b independent lab.account.monthly stays lab-user-a target only lab.store.annual source only lab.account.monthly data A account-a/1/Account A/Gym A data B account-b/1/Account B/Gym B
```

```proof
name: concurrent-restores-serialize-one-owner
scenario: identity-lab-concurrent-restore
open: /dev
tap: Run concurrent restore race
wait: 30
expect: Active account B | Condition owner Account B | History Days 1 | Profile Account B | Saved Gym Gym B | Restore operations 3 | Concurrent restore race A+B winner lab-user-b after race eligible stale loser eligible/active repeat eligible source eligible target eligible transfers 1 grants store lab.store.annual=lab-user-b independent A lab.account.monthly=lab-user-a independent B lab.account.b.monthly=lab-user-b unique 3/3 data A account-a/1/Account A/Gym A data B account-b/1/Account B/Gym B
```

```proof
name: local-signout-keeps-peer-session
scenario: identity-lab-local-signout
open: /dev
tap: Run local sign-out isolation
wait: 30
expect: Get started | Sign in
then-open: /dev
then-expect: Active account Checkout | Condition owner None | History Days 0 | Profile None | Saved Gym None | Local sign-out before app/admitted failed reset Could not sign out. Please try again. journey verifying/revoked data account-a/1/Account A/Gym A after welcome/revoked local scopes local local data undefined/0//undefined peer eligible fresh proofs 1
```

```proof
name: stale-product-handle-rejected-after-account-switch
scenario: identity-lab-stale-product-handle
open: /dev
tap: Run stale product handle
wait: 30
expect: Active account B | Condition owner Account B | Profile Account B | Saved Gym Gym B | Purchase operations 0 | Stale product handle source lab-user-a generation 1 target lab-user-b generation 2 stale Plan expired. Reload plans. SDK purchases 0 data A account-a/1/Account A/Gym A data B account-b/1/Account B/Gym B A restored account-a/1/Account A/Gym A | Protected route mounts | None
```

```proof
name: empty-restore-preserves-independent-account-access
scenario: identity-lab-independent-restore
open: /dev
tap: Run independent restore
wait: 30
expect: Active account A | Condition owner Account A | Profile Account A | Saved Gym Gym A | Restore operations 1 | Restore isolation independent before eligible empty restore after eligible Entitlement active restores 1 data account-a/1/Account A/Gym A | lab_restore {"result":"notFound","owner":"lab-user-a","source":"adapter"} | Protected route mounts | None
```

```proof
name: passive-entry-does-not-transfer-subscription
scenario: identity-lab-passive-entry
open: /dev
tap: Run passive entry
wait: 30
expect: Active account A | Condition owner Account A | Profile Account A | Saved Gym Gym A | Restore operations 0 | Passive entry store owner lab-user-a passive target lab-user-b target Entitlement none source Entitlement active transfers 0 restores 0 data A account-a/1/Account A/Gym A data B account-b/1/Account B/Gym B A restored account-a/1/Account A/Gym A | Protected route mounts | None
```

```proof
name: subscription-lease-boundaries-fail-closed
scenario: fresh-install
open: /dev
tap: Run subscription lease diagnostics
expect: Lease diagnostics offline first unavailable eligible eligible offline mid-lease unavailable/retained rollback retained five-minute cap expired short eligible before boundary active at boundary expired missing expiry unavailable denial ineligible/cleared | Protected route mounts | None
```

```proof
name: deployed-resync-contract-and-environment-rejected
scenario: fresh-install
open: /dev
tap: Run subscription lease diagnostics
expect: legacy unavailable/cleared wrong environment unavailable/cleared | Protected route mounts | None
```

```proof
name: admitted-account-revocation-replaces-app
scenario: identity-lab-lifecycle-revocation
open: dev?lab=lifecycle-revocation
wait: 30
expect: Start for $0.00 | Restore purchases
then-open: /dev
then-expect: Journey paywall · paid no · admitted no | Active account A | Condition owner Account A | Profile Account A | Saved Gym Gym A | Lifecycle revocation before app/admitted after paywall/revoked Entitlement none data account-a/1/Account A/Gym A | Protected route mounts | None
```

```proof
name: cached-entitlement-retains-full-onboarding-path
scenario: reinstall-keychain
open: dev?lab=onboarding-path
expect: Block apps. Move more. | Get started | Sign in
then-open: /dev
then-expect: active | Onboarding path O01 O02 O03 O07 O04 O05 O06 O08 O22 O10 O11 O12 O13 O14 O15 O16 O17 O18 O20 W0 W1 W2 W3 S1 S2 S3 S4 S5 S3b S3c S3d P | Protected route mounts | None
```

## Gotchas
- `/dev` exists only in `__DEV__` builds. "Unmatched Route" means the app is not running a Metro dev bundle.
- The demo fakes are dev-only and live in the `dev-harness` package; the layer rules stop any product package from importing them.
