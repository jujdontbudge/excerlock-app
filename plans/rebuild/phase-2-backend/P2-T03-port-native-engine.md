# P2-T03 — Port the native engine, plugins, targets, harness and guardrails into `app-next`

Decision B12: everything built and tested moves, unchanged inside, re-wired outside.

## What moves (copy with `git mv`-style fidelity, keep tests, keep READMEs)

| From `app/` | To `app-next/` |
| --- | --- |
| `modules/excerlock-motion/**`, `modules/excerlock-gait-vision/**` | `modules/` (same names; `app.plugin.js` paths updated) |
| `plugins/withNoPush.js`, `withScreenTimeExtensionValidation.js`, `withHealthKitBackgroundBootstrap.js`, `plugins/healthkit/HealthKitBackgroundBootstrap.mm` | `plugins/` |
| `targets/DeviceActivityMonitorExtension`, `targets/ShieldAction`, `targets/ShieldConfiguration` (+ their FOUNDRY/README) | `targets/` (app group `group.com.johansardar.excerlock`, team `AX3C2B78YD`, iOS 17.4 unchanged) |
| `patches/@kingstinct+react-native-healthkit+14.0.2.patch` | `patches/` (+ `patch-package` postinstall) |
| `src/screentime/**` | `src/engine/screentime/` |
| `src/signals/{motion,gait,placement,location,health,timeline}/**` (+ fixtures) | `src/engine/signals/` (drop `signals/vendor`; drop `signals/screentime` if only the ledger used it) |
| `src/home/signals/walkingSessionController.ts`, `gymPresenceController.ts` and their tests | `src/engine/walking/`, `src/engine/gym/` |
| `src/shield/**` | `src/engine/shield/` |
| `src/harness/**`, `src/diagnostics/**`, `scripts/analyze-harness-run.js`, `tools/gait-fixture-extractor` | `src/harness/`, `src/diagnostics/`, `scripts/`, root `tools/` (unchanged location) |
| `src/e2e/**` scenario deep-link entry | `src/e2e/` reduced to deep-link → dev-menu scenario loader |
| `src/observability/**` | `src/observability/` |
| `guardrails/*.test.ts` relevant to the app (`plugin-order`, `app-delegate`, `native-targets.json`, `rnda-imports`, `shield-content`, `motion-module`, `location-config`, `min-ios`, `prebuild-survival`, `phase3-production-callers`, `single-emitter`) | `guardrails/` re-pointed at `app-next` |

## Steps

1. `app.json` plugin list in the load-bearing order: `./plugins/withNoPush` → `expo-router` → `expo-dev-client`
   → `expo-splash-screen` → `expo-build-properties` (17.4) → `react-native-device-activity` (appGroup,
   `copyToTargetFolder: false`) → `@kingstinct/react-native-healthkit` → `./plugins/withHealthKitBackgroundBootstrap`
   → `expo-location` (background) → `./modules/excerlock-motion/app.plugin.js` → `./modules/excerlock-gait-vision/app.plugin.js`
   → `expo-secure-store` → `expo-apple-authentication` → `@sentry/react-native` → `react-native-adapty` →
   `./plugins/withScreenTimeExtensionValidation` (last). Usage strings: Camera, Health share, Location
   When-in-use and Always, Motion. `UIBackgroundModes: fetch, location`. Entitlements: family-controls,
   healthkit, healthkit background delivery, app group, applesignin. **No `aps-environment`** (guardrail).
2. Dependencies via Expo MCP: `react-native-device-activity` (same major as old, check for newer),
   `@kingstinct/react-native-healthkit` **14.0.2 exact** with the patch, `expo-location`, `expo-task-manager`,
   `expo-camera` only if the gait module requires it (it uses AVFoundation directly; check its podspec).
3. Copy files, fix imports, make `npm run typecheck` and the moved tests green **before** any wiring.
4. Prebuild (`expo prebuild --platform ios --clean --no-install` then `pod-install`) must produce the three
   `.appex` targets and the entitlements; `withScreenTimeExtensionValidation` fails the build otherwise.
5. Harness: `HarnessBuildRoot` behind `EXPO_PUBLIC_TEST_HARNESS=1` in `app/_layout.tsx`, exactly as before.
6. Guardrails: root `npm run test:guardrails` runs against `app-next`; `phase3-production-callers` walks from
   `app-next/app/`.

## Acceptance

- [ ] All moved test suites pass unchanged (count them; list any test that needed editing and why).
- [ ] Clean prebuild produces `DeviceActivityMonitorExtension.appex`, `ShieldAction.appex`,
      `ShieldConfiguration.appex`; guardrails green.
- [ ] Simulator dev-client build launches; FamilyControls authorization completes (silently on simulator, as
      measured 2026-08-04); harness root boots with the env flag.
- [ ] `~/ios-app-pitfalls/PITFALLS.md` consulted for Screen Time / HealthKit / Expo prebuild entries before
      debugging; any new cross-app pitfall logged with the `log-pitfall` skill.

## Audit amendments (2026-09-07; see `fix-plan.md`)

- Also move `GeofenceEventProcessor`, `GymVisitLog`, `AsyncStorageGymVisitLog`, `LocationTaskRuntime` and
  `registerLocationTasks` into `src/engine/signals/location/`; `GymVisitLog` gains `open(regionId, atMs)` /
  `close(regionId, atMs)` so a confirmed exit closes the interval (P2-T15 §3).
- Copy the three lease functions of `packages/ledger/src/walk.ts` into `src/domain/sessions/lease.ts` with
  attribution (P2-T15 §2); do not import the package.
- `NativeShieldScheduler` is adapted to take a `MonitorPlan` (P2-T14 §2) instead of `DesiredOsState`; keep
  its fail-closed ordering and the `configureLockWindowStart` action-reconfiguration pattern verbatim.
- Camera usage string and the gait-vision module are required for the propped scan; the app records the camera
  permission status (P2-T21 §4). `NSCameraUsageDescription` is already in `app.json`; keep it when the plugin
  list is rewritten. **`NativeGait.permission()` must stop probing by `start()`/`stop()`** and read
  `AVCaptureDevice.authorizationStatus(for: .video)` instead: the ceremony now calls it before every scan, so
  the probe flashes the preview, and it can only return `granted` or `denied` when the port's contract is the
  full `PermissionStatus` (`notDetermined` has to prompt, `restricted` has to be honoured as denied).
