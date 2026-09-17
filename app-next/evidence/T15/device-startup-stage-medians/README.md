# Device startup stage medians (T15 / B10 / E2E-S1)

A real `xcrun xctrace` **device** recording of the app's B10 os_signpost startup
stages, parsed by `scripts/measure-startup.sh --trace/--xpath` through
`scripts/startup-stage-medians.cjs`. This is the first real xctrace export the
parser is validated against (before this, the XML shape was fixture-verified
only); it also closes the "whether a device recording would work is untested"
note in `app-next/e2e-next/README.md` finding 3 — it does.

**Device numbers, 11 cold launches, delegate-relative medians (ms):**

| Stage | step | cumulative | samples |
|---|---:|---:|---:|
| FirstReactRender | 200.485 | 200.485 | 11 |
| HydrationDone | 11.69 | 212.256 | 11 |
| RuntimeReady | 54.811 | 268.051 | 11 |
| BootGateRedirect | 1.245 | 269.404 | 11 |

`InteractiveHome` is absent: a fresh install boots into onboarding and never
reaches Home (the fixture gap `E2E-E1` records). Simulator comparison from
`E2E-S1` run `20260917T1810Z` (same parser, unified-log capture): cumulative
`BootGateRedirect` 44.031 ms — the device/simulator gap, listed for context
only.

**These are diagnostics, not the §6.2 budgets.** The numbers start at the app's
AppDelegate entry (not process launch or first frame), and the build is a
development-signed preview Release. ADR 0021/0033 keep the T15 budgets on a
signed distribution build measured on the target device. Provenance in
`build-info.json`.

## Provenance

* Device `Il` — iPhone 13 (iPhone14,5), iOS 26.2.1, unlocked for the run.
* Host Xcode 26.4.1 (23E254a), `xctrace 16.0 (17E202)`.
* Build `com.johansardar.excerlock` Release, `EXCERLOCK_ENV=preview`, embedded
  JS bundle, revision `3104ec02`, built 2026-09-17T19:47:36Z.
* Signing: `Apple Development: JOHAN AMIT SARDAR (9X6MMS8XMD)`, team
  `AX3C2B78YD`, profiles `ExcerLock Development` (main) and the four
  `ExcerLock {Monitor,Report,Shield,ShieldAction} Development` extension
  profiles. The project is checked in with automatic signing, which fails on
  this host (`No Accounts`; the pre-issued profiles also lacked the associated
  domains / push / Sign In with Apple / family-controls entitlements for a
  while). The device build sets `CODE_SIGN_STYLE = Manual` and a
  `PROVISIONING_PROFILE_SPECIFIER` per target in the generated
  `app-next/ios/ExcerLock.xcodeproj/project.pbxproj` (git-ignored, regenerated
  by prebuild) and drops `SENTRY_AUTH_TOKEN` like the simulator lane.

## Commands

```bash
# build (generated ios/ from the current sources already prebuilt + pods installed)
cd app-next && eval "$( …preview env exported from ~/.excerlock/env… )"
xcodebuild -workspace ios/ExcerLock.xcworkspace -scheme ExcerLock \
  -configuration Release -destination 'generic/platform=iOS' \
  -derivedDataPath ../e2e-next/build/device-scratch/DerivedData build

# install and record (20 cold launches; see the ring-buffer note)
xcrun devicectl device install app --device F4E839C0-3F05-5BF8-BA31-12949B2B83AB \
  DerivedData/Build/Products/Release-iphoneos/ExcerLock.app
bash e2e-next/build/device-scratch/device-run8.sh 20 120

# export and parse
bash scripts/measure-startup.sh --trace <device-b10g.trace> \
  --xpath '/trace-toc/run[@number="1"]/data/table[@schema="os-signpost"]' \
  --output <dir>
```

Recording notes worth keeping:

* `--instrument os_signpost` on the device works under the implicit Blank
  template (there is no `Points of Interest` template to select); the trace
  completes and exports normally, unlike the broken simulator tap.
* The device `os_signpost` stream has a startup and retention window: in a
  20-launch loop, the first ~9 launches (the screen waking up) retain no stage
  rows and the earliest captured launches eventually age out of the instrument
  buffer. Eleven of the 20 launches carried the full fresh-install stage set;
  their medians are above. The simulator lane has no such constraint (its
  unified log is durable), which is why `E2E-S1` reads it.
* The rows are `emitEvent` signposts; the legacy `DelegateToInteractiveHome`
  interval is also in the table and must not be read as the `InteractiveHome`
  stage.

## Files

| File | What it is |
|---|---|
| `signposts-stage-rows.xml` | Committable trim of the real export: the 176 stage/legacy rows of the 11 complete launches plus the 55 shared-string definitions the rows reference. Same rows, same refs, same formatted clocks as the 25 MB full export. |
| `stage-medians.json` | `startup-stage-medians.cjs` output on the full export. |
| `stage-medians-trimmed.json` | Parser output on `signposts-stage-rows.xml`; byte-identical numbers. |
| `diagnostic.json` | `measure-startup.sh` trace-path diagnostic. |
| `launches.log`, `recording.log` | The 20-launch log (devicectl latency) and the xctrace recorder log. |
| `build-info.json` | Machine-readable provenance and the budget boundary. |

The full `.trace` (21 MB) and the untrimmed 25 MB export stay local under
git-ignored `app-next/e2e-next/build/device-scratch/`.
