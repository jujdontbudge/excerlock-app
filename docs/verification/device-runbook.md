# Physical-device verification runbook (P2-T11)

This is the sitting on Johan's iPhone that decides whether Phase 2 enforcement is real. A simulator proves
nothing about Screen Time shields, geofences, the camera or sandbox purchases; every row in
`plans/rebuild/phase-2-backend/P2-T11-device-verification.md` is exercised here on hardware.

Read `device-prerequisites.md` and tick every box first. The verifier reads the event names in
`diagnostics-events.md`; nothing below can pass until the adapter tasks emit them.

**How to read this page.** Each scenario has a *Set up* block (exact taps), a *Do* block, an *Expect*
block (what the screen must show), a *Capture* block (screenshots and recordings) and a *Log* line (the
file name you save the diagnostics log under). The verifier is run once at the end:

```sh
cd app-next && node scripts/verify-device-run.js ../evidence/P2-T11
```

Time: about five hours on the day (two at the desk, one walking, two at the gym) plus three short
follow-ups the next morning. Charge the phone; the camera, location and pedometer are all on.

---

## 0. Words used below

- **Dev menu**: Settings › scroll to the bottom › tap the version line seven times › "Developer". Only in a
  build with `EXPO_PUBLIC_DEV_MENU=1`.
- **Diagnostics screen**: `excerlock://diagnostics`, or Dev menu › Diagnostics. It has **Share log** and
  **Clear log**.
- **Reset today's progress**: Dev menu › Today › "Reset today's progress". Clears today's rule days, earned
  unlocks, the walking session and today's gym visits, and nothing else. Several scenarios need the day's
  unlock gone before the next one can prove a lock; the runbook says exactly when to press it.
- **Kill the app**: swipe up from the bottom, hold, swipe the ExcerLock card away. Wait ten seconds.
- **Launch a blocked app**: tap one of the two apps you picked in setup (Safari and the social app).
- **Save the log as `<name>`**: Diagnostics screen › Share log › AirDrop to the Mac (it lands in
  `~/Downloads`) › move it to `evidence/P2-T11/<name>.log` › back on the phone press **Clear log**. The
  name is the scenario id; the verifier reads the id from the file name and treats a missing scenario as a
  failure, so never reuse a name.
- **Screenshot `<name>`**: side button + volume up. Later, AirDrop the whole batch and put them in
  `evidence/P2-T11/screens/<name>.png`. Recordings go in `evidence/P2-T11/recordings/`.
- **`<udid>`**: the identifier from `xcrun devicectl list devices`.
- **Rule windows**: every window must be at least 30 minutes (the builder refuses shorter ones). The desk
  scenarios use windows relative to the clock when you start; the table in section 3 has the offsets.

Pull a log without the share sheet if AirDrop misbehaves:

```sh
xcrun devicectl device copy from --device <udid> \
  --domain-type appDataContainer --domain-identifier com.johansardar.excerlock \
  --source Documents/diagnostics/latest.log --destination evidence/P2-T11/<name>.log
```

Send a URL to the phone from the Mac (the app must already be running for a cold-launch URL to be
seen):

```sh
xcrun devicectl device process launch --device <udid> \
  --payload-url "excerlock://locked-apps" com.johansardar.excerlock
```

---

## 1. Build and install

Two builds, same bundle id. The harness build replaces the product UI with the signal recorder, so the
harness session (section 2) runs **before** the product install, and the product install is a delete-and-
reinstall anyway because scenario 1 is a fresh install.

