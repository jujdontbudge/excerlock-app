# UI inventory — daily-use surfaces (Home, sessions, unlock, sheets, dev)

Scope: `/Users/johansardar/ExcerLock/app-next`. Every path below is absolute-from-repo-root as `app-next/...`.
Read-only audit; no files were modified. Every claim is cited `path:line`.

---

## 1. Route map for the daily-use surfaces

| Route file | Renders | Presentation |
|---|---|---|
| `app-next/app/(tabs)/home.tsx:1` | re-export of `HomeScreen` | tab |
| `app-next/app/(tabs)/_layout.tsx:14-36` | `Tabs` with custom `TabBar`, `initialRouteName="home"`, `detachInactiveScreens={false}`, `lazy: false` | tab bar |
| `app-next/app/(tabs)/_layout.tsx:12` | `useEffect(() => startProgressSync(runtime), [runtime])` — the single app-level port→RuleDay writer | — |
| `app-next/app/unlock/gym.tsx:4-11` | `<UnlockModal><GymUnlockScreen ruleId preview={preview === '1'} /></UnlockModal>` | `fullScreenModal` (`app-next/src/features/launch/RootNavigator.tsx:39`) |
| `app-next/app/unlock/treadmill.tsx:4-11` | same shape for `TreadmillUnlockScreen` | `fullScreenModal` (`RootNavigator.tsx:40`) |
| `app-next/app/dev.tsx:1` | re-export of `DevRoute` | plain stack screen, **registered unconditionally** (`RootNavigator.tsx:23`) |
| `app-next/app/gym-picker.tsx:9-25` | lazy `GymPickerScreen` behind a one-shot picker session | `fullScreenModal` (`RootNavigator.tsx:24`) |

`app-next/app/README.md:1-3` states the router files are thin adapters — that holds for all of the above.

`app-next/app/(tabs)/README.md:3` is **stale**: it claims "Conditions, Analytics and Settings are filled by T10–T12", but all three tab routes already mount real screens (`app-next/app/(tabs)/conditions.tsx:6`, `app-next/app/(tabs)/analytics.tsx:1`, `app-next/app/(tabs)/settings.tsx:5`).

---

## 2. Home — data inputs

`app-next/src/features/home/HomeScreen.tsx:37-58` pulls:

- `useDemoProgress()` (line 38) — capture-only deep-link params, see §8.
- `useClock()`, `useLockDecision()`, `useTodayProgress()`, `useStreak()` (lines 41-44) from `app-next/src/state/selectors.ts:12-72`.
- `profileStore.data.name` (line 45), `rulesStore.data.{rules,lockedApps}` (line 46), `permissionsStore.data` (line 47), `settingsStore.data.gymAutoDetect` (line 48), `ruleDaysStore.data.walkingSession` (line 49).
- `statusContent({...})` (lines 50-57) and `useUnlockMoment(status.state)` (line 58).
- Fires `runtime.analytics.screen('Home')` once (lines 72-74).

