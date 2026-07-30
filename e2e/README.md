# ExcerLock Maestro simulator suite

> **Status: authored and statically validated; simulator execution is
> unverified.** The flows and runner were not executed on a simulator in this
> lane. On 2026-07-29 this machine had Maestro 2.6.1 and no `ExcerLock-E2E` simulator.
> The runner intentionally requires Maestro 2.7.0 or newer. No flow in this
> directory is described as green.

Read `HARNESS.md` for the test-fix loop and `scenario-schema.md` for the deep
link contract. Unknown scenario names still fail loudly on
`screen-e2e-error`; there is no fallback scenario.

## Coverage

Every flow declares exactly one bundled scenario in its `env` header. Small
state variants use the schema's URL-encoded merge patch, so this ticket stays
inside `e2e/` instead of editing the app's static scenario catalog.

| Surface | Flow | Scenario selection | State or feature exercised |
|---|---|---|---|
| Home | `smoke-home.yaml` | `baseline-fresh-install` + clock/balance patch | Walking, zero balance, shields down |
| Home | `home-condition-builder.yaml` | `baseline-fresh-install` | Build, configure, preview, and save a condition |
| Manage | `manage-condition.yaml` | `baseline-fresh-install` | Allowance change, weekly schedule, condition off/on |
| Analysis | `analysis-empty-history.yaml` | `baseline-fresh-install` | Empty history |
| Analysis | `analysis-recorded-history.yaml` | baseline + journal patch | Earned/spent totals, periods, breakdown, day ledger |
| Settings | `settings-account.yaml` | `baseline-fresh-install` | Grace persistence, signed out/in/out |
| Settings | `settings-notifications-support.yaml` | `baseline-fresh-install` | Notification opt-in, support, feature request and vote |
| Onboarding | `onboarding-premium.yaml` | baseline + fresh patch | Every onboarding rail screen, premium entitlement |
| Paywall | `paywall-free-tier.yaml` | baseline + fresh/free patch | Free plans, empty restore, monthly selection and purchase |
| Locked apps | `locked-apps-states.yaml` | baseline + drained-ledger patch | Shield selection, zero balance, active window, Full Lock |

Each functional checkpoint is followed by a named `takeScreenshot` capture.
Those captures have not been visually reviewed or blessed. There are no
approved baselines yet, so `visual-sweep.sh` is expected to report missing
baselines until Johan reviews first captures via the workflow in `HARNESS.md`.

## Static validation

These checks do not boot a simulator:

```bash
node --test e2e/tests/*.test.mjs
bash -n e2e/scripts/*.sh
ruby -e 'require "yaml"; ARGV.each { |path| YAML.load_stream(File.read(path)) }' e2e/flows/*.yaml
for flow in e2e/flows/*.yaml; do maestro check-syntax "$flow"; done
```

Static validation proves the file and runner contracts only. It does not prove
that selectors match a rendered iOS hierarchy, taps work, screenshots are
correct, or the suite passes on-device.

## Build under test

Use the `e2e` profile in `app/eas.json`. It is a release-style simulator build:
`ios.simulator: true`, `withoutCredentials: true`, and
`EXPO_PUBLIC_E2E=1`. It deliberately has no `developmentClient`; never point
Maestro at the expo-dev-client launcher.

From `app/`, authenticate with `eas login` (or set `EXPO_TOKEN`) and build:

```bash
cd app
EAS_LOCAL_BUILD_ARTIFACTS_DIR="$PWD/../e2e/out/build" \
  eas build --profile e2e --platform ios --local
cd ..
```

If EAS emits a `.tar.gz`, extract it under `e2e/out/build/` and locate the
contained `.app`. `APP_BINARY` below must be the absolute path to that
release-style simulator `.app`, not a development client.

## Pinned simulator session

The current harness pin is iPhone 17 Pro on the installed iOS 26.4 runtime.
Installing a different runtime is a deliberate re-pin and invalidates any
future visual baselines.

```bash
xcrun simctl create \
  "ExcerLock-E2E" \
  "com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro" \
  "com.apple.CoreSimulator.SimRuntime.iOS-26-4"

export E2E_UDID="$(
  xcrun simctl list devices --json |
    jq -r '.devices[][] | select(.name == "ExcerLock-E2E") | .udid' |
    head -n 1
)"
xcrun simctl boot "$E2E_UDID"
xcrun simctl bootstatus "$E2E_UDID" -b
open -a Simulator --args -CurrentDeviceUDID "$E2E_UDID"
xcrun simctl ui "$E2E_UDID" appearance light
xcrun simctl status_bar "$E2E_UDID" override \
  --time "9:41" --batteryState charged --batteryLevel 100 \
  --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4
xcrun simctl spawn "$E2E_UDID" \
  defaults write com.apple.Accessibility ReduceMotionEnabled 1
```

The Maestro iOS driver also needs an active macOS GUI login session. Confirm
`maestro --version` is at least 2.7.0 before running.

## Run

The runner installs `APP_BINARY` when supplied, verifies
`com.johansardar.excerlock` is installed, runs the selected scope, and writes
JUnit plus failure artifacts under `e2e/out/`.

```bash
APP_BINARY="/absolute/path/to/ExcerLock.app" E2E_UDID="$E2E_UDID" \
  e2e/scripts/run-suite.sh
```

Focused examples:

```bash
E2E_UDID="$E2E_UDID" e2e/scripts/run-suite.sh --tags analysis
APP_BINARY="/absolute/path/to/ExcerLock.app" E2E_UDID="$E2E_UDID" e2e/scripts/run-suite.sh --flow flows/locked-apps-states.yaml
```

After the functional suite is genuinely green, capture the visual pass:

```bash
E2E_UDID="$E2E_UDID" e2e/scripts/run-suite.sh --with-visual
e2e/scripts/visual-sweep.sh
```

Read `e2e/out/report.xml` first on failure, then the matching artifact bundle
under `e2e/out/artifacts/`. Do not bless missing or changed baselines merely to
silence the visual gate.

## CI requirements

A CI executor needs macOS with a logged-in GUI session, Xcode plus the pinned
iOS runtime, Java 17+, Maestro 2.7.0+, `jq`, EAS authentication, and either a
fresh `e2e` profile build or a trusted cached `.app`. CI must boot and pin the
simulator as above, run `run-suite.sh`, and retain `e2e/out/report.xml`,
`artifacts/`, and `debug/` even on failure.

## What remains unverified

- No release-style simulator build was produced or installed in this lane.
- No Maestro flow was driven against a simulator; all functional results are
  unknown until a human or CI performs the run above.
- No screenshots were inspected, approved, or promoted to baselines.
- The one-time iOS “Open in ExcerLock” confirmation guards and the nearly
  all-day active lock-window interaction have not been observed on the pinned
  runtime.
- Physical-device FamilyControls, motion, location, and background behavior
  remain outside this simulator suite, per `HARNESS.md`.
