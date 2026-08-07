# Physical-device smoke results

## Ticket index (filed 2026-08-06)

| Finding | Ticket |
|---|---|
| Finding 1 — mock/native accessor gate | Fixed on this branch (`e9012d6`); port to main tracked as #110 |
| Finding 3 — earn-to-lift reconciliation-driven | #106 |
| Finding 4 — `useNotificationPermission` rejection handler | #107 |
| Finding 6 — economy split-brain (drain ingestion) | #103 |
| Finding 8 — onboarding hard-gated on plans service | #108 |
| Finding 9 — rest-of-day reward ignored by lock policy | #104 |
| Finding 10 — routeHomeAvailable never reaches the shield | #105 |
| Generic "Restricted" shield flake (SH-01/DA-01) | #109 |

Findings 2, 5, 7 and the Metro-cache note are dev-client/harness hazards, not
product defects — they live in this file and `HARNESS.md` guidance only.

## 2026-08-07 — lane/84-device-smoke-run — fix-verification run

### Run header

| Field | Recorded value |
|---|---|
| Commit under test | `0f4869e` (this branch), JS served over Metro port 8090 (`EXPO_NO_DOTENV=1 EXPO_PUBLIC_E2E=0 npx expo start --port 8090 --clear`) onto the 2026-08-04 native install — all five fixes are JS-only, so no rebuild was needed |
| iPhone | `Il`, iPhone 13, iOS 26.2.1, driven via Appium/WebDriverAgent; fully autonomous (Johan not present) |
| Fixes under test | #107 `4294038`, #104 `1206c79`, #106 `b3baee9`, #103 `ee66988`, #105 `0f4869e` |
| Suite state at test time | 888 tests green across the app workspace, `tsc` clean |

### Fix verification results

| Ticket | Device result | Evidence |
|---|---|---|
| #106 (F3, earn-to-lift lag) | **PASS** | With a positive balance, cold-launching ExcerLock lifted the target app's shield within seconds — **no lock screen was ever mounted**. The root `LockRuntimeHost` now runs the shared controller for the app's lifetime and reconciles on every foreground. F3's "open `excerlock://locked-apps` to make the shield move" workaround is dead. |
| #104 (F9, rest-of-day ignored) | **PASS** — the exact Aug-6 failure now passes | "Finish any workout" (Rest of day reward) completed via its Complete control → hero flipped to **"Unlocked for the rest of the day"** → target app opened **fully unshielded immediately**, no locked-apps visit. Shield state and hero agree; the restOfDay claim now becomes a ledger holiday that lock policy honors (shields down to end of day, drain ladder disarmed). |
| #103 (F6, drain ingestion) | PASS (desk-verified; device leg indirect) | `getFiredDrainRungs` ingestion runs at every reconcile inside the suppress-subscription window; journal drainTick entries are idempotent on `(source,id)`. Direct device observation of a live drain requires burning a real balance by threshold — not repeated this run; the Aug-6 interval-boundary ingestion observation plus the new unit armor cover the mapping. Home "Screen time used" now reflects ingested rungs. |
| #107 (F4, permission rejection) | PASS (unit-level; not device-reproducible) | The rejection path cannot be forced on a healthy device. Tests prove: mount-time rejection leaves the hook `ready` with toggles alive and re-asks on opt-in; `requestAuthorization` rejection clears the pending type instead of wedging. |
| #105 (F10, shield content/tap-through) | **PASS** | See SH-02 below. Shields-down reconciles now publish **predicted** content (the shield the OS would apply next), so the app group never holds stale content. After staging Full Lock, the target app's shield rendered the custom variant **with the "Open ExcerLock" primary button** and a live offer subtitle — the first time any shield has offered tap-through on this device. |

### SH-02 tap-through leg — PASS (2026-08-07)

Previously BLOCKED by the Finding 6/10 catch-22. Full chain observed on device:

