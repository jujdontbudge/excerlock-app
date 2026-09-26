# TestFlight 1.0.0 (12) — 2026-09-25

First binary from the rebuilt codebase. Uploaded to TestFlight only: it is not attached to
the App Store version and not submitted for review. Version 1.0 remains `WAITING_FOR_REVIEW`
with Build 11 (`358f7a17`) attached.

## Candidate identity

- Exact archived source: `c860601a` on `main` (the rebuild, the Build 11 HealthKit removal
  merged as `baa440f4`, and the server hotfix merged as `bfa37bee`).
- App `6787265352`; bundle `com.johansardar.excerlock`; team `AX3C2B78YD`.
- Marketing version `1.0.0`; build `12`; runtime `4`; channel `production`; `EXCERLOCK_ENV=prod`.
- Runtime moves 3 → 4 because the Expo SDK 57 patch updates change native iOS code
  (docs/ota.md "Bumping runtimeVersion"). Runtime-3 JS must never be published to this binary,
  and runtime-4 JS never reaches Build 10 or 11.

## What changed since Build 11

- Paywall after a lapse: a trial that ends while the app is open shows the in-app placement
  once; the win-back placement is only for a subscription that ran out while the app was closed.
- Gym presence confirms after one 30 s constant (`PRESENCE_CONFIRM_MS`), not 10 s.
- Analytics: restore_started/succeeded/failed, purchase_failed, condition_created/edited/deleted.
- 25 Expo SDK 57 packages aligned to their expected patch versions.
- Codebase rebuilt into `src/packages/` layers with `./excer` verification (ADRs 0044–0047).

## Verification

- `./excer check --full`: 23 checks passed on the merged tree.
- `./excer server smoke`: passed on the merged tree.
- Simulator: all 27 feature proofs passed on a fresh runtime-4 Debug build of `b6e41a62`.
  The later merges changed native config (HealthKit removal) and no JS the proofs exercise.
- Prebuild: `verify-binary.sh --prebuild-only` passed; no HealthKit in entitlements or Info.plist.
- Distribution: `verify-binary.sh --distribution` passed for the main app and four extensions,
  including "main signature carries every §1 entitlement and no HealthKit".
- IPA readback: `1.0.0 (12)`, runtime `4`, channel `production`, no HealthKit.framework
  linkage, no `NSHealth*` keys, no demo scenarios in `main.jsbundle`.
- Not verified: a sandbox purchase and a real-device run of this binary.

## Apple artifact

- Archive `app-next/build/tf/ExcerLock-1.0.0-12.xcarchive`; IPA `ExcerLock-1.0.0-12.ipa`,
  SHA-256 `29df85f7852212b152a516fb51280212731860f3d5901f0431794bb83df0c541` (untracked).
- Apple build `838a2474-8417-4e07-a37f-823887f36293`, `VALID`, `APP_STORE_ELIGIBLE`,
  `usesNonExemptEncryption: false`. What to Test notes added (en-US).
- Uploaded with `asc publish testflight --upload-only --wait` under `scripts/agent-ops.py run`.

## Server

`main` `bfa37bee` was deployed to `api.excerlock.com` the same day (same 11 migrations, Caddy and
systemd unchanged). Public `/v1/health` and `/v1/ready` returned 200.
