# 02 — Binary #1 native manifest (B50)

Exhaustive. Every row is something that **cannot be added by an OTA update**. `app-next` has none of it today
(`research/native-inventory.md` §9). Reference implementations live in `app/` unless marked new.

## 1. The manifest

| # | Capability | Mechanism | Reference in `app/` | New? |
| --- | --- | --- | --- | --- |
| 1 | Family Controls | entitlement `com.apple.developer.family-controls` on app + 4 appex; `react-native-device-activity` | `ios/ExcerLock/ExcerLock.entitlements`, `targets/*/generated.entitlements` | |
| 2 | ManagedSettings shields | via #1 | `src/screentime/native/*` | |
| 3 | DeviceActivity monitors | via #1 + monitor appex | `targets/DeviceActivityMonitorExtension/` | |
| 4 | `.monitor` appex | `com.johansardar.excerlock.monitor` | same | |
| 5 | `.shield` appex (ShieldConfiguration) | `com.johansardar.excerlock.shield` | `targets/ShieldConfiguration/` | |
| 6 | `.shieldaction` appex | `com.johansardar.excerlock.shieldaction`, frameworks ManagedSettings + UserNotifications | `targets/ShieldAction/` | |
| 7 | `.report` appex (DeviceActivityReport) | `com.johansardar.excerlock.report`; display-only, cannot share data back | bundle ID exists in ASC; target is **new** | new |
| 8 | App Groups | `group.com.johansardar.excerlock` on app + all appex; `REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP` | all entitlements files | |
| 9 | CoreMotion | `NSMotionUsageDescription` (**prompting without it crashes**) + `modules/excerlock-motion` pod; since runtime `3` (ADR 0042) the pod also exposes collect-only streams — attitude/quaternion/heading/magnetic field on device motion, pedometer distance/pace/floors, `CMAltimeter`, raw magnetometer, pedometer pause/resume events, guarded `CMSensorRecorder` — each behind its own availability flag | `modules/excerlock-motion/` | |
| 10 | Camera + Vision | `NSCameraUsageDescription` + gait-vision pod | already in `app-next/modules/excerlock-gait-vision` | |
| 11 | Location When-In-Use | `NSLocationWhenInUseUsageDescription` | `app.json` | |
| 12 | Location Always + geofencing | `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSLocationAlwaysUsageDescription`; `expo-location`, `expo-task-manager` | `app/app.json:62-63` | |
| 13 | Background modes | `UIBackgroundModes: [location, fetch, processing]` | `ios/ExcerLock/Info.plist` | |
| 14 | Local notifications | `expo-notifications` | `app/` | |
| 15 | Push entitlement | `aps-environment` — **present and provisioned, no pushes sent**; delete `withNoPush` | `plugins/withNoPush.js` (do the opposite) | reversal |
| 16 | Sign in with Apple | entitlement `com.apple.developer.applesignin` + `expo-apple-authentication`; capability `APPLE_ID_AUTH` on the App ID | absent from both apps | new |
| 17 | Associated Domains | entitlement + `ASSOCIATED_DOMAINS` capability; AASA at `excerlock.com` (empty `applinks` is fine for now) | absent | new |
| 18 | App Tracking Transparency | `NSUserTrackingUsageDescription` (string only; no prompt in v1) | absent | new |
| 19 | HealthKit + background delivery | entitlements + `NSHealthShareUsageDescription` + pinned `@kingstinct/react-native-healthkit@14.0.2` + `patches/` + `withHealthKitBackgroundBootstrap` (`@_silgen_name` bridge, `.mm` file) | `plugins/withHealthKitBackgroundBootstrap.js`, `plugins/healthkit/` | |
| 20 | Secure storage | `expo-secure-store` + `NSFaceIDUsageDescription` | `app/app.json:76` | |
| 21 | Photo library | `NSPhotoLibraryUsageDescription` + `expo-image-picker` | `app/app.json:68-75` | |
| 22 | App Intents / Siri | Open ExcerLock AppIntent in main target (ADR 0010) | idempotent source/framework plugin | new |
| 23 | Alternate app icons | `CFBundleAlternateIcons` with one alternate | absent | new |
| 24 | Localizations | `CFBundleLocalizations: [en]` + `CFBundleAllowMixedLocalizations` | absent | new |
| 25 | Privacy manifest | `PrivacyInfo.xcprivacy` with every collected data type (PostHog, Sentry, Adapty, Supabase) and required-reason APIs | empty in `app-next` | fix |
| 26 | Purchases | `react-native-adapty` | `app/` | |
| 27 | Crash reporting | `@sentry/react-native` + Metro plugin + sourcemap upload | `app/` | |
| 28 | Analytics | `posthog-react-native` | `app/` | |
| 29 | OTA | `expo-updates` (+ code signing certificate if enabled) | `app/` | |
| 30 | Config | `app.config.ts` resolving every key from EAS secrets with `~/.excerlock/env` fallback | `app/app.config.ts` | |
| 31 | Misc Expo | `expo-device`, `expo-crypto`, `expo-store-review` (JS-callable system review sheet via `runtime.review`, ADR 0042), `expo-sharing`, `expo-web-browser`, `expo-auth-session`, `expo-network` | `app/package.json` | |
| 32 | Startup diagnostics | app-owned `excerlock-startup` Expo module + AppDelegate Points of Interest markers (ADR 0021); diagnostic only, not full cold-launch acceptance | `app-next/modules/excerlock-startup/` | new |

