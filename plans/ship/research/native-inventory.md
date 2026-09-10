# ExcerLock — Native iOS capability inventory

Read-only audit. Date: 2026-09-09. Branch `rebuild/phase-1`.
Active app: `app-next/`. Legacy reference app: `app/`. Nothing was modified.

---

## 0. Headline

**The active app (`app-next/`) has almost no native surface. The old app (`app/`) has all of it.**

The rebuild deliberately reset to a fakes-only runtime. `app-next/src/runtime/createRuntime.ts:10`
throws `'Real runtime is unavailable in Phase 1'`, and `Runtime.kind` is the literal string `'fake'`
(`app-next/src/runtime/Runtime.ts:16`). Only three real native paths are wired: gym coordinates,
gait vision, and a `mailto:` support handoff (`app-next/src/runtime/createRuntime.ts:12-16`).

If `app-next` were archived and shipped today, the first binary would contain **zero** of:
Screen Time / Family Controls, App Groups, CoreMotion, HealthKit, background location, geofencing,
local notifications, purchases, crash reporting, or OTA updates.

**Second headline: the OTA strategy itself is not wired up.** `expo-updates` is not a dependency of
`app-next`, `updates.enabled` is `false`, there is no `runtimeVersion`, and there is no `eas.json`.
See §9 Tier 3.

---

## 1. Custom native modules and Expo config plugins

### 1a. In `app-next/` (the ACTIVE app) — 2 modules, 1 plugin

| Name | Path | What it bridges |
|---|---|---|
| `ExcerlockGaitVision` | `app-next/modules/excerlock-gait-vision/` | **AVFoundation + Vision** |
| `ExpoLocalSearch` | `app-next/modules/expo-local-search/` | **MapKit + CoreLocation + Contacts** |

**`ExcerlockGaitVision`** — on-device body-pose bridge for treadmill verification.
- Podspec frameworks: `app-next/modules/excerlock-gait-vision/ios/ExcerlockGaitVision.podspec:14`
  → `s.frameworks = 'AVFoundation', 'Vision'`; platform `:ios => '17.4'` (line 9); `static_framework = true` (line 11).
- Module surface: `app-next/modules/excerlock-gait-vision/ios/ExcerlockGaitVisionModule.swift:5-72`
  — `Name("ExcerlockGaitVision")`, `Events("onGaitSample")`, a native `View(GaitVisionPreviewView.self)`
  with an `active` prop, and async functions `start`, `stop`, `beginHarnessCapture`,
  `endHarnessCapture`, `deleteHarnessCaptures`.
- Implementation: `app-next/modules/excerlock-gait-vision/ios/GaitVisionService.swift` —
  `VNDetectHumanBodyPoseRequest` (line 20) and `VNDetectFaceRectanglesRequest` (line 21) running off an
  `AVCaptureSession` on two dedicated dispatch queues (lines 10-18); `AVAssetWriter` harness recorder
  (lines 24-26). Camera authorization is handled inside the module via
  `AVCaptureDevice.authorizationStatus(for: .video)` / `requestAccess` (lines 33-48).
- Preview layer: `app-next/modules/excerlock-gait-vision/ios/GaitVisionPreviewView.swift`.
- Autolink manifest: `app-next/modules/excerlock-gait-vision/expo-module.config.json`
  → `{"platforms":["apple"],"apple":{"modules":["ExcerlockGaitVisionModule"]}}`.
- **Config plugin**: `app-next/modules/excerlock-gait-vision/app.plugin.js:7-12` — a `withInfoPlist` mod
  that sets exactly one key, `NSCameraUsageDescription` = *"Allow ExcerLock to use the front camera to
  verify treadmill walking while the app is open."* (line 4). It does nothing else.
- JS surface: `app-next/modules/excerlock-gait-vision/src/ExcerlockGaitVisionModule.ts:5-14`,
  consumed at `app-next/src/runtime/NativeGait.tsx:11` via
  `requireOptionalNativeModule('ExcerlockGaitVision')`, gated to physical devices only
  (`app-next/src/runtime/createRuntime.ts:14` — `if (Constants.isDevice)`).
- Detection logic is pure JS: `app-next/src/features/unlock/gait/GaitPeriodicityDetector.ts`,
  `TreadmillScanController.ts`, fixture `real-walk-single.json`.

**`ExpoLocalSearch`** — Apple Maps place search for the gym picker.
- Podspec frameworks: `app-next/modules/expo-local-search/ios/ExpoLocalSearch.podspec:13`
  → `s.frameworks = 'MapKit', 'CoreLocation', 'Contacts'`; `:ios => '17.4'` (line 9); `swift_version 5.9` (line 14).
- Module surface: `app-next/modules/expo-local-search/ios/ExpoLocalSearchModule.swift:10-42` —
  `locationPermission()` (line 12), `suggest(query, lat?, lon?)` (line 20), `resolve(id, title, subtitle)`
  (line 23), `nearbyGyms(lat, lon)` (line 26), `reverseGeocode(lat, lon)` via `CLGeocoder` (lines 29-38),
  `currentLocation(requestPermission)` (line 39). All `.runOnQueue(.main)`.
- Location: `app-next/modules/expo-local-search/ios/PickerLocationService.swift` — a raw
  `CLLocationManager` (line 10) with `desiredAccuracy = kCLLocationAccuracyNearestTenMeters` (line 12),
  one-shot `requestLocation()` (line 18), 12-second timeout (line 22), and
  **`requestWhenInUseAuthorization()` only** (line 25).
  **There is no code path anywhere in `app-next` that can request Always authorization.**
- Search: `app-next/modules/expo-local-search/ios/PlaceSearchService.swift`.
- Autolink manifest: `app-next/modules/expo-local-search/expo-module.config.json`.
- **No config plugin.** It autolinks purely via `expo-module.config.json` + podspec; its location usage
  string comes from the `infoPlist` block in `app-next/app.json:15`. It is **not** listed in the
  `plugins` array — which is correct, but means nothing in the config declares its Info.plist needs.

Both modules are tracked in git (`git ls-files app-next/modules` returns 10 files).

### 1b. In `app/` (LEGACY reference) — 2 modules, 3 plugins, 3 extension targets

| Name | Path | What it bridges |
|---|---|---|
| `ExcerlockMotion` | `app/modules/excerlock-motion/` | **CoreMotion** |
| `ExcerlockGaitVision` | `app/modules/excerlock-gait-vision/` | AVFoundation + Vision (already ported to app-next) |

**`ExcerlockMotion`** — a deliberately "dumb sensor pipe" (design rationale in
`docs/research/swift-modules.md:15`: thresholds stay in JS so §8 knobs remain OTA-editable).
- Podspec: `app/modules/excerlock-motion/ios/ExcerlockMotion.podspec:14` → `s.frameworks = 'CoreMotion'`.
- Module surface: `app/modules/excerlock-motion/ios/ExcerlockMotionModule.swift:7-81` — events
  `onActivityChange`, `onCadence`, `onDeviceMotion` (line 12); functions `getAvailability` (14),
  `getAuthorizationStatus` (18), `requestAuthorization` (22), `start`/`stop` (28/39),
  `startDeviceMotion`/`stopDeviceMotion` (43/49), `queryActivity` (53), `querySteps` (65),
  `OnDestroy` teardown (77-80).
- Implementation: `app/modules/excerlock-motion/ios/CoreMotionService.swift` —
  `CMMotionActivityManager` (line 6), `CMMotionManager` (line 7), `CMPedometer` (line 8) on a serial
  `OperationQueue` (lines 9-15). `requestAuthorization` works by issuing a 1-second historical
  `queryActivityStarting` to trigger the OS prompt (lines 28-37). Live streams:
  `startActivityUpdates` (line 51) + `pedometer.startUpdates(from: Date())` (line 55).
  `startDeviceMotionUpdates` at `deviceMotionUpdateInterval = 0.1` (lines 84-89).
- **Config plugin**: `app/modules/excerlock-motion/app.plugin.js:7-12` — sets
  `NSMotionUsageDescription` = *"ExcerLock uses Motion & Fitness data to verify that you're walking
  during Walk & Scroll sessions."* (line 4).
- JS surface: `app/modules/excerlock-motion/src/ExcerlockMotionModule.ts:12-30`.
- Tests: `app/modules/excerlock-motion/__tests__/configPlugin.test.ts`, `moduleSurface.test.ts`.

**Config plugins in `app/plugins/`** (all three must be carried across):

1. **`app/plugins/withNoPush.js:5-9`** — `withEntitlementsPlist` mod that `delete`s `aps-environment`.
   Must be **index 0** of the plugins array: Expo applies entitlements mods in LIFO order, so being
   first means it runs *last* and strips whatever `expo-notifications` added
   (`app/plugins/README.md:3-6`). Enforced by `guardrails/plugin-order.test.ts:11-21`.

