# Physical-device smoke results

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

### Blocker re-check, 2026-08-24

The `BLOCKED` rows above were recorded against a build that no longer exists.
Re-verified against `main` at `72c2dc3`; **three of those blockers are gone and
those IDs are now runnable.** The recorded statuses above are left untouched —
they are an honest record of that run, not of this one.

| Previously blocked | Now | Evidence |
|---|---|---|
| Walk Session — "no production caller invokes `startWalkKeepAlive()`" | **Unblocked** | `walkingSessionController.ts:207` calls it, and #119 added the Stop control the test requires |
| Walk-to-shield — "shared lock controller constructed with default `walking: false`" | **Unblocked** | `lockController.ts:104-119` now defaults to the walking session snapshot and subscribes to it |
| Shield notification permission — "`getNotificationModule()` still returns `MockNotificationModule`" | **Unblocked** | `notifications/accessor.ts` returns `ExpoNotificationModule` outside tests; the mock is test-only |

So **WLK-01, GEO-04, and SH-02 are now device-runnable**, and MOT-01/MOT-02 can
finally drive shields rather than only rendering an active card.

**Gym geofence remains genuinely blocked, and not by hardware.** A gym region
comes from `savedPlaces` entries carrying a `geofence`
(`gymPresenceController.ts:141-160`). `savedPlaces` is persisted and read, but
**nothing in the app ever writes it** — there is no screen that saves a gym
circle. Settings can toggle auto-detect and Home can check in, but with an
empty `savedPlaces` `enableAutoDetect()` returns `false` immediately. **GEO-01,
GEO-02 and GEO-03 cannot be run until that control is built; a trip to the gym
would prove nothing.** GEO-04 is unaffected — it rides on the walk session, not
on a region.

Treadmill mode (#111) adds its own device work, tracked in #120 and #113.

### Required continuation

Connect `Il` with a USB-C-to-Lightning data cable, complete the signing and
install recipe in `DEVICE-SMOKE.md`, and run every ID. Replace each row above
with the actual device, action, observed result, latency, and evidence. The
current file deliberately contains no device pass claim.