Native runtime boundary: adding row32 advanced `app-next` runtimeVersion to `2`; widening row 9 (collect-only sensor streams, ADR 0042) advances it to `3` in build 8, the first App Store candidate. No runtime3 OTA publication is authorized; build and test the new binary.

## 2. Config plugin order (LIFO — first in the array runs last)

```
plugins: [
  "./plugins/withScreenTimeExtensionValidation",   // 1st listed = runs LAST: validates all 5 appex
  "./plugins/withMainAppEntitlements",             // asserts the app target's CODE_SIGN_ENTITLEMENTS points at the real file
  "./plugins/withHealthKitBackgroundBootstrap",
  ["react-native-device-activity", { appleTeamId: "AX3C2B78YD", appGroup: "group.com.johansardar.excerlock" }],
  "./modules/excerlock-motion/app.plugin",
  "./modules/excerlock-gait-vision/app.plugin",
  "expo-location", "expo-notifications", "expo-apple-authentication", "expo-secure-store", "expo-image-picker",
  "react-native-maps", "expo-router", "expo-splash-screen", "expo-font",
  ["expo-build-properties", { ios: { deploymentTarget: "17.4" } }],
  ["@sentry/react-native/expo", { organization, project }],
]
```

`guardrails/plugin-order.test.ts` moves across and asserts validation is first-listed and `withNoPush` is
**absent**. Ledger: a plugin's `withInfoPlist` silently overrides the same key in `app.json` — every usage
string is set in exactly one place (the plugin), never both.

## 3. Verification (the done-check for T01; automated in `scripts/verify-binary.sh`)

1. `npx expo prebuild --clean` succeeds and the validator plugin passes.
2. Build an IPA (`asc xcode archive` + export, or `eas build -p ios --profile preview`). Then:
   ```
   codesign -d --entitlements :- Payload/ExcerLock.app
   for x in Payload/ExcerLock.app/PlugIns/*.appex; do codesign -d --entitlements :- "$x"; done
   ```
   Assert: main has every entitlement in §1; each appex has its required Family Controls + App Groups subset, plus valid provisioning-generated
   identifiers/team/keychain groups/get-task-allow (ADR 0010). Main-only capabilities are not required on appex. A capable profile is not sufficient — the executable signature is the truth.
3. `plutil -p Payload/ExcerLock.app/Info.plist` — assert every `NS*UsageDescription` in §1, `UIBackgroundModes`,
   `CFBundleAlternateIcons`, `CFBundleLocalizations`.
4. `plutil -p Payload/ExcerLock.app/PrivacyInfo.xcprivacy` — non-empty `NSPrivacyCollectedDataTypes`.
5. `security cms -D -i embedded.mobileprovision` for main + each appex — the capability list matches.
6. App ID capabilities via `asc bundle-ids capabilities list --bundle <ID>` for all five: `FAMILY_CONTROLS`,
   `FAMILY_CONTROLS_DISTRIBUTION`, `APP_GROUPS`; main additionally `IN_APP_PURCHASE`, `HEALTHKIT`,
   `APPLE_ID_AUTH`, `PUSH_NOTIFICATIONS`, `ASSOCIATED_DOMAINS`. Verified present 2026-09-09 for the first
   four on all five IDs; the last three must be added (T00).
7. Prebuild twice and diff `ios/` — the generated project is deterministic (ledger: a stale `ios/` omits new
   local modules and plugin plist keys).

## 4. Landmines carried across (from `research/native-inventory.md`)

- HealthKit's Nitro C++ umbrella cannot be imported into the Expo Swift target → the `@_silgen_name` bridge and
  `.mm` file are copied by the plugin, not hand-added.
- The extension validator must stay **last-running** (first-listed) or a silent prebuild drops a target's team
  or entitlements file.
- `react-native-device-activity` autolinks the three appex from its package `targets/`; customizing the
  ShieldAction (deep-link experiment, G1) means forking those files — keep them under `patches/` or a vendored
  copy with a test that the package version is pinned.
- `expo-notifications` injects `aps-environment`; with B50 that is now desired — ensure the profile carries
  Push or the build fails to sign.
- `PickerLocationService.swift` requests When-In-Use only; the Always request lives in the gym/awake adapter,
  never in the picker module.
