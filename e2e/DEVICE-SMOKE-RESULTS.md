# Physical-device smoke results

## 2026-08-04 — lane/84-device-smoke-run — first on-device run

### Run header

| Field | Recorded value |
|---|---|
| Commit | `c346ef2` (main), worktree `ExcerLock-lanes/f4`, branch `lane/84-device-smoke-run` |
| Build method and command | `EXPO_NO_DOTENV=1 EXPO_PUBLIC_E2E=0 npx expo run:ios --device <udid>` for prebuild+pods; signing failed on the wildcard team profile, so the compile was `xcodebuild -workspace ExcerLock.xcworkspace -scheme ExcerLock -configuration Debug -destination id=<udid> -allowProvisioningUpdates DEVELOPMENT_TEAM=AX3C2B78YD build`, which registered `com.johansardar.excerlock` (+ 3 extension IDs) and minted team profiles with App Groups / Family Controls / HealthKit |
| Build timestamp | 2026-08-04 ~13:44 EDT |
| iPhone model/name | `Il`, iPhone 13 (iPhone14,5) |
| iOS version | 26.2.1 (build 23C71) |
| Physical UDID | 00008110-000E5041260BA01E |
| Apple team | AX3C2B78YD (paid; signing identity "Apple Development: JOHAN AMIT SARDAR (9X6MMS8XMD)") |
| EXPO_PUBLIC_E2E value | 0 (native build and Metro both `EXPO_NO_DOTENV=1 EXPO_PUBLIC_E2E=0`; Metro on port 8090 — 8081 held by another lane) |
| Tester | Claude session ttys025 driving the device remotely via Appium/WebDriverAgent (coordinate taps); Johan's only manual action was the Face ID approval on the FamilyControls sheet |

Install evidence: `devicectl device install app` reported
`bundleID: com.johansardar.excerlock` installed at 13:44:52. First launch was
refused while the phone was locked (`FBSOpenApplicationErrorDomain error 7`);
launch retried after unlock.

Preflight-blocker re-audit at `c346ef2` (supersedes the 2026-07-31 static
audit): `getNotificationModule()` now constructs the real
`ExpoNotificationModule` outside Jest, so SH-02 is attemptable;
`GymPresenceRuntimeHost` + Settings auto-detect wiring exists, so GEO-01 is
attemptable; `WalkingSessionRuntimeHost` is mounted by `HomeScreen`, so WLK-01
is attemptable. Statuses below record observed device behavior, not the stale
BLOCKED notes in `DEVICE-SMOKE.md`.

### Finding 1 — mock/native gate bug (fixed this run)

