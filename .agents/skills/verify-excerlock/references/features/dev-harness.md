---
id: dev-harness
title: Developer harness and research screens
routes: [dev, sample-paywall, treadmill-preview, diagnostics/sensors, linked-trace]
scenarios: [dynamic-type-xl, reduce-motion, returning-signed-in, identity-lab-account-isolation]
depends: [launch]
---
## Sub-features
- `excerlock://sample-paywall` (simulator dev builds only, real or fake services): fills a complete, realistic onboarding (walking 10,000 steps, weekdays 9 AM–9 PM, lose 15 lb, 3 h scrolling), stages its Condition and opens the onboarding paywall. Use it instead of tapping through onboarding when you need the real paywall. Add `?stage=sign-in` to open the "Create your account" sign-in step that follows a successful purchase, skipping only Apple's payment sheet. For a real StoreKit purchase on the simulator, launch with `app-next/scripts/storekit-sim.sh` (see `app-next/storekit/README.md`), then use the plain link and tap Continue.
- `excerlock://treadmill-preview` (simulator dev builds only): opens the treadmill unlock with the fake walking gait, plus a Replay pill at the top. Each tap restarts the whole scan, progress ring and unlock ceremony from the start, so you can watch the loading and animation over and over.
- `/dev`: the dev menu, scenario loading (`dev?scenario=<id>`), outcome controls (`restore`, `outcome`, `prompt`, `setup=X1..X5`), the component preview gallery, and the shield preview.
- `dev?stage=type` and `dev?stage=icons`: centring specimens. Every type variant appears bare, inside a fixed box and inside a row; every icon appears in its own box. The proof's centring measurement fails if any of them drifts.
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
name: type-centred
scenario: trial-active
open: dev?stage=type
expect: box metric | row display | box section | row label | box support | row micro
```

```proof
name: icons-centred
scenario: trial-active
open: dev?stage=icons
expect: icon male | icon walking | icon flame | icon check | icon bell | icon search
```

```proof
name: account-data-a-b-a-isolation
scenario: identity-lab-account-isolation
open: /dev
tap: Run A B A isolation
expect: Account data | Active account A | Legacy data Quarantined | Condition owner Account A | History Days 1 | Profile Account A | Saved Gym Gym A | Checkpoints A account-a/1/Account A/Gym A · B account-b/1/Account B/Gym B · A account-a/1/Account A/Gym A | Activity checkpoints A activity-a/11/110/1 · B activity-b/22/220/2 · A activity-a/11/110/1
```

```proof
name: cached-entitlement-retains-full-onboarding-path
scenario: reinstall-keychain
open: dev?lab=onboarding-path
expect: HACK your brain to hit your fitness goals | Get started | Sign in
then-open: /dev
then-expect: active | Onboarding path O01 O02 O03 O07 O04 O05 O06 O08 O22 O25 O10 O11 O12 O13 O14 O15 O16 O17 O18 O20 W0 W1 W2 W3 S1 S2 S3 S4 S5 S3b S3e S3c S3d P | Protected route mounts | None
```

## Gotchas
- Every proof also measures its final screen: text and icons inside buttons, rows and tiles must sit centred within 1 pt (1.5 pt for stacked content) or against an edge. Results land in `<proof>.centring.json`. When a screen deliberately breaks the rule, add `centring-ignore: <accessibility label> | ...` to the proof and say why in the feature file. `./excer sim centring` measures the current screen.
- `/dev` exists only in `__DEV__` builds. "Unmatched Route" means the app is not running a Metro dev bundle.
- The demo fakes are dev-only and live in the `dev-harness` package; the layer rules stop any product package from importing them.
