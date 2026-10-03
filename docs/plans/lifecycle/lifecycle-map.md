# ExcerLock lifecycle map

**Code analysed:** branch `fix/stay-signed-in` at `8a395184`. This is the latest production OTA (`ota-runtime4-20261002-8a395184`), running on App Store build 17, whose native code comes from `1508e366`. Native changes since build 17 touch only the store-environment module and don't affect the lifecycle.

**Method:** read-only static reading. Nothing was run on a simulator or a device. Items marked **[device]** depend on iOS runtime behaviour and need a device proof before anyone acts on them.

**Path convention:**
- Bare package paths such as `journey/index.ts:26` are under `app-next/src/packages/`.
- `app/…`, `modules/…`, `targets/…` and `config/…` are under `app-next/`.
- `node_modules/…` is the repo-root `node_modules`.
- `server/src/…` is the API.

**Severity:**
- **every user**: hits every user, or every user of a Condition kind, in normal use.
- **some users**: hits a real subset under common conditions.
- **rare edge**: needs an unusual sequence.

---

## 1. Worst gaps at a glance

The full register with files is in §6.

| ID | Gap | Severity |
|---|---|---|
| G01 | Every cold launch resets the Journey to Welcome and denies sign-in. A paying user lands on onboarding page 1 and must sign in again. iOS evicting a backgrounded app counts as a cold launch too. (known) | every user |
| G02 | Reopening mid-onboarding after a kill restarts at O01. The saved step is overwritten. | every user |
| G03 | Reopening on the Paywall after a kill restarts at O01. A purchase made before sign-in is invisible on Welcome. | every user |
| G05 | After any cold launch, the live motion subscription is pinned to a stale detection generation. Background walking evidence is rejected, so Walking state relief and walking minutes only advance while ExcerLock is in the foreground. | every user (walking) [device] |
| G06 | Gym check-in records are silently dropped after every launch unless Always location and gym auto-detect are on. The screen still says the apps are unlocked. | every user (gym check-in) [device] |
| G07 | The shield offers only "Close". A Condition met while ExcerLock is closed never unlocks until the user thinks to open the app. | every user |
| G08 | Walking minutes walked after a relaunch don't count until they exceed the total walked earlier that day. | every user (walking minutes) |
| G04 | Every cold sign-in shows blank screens with no progress indicator: verification, then the auto-finishing Setup. On a slow network this lasts up to about 30 s. | every user |
| G09 | An OTA applied on a foreground return restarts JS and sends a signed-in user to Welcome. The resume envelope can never restore. | some users |
| G11 | An offline cold launch more than about an hour after last use can't start the runtime: about 30 s of blank screen twice, then "Let's try that again". | some users |
| G12 | A geofence relaunch while the phone is locked can't read the Keychain session. The runtime fails and the arrival isn't applied. | some users [device] |
| G13 | Returning after more than 5 minutes in the background while offline or with a slow server drops the user from Home to an error screen and loses in-progress screens. | some users |
| G15 | Gym presence never starts from the background. Every cold start cancels an open gym visit. | some users |
| G25 | The delete-account sheet says local data "stays on this device", but deletion erases it. | some users |

---

## 2. Shared mechanics

### 2.1 Three layers of state