2. **`app/plugins/withHealthKitBackgroundBootstrap.js:121-126`** — composes three mods:
   - `withHealthKitEntitlements` (lines 22-28): sets `com.apple.developer.healthkit` = true and
     `com.apple.developer.healthkit.background-delivery` = true.
   - `withHealthKitAppDelegate` (lines 30-68): injects an `@_silgen_name` forward declaration
     (lines 11-14) and a `setupHealthKitBackgroundDelivery()` call (line 15) into the Swift AppDelegate,
     anchored on `import ReactAppDependencyProvider\n` (line 44) and
     `    let delegate = ReactNativeDelegate()` (line 55). **Throws** if the AppDelegate already
     contains `import ReactNativeHealthkit` (lines 37-41) — i.e. if the upstream plugin was not
     configured `background: false`.
   - `withHealthKitBridgeSource` (lines 70-113): copies `app/plugins/healthkit/HealthKitBackgroundBootstrap.mm`
     into the Xcode app target and appends three `HEADER_SEARCH_PATHS` entries (lines 16-20) so Nitro's
     private headers and the ReactNativeHealthkit Swift compatibility header resolve.
   - The bridge itself, `app/plugins/healthkit/HealthKitBackgroundBootstrap.mm:1-7`:
     ```objc
     #include <NitroModules/NitroModules-umbrella.h>
     #include <ReactNativeHealthkit/ReactNativeHealthkit-Swift-Cxx-Bridge.hpp>
     #import "ReactNativeHealthkit-Swift.h"

     extern "C" void ExcerLockSetupHealthKitBackgroundDelivery(void) {
       [[BackgroundDeliveryManager shared] setupBackgroundObservers];
     }
     ```
   - Result in the generated project: `app/ios/ExcerLock/AppDelegate.swift:5-6` (`@_silgen_name(...)`)
     and `:19` (the call), plus `app/ios/ExcerLock/HealthKitBackgroundBootstrap.mm`.
   - **Reason it exists**: Nitro's C++ umbrella cannot be imported into the Expo Swift application
     target; the Obj-C++ shim isolates it. Documented at `app/plugins/README.md:18-24`.

3. **`app/plugins/withScreenTimeExtensionValidation.js:134-145`** — a `withFinalizedMod(["ios", ...])`
   that runs after every other Xcode mutation. It:
   - `materializeMonitorSources` (lines 51-76): resolves the installed `react-native-device-activity`
     package and copies `targets/ActivityMonitorExtension/DeviceActivityMonitorExtension.swift` →
     `DeviceActivityMonitorExtension.generated.swift` and `ios/Shared.swift` →
     `PackageRuntime.generated.swift` (lines 20-33), injecting a
     `publishLockWindowShieldContext(activityName:)` hook (lines 35-49) — and **throws** if the
     upstream source no longer exposes the insertion point (lines 44-47).
   - `assertTarget` (lines 95-126) for each of three expected targets (lines 5-18): fails the build if
     the target is absent, has no build configurations, or lost its `PRODUCT_BUNDLE_IDENTIFIER`,
     `IPHONEOS_DEPLOYMENT_TARGET = 17.4`, `DEVELOPMENT_TEAM = AX3C2B78YD`, or a
     `*generated.entitlements` `CODE_SIGN_ENTITLEMENTS`.
   - Must be **last** in the plugins array (a validator runs after what it validates) —
     noted at `guardrails/location-config.test.ts:26-30`.

### 1c. Third-party native dependencies

`app-next/package.json` native-bearing deps: `expo` 57.0.20, `expo-build-properties`, `expo-constants`,
`expo-dev-client` 57.0.18, `expo-font`, `expo-haptics`, `expo-linear-gradient`, `expo-linking`,
`expo-router`, `expo-splash-screen`, `expo-status-bar`, `@react-native-async-storage/async-storage`,
`@react-native-community/datetimepicker`, `react-native-maps` 1.27.2, `react-native-gesture-handler`,
`react-native-reanimated` 4.5.1, `react-native-safe-area-context`, `react-native-screens`,
`react-native-svg`, `react-native-worklets`.

`app/package.json` adds, on top of a similar base:
`react-native-device-activity ^0.6.1`, `@kingstinct/react-native-healthkit 14.0.2` (exact, patched),
`expo-location ~57.0.7`, `expo-task-manager ~57.0.7`, `expo-notifications ~57.0.8`,
`expo-secure-store`, `expo-crypto`, `expo-device`, `expo-image-picker`, `expo-sharing`,
`expo-store-review`, `expo-symbols`, `expo-system-ui`, `expo-updates ~57.0.11`, `expo-web-browser`,
`expo-auth-session`, `expo-blur`, `expo-glass-effect`, `expo-image`, `@expo/ui`,
`react-native-adapty ^4.0.2`, `@sentry/react-native ~7.11.0`, `posthog-react-native ^4.61.2`,
`@clerk/clerk-expo ^2.19.31`, `react-native-view-shot`, `react-native-web`.

Patch: `app/patches/@kingstinct+react-native-healthkit+14.0.2.patch` — adds a `withAppDelegatePlugin`
to the vendor plugin that **early-returns when `props.background === false`**, which is precisely how
`app/app.json:52` disables the vendor's own Swift AppDelegate injection so the local Obj-C++ bridge can
take over. Requires `patch-package` in postinstall (P2-T03 names this).

---

## 2. `app.json` / `app.config.*` — full iOS surface, side by side

### 2a. `app-next/app.json` — VERBATIM (the active config; 53 lines total)

```json
{
  "expo": {
    "name": "ExcerLock",
    "slug": "excerlock",
    "owner": "johansardar",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "excerlock",
    "userInterfaceStyle": "light",
    "icon": "./assets/running-lock.png",
    "ios": {
      "bundleIdentifier": "com.johansardar.excerlock",
      "appleTeamId": "AX3C2B78YD",
      "supportsTablet": false,
      "infoPlist": { "NSLocationWhenInUseUsageDescription": "Use your location to find nearby gyms and choose your gym's arrival area." }
    },
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "plugins": [
      "./modules/excerlock-gait-vision/app.plugin.js",
      "react-native-maps",
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/running-lock.png",
          "imageWidth": 140,
          "backgroundColor": "#FFFFFF"
        }
      ],
      "expo-font",
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "17.4"
          }
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "9a358379-d939-4c56-bcea-de3ac5699be2"
      }
    },
    "updates": {
      "url": "https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2",
      "enabled": false
    }
  }
}
```

**`ios` block, itemized (`app-next/app.json:11-16`):**

| Key | Value |
|---|---|
| `bundleIdentifier` | `com.johansardar.excerlock` |
| `appleTeamId` | `AX3C2B78YD` |
| `supportsTablet` | `false` |
| `entitlements` | **ABSENT** |
| `infoPlist` | one key only: `NSLocationWhenInUseUsageDescription` = *"Use your location to find nearby gyms and choose your gym's arrival area."* |
| `UIBackgroundModes` | **ABSENT** |
| `associatedDomains` | **ABSENT** (grep across `app.json` + generated `Info.plist` + entitlements: zero hits) |
| `usesAppleSignIn` | **ABSENT** |

**`plugins` array in order (`app-next/app.json:21-42`):**

| # | Plugin | Options |
|---|---|---|
| 1 | `./modules/excerlock-gait-vision/app.plugin.js` | — (sets `NSCameraUsageDescription`) |
| 2 | `react-native-maps` | — |
| 3 | `expo-router` | — |
| 4 | `expo-splash-screen` | `{ image: "./assets/running-lock.png", imageWidth: 140, backgroundColor: "#FFFFFF" }` |
| 5 | `expo-font` | — |
| 6 | `expo-build-properties` | `{ ios: { deploymentTarget: "17.4" } }` |

There is **no `app-next/app.config.ts`** — the JSON is the entire config. There is **no `app-next/eas.json`**.

**Resulting generated `app-next/ios/ExcerLock/Info.plist` — every non-boilerplate key:**

| Key | Value |
|---|---|
| `CFBundleShortVersionString` | `1.0.0` |
| `CFBundleVersion` | `1` |
| `CFBundleURLSchemes` | `[excerlock, com.johansardar.excerlock]` and `[exp+excerlock]` |
| `NSAppTransportSecurity` | `NSAllowsArbitraryLoads: false`, `NSAllowsLocalNetworking: true` |
| `NSBonjourServices` | `[_expo._tcp]` (dev client) |
| **`NSCameraUsageDescription`** | *"Allow ExcerLock to use the front camera to verify treadmill walking while the app is open."* |
| `NSLocalNetworkUsageDescription` | *"Expo Dev Launcher uses the local network to discover and connect to development servers running on your computer."* |
| **`NSLocationWhenInUseUsageDescription`** | *"Use your location to find nearby gyms and choose your gym's arrival area."* |
| `NSUserActivityTypes` | `[$(PRODUCT_BUNDLE_IDENTIFIER).expo.index_route]` |
| `RCTNewArchEnabled` | `true` |
| `RCTMetroPort` | `$(RCT_METRO_PORT)` (dev client) |
| `UILaunchStoryboardName` | `SplashScreen` |
| `UIRequiredDeviceCapabilities` | `[arm64]` |
| `UISupportedInterfaceOrientations` | Portrait, PortraitUpsideDown |
| `UIUserInterfaceStyle` | `Light` |
| `LSMinimumSystemVersion` | `12.0` |
| `CADisableMinimumFrameDurationOnPhone` | `true` |
| **`UIBackgroundModes`** | **ABSENT** |

Only **two** usage-description strings exist. Six more exist in `app/` and are missing here.

### 2b. `app/app.json` — VERBATIM (the legacy config)