`useTodayProgress` (`selectors.ts:31-55`) returns one `{rule,row,instance}` per **enabled** rule that has a window instance today (current instance preferred, else today's window). Rules not scheduled today are dropped entirely.

---

## 3. Home — every status state

All produced by `app-next/src/features/home/statusContent.ts:28-78`. The base model is
`{ icon:'lock-open', title:'No blocking right now', subtitle:'Nothing scheduled today. Enjoy your day.', unlocked:true }` (lines 43-49) — branches that don't override `title`/`icon` inherit it.

| `status.state` | Title | Subtitle | `status.action` → button label | Lock card shown? |
|---|---|---|---|---|
| `noRules` (`statusContent.ts:50`) | "No conditions yet" | "Choose a movement that makes room for the rest of your day." | `add` → **"Add condition"** → `/builder` | no (no rule to select) |
| `allPaused` (`:51-52`) | "All conditions are paused" | "Turn a condition back on when you are ready." | `conditions` → **"View conditions"** → `/conditions` | no |
| `permissionNeeded` (`:53-54`) | **"No blocking right now"** (not overridden) | "Screen Time access needed" | `permission` → **"Allow Screen Time"** → `runtime.screenTime.requestAuthorization()` | **suppressed explicitly** (`HomeScreen.tsx:87`) |
| `noAppsSelected` (`:55-56`) | **"No blocking right now"** (not overridden) | "Choose the apps you want to block" | `apps` → **"Choose apps"** → `runtime.screenTime.presentAppPicker()` | **suppressed explicitly** (`HomeScreen.tsx:87`) |
| `locked` (`:57-67`) | "Apps are blocked", icon `lock`, `unlocked:false` | `Until you ${action}` where action = "start a walk" / "arrive at your gym" / `"walk 1,800 steps"`-style from `domainCopy.verbs` (`:60-65`) | none | yes |
| `unlockedMet` (`:68`) | "Unlocked for the rest of today" | `resume(relockAt)`: "Blocking resumes today/tomorrow/Friday at 9 AM", or "Your apps stay open until your next scheduled condition." when `relockAt` is null (`:31-42`) | none | yes |
| `unlockedWalking` (`:69-70`) | "Unlocked while you walk" | `${mm:ss} left` from `leaseClock` (`:24-27`) | `stop` → **"Stop walk"** → `runtime.walking.stop()` | yes |
| `beforeWindow` (`:71-76`) | "Blocking starts at 9 AM" | "Get ahead: walk 5,000 steps now" | none | yes |
| `afterWindow` (`:77`) | "No blocking right now" | `resume(nextLockAt)` | none | no (`scheduledRuleId` undefined, `HomeScreen.tsx:75-84`) |
| `noRulesToday` (`:78`, fall-through) | "No blocking right now" | "Nothing scheduled today. Enjoy your day." | none | no |

Ten states total. Copy source: `app-next/src/content/home.ts:1-53`.

### 3.1 Which card renders

`app-next/src/features/home/HomeScreen.tsx:146-187`: if `scheduleCard` is truthy the orange **`BlockingScheduleCard`** (lock silhouette) renders; otherwise the **`StatusCard`** (`appearance="orange"`, hero = animated `LivingIcon` of `status.icon`) renders with `status.title` / `status.subtitle`.

`scheduleCard` exists only when a `scheduledRule` is found **and** the state is not `permissionNeeded`/`noAppsSelected` (`HomeScreen.tsx:86-89`). `scheduledRuleId` is chosen per decision (`HomeScreen.tsx:75-84`):
`locked → decision.nextUnlockHint.ruleId`; `beforeWindow → decision.ruleId`; `unlockedMet → decision.byRuleId`; `unlockedWalking → decision.sessionRuleId`; anything else → undefined.

`blockingSchedule(rule)` (`app-next/src/features/home/blockingSchedule.ts:5-23`) yields
`message = "${schedule}\n${condition}"` where schedule is "Block all day" or "Block from 9 AM to 9 PM" and condition is
"until you arrive\nat the gym" (event) / "unlock while you walk" (state) / "until you walk 5,000 steps" (target)
(`app-next/src/content/blockingSchedule.ts:1-10`), plus `start`, `end` (suffixed " · next day" when overnight or all-day), `icon = rule.activity`, `window`.

### 3.2 Full Home child order (top → bottom)

1. Greeting row: `Heading` with `homeCopy.greeting(name)` ("Hi, Alex" or "Your day, with more movement") + long-form date, and a `StreakBadge` (flame + count, a11y "N day streak") — `HomeScreen.tsx:132-145`, `app-next/src/design-system/StreakBadge.tsx:7-18`, `app-next/src/content/format.ts:2`.
2. `BlockingScheduleCard` **or** `StatusCard` — `HomeScreen.tsx:146-187`.
3. White "Conditions" list card (only when `scheduleCard && progress.length`) — `HomeScreen.tsx:188-224`.
4. Secondary status line `"{title}. {subtitle}"` (only when `scheduleCard && status.unlocked`) — `HomeScreen.tsx:225-229`.
5. Status action button (`actionLabel`) — `HomeScreen.tsx:230-234`.
6. `Label "Conditions"` section header (only when `!scheduleCard && progress.length`) — `HomeScreen.tsx:235-241`.
7. `conditionCards` (only when `!scheduleCard`) — `HomeScreen.tsx:242`.
8. "Lock list" `SettingsRow` → `runtime.screenTime.presentAppPicker()` — `HomeScreen.tsx:243-252`.
9. **"Test gym unlock"** and **"Test treadmill unlock"** buttons — `HomeScreen.tsx:254-255`.
10. "Analytics" `SettingsRow` → `/analytics` — `HomeScreen.tsx:262-267`.
11. "History" `SettingsRow` — **no `onPress`** — `HomeScreen.tsx:275`.
12. "Add condition" button (only when `!scheduleCard`) — `HomeScreen.tsx:277`.
13. Overlay: `HomeSheets` — `HomeScreen.tsx:121-131`.

Note the "Conditions" heading text is `homeCopy.today: 'Conditions'` (`content/home.ts:5`) — same word as the Conditions tab.

---

## 4. Home with TWO OR MORE enabled rules on the same day

This is the least-finished area of Home.

### 4.1 Which rule drives the lock card

For `locked`, `resolveLock` sets `nextUnlockHint = unlockHint(active, rows)` (`app-next/src/domain/resolveLock.ts:33-40`) and `unlockHint` reduces the offers (`app-next/src/domain/unlockHint.ts:15-19`):

- Any rule whose mode is **not** `target` (i.e. walking-state or gym-arrival) **wins outright** over every step/minute/distance target, no matter how close the target is.
- Among two `target` rules, a later offer replaces the current best **only if the units match and its remaining is smaller** (`unlockHint.ts:18`). Two targets with different units (e.g. "5,000 steps" and "20 minutes") are decided purely by **array order in `rules`** — the first one wins.

So with the shipped `multi-rule-overlap` scenario (`app-next/src/demo/scenarios/multi-rule-overlap.ts:2-8`: walk-5000-steps, run-20-minutes, walking-state-either), the lock card is driven by the **walking-state** rule and reads "Block from 9 AM to 9 PM / unlock while you walk". The other two rules never appear in the headline.

For `beforeWindow` the driver is `starts[0].ruleId` — the earliest-starting window, ties broken by sort order (`resolveLock.ts:41-45`). For `unlockedMet` it is the most recent met row's rule (`resolveLock.ts:23-32`).

### 4.2 What the other rules show — and the drop-out bug

`conditionCards` is built for **every** rule in `progress` (`HomeScreen.tsx:90-108`) and passed as `children` to `BlockingScheduleCard`. But `BlockingScheduleCard` renders `{action ?? children}` (`app-next/src/design-system/BlockingScheduleCard.tsx:77`) — **when `action` is present the children are discarded**.

`action` is present whenever `entryRules.length > 0` (`HomeScreen.tsx:151-171`), and `entryRules` is non-empty whenever the state is `locked` and any active rule maps to a gym or treadmill unlock kind (`HomeScreen.tsx:109-116`, `app-next/src/features/unlock/entry.ts:2-6`).

Consequence: **any locked day that includes a gym rule or a treadmill/either walking-state rule renders zero progress cards.** They are not rendered outside the card either, because `{!scheduleCard ? conditionCards : null}` (`HomeScreen.tsx:242`). The user's step/minute/distance progress simply vanishes from Home for that day. `multi-rule-overlap` hits this exact case.

When there is no entry rule (e.g. two step targets), each rule renders a `ProgressCard` with `appearance="lock"` inside the orange body: icon + `detail` + a thicker inverse progress bar, and the **title is deliberately omitted** (`app-next/src/design-system/ProgressCard.tsx:41-51`; documented in `app-next/src/features/home/README.md:5`). With two same-icon rules the rows become hard to tell apart — only the `detail` string ("3,200 / 5,000 steps" vs "0 / 20 minutes") distinguishes them. The `ProgressBar` still carries the rule title as its accessibility label (`ProgressCard.tsx:65`).

### 4.3 What the user can tap with 2+ rules

- **Unlock entry buttons** inside the lock card, at most one per kind (`HomeScreen.tsx:110-115` maps over `['gym','treadmill']`): "I'm at the gym" / "I'm using a treadmill" (`content/home.ts:2-3`), each pushing `/unlock/{kind}?ruleId=…` (`HomeScreen.tsx:164-166`). The sub-caption under the button is shown **only when there is exactly one entry** (`HomeScreen.tsx:160-162`) — with both a gym and a treadmill rule the buttons are unlabelled beyond their title. Rendered by `app-next/src/features/unlock/UnlockEntry.tsx:6-47`.
- **Progress-card action button** (only when the cards survive §4.2): `ProgressCard.action`/`onAction` (`HomeScreen.tsx:100-105`) — routes to `/unlock/{kind}` if the rule has one, else opens a sheet.
- **The white "Conditions" list** (`HomeScreen.tsx:188-224`) — one **non-interactive** row per rule: activity icon + `ruleName(rule)`, with a hairline divider. No progress, no tap target. The only control is the trailing `SecondaryButton variant="tertiary"` **"Edit / Add"** → `/conditions` (`HomeScreen.tsx:221`).

So in the common multi-rule locked case the secondary rules are visible only as static name rows.

### 4.4 Other multi-rule observations

- `status.title`/`status.subtitle` for the `locked` state are **never rendered** when the lock card is showing — line 225 gates that label on `status.unlocked`. The "Until you walk 1,800 steps" hint therefore never reaches the screen in the locked state; the card message and the entry buttons are all the user gets.
- The lock silhouette is identical in `locked`, `beforeWindow`, `unlockedMet` and `unlockedWalking` — always `<Icon name="lock">` (`BlockingScheduleCard.tsx:61`) and always the closed shackle (`BlockingScheduleCard.tsx:35`). Only the small secondary label (line 4 of §3.2) says the apps are currently open.
- `useUnlockMoment` (`app-next/src/features/home/useUnlockMoment.ts:6-21`) still fires the success haptic on entering `unlockedMet`, but its animated scale is applied only to the `StatusCard` hero (`HomeScreen.tsx:182-184`) — invisible whenever the lock card is showing.

---

## 5. Sessions (`app-next/src/features/sessions`)

### 5.1 `HomeSheets` — one live sheet, one dead branch

`app-next/src/features/sessions/HomeSheets.tsx:3-15`:
- Props type declares `onChooseGym: () => void` (line 11) but the destructure (lines 4-7) **omits it** — the prop passed from `HomeScreen.tsx:126-129` (which would push `/settings/gyms`) is dead.
- `sheet.type === 'walk'` → `WalkingSheet`; **anything else returns `null`** (line 15).
- `progressContent` only ever emits `action: 'checkin'` for `rule.activity === 'gym'` (`app-next/src/features/home/progressContent.ts:37,54`), and `unlockKind` returns `'gym'` for **every** gym rule (`app-next/src/features/unlock/entry.ts:3`), so `HomeScreen.tsx:103` always routes gym taps to `/unlock/gym` and `setSheet({type:'checkin'})` (line 104) is **unreachable**. The `'checkin'` sheet type is dead. `app-next/src/features/sessions/README.md:3` confirms `CheckInSheet` was removed but the type and the Home branch were left behind.

### 5.2 `WalkingSheet` — phases, buttons, exits

`app-next/src/features/sessions/WalkingSheet.tsx:15-129`. Reached only from a `state`-mode walking rule whose `place === 'outside'` (otherwise `unlockKind` sends it to `/unlock/treadmill`).

| `session.phase` | Title | Support | Body | Footer |
|---|---|---|---|---|
| none (`ready`) | "Ready when you are" | "Start your walk and we'll check your pace." | treadmill framing block if `place==='treadmill'` (lines 109-127) | `PrimaryButton "Start walking"`, `loading={busy}`, `disabled={treadmill && !frame.ready}` (lines 54-59) |
| `verifying` | "Start walking…" | "Checking your pace" | — | "Stop walk" + "Minimize" (lines 48-52) |
| `walking` | "Keep moving" | "Your apps are open while you walk." | `mm:ss` metric + "until renewal" + `TickingNumber` steps (lines 87-108) | "Stop walk" + "Minimize" |
| `grace` | "Keep walking to stay unlocked" | — | `mm:ss` of `detail.graceUntil` (lines 95-101) | "Stop walk" + "Minimize" |
| `ended` | "Walk complete" | — | `TickingNumber` minutes (lines 102-108), icon switches to `check` (line 62) | `PrimaryButton "Done"` → clears `walkingSession` then `onDismiss()` (lines 40-47) |

Copy: `app-next/src/content/sessions.ts:1-24`. Dismissal paths: "Minimize" (`onDismiss`, session keeps running), "Done" (clears the session), sheet swipe/backdrop via `BottomSheet onDismiss` (line 37), "Stop walk" (`runtime.walking.stop()` — moves the session to `ended`, does **not** close the sheet). Failure path: `start()` catches nothing — `runtime.walking.start` throws for a non-`state` or disabled rule (`app-next/src/demo/fakes/WalkingFake.ts:46-47`) and there is **no error surface in the sheet**; `busy` is cleared in `finally` (lines 26-33) and the rejection is unhandled.

Framing block (treadmill + no active session, lines 109-127) is a static mint-bordered square with a `person` glyph and "Prop your phone on the console" / "Keep your full body in view. The camera preview appears here when connected." — an explicit placeholder for a camera preview that this sheet never mounts.

Tests: `app-next/src/features/sessions/__tests__/sheets.test.tsx:7-46` cover the script, minimize, stop, done, and the disabled/enabled treadmill start button.

### 5.3 `ShieldPreview` — dev-only, and one dead cause

`app-next/src/features/sessions/ShieldPreview.tsx:8-28`. Reached **only** via `/dev?stage=shield` (`app-next/src/features/dev/DevRoute.tsx:25-26`, menu row at `app-next/src/features/dev/DevMenu.tsx:49`).

Layout: `SegmentedControl` over `sessionCopy.causes = ['locked','lockWindow','walkingEnded']` (`content/sessions.ts:47`), a `LivingIcon name="lock"`, then `Heading` + centered `Label` from `shieldContent`, with `PrimaryButton content.primary` → `onOpen` (`router.replace('/home')`) and `SecondaryButton content.secondary` → `onClose` (`router.replace('/dev')`).

`app-next/src/domain/shieldContent.ts:3-16` cause variants:

| Input | Subtitle | Secondary button |
|---|---|---|
| `cause === 'walkingEnded'` | "Your walk has ended. Start walking again to open your apps." | "Keep walking" |
| `hint.action === 'walk'` | "Start a walk to open your apps." | "Keep walking" |
| `hint.action === 'arrive'` | "Arrive at your saved gym to open your apps." | "OK" |
| `hint.remaining` present | "1,800 steps to go to open your apps." | "OK" |
| no hint | "Complete an exercise condition to open your apps." | "OK" |

Title is always "Blocked by ExcerLock"; primary is always "Open ExcerLock".

**`'locked'` and `'lockWindow'` produce byte-identical output** — `cause` is only consulted for `'walkingEnded'` (`shieldContent.ts:4-14`). The three-way segmented control has two distinct outcomes. Also, the hint is passed only when the *live* decision is `locked` (`ShieldPreview.tsx:11`), so in any other scenario both non-`walkingEnded` causes collapse to the generic fallback.

---

## 6. Unlock ceremonies (`app-next/src/features/unlock`)

Shared chrome — `app-next/src/features/unlock/UnlockLayout.tsx:11-43`: a header row with a `×` `Pressable` (a11y label "Close unlock screen", `content/unlock.ts:2`) plus a "Unlock preview" label when `preview` is true; children in a `ScreenShell`; caller-supplied footer.
Success overlay — `UnlockLayout.tsx:44-65` `Detected`: a full-bleed `rgba(239,76,0,0.88)` panel with a check glyph, title and body, entering with `popIn`.
Lock visual — `app-next/src/design-system/UnlockLockFrame.tsx:20-96`: shackle + gradient body + `UnlockRing` progress stroke (`app-next/src/design-system/UnlockRing.tsx:6-23`, geometry `app-next/src/features/unlock/geometry.ts:1-14`); `phase==='lifted'` animates the shackle up/rotated (or cross-fades under reduced motion, lines 70-84), fires a success haptic at 180 ms and `Confetti` at 420 ms unless `reduced` or `celebrate === false` (lines 39-54). Accessibility label flips "Lock closed" ⇄ "Lock open" (line 66).
Ceremony timing — `app-next/src/features/unlock/useCeremony.ts:6-33`: on `lifted`, the `Detected` overlay + VoiceOver announcement at **520 ms**, the "Done" button at **1500 ms**; a selection haptic on each quarter of progress (lines 15-19).

### 6.1 Gym unlock — `/unlock/gym`

Screen `app-next/src/features/unlock/GymUnlockScreen.tsx:16-95`; state machine `app-next/src/features/unlock/useGymUnlock.ts:8-108`.

Phases / titles (`GymUnlockScreen.tsx:41-58`, copy `app-next/src/content/unlock.ts:19-37`):

| Condition | Title | Body | Footer button |
|---|---|---|---|
| `state.denied` (location sample threw or returned null) | "Location access is off" | "Allow location while using ExcerLock to check in." | "Open Settings" → `Linking.openSettings()` (`:67`) |
| `noGym` = `!nearest && !preview` | "Save a gym first" | — | "Choose a gym" → `/settings/gyms` (`:69`) |
| `state.working` | "Confirming you're here" | "Stay put for a moment." | "Unlock" rendered `loading` + `disabled` (`:71-76`) |
| `state.inside` | "Location detected at the gym" | "You're at {gym}." | "Unlock" → `state.unlock()` |
| otherwise (outside) | "Not at the gym yet" | "You're 140 m from {gym}." (`distanceLabel`, `geometry.ts:15-16`) | **none** |
| `state.lifted`, before `ceremony.done` | overlay `Detected` replaces the heading (`:88,91`) | — | **none** (`:66`) |
| `ceremony.done` | overlay stays | — | "Done" → `close()` (`:64-65`) |

Detected overlay body (`GymUnlockScreen.tsx:30-31`): "Your gym time is counting" for a `target` gym rule, otherwise "Unlocked until {end}".
Error: `state.error` renders a `Label accessibilityRole="alert"` (`:92`) with the **hardcoded** string `'Could not check in. Please try again.'` (`useGymUnlock.ts:103`).

Timing and failure paths (`useGymUnlock.ts`):
- Confirmation window `PRESENCE_CONFIRM_MS = 30000`, or 3000 ms in preview (`:7,66`).
- Presence loss mid-confirmation: `observePresence('outside')` clears `working`, resets `value` to 0, bumps `generation`, logs `gym_unlock_lost` (`:44-54`); the aborted `checkIn` rejection is swallowed because the token no longer matches (`:99-105`).
- Unmount/close aborts the in-flight `checkIn` via `AbortController` (`:20,55-60`).
- `unlock()` is a no-op unless `inside && !working && !lifted` (`:82`).
- Preview never calls `runtime.gym.checkIn` (`:90`) — the timer alone lifts the lock (`:71-77`).
- Analytics: `unlock_screen_opened`, `gym_unlock_tapped`, `gym_unlock_confirmed`, `gym_unlock_lost`, `unlock_ceremony_done` (`GymUnlockScreen.tsx:34,38`; `useGymUnlock.ts:51,75,88,96`).

Map surface `app-next/src/features/unlock/GymUnlockMap.tsx:11-91`: `MapView` with `showsUserLocation`, auto-follow that turns off on `onPanDrag`, and two floating discs — "Center on me" and "Center on gym" (a11y labels from `content/unlock.ts:27-28`). The gym circle + marker are drawn **only when `inside` or after the user taps "Center on gym"** (`:40`) — a user standing outside never sees where the gym is on the map until they tap.

Already-credited case: `alreadyCredited` (`GymUnlockScreen.tsx:20-25`) starts the hook `lifted` with `value = 1` and passes `celebrate={false}` (`:84`), so re-opening the screen after credit shows an already-open lock and then the "Location detected at the gym" overlay — presented as a fresh detection.

Tests: `app-next/src/features/unlock/__tests__/gym.test.tsx:22-56` (30 s confirmation, presence loss reset, preview isolation, credit only after full confirmation).

### 6.2 Treadmill unlock — `/unlock/treadmill`

Screen `app-next/src/features/unlock/TreadmillUnlockScreen.tsx:12-142`; controller `app-next/src/features/unlock/gait/TreadmillScanController.ts:27-190`.

Controller phases (`TreadmillScanController.ts:6`): `idle | scanning | needsFraming | verified | permissionDenied | expired`.

| Screen condition | Title | Body | Footer |
|---|---|---|---|
| `denied` (`phase==='permissionDenied'`) | "Camera access is off" | "Keep your phone with you. Walk & Scroll will verify your steps instead." | **"Continue with phone in hand"** → sets placement `handheld`, `runtime.walking.start(rule)`, marks verified, `router.back()` (`:108-119`) |
| `framing` (`phase==='needsFraming'`) | "Can't see you" | "Step into frame." | none |
| `scanning` (`confidence > 0 && !lifted`) | "Reading your stride" | "Keep walking. A few seconds." | none |
| default (`idle`, or scanning at confidence 0) | "Prop your phone and walk" | "Set it upright facing you. The scan starts on its own once you're walking." | none |
| `lifted` (`phase==='verified'`) | overlay "Exercise detected" / "Unlocked while you walk" (`:131`) | — | "Done" after 1500 ms (`:106-107`) |
| `expired` | — | — | **screen closes itself** (`:47-50`) |

Always visible: the privacy line "Processed on this iPhone. Nothing is recorded or sent." (`:136-138`, `content/unlock.ts:12`) and, on error, a `Label accessibilityRole="alert"` (`:139`).

Failure and dismissal paths:
- Missing/incorrect rule: `startScan` throws `'Choose a treadmill walking condition first.'` (`:58`) — a **hardcoded string, not in `src/content`** — surfaced through `error`.
- Camera denial: controller detects `ERR_GAIT_VISION_DENIED` (`TreadmillScanController.ts:63,192-194`), stops the walk, logs `treadmill_scan_failed {reason:'denied'}` (`:42-45`).
- Timeout: after `GAIT_SCAN_TIMEOUT_MS` the detector restarts once and opens a `GAIT_FAILURE_GRACE_MS = 30_000` grace (`TreadmillScanController.ts:118-142`); on expiry `onExpired` stops the walk, logs `treadmill_scan_failed {reason:'timeout'}` and calls `router.back()` — **the user is dropped back to Home with no explanation** (`TreadmillUnlockScreen.tsx:46-50`).
- Backgrounding stops the scan, foregrounding restarts it (`:71-75`).
- Close/unmount: if not verified and not preview, `runtime.walking.stop()` (`:25,81`).
- Analytics: `unlock_screen_opened`, `treadmill_scan_started`, `treadmill_scan_verified`, `treadmill_scan_failed`, `unlock_ceremony_done` (`:24,30,40,44,48,63`).

Camera surface: `provider.Preview` (`:100,129`) — real native view via `app-next/src/runtime/NativeGait.tsx:13,30`, or a static walking glyph on a subtle background in the fake (`app-next/src/demo/fakes/GaitFake.tsx:43-49`). In the simulator the "camera" is that glyph.

Tests: `app-next/src/features/unlock/__tests__/treadmill.test.tsx:7-34` (preview does not start a session; denial offers handheld), `.../UnlockLockFrame.test.tsx:9-18`, `.../geometry.test.ts:3-17`.

### 6.3 Entry points into the ceremonies

- Locked-state entry buttons on the lock card (§4.3).
- Any `ProgressCard` action for a rule with an unlock kind (`HomeScreen.tsx:102-103`).
- Home's two **test buttons** with `?preview=1` (`HomeScreen.tsx:254-255`).
- Scenarios `unlock-treadmill-scan|framing|denied|reduced` and `unlock-gym-inside|outside|lost|reduced` (`app-next/src/demo/scenarios/unlock.ts:5-43`), loaded from the dev menu.

---

## 7. Sheets (`app-next/src/features/sheets`)

- **`FakeAppPicker`** (`FakeAppPicker.tsx:10-69`) — Phase-1 stand-in for Apple's private picker. `BottomSheet` titled "Choose apps to block", a search `TextField`, a "N apps · M categories" count line, then Categories and Apps `ChoiceRow`s over the ten fake options in `app-next/src/content/pickers.ts:7-18`, an empty state "No matches. Try a different search.", and a "Done" `PrimaryButton`. Dismiss resolves `false`. Mounted globally by `app-next/src/features/permissions/FakePromptHost.tsx:9-10` when `runtime.screenTime.presentAppPicker()` raises a `picker` prompt (`app-next/src/demo/fakes/ScreenTimeFake.ts:10-16`). Only aggregate counts + an opaque token escape (`app-next/src/features/sheets/selection.ts:7-15`).
- **`GymPicker`** (`GymPicker.tsx:4-28`) — renders `null`; it is a one-shot opener that pushes `/gym-picker` and completes its session on save/dismiss/unmount. Not reachable from Home.
- Tests: `__tests__/picker.test.tsx:3-11`, `__tests__/selection.test.ts:2-12`, `__tests__/gym.test.ts:3-27`. `app-next/src/features/sheets/README.md:1-5` is accurate.

---

## 8. Dev-only surfaces and test buttons that must not ship

1. **`HomeScreen.tsx:254-255` — "Test gym unlock" / "Test treadmill unlock".** Two always-visible `SecondaryButton`s on the production Home screen pushing `/unlock/gym?preview=1` and `/unlock/treadmill?preview=1`. The labels are hardcoded English literals, not in `src/content`. These are the single most obvious ship blockers on this surface.
2. **`/dev` route registered unconditionally** — `RootNavigator.tsx:23` has no `__DEV__` guard and no `Stack.Protected` wrapper, unlike every other non-boot screen (`RootNavigator.tsx:25-41`). Reachable by deep link (`excerlock://dev`, scheme in `app-next/app.json:8`) and by tapping the Settings version string seven times (`app-next/src/features/settings/SettingsScreen.tsx:160-171`).
3. **`DevMenu`** (`app-next/src/features/dev/DevMenu.tsx:22-66`) — scenario loader (load / load-and-keep for all 32 scenarios, `app-next/src/demo/scenarios/index.ts:26-52`), "Component gallery", "Shield preview", a live analytics event log, and a literal `xcrun simctl … recordVideo` command string with a hardcoded simulator UDID (`app-next/src/content/dev.ts:42`).
4. **`DevControls`** (`app-next/src/features/dev/DevControls.tsx:20-129`) — treadmill gait override (walking/still/none), gym presence toggle, phone-placement toggle, "Add 1,000 steps", "Pause all conditions", clock `+1 hour`/`+1 day`/set-ISO-time, permission-prompt mode, next-request outcome, restore outcome, per-permission cyclers, and entitlement/session overrides (including a fake Apple sign-in as `alex@example.test`).
5. **`ShieldPreview`** (§5.3) and **`PreviewGallery`** (`app-next/src/features/dev/PreviewGallery.tsx:5-27`).
6. **`StagePreview`** (`app-next/src/features/dev/StagePreview.tsx:5-16`) — "Scenario loaded / This route is ready for its screen implementation." **Nothing imports it** (checked `app-next/src/features/dev` and `app-next/app`); it is orphaned scaffolding.
7. **Deep-link dev controls** — `applyDevControls` accepts `scenario`, `restore`, `outcome`, `prompt`, `setup` on `/dev` (`app-next/src/features/dev/applyDevControls.ts:4-11`, wired at `DevRoute.tsx:21-24`); `useDemoProgress` accepts `steps`, `advance`, `presence`, `placement` **on Home itself** (`app-next/src/features/home/useDemoProgress.ts:6-25`). The Home hook is unguarded: `excerlock://home?steps=5000` mutates the runtime in any build.

---

## 9. Half-built, dead, and copy-vs-code mismatches

**Dead UI**
- `HomeScreen.tsx:275` — **"History" `SettingsRow` with no `onPress`**. `SettingsRow` renders no chevron and is not pressable without one (`app-next/src/design-system/SettingsRow.tsx:74-85`), so it is an inert row that looks like a nav item minus the chevron. Copy exists at `content/home.ts:21`.
- `HomeSheets` `'checkin'` branch and the `onChooseGym` prop (§5.1).
- `app-next/src/features/home/TabPlaceholder.tsx` — imported only by `app-next/src/features/home/__tests__/home-router.test.tsx:10`; no production route uses it.
- `app-next/src/features/dev/StagePreview.tsx` — unreferenced (§8.6).
- Shield preview `'locked'` vs `'lockWindow'` are indistinguishable (§5.3).

**Dead / orphan copy**
- `content/home.ts`: `keepMoving` (:26), `remaining` (:28), `completed` (:47), `continue` (:52), `close` (:53) — no references outside the file.
- `content/sessions.ts`: `checkin` (:24), `at` (:25), `inside` (:26), `outside` (:27), `timeSuccess` (:29), `success` (:34), `noGym` (:35), `error` (:37) — left over from the removed `CheckInSheet` (`app-next/src/features/sessions/README.md:3`).
- `content/pickers.ts:22-31` — the gym-specific keys (`gymTitle`, `gymSearch`, `gymName`, `save`, `nameError`, `limit`, `saveError`, `map`, `saved`) duplicate `content/gymPicker.ts` and belong to the retired sheet-based picker.

**Hardcoded strings outside `src/content`**
- `useGymUnlock.ts:103` `'Could not check in. Please try again.'` (duplicates the unused `sessionCopy.error`).
- `TreadmillUnlockScreen.tsx:58` `'Choose a treadmill walking condition first.'` and `:67` `'Could not start the scan.'`.
- `GymUnlockMap.tsx:31` `accessibilityLabel="Map of your location"`; `GymUnlockScreen.tsx:81` `"Presence check"`; `TreadmillUnlockScreen.tsx:124` `"Scan progress"`; `UnlockLockFrame.tsx:66` `"Lock open"`/`"Lock closed"`.
- `GymUnlockScreen.tsx:31` fallback gym name `'your gym'` and preview end time `'9 PM'` (`:31`).
- `HomeScreen.tsx:254-255` test-button labels.

**Copy promising behaviour the code does not have**
- `content/home.ts:41` "Your next visit counts" and `:36` "Start a walk" survive, but the gym check-in flow they were written for is gone; gym taps now go to the full-screen ceremony.
- `GymUnlockScreen.tsx:30-31` shows "Location detected at the gym / Your gym time is counting" and lifts the lock with confetti for a **gym-minutes target** rule — yet `checkIn` writes no new progress for a `target` gym rule (`app-next/src/demo/fakes/GymFake.ts:85-87` passes the existing progress straight through). Minutes only accrue afterwards, on clock ticks while presence holds (`app-next/src/demo/gymProgress.ts:24-45`). The apps are still blocked when the ceremony says "unlocked".
- Treadmill: `completeProppedScan` moves the session to `walking` and sets a 15-minute lease but **never starts the `play()` loop** (`app-next/src/demo/fakes/WalkingFake.ts:80-88` vs `:19-43`), so `details()` stays `{steps:0, walkingSeconds:0}` and `writeWalkingProgress` never runs. Consequence: a treadmill-verified walk contributes **zero** minutes to `RuleDay.progress`, and the streak rule that credits state-only days needs ≥10 walking minutes (`app-next/src/domain/streak.ts:3,9` via `app-next/src/state/todayHistory.ts:24-33`) — so a treadmill unlock never counts toward the streak badge on Home.
- `WalkingSheet.tsx:118-124` "The camera preview appears here when connected" — a bordered glyph square; this sheet has no camera path at all (the real one lives in `/unlock/treadmill`).
- `content/home.ts:51` `placeholder: 'Your plan is ready to grow here.'` — only used by the now-unreferenced `TabPlaceholder`.

**Status-model bugs**
- `statusContent.ts:53-56` — the `permissionNeeded` and `noAppsSelected` branches do not override `title` or `icon`, so the card reads "**No blocking right now**" with an open-padlock hero while telling the user Screen Time access is missing or no apps are chosen, and stays `unlocked: true`.
- `HomeScreen.tsx:225` — the status title/subtitle line is gated on `status.unlocked`, so the locked-state hint is never shown (§4.4).

**Layout / duplication**
- `GymUnlockScreen.tsx:28-29` re-implements minute→label formatting inline instead of using `minuteLabel` (`app-next/src/domain/scheduleLabel.ts:3-7`); it uses a plain space where the domain helper uses a non-breaking space, and it maps an `allDay` window to `11:59 PM` rather than the "next day" phrasing `blockingSchedule` produces (`blockingSchedule.ts:9,20`).
- `blockingSchedule.ts:9` treats `allDay` as overnight, so an all-day rule's end label renders "12 AM · next day".
- The four white pill cards on Home (Lock list, Analytics, History, plus the Conditions card) repeat the same inline `backgroundColor/borderRadius/boxShadow` literal four times (`HomeScreen.tsx:193-198, 245-249, 257-261, 270-274`) instead of a shared component.
- `HomeScreen.tsx` is ~281 lines with the layout, routing, sheet state and dev buttons inline — the largest file in the daily-use set and the one place where the repo's "small files, one responsibility" rule (`AGENTS.md`) visibly slips.

**Docs drift**
- `app-next/app/(tabs)/README.md:3` — "Conditions, Analytics and Settings are filled by T10–T12" (they are).
- `app-next/src/features/home/README.md:5` — "Condition actions remain interactive and the separate duplicate condition list is hidden." Neither is true when an unlock entry exists: the condition cards are dropped entirely (§4.2) and the duplicate list at `HomeScreen.tsx:188-224` is always shown alongside the lock card.
- `app-next/src/features/unlock/README.md:11` correctly flags the remaining Phase-2 work (device enforcement, background geofencing, lease notifications, handheld hand-off) and physical-device camera validation (ticket #113).

---

## 10. Test coverage in these directories

| File | Covers |
|---|---|
| `app-next/src/features/home/__tests__/home-router.test.tsx:11-47` | boot → `/home`, Conditions header, rule name row, lock-card header copy, "Edit / Add" → `/conditions`, tab return, "Lock list" → picker |
| `app-next/src/features/home/__tests__/blockingSchedule.test.ts:3-34` | range/gym-arrival/overnight/all-day/state message and labels |
| `app-next/src/features/home/__tests__/live-progress.test.ts:7-54` | window entry, step latch, new-day reset, denied Motion, scenario-switch isolation, stale Health workouts |
| `app-next/src/features/home/__tests__/unlock.test.tsx:5-17` | one success haptic on entering `unlockedMet` |
| `app-next/src/features/sessions/__tests__/sheets.test.tsx:7-46` | walking script, minimize/stop/done, treadmill framing gate |
| `app-next/src/features/unlock/__tests__/*` | ring geometry, confetti lifetime, distance copy, gym 30 s + presence loss + preview isolation + credit timing, treadmill preview + camera denial, lock-frame semantics |
| `app-next/src/features/sheets/__tests__/*` | app-picker aggregation, gym save limits, location upgrade |
| `app-next/src/features/dev/__tests__/DevMenu.test.tsx:10-21` | scenario load + clock advance |

**Not covered anywhere I could find:** the multi-rule Home composition (no test renders Home with 2+ enabled rules — `home-router.test.tsx` uses the single-rule `home-locked-walking` scenario), the `action ?? children` drop-out, the `permissionNeeded`/`noAppsSelected` title regression, the treadmill `expired` silent dismissal, and the "History" dead row. The snapshot directory `app-next/src/features/home/__tests__/__snapshots__/` contains **only a README** (`__snapshots__/README.md:1-3`) — no snapshots exist despite the README describing "generated rendered facts for Home".