1. **Process-local JS.** This is the Journey phase, the launch sign-in approval, the 5-minute admission lease and the whole runtime. Lost on every kill, every iOS eviction and every OTA reload.
2. **Persisted JS.** AsyncStorage stores, the per-account envelope, and the Supabase session in the Keychain. Survives kills, reboots and App Store updates. AsyncStorage is erased on uninstall; the Keychain survives it.
3. **OS-owned and native.**
   - Screen Time shields in `ManagedSettingsStore("ExcerLockEnforcement")`
   - DeviceActivity monitors: weekly windows `excerlock.window.*` and the one-shot watchdog `excerlock.watchdog.stage.*`
   - the App Group policy file
   - geofences registered through expo-task-manager
   - the walking keep-alive location task
   - pending local notifications

   These keep working with ExcerLock closed, but they can only **relock or follow the schedule**. Nothing native can unlock because a Condition was met (`modules/excerlock-enforcement/ios/EnforcementPolicy.swift` 141-176, via the enforcement agent's trace).

### 2.2 The cold-launch sequence

This runs on every cold launch. That includes a force quit, an iOS eviction, a reboot, an App Store update, an OTA reload (JS part only) and a background relaunch by a geofence.

1. **`app-next/index.js:3-8`** loads, in order:
   - Sentry
   - `runtime/productionRuntime.ts`, which registers the headless geofence bootstrap (`:13-15`)
   - the two `TaskManager.defineTask` location tasks (`activity/registerLocationTasks.ts:13-38`)
   - the expo-router entry
2. **expo-updates `ON_LOAD`** holds the splash for up to 3 s while it checks for an update (`app-next/app.config.ts:97-98`).
3. **`runtime/AppRoot.tsx:17-26`** renders nothing until the fonts load. Then `runtime/lib/AppRuntimeProvider.tsx:21-62` shows an empty `ScreenShell` while `createRealRuntime` runs:
   1. **Hydrate the 10 persisted stores** (`runtime/lib/createRealRuntime.ts:73`).
   2. **`accountData.prepare()`** (`runtime/AccountDataCoordinator.ts:131-143`). It copies the active account's data into the envelope `excerlock-next.account-data.v1` and sets `activeUserId=null`. It then **resets** the live Conditions, ruleDays, History, profile and account settings (gyms, auto-detect, stop grace). It also resets activity state: the detection store (generation +1), the step and walking-minute ledgers, and the gym log. The gym-log acceptance list is set to `[]` (`activity/ActivityAccountData.ts:26-52`, `activity/AsyncStorageGymVisitLog.ts:17-24`).
   3. **Client services** start: Sentry, PostHog, the Adapty adapter and the Supabase client (`runtime/createClientServices.ts:36-121`).
   4. **`client.boot()`** reads the Supabase session from the Keychain (`identity/lib/SupabaseAuthAdapter.ts:174-197`).
      - If the access token is near expiry, auth-js refreshes it over the network, retrying for up to 30 s (`node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:2568-2589`, plus `_refreshAccessToken` retries).
      - With no session it signs in anonymously, with a 5 s UI fallback (`:199-243`).
      - A read error or refresh error **throws, and the runtime fails** (G11, G12).
   5. **`reconcile('foreground')`** runs (`createRealRuntime.ts:769`). The account isn't active yet, so enforcement projects `unknown`, and `EnforcementHost` leaves native state untouched (`enforcement/RuntimeEnforcementSource.ts:43`, `enforcement/EnforcementHost.ts:54`). At the same time:
      - the reset settings make it **stop geofences** (`createRealRuntime.ts:313-324`) and stop the keep-alive (`:497-500`);
      - the live motion subscription starts, pinned to the current detection generation (`activity/DetectionService.ts:46-56`).
   6. **Listeners** are attached: stores, AppState, the 1 s clock (foreground only, `runtime/lib/NativeClockPort.ts:16-17`) and the headless geofence handler (`createRealRuntime.ts:770-796`).
4. **The identity spine runs in parallel** and needs the network, but no sign-in (`identity/lib/identityCoordinator.ts:184-244`). Steps:
   1. `PUT /v1/user`
   2. PostHog identify
   3. Adapty identify, which sets the Entitlement to `unknown` (`subscription/AdaptySubscriptionAdapter.ts:104-120`)
   4. attach the integration ID
   5. `prepareAccount` → `accountData.activate(userId)` restores the account (`createRealRuntime.ts:190-207`, `AccountDataCoordinator.ts:164-179`). The restore bumps the detection generation again, resets walking and propped state, and stamps every gym "coverage lost" (`ActivityAccountData.ts:53-75`).
5. **`launch/BootGate.tsx:17-20`** shows the logo until the stores hydrate and the runtime is ready. It then redirects by Journey phase, which is always `welcome`, so the user goes to `/onboarding/O01` (`journey/index.ts:26`, `launch/lib/bootDestination.ts:4`).
6. **Enforcement re-applies on its own** once the account is active and Adapty's profile is known. That includes unlocking earned time, relocking, and clearing for a lapse. **This happens while the user sits on Welcome; the sign-in gate never affects enforcement.**
7. **To reach Home** the user goes through:
   1. the Welcome "Sign in" sheet;
   2. a fresh Apple, Google or email-code authentication;
   3. `approveLaunchSignIn`, which is process-local (`identity/launchSignInGate.ts:14-19`);
   4. `verifySelectedAccount`, which waits for identity ready (up to 15 s), then `POST /v1/subscription/resync` (up to 15 s), then phase `setup` with a 5-minute in-memory lease (`journey/index.ts:94-125`, `subscription/ServerSubscriptionAdmission.ts:24-25,60-123`);
   5. `/setup/X1`;
   6. `SetupFlow` finding no needs;
   7. `finishSetup` → `/(tabs)/home` (`onboarding/lib/welcome/WelcomeFooter.tsx:17-23`, `setup/SetupRoute.tsx:38-53`).

### 2.3 Warm return (same process)

The Journey, the sign-in approval and the lease survive. On `active`:
- **Full reconcile:** refreshes location authorization, motion, step history, geofences and enforcement (`createRealRuntime.ts:781-785,309`).
- **Admission:** `refreshAdmission` runs if the phase is `app` (`runtime/lib/NativeRuntimeEffects.tsx:76-84`). The ADR 0059 renewal runs on the 1 s clock, which ticks in the foreground only (`launch/RootNavigator.tsx:38`). If the lease has expired, a full-window logo cover stays up for one server round trip (`RootNavigator.tsx:93-99`).
- **OTA:** the coordinator may reload JS (§5, moment 12).
- **Other refreshes:** notification and camera permission, shield copy and stride-gate config (`NativeRuntimeEffects.tsx:86-147`).
- **Identity:** a failed anonymous boot is retried (`SupabaseAuthAdapter.ts:384-397`).

---

## 3. State inventory

### 3.1 Persisted

| Storage | Key | Owner | Contents | Account-scoped? |
|---|---|---|---|---|
| AsyncStorage | `excerlock-next.onboarding.v1` | `onboarding/onboardingStore.ts:19-30` | step, answers (including the staged plan), complete, setupStep (written, never read), setupComplete, winbackDeclined | **No.** Device-wide; wiped only on deletion. |
| AsyncStorage | `excerlock-next.session.v1` | `identity/sessionStore.ts` | non-secret Session label | device |
| AsyncStorage | `excerlock-next.entitlement.v1` | `subscription/entitlementStore.ts` | Entitlement; set to `unknown` on every identify | device |
| AsyncStorage | `excerlock-next.permissions.v1` | `permissions/permissionsStore.ts` | last-seen permission states | device |
| AsyncStorage | `excerlock-next.settings.v1` | `preferences/settingsStore.ts` | settings; gyms, units, stopGrace and gymAutoDetect move with the account | partly |
| AsyncStorage | `excerlock-next.profile.v1`, `.rules.v1`, `.ruleDays.v1`, `.history.v1` | profile, conditions, progress | Profile, Conditions plus the Locked apps handle, Progress, History | yes, via the envelope |
| AsyncStorage | `excerlock-next.detection.v1` | `activity/detectionStore.ts` (manual persistence) | walking, propped and gym machine state, generation | yes |
| AsyncStorage | `excerlock-next.history-credit-ledger.v1`, `excerlock-next.walking-duration-ledger.v1` | activity | step credits, walking-minute segments | yes |
| AsyncStorage | `@excerlock/location/gym-transitions/v2`, `…-acceptance/v1`, `…-pruned-through/v1`, legacy key | `activity/AsyncStorageGymVisitLog.ts:3-6` | gym enter/exit records, accepted region IDs | yes |
| AsyncStorage | `excerlock-next.account-data.v1` | `runtime/AccountDataCoordinator.ts:27` | per-user snapshots, plus `activeUserId` and `lastUserId` | (the envelope itself) |
| AsyncStorage | `excerlock-next.selection-version.v1` | `createRealRuntime.ts:61` | Locked-apps version token | device |
| AsyncStorage | `excerlock-next.purchase-recovery.v1` | `subscription/PurchaseRecoveryJournal.ts:4` | pending or accountConnection purchase, plus the checkout UID | bound to the checkout UID |
| AsyncStorage | `excerlock-next.ota-guard.v1`, `.ota-envelope.v1`, `.ota-last-check.v1` | `updates/updates.ts:12-14` | reload-loop guard, resume route, last check time | device |
| AsyncStorage | `excerlock-next.incident-log.v1` | `support/IncidentLog.ts:18` | enforcement incidents | device |
| Keychain (expo-secure-store, default `WHEN_UNLOCKED`) | `excerlock-supabase-auth-v1` plus chunks | `identity/lib/secureStorage.ts:8,62-65` | Supabase access and refresh tokens | survives uninstall; **unreadable while the phone is locked** (`node_modules/expo-secure-store/ios/SecureStoreOptions.swift:8`) |
| App Group `group.com.johansardar.excerlock` | `enforcement-policy-v1.json` plus a lock file | `modules/excerlock-enforcement/ios/EnforcementPolicy.swift:47-53` | revision, state, relief, eligibleUntil, openReason, windows, watchdog registrations, a copy of the selection | written by the app and the monitor extension |
| App Group UserDefaults | `familyActivitySelectionIds["excerlock.selection.locked.v1"]` | react-native-device-activity picker | Locked apps | device |
| App Group UserDefaults | `excerlock.shield.copy-overrides.v1` | `enforcement/createShieldCopyWriter.ts` | PostHog shield copy | device |
| App Group UserDefaults | `excerlock.shield.current-cause.v1`, `excerlock.shield.runtime-context.v1` | read by `targets/ShieldConfiguration`, `targets/ShieldAction` | **never written anywhere** | - |

### 3.2 OS-owned

- **ManagedSettings shields and DeviceActivity monitors.** Up to 7 weekly windows plus one watchdog of at most 15 minutes. They persist across kill and app update; reboot persistence is platform behaviour [device].
- **CoreLocation regions** for `excerlock.gym-geofencing.v1`. They persist across kill and reboot, and a region event relaunches the app [device].
- **The location-updates task `excerlock.walk-location.v1`** (the keep-alive). It stops on force quit and reboot.
- **Pending `UNNotificationRequest`s:** `trial_ending` and `open_to_unlock`. `shield_open` is posted natively but is dead code (G07).
- **expo-updates stored bundles** and the Adapty SDK cache.

### 3.3 Memory only (lost on kill, eviction or OTA reload)

| Piece | Where | Consequence of losing it |
|---|---|---|
| Journey `phase`, `entryIntent`, `admission`, `error` | `journey/index.ts:26` | Every relaunch starts at Welcome; onboarding intent is forgotten (G01-G03) |
| Launch sign-in approval | `identity/launchSignInGate.ts:5` | The user must re-authenticate (G01) |
| Admission lease (5 min), `refreshing`, `lastRenewal` | `subscription/ServerSubscriptionAdmission.ts:52`, `journey/index.ts:43-44` | A server check is needed on every relaunch |
| Supabase identity `generation`, readiness, **pending email-code flow** | `identity/lib/SupabaseAuthAdapter.ts`, `identityCoordinator.ts` | A code typed after a kill is rejected ("Please request a code first", `:640-642`) |
| `SignInScreen` phase, email and code | `identity/SignInScreen.tsx:36-46` | The email must be retyped |
| Onboarding UI state (`demoReady`, `ratingReady`, `celebrating`) | `onboarding/OnboardingRoute.tsx:31-37` | The demo and rating have to be replayed |
| `SetupFlow` `passed` list | `setup/SetupFlow.tsx:45` | Recomputed from needs; harmless |
| Runtime: `committedWalking`, `committedGymPresence`, `appliedPolicy`, `deletionSuspended`, `stepsByDay`, `instanceMeasurements`, `regionsSignature`, `lastEnforcement`, status (history, scheduleIssue, shieldLifts) | `createRealRuntime.ts:85-90,161-164,280-284` | Rebuilt on boot; gyms are re-registered every launch |
| `EnforcementHost` watchdog `previous`, `windowsSignature`; source revision | `enforcement/EnforcementHost.ts:29-34`, `RuntimeEnforcementSource.ts:18-19` | Rebuilt from `getPolicyRevision` |
| Motion and placement buffers, region-presence maps, `lastLocation`, `AwakeSession` | activity (agent trace) | Live walking evidence restarts from zero |
| Walking session (`ruleId`, `scanGeneration`, step baseline) | `activity/NativeWalkingPort.ts:28-31` | Not resumed |
| Treadmill scan controller | `unlock/lib/gait/TreadmillScanController.ts:26-36` | The scan restarts from zero |
| Gym check-in UI (`working`, `lifted`) | `unlock/lib/useGymUnlock.ts` | Lost |
| OTA coordinator pending ID and sequence | `updates/updates.ts:415` | Native launches the stored update next cold start |
| `NotificationLandingHost` handled set | `runtime/lib/NotificationLandingHost.tsx:14` | - |
| Adapty loaded paywall handles | `AdaptySubscriptionAdapter.ts:107-108` | The paywall reloads |

---

## 4. What keeps running while ExcerLock is not in the foreground

| Mechanism | Suspended (backgrounded) | Killed or evicted | After reboot |
|---|---|---|---|
| Shields | Stay as last applied | Stay | Stay [device] |
| DeviceActivity windows (`targets/DeviceActivityMonitorExtension`) | Window start shields, unless open for lapsed, disabled, deleting, earned or live relief. Window end unshields, unless another window is active or open for earned/lapsed (`EnforcementPolicy.swift:159-176`) | Same | Same, but before first unlock the App Group file is unreadable and errors are swallowed by `try?` (`GuardedDeviceActivityMonitorExtension.swift:52-65`) [device] |
| Watchdog | During walking, propped or gym relief, a one-shot monitor of at most 15 min relocks if JS stops renewing (`ports/watchdog.ts:65-71`, `EnforcementPolicy.swift:141-153`) | Relief reverts to shield within 15 min | Same |
| Condition met → unlock | Only if a JS reconcile runs: geofence wake, committed motion event, keep-alive-driven events | **Never** until the app runs | Never |
| Geofences | Wake the process; the task appends the gym record, then a `reconcile('geofence')` runs (`registerLocationTasks.ts:14-27`, `createRealRuntime.ts:792-796`). Arrival needs a 30 s confirmation that only a later tick or full reconcile gives (G15) | iOS relaunches the app in the background; the whole runtime boots headless (`activity/headlessRegistry.ts:29-58`); fails if the Keychain is locked (G12) [device] | Same [device] |
| Location keep-alive | Runs when the lock state is shield or conditional and Always is granted (`activity/lib/detection/AwakeSession.ts:21-43`). Keeps the process alive, but the task only stores samples and never reconciles (`activity/lib/location/LocationTaskRuntime.ts:82-98`) | Stops; nothing restarts it until the app is opened | Stops |
| Motion | Live subscription runs while the process is alive (rejected after a cold launch, G05). CMPedometer history is queried on each **full** reconcile, so Walking targets backfill later (`createRealRuntime.ts:361-372`) | Nothing runs; steps backfill on the next full reconcile (7-day CoreMotion cap) | Same |
| Walking minutes | Need live verified observations (`activity/WalkingDurationLedger.ts:76-82`); no backfill | Lost while killed | Lost |
| Scheduled notifications | Fire | Fire | Fire |
| JS clock and admission renewal | Stopped (foreground only) | - | - |
| Background tasks | `UIBackgroundModes: ["location","fetch"]` (`config/native.ts:126`), but **no** fetch, BGTask or expo-background-task is registered. Only the two location tasks exist. | | |

---

## 5. Moment by moment

### 1. Fresh install, first open

**What the user sees**
1. Splash for up to 3 s (OTA check).
2. A blank gradient while the runtime boots, then the logo.
3. Welcome (O01), with **Get started** and "Already have an account? **Sign in**".
4. About 30 onboarding pages, including:
   - a notification prompt at S3d (`onboarding/OnboardingRoute.tsx:54-69`);
   - a rating prompt at S5;
   - the Condition demo at S3b.
5. The Paywall (Adapty, `onboarding` placement).
6. After purchase, "Create your account" (`app/sign-in.tsx`).
7. A blank verification screen.
8. Setup:
   - the staged plan is committed (`setup/SetupRoute.tsx:25-30`);
   - Screen Time authorization;
   - the app picker;
   - motion;
   - location (Always for Walking state);
   - gym.
9. Home.

**What the app does**
- Supabase signs in anonymously; after 5 s without an answer it continues with a provisional identity (`SupabaseAuthAdapter.ts:199-243`).
- The spine activates the anonymous account.
- The purchase is made under the anonymous UID and journaled as `accountConnection`. Sign-in **links** Apple or Google to that UID, so the purchase stays bound (`SupabaseAuthAdapter.ts:527-561`).
- Enforcement is `open/disabled` until Screen Time is authorized and a selection exists (`enforcement/lib/projectEnforcement.ts:28`). After that it publishes windows and shields.

**Offline first open**
- Onboarding works.
- The Paywall can't load, because Adapty identify needs the backend and the identity never becomes ready (`subscription/README.md:25`).

**Reinstall**
- The Keychain session survives uninstall, so the old account is restored. AsyncStorage is empty, so there are no Conditions, History or gyms, and cloud sync is unimplemented: every sync call throws (`createRealRuntime.ts:698-708`). See G21.

**Verdict:** the happy path is sound. Gaps: G04 (blank screens), G02 and G03 (a kill during first run), G21 (reinstall).

### 2a. Reopening mid-onboarding (warm)

- The Journey phase `onboarding` and the route param survive, so the user is on the same page.
- OTA never reloads on onboarding routes (`updates/updates.ts:69-74`).

**Verdict:** correct.

### 2b. Reopening mid-onboarding after a kill or eviction

**What the user sees:** Welcome (O01).

**What happens:**
- Answers are prefilled from the persisted store.
- The persisted `step` is overwritten with `O01` as soon as O01 mounts, because `BootGate` always routes with an explicit `step=O01` param. So `resumeStep` never runs (`launch/lib/bootDestination.ts:4`, `onboarding/lib/useOnboarding.ts:29,38-39`, `onboarding/lib/flow.ts:71-78`).
- The user must tap Continue through every page again and replay the demo and rating screens.
- The staged plan `ruleId` survives.

**Verdict:** a top app resumes on the last page. See G02.

### 3. Reopening on the Paywall

**Warm:** the user stays on the Paywall.
- An in-flight StoreKit purchase continues.
- The recovery journal is persisted, and Ask-to-Buy shows `pendingPurchase` (`journey/index.ts:53-57`).
- OTA never reloads here.

**After a kill:** Welcome. The persisted step `P` is ignored.
- **If they paid before signing in:** the journal says `accountConnection`, but only `PaywallSlot` reads it (`paywall/PaywallSlot.tsx:49-51`). Welcome shows nothing about the purchase.
  - "Sign in" on Welcome does work: it links to the anonymous UID that owns the purchase. But the sheet says "Welcome back / Sign in to the account you already have" (`identity/lib/signInCopy.ts:8-14`).
  - "Get started" makes them redo onboarding to get back to the Paywall.

**Verdict:** a top app reopens straight on the Paywall, or on "finish creating your account" after a purchase. See G03.

### 4. Reopening mid-Setup

**Warm:**
- The lease is renewed while the app is active (`journey/index.ts:147-155`, `RootNavigator.tsx:38`).
- While the user is in iOS Settings (`setup/SetupFlow.tsx:85`) the clock doesn't tick. On return an expired lease shows the logo cover for one round trip. If the server can't answer, the result is "unavailable" and the user sees the verification error screen (G13).
- Revoking a privacy permission in Settings typically makes iOS terminate the app [device], which turns this into a cold launch.

**After a kill:**
1. Welcome.
2. Sign in, then verification.
3. `/setup/X1` resumes at the first unmet need. Needs are recomputed from persisted permissions, the Locked apps selection and the Conditions (`SetupFlow.tsx:35-44`).

Notes:
- The staged plan was already committed when Setup mounted.
- `setupStep` is persisted but never read.
- Shields apply as soon as Screen Time and a selection exist, whether or not Setup is complete.

**Verdict:** it resumes at the right need, but only after G01, plus G04's blank screens.

### 5. Reopening after Setup is complete (Home)

**Warm, under 5 minutes:**
- Same tab.
- A full reconcile refreshes Progress.
- A silent server re-check runs on every foreground (`NativeRuntimeEffects.tsx:76-84`).

**Warm, over 5 minutes:** the logo cover stays up for up to one round trip (15 s timeout). Then:
- eligible → the user continues where they were;
- ineligible → the Paywall (`win-back` placement);
- unavailable without a live lease → the verifying screen (`journey/index.ts:178-185`).

**Warm return when an OTA is pending:** JS reloads and the user lands on Welcome (G09).

**Cold, including iOS eviction:** G01.

**While away:**
- Windows lock and unlock on schedule.
- A Condition met while away doesn't unlock (G07).
- If the user had earned an unlock, it holds until its relock boundary (`lock/resolveLock.ts`, `projectEnforcement.ts:35-38`).

**Verdict:** warm is good apart from G09, G13 and G07. Cold fails (G01).

### 6. Reopening during an unlock

**Treadmill scan (`/unlock/treadmill`, camera)**
- **Background:** the camera stops. On return the scan restarts from zero (`unlock/TreadmillUnlockScreen.tsx:81-85`).
- **Back after more than 5 minutes** with an unavailable server: the unlock routes are guarded by `canEnterApp`, so the modal unmounts (`RootNavigator.tsx:83-86`).
- **Kill:** the camera session ends. The restore resets propped state (`ActivityAccountData.ts:66`). A cold launch lands on Welcome.
- OTA can't reload while the camera is on or on this route.

**Gym check-in (`/unlock/gym`)**
- `checkIn` writes an enter record, and the screen shows "lifted" immediately (`unlock/lib/useGymUnlock.ts:120-128`).
- The real Gym presence needs 30 s plus a later tick or full reconcile (`activity/gymMachine.ts:108-122`, `activity/presence.ts:1`).
- **Background before 30 s:** nothing confirms the visit until the user returns.
- **Kill after the record:** the restore marks the gym coverage-lost and cancels the pending arrival (G15).
- **Without Always location plus auto-detect,** the record is dropped entirely, while the UI still says unlocked (G06).

**Walking check and session (`WalkingCheckButton` → `walking.check`)**
- A 3 s qualification loop runs in memory (`NativeWalkingPort.ts:58-77`). It pauses in the background and is lost on kill.
- **Walking state relief in the background** depends on the live motion subscription, which is stale after any cold launch (G05).
- **After a kill,** any relief already applied reverts within 15 minutes, when the watchdog fires.

**Verdict:** restarting a camera scan is acceptable. Gym check-in showing success that never reaches enforcement is not (G06, G15).

### 7. Background, then return

**In the background:**
- An AppState `background` change triggers one tick-mode reconcile (`createRealRuntime.ts:781-785`).
- The clock, admission renewal and gym confirmation stop.
- The keep-alive (if running) keeps the process alive, but nothing re-evaluates gym arrival, and motion events are rejected after a cold launch (G05).
- Lock changes come from a geofence or a committed motion event.

**On return:** see §2.3.

**Verdict:** under 5 minutes is fine. Over 5 minutes adds a server check that can strand the user (G13). A pending OTA bounces them to Welcome (G09).

### 8. Force quit

**Lost:** everything in §3.3.

**What keeps running (§4):**
- shields and windows;
- the watchdog, which relocks relief within 15 minutes;
- geofences, which still relaunch the app [device];
- pending notifications.

**What stops:** the keep-alive.

**Next open:** a cold launch with G01. A geofence relaunch boots the runtime headless, which fails if the phone is locked (G12).

**Verdict:** the lock stays safe because it fails closed. Restoring the UI is the problem.

### 9. Phone restart

- Same as force quit.
- **Before first unlock:** AsyncStorage and the App Group file are unreadable under default data protection, and the Keychain stays unreadable whenever the phone is locked. A window boundary or geofence before the first unlock can fail silently [device] (G31).
- The keep-alive stays off until the app is opened.

### 10. Offline launch

**Token still fresh (used within about the last hour):**
- The runtime boots.
- The spine fails at `PUT /v1/user`, so the account is never activated. The live stores stay empty and enforcement stays frozen at `unknown`: no walking or gym relief can apply, and nothing is newly applied.
- Geofences and the keep-alive are switched off (G16).
- Welcome shows. Sign-in fails with "That didn't work. Please try again." Home is unreachable.

**Token stale:**
- auth-js refreshes for about 30 s, then `getSession` returns an error.
- `runBoot` throws `STORAGE_READ_FAILED` (`SupabaseAuthAdapter.ts:184-196`), and `createRealRuntime` rejects (`:767,801-811`).
- `AppRuntimeProvider` retries once (another 30 s or so), then shows "Let's try that again." If cleanup also failed, it shows "Please close ExcerLock and open it again." instead (`AppRuntimeProvider.tsx:28-31,44-62`).
- **Nothing in the app is usable, not even Welcome** (G11).

**Native:** windows and the watchdog keep working, and shields keep their last state.

**Verdict:** a top app opens offline to cached Home. ExcerLock needs the server for every entry (G09, G11, G14).

### 11. Slow network

| Step | Time it can take |
|---|---|
| Splash (OTA) | up to 3 s |
| Token refresh, blank screen | up to 30 s, retried |
| Welcome | - |
| Provider sign-in | network |
| Identity ready, blank verifying screen | up to 15 s |
| Resync | up to 15 s |
| Blank Setup | - |
| Home | - |

Other effects:
- Adapty's 3 s profile budget leaves the Entitlement `unknown`, so enforcement is preserved until the profile arrives.
- A foreground return after more than 5 minutes shows the logo cover for up to 15 s.

**Verdict:** there are no progress indicators or cached-state fallback (G04).

### 12. OTA downloaded or applied

**Checks:**
- Native `ON_LOAD` checks at every cold launch, holding the splash for up to 3 s. An update that finishes in time runs immediately.
- An update that finishes later becomes pending (`updates/updates.ts:432-493`).

**Applying a pending update:**
- It is applied only on a later **foreground return** (`:593-652`), and only if all of these hold (`:69-74,97-112,868-965`):
  - the route is one of `/home`, `/conditions`, `/analytics` or `/settings`;
  - no purchase is in progress;
  - no permission prompt is open;
  - the camera is off;
  - no walking or propped activity is running.
- **Reloading resets the Journey and the sign-in approval**, so `OtaResumeHost` sees `canEnterApp=false` and **always denies** the envelope. The user lands on Welcome and must sign in again (`runtime/lib/OtaResumeHost.tsx:25-29`) (G09).

**JS checks:**
- A JS check runs only after at least 6 h in the background and at least 6 h since the last check (`:114-128`). A failed check still records its time, so being offline blocks checks for 6 h.
- The reload guard allows 2 attempts per update ID.

**Not on this branch:** the first-launch catch-up (branch `JohanSardar/ota-first-launch`).

**Native state is unaffected.**

### 13. Sign out (Settings → Account)

**What happens** (`settings/AccountScreen.tsx:17-33`, `SupabaseAuthAdapter.ts:729-764`, `createRealRuntime.ts:183-189`):
1. Walking and detection stop.
2. The account data is deactivated: snapshotted to the envelope, and the live stores reset.
3. PostHog is reset and Adapty logs out.
4. Supabase signs out locally, then signs in anonymously.
5. `beginWelcome` → O01.

**Enforcement:**
- It stays `unknown`, keeping the old locks, until the anonymous identity is ready.
- Then `prepareAccount` sees a changed account: it **erases the Locked apps selection** and the projection becomes `open/disabled`, which stops all windows (`createRealRuntime.ts:190-200`).
- The trial reminder is cancelled through the Entitlement change. Delivered notifications stay.
- If the anonymous sign-in fails, the old shields and windows keep enforcing indefinitely (G26).

**Signing back in:**
1. "Continue with Apple" tries to link Apple to the anonymous user and conflicts.
2. The user sees "You already have an account. Tap below to use it."
3. A second Apple prompt runs through "Recover with Apple" (`SupabaseAuthAdapter.ts:542-545`, `SignInScreen.tsx:100-108,246-269`).
4. Activation restores the Conditions but **erases Locked apps again** (`lastUserId` is the anonymous user).
5. Setup asks the user to pick apps again (G17).

### 14. Delete account

**What happens** (`SupabaseAuthAdapter.ts:836-923`, `createRealRuntime.ts:208-244`, `runtime/lib/eraseProductionData.ts`):
1. A confirmation sheet.
2. `beforeDelete` opens enforcement (`deleting`) and stops walking, the camera, the keep-alive, geofences and detection.
3. `DELETE /v1/user`.
4. `afterDelete`:
   - erases the selection;
   - wipes every store, including onboarding, detection, the ledgers and the gym log;
   - cancels the 3 notification IDs;
   - erases the envelope entry.
5. Supabase signs out, then signs in anonymously, then Welcome.

**Failure cases:**
- **Offline:** the fetch fails, `AuthPendingDeletionError` is thrown, and the identity is left as `deleting`. Enforcement stays open, detection stays off, and `RootNavigator` sends the user to the Paywall until they relaunch (G24).
- **5xx:** the identity is restored and an error is shown.

**Copy mismatch:** the sheet says "Your conditions, progress, locked apps and settings stay on this device" (`settings/lib/settingsCopy.ts:78-84`), but the code erases all of them (G25).

### 15. Subscription renews, lapses, is refunded or is in billing grace

**Renews:**
- The Adapty webhook updates the server mirror, the next resync is eligible, and nothing is visible to the user.
- If the renewal webhook arrives after the old expiry, the server reports `expired`, the user is judged ineligible and sent to the Paywall (`server/src/packages/subscriptions/lib/repository.ts:22`) (G32).

**Lapses (expired, or a billing issue after grace):**
- **In app:** the next renewal (about every 4 minutes while active) or foreground check returns ineligible → `beginPaywall` → the win-back Paywall with Close → Welcome (`paywall/PaywallSlot.tsx:15-16,65-74`).
- **Enforcement:** the Adapty status is no longer active, so it projects `open/lapsed` and windows stop (`projectEnforcement.ts:30-33`).
- **While killed:** windows keep locking until the app runs online and Adapty's profile loads (G19).

**Refund:** Adapty sets `is_active=false`, which behaves the same as a lapse.

**Billing grace:** handled correctly.
- Adapty `is_active=true` plus `is_in_grace_period` → the server says `active` (`server/src/packages/subscriptions/lib/service.ts:22-27`, `repository.ts:22`).
- The client keeps enforcing (`projectEnforcement.ts:33`).
- After grace, billing retry → `billingIssue` → Paywall plus unlock.

**Trial → paid:** seamless. The `trial_ending` reminder fires 2 days before the end (`notifications/notificationPlan.ts:5-10`).

### 16. A different account signs in on the same phone

**What happens:**
1. The sheet re-authenticates and returns a different UID.
2. The previous session is restored, with the message "Please use the account you signed up with." and a "Recover with …" button (`SupabaseAuthAdapter.ts:519-522`, `SignInScreen.tsx:109-111`).
3. Recovery:
   - deactivates U1 (whose data stays in the envelope);
   - signs in U2;
   - restores U2's earlier data on this phone, or starts empty;
   - erases Locked apps, so apps are open and windows stopped;
   - verifies U2's subscription;
   - Setup asks for Screen Time and apps again.

**Device-wide carry-over:** `onboardingStore` (answers, `setupComplete`) carries across accounts. An unpaid second account that has signed in gets the `win-back` placement (G33).

**Verdict:** the data isolation is sound; the copy and flow are confusing.

### 17. Permissions revoked in iOS Settings

| Permission | What happens |
|---|---|
| Screen Time | iOS removes the authorization [device: shields cleared]. Authorization is only polled during a reconcile; there's no observer. The next foreground gives `open/disabled`, windows stop, and Home shows the "apps" setup reminder (`permissions/setupNeeds.ts:21`, `home/lib/SetupReminder.tsx`). |
| Location (Always → When In Use or Never) | Seen only on a foreground reconcile (`createRealRuntime.ts:309`). Regions stop (`:313-323`), the keep-alive can't run, and Walking state shows a setup need. iOS typically terminates a running app on revocation → cold launch → G01 [device]. |
| Motion | Step queries are skipped, but the running service isn't stopped. Walking progress freezes and the "motion" need appears. |
| Notifications | `trial_ending` is cancelled. `open_to_unlock` scheduling throws and is reported to Sentry on every attempt (`notifications/lib/LocalNotifications.ts:18-21`). |
| Camera | Re-read on foreground; the treadmill scan asks again or links to Settings. |

**While killed:** none of this is noticed until the user opens the app (G22).

### 18. App updated from the App Store

- iOS terminates the old binary, so the next launch is cold (G01).
- **What persists:** the Keychain, AsyncStorage, the App Group, DeviceActivity monitors and shields. Extensions are replaced.
- **Geofences** persist [device]. The keep-alive stops.
- **OTAs:** runtime is the fixed string `'4'` (`app-next/app.config.ts:71`). expo-updates natively picks the newer of the embedded bundle and any stored update.
- **Risk:** the policy record has no migration. A future version bump would make `getPolicyRevision` throw and the runtime unable to start (`ExcerlockEnforcementModule.swift:259`, `createRealRuntime.ts:270`) (G30).

### Extra: iOS evicting a backgrounded app

This is just as much a cold launch as a force quit, and it happens to many users daily. It multiplies G01, G02, G03, G05, G08 and G15.

---

## 6. Gap register

**Confidence key:**
- **code:** deterministic from the code.
- **code+iOS:** depends on documented iOS behaviour.
- **[device]:** needs a device proof.

| ID | Gap | Severity | Moments | Files | Confidence |
|---|---|---|---|---|---|
| G01 | Every cold launch resets the Journey to `welcome` and the sign-in approval to denied. Subscribers land on O01 and must find "Sign in", authenticate and verify. The cached Session, Setup and Entitlement are ignored by design (ADR 0049/0050). | every user | 4, 5, 6, 8, 9, 12, 17, 18 | `journey/index.ts:26`, `identity/launchSignInGate.ts:5,36-46`, `launch/BootGate.tsx:17-20`, `launch/lib/bootDestination.ts:4`, `launch/RootNavigator.tsx:55-89`, `onboarding/lib/welcome/WelcomeFooter.tsx:27-40`, `docs/adr/0049…`, `0050…` | code |
| G02 | The onboarding step is persisted, but every cold launch routes with `step=O01`, which overwrites it. The user re-taps all pages and replays the demo and rating. | every user who leaves mid-onboarding | 2b | `launch/lib/bootDestination.ts:4-5`, `onboarding/lib/useOnboarding.ts:29,38-39,63-70`, `onboarding/lib/flow.ts:71-78`, `onboarding/onboardingStore.ts` | code |
| G03 | A cold reopen on the Paywall returns to O01. A purchase completed before sign-in isn't surfaced on Welcome, because only `PaywallSlot` reads the recovery journal, and the Welcome sign-in copy says "Welcome back". | every user who leaves the Paywall | 3 | `paywall/PaywallSlot.tsx:49-74`, `journey/index.ts:53-57`, `subscription/PurchaseRecoveryJournal.ts`, `identity/lib/signInCopy.ts:8-14` | code |
| G04 | Verification renders `null` (a blank screen) while `phase==='verifying'` without an error. `SetupRoute` and `SetupFlow` render empty shells before auto-finishing. The runtime boot shows an empty `ScreenShell`. There's no progress indicator; on a slow network this lasts up to about 30 s. | every user | 1, 4, 5, 11 | `app/sign-in.tsx:22-30`, `setup/SetupRoute.tsx:54`, `setup/SetupFlow.tsx:66`, `runtime/lib/AppRuntimeProvider.tsx:44-62` | code |
| G05 | `DetectionService.start` captures the detection generation before account activation. Activation bumps the generation, so every later live motion and placement event throws "Obsolete detection generation". `start()` never resubscribes because `disposers` is non-empty. Walking only advances through the 1 s foreground tick, so Walking state relief and minute accrual don't work while ExcerLock is in the background, after any cold launch. | every user (Walking state, walking minutes, propped) | 5, 6, 7, 8 | `activity/DetectionService.ts:46-56,196-218`, `activity/ActivityAccountData.ts:61-68`, `runtime/lib/createRealRuntime.ts:190-207,312`, `runtime/lib/NativeClockPort.ts:16-17` | code; [device] for the user-visible effect |
| G06 | The gym-log acceptance list is reset to `[]` on every launch (prepare and restore) and refilled only by `registerSavedGyms`, which needs Always plus auto-detect. Manual check-in records are dropped, but `checkIn` still resolves "inside" and the screen shows lifted. Gym rules only ask for When In Use. | every user (gym check-in without auto-detect) | 6 | `activity/AsyncStorageGymVisitLog.ts:17-35,41-45`, `activity/lib/detection/GymRegionAdapter.ts:18-19`, `activity/ActivityAccountData.ts:50,55,59`, `activity/lib/location/NativeLocationProvider.ts:180-191`, `activity/NativeGymPort.ts:47-51`, `unlock/lib/useGymUnlock.ts:120-128`, `permissions/setupNeeds.ts:29-33` | code; [device] |
| G07 | Nothing native can unlock when a Condition is met; the extension only applies the schedule and relocks. The shield shows only "Close" because `excerlock.shield.runtime-context.v1` is never written. The "Open ExcerLock" route and the `shield_open` notification are therefore dead. `open_to_unlock` fires only in a narrow case: a background full reconcile, without Always, for a walking target. | every user | 5, 8, 9 | `targets/ShieldConfiguration/ShieldContent.swift:40-60,97-105`, `targets/ShieldAction/ShieldActionExtension.swift:7-14`, `targets/ShieldAction/ShieldActionRoute.swift:4-16`, `modules/excerlock-enforcement/ios/EnforcementPolicy.swift:141-176`, `runtime/lib/createRealRuntime.ts:471-487` | code |
| G08 | The walking-minute ledger is restored with an older generation. The first observation after a relaunch wipes it, and Progress is `max(old, new)`, so minutes after a relaunch don't count until they pass the earlier total. | every user (walking minutes, mid-day relaunch) | 5, 8 | `activity/WalkingDurationLedger.ts:56-65`, `progress/projectInstanceProgress.ts:139-150`, `activity/ActivityAccountData.ts:63,72` | code |
| G09 | An OTA pending at foreground is applied on a tab root. The reload resets the Journey and sign-in approval, so `OtaResumeHost` always denies the envelope. A signed-in user is sent to Welcome mid-session after OTAs that missed the 3 s launch window, or after a 6 h+ background check. | some users (after each OTA) | 5, 7, 12 | `updates/updates.ts:593-652,868-965`, `runtime/lib/OtaResumeHost.tsx:18-34`, `runtime/lib/NativeRuntimeEffects.tsx:36-56` | code |
| G10 | A notification tap on a cold launch is pushed while the Journey is `welcome`. The guarded route can't open, and the response is cleared anyway, so the target is lost after sign-in. | some users | 8, 15 | `runtime/lib/NotificationLandingHost.tsx:11-31`, `notifications/notificationPlan.ts:15-21` | code |
| G11 | An offline cold launch with an access token past about an hour: auth-js retries the refresh for 30 s and then errors, `runBoot` throws, and the runtime fails. After one automatic retry, the whole app shows "Let's try that again." A slow network shows a long blank screen. | some users | 10, 11 | `identity/lib/SupabaseAuthAdapter.ts:174-197`, `node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:2568-2589`, `runtime/lib/createRealRuntime.ts:767,801-811`, `runtime/lib/AppRuntimeProvider.tsx:21-62` | code; [device] |
| G12 | A geofence relaunch boots the runtime headless. The Supabase session is in the Keychain with the default `WHEN_UNLOCKED`, so with the phone locked `boot()` throws and the runtime fails. `prepare()` has already reset the stores and the acceptance list, so later geofence records are dropped too. When the user opens the app, the process shows "Let's try that again". | some users (gym, killed app) | 8, 9 | `identity/lib/secureStorage.ts:62-65`, `node_modules/expo-secure-store/ios/SecureStoreOptions.swift:8`, `runtime/productionRuntime.ts:13-15`, `activity/headlessRegistry.ts:29-58`, `activity/registerLocationTasks.ts:14-27` | code+iOS [device] |
| G13 | Returning after more than 5 minutes needs a successful resync. If it is unavailable (offline, server slow or down, Adapty down), the Journey drops to `verifying`, `(tabs)` and modals unmount, and the user sees "Let's try that again" / "Back to start". | some users | 4, 5, 6, 7 | `journey/index.ts:157-187`, `launch/RootNavigator.tsx:69-86`, `subscription/ServerSubscriptionAdmission.ts:24,60-123`, `docs/adr/0059…` | code |
| G14 | Entry depends on our VM and on Adapty: `PUT /v1/user` for identity readiness and `/v1/subscription/resync`, which calls Adapty first. An outage locks every subscriber out of the app UI on cold launch. A missing webhook observation returns `unknown`, so the user is stuck on retry. | some users (every user during an outage) | 5, 10, 11 | `identity/lib/identityCoordinator.ts:193-209`, `subscription/ServerSubscriptionAdmission.ts:97-105`, `server/src/packages/subscriptions/README.md` | code |
| G15 | Every cold start stamps gyms coverage-lost, which closes open visits and cancels pending arrivals. Arrival needs a 30 s confirmation that only a foreground tick or a later full reconcile provides. There's no background timer, and the walk task never reconciles, so Gym presence never starts while ExcerLock is in the background or killed. | some users (gym) | 6, 7, 8 | `activity/ActivityAccountData.ts:67`, `activity/gymMachine.ts:83-122`, `activity/presence.ts:1`, `runtime/lib/NativeClockPort.ts:16-17`, `activity/lib/location/LocationTaskRuntime.ts:82-98`, `runtime/lib/createRealRuntime.ts:752-765` | code |
| G16 | Before activation, the first reconcile runs on reset settings and **stops geofences and the keep-alive**. If activation never happens in that session (offline, server down, locked Keychain), they stay off. After a kill, iOS can't relaunch the app on arrival, and enforcement is frozen at `unknown`. | some users | 10, 11 | `runtime/AccountDataCoordinator.ts:131-143`, `runtime/lib/createRealRuntime.ts:313-324,497-500`, `enforcement/RuntimeEnforcementSource.ts:43` | code |
| G17 | Signing out and back in: the anonymous activation erases Locked apps, and so does the re-sign-in, because `lastUserId` is the anonymous user. Sign-in from the anonymous state conflicts on link, so it needs "You already have an account" plus a second provider prompt. The user re-picks apps in Setup. | some users | 13, 16 | `runtime/lib/createRealRuntime.ts:190-200`, `runtime/AccountDataCoordinator.ts:164-179`, `identity/lib/SupabaseAuthAdapter.ts:527-561,563-594`, `identity/SignInScreen.tsx:98-116,246-269` | code |
| G18 | A returning subscriber who taps Get started redoes onboarding. `stagePlan` re-stages with the same `ruleId`, and the Setup mount's `commitStagedPlan` replaces that Condition and the profile fields, silently overwriting later edits. They also face a Paywall they have already paid for (already_subscribed → restore). | some users | 2b, 3, 4 | `onboarding/lib/plan.ts:11-56`, `setup/SetupRoute.tsx:17-30`, `paywall/lib/PaywallScreen.tsx:116-160` | code |
| G19 | A lapse or refund while ExcerLock is closed: windows keep locking until the app runs online. Each launch's Adapty identify sets the Entitlement to `unknown`, which preserves the state until the profile loads; offline that persists for the whole session. | some users | 15, 10 | `subscription/AdaptySubscriptionAdapter.ts:104-120`, `enforcement/lib/projectEnforcement.ts:29-33`, `EnforcementPolicy.swift:159-176` | code |
| G20 | The trial reminder ignores the in-app notifications toggle; only the OS permission is checked. Delivered notifications are never removed. A denied permission makes `open_to_unlock` throw and report to Sentry each time. | some users | 13, 14, 17 | `runtime/lib/NativeRuntimeEffects.tsx:86-104`, `runtime/lib/createRealRuntime.ts:485-486`, `notifications/lib/LocalNotifications.ts:18-21` | code |
| G21 | Reinstall or a new phone: the Keychain restores the account, but Conditions, History, gyms and Locked apps are gone. There's no cloud copy; the sync port throws. | some users | 1 | `runtime/lib/createRealRuntime.ts:698-708`, `runtime/AccountDataCoordinator.ts` | code |
| G22 | Permission changes are noticed only on a foreground full reconcile; there are no observers. A motion denial doesn't stop the running detection service. A user who revokes Screen Time or location while the app is closed gets no feedback until they open it. | some users | 17 | `runtime/lib/createRealRuntime.ts:306-349`, agent trace `NativeScreenTimePort` | code |
| G23 | Account activation isn't serialized with the reconcile queue: `prepareAccount` doesn't `await queue`. A reconcile in flight can write ruleDays and History computed from the empty pre-activation snapshot over the restored data, sealing unsealed past days as "not met". That would be permanent History and Streak loss. | rare edge | 5, 8 | `runtime/lib/createRealRuntime.ts:190-207,370-434`, `runtime/AccountDataCoordinator.ts:164-179`, `progress/sealDay.ts:19-42` | code (race); needs a targeted proof |
| G24 | Offline account deletion: the network failure leaves the identity as `deleting` with no rollback. Enforcement stays open, detection and geofences stay off, and the user is routed to the Paywall until they relaunch. | rare edge | 14 | `identity/lib/SupabaseAuthAdapter.ts:871-879`, `runtime/lib/createRealRuntime.ts:208-220,776-779`, `launch/RootNavigator.tsx:24-37` | code |
| G25 | The delete sheet promises that "conditions, progress, locked apps and settings stay on this device", but `afterDelete` erases all of them. | some users | 14 | `settings/lib/settingsCopy.ts:78-84`, `runtime/lib/createRealRuntime.ts:221-244`, `runtime/lib/eraseProductionData.ts` | code |
| G26 | If anonymous sign-in fails after sign-out, the identity never becomes ready, enforcement stays `unknown`, and the old account's shields and windows keep enforcing indefinitely. | rare edge | 13 | `identity/lib/SupabaseAuthAdapter.ts:750-756`, `enforcement/RuntimeEnforcementSource.ts:43` | code |
| G27 | Revoked or expired refresh token on a running app: `SIGNED_OUT` makes the identity provisional, a foreground retry creates a **new anonymous user**, the changed account erases Locked apps, and Home bounces to the Paywall. | rare edge | 5, 7 | `identity/lib/SupabaseAuthAdapter.ts:310-337,384-397`, `launch/RootNavigator.tsx:35-36` | code |
| G28 | Splitting at midnight can create window pieces shorter than 15 minutes (for example 23:50-00:30). Native `replaceWindows` throws after `publish` has already stopped the old windows, so there are no windows. In open or earned states nothing fails closed, so the next window won't lock while the app is closed. | rare edge | 8, 9 | `schedule/scheduleWindowPlan.ts:8-14`, `conditions/validateRule.ts:59`, `modules/excerlock-enforcement/ios/ExcerlockEnforcementModule.swift:293-307,472` | code |
| G29 | On a revision change the old committed watchdog leaves the record but isn't stopped. If iOS keeps ended one-shot monitors listed, the `activities.count < 20` guard eventually rejects staging, the app fails closed and the user stays locked while walking. | rare edge | 6, 7 | `ExcerlockEnforcementModule.swift:284-288,344` | code; [device] |
| G30 | The App Group policy record has no version migration. A future bump makes `getPolicyRevision` throw, so the runtime can't start after an App Store update. | rare edge | 18 | `ExcerlockEnforcementModule.swift:259`, `runtime/lib/createRealRuntime.ts:270` | code |
| G31 | Reboot: the policy file uses default data protection, and the extension swallows errors with `try?`. A window boundary before the first unlock may silently fail to shield. | rare edge | 9 | `modules/excerlock-enforcement/ios/EnforcementPolicy.swift:53`, `targets/DeviceActivityMonitorExtension/GuardedDeviceActivityMonitorExtension.swift:52-65` | [device] |
| G32 | If the renewal webhook lands after the old `expiresAt`, the server reports `expired` → ineligible, and a paying user is sent to the Paywall. | rare edge | 15 | `server/src/packages/subscriptions/lib/repository.ts:20-34`, `subscription/ServerSubscriptionAdmission.ts:98-101` | code |
| G33 | Onboarding and Setup flags are device-wide. A second account inherits `setupComplete` and gets the win-back placement and Close. | rare edge | 16 | `onboarding/onboardingStore.ts`, `paywall/PaywallSlot.tsx:15-16` | code |
| G34 | A native selection that is missing while JS still holds a handle makes shielding throw. The fail-closed path fails too, and the extension skips silently, so apps stay open. | rare edge | 9, 18 | `EnforcementPolicy.swift:57-62`, `enforcement/EnforcementHost.ts:126-135` | code |

**Housekeeping found along the way (not lifecycle bugs):**
- `onboardingStore.setupStep` is written but never read.
- `clearLaunchSignIn` has no caller.
- `UIBackgroundModes` declares `fetch` with no task.
- The `app-selection` README describes a non-existent `NativeShieldScheduler`.
- The activity README is stale on keep-alive accuracy and on the 10 s vs 30 s confirmation.

---

## 7. How a top consumer app would behave, and the size of the gap

| Expectation | ExcerLock today |
|---|---|
| Reopen exactly where I left off | Only warm. Cold, OTA and eviction always restart at Welcome (G01-G03, G09). |
| Never repeat a step | Onboarding, sign-in and the app picker repeat (G02, G17, G18). |
| Never a stale or wrong screen | Blank screens during boot and verification (G04). Check-in says unlocked when it isn't (G06). The error screen appears after 5 minutes offline (G13). |
| Works offline with the last known state | The whole UI needs the server; offline with a stale token the app can't even start (G11, G14). |
| Apps locked or unlocked correctly with the app closed | **Locking is robust**, because the extension and watchdog fail closed. **Unlocking isn't:** met Conditions, background walking and gym arrival all wait for the user to open ExcerLock (G05, G07, G15), and walking minutes are lost across relaunches (G08). |

**Suggested proof order once fixes land:**
1. G05, G06 and G08: device walking, check-in and relaunch.
2. G12 and G15: a locked-phone gym arrival with the app killed.
3. G11: airplane mode cold launch more than 1 h after last use.
4. G09: an OTA pending then foreground.

Each needs a device, not the simulator.