```json
{
  "expo": {
    "name": "ExcerLock",
    "slug": "excerlock",
    "version": "0.0.0",
    "orientation": "portrait",
    "scheme": "excerlock",
    "userInterfaceStyle": "automatic",
    "icon": "./assets/icon.png",
    "ios": {
      "appleTeamId": "AX3C2B78YD",
      "bundleIdentifier": "com.johansardar.excerlock",
      "supportsTablet": false
    },
    "android": {
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "static"
    },
    "plugins": [
      "./plugins/withNoPush",
      "expo-router",
      "expo-dev-client",
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-logo.png",
          "backgroundColor": "#F25A16",
          "imageWidth": 180,
          "resizeMode": "contain"
        }
      ],
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "17.4"
          }
        }
      ],
      [
        "react-native-device-activity",
        {
          "appGroup": "group.com.johansardar.excerlock",
          "copyToTargetFolder": false
        }
      ],
      [
        "@kingstinct/react-native-healthkit",
        {
          "background": false,
          "NSHealthShareUsageDescription": "ExcerLock reads your activity to detect completed fitness conditions on this device.",
          "NSHealthUpdateUsageDescription": false
        }
      ],
      "./plugins/withHealthKitBackgroundBootstrap",
      [
        "expo-location",
        {
          "isIosBackgroundLocationEnabled": true,
          "locationWhenInUsePermission": "Allow ExcerLock to check whether you are at a saved gym and keep a Walk Session active.",
          "locationAlwaysAndWhenInUsePermission": "Allow ExcerLock to detect arrivals at saved gyms when you opt into auto-detect."
        }
      ],
      "./modules/excerlock-motion/app.plugin.js",
      "./modules/excerlock-gait-vision/app.plugin.js",
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow ExcerLock to use a photo as a condition banner.",
          "cameraPermission": false,
          "microphonePermission": false
        }
      ],
      "expo-secure-store",
      [
        "@sentry/react-native",
        {
          "organization": "edge-ix",
          "project": "excerlock-mobile"
        }
      ],
      "react-native-adapty",
      "./plugins/withScreenTimeExtensionValidation"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "eas": {
        "projectId": "9a358379-d939-4c56-bcea-de3ac5699be2"
      }
    },
    "owner": "johansardar",
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2"
    }
  }
}
```

**`ios` block, itemized (`app/app.json:10-14`):** `appleTeamId: AX3C2B78YD`,
`bundleIdentifier: com.johansardar.excerlock`, `supportsTablet: false`. No `infoPlist` block and no
`entitlements` block — *everything* comes from the plugins, which is why plugin order is load-bearing.

**`plugins` array in order (`app/app.json:21-86`) — the canonical recipe:**

| # | Line | Plugin | Options | Native effect |
|---|---|---|---|---|
| 1 | 22 | `./plugins/withNoPush` | — | deletes `aps-environment`. MUST be first (LIFO) |
| 2 | 23 | `expo-router` | — | routing |
| 3 | 24 | `expo-dev-client` | — | dev launcher |
| 4 | 25-33 | `expo-splash-screen` | `{image, backgroundColor:"#F25A16", imageWidth:180, resizeMode:"contain"}` | splash |
| 5 | 34-41 | `expo-build-properties` | `{ios:{deploymentTarget:"17.4"}}` | min iOS |
| 6 | 42-48 | `react-native-device-activity` | `{appGroup:"group.com.johansardar.excerlock", copyToTargetFolder:false}` | **FamilyControls entitlement, App Group, generates the 3 appex targets** |
| 7 | 49-56 | `@kingstinct/react-native-healthkit` | `{background:false, NSHealthShareUsageDescription:"ExcerLock reads your activity to detect completed fitness conditions on this device.", NSHealthUpdateUsageDescription:false}` | HealthKit entitlement + share usage string; `background:false` suppresses its AppDelegate injection |
| 8 | 57 | `./plugins/withHealthKitBackgroundBootstrap` | — | **HealthKit background-delivery entitlement + silgen bridge** |
| 9 | 58-65 | `expo-location` | `{isIosBackgroundLocationEnabled:true, locationWhenInUsePermission:"Allow ExcerLock to check whether you are at a saved gym and keep a Walk Session active.", locationAlwaysAndWhenInUsePermission:"Allow ExcerLock to detect arrivals at saved gyms when you opt into auto-detect."}` | **`UIBackgroundModes: [fetch, location]`, both location usage strings** |
| 10 | 66 | `./modules/excerlock-motion/app.plugin.js` | — | `NSMotionUsageDescription` |
| 11 | 67 | `./modules/excerlock-gait-vision/app.plugin.js` | — | `NSCameraUsageDescription` |
| 12 | 68-75 | `expo-image-picker` | `{photosPermission:"Allow ExcerLock to use a photo as a condition banner.", cameraPermission:false, microphonePermission:false}` | `NSPhotoLibraryUsageDescription` |
| 13 | 76 | `expo-secure-store` | — | `NSFaceIDUsageDescription` |
| 14 | 77-83 | `@sentry/react-native` | `{organization:"edge-ix", project:"excerlock-mobile"}` | dSYM upload build phase |
| 15 | 84 | `react-native-adapty` | — | StoreKit / purchases |
| 16 | 85 | `./plugins/withScreenTimeExtensionValidation` | — | **validator; MUST be last** |

`runtimeVersion: { policy: "appVersion" }` (lines 92-94) and `updates.url` (lines 95-97), with
`updates.enabled` **not** set to false — i.e. OTA is live in the legacy app and dead in the new one.

**`app/app.config.ts:41-73`** wraps the JSON and injects runtime secrets read from `~/.excerlock/env`
or `process.env` (`CLIENT_ENV_NAMES` at lines 6-11: `EXPO_PUBLIC_ADAPTY_KEY`,
`EXPO_PUBLIC_POSTHOG_KEY`, `POSTHOG_HOST`, `SENTRY_DSN_MOBILE`) into
`extra.clientSubscription.adaptyKey` and `extra.clientObservability.{posthogApiKey, posthogHost, sentryDsn}`.
**`app-next` has no equivalent** — no mechanism exists to get vendor keys into the binary.

**Resulting generated `app/ios/ExcerLock/Info.plist` — every non-boilerplate key:**

| Key | Value |
|---|---|
| `NSCameraUsageDescription` | *"Allow ExcerLock to use the front camera to verify treadmill walking while the app is open."* |
| **`NSFaceIDUsageDescription`** | *"Allow $(PRODUCT_NAME) to access your Face ID biometric data."* |
| **`NSHealthShareUsageDescription`** | *"ExcerLock reads your activity to detect completed fitness conditions on this device."* |
| `NSLocalNetworkUsageDescription` | *"Expo Dev Launcher uses the local network…"* |
| **`NSLocationAlwaysAndWhenInUseUsageDescription`** | *"Allow ExcerLock to detect arrivals at saved gyms when you opt into auto-detect."* |
| **`NSLocationAlwaysUsageDescription`** | *"Allow $(PRODUCT_NAME) to access your location"* |
| `NSLocationWhenInUseUsageDescription` | *"Allow ExcerLock to check whether you are at a saved gym and keep a Walk Session active."* |
| **`NSMotionUsageDescription`** | *"ExcerLock uses Motion & Fitness data to verify that you're walking during Walk & Scroll sessions."* |
| **`NSPhotoLibraryUsageDescription`** | *"Allow ExcerLock to use a photo as a condition banner."* |
| **`REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP`** | `$(REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP)` |
| **`UIBackgroundModes`** | **`[fetch, location]`** |
| `NSUserActivityTypes` | `[$(PRODUCT_BUNDLE_IDENTIFIER).expo.index_route]` |
| `UIUserInterfaceStyle` | `Automatic` |
| `RCTNewArchEnabled` | `true` |
| `CFBundleShortVersionString` | `0.0.0` |
| `associatedDomains` / `applinks:` | **ABSENT** — neither app uses Universal Links |

**Delta table — Info.plist keys present in `app/` and MISSING from `app-next/`:**

| Missing key | Consequence if a later OTA bundle requests it |
|---|---|
| `NSMotionUsageDescription` | **Instant crash** on CoreMotion prompt |
| `NSHealthShareUsageDescription` | **Instant crash** on HealthKit prompt |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | **Instant crash** on Always prompt |
| `NSLocationAlwaysUsageDescription` | **Instant crash** on Always prompt |
| `NSFaceIDUsageDescription` | **Instant crash** on biometric gate |
| `NSPhotoLibraryUsageDescription` | **Instant crash** on photo picker |
| `REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP` | Screen Time bridge cannot find its app group |
| `UIBackgroundModes` | Geofences + background location silently never fire |

---

## 3. Entitlements files — every one, verbatim

Exhaustive `find` across the repo (excluding `node_modules` and `Pods`) returns exactly six
`.entitlements` files; one of them belongs to an unrelated mock app.

### 3a. `app-next/ios/ExcerLock/ExcerLock.entitlements` — **EMPTY**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict/>
</plist>
```

**No `com.apple.developer.family-controls`. No App Groups. No HealthKit. Nothing at all.**
This is the only entitlements file in the entire `app-next` tree.

### 3b. `app/ios/ExcerLock/ExcerLock.entitlements` — the main app

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.developer.family-controls</key>
    <true/>
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.background-delivery</key>
    <true/>
    <key>com.apple.security.application-groups</key>
    <array>
      <string>group.com.johansardar.excerlock</string>
    </array>
  </dict>
</plist>
```

**On the DEVELOPMENT vs DISTRIBUTION question for Family Controls:**
The entitlement key is `com.apple.developer.family-controls` set to boolean `true`. **This is the
single, unversioned key form** — Apple does not use distinct `…family-controls.development` /
`…family-controls.distribution` key names in the entitlements plist. The development-vs-distribution
split lives **outside the repo**, on the App ID / provisioning profile in App Store Connect:

- **Development**: the Family Controls capability can be self-enabled on the App ID and works in a
  development-signed build. This is what `app/` has been building against.
- **Distribution**: shipping to TestFlight/App Store requires a **separate Apple approval request**
  for the Family Controls (Distribution) capability, which Apple grants per-App-ID after review.

Nothing in the repo records whether that distribution approval has been obtained. **This is an
external, human-owned prerequisite that gates the entire product** and should be confirmed before
any first-binary plan is committed. `plans/rebuild/phase-2-backend/README.md` lists Johan-owned
prerequisites but does not mention Family Controls distribution approval — a gap worth raising.

