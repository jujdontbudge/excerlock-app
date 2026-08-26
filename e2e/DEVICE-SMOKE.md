# ExcerLock physical-device smoke suite

This is the milestone gate for native behavior that the simulator cannot prove. Scope corrected twice — 2026-08-01 and again 2026-08-04: on a fresh iOS 26.4.1 simulator, real FamilyControls authorization **completes silently** (no sheet), so even the authorized state is simulator-reachable now. What belongs here is what a simulator still cannot prove: the **deny path** (no sheet means nothing can be refused), **real shield enforcement** (does the shield actually block the app), background wakes, and motion truth — see `docs/research/familycontrols-on-simulator.md`.
Run it on a real iPhone with iOS 17.4 or later, using the development client
with fixture mode off. Record every result in `DEVICE-SMOKE-RESULTS.md` as
`PASS`, `FAIL`, `BLOCKED`, or `NOT RUN`; absence of a crash is not a pass.

The current production shield limitation from #92 is part of the oracle:
although four variants compile, the app does not publish cause/offer/copy into
the app group yet. A real shield should therefore show only the bundled
**balance-empty variant**. Do not fail it for not showing the Full Lock copy;
do fail missing, blank, malformed, or non-ExcerLock shield content.

## 1. Build and install the device client

### Hardware and signing prerequisites

- A data-capable cable. The known device `Il` is an iPhone 13, so use a
  USB-C-to-Lightning data cable (or a data-capable Lightning cable plus the
  appropriate Mac adapter), not a charge-only cable.
- Unlock the iPhone, accept **Trust This Computer**, and enter its passcode.
- Enable **Settings › Privacy & Security › Developer Mode**, accept the restart,
  then confirm Developer Mode after reboot.
- In Xcode **Settings › Accounts**, add the Apple ID that belongs to team
  `AX3C2B78YD` if Xcode asks. Accept keychain and developer-certificate prompts.
- Keep bundle id `com.johansardar.excerlock`, team `AX3C2B78YD`, and the iOS
  17.4 deployment target unchanged. Signing must cover the app and the
  `.monitor`, `.shield`, and `.shieldaction` extension targets. Do not solve a
  provisioning error by changing an identifier.

Confirm that the phone appears under `Devices`, not `Devices Offline`:

```sh
xcrun xctrace list devices
xcrun devicectl list devices
```

This checkout has an ignored `app/.env.local` that may enable simulator
fixtures. Both the native build and Metro must explicitly suppress dotenv and
set the real-provider gate to zero:

```sh
cd /Users/johansardar/ExcerLock-lanes/f2/app
EXPO_NO_DOTENV=1 EXPO_PUBLIC_E2E=0 npx expo run:ios --device
```

Choose the physical iPhone when Expo prompts. This command prebuilds, signs,
installs, and starts the development client. A successful build is not an
installation result until the ExcerLock icon is visible on the phone and the
app opens without an untrusted-developer alert.

### Offline test build (use this one for motion, walking and treadmill legs)

