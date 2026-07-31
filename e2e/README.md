# ExcerLock Maestro simulator suite

> **Status: simulator-verified.** On 2026-07-31, the Release configuration built
> with Xcode 26.4.1 (17E202) and ran on the pinned iOS 26.4 `ExcerLock-E2E`
> simulator with Maestro 2.7.0. The suite reported
> **10/10 Flows Passed in 6m 49s**; the runner returned exit code 0. Screenshots
> were captured but have not been visually reviewed,
> approved, or blessed.

Read `HARNESS.md` for the test-fix loop and `scenario-schema.md` for the deep
link contract. Unknown scenario names still fail loudly on
`screen-e2e-error`; there is no fallback scenario.

## Coverage

Every flow declares exactly one bundled scenario in its `env` header. Most
small state variants use the schema's URL-encoded merge patch. The locked-app
flow uses the named `balance-drain` scenario because its ledger must genuinely
reach zero at the pinned clock.

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
| Locked apps | `locked-apps-states.yaml` | `balance-drain` | Shield selection, zero balance, active window, Full Lock |

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

The verified result used a local Xcode Release build. The build-time gate must
come from `app/.env.local`, because Metro does not reliably re-evaluate
`EXPO_PUBLIC_*` values supplied only to a later shell command. Ensure that
gitignored file contains:

```dotenv
EXPO_PUBLIC_E2E=1
```

After exporting the pinned `E2E_UDID` from the next section, build from the
repository root:

```bash
cd app
npx expo prebuild --platform ios --clean --no-install
cd ios
pod install
find "$TMPDIR" -maxdepth 1 \
  \( -name 'metro-cache' -o -name 'metro-file-map-*' \) \
  -exec rm -rf {} +
EXPO_PUBLIC_E2E=1 xcodebuild \
  -workspace ExcerLock.xcworkspace \
  -scheme ExcerLock \
  -configuration Release \
  -sdk iphonesimulator \
  -destination "id=$E2E_UDID" \
  -derivedDataPath derivedData \
  CODE_SIGNING_ALLOWED=NO \
  build
export APP_BINARY="$PWD/derivedData/Build/Products/Release-iphonesimulator/ExcerLock.app"
cd ../..
```

Do not run the repository-root `npm test` between this build and the suite. Its
guardrail phase runs `expo prebuild --clean` and replaces the generated iOS
project; run those tests before this recipe, or rebuild afterward.

The `e2e` profile in `app/eas.json` remains release-style simulator
configuration (`ios.simulator: true`, `withoutCredentials: true`, and
`EXPO_PUBLIC_E2E=1`). It deliberately has no `developmentClient`; never point
Maestro at the expo-dev-client launcher. The 2026-07-31 result above used the
local Xcode recipe, not an EAS-produced artifact.

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
APP_BINARY="$PWD/app/ios/derivedData/Build/Products/Release-iphonesimulator/ExcerLock.app" E2E_UDID="$E2E_UDID" \
  e2e/scripts/run-suite.sh
```

Focused examples:

```bash
E2E_UDID="$E2E_UDID" e2e/scripts/run-suite.sh --tags analysis
APP_BINARY="$PWD/app/ios/derivedData/Build/Products/Release-iphonesimulator/ExcerLock.app" E2E_UDID="$E2E_UDID" e2e/scripts/run-suite.sh --flow flows/locked-apps-states.yaml
```

The functional suite is green; the visual review remains a separate pass:

```bash
E2E_UDID="$E2E_UDID" e2e/scripts/run-suite.sh --with-visual
e2e/scripts/visual-sweep.sh
```

Read `e2e/out/report.xml` first on failure, then the matching artifact bundle
under `e2e/out/artifacts/`. Do not bless missing or changed baselines merely to
silence the visual gate.

## CI requirements

A CI executor needs macOS with a logged-in GUI session, Xcode plus the pinned
iOS runtime, CocoaPods, Java 17+, Maestro 2.7.0+, `jq`, and either a fresh local
Release build, an authenticated EAS `e2e` build, or a trusted cached `.app`. CI
must boot and pin the simulator as above, run `run-suite.sh`, and retain
`e2e/out/report.xml`, `artifacts/`, and `debug/` even on failure.

## What remains unverified

- The captured screenshots were not visually reviewed, approved, or promoted
  to baselines, and `visual-sweep.sh` was not used as a release gate.
- An EAS-produced artifact was not exercised; the verified artifact came from
  the local Xcode Release recipe above.
- Physical-device FamilyControls, motion, location, and background behavior
  remain outside this simulator suite, per `HARNESS.md`.