`aps-environment` is deliberately **absent** (stripped by `withNoPush`); asserted by
`guardrails/plugin-order.test.ts:23-30`.

`applesignin` is **absent everywhere** — but `AuthPort.signInWithApple` already exists
(`app-next/src/ports/AuthPort.ts:5`) and `P2-T03` step 1 lists `expo-apple-authentication` as required.

### 3c. `app/targets/DeviceActivityMonitorExtension/generated.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.developer.family-controls</key>
    <true/>
    <key>com.apple.security.application-groups</key>
    <array>
      <string>group.com.johansardar.excerlock</string>
    </array>
  </dict>
</plist>
```

### 3d. `app/targets/ShieldConfiguration/generated.entitlements`

Byte-identical to 3c (family-controls + the same app group).

### 3e. `app/targets/ShieldAction/generated.entitlements`

Byte-identical to 3c (family-controls + the same app group).

### 3f. `excer-ui-mock/ios/ExcerLockUIMock/ExcerLockUIMock.entitlements`

Unrelated UI mock app; not part of the product.

### 3g. Summary matrix

| Entitlement | `app-next` main | `app` main | Monitor appex | ShieldConfig appex | ShieldAction appex |
|---|---|---|---|---|---|
| `com.apple.developer.family-controls` | **NO** | YES | YES | YES | YES |
| `com.apple.security.application-groups` | **NO** | YES (`group.com.johansardar.excerlock`) | YES | YES | YES |
| `com.apple.developer.healthkit` | **NO** | YES | — | — | — |
| `com.apple.developer.healthkit.background-delivery` | **NO** | YES | — | — | — |
| `aps-environment` | absent | **deliberately absent** | — | — | — |
| `com.apple.developer.applesignin` | absent | absent | — | — | — |
| `com.apple.developer.associated-domains` | absent | absent | — | — | — |

---

## 4. Native project checked in? App Extension targets?

### 4a. `ios/` is NOT checked into git for either app — Continuous Native Generation

| App | `git ls-files <app>/ios` | Ignored by |
|---|---|---|
| `app-next/` | **0 files** | `app-next/.gitignore` → `/ios` (under "generated native folders") |
| `app/` | **0 files** | root `.gitignore` → `app/ios/` (under "Expo generated state and native projects (Continuous Native Generation)") |

The `ios/` directories present on disk are **local prebuild output only**. Consequence: the entire
native surface is derived at prebuild time from `app.json` + the plugins array + `modules/` +
`targets/`. **That is exactly the lever for the "everything in the first binary" goal** — get the
config right once and prebuild produces the right binary; there is no hand-maintained Xcode project
to drift.

Root `.gitignore` also ignores `app/android/`, `app/.expo/`, `.expo/`, `dist/`, `build/`, `work/`,
`.claude/worktrees/`, `app-next/evidence/`.

### 4b. App Extension targets

**`app-next/ios/ExcerLock.xcodeproj` — ONE target, no extensions.**
```
productType = "com.apple.product-type.application"   × 1
PRODUCT_BUNDLE_IDENTIFIER = com.johansardar.excerlock
```
No app-extension product types at all.

**`app/ios/ExcerLock.xcodeproj` — FOUR targets: 1 app + 3 extensions.**
```
productType = "com.apple.product-type.application"    × 1
productType = "com.apple.product-type.app-extension"  × 3
```

| Target | Bundle ID | Extension point | Entitlements (`CODE_SIGN_ENTITLEMENTS`) | Source |
|---|---|---|---|---|
| `ExcerLock` (app) | `com.johansardar.excerlock` | — | `ExcerLock/ExcerLock.entitlements` | — |
| `DeviceActivityMonitorExtension` | `com.johansardar.excerlock.monitor` | `com.apple.deviceactivity.monitor-extension` (`app/targets/DeviceActivityMonitorExtension/Info.plist`) | `../targets/DeviceActivityMonitorExtension/generated.entitlements` | `app/targets/DeviceActivityMonitorExtension/` |
| `ShieldConfiguration` | `com.johansardar.excerlock.shield` | shield-configuration | `../targets/ShieldConfiguration/generated.entitlements` | `app/targets/ShieldConfiguration/` |
| `ShieldAction` | `com.johansardar.excerlock.shieldaction` | shield-action | `../targets/ShieldAction/generated.entitlements` | `app/targets/ShieldAction/` |

Target source contents:
- **`app/targets/DeviceActivityMonitorExtension/`** — `expo-target.config.js` (bundle ID, team
  `AX3C2B78YD`, deployment 17.4, name), `Info.plist` (with
  `NSExtensionPrincipalClass = $(PRODUCT_MODULE_NAME).DeviceActivityMonitorExtension` and
  `REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP`), `generated.entitlements`,
  `ShieldLockWindowContext.swift` (hand-written), plus two `.generated.swift` files materialized from
  the npm package at prebuild (`DeviceActivityMonitorExtension.generated.swift`,
  `PackageRuntime.generated.swift`).
- **`app/targets/ShieldConfiguration/`** — `ShieldConfigurationExtension.swift`, `ShieldContent.swift`,
  `ShieldContent.plist`, `ClayLockIcon.swift`, `ClayLockBody.png`, `ClayLockShackle.png`, `FOUNDRY.md`,
  `Info.plist`, `expo-target.config.js`, `generated.entitlements`.
- **`app/targets/ShieldAction/`** — `ShieldActionExtension.swift`, `ShieldDeepLinkNotification.swift`,
  `ShieldActionRoute.swift`, `Info.plist`, `expo-target.config.js`
  (`frameworks: ["ManagedSettings", "UserNotifications"]`), `generated.entitlements`.

**Extensions that do NOT exist anywhere in the repo:**
- Notification Service Extension — none.
- Notification Content Extension — none.
- WidgetKit widget / Live Activity (ActivityKit) — none.
- App Intents extension — `app/targets/app-intents/README.md` is a **placeholder contract only**
  ("no target is configured in Phase 0"); `guardrails/native-targets.json` lists it with
  `"status": "pending-phase-3"`.
- Watch app — explicitly out of scope (`excerlock-app-prd.md:354` lists "Apple Watch standalone app"
  under non-goals).

### 4c. Target contract file

`guardrails/native-targets.json` declares five target contracts:
`app` (required), `device-activity-monitor` (required), `shield-action` (required),
`shield-configuration` (required), `app-intents` (**pending-phase-3**). All with
`entitlementsRequired: true`.

### 4d. Build flavor of the current `app-next` prebuild

`app-next/ios/Podfile.lock` contains `expo-dev-client (57.0.18)`, `expo-dev-launcher (57.0.19)`,
`expo-dev-menu (57.0.18)`, `expo-dev-menu-interface`. `app-next/ios/Podfile.properties.json` sets
`EX_DEV_CLIENT_NETWORK_INSPECTOR: "true"`. **The current native project is a development-client
build, not a release binary.**

Pods actually compiled into `app-next` today (native-capability-bearing only):
`ExcerlockGaitVision (1.0.0)`, `ExpoLocalSearch (1.0.0)`, `react-native-maps (1.27.2)`,
`ExpoHaptics`, `ExpoLinearGradient`, `ExpoLinking`, `ExpoFont`, `ExpoSplashScreen`, `ExpoSymbols`,
`ExpoGlassEffect`, `ExpoFileSystem`, `ExpoKeepAwake`, `RNCAsyncStorage`, `RNDateTimePicker`,
`RNGestureHandler`, `RNReanimated`, `RNScreens`, `RNSVG`, `RNWorklets`, `EXConstants`.
**`EXUpdates` is absent** (only `EXUpdatesInterface` + `EXManifests`, which ship with dev-client).
No device-activity, no HealthKit, no location, no notifications, no Adapty, no Sentry pods.

---

## 5. Background execution — exhaustive

### 5a. `app-next/` — NONE

| Mechanism | Present? |
|---|---|
| `UIBackgroundModes` | **absent from Info.plist entirely** |
| BGTaskScheduler / `BGTaskSchedulerPermittedIdentifiers` | **none** (grep across `app-next/src` + `ios/ExcerLock`: zero hits) |
| `expo-background-task` | not a dependency |
| `expo-task-manager` | not a dependency |
| `expo-location` background | not a dependency |
| Geofencing / `CLCircularRegion` / `startMonitoring` | **none** |
| Significant location change | **none** |
| CoreMotion background | **no CoreMotion at all** |

The only presence-detection mechanism in `app-next` is a **foreground-only polling loop**:
`app-next/src/runtime/ForegroundGym.ts:31-44` — a `setInterval(…, 3000)` that calls
`nativePlaceSearch.currentLocation()` every three seconds and derives inside/outside by comparing
against saved place radii (`ForegroundGym.ts:16`, using `distanceMetres` from
`app-next/src/features/gym-picker/geometry.ts`). The interval is started lazily when a subscriber
attaches (`begin()`, lines 31-44) and cleared when the last one detaches (`stop()`, lines 45-50).
**It stops the instant the app is backgrounded**, and `PickerLocationService.swift:25` only ever
requests When-In-Use, so it could not survive backgrounding even with a background mode set.

### 5b. `app/` — the full mechanism, and what must be ported

**`UIBackgroundModes` values (generated into `app/ios/ExcerLock/Info.plist`):**

| Value | Source | Purpose |
|---|---|---|
| `fetch` | `expo-location` plugin with `isIosBackgroundLocationEnabled: true` (`app/app.json:61`) | background app refresh |
| `location` | same | keeps location updates + geofence delivery alive when backgrounded |

**No `processing`, no `audio`, no `remote-notification`, no `bluetooth-*`.**

**BGTaskScheduler: none.** Grep for `BGTaskScheduler`, `BGAppRefresh`, `BGProcessing`,
`PermittedIdentifiers`, `expo-background-task`, `BackgroundFetch` across `app/src`,
`app/ios/ExcerLock` and `app-next/src` returns **zero hits**. There is no
`BGTaskSchedulerPermittedIdentifiers` array in either Info.plist. Background work is done entirely
through `expo-task-manager` + `expo-location` + the DeviceActivity extension.

**`expo-task-manager` task names and registration sites:**

| Task constant | Value | Defined at | Registered at |
|---|---|---|---|
| `GEOFENCE_TASK_NAME` | `"excerlock.gym-geofencing.v1"` | `app/src/signals/location/locationTaskNames.ts:1` | `app/src/signals/location/registerLocationTasks.ts:20-30` |
| `WALK_LOCATION_TASK_NAME` | `"excerlock.walk-location.v1"` | `app/src/signals/location/locationTaskNames.ts:2` | `app/src/signals/location/registerLocationTasks.ts:32-41` |

Both are defined at **module scope**, guarded by `TaskManager.isTaskDefined(...)`
(`registerLocationTasks.ts:20` and `:32`), and the module is imported as a **bare side-effect import
at the very top of the router root**: `app/app/_layout.tsx:6` →
`import "@/signals/location/registerLocationTasks";`. This placement is deliberate and load-bearing —
iOS relaunches the app into the background to deliver a geofence event, and the task must already be
defined by the time the JS bundle finishes evaluating. It is guarded by
`guardrails/location-config.test.ts:48` ("loads background task definitions from the application
entry bundle").

The shared task runtime is `locationTaskRuntime = new LocationTaskRuntime(new AsyncStorageGymVisitLog())`
(`registerLocationTasks.ts:16-18`); the geofence handler calls
`locationTaskRuntime.handleGeofencingTask(data)` (line 27), the walk handler calls
`handleLocationTask(data)` (line 37). Both swallow the error case rather than throwing
(lines 24-26, 34).

**Geofencing (`CLCircularRegion` under the hood):**
`app/src/signals/location/ExpoLocationClient.ts:136-150`
```ts
public async startGeofencing(regions: readonly GeofenceRegion[]): Promise<void> {
  await this.expo.startGeofencingAsync(
    GEOFENCE_TASK_NAME,
    regions.map((region) => ({
      identifier: region.id,
      latitude: region.latitude,
      longitude: region.longitude,
      radius: region.radiusMeters,
      notifyOnEnter: true,
      notifyOnExit: true,
    })),
  );
}
```
`expo-location`'s `startGeofencingAsync` maps directly onto `CLLocationManager.startMonitoring(for:)`
with `CLCircularRegion`. Teardown at `:152-154` (`stopGeofencingAsync`). Region bookkeeping in
`app/src/signals/location/NativeLocationProvider.ts:19,41,91-116` (`monitoredRegions` map).
Radius comes from each saved place's `radiusMeters` (50–200 m, chosen in the picker) per
`plans/rebuild/phase-2-backend/P2-T05-signals-behind-ports.md` §3. iOS caps monitored regions at 20;
the product caps saved gyms at 5.

**Background location updates:**
`app/src/signals/location/ExpoLocationClient.ts:156-164`
```ts
await this.expo.startLocationUpdatesAsync(WALK_LOCATION_TASK_NAME, {
  accuracy: this.expo.Accuracy.High,
  activityType: this.expo.ActivityType.Fitness,
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
});
```
Teardown at `:166-169`. State rehydrated on boot via `hasStartedLocationUpdatesAsync`
(`:79`, `:86`). Authorization scope is resolved by preferring background/Always over foreground
(`:81-85`), with separate `requestForegroundAuthorization` (`:93-99`) and
`requestBackgroundAuthorization` (`:101-107`) entry points.
**Product rule**: only `enableAutoDetect` may request Always
(`P2-T05` acceptance: "Only `enableAutoDetect` requests Always location (grep + test)").

**No significant-location-change API** (`startMonitoringSignificantLocationChanges`) anywhere.

**CoreMotion and backgrounding — it does NOT survive:**
`app/modules/excerlock-motion/ios/CoreMotionService.swift:51-58` starts
`activityManager.startActivityUpdates(to:)` and `pedometer.startUpdates(from: Date())` on a
user-initiated `OperationQueue` (lines 9-15). There is **no `motion` background mode** (iOS does not
offer one) and no background-task assertion around it. Live cadence therefore only streams while the
app is foregrounded. The historical path is the workaround: `querySteps(fromMs, toMs)`
(`ExcerlockMotionModule.swift:65`) and `queryActivity` (`:53`) re-read the OS's stored pedometer data
on foreground and at midnight. `P2-T05` §1 states this explicitly: *"the extension cannot read
pedometer; document this limitation … the app checks on launch"*. Keep-alive during a walking
session is provided by **foreground location**, not motion (`P2-T05` §2).

**OS-driven wakeup that does survive**: the DeviceActivityMonitor extension. DeviceActivity schedules
registered by `react-native-device-activity` wake the `.appex` at interval start/end, which is how
shields re-apply and lift with the app killed. Per `P2-T04` audit amendments, the extension itself
performs **no arithmetic** — the app reconfigures the monitors' action lists whenever it runs, and the
app-group payload is `{schemaVersion, shieldsDesired, unlockUntil, leaseUntil, watermark, entitled,
planHash, shieldContentByMonitor}`. Monitor budget `LOCK_WINDOW_BUDGET = 16`, merged non-repeating
absolute intervals.

---

## 6. Notifications

### 6a. `app-next/` — NONE

`expo-notifications` is not in `app-next/package.json`, not in `app-next/ios/Podfile.lock`, and there
is no notification code in `app-next/src`. `NotificationsPort`
(`app-next/src/ports/NotificationsPort.ts:1-8`: `status()`, `request()`, `scheduleTrialReminder(at)`,
`scheduleWalkLeaseWarning(at)`, `cancel(id)`) is served only by
`app-next/src/demo/fakes/NotificationsFake.ts`.

### 6b. `app/` — local-only, by product law

**Push is deliberately stripped. There is no push anywhere in this product.**

- `app/plugins/withNoPush.js:5-9` deletes `aps-environment` from the entitlements plist. It is
  **index 0** of the plugins array (`app/app.json:22`) so that, under Expo's LIFO entitlements
  ordering, it runs *after* `expo-notifications` has added its automatic native configuration
  (`app/plugins/README.md:3-6`).
- Two guardrails enforce it: `guardrails/plugin-order.test.ts:11-21` ("keeps withNoPush first in the
  app config", with the failure message *"withNoPush must remain first because Expo config plugins
  apply in LIFO order"*) and `:23-30` ("keeps the clean-prebuild host app free of remote-push
  entitlement", asserting the generated entitlements file does **not** contain `aps-environment`).
- **No push-token registration exists anywhere in the repo**: grep for `getExpoPushTokenAsync`,
  `getDevicePushTokenAsync`, `registerForRemoteNotifications` returns zero hits.
- `docs`/decision B14: only two local notifications; B30 amends this to three ids.

**Permission request site — exactly one, and it is opt-in:**
`app/src/notifications/native/ExpoNotificationModule.ts:52-59`
```ts
public async requestAuthorization(): Promise<NotificationAuthorizationStatus> {
  const permissions = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return authorizationStatus(permissions);
}
```
Note `allowBadge: false` — no badge permission is ever requested.
Read-only status checks: `:48` (`getPermissionsAsync`), plus
`app/src/notifications/walkLeaseWarning.ts:18` and
`app/src/shield/native/notificationRouteHomeSource.ts:42`.
Product rule (`P2-T09` step 4): the prompt may only be raised from onboarding T3 ("Enable reminders")
and Settings › Permissions — never elsewhere.

**Presentation handler:** `app/src/notifications/native/configureNotificationPresentation.ts:3-11`
```ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
```
Invoked from the `ExpoNotificationModule` constructor
(`app/src/notifications/native/ExpoNotificationModule.ts:41`).

**Notification categories: NONE.** Grep for `setNotificationCategoryAsync` / `NotificationCategory`
returns zero hits. No action buttons; the ShieldAction extension routes via deep link instead.

**Local scheduling — the walk-lease warning** (`app/src/notifications/walkLeaseWarning.ts`):
- id `"excerlock.walk-lease-warning.v1"` (line 3-4), lead time `30_000` ms (line 5).
- `schedule(leaseEndsAtMs)` (lines 16-34): cancels first, checks permission, then
  `scheduleNotificationAsync` with a `DATE` trigger at `leaseEndsAtMs - 30s`, title *"Your walk check
  is almost due"*, body *"Pick up your phone to keep apps open, or return to ExcerLock for a quick
  scan."*, `sound: "default"`.
- Permission gate (lines 43-56) treats `AUTHORIZED`, `PROVISIONAL` and `EPHEMERAL` as approved.
- Comment at line 12: *"Operational session warning; it never prompts or appears in Settings."*

**Deterministic-id scheduler** (`ExpoNotificationModule.ts:63-82`): validates, dedupes against the
already-scheduled set (`scheduledNotificationsEqual`), schedules, and persists to a rehydrated
delivery-evidence store (`createNativeNotificationPersistence`, line 44; `rehydrate()`, line 45).
`cancel(id)` at `:84-90`.

**Extension-emitted notification:** `app/targets/ShieldAction/ShieldDeepLinkNotification.swift:18`
posts a `UNUserNotificationCenter.current().add(request)` as a workaround for opening the app from a
shield button. `app/targets/DeviceActivityMonitorExtension/PackageRuntime.generated.swift:242-372`
also manipulates `UNUserNotificationCenter`. This is why `ShieldAction/expo-target.config.js`
declares `frameworks: ["ManagedSettings", "UserNotifications"]`.

**Response routing:** `app/src/notifications/native/ExpoShieldNotificationResponseSource.ts` and
`app/src/shield/native/notificationRouteHomeSource.ts`; hosted at `app/app/_layout.tsx:10`
(`NativeShieldNotificationResponseHost`).

**Planned catalog (three ids, decision B30 amending B14)** per `P2-T09`:
trial reminder → Settings › Subscription; walk-lease warning → Home with the walking sheet;
`excerlock.shield.open` (emittable only by the ShieldAction extension) → `app/locked-apps.tsx`.
A catalog test asserts exactly three exist.

---

## 7. Camera / ML

`app-next` **has** this, and it is the one substantive native capability already compiled in.

- `AVCaptureSession` on the front camera, driven by
  `app-next/modules/excerlock-gait-vision/ios/GaitVisionService.swift`.
- Vision requests: `VNDetectHumanBodyPoseRequest` (line 20) and `VNDetectFaceRectanglesRequest`
  (line 21) — Apple's built-in requests.
- Two dedicated queues (session + analysis) at `.userInitiated` (lines 10-18); `NSLock`-guarded state.
- Native preview view: `GaitVisionPreviewView.swift`, exposed as an Expo `View` with an `active` prop
  (`ExcerlockGaitVisionModule.swift:12-16`).
- Harness recording: `AVAssetWriter` + `AVAssetWriterInput` (lines 24-26), surfaced as
  `beginHarnessCapture` / `endHarnessCapture` / `deleteHarnessCaptures`.
- Camera permission handled inside the module (`GaitVisionService.swift:33-48`).
- Usage string set by the module's own config plugin (`app.plugin.js:9`), landing in
  `app-next/ios/ExcerLock/Info.plist` as `NSCameraUsageDescription`.

**No CoreML model files anywhere in the repo** (`find -name "*.mlmodel*"` → none). Vision's built-in
body-pose request only — no custom model, so no model-file shipping problem.

**No `expo-camera`**, no `react-native-vision-camera`, no frame processors in either app.
`P2-T03` step 2 explicitly notes: *"`expo-camera` only if the gait module requires it (it uses
AVFoundation directly; check its podspec)"* — the podspec confirms it does not.

`expo-image-picker` exists in `app/` only (condition banner photos), contributing
`NSPhotoLibraryUsageDescription` with `cameraPermission: false`, `microphonePermission: false`.

Fixture tooling: `tools/gait-fixture-extractor/extract.swift` (repo root, outside both apps).

---

## 8. HealthKit

### 8a. `app-next/` — NONE

No dependency, no pod, no entitlement, no usage string, no Swift. `HealthPort`
(`app-next/src/ports/HealthPort.ts:3-7`: `authorizationStatus()`, `request()`,
`workoutsToday(kind: 'running' | 'biking')`) is served only by
`app-next/src/demo/fakes/HealthFake.ts`.

### 8b. `app/` — full read-only integration with background delivery

- Package: `@kingstinct/react-native-healthkit` pinned to **exactly `14.0.2`**
  (`app/package.json`), with `app/patches/@kingstinct+react-native-healthkit+14.0.2.patch` applied.
- Plugin config (`app/app.json:49-56`): `background: false` (suppresses the vendor's AppDelegate
  injection), `NSHealthShareUsageDescription` set, `NSHealthUpdateUsageDescription: false`
  (**read-only** — the app never writes to Health).
- Entitlements added by the local plugin: `com.apple.developer.healthkit` and
  `com.apple.developer.healthkit.background-delivery`
  (`app/plugins/withHealthKitBackgroundBootstrap.js:24-25`).
- Cold-launch background-delivery bootstrap: `@_silgen_name` declaration + call in the Swift
  AppDelegate (`app/ios/ExcerLock/AppDelegate.swift:5-6,19`) resolving to the Obj-C++ shim
  `app/plugins/healthkit/HealthKitBackgroundBootstrap.mm:5-7`, which calls
  `[[BackgroundDeliveryManager shared] setupBackgroundObservers]`.
- Guardrail: `guardrails/app-delegate.test.ts` — *"requires setupBackgroundObservers after HealthKit
  is installed"*; `guardrails/prebuild-survival.test.ts` — *"keeps HealthKit background startup
  compatible with the Expo Swift app target"*.
- Read model (`P2-T05` §4): `workoutsToday('running' | 'biking')` sums duration and distance from
  **device-recorded** workouts started today; manual entries excluded. Audit amendment requires
  `Workout.source` on the return so the contract test *"a manually entered workout never counts"*
  can pass.
- Adapter code lives at `app/src/signals/health/` (`KingstinctHealthKitClient`).
- Research: `docs/research/healthkit-coverage.md`.
- Product rationale (`excerlock-app-prd.md:94`): reading through Apple Health is the one integration
  that surfaces Apple Watch plus Nike Run Club, Strava, Peloton, Runkeeper, Coros, Polar, Whoop, Oura
  and Garmin, with no per-app OAuth.
- Decision B11: HealthKit is **not** used for steps — steps come from CoreMotion.

---

## 9. Native capabilities that must be in the FIRST `app-next` binary or they can never be added over-the-air

This is the core deliverable. Three tiers by severity.

### TIER 1 — Absolute blockers. Impossible to add via OTA under any circumstances.

These require an **entitlement**, an **Info.plist key read at install time**, or a **separate binary
inside the bundle (`.appex`)**. No JavaScript bundle can introduce any of them.

| # | Capability | Requires | In `app-next` today | Working reference in `app/` |
|---|---|---|---|---|
| 1 | **Family Controls** (Screen Time authorization, `FamilyActivityPicker`) | Entitlement `com.apple.developer.family-controls` + Apple **distribution** approval on the App ID + `react-native-device-activity` pod + plugin | **NO** (entitlements file is an empty `<dict/>`) | `app/ios/ExcerLock/ExcerLock.entitlements`; plugin `app/app.json:42-48` |
| 2 | **ManagedSettings** (applying/clearing shields) | Comes with the Family Controls entitlement + the appex targets; `ManagedSettings` framework declared at `app/targets/ShieldAction/expo-target.config.js` | **NO** | `app/src/screentime/native/*`, `NativeShieldScheduler` |
| 3 | **DeviceActivity** (scheduled OS wakeups, usage thresholds) | Family Controls entitlement + the monitor `.appex` | **NO** | `react-native-device-activity` plugin; `app/targets/DeviceActivityMonitorExtension/` |
| 4 | **DeviceActivityMonitorExtension `.appex`** | Separate binary in the bundle, bundle ID `com.johansardar.excerlock.monitor`, extension point `com.apple.deviceactivity.monitor-extension` | **NO** (`app-next` pbxproj has 1 target, 0 extensions) | `app/targets/DeviceActivityMonitorExtension/` (`expo-target.config.js`, `Info.plist`, `generated.entitlements`, `ShieldLockWindowContext.swift`) |
| 5 | **ShieldConfiguration `.appex`** | Separate binary, bundle ID `com.johansardar.excerlock.shield` | **NO** | `app/targets/ShieldConfiguration/` (`ShieldConfigurationExtension.swift`, `ShieldContent.swift`, `ClayLockIcon.swift`, PNGs) |
| 6 | **ShieldAction `.appex`** | Separate binary, bundle ID `com.johansardar.excerlock.shieldaction`, `frameworks: ["ManagedSettings","UserNotifications"]` | **NO** | `app/targets/ShieldAction/` (`ShieldActionExtension.swift`, `ShieldDeepLinkNotification.swift`, `ShieldActionRoute.swift`) |
| 7 | **App Groups** (`group.com.johansardar.excerlock`) | Entitlement `com.apple.security.application-groups` on the app **and all three appex targets** + Info.plist key `REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP` | **NO** | `app/ios/ExcerLock/ExcerLock.entitlements`; all three `generated.entitlements`; `app/app.json:45` |
| 8 | **HealthKit** | Entitlement `com.apple.developer.healthkit` + `NSHealthShareUsageDescription` + `@kingstinct/react-native-healthkit@14.0.2` pod + patch | **NO** | `app/app.json:49-56`; `withHealthKitBackgroundBootstrap.js:24` |
| 9 | **HealthKit background delivery** | Entitlement `com.apple.developer.healthkit.background-delivery` **plus** the compiled `@_silgen_name` cold-launch bridge | **NO** | `withHealthKitBackgroundBootstrap.js:25,30-113`; `HealthKitBackgroundBootstrap.mm`; `app/ios/ExcerLock/AppDelegate.swift:5-6,19` |
| 10 | **Background modes `fetch` + `location`** | Info.plist `UIBackgroundModes` array, read by the OS at install | **NO** (key entirely absent) | `app/ios/ExcerLock/Info.plist`; produced by `expo-location` plugin `isIosBackgroundLocationEnabled: true` (`app/app.json:61`) |
| 11 | **Location — Always authorization** | Info.plist `NSLocationAlwaysAndWhenInUseUsageDescription` **and** `NSLocationAlwaysUsageDescription` | **NO** (only When-In-Use exists; `PickerLocationService.swift:25` can only call `requestWhenInUseAuthorization`) | `app/app.json:62-63` → `app/ios/ExcerLock/Info.plist` |
| 12 | **CoreMotion** (`NSMotionUsageDescription`) | Info.plist key + the `ExcerlockMotion` pod. Requesting without the string = **instant crash** | **NO** (module and string both absent) | `app/modules/excerlock-motion/` + `app.plugin.js:9` |
| 13 | **Face ID / biometric gate** (`NSFaceIDUsageDescription`) | Info.plist key (supplied by `expo-secure-store`) | **NO** | `app/app.json:76` → `app/ios/ExcerLock/Info.plist` |
| 14 | **Photo library** (`NSPhotoLibraryUsageDescription`) | Info.plist key + `expo-image-picker` | **NO** | `app/app.json:68-75` |
| 15 | **Sign in with Apple** | Entitlement `com.apple.developer.applesignin` + `expo-apple-authentication` | **NO** — **and absent from `app/` too** | none yet; required by `AuthPort.signInWithApple` (`app-next/src/ports/AuthPort.ts:5`) and named in `P2-T03` step 1 |
| 16 | **Push notifications** (`aps-environment`) | Entitlement. **Deliberately excluded by product law** — noting it because reversing that decision later is a native rebuild | **NO** (absent, but also un-stripped: `withNoPush` isn't installed either) | `app/plugins/withNoPush.js` (strips it); guardrail `plugin-order.test.ts:23-30` |
| 17 | **App Intents / Siri target** | A fourth `.appex` | **NO** | placeholder only: `app/targets/app-intents/README.md`; `guardrails/native-targets.json` `"status": "pending-phase-3"`; PRD `excerlock-app-prd.md:289,505` |
| 18 | **Alternate app icons** | `CFBundleAlternateIcons` compiled into Info.plist + `expo-alternate-app-icons` | **NO** — absent from `app/` too | PRD `excerlock-app-prd.md:564` puts it in "build one" |
| 19 | **Associated Domains / Universal Links** | Entitlement `com.apple.developer.associated-domains` + AASA file | **NO** — absent from both apps | none |
| 20 | **App Tracking Transparency** (`NSUserTrackingUsageDescription`) | Info.plist key + ATT framework | **NO** — absent from both apps (grep: zero hits repo-wide) | none. Only relevant if analytics ever needs IDFA; currently `NSPrivacyTracking: false` |
| 21 | **`PrivacyInfo.xcprivacy` declarations** | Compiled privacy manifest. `app-next`'s declares only UserDefaults / FileTimestamp / SystemBootTime and an **empty** `NSPrivacyCollectedDataTypes` | **Incomplete** | `app-next/ios/ExcerLock/PrivacyInfo.xcprivacy` must be regenerated once Health/location/motion/analytics are added — itself a rebuild |
| 22 | **Per-app language** (`CFBundleLocalizations`) | Info.plist array | **NO** | PRD `excerlock-app-prd.md:564` |

### TIER 2 — Native modules and pods. Technically shippable later, but only in a new binary; an OTA bundle calling them crashes or no-ops.

| # | Capability | Requires | In `app-next` today | Working reference in `app/` |
|---|---|---|---|---|
| 23 | Screen Time JS bridge | pod `react-native-device-activity ^0.6.1` + config plugin | **NO** | `app/app.json:42-48`; consumers in `app/src/screentime/`, `app/src/shield/` |
| 24 | CoreMotion module | local Expo Module `ExcerlockMotion` (Swift, CoreMotion framework) | **NO** | `app/modules/excerlock-motion/` — port wholesale |
| 25 | HealthKit client | pod + exact-version pin + `patch-package` postinstall | **NO** (no `patches/` dir, no postinstall) | `app/patches/@kingstinct+react-native-healthkit+14.0.2.patch` |
| 26 | `expo-location` | pod + plugin | **NO** | `app/app.json:58-65`; `app/src/signals/location/ExpoLocationClient.ts` |
| 27 | `expo-task-manager` | pod; tasks must be defined at module scope in the entry bundle | **NO** | `app/src/signals/location/registerLocationTasks.ts`; imported at `app/app/_layout.tsx:6` |
| 28 | Geofencing | `expo-location` + `expo-task-manager` + `UIBackgroundModes: location` | **NO** (substitute today is a 3s foreground poll, `ForegroundGym.ts:33`) | `ExpoLocationClient.ts:136-150`; `NativeLocationProvider.ts` |
| 29 | Local notifications | pod `expo-notifications` | **NO** | `app/src/notifications/**` |
| 30 | **`expo-updates` (OTA itself)** | pod + `updates.enabled: true` + `runtimeVersion` + EAS channel | **NO** — see Tier 3 | `app/package.json` (`expo-updates ~57.0.11`); `app/app.json:92-97`; `app/eas.json` |
| 31 | StoreKit / purchases (Adapty) | pod `react-native-adapty ^4.0.2` + plugin + `EXPO_PUBLIC_ADAPTY_KEY` reaching `extra` | **NO** (`SubscriptionScreen.tsx:30` just opens the App Store URL) | `app/app.json:84`; `app/app.config.ts:56-58` |
| 32 | Sentry native crash reporting | pod `@sentry/react-native` + plugin (dSYM upload build phase) + DSN in `extra` | **NO** | `app/app.json:77-83`; `app/app.config.ts:60-62`; guardrail `client-observability.test.ts` |
| 33 | PostHog | pod `posthog-react-native` + key in `extra` | **NO** | `app/app.json`/`app.config.ts:60-62` |
| 34 | Supabase auth + secure storage | `expo-secure-store`, `expo-crypto`, `expo-apple-authentication`, `expo-auth-session`, `expo-web-browser` | **NO** | `app/app.json:76`; `app/package.json` |
| 35 | Device identity | `expo-device` | **NO** | `app/package.json` |
| 36 | App Store review prompt | `expo-store-review` | **NO** | `app/package.json`; PRD line 564 |
| 37 | Data export / share sheet | `expo-sharing`, `react-native-view-shot` | **NO** | `app/package.json` |
| 38 | **Config-secret injection mechanism** | an `app.config.ts` that reads `~/.excerlock/env` / `process.env` into `extra` | **NO** (`app-next` has only `app.json`) | `app/app.config.ts:1-73` |

### TIER 3 — The OTA strategy itself is not wired up. **This defeats the entire goal.**

Even if every capability above were compiled in tomorrow, the app **cannot receive an OTA update at
all** as currently configured:

| Fact | Evidence |
|---|---|
| `expo-updates` is **not a dependency** of `app-next` | `app-next/package.json` — absent. `app-next/ios/Podfile.lock` contains `EXUpdatesInterface` and `EXManifests` (which ship with `expo-dev-client`) but **no `EXUpdates` pod**. The `node_modules/expo-updates` at repo root exists only because `app/` depends on it. |
| Updates are **explicitly disabled** | `app-next/app.json:48-51` → `"updates": { "url": "…", "enabled": false }` |
| **No `runtimeVersion`** | `app-next/app.json` has no `runtimeVersion` key. `app/app.json:92-94` has `{ "policy": "appVersion" }`. Without one, updates cannot be matched to a binary. |
| **No `eas.json`** | `app-next/` has none; therefore no `channel` mapping for `preview` / `production`. Compare `app/eas.json` (profiles `development`, `e2e`, `preview` → channel `preview`, `production` → channel `production`). |
| Current prebuild is a **dev-client build, not a release binary** | `app-next/ios/Podfile.lock` contains `expo-dev-client`, `expo-dev-launcher`, `expo-dev-menu`; `Podfile.properties.json` sets `EX_DEV_CLIENT_NETWORK_INSPECTOR: "true"` |

**All four must be fixed in the first binary.** Installing `expo-updates`, enabling it, choosing a
runtime-version policy, and choosing an EAS channel are each native changes. Worse, **changing the
runtime-version policy after launch strands every installed copy** — an update published under a new
policy will never match an old binary. This is the single highest-leverage item in this report.

### 9d. Bonus: what is JS-only today and would be safe to iterate over the air

Once Tier 1–3 are compiled in, everything else genuinely is OTA-able, because the architecture was
built for it. `app-next/src/ports/` defines thirteen vendor-free interfaces
(`ScreenTimePort`, `StepsPort`, `WalkingPort`, `GaitPort`, `GymPort`, `HealthPort`, `AuthPort`,
`SubscriptionPort`, `AnalyticsPort`, `NotificationsPort`, `SyncPort`, `SupportPort`, `ClockPort`),
each with a fake in `app-next/src/demo/fakes/` and a single composition point at
`app-next/src/runtime/createRuntime.ts`. All product logic — the domain (`resolveLock`, windows, DST,
`applyProgress`, streaks), all copy in `src/content/`, all design tokens, the gait periodicity
detector, the walk verifier thresholds — is pure TypeScript. `docs/research/swift-modules.md:15`
records this as deliberate: the native layer is kept **threshold-free** so every tuning knob stays a
JS change.

---

## 10. Landmines in `app/`'s native setup that MUST be carried across

Ordered by how badly each one bites if missed.

1. **Plugin order is load-bearing in three places.** `withNoPush` must be **index 0** — Expo applies
   entitlements mods LIFO, so first-in-array means last-to-run, which is the only way it can delete
   the `aps-environment` that `expo-notifications` adds
   (`app/plugins/README.md:3-6`; `guardrails/plugin-order.test.ts:11-21`).
   `withScreenTimeExtensionValidation` must be **last** — a validator has to run after everything it
   validates (`guardrails/location-config.test.ts:26-30`).
   `withHealthKitBackgroundBootstrap` must come **immediately after**
   `@kingstinct/react-native-healthkit`. The full canonical order is written out in
   `plans/rebuild/phase-2-backend/P2-T03-port-native-engine.md` step 1.

2. **The HealthKit patch is mandatory and version-pinned.**
   `app/patches/@kingstinct+react-native-healthkit+14.0.2.patch` adds a `withAppDelegatePlugin` that
   **early-returns when `props.background === false`**. Without the patch, setting `background: false`
   does nothing, the vendor injects `import ReactNativeHealthkit` into the Swift AppDelegate, and
   `withHealthKitBackgroundBootstrap.js:37-41` **throws** with *"Set @kingstinct/react-native-healthkit
   background to false before applying the ExcerLock bootstrap"*. The version pin is **exact `14.0.2`**
   — a caret would break the patch. `app-next` has **no `patches/` directory and no `patch-package`
   postinstall**; both must be created.

3. **The `@_silgen_name` bridge is fragile in three ways at once.**
   `withHealthKitBackgroundBootstrap.js` string-matches two AppDelegate anchors —
   `import ReactAppDependencyProvider\n` (line 44) and `    let delegate = ReactNativeDelegate()`
   (line 55) — and throws if either moves. It also injects three `HEADER_SEARCH_PATHS` entries
   (lines 16-20) reaching into `$(PODS_ROOT)/Headers/Private/NitroModules` and the
   ReactNativeHealthkit Swift compatibility header. Any Expo SDK bump that reshapes the generated
   AppDelegate, or any Nitro/HealthKit layout change, breaks prebuild.
   **Note `app-next`'s AppDelegate already differs from `app`'s**: `app-next/ios/ExcerLock/AppDelegate.swift:1`
   is `internal import Expo` (SDK 57.0.20) whereas the anchors were written against `app`'s 57.0.8
   output — **verify both anchors still match before porting.**

4. **`withScreenTimeExtensionValidation` reaches into the npm package's source at prebuild time.**
   `materializeMonitorSources` (lines 51-76) resolves
   `react-native-device-activity/targets/ActivityMonitorExtension/DeviceActivityMonitorExtension.swift`
   and `ios/Shared.swift`, copies them into `targets/DeviceActivityMonitorExtension/*.generated.swift`,
   and **string-injects** a `publishLockWindowShieldContext(activityName:)` call at an exact
   `persistToUserDefaults(activityName:callbackName:"intervalDidStart")` insertion point (lines 39-48),
   throwing *"Screen Time monitor source no longer exposes the lock-window hook point"* if it moved.
   **Any `react-native-device-activity` version bump can break the build.** `P2-T03` step 2 says to
   check for a newer major — do that deliberately, not incidentally.

5. **All guardrails currently point at `app/`, not `app-next/`.**
   `guardrails/plugin-order.test.ts:12`, `guardrails/location-config.test.ts:18,25`,
   `guardrails/app-delegate.test.ts`, `guardrails/prebuild-survival.test.ts` and the rest all call
   `fromRoot("app", ...)` (helper at `guardrails/repo-files.ts:16-18`). **Nothing protects the active
   app today.** Re-point them as part of the port, or the first mistake in `app-next`'s native config
   ships silently. The suites to re-point (from `P2-T03`): `plugin-order`, `app-delegate`,
   `native-targets.json`, `rnda-imports`, `shield-content`, `motion-module`, `location-config`,
   `min-ios`, `prebuild-survival`, `phase3-production-callers`, `single-emitter`.

6. **Four identity constants are hard-coded in five places and must stay in lockstep:** app group
   `group.com.johansardar.excerlock`, team `AX3C2B78YD`, deployment target `17.4`, and the three
   extension bundle IDs (`…excerlock.monitor`, `…excerlock.shield`, `…excerlock.shieldaction`).
   They appear in `app/app.json`, each `targets/*/expo-target.config.js`, each
   `generated.entitlements`, `withScreenTimeExtensionValidation.js:5-18`, and
   `guardrails/native-targets.json`. `withScreenTimeExtensionValidation` fails the build on any
   mismatch — which is the good outcome; the bad outcome is changing one and not the validator.

7. **Family Controls DISTRIBUTION approval is an external, human-owned prerequisite** that nothing in
   the repo tracks. The entitlement key is the same for development and distribution; the difference
   is an Apple review of the App ID. `plans/rebuild/phase-2-backend/README.md`'s "Prerequisites Johan
   owns" list does **not** mention it. Without it there is no TestFlight and no App Store release,
   regardless of how correct the binary is. **Confirm this before committing to a first-binary date.**

8. **`expo-task-manager` tasks must be defined at module scope in the entry bundle.**
   `app/app/_layout.tsx:6` is a bare side-effect import
   (`import "@/signals/location/registerLocationTasks";`) placed above every component import. iOS
   relaunches the app into the background to deliver a geofence event, and the task must already be
   registered when the bundle finishes evaluating. Guarded by `guardrails/location-config.test.ts:48`.
   Easy to lose in a refactor; silent failure (geofences simply never fire).

9. **`react-native-device-activity` imports are fenced.** `guardrails/rnda-imports.test.ts` —
   *"allows RNDA imports only in ScreenTime native edges"*. Preserve the fence when moving
   `src/screentime/**` → `src/engine/screentime/`.

10. **`PrivacyInfo.xcprivacy` will need regenerating.** `app-next`'s current manifest declares only
    UserDefaults / FileTimestamp / SystemBootTime with an empty `NSPrivacyCollectedDataTypes`. Adding
    Health, location, motion, camera or analytics changes the required declarations — and getting it
    wrong is an App Store rejection, discovered late.

11. **`app-next` has no `app.config.ts`.** There is currently **no mechanism** to get
    `EXPO_PUBLIC_ADAPTY_KEY`, `EXPO_PUBLIC_POSTHOG_KEY`, `POSTHOG_HOST` or `SENTRY_DSN_MOBILE` into
    the binary. Port `app/app.config.ts:1-73` (reads `~/.excerlock/env`, falls back to `process.env`
    for EAS) or the vendor SDKs initialize with undefined keys.

12. **`app-next` has no `eas.json`.** No build profiles, no channels. Port `app/eas.json`
    (`development` / `e2e` / `preview` / `production`) and add the `expo-updates` channel wiring
    before the first release build.

13. **`app-next` still has `expo-dev-client` in its dependency list and its prebuild.** Fine for a
    dev build; make sure the release profile is what actually gets archived, and that
    `NSLocalNetworkUsageDescription` / `NSBonjourServices` / `RCTMetroPort` do not leak into the
    shipped Info.plist.

14. **`docs/research/familycontrols-on-simulator.md` (177 lines) records that FamilyControls
    authorization completes *silently* on the simulator.** A green simulator run proves nothing about
    enforcement — `P2-T11` is the physical-device checklist and exists for exactly this reason.
    Do not accept simulator evidence for any Tier 1 item.

---

## 11. Key file paths

- `/Users/johansardar/ExcerLock/app-next/app.json` — active config (ios 11-16, plugins 21-42, updates 48-51)
- `/Users/johansardar/ExcerLock/app-next/ios/ExcerLock/ExcerLock.entitlements` — empty `<dict/>`
- `/Users/johansardar/ExcerLock/app-next/ios/ExcerLock/Info.plist` — two usage strings, no `UIBackgroundModes`
- `/Users/johansardar/ExcerLock/app-next/ios/ExcerLock/PrivacyInfo.xcprivacy` — incomplete
- `/Users/johansardar/ExcerLock/app-next/src/runtime/createRuntime.ts` — fake-only runtime; line 10 throws on `'real'`
- `/Users/johansardar/ExcerLock/app-next/src/runtime/ForegroundGym.ts` — the 3s foreground poll standing in for geofencing
- `/Users/johansardar/ExcerLock/app-next/src/ports/README.md` — authoritative "what Phase 2 must add"
- `/Users/johansardar/ExcerLock/app-next/modules/excerlock-gait-vision/` — Vision module (already ported)
- `/Users/johansardar/ExcerLock/app-next/modules/expo-local-search/` — MapKit module (When-In-Use only)
- `/Users/johansardar/ExcerLock/app/app.json` — the full plugin/permission recipe to port
- `/Users/johansardar/ExcerLock/app/app.config.ts` — the secret-injection mechanism to port
- `/Users/johansardar/ExcerLock/app/eas.json` — build profiles / channels to port
- `/Users/johansardar/ExcerLock/app/ios/ExcerLock/ExcerLock.entitlements` — the four entitlements needed
- `/Users/johansardar/ExcerLock/app/ios/ExcerLock/Info.plist` — the eight usage strings + `UIBackgroundModes`
- `/Users/johansardar/ExcerLock/app/targets/` — the three `.appex` sources
- `/Users/johansardar/ExcerLock/app/plugins/` — the three config plugins + the Obj-C++ bridge
- `/Users/johansardar/ExcerLock/app/patches/@kingstinct+react-native-healthkit+14.0.2.patch` — mandatory patch
- `/Users/johansardar/ExcerLock/app/modules/excerlock-motion/` — CoreMotion module to port
- `/Users/johansardar/ExcerLock/app/src/signals/location/` — geofencing + background location + tasks
- `/Users/johansardar/ExcerLock/app/src/notifications/` — local notification stack
- `/Users/johansardar/ExcerLock/guardrails/native-targets.json` — target contract (`app-intents` pending)
- `/Users/johansardar/ExcerLock/guardrails/repo-files.ts:16-18` — `fromRoot`, the helper to re-point
- `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T03-port-native-engine.md` — the port manifest and canonical plugin order
- `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md` — Screen Time policy design
- `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T05-signals-behind-ports.md` — adapter designs
- `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T09-notifications.md` — the three notification ids
- `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T11-device-verification.md` — physical-device checklist
- `/Users/johansardar/ExcerLock/docs/research/familycontrols-on-simulator.md` — why simulator evidence is worthless here