The dev-client recipe above needs Metro on a reachable network. Several legs
cannot satisfy that: MOT-02 walks away from coverage, WLK-01 and GEO-04 run with
the phone pocketed and the Mac left behind, and treadmill mode (#111) is a gym.
A build that dies without Wi-Fi cannot test any of them.

Build **Release** instead. It embeds the JS bundle, so the app launches with no
Metro, no LAN, and no network at all, and survives reboot:

```sh
cd /Users/johansardar/ExcerLock/app
EXPO_NO_DOTENV=1 EXPO_PUBLIC_E2E=0 EXPO_PUBLIC_DIAGNOSTICS=1 \
  npx expo run:ios --device 00008110-000E5041260BA01E --configuration Release
```

`EXPO_PUBLIC_DIAGNOSTICS=1` enables the on-device recorder and the
`excerlock://diagnostics` screen (`app/src/diagnostics/README.md`). It records
cadence, activity classification, keep-alive calls and every walking-session
transition, persists them across force-quit and reboot, and renders them **on
the phone** with a Share button. Without it a walk leaves no evidence, because
`console.log` needs a Metro that is not there.

Read the log by opening `excerlock://diagnostics` after the walk. Share exports
the whole thing as text.

**Note on the keyless build.** `EXPO_NO_DOTENV=1` suppresses both the Adapty and
Clerk keys, so the build gets `NoopSubscriptionModule` and `NoopAccountModule`.
Until `3b2cb9d` those made onboarding impossible to finish -- both failed every
call, and they are the last two steps in the rail -- which is why earlier runs
found deep links to be the only way in. Onboarding now offers a way past each on
failure, so a keyless build reaches the app normally.

For later launches, start Metro with the same gate and keep the Mac and iPhone
on a reachable network:

```sh
cd /Users/johansardar/ExcerLock-lanes/f2/app
EXPO_NO_DOTENV=1 EXPO_PUBLIC_E2E=0 npx expo start --dev-client --lan
```

If the device client opens to its launcher, select the running ExcerLock Metro
server. If Xcode reports a signing failure, open
`app/ios/ExcerLock.xcworkspace`, select team `AX3C2B78YD` for the affected
target, let Xcode refresh profiles, and rerun the Expo command. Record the
exact target and Apple error; do not toggle capabilities or identifiers.

The local path is canonical for this ticket. `app/eas.json` also defines a
device-only `development` profile, but a cloud build additionally requires the
checkout to be linked with `eas init` and the device to be registered for
internal distribution. Do not use the `e2e` profile: it is a fixture-backed
simulator build.

### Run header

Before testing, copy this into the results file and fill every field:

```text
Commit:
Build method and command:
Build timestamp:
iPhone model/name:
iOS version:
Physical UDID:
Apple team:
EXPO_PUBLIC_E2E value:
Tester:
```

For terminal-driven deep links, use the identifier shown by `devicectl`:

```sh
xcrun devicectl device process launch \
  --device "Il" \
  --payload-url "excerlock://locked-apps" \
  com.johansardar.excerlock
```

Opening `excerlock://locked-apps` from Safari or Notes on the iPhone is the
human equivalent. The current four-tab shell has no Locked apps navigation
row, so this deep link is required.

## 2. Screen Time and shield extension

### FC-01 — FamilyControls authorization

1. Delete any older ExcerLock install if a clean authorization test is wanted,
   install the new client, and open `excerlock://locked-apps`.
2. Confirm the screen initially says **Screen Time keeps your choices honest**
   and reports **Screen Time access: Not set up**.
3. Tap **Allow Screen Time** and approve the iOS FamilyControls sheet for an
   individual user.

Expected: a real Apple authorization sheet appears exactly once, then the app
reports **Screen Time is on** and **Screen Time access: On**. `Choose apps`
becomes available. It is a failure if no system sheet appears on a clean
install, the status stays undecided after approval, or an Expo Go/native-module
error appears.

Denial recovery: on a second clean run, deny the sheet. Expected: ExcerLock
reports **Screen Time is off**, does not ask again on repeated taps, and routes
recovery to iOS Settings. Record the exact Settings destination and whether
returning after approval refreshes the status.

### FC-02 — FamilyActivityPicker selection and persistence

1. Tap **Choose apps**. Select one harmless installed app that can remain
   blocked for 30 minutes; record its name only in the private test notes.
2. Optionally select one category, tap **Done**, and note the selected counts.
3. Confirm ExcerLock renders a count summary such as `1 app · 1 category`, not
   bundle identifiers or app names.
4. Force-quit and reopen ExcerLock, return to `excerlock://locked-apps`, then
   tap **Change apps**.

Expected: the native picker renders; Done returns to ExcerLock; the count
summary and Apple-owned selection survive relaunch; Change apps opens with the
previous selection. Cancel must leave the prior selection unchanged. A blank
picker, lost selection, leaked app identity, or JS-only fake picker is a fail.

### SH-01 — shield applies and renders

1. Visit the Manage tab once so the shared lock controller remains mounted.
2. Return to `excerlock://locked-apps`, tap **Turn on Full Lock**, then
   **Yes, turn it on**.
3. Open the selected target app from the Home Screen.
4. Repeat after force-quitting ExcerLock, then once more after rebooting the
   iPhone without launching ExcerLock first.

Expected: the target app is covered by ExcerLock's native shield every time.
Because #92 is open, the current expected content is the bundled balance-empty
variant: **“Time’s up — for now.”**, **“A 20-min walk gets you 30 more
minutes.”**, orange **Open ExcerLock**, and **Close**, with the clay lock art.
The shield must not expose the target app name. Missing extension content,
Apple's generic restriction screen, unshielded access, or loss across host-app
force-quit/reboot is a fail.

### SH-02 — notification tap-through and destination

1. In Settings, turn on one notification type, continue through **Choose what
   helps**, and tap **Allow notifications**.
2. Verify iOS actually presented its notification permission sheet. If it did
   not, record `BLOCKED`; the current `getNotificationModule()` production
   accessor still constructs the mock, and #92 already tracks the missing
   denied-permission fallback.
3. With permission granted, open the shield and tap **Open ExcerLock**.
4. Tap the immediate local notification titled **Open ExcerLock**.

Expected when permission is available: the shield closes, exactly one silent
local notification arrives, and tapping it launches ExcerLock on Home for the
current balance-empty cause. Repeat with notifications denied. The known
denied case may produce no route home; record it as `FAIL` against the PRD
promise and link #92, never as a pass merely because the shield closed.

Per-cause selection is also unproven. Record that only balance-empty was
reachable in production; do not claim the Full Lock, lock-window, or Walk &
Scroll-ended destination passed until an app-group cause writer exists.

### SH-03 — shield lifts on earn

1. Keep Full Lock on and verify SH-01 first.
2. On Home, add an event condition with a fixed-minute reward. For the narrow
   ledger-to-shield check, its visible **Complete** control may be used; the
   separate HK-01 case below must prove a real HealthKit-backed earn.
3. Trigger the earn and immediately open the selected target app.

Expected: Home records exactly one earn, shows a positive balance, the Locked
apps status changes to **Your apps are open**, and the target app opens without
a shield within five seconds. Duplicate payout, stale shield, or a lift that
requires reinstalling/reselecting apps is a fail. Record earn-to-lift latency.

### DA-01 — 15-minute lease lapse and re-arm

1. Create/complete a **Rest of day** or set-period event reward so the app has
   an open state with no usage-drain ladder. Verify the selected app opens.
2. Start a 16-minute timer and leave ExcerLock in the background. At 15:00,
   retry the selected app without first foregrounding ExcerLock.
3. Open `excerlock://locked-apps` while the reward is still valid, wait for the
   status to return to **Your apps are open**, then retry the target app.
4. Wait through a second 15-minute increment; for the second interval,
   force-quit ExcerLock immediately after it opens.

Expected: the DeviceActivity interval applies the shield at the first lapse;
foreground reconciliation re-arms a fresh interval and clears it while the
reward remains valid; the second interval re-shields no later than 30 seconds
after its 15-minute end even with the host force-quit. Record lapse jitter and
re-arm latency. Remaining open beyond the fail-safe, failing to reopen after
reconciliation, or resetting today's usage is a fail.

## 3. Apple Health

### HK-01 — authorization and real HealthKit read

1. Before opening Home, ensure Apple Health contains device-recorded steps for
   today. Record the Health app's visible total without copying health values
   into analytics or shared artifacts.
2. Open Home and grant at least Steps read access in the Apple Health sheet.
3. Add a **Step goal** whose threshold is below today's device-recorded total.
4. Background and foreground ExcerLock once to force claim-on-open.

Expected: the card shows a nonzero `N of goal steps`, completes exactly once,
and pays its configured reward. With SH-01 active, that real earn must also
lift the shield. This is the required real HealthKit read; a fixture value,
zero despite known granted data, crash, or duplicate claim is a fail.

Apple does not expose per-type read permission. ExcerLock's `authorized` state
only means the request completed and queries are safe. If the user denied Steps
or the device has no recorded samples, an empty result is ambiguous; record
the Health Settings state and use `BLOCKED`, not a false pass or a provider bug.

### HK-02 — device-recorded-only filter

1. Note the ExcerLock step total from HK-01.
2. In Apple Health, manually add a distinctive step entry.
3. Foreground ExcerLock again.

Expected: ExcerLock does not add the manually entered amount. Device/Watch
samples still update normally. Any manual-entry credit is a fail.

### HK-03 — cold-launch and background delivery

1. With a new, unmet Health event condition, background ExcerLock normally.
2. Produce fresh device/Watch data that satisfies it while the phone remains
   locked. Record the write time, first notification/visible shield change,
   and next app-open time.
3. Reopen ExcerLock and confirm anchored claim catches up exactly once even if
   no background lift occurred.
4. Repeat after a cold launch. Separately try a user force-quit and label it as
   such; iOS is not expected to deliver JS background work after force-quit.

Expected: normal background delivery is best effort, not instant, but it must
not crash or double-pay; record whether it lifted the shield and its latency.
Cold-launch registration must not show an unexpected authorization flash and
the next foreground claim must catch up. Force-quit may defer until manual
open. Never convert a delayed background event into a pass without its timing.

## 4. Motion and Walk & Scroll

### MOT-01 — permission UX and real motion stream

1. In Settings, choose a 30-second Walk & Scroll grace period, then fully quit
   and reopen ExcerLock before returning Home. The native feed captures this
   setting when its singleton is created.
2. Add the **While walking** condition and accept the iOS Motion & Fitness
   prompt. Walk naturally with the phone in a pocket for at least two minutes.
3. Repeat with the phone in hand. Record time from first step to **Active · apps
   unlocked** and time from stopping to **Waiting to start**.

Expected: a real iOS permission prompt appears; classification plus two fresh
cadence samples are required; standing or shaking the phone does not activate;
walking activates near the app-fixed provisional 65 steps/min threshold; stop
grace returns inactive at the selected time. Record classification latency and
cadence/stop observations. No prompt, instant activation from shaking, or a
state that never expires is a fail.

Denial case: deny Motion & Fitness on a clean run. Home must stay usable and
the card must remain waiting. Repair permission in **Settings › Privacy &
Security › Motion & Fitness**, relaunch, and verify streaming recovers.

### MOT-02 — indoor, treadmill, background, and force-quit matrix

Repeat MOT-01 for each row and record the verdict and latency:

| Case | Concrete action | Expected result |
|---|---|---|
| Indoor hallway | Walk two minutes away from GPS coverage | Accepted from Core Motion + cadence |
| Treadmill | Walk two minutes at or above the threshold | Accepted without outdoor displacement |
| Other app foreground | Start verified walking, then foreground the selected app for five minutes | Motion/cadence remains live while the Walk Session keep-alive is active |
| Stop | Stand still past the selected grace | Walk state stops and shields return if balance is empty |
| Drive-off | Enter a car after walking | Automotive classification disqualifies immediately |
| Force-quit ExcerLock | Quit during an open increment | OS fail-safe re-shields by the end of one 15-minute increment |

The threshold is provisional pending #27. Record false accepts/rejects and
pace; do not tune the threshold during this smoke run.

### WLK-01 — Walk & Scroll start/stop and location keep-alive

1. Locate the product control that starts Walk & Scroll, then start it while
   stationary.
2. Confirm the iOS location permission prompt appears and, while another app
   is foregrounded, the blue background-location indicator is visible.
3. Walk until MOT-01 verifies; confirm the selected app opens. Stop walking and
   wait through grace; confirm the shield returns. Use the product Stop control
   and confirm the blue indicator disappears and background location delivery
   ends.
4. Repeat across the first 15-minute boundary while continuously walking. A
   valid session must re-arm rather than remain shielded after the increment.

Expected: start and stop are explicit, location delivery continues only during
the session, verified walking controls shields, stop tears down delivery, and
continuous walking survives renewal. Record battery/indicator behavior.

Current preflight blocker: no production caller invokes
`startWalkKeepAlive()`/`stopWalkKeepAlive()`, and the shared `LockController`
still uses its default `walking: false`. If this remains true in the installed
commit, record `BLOCKED` before motion and do not reinterpret Home's active card
as a passed Walk & Scroll shield test.

## 5. Gym geofence

### GEO-01 — foreground permission and registration

1. In the product gym control, save one real gym circle at the test location
   with the 100 m default radius and enable Auto-detect.
2. Accept When In Use, then Always location authorization.
3. Confirm iOS Settings shows **Location: Always** and the app reports the
   region as monitored.

Expected: permission is requested only after opt-in; declining Always leaves
auto-detect off with an actionable error; no more than five regions can be
registered; coordinates are never printed in logs/results.

Current preflight blocker: although the adapter exists, no production screen
calls `getLocationProvider()`, saves a gym, or invokes
`startMonitoringRegions()`. Record `BLOCKED` if the control is absent. Do not
use the fixture-backed scenario route as evidence for a device geofence.

### GEO-02 — geofence arrival and 30-second confirmation

1. Begin outside the saved radius with ExcerLock backgrounded.
2. Cross into the radius and stay at least 45 seconds. Record boundary-cross
   time, condition/earn time, shield-lift time, and whether the app process was
   visible.
3. Exit, wait for presence to clear, re-enter for under 20 seconds, and exit.

Expected: the first geofence arrival wakes the app, confirms after no less than
30 seconds, persists one coordinate-free visit, and fires the matching gym
condition once. The short blip must not persist or earn. Earlier confirmation,
no persisted visit, duplicate earn, or coordinates in durable output is a fail.

### GEO-03 — background and terminated-app region wake

1. Repeat GEO-02 with another app foregrounded.
2. Repeat after the ExcerLock process has been terminated without opening it
   before the crossing. Record exactly how termination was performed; a user
   swipe-force-quit is a separate iOS state and may suppress relaunch.
3. Reopen ExcerLock and inspect the condition/visit state.

Expected: iOS launches the headless Task Manager executor for a real region
wake, gives it enough time to finish the fixed 30-second confirmation, and the
visit is present on next open. Record wake-to-persist latency. If the executor
is suspended before confirmation, mark `FAIL` and note #83's planned native
Swift debounce contingency.

### GEO-04 — continuous Walk Session delivery

Start WLK-01, foreground another app for five minutes, walk, then stop the
session. Expected: continuous samples reach the app while the other app is
frontmost, the blue location indicator remains visible only during the
session, and Stop ends both updates and the indicator. This is distinct from a
region wake; passing GEO-02 does not pass GEO-04.

## 6. Closeout

1. Turn off Full Lock, stop Walk & Scroll, stop gym auto-detect if a control is
   available, and verify the test app is no longer shielded.
2. In the results file, give every ID a status and concrete observation. Attach
   timestamps or private screenshots/log excerpts for failures without
   recording health values, app selections, or coordinates.
3. A milestone passes only if every required ID is `PASS`. `BLOCKED` and `NOT
   RUN` are honest non-passes. Simulator evidence can explain logic but cannot
   change a device status.