From the repo root, every time, so the generated `ios/` project is never stale (`PITFALLS.md`, "Stale
generated `ios/` project omits new local modules"):

```sh
cd app-next
npx expo prebuild --platform ios --clean --no-install && npx pod-install ios
```

Confirm the three extensions and the entitlements came out of prebuild before spending a device build:

```sh
ls ios/*.xcodeproj && grep -l "family-controls" ios/*/*.entitlements
plutil -p ios/ExcerLock/Info.plist | grep -E "UsageDescription|UIBackgroundModes"
```

**Harness build** (section 2 only):

```sh
EXPO_NO_DOTENV=1 EXPO_PUBLIC_RUNTIME=real EXPO_PUBLIC_TEST_HARNESS=1 EXPO_PUBLIC_DIAGNOSTICS=1 \
  npx expo run:ios --device <udid> --configuration Release
```

**Product build** (everything else):

```sh
EXPO_NO_DOTENV=1 EXPO_PUBLIC_RUNTIME=real EXPO_PUBLIC_DIAGNOSTICS=1 EXPO_PUBLIC_DEV_MENU=1 \
  npx expo run:ios --device <udid> --configuration Release
```

Release matters: it embeds the JS bundle, so the phone runs with no Metro and no Wi-Fi at the gym. The
keys come from `~/.excerlock/env` through `app.config.ts`, so the built binary must not contain a dev
bypass: after the build, from `app-next/`, run
`strings ios/build/Build/Products/Release-iphoneos/ExcerLock.app/main.jsbundle | grep -c EXPO_PUBLIC_SKIP`
and expect `0`.

Prove the executable carries the entitlements the profile promises (`PITFALLS.md`, "Provisioning-profile
capabilities do not prove the shipped executable has them"):

```sh
APP=ios/build/Build/Products/Release-iphoneos/ExcerLock.app
codesign -d --entitlements :- "$APP" | grep -E "family-controls|healthkit|application-groups|applesignin"
for x in "$APP"/PlugIns/*.appex; do echo "$x"; codesign -d --entitlements :- "$x" | grep -E "family-controls|application-groups"; done
```

Expect `family-controls`, `healthkit`, `group.com.johansardar.excerlock` and `applesignin` on the app, and
`family-controls` plus the app group on each of `DeviceActivityMonitorExtension.appex`,
`ShieldAction.appex`, `ShieldConfiguration.appex`. No `aps-environment` anywhere.

First launch of a dev build on a phone: iOS may ask to trust the developer (Settings › General › VPN &
Device Management) and the Expo dev-client chrome may show a first-run sheet; dismiss both, they are not
product screens (`PITFALLS.md`, "Clean Expo dev-client launches can stop at host chrome").

Record in the results table: build commit (`git rev-parse --short HEAD`), iOS version, phone model.

---

## 2. Harness session: the signal recorder at the treadmill (30 minutes)

Install the harness build. The app starts on the task list instead of onboarding. The harness records the
raw sensor and camera layers with your declared truth; it renders no verdict, that is what the analyzer
prints afterwards. This covers row 5's "harness run exported" and P2-T05's "harness root can start a
treadmill session and export a run".

Launch a task from the Mac instead of tapping, if the phone is propped:

```sh
xcrun devicectl device process launch --device <udid> \
  --payload-url "excerlock://?test=c1-treadmill-walking&start=1" com.johansardar.excerlock
```

Run these four, in this order, pressing each declared button the moment it becomes true:

| # | Task in the list | Deep link `test=` | What you do |
| --- | --- | --- | --- |
| H1 | C1 — treadmill walking | `c1-treadmill-walking` | Prop the phone so the preview shows shoulders and hips, start the belt at 3 mph, walk through the 10-second window. |
| H2 | C2 — empty running belt | `c2-empty-running-belt` | Same framing, belt running, you out of frame for the 10-second window. |
| H3 | Placement sensor only: phone propped on a running belt (P3) | `P3` | Prop the phone, press "The phone is propped", start the belt, press "The belt is running". Two minutes. |
| H4 | T1 — the real propped flow | `t1-propped-flow` | Walk holding the phone, prop it (press "I propped the phone"), keep walking until you see yourself in the preview (press it), pick the phone up while walking (press), set it down (press). Three minutes. |

After H4: task list › **Export all runs** › AirDrop to the Mac › save as `evidence/P2-T11/harness/runs.jsonl`.
Then **Delete all captured footage** (the movies never leave the phone).

On the Mac:

```sh
cd app-next && npm run analyze:harness -- ../evidence/P2-T11/harness/runs.jsonl > ../evidence/P2-T11/harness/analysis.txt
```

Expect: for H1 the `camera / derived.periodicity` layer responds within a few seconds of "Walking
throughout the recording"; for H2 it never reports walking; for H3 `placement / derived.classification`
says propped after "The phone is propped"; for H4 each of the four declarations gets a placement or camera
response and none says "never responded".

Then **delete the app from the phone** (hold the icon › Remove App › Delete App) and install the product
build. Deleting also clears Motion, Camera and Location grants, which section 3 relies on.

---

## 3. At the desk, part one: install, onboarding, and the lock on real apps (about 2 hours)

Write down the clock when you begin: call it **T**. Rule windows below are offsets from T.

### 3.1 Fresh install through onboarding and setup

*Row 1.* Log: `fresh-install-onboarding`.

Set up: nothing. The product build is freshly installed, the sandbox account is signed in under Settings ›
App Store › Sandbox Account.

Do:

1. Launch ExcerLock. Go through onboarding; when asked what you want to do, choose **walking** and a
   **step goal**; set the goal to **500 steps** (the smallest the wheel allows). Answer the other questions
   any way.
2. On the paywall (the Adapty Builder screen), pick the **annual** plan and buy. Apple's sandbox sheet
   asks for the sandbox tester password. Expect "You're all set" and no way to close the paywall
   before buying (its Close button is disabled for the `onboarding` placement).
3. Setup "Let ExcerLock block your apps" › **Allow Screen Time** › the iOS Screen Time sheet › Continue
   › the phone passcode if asked.
4. "Which apps should wait?" › **Choose apps** › the real Family Activity picker › tick **Safari** and
   **one social app** (two apps, no categories) › Done.
5. "Let ExcerLock count your steps" › **Allow Motion & Fitness** › Allow.
6. Reminders step › **Enable reminders** › Allow.
7. "Save your progress" › **Continue with Apple** › use your real Apple ID with **Share My Email** (not
   Hide My Email; the Google and email sign-ins later must use the same address).
8. Land on Home.

Expect: Home shows either "Blocking starts at …" (before the window you set) or "Apps are blocked" with
one row "Morning steps 0 / 500". The Screen Time picker returned two apps: Home's lock card says
"2 apps · 0 categories".

Capture: screenshot `fresh-install-paywall` (Builder paywall with the Terms and Privacy links and the
price/renewal line visible), `fresh-install-picker` (the picker with two apps ticked),
`fresh-install-home`.

Check off-device: Supabase › Authentication › Users shows one user with an `apple` identity. Adapty ›
Profiles shows a profile with `customer_user_id` equal to that user's id and a Sandbox purchase. The VPS
`adapty_subscription_states` row exists (P2-T06 acceptance):
`ssh johan-vps "psql -c \"select * from adapty_subscription_states order by updated_at desc limit 1\""`.

### 3.2 Trial reminder scheduled

*Row 8.* Log: `trial-reminder`.

Do: Dev menu › Notifications › **Pending**. Under sandbox the seven-day trial lasts about three minutes,
so the reminder's fire time is already in the past and the list may say "Trial reminder: not scheduled
(trial shorter than the lead time)". Either a pending reminder or that line is the pass.

Expect: the list has at most one trial entry and nothing that is not one of the three catalog ids.

Capture: screenshot `trial-reminder-pending`.

### 3.3 The desk rule set

Everything from 3.4 to 3.9 uses five daily rules. Build them now, in the Conditions tab, with **Add
condition**. Each is a **walking · step goal** rule with a goal of **30,000 steps** (so none of them can
be met by accident) on **every day**, with these windows:

| Rule name | Window (offset from T) | Why |
| --- | --- | --- |
| A window | T+5 min → T+35 min | starts in a few minutes: row 2, row 15 |
| B overlap | T+25 min → T+65 min | overlaps A: row 11 (merged A+B is one 60-minute monitor) |
| C thirty | T+80 min → T+110 min | exactly 30 minutes, separate: row 16 |
| D afternoon | T+4 h → T+5 h | filler so there are five daily rules: row 12 |
| E evening | T+8 h → T+9 h | filler: row 12 |

Round each start to the nearest 5 minutes the wheel allows and write the real times in the results
table. Keep "Morning steps" (500 steps) **paused** until section 6: Conditions › Morning steps › Pause.

### 3.4 Five daily rules fit the monitor budget

*Row 12.* Log: `five-daily-rules-budget`.

Do: with the five rules saved, go to the Diagnostics screen and look for the newest `enforcement.plan`
line. Then background the app and bring it back once.

Expect: `ruleCount` 5, `monitors` at most 16, and either no `truncatedAt` or a `truncatedAt` at least a
day away. Home lists all five conditions with their windows drawn on one timeline.

Capture: screenshot `five-rules-home`, screenshot `five-rules-plan` (the diagnostics line).

Save the log as `five-daily-rules-budget`. (Clear the log now; the next scenarios start clean.)

### 3.5 The shield at window start with the app killed, and its subtitle

*Rows 2 and 15.* Logs: `shield-at-window-start-app-killed` and, from the same run, a copy named
`lockwindow-subtitle-and-tap-through` (save the log twice under both names; both verifiers read the
same events).

Do:

1. About two minutes before A's start, go to Home. Expect "Blocking starts at <A start>".
2. **Kill the app.** Do not bring it back.
3. Wait for A's start. Launch Safari.
4. Expect the **ExcerLock shield** over Safari: title "Blocked by ExcerLock", a subtitle that starts with
   "Blocking has started." and names the cheapest unlock ("Walk 30,000 steps to open your apps."), buttons
   **Open ExcerLock** and **Close**. This is the `lockWindow` cause; its subtitle must differ from the
   plain locked subtitle you will see in 3.6.
5. Tap **Close**. Expect Safari still shielded.
6. Launch the social app: shielded too.
7. Tap **Open ExcerLock**. A notification "Open ExcerLock / Tap to open ExcerLock and unlock your apps."
   appears; tap it. Expect ExcerLock comes to the front on Home showing "Apps are blocked", with A's row
   and the unlock hint under it.

Capture: screenshot `shield-lockwindow` (the shield over Safari, subtitle readable), screenshot
`shield-tap-notification`, screenshot `shield-landed-home`. Also a screen recording of steps 3 to 7 as
`recordings/shield-at-window-start.mp4` if you can start Screen Recording before launching Safari.

Save the log as `shield-at-window-start-app-killed`, then save it again as
`lockwindow-subtitle-and-tap-through`, then clear.

### 3.6 Clock set back an hour keeps the apps locked

*Row 14.* Log: `clock-rewind-keeps-lock`.

Do, while still inside A (before T+35):

1. Settings › General › Date & Time › **Set Automatically off** › set the time **one hour earlier**.
2. Launch ExcerLock. Expect Home still says "Apps are blocked" (the watermark holds the effective time).
3. Launch Safari. Expect the shield, now with the plain subtitle "Walk 30,000 steps to open your apps."
4. Settings › Date & Time › **Set Automatically on**. Bring ExcerLock back once more.

Expect: at no point does Home say "Blocking starts at" for a window that already started.

Capture: screenshot `rewind-home` (Home with the wrong clock in the status bar), screenshot
`rewind-shield-locked` (plain locked subtitle, for the comparison in row 15).

Save the log as `clock-rewind-keeps-lock`.

### 3.7 Overlapping windows stay shielded past the first window's end

*Row 11.* Log: `overlapping-windows-app-killed`.

Do:

1. Before T+35 (A's end), bring ExcerLock to the front once, then **kill it**.
2. Wait until T+40, five minutes after A ended but inside B.
3. Launch Safari. Expect the shield is still there (A+B were registered as one merged monitor, so nothing
   ended at T+35).
4. Wait until T+66, after B's end. Launch Safari. Expect no shield.
5. Launch ExcerLock. Expect Home "Blocking resumes today at <C start>".

Capture: screenshot `overlap-shield-after-first-end` at step 3, screenshot `overlap-clear-after-merged-end`
at step 4.

Save the log as `overlapping-windows-app-killed`.

### 3.8 A 30-minute merged interval registers and its end clears the shield

*Row 16.* Log: `merged-30-minute-interval`.

Do:

1. At T+79, bring ExcerLock to the front (Home: "Blocking starts at <C start>"), then **kill it**.
2. T+81: launch Safari, expect the shield.
3. Leave ExcerLock closed. At T+111, launch Safari: expect no shield.
4. Launch ExcerLock. Expect Home "Blocking resumes …" for D.

Capture: screenshot `thirty-min-shield`, screenshot `thirty-min-clear`.

Save the log as `merged-30-minute-interval`.

### 3.9 Shield refresh cadence (a measurement, not a pass/fail)

*Row 20.* Log: `shield-refresh-cadence`.

Do: during C's window (between 3.8 steps 2 and 3, with ExcerLock in the foreground this time), change the
cheapest unlock three times so the published shield content changes: Conditions › C thirty › edit the
goal to 25,000 › Save; launch Safari and dismiss the shield; edit to 20,000; launch Safari; edit to
15,000; launch Safari. Note the subtitle each time.

Expect: nothing in particular. The verifier prints how long each published revision took to appear in the
shield. Copy those numbers into the results table and into P2-T04's open question.

Capture: three screenshots `shield-refresh-1/2/3`.

Save the log as `shield-refresh-cadence`.

Then delete rules A, B and C (Conditions › the rule › Delete) so they do not shield the rest of the day.
Keep D and E.

### 3.10 Sign in with Google and with an email code

*P2-T01.* Logs: `sign-in-google`, `sign-in-email`.

Do:

1. Settings › Account › **Sign out**. Expect Home unchanged (rules stay; local-first) and Account says
   you are signed out.
2. Settings › Account › Sign in › **Continue with Google** › the Google account whose address matches
   the Apple ID email. Expect Account shows the signed-in address. Save the log as `sign-in-google`.
3. Settings › Account › Sign out › Sign in › **Continue with email** › the same address › **Send code**
   › read the six-digit code from the mail › enter it. Expect Account signed in. Save the log as
   `sign-in-email`.

Check off-device: Supabase › Authentication › Users still shows **one** user, now with `apple`, `google`
and `email` identities.

Capture: screenshot `sign-in-users` of the Supabase user row with three identities.

The Apple sign-in itself was recorded during 3.1; save a copy of that log's section by re-running: sign
out › **Continue with Apple** › sign in. Save as `sign-in-apple`.

### 3.11 Test crash and analytics

*Row 8.* Logs: `sentry-test-crash`, `posthog-session-events`.

Do:

1. Dev menu › Observability › **Send test crash**. The app dies. Launch it again. Save the log as
   `sentry-test-crash`.
2. Do nothing else; save the log again as `posthog-session-events` (the events from 3.10 and the crash
   relaunch are enough).

Check off-device: Sentry › `excerlock-mobile` › the newest event is the test crash, with no email or token
in the payload. PostHog (via the PostHog MCP or the dashboard): events with `app = excerlock` from today
whose distinct id is the Supabase user id from 3.1.

Capture: screenshot `sentry-event`, `posthog-events`.

---

## 4. On a walk outside (about 80 minutes)

Before leaving: Conditions › **Add condition** › walking › **while walking** (state mode) › place
**outside** › window **now → now + 2 hours** › Save. Call it "Walk state". Pause D and E for the walk
(they are not scheduled now anyway).

Take the phone in your hand for the whole walk.

### 4.1 A walking lease renews across an hour

*Row 19.* Log: `walking-lease-renewal-hour`.

Do:

1. Home › the "I'm walking with my phone" pill › the walking sheet › **Start**. Expect "Checking your
   steps for a moment", then within about ten seconds "Exercise detected", the shackle opens, Home shows
   the lease clock on the Walk state row and **Stop**.
2. Launch Safari once: no shield. Put the phone back in your hand.
3. Walk for **62 minutes** without stopping for longer than your stop grace (Settings › Stop grace; the
   default is fine). The lease renews every time the pedometer verifies you; the clock on Home should never
   reach zero.
4. Do not save the log yet.

Expect: no shield at any point; no "Your walk has ended" notification.

Capture: screenshot `renewal-home` at about 60 minutes showing the lease clock.

### 4.2 Stop, grace, the 30-second warning, lease expiry re-shields

*Row 5 (state mode).* Log: `walking-lease-expiry`.

Do, straight after 4.1:

1. Stop walking. Stand still. Expect Home to show the grace countdown on the row.
2. Keep standing. After the grace, the session ends; the lease keeps the apps accessible until it runs out
   (up to 15 minutes from the last verification).
3. About 30 seconds before the lease runs out a notification arrives: the walk-lease warning ("Keep
   walking" copy). Note the time.
4. When the lease runs out, launch Safari. Expect the shield with the walk-ended subtitle "Your walk has
   ended. Start walking again to open your apps."

Now save the log **twice**: first as `walking-lease-renewal-hour`, then as `walking-lease-expiry`. Clear.

Capture: screenshot `lease-grace`, screenshot `lease-warning` (the banner, with the clock visible),
screenshot `lease-expired-shield`.

Then delete "Walk state".

---

## 5. At the gym (about 2 hours, including the treadmill)

Before leaving the desk: Settings › Saved gyms › **Add a gym** › search the real gym by name › pick it ›
set the radius to **100 m** › Save. Conditions › **Add condition** › gym › **minutes at the gym**, goal
**45 minutes**, window **now → now + 4 hours** › Save; call it "Gym time". Also add "Treadmill 20":
walking › **minutes walked**, place **treadmill**, goal **20 minutes**, same window. And "Treadmill
state": walking › **while walking**, place treadmill, same window, and **pause** it for now. Leave
auto-detect **off**.

A minutes rule is used for the arrival scenarios because an event rule would book "met" and unlock the
whole day at the door; the minutes rule holds a provisional unlock only while you are inside.

### 5.1 Manual check-in inside the radius

*Row 6 (manual).* Log: `gym-manual-checkin`.

Do, having walked into the gym with the app killed and auto-detect off:

1. Launch ExcerLock. Home shows "Apps are blocked" with the Gym time row and the pill "I'm at the gym".
2. Tap the pill. Expect "Finding you…" then "Confirming you're here" with a 30-second ring, then the
   shackle lifts: "Location detected at the gym" / "Unlocked while you're here. 45 minutes counts the
   day." Done.
3. Launch Safari: no shield.

Capture: screen recording `recordings/gym-manual-checkin.mp4` of step 2; screenshot `gym-manual-home`.

Save the log as `gym-manual-checkin`.

### 5.2 Arrive with the app killed: the geofence wakes it, the ceremony unlocks at 30 seconds

*Rows 6 (auto-detect) and 18 (ceremony).* Log: `gym-arrival-app-killed`.

Do:

1. Settings › Data & permissions › Location, or the Gym time row's **Auto-detect arrivals** switch › on.
   The iOS sheet asks for **Always**; choose "Change to Always Allow". (This is the only place the app may
   ask for Always.)
2. **Kill the app.**
3. Walk out of the building and at least **300 m** away (past the radius plus GPS slop). Wait five
   minutes. Launch Safari: expect the shield is back (presence lapsed; no punishment).
4. Walk back in. Leave ExcerLock closed for **three minutes** after you are inside.
5. Launch ExcerLock. Expect it starts on the gym ceremony (or Home with the pill; tap it): "Confirming
   you're here", ring, then at 30 seconds "Location detected at the gym" / "Unlocked while you're here".
6. Launch Safari: no shield.

Capture: screenshot `gym-always-sheet`, screenshot `gym-outside-shield` (step 3), recording
`recordings/gym-arrival-ceremony.mp4` (step 5).

Save the log as `gym-arrival-app-killed`.

Stay inside from now until 5.6. The visit that just started is the one row 18 credits.

### 5.3 Propped treadmill scan unlocks a state rule

*Row 5 (treadmill).* Log: `treadmill-propped-scan`.

Set up: Conditions › **Treadmill state** › Resume. Conditions › **Treadmill 20** › Pause.

Do:

1. Get on the treadmill, belt at a walking pace. Home › the "I'm using a treadmill" pill.
2. The first time, the camera sheet asks; **Allow**. Expect the framing view with the live preview.
3. Prop the phone on the console so the preview shows your shoulders and hips. Keep walking.
4. Expect the ring to fill in about three to four seconds, then "Exercise detected" / "Unlocked while
   you walk", a haptic, the shackle opens.

Capture: recording `recordings/treadmill-scan.mp4` from step 1 to step 4; screenshot
`treadmill-camera-sheet`.

Save the log as `treadmill-propped-scan`. Stop the session: Home › **Stop**.

### 5.4 Framing grace runs out and the screen tells you

*P2-T21 finding 2.* Log: `treadmill-framing-expired`.

Do:

1. Home › "I'm using a treadmill" pill. Prop the phone pointing at the **ceiling** so it cannot see you.
2. Wait 30 seconds. Expect the screen **stays** (no pop back to Home, no shield on Safari if you check)
   and offers **Try again** and **Continue with phone in hand**.
3. Tap **Try again**, frame yourself, let it verify. Stop the session.

Capture: screenshot `framing-expired-state` (the two exits visible).

Save the log as `treadmill-framing-expired`.

### 5.5 A duration rule counts on the belt, warns, and a re-scan renews

*Row 17.* Log: `treadmill-duration-rule`.

Set up: Conditions › Treadmill state › Pause. Treadmill 20 › Resume.

Do:

1. Home › "I'm using a treadmill" pill › prop and frame. Expect stage 1: ring = gait confidence, then
   "Exercise detected" / "20 minutes counts the day", a haptic, **no** shackle lift, no confetti.
2. Stage 2: "Counting your walk" / "N minutes to unlock", with the propped lease remaining shown. Keep
   walking with the phone propped. Do not touch it.
3. At about 14 minutes 30 seconds the lease warning arrives ("Scan again to keep counting") and the
   screen says the same.
4. Step back into frame if you drifted; the screen re-scans (or tap **Scan again**). Expect the lease
   remaining jumps back to 15 minutes.
5. At 20 minutes walked: "Goal reached" / "Unlocked for the rest of today", confetti, Done.

Capture: screenshot `duration-stage1`, `duration-stage2`, `duration-warning`, `duration-met`.

Save the log as `treadmill-duration-rule`.

Get off the treadmill. Home now says "Unlocked for the rest of today" / "Unlocked by Treadmill 20".

### 5.6 An hour inside with the app killed is credited in full

*Row 18 (dwell).* Log: `gym-dwell-hour-app-killed`.

Do:

1. **Kill the app.** Do your session; stay inside the radius. The visit started in 5.2 is still running.
2. When at least **60 minutes** have passed since you walked back in at 5.2, leave the building and go
   **300 m** away. Wait five minutes so the exit fires.
3. Launch ExcerLock. Expect the Gym time row shows at least the minutes you were inside (goal 45, so it
   reads met) and the day is unlocked.

Capture: screenshot `gym-dwell-home`.

Save the log as `gym-dwell-hour-app-killed`.

Then Dev menu › **Reset today's progress** (the treadmill and gym rules booked "met" and section 6 needs
the day locked again), and delete "Gym time", "Treadmill 20" and "Treadmill state".

---

## 6. Back at the desk, part two (about 1 hour, then the next morning)

### 6.1 Sandbox cancel: shields clear in one run, Settings and the ceremonies stay reachable

*Row 13.* Log: `sandbox-lapse-clears-shields`.

Set up: add a rule that is locked now: walking › step goal 30,000 › window **now → now + 3 hours**;
call it "Desk lock". Launch Safari: the shield is there. Bring ExcerLock to the front and leave it there.

Do:

1. On the phone, Settings › App Store › Sandbox Account › **Manage** › the ExcerLock subscription ›
   **Cancel**. Under accelerated sandbox renewal the entitlement expires within minutes.
2. Go back to ExcerLock (do not kill it). Wait until the in-app paywall (placement `in_app`) appears as a
   modal, or pull Settings › Subscription to refresh. Expect the paywall has a Close button.
3. Tap Close. Expect Home: "Blocking is paused" / "Your subscription ended, so your apps are open. Start a
   plan to switch blocking back on." / **See plans**. Launch Safari: no shield.
4. Go to Settings, Support and Account: all reachable. Go to a ceremony: add a gym rule if none exists,
   tap its pill, expect the ceremony starts with the subtitle "Your apps aren't blocked right now".

Capture: screenshot `lapse-paywall-modal`, `lapse-home`, `lapse-settings`, `lapse-ceremony`.

Save the log as `sandbox-lapse-clears-shields`.

### 6.2 Restore purchases

*P2-T06 restore.* Log: `sandbox-restore`.

Do:

1. Settings › Subscription › **Restore purchases** while lapsed. Expect "Nothing to restore" and the
   status stays as it was.
2. Home › **See plans** › buy the **monthly** plan in the sandbox. Expect Home back to "Apps are
   blocked" for Desk lock and the shield back on Safari.
3. Settings › Subscription › **Restore purchases** again. Expect "Purchases restored" and the status
   unchanged (active).

Capture: screenshot `restore-nothing`, `restore-restored`.

Save the log as `sandbox-restore`.

### 6.3 Step goal met with the app in the foreground unlocks the day, survives a kill

*Row 3.* Log: `step-goal-met-unlocks`.

Set up: Conditions › **Morning steps** (500 steps) › Resume and edit its window to **now → now + 2
hours**. Delete "Desk lock". Launch Safari: the shield is there (Morning steps is locked, 0 / 500).

Do:

1. With ExcerLock in the foreground on Home, walk around the block or up and down the stairs until the
   row reads 500 / 500. Expect Home flips to the open shackle, "Unlocked for the rest of today" /
   "Unlocked by Morning steps".
2. Launch Safari: no shield.
3. **Kill the app.** Launch Safari: still no shield. Launch the social app: no shield.
4. Launch ExcerLock again: still unlocked.

Capture: screenshot `steps-met-home`, screenshot `steps-met-after-kill` (Safari in front, no shield;
the app switcher showing ExcerLock is not running is a nice touch).

Save the log as `step-goal-met-unlocks` **but do not clear it**: the next-morning re-shield check
appends to it (see 7.1).

### 6.4 Usage monitor: ten minutes in a blocked app after unlocking

*Row 10.* Log: `usage-monitor` (saved tomorrow, see 7.2).

Do: while unlocked from 6.3, use Safari continuously for **12 minutes** by the clock. Then bring ExcerLock
to the front once so the threshold events are drained.

Expect: nothing visible today. Analytics shows the minutes tomorrow at 5-minute resolution.

---

## 7. The next morning (20 minutes)

### 7.1 Next day's window re-shields after yesterday's unlock

*Row 3, second half.* Appends to `step-goal-met-unlocks`.

Set up the night before: edit Morning steps' window to start **ten minutes after you expect to wake**,
every day. Kill the app before bed.

Do: at the window start, launch Safari **without** launching ExcerLock first. Expect the shield
(yesterday's unlock was for yesterday). Then launch ExcerLock: Home "Apps are blocked", 0 / 500.

Capture: screenshot `next-day-reshield`.

Now save the log as `step-goal-met-unlocks` (overwriting yesterday's copy) and clear.

### 7.2 Usage shows about ten minutes

*Row 10.* Log: `usage-monitor`.

Do: Analytics tab. Expect yesterday's usage at 10 minutes (two 5-minute thresholds; 12 minutes of use
rounds down to 10). Days before the extension was scheduled show as unmeasured, not zero.

Capture: screenshot `usage-analytics`.

Save the log as `usage-monitor`.

### 7.3 A run from Health

*Row 7.* Log: `running-from-health`.

Set up: Conditions › **Add condition** › running › distance **1 km** (or the smallest the wheel allows) ›
window now → now + 3 hours › Save. If the Health sheet appears (first Health read), allow **Workouts**.

Do: record a short run on the Watch (Workout › Outdoor Run, at least the goal distance) or in Nike Run
Club / Strava with Health writing on. Then launch ExcerLock.

Expect: the running row shows the distance and reads met; Home "Unlocked by <the run rule>". A manually
added workout in the Health app (Browse › Activity › Workouts › Add Data) must **not** count: add one
for 5 km after the real run and confirm the row does not change.

Capture: screenshot `run-met-home`, `run-manual-ignored`.

Save the log as `running-from-health`.

---

## 8. Reinstall block: deny paths and restore on a fresh install (30 minutes)

Delete the app (hold › Remove App › Delete App). If Screen Time does not ask again after reinstall, go
to Settings › Screen Time › scroll to the app list under "Apps with Screen Time access" (wording varies
by iOS version) and remove ExcerLock, then reinstall.

### 8.1 Deny Screen Time

*Row 4.* Log: `deny-screen-time`.

Do: install the product build again. Onboarding as in 3.1 but on the paywall use **Restore purchases**
(the sandbox subscription from 6.2 is still active) instead of buying; at "Let ExcerLock block your apps"
› Allow Screen Time › the iOS sheet › **Don't Allow**. Expect the screen says "Screen Time is off.
ExcerLock cannot block your apps yet." with **Open Settings** and **Continue anyway**. Tap Continue
anyway, finish setup (picking apps is skipped; grant Motion), sign in with Apple.

Expect Home: closed lock with the alarm glyph, headline **"Nothing is being blocked"**, the fix action.
Tap the fix action: iOS Settings appears on ExcerLock's page.

Capture: screenshot `deny-screentime-setup`, `deny-screentime-home`.

Save the log as `deny-screen-time`.

### 8.2 Restore after reinstall brings rules back but not the app selection

*Row 9, P2-T08.* Log: `restore-after-reinstall`.

Do, in the same install, without deleting again:

1. You signed in with Apple in 8.1, so the pull already happened: Home should have shown a "Welcome
   back" summary of the restored conditions, and the Conditions tab lists Morning steps and the run rule
   with yesterday's progress and streak.
2. Grant Screen Time now (Home fix action › iOS Settings › Screen Time access on, or Settings › Data &
   permissions › Screen Time › Allow). Expect Home moves to "Nothing is being blocked" with **Choose
   apps**: the selection is device-bound and did not come back.
3. Choose apps › pick the two apps. Expect "Apps are blocked" (if a window is live) with "2 apps · 0
   categories".

Capture: screenshot `restore-welcome-back`, `restore-no-apps`, `restore-apps-chosen`.

Save the log as `restore-after-reinstall`.

### 8.3 Deny Motion

*Row 4.* Log: `deny-motion`.

Do: delete the app, reinstall, onboarding with restore, grant Screen Time and pick the two apps, at "Let
ExcerLock count your steps" › Allow Motion & Fitness › the iOS sheet › **Don't Allow**. Finish setup.

Expect Home: the Morning steps row shows the needed-permission state ("Motion access is needed" style
copy, not "0 / 500" and not "Start a walk"), and its fix action goes to iOS Settings › ExcerLock › Motion
& Fitness. Turn it on there, return: the row reads 0 / 500 again.

Capture: screenshot `deny-motion-home`, `deny-motion-settings`.

Save the log as `deny-motion`.

---

## 9. Run the verifier and record the results

```sh
cd app-next
node scripts/verify-device-run.js ../evidence/P2-T11 > ../evidence/P2-T11/verify.txt; echo "exit $?"
cat ../evidence/P2-T11/verify.txt
```

Expect 30 scenario lines and `… 0 fail`. `NOT RUN` means a file is missing; a `FAIL` line prints the
expectation that broke under it.

Then fill in `evidence/P2-T11/RESULTS.md` (the template is in `evidence/P2-T11/README.md`): one row per
scenario id with pass/fail, date, iOS version, device, build commit, and a note. Every failure becomes a
GitHub issue on `JohanSardar/excerlock-app` the same session, titled by what the tester did, with the
verifier's `FAILED:` line, the screenshot names and the log file attached. Anything that could bite
another iOS app (Screen Time, geofence wake, sandbox renewal, Sign in with Apple) goes to the ledger with
the `log-pitfall` skill.

## 10. Every deep link and command used above

| Purpose | URL or command |
| --- | --- |
| Harness task, auto-start | `excerlock://?test=<c1-treadmill-walking \| c2-empty-running-belt \| P3 \| t1-propped-flow \| M2 \| M4 \| M6 \| M7 \| marker-only>&start=1` (harness build only; the path must stay `/`) |
| Diagnostics screen | `excerlock://diagnostics` |
| Dev menu | `excerlock://dev` |
| Shield landing route | `excerlock://locked-apps` (what the shield notification targets; redirects to Home or the paywall) |
| Home | `excerlock://home` |
| Permission detail | `excerlock://settings/permission/screenTime`, `…/motion`, `…/location`, `…/health`, `…/camera`, `…/notifications` |
| Saved gyms | `excerlock://settings/gyms` |
| Ceremonies | `excerlock://unlock/gym`, `excerlock://unlock/treadmill` |
| Send a URL from the Mac | `xcrun devicectl device process launch --device <udid> --payload-url "<url>" com.johansardar.excerlock` |
| Pull the log without AirDrop | `xcrun devicectl device copy from --device <udid> --domain-type appDataContainer --domain-identifier com.johansardar.excerlock --source Documents/diagnostics/latest.log --destination <file>` |
| Crash reports (TCC kills) | `pymobiledevice3 crash pull --udid <udid> ./crashes` |
| Verify | `node scripts/verify-device-run.js ../evidence/P2-T11` |
| Analyze a harness export | `npm run analyze:harness -- <runs.jsonl>` |

The fake-runtime scenario links (`excerlock://dev?scenario=<id>`) are **not** used on the phone: loading a
scenario would overwrite the real app selection handle and entitlement with fixture values.

## Scenario index

| Log file name | Section | Row |
| --- | --- | --- |
| `fresh-install-onboarding` | 3.1 | 1 |
| `trial-reminder` | 3.2 | 8 |
| `five-daily-rules-budget` | 3.4 | 12 |
| `shield-at-window-start-app-killed` | 3.5 | 2 |
| `lockwindow-subtitle-and-tap-through` | 3.5 | 15 |
| `clock-rewind-keeps-lock` | 3.6 | 14 |
| `overlapping-windows-app-killed` | 3.7 | 11 |
| `merged-30-minute-interval` | 3.8 | 16 |
| `shield-refresh-cadence` | 3.9 | 20 |
| `sign-in-apple`, `sign-in-google`, `sign-in-email` | 3.10 | P2-T01 |
| `sentry-test-crash`, `posthog-session-events` | 3.11 | 8 |
| `walking-lease-renewal-hour` | 4.1 | 19 |
| `walking-lease-expiry` | 4.2 | 5 |
| `gym-manual-checkin` | 5.1 | 6 |
| `gym-arrival-app-killed` | 5.2 | 6, 18 |
| `treadmill-propped-scan` | 5.3 | 5 |
| `treadmill-framing-expired` | 5.4 | P2-T21 |
| `treadmill-duration-rule` | 5.5 | 17 |
| `gym-dwell-hour-app-killed` | 5.6 | 18 |
| `sandbox-lapse-clears-shields` | 6.1 | 13 |
| `sandbox-restore` | 6.2 | P2-T06 |
| `step-goal-met-unlocks` | 6.3, 7.1 | 3 |
| `usage-monitor` | 6.4, 7.2 | 10 |
| `running-from-health` | 7.3 | 7 |
| `deny-screen-time` | 8.1 | 4 |
| `restore-after-reinstall` | 8.2 | 9 |
| `deny-motion` | 8.3 | 4 |
| harness exports (`harness/runs.jsonl`) | 2 | 5 |