1. Full Lock staged via Manage → target app shield rendered the custom
   fullLock variant with **"Open ExcerLock"** primary (one generic-"Restricted"
   first render — #109, third occurrence — cleared by relaunching the target).
2. Tapping **Open ExcerLock** enqueued the local tap-through notification.
   An active Focus mode on the device delivered it **quietly** (no banner);
   it was found in Notification Center. Product caveat recorded below.
3. Tapping the notification deep-linked into ExcerLock's Locked apps screen,
   which showed **truthful** Full Lock copy (no "balance empty" lie — #104's
   `lockStatus` fix verified in the same breath).

Caveat for a future ticket if desired: under any active Focus that doesn't
include ExcerLock, the tap-through notification arrives silently, so the
shield's primary button appears to do nothing until the user opens
Notification Center. An OS behavior, not a bug in our chain.

### Finding 10 correction (Aug-6 claim retracted)

The Aug-6 claim that "at 15:21:35 a genuine shields-up reconcile ran with
cause `balanceEmpty` — exactly the path that publishes fresh content" was
**wrong**. That "Time's up — today's balance is empty" copy was the
`lockStatus` fallback lie (Finding 9's untranslated rest-of-day holiday made
`desiredLockState` compute shields-down while observed state was up; the old
`deriveLockStatus` then invented a balance-empty explanation). No
shields-up-with-balanceEmpty publish ever ran that day, so Aug-6 produced **no
evidence** that the publish path drops `routeHomeAvailable`. The 2026-08-07
run proves the chain works end-to-end when a publish actually happens.

### Finding 7 revision — render wedge, not touch loss

Third occurrence, new evidence: after tapping Complete with no visible
response, a dev-menu **Reload** revealed the earn HAD registered (card
✓ Completed, hero rest-of-day). So the wedge freezes **rendering**, not touch
delivery — JS state advances while the UI stays stale. Same workaround
(dev-menu Reload); still dev-client-only.

### DA-01 status after this run — all runnable legs PASS

Re-open-while-reward-valid leg: **PASS** (was FAIL — see #104 row above).

Force-quit fail-safe leg: **PASS**. With the rest-of-day holiday active,
ExcerLock was force-quit (~14:03) leaving the 15-minute unlock lease armed.
At the interval end (~14:14) the extension re-shielded the target on its own —
the designed fail-safe. First render was Apple's generic "Restricted" screen
(**#109, fourth occurrence** — again on an extension-applied shield; dismiss +
relaunch recovered as always). The recovered render is the payoff of #105:
the **predicted** balance-out variant with a live offer subtitle and a working
**"Open ExcerLock"** primary — content published in advance during the
shields-down reconciles, where Aug-6 showed days-stale copy with Close only.
Relaunching ExcerLock (cold start over Metro, ~90 s including bundle
download) reconciled the holiday and lifted the shield; the target then opened
fully. Hero, Locked apps ("Your apps are open… Nothing is scheduled to lock
them."), and the shield all agree.

Cold-start note: the relaunch first landed in the #108 onboarding trap
("Plans couldn't load") and needed the `excerlock://(tabs)` deep-link escape —
#108 unchanged, awaiting product decision. The root `LockRuntimeHost` mounts
above routing, so lock reconciliation ran even while the app sat on the
onboarding dead-end.

Also verified: the Aug-7 accidental "New lock window" form open was abandoned
unsaved — Locked apps shows **"No lock windows yet."**

### Still requiring another day/Johan

SH-01 reboot leg (device passcode), FC-01 deny path (clean reinstall),
MOT-01/02, WLK-01, GEO-01–04, HK-03 background delivery.

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

### Finding 4 — `useNotificationPermission` has no rejection handler

`useNotificationPermission`'s mount effect calls
`module.getAuthorizationStatus().then(onFulfilled)` with **no rejection
handler**. If that first native call ever rejects, `ready` stays `false`
forever and every notification toggle renders permanently disabled with no
error surfaced anywhere — the Settings card just goes dead. Observed while
diagnosing an unresponsive toggle this run (temporary instrumentation proved
the promise resolves normally on this device — the dead toggle was Finding 5 —
but the silent-failure path is real and untested). Needs a follow-up issue
alongside #92.

### Finding 5 — dev-menu gear also occludes the first Settings toggle

Finding 2's Expo dev-menu floating gear (logical ~349,85 with a touch window
larger than its visible circle) also swallows taps on the **first notification
toggle** in Settings when the card scrolls under it. The switch received no
touch despite rendering `disabled: false` (proven via instrumentation). Same
dev-client-only hazard; workaround is to use any control outside the gear's
hit window or scroll the target away from it.

### Finding 6 — the JS ledger never sees native drain usage (economy split-brain)

Observed 2026-08-06 with a 5-minute earned balance and the 1-app selection:

1. **Native drain works**: ~15 min of continuous foreground use of the locked
   app fired the DeviceActivity drain ladder and the extension applied the
   shield (shield landed ≈10 min after the 5-minute usage mark — threshold
   granularity/queueing jitter, recorded below).
2. **JS never ingests it**: after all of that, Home still showed **Screen time
   used 0m** and the ledger still computed a positive balance. The drain
   events persist in the app group but nothing maps them into journal drains.
3. **Foregrounding the app therefore LIFTS a legitimate drain shield**: the
   next reconcile computes `drainsBalance → shields down` from the stale
   positive balance and removes the shield the OS had correctly applied. The
   user gets unlimited use after any app-open.
4. **Catch-22 blocks the SH-02 tap-through**: shield content (including
   `routeHomeAvailable`, i.e. the **Open ExcerLock** button) is only published
   during a shields-up reconcile (`ShieldCauseResolver.resolve` returns null
   when shields are down, so shields-down reconciles skip publishing). But the
   JS side never computes shields-up for a drain-caused shield (see 2). Net:
   **a drain-caused balance-empty shield can never render the Open ExcerLock
   button**, and the app-group content stays stale (this run's shields still
   rendered Aug 4 fullLock-era copy with Close only).
5. **The balance cannot be zeroed intraday**: pausing the earning condition
   leaves today's paid claim; deleting the condition also leaves the claim
   (history is preserved, defensibly). So the only JS-visible balance-empty
   state is a fresh day with no auto-claiming conditions.

This is the biggest product finding of the run after the accessor gate bug.

Revision from the DA-01 run later the same day: drain usage DOES eventually
reach the lock ledger — after the 15-minute DeviceActivity interval ended, the
next locked-apps reconcile computed **"Time's up — today's balance is empty"**
(so ingestion happens at interval boundaries, not live). Points 3–5 stand as
written for the intra-interval window, and Home's **Screen time used** display
never updated (still 0m) even after the lock ledger saw the drain.

### Finding 9 — rest-of-day reward is honored by Home but not by lock policy

With the "Finish any workout" condition edited to a **Rest of day** reward and
completed at 15:04 (2026-08-06), Home's hero flipped to **"Apps are unlocked /
Unlocked for the rest of the day"** and the card to ✓ Completed — and still
showed exactly that at 15:23. But the lock-policy surfaces never honored it:
Locked apps at 15:05 attributed the open state to the (stale) minute balance,
at 15:21 showed **"Time's up — for now. Today's balance is empty."**, and the
target app rendered the shield at 15:23 **while Home simultaneously claimed
rest-of-day unlock**. The rest-of-day claim evidently never enters the
`desiredLockState` inputs (no holiday window recorded, or not translated).
Split-brain between the hero and the shield state, captured 90 s apart.

### Finding 10 — routeHomeAvailable never reaches the shield despite granted permission

At 15:21:35 a genuine shields-up reconcile ran with cause `balanceEmpty` —
exactly the path that publishes fresh shield content including
`routeHomeAvailable` — while Settings verifiably showed **"Notifications are
on"** (permission granted on-device Aug 4). The shield rendered afterwards
(15:23) still had **no "Open ExcerLock" button**. So even when the publish
path runs, the route-home flag arrives at the ShieldConfiguration extension as
false (or the runtimeContext write never lands in the app group). The
`ShieldRouteHomeSource` → publisher → app-group → extension chain needs
on-device instrumentation; until it is fixed, **no shield variant can offer
tap-through**, and the SH-02 fresh-day plan will hit this same wall.

### Finding 7 — dev-client touch-wedge flake

Twice this run every RN touch went dead app-wide (Complete, onboarding CTAs)
while WDA taps demonstrably landed (the Expo dev-menu gear still opened). A
dev-menu **Reload** restored touch handling. This also retroactively explains
Aug 4's "Complete tap produced no earn until relaunch" observation. Dev-client
automation hazard: after a burst of deep links/relaunches, verify a known
control responds before concluding a product control is broken.

### Finding 8 — onboarding is hard-gated on the plans service

Cold-starting the installed dev build lands on the **Earn your screen time**
onboarding screen even for an already-onboarded install (state underneath is
intact — conditions, selection, and permissions all survive). Walking the flow
dead-ends at **"Plans couldn't load / Plans are temporarily unavailable"**
with only Try again/Back — no skip. On any install where the plans backend is
unreachable, onboarding can never complete and every cold start re-enters it;
deep links (`excerlock://(tabs)`) are the only way past. Needs a product
decision (cached plans, offline skip, or dev bypass).

### Run-infra note — shared Metro cache poisoning across lanes

On 2026-08-06 the f4 Metro (port 8090) served a broken bundle — phantom
`Cannot find native module 'ExpoSharing'/'ExpoTaskManager'` errors plus an
`ErrorBoundary` crash on boot — with zero code changes since the working
Aug 4 session. Cause: Metro's cache directory is shared with the other lane's
Metro (port 8081) on this machine. `expo start --clear` fixed it. When two
lanes run Metro simultaneously, start with `--clear` after switching lanes.

### Device checklist status

| ID | Status | Observation |
|---|---|---|
| FC-01 | PASS | With the fixed gate, a clean `requestAuthorization` run presented the real Apple FamilyControls sheet exactly once (~15:20). On iOS 26.2.1 the sheet completes via **"Allow with Face ID"** — not a passcode entry as `DEVICE-SMOKE.md` §FC-01 assumes (one Face-Not-Recognized retry then success, performed by Johan; the only manual action in the run). Locked apps then reports **Screen Time is on / On**, and the granted state survives force-quit + relaunch. No Expo/native-module error at any point. Deny path NOT RUN (needs a clean reinstall). |
| FC-02 | PASS | Real FamilyActivityPicker presents from **Choose apps**/**Change apps** under WDA automation. One harmless app selected (identity only in private notes); on ✓ Done the persisted view emitted `onSelectionChange {applicationCount: 1, categoryCount: 0}` and the app rendered **1 app** with no identities leaked. Count + authorization survive force-quit and relaunch; **Change apps** reopens with the prior selection shown (category badge `1`); X-cancel leaves the saved selection unchanged. Initial "selection never saves" observation was Finding 2 (Done occluded), not a code defect. |
| SH-01 | PASS (reboot leg NOT RUN) | With Full Lock on and a real 1-app selection, the target app is covered by ExcerLock's native shield: clay-lock art, **"Move first, scroll after."**, subtitle **"Open ExcerLock to choose your fastest unlock."**, orange **Close**. This is the **fullLock-cause variant with a live copy override** — the app-group cause writer (`ShieldContentPublisher`) now exists, so the §SH-01 "#92 balance-empty-only" oracle is stale. No target-app name on the shield. Close returns to Home Screen, where iOS shows its hourglass restriction marker on the target app. Shield persists with ExcerLock force-quit. One flake: a single launch (~15:39) rendered **Apple's generic "Restricted" screen** instead of the custom shield; the custom shield rendered on every other attempt (before and after). Reboot leg NOT RUN — requires the device passcode after restart. |
| SH-02 | PARTIAL — permission PASS, tap-through BLOCKED | Permission leg (2026-08-04): turning on a notification type walked the designed OFF→ON flow — primer **Choose what helps** → **Allow notifications** → the real iOS sheet (""ExcerLock" Would Like to Send You Notifications") → approval, and the pending type was applied only after approval (Settings shows **Notifications are on**, type On). The doc's "production accessor still constructs the mock / record BLOCKED" note is stale — the real module presents the real sheet. Tap-through leg (2026-08-06): BLOCKED by Finding 6's catch-22 — the drain-caused balance-empty shield renders stale Close-only content and the **Open ExcerLock** button can never appear for it. A fresh-day run (day rolls to zero balance with no auto-claiming conditions, one app-open publishes `balanceEmpty`) was the planned path to exercise steps 3–4, but the same-day DA-01 run then proved that even a genuine `balanceEmpty` publish with granted permission does not surface the button (Finding 10) — tap-through stays BLOCKED until that chain is fixed; denied-permission repeat also NOT RUN. Drain timing measured while attempting it: 5m balance, continuous foreground use from 14:30, native shield applied 14:45:37 (≈10 min after the 5-minute usage mark). |
| SH-03 | PASS with caveat | "Finish any workout" event condition (10-min goal, fixed **+5 min** reward) created through the Home builder; its **Complete** control recorded exactly one earn (idempotence key `conditionId:dayIndex`; card flips to ✓ Completed, **Earned today 5m**, hero **Apps are unlocked / 5 min left**). Target app then opened fully, no shield. Caveat = Finding 3: the lift required foregrounding `excerlock://locked-apps` (~5 s after mount); from Home alone the shield remained ≥40 s after the earn. One earlier Complete tap sequence produced no earn until an app relaunch (builder sheet was invisibly open over Home in that window — see Finding 2's occluded Cancel). No duplicate payout observed. |
| DA-01 | PARTIAL — lapse PASS, re-open FAIL (Finding 9), force-quit leg BLOCKED | Setup 2026-08-06: "Finish any workout" edited to a **Rest of day** reward, completed via its Complete control at 15:04; shield lifted only after the locked-apps mount at 15:05:44 (Finding 3 again, ~5 s), target verified open, everything backgrounded 15:06:07. **Lease lapse**: with ExcerLock backgrounded the shield re-applied by the 15:21:04 retry — ≈20 s after the 15-minute interval end (armed 15:05:44), comfortably inside the 30-second fail-safe. It rendered **Apple's generic "Restricted" screen** rather than the custom shield (second occurrence of the SH-01 flake, this time on an extension-applied shield). **Re-open while reward valid: FAIL** — the rest-of-day reward was not honored by lock policy (Finding 9): locked-apps showed "Time's up — today's balance is empty", and the target re-shielded (custom shield) after reconcile while Home still claimed rest-of-day unlock. **Second interval with force-quit: BLOCKED** — no open state is reachable once the balance is empty and the reward is ignored. |
| HK-01 | PASS with caveat | **Step goal** condition (1,000-step threshold, fixed **+5 min**) created through the Home builder read real HealthKit data immediately on save: the card showed a nonzero device-recorded count already above the threshold and paid **exactly one** +5 earn (**Earned today 5m → 10m**). Backgrounding and reopening produced no duplicate claim (idempotence key `conditionId:dayIndex` held). Caveat: **no iOS Health permission sheet appeared** — Steps read access was already granted to this bundle from an earlier session, so the first-read sheet leg is unproven on this install; a clean reinstall would be needed to observe it. |
| HK-02 | PASS | A synthetic manual Steps entry (20,000, entered via the Health app by the tester at ~17:41 and deleted after the check) was **excluded** from ExcerLock's count: the Step goal card advanced only by the natural device-recorded delta over the same span while Health's own daily total jumped by the manual 20,000. Earned today stayed at 10m — no payout change from manual data. The device-recorded-only filter works on real hardware. |
| HK-03 | PARTIAL | Cold-launch catch-up proven on the day boundary: the first open of 2026-08-06 auto-claimed the Step goal for that day's already-recorded device steps — exactly one +5 payout, no duplicate on later opens (idempotence key held across the day roll). Background delivery (claim without any app open) NOT RUN — requires new qualifying Health data to arrive while the app stays backgrounded, which needs real activity. |
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