Every result recorded before ~15:10 was **invalid: the app was running
`MockScreenTimeModule` on the physical iPhone.** `shouldUseNativeScreenTimeModule`
used `Constants.expoGoConfig === null` as the native discriminator, but a
Metro-served development client on device reports `executionEnvironment:
"bare"` **with a non-null `expoGoConfig`** (measured via temporary runtime
logging: `{"nodeEnv":"development","platform":"ios","executionEnvironment":
"bare","expoGoConfigIsNull":false,"appOwnership":null}`). The gate therefore
routed the real device to the mock while every screen claimed Screen Time was
live — the earlier "FC-01 PASS*" and "FC-02 PARTIAL" entries in this section's
first draft observed mock behavior (the phantom **4 apps · 2 categories** is
the mock's `DEFAULT_SELECTION_CONTENTS`) and were retracted. Fixed TDD in
`app/src/screentime/accessor.ts`: only Expo Go (`StoreClient`) selects the
mock on iOS. 32/32 screentime tests pass.

### Finding 2 — picker Done/Cancel semantics + dev-menu occlusion

The library's iOS sheet (`DeviceActivitySelectionSheetViewPersisted` forces
`showNavigationBar`) uses the `.familyActivityPicker(isPresented:selection:)`
modifier, which **commits the selection binding only on the ✓ Done tap**; the
X is a cancel and correctly resolves the pick as null. On this device the
sheet's ✓ Done button sits at the exact screen position of the Expo dev-menu
floating gear, which **swallows taps aimed at Done** (it also covers the
builder sheet's Cancel). This is a dev-client-only automation/UX hazard, not a
product bug, but it initially masqueraded as "selection never reaches JS."
Done is reachable via its top-right arc outside the gear's hit circle.

### Finding 3 — earn lifts the shield only after a reconciling screen mounts

The Home earn updates the ledger and hero immediately, but the ManagedSettings
shield stayed applied on the target app for at least ~40 s afterwards while
only Home was foregrounded. Opening `excerlock://locked-apps` (mounting the
shared lock controller) cleared the shield within ~5 s. Earn-to-lift is
currently reconciliation-driven, not event-driven — SH-03 passes only with
that caveat recorded.

### Device checklist status

| ID | Status | Observation |
|---|---|---|
| FC-01 | PASS | With the fixed gate, a clean `requestAuthorization` run presented the real Apple FamilyControls sheet exactly once (~15:20). On iOS 26.2.1 the sheet completes via **"Allow with Face ID"** — not a passcode entry as `DEVICE-SMOKE.md` §FC-01 assumes (one Face-Not-Recognized retry then success, performed by Johan; the only manual action in the run). Locked apps then reports **Screen Time is on / On**, and the granted state survives force-quit + relaunch. No Expo/native-module error at any point. Deny path NOT RUN (needs a clean reinstall). |
| FC-02 | PASS | Real FamilyActivityPicker presents from **Choose apps**/**Change apps** under WDA automation. One harmless app selected (identity only in private notes); on ✓ Done the persisted view emitted `onSelectionChange {applicationCount: 1, categoryCount: 0}` and the app rendered **1 app** with no identities leaked. Count + authorization survive force-quit and relaunch; **Change apps** reopens with the prior selection shown (category badge `1`); X-cancel leaves the saved selection unchanged. Initial "selection never saves" observation was Finding 2 (Done occluded), not a code defect. |
| SH-01 | PASS (reboot leg NOT RUN) | With Full Lock on and a real 1-app selection, the target app is covered by ExcerLock's native shield: clay-lock art, **"Move first, scroll after."**, subtitle **"Open ExcerLock to choose your fastest unlock."**, orange **Close**. This is the **fullLock-cause variant with a live copy override** — the app-group cause writer (`ShieldContentPublisher`) now exists, so the §SH-01 "#92 balance-empty-only" oracle is stale. No target-app name on the shield. Close returns to Home Screen, where iOS shows its hourglass restriction marker on the target app. Shield persists with ExcerLock force-quit. One flake: a single launch (~15:39) rendered **Apple's generic "Restricted" screen** instead of the custom shield; the custom shield rendered on every other attempt (before and after). Reboot leg NOT RUN — requires the device passcode after restart. |
| SH-02 | NOT RUN | — |
| SH-03 | PASS with caveat | "Finish any workout" event condition (10-min goal, fixed **+5 min** reward) created through the Home builder; its **Complete** control recorded exactly one earn (idempotence key `conditionId:dayIndex`; card flips to ✓ Completed, **Earned today 5m**, hero **Apps are unlocked / 5 min left**). Target app then opened fully, no shield. Caveat = Finding 3: the lift required foregrounding `excerlock://locked-apps` (~5 s after mount); from Home alone the shield remained ≥40 s after the earn. One earlier Complete tap sequence produced no earn until an app relaunch (builder sheet was invisibly open over Home in that window — see Finding 2's occluded Cancel). No duplicate payout observed. |
| DA-01 | NOT RUN | — |
| HK-01 | NOT RUN | — |
| HK-02 | NOT RUN | — |
| HK-03 | NOT RUN | — |
| MOT-01 | NOT RUN | — |
| MOT-02 | NOT RUN | — |
| WLK-01 | NOT RUN | — |
| GEO-01 | NOT RUN | — |
| GEO-02 | NOT RUN | — |
| GEO-03 | NOT RUN | — |
| GEO-04 | NOT RUN | — |

## 2026-07-31 — lane/84-device-smoke host-only run

> **No connected physical iPhone was available.** `xcrun xctrace list devices`
> listed the iPhone 13 named `Il` only under **Devices Offline**, and
> `devicectl` reported it as `unavailable`. No build was installed, no native
> permission sheet was opened, and no device checklist item was passed or
> physically verified.

### Run header

| Field | Recorded value |
|---|---|
| Commit | `5762335` plus the final documentation commit from this lane |
| Build method | Clean Expo prebuild; unsigned generic iPhoneOS Xcode build |
| Build timestamp | 2026-07-31 (America/New_York) |
| Host | macOS with Xcode 26.4.1 / iPhoneOS SDK 26.4 |
| Physical device | `Il`, iPhone 13, iOS 26.2.1 — offline/unavailable |
| Required minimum | iOS 17.4 |
| Bundle/team | `com.johansardar.excerlock` / `AX3C2B78YD` |
| Provider gate | `EXPO_NO_DOTENV=1 EXPO_PUBLIC_E2E=0` |
| Tester | Codex lane; host-only, no device custody |

### Host/build results

| Check | Status | Evidence |
|---|---|---|
| Development profile | PASS | `app/eas.json` uses `developmentClient: true`, internal distribution, `ios.simulator: false`, and `EXPO_PUBLIC_E2E=0` |
| Clean prebuild | PASS | `EXPO_NO_DOTENV=1 EXPO_PUBLIC_E2E=0 npx expo prebuild --clean --platform ios` completed; plugin-order guard remains green |
| Native identities | PASS | Resolved config keeps bundle id, team `AX3C2B78YD`, iOS 17.4, Family Controls/app-group entitlements, and generated extension targets |
| Generic iPhoneOS compile | PASS | Unsigned `xcodebuild` produced `ExcerLock.app`, `DeviceActivityMonitorExtension.appex`, `ShieldConfiguration.appex`, and `ShieldAction.appex`; warnings only |
| HealthKit cold-start bridge | PASS | Clean prebuild generated and compiled the Objective-C++ bridge; AppDelegate calls the bridge without importing Nitro's C++ umbrella into Swift |
| Guardrails | PASS | 11 files / 19 tests after clean prebuild |
| Expo Doctor | PASS | 20/20 checks |
| Physical install/signing | NOT RUN | No connected physical iPhone; unsigned generic compile does not prove signing or installation |
| EAS cloud build | BLOCKED | EAS account is authenticated, but the EAS project is not configured; `eas project:info --non-interactive` requires `eas init` |

### Static execution-path findings

These are source-audit results, not substitutes for device behavior.

| Area | Status | Finding |
|---|---|---|
| Screen Time authorization/picker | READY FOR DEVICE | The Locked apps screen invokes the native development-client adapter; current navigation requires `excerlock://locked-apps` |
| Shield apply/lift | READY FOR DEVICE | Manage/Locked apps mount the shared controller; an actual ManagedSettings transition remains NOT RUN |
| Shield notification permission | BLOCKED | Shield response handling is native, but `getNotificationModule()` still returns `MockNotificationModule`; no production permission request proves tap-through, matching #92's open limitation |
| HealthKit foreground read | READY FOR DEVICE | Home selects the native provider in an iOS development client and claims on open |
| Gym geofence | BLOCKED | Adapter/tasks exist, but no production caller uses `getLocationProvider()` or `startMonitoringRegions()` and no saved-gym control exists |
| Walk Session | BLOCKED | No production caller invokes `startWalkKeepAlive()` or `stopWalkKeepAlive()` |
| Walk-to-shield integration | BLOCKED | Home can render real walking, but the shared lock controller is constructed with its default `walking: false`; Home activity cannot yet drive shields or lease renewal |

### Device checklist status

| ID | Status | Observation |
|---|---|---|
| FC-01 | NOT RUN | FamilyControls authorization requires connected hardware |
| FC-02 | NOT RUN | FamilyActivityPicker selection/persistence requires connected hardware |
| SH-01 | NOT RUN | No shield was applied or rendered |
| SH-02 | BLOCKED | No production notification authorization path; no hardware tap-through attempted |
| SH-03 | NOT RUN | No physical shield or earn-to-lift transition occurred |
| DA-01 | NOT RUN | No real 15-minute DeviceActivity interval elapsed |
| HK-01 | NOT RUN | No real HealthKit read occurred |
| HK-02 | NOT RUN | Manual-entry filtering was not compared with real Health data |
| HK-03 | NOT RUN | Cold-launch/background delivery was not exercised |
| MOT-01 | NOT RUN | No real Core Motion stream or permission UX was observed |
| MOT-02 | NOT RUN | Classification latency, indoor/treadmill/background/force-quit cases remain unrun |
| WLK-01 | BLOCKED | Product start/stop and lock integration callers do not exist; hardware behavior also remains unrun |
| GEO-01 | BLOCKED | No production saved-gym/registration caller; hardware behavior also remains unrun |
| GEO-02 | BLOCKED | Geofence arrival and 30-second executor confirmation cannot be initiated from the product |
| GEO-03 | BLOCKED | Terminated-app region wake cannot be armed from the product |
| GEO-04 | BLOCKED | Continuous Walk Session has no production start/stop caller |

### Required continuation

Connect `Il` with a USB-C-to-Lightning data cable, complete the signing and
install recipe in `DEVICE-SMOKE.md`, and run every ID. Replace each row above
with the actual device, action, observed result, latency, and evidence. The
current file deliberately contains no device pass claim.
