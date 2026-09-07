# ExcerLock `app-next` — UI inventory: management surfaces

Scope: Conditions list + builder, Analytics, Settings (+ sub-routes), gym picker, permissions presentation, the rule draft model (`src/features/rules`), and the domain helpers `validateRule` / `ruleName` / `scheduleLabel`. Read-only audit; every claim is cited as `path:line`. Paths are relative to `/Users/johansardar/ExcerLock/app-next` unless stated.

---

## 0. Route map for these surfaces

| Route file | Renders | Notes |
|---|---|---|
| `app/(tabs)/conditions.tsx:1-11` | `ConditionsScreen` | `onAdd` → `/builder`; `onEdit(id)` → `/builder?id=…` |
| `app/(tabs)/analytics.tsx:1` | `AnalyticsScreen` (default re-export, no props) | |
| `app/(tabs)/settings.tsx:1-6` | `SettingsScreen` | `navigate(p)` → `/settings/<p>`; `onDev` → `/dev` |
| `app/builder.tsx:1-19` | `ConditionBuilder` wrapped in its own `SafeAreaProvider` + `GestureHandlerRootView` | `key={id ?? 'new'}`; close → `router.back()` else `replace('/conditions')` |
| `app/gym-picker.tsx:1-26` | lazy `GymPickerScreen` | one-shot callback session id in the URL; unmount finishes the session as "not saved" (`:11`) |
| `app/settings/_layout.tsx:1-6` | `Stack`, `slide_from_right` (fade under Reduce Motion) | |
| `app/settings/account.tsx:1-6` | `AccountScreen` | `onSignIn` → `/sign-in` (full-screen modal, `src/features/launch/RootNavigator.tsx:37`) |
| `app/settings/gyms.tsx:1-6` | `GymsScreen` | |
| `app/settings/support.tsx:1-6` | `SupportScreen` | |
| `app/settings/legal/[doc].tsx:1-12` | `LegalScreen` inside `SettingsPage` | param coerced: anything ≠ `terms` renders `privacy` (`:9`) |
| `app/settings/permission/[name].tsx:1-14` | `PermissionDetail` inside `SettingsPage` | unknown name silently falls back to `screenTime` (`:11`) |

Navigation guards: `(tabs)`, `settings`, `sign-in`, `builder` are all behind `entitled && onboarding.setupComplete` (`src/features/launch/RootNavigator.tsx:34-41`). `gym-picker` is **outside** every guard, declared as a `fullScreenModal` at `src/features/launch/RootNavigator.tsx:24`. `builder` is `fullScreenModal` (`:38`).

Tab bar: four tabs from `src/content/tabs.ts:1-6`, all kept mounted (`lazy: false`, `detachInactiveScreens={false}`, `app/(tabs)/_layout.tsx:16-19`), so Analytics period/offset state and Conditions scroll survive tab switches (`app/(tabs)/README.md:3`).

---

## 1. Conditions list — `src/features/conditions/ConditionsScreen.tsx`

### What is on screen (top → bottom)
1. `Heading` "Conditions" — `:46`, copy `src/content/conditions.ts:2`.
2. If any rules: one `RuleCard` per rule inside a staggered `Reveal` — `:49-61`.
3. If no rules: `EmptyState` icon `walking`, title "Your first condition starts here", body "Choose an activity and give your apps a reason to wait.", action button "Add condition" — `:64`, copy `src/content/conditions.ts:8-9,6`.
4. `PrimaryButton` "Add condition" — **only rendered when the list is non-empty** (`:66`); the empty state carries its own button instead.
5. A single pill-shaped card holding a `SettingsRow` titled **"Lock list"** with a lock icon, tapping it calls `runtime.screenTime.presentAppPicker()` — `:67-69`.

### Ordering, enable/disable, delete, reorder
- Ordering is fixed: `[...rules].sort((a,b) => b.createdAt.localeCompare(a.createdAt))` — newest first (`:28`).
- **Reorder: absent.** No drag handle, no index/priority/sortOrder field anywhere in `src/features/conditions`, `src/features/rules` or `src/state/rulesStore.ts` (grepped; zero hits). `Rule` has no ordering field (`src/domain/types.ts:4-12`). Rules are evaluated as a set, not a list (`src/domain/resolveLock.ts:13-49`).
- Enable/disable: `RuleCard`'s `Switch` (`src/design-system/RuleCard.tsx:94-104`) → `toggleRule(id, value)` (`ConditionsScreen.tsx:57`) → `src/features/conditions/mutations.ts:11-15`, a plain `map` patch of `enabled`. Haptic on change (`RuleCard.tsx:100`). No confirmation, no undo.
- Delete has **three** entry points on one card: swipe-left reveal ("Delete", `RuleCard.tsx:37-57`), a trash `PressableScale` in the card footer (`RuleCard.tsx:110-112`), and an accessibility custom action named `delete` (`RuleCard.tsx:74-77`). All call `onDelete` → `setDeleting(rule.id)` (`ConditionsScreen.tsx:58`) → a `ConfirmSheet` (`:33-44`) titled "Delete condition?" with body "This condition and its progress will be removed. Your other conditions and locked apps stay as they are.", confirm "Delete condition", cancel "Keep condition" (`src/content/conditions.ts:18-22`).
- Confirmed delete → `deleteRule(id)` (`mutations.ts:16-23`): removes the rule **and** all `ruleDays` rows for it, and nulls `walkingSession` if it belonged to that rule. Toggling off does **not** touch `ruleDays` — a disabled rule keeps its met/progress rows, so re-enabling restores an already-met day.
- Editing: card body press or the ✎ button (`RuleCard.tsx:71,107`) → `onEdit(rule.id)` → `/builder?id=`.

### Card contents
`title = ruleName(rule)` (`ConditionsScreen.tsx:52`, `src/domain/ruleName.ts:3-10`), `schedule = scheduleLabel(rule.schedule)` (`:53`, `src/domain/scheduleLabel.ts:8-18`), `icon = rule.activity` (`:54`).

### Last rule disabled / deleted
- **Deleted (list becomes empty):** `ordered.length === 0` → `EmptyState` replaces the cards, the standalone "Add condition" button disappears, the Lock-list row stays (`:63-69`). Covered by test `src/features/conditions/__tests__/builder.test.tsx:81-90`.
- **Disabled (last enabled rule turned off):** the Conditions screen shows **nothing different** — the card renders identically except for the switch position. `RuleCard` has no dimming, no "Paused" badge, no tone change (`src/design-system/RuleCard.tsx:58-115`). The only place the app tells the user is Home: `statusContent` returns state `allPaused` with title "All conditions are paused" / "Turn a condition back on when you are ready." and a "View conditions" action (`src/features/home/statusContent.ts:51-52`, copy `src/content/home.ts:14-16`). With zero rules Home returns state `noRules`, "No conditions yet" + "Add condition" (`statusContent.ts:50`). Analytics also renders a bottom `EmptyState` "Make room for movement" when `rules.length === 0` (`src/features/analytics/AnalyticsScreen.tsx:123`) — note it keys off *rules existing*, not on *enabled* rules, so an all-paused account still sees full analytics chrome.
- `resolveLock` filters `rules.filter(r => r.enabled)` first (`src/domain/resolveLock.ts:13`); with none enabled it ends at `noRulesToday` (`:49`).

### Half-built / dead in this file
- Unused imports: `SettingsGroup` (`:8`), `Label` (`:12`), `pickerCopy` (`:15`), `LivingIcon` (`:20`).
- `lockedApps` is destructured from the store and never used (`:25`) — so the Lock-list row shows **no count** of currently locked apps/categories even though `pickerCopy.counts()` exists (`src/content/pickers.ts:19-20`) and `rulesStore` holds `appCount`/`categoryCount` (`src/state/rulesStore.ts:5-9`).
- The Lock-list row's title is the hard-coded literal `"Lock list"` (`:68`) instead of `conditionsCopy.lockedApps` ("Locked apps", `src/content/conditions.ts:4`) — the content-in-`src/content` convention (`src/features/README.md:3`) is violated here. `conditionsCopy.editApps`, `.list`, `.cancel`, `.back` are defined and unused.
- The row is wrapped in an inline `View` with a hard-coded shadow `'0px 6px 20px rgba(100,55,25,0.10)'` (`:67`) rather than a token.

---

## 2. Condition builder — `src/features/conditions/ConditionBuilder.tsx`, `useBuilder.ts`, `builderFlow.ts`

### Shell
`SolidChoices` appearance wrapper → `ScreenShell` (`ConditionBuilder.tsx:32-33`) with:
- header `OnboardingHeader progress={0} showProgress={false}`; back button is `f.cancel` on `O20` and `S3`, otherwise `f.back` (`:36`).
- footer a single `PrimaryButton`, label "Save condition" on `S3` else "Continue", disabled when `!f.valid` (`:38`, copy `src/content/conditions.ts:11-13`).
- overlays: `TimeSheet` (start/end wheel) and `ConfirmSheet` for discard (`:41-57`).
- Step transition: slide in/out by direction, opacity under Reduce Motion (`:24-29`). All branch steps share one animation key `'branch'` so the activity hero doesn't re-animate between branch questions (`:60`).

### Step graph — `builderFlow.ts:4-15`

```
O20 (choose activity)
 ├ walking → W1 (place) → W2 (mode) → [W3 (step goal) only if mode === 'target']
 ├ gym     → G1 (mode)  → GPlace (gym location) → [G2 (minutes) only if mode === 'time']
 ├ running → R1 (mode)  → R2 (minutes) | D (distance)
 └ biking  → B1 (mode)  → B2 (minutes) | D (distance)
→ S1 (schedule) → S3 (summary/save)
```
`S2` (`PlanBuild`, the animated checklist) and `S4` (`ReviewWarmup` star rating) exist in `src/features/rules/PlanBuild.tsx` / `ReviewWarmup.tsx` but are **not** in the builder path — onboarding-only.

Step screens:
- `O20` = `src/features/onboarding/screens/O20.tsx:5-15` → `ChoiceGrid` of the four activities from `src/content/activities.ts:1-6`. Title "What exercise should unlock your apps?" (`src/content/onboarding.ts:26`).
- `W1/W2/W3` → `RuleScreen` → `WalkingScreen contentOnly` (`src/features/rules/RuleScreen.tsx:23-24`, `WalkingScreen.tsx:31-93`).
- `G1/R1/B1` → `WorkoutModeScreen` (`RuleScreen.tsx:25-26`, `WorkoutModeScreen.tsx:5-38`).
- `G2/R2/B2/D` → `WorkoutGoalScreen` (`RuleScreen.tsx:27-28`, `WorkoutGoalScreen.tsx:9-74`).
- Every branch step also renders a live `RulePreviewLock` beneath the controls (`RuleScreen.tsx:40`).
- `S1` → `ScheduleScreen` (`ConditionBuilder.tsx:68`). **Note:** the builder does not pass `ruleDraft`, so the schedule step shows *no* live lock preview here, unlike onboarding (`ScheduleScreen.tsx:60` renders the lock only when `ruleDraft` is supplied; `src/features/rules/README.md:13`).
- `S3` → `PlanSummary` (`ConditionBuilder.tsx:69`).
- `GPlace` short-circuits the whole shell: `if (f.step === 'GPlace') return <BuilderGymStep onSaved={f.next} />;` (`ConditionBuilder.tsx:30`).

### Every rule shape the builder can produce
Mapping is `mode()` in `src/features/rules/draft.ts:67-80`; the resulting union is `src/domain/types.ts:14-22`.

| Activity | Mode step | Produced `RuleMode` | Extra fields |
|---|---|---|---|
| walking | W2 = "Reach a step goal" | `{kind:'target', activity:'walking', metric:'steps', goal, place}` | `place` from W1 |
| walking | W2 = "Unlock while walking" | `{kind:'state', activity:'walking', place}` | no goal; W3 skipped |
| gym | G1 = "Arrive at the gym" | `{kind:'event', activity:'gym', trigger:'arrival'}` | G2 skipped |
| gym | G1 = "Spend time at the gym" | `{kind:'target', activity:'gym', metric:'minutes', goal}` | |
| running | R1 = "Run for a set time" | `{kind:'target', activity:'running', metric:'minutes', goal}` | |
| running | R1 = "Run a set distance" | `{kind:'target', activity:'running', metric:'distance', goal, unit}` | unit `km`/`mi` |
| biking | B1 = "Bike for a set time" | `{kind:'target', activity:'biking', metric:'minutes', goal}` | |
| biking | B1 = "Bike a set distance" | `{kind:'target', activity:'biking', metric:'distance', goal, unit}` | |

`place` values: `outside` | `treadmill` | `either` (`src/domain/types.ts:24`, copy `src/content/rules.ts:5-9`). Mode copy: `src/content/rules.ts:10-13`, `src/content/workoutRules.ts:9-22`.

Defaults from `createDraft` (`draft.ts:26-46`): random UUIDv4 id, `enabled: true`, `place: 'outside'`, `walkingMode: 'target'`, `stepGoal: 5000`, `gymMode: 'time'`, `gymMinutes: 30`, `runMode: 'minutes'`, `minutes: 20` for running else 30, `distance: 5 mi / 8 km` for biking, `2 mi / 3 km` otherwise, `unit` from `settingsStore.units` (`useBuilder.ts:20`).

Schedule shapes (`src/features/rules/scheduleDraft.ts:3-22`):
- `days`: any non-empty subset of 0–6, default `[1,2,3,4,5]` (Mon–Fri). `DayPicker` renders Mon-first order `[1,2,3,4,5,6,0]` plus "Weekdays" and "Every day" shortcut links (`src/design-system/DayPicker.tsx:7,43-52`).
- window `allDay` → `{kind:'allDay'}`.
- window range → `{kind:'range', startMinute, endMinute}`, defaults 540 (9 AM) / 1260 (9 PM). Chosen via `TimeSheet`, a `DateTimePicker` spinner with `minuteInterval={5}` (`src/features/rules/TimeSheet.tsx:19-29`), so only 5-minute boundaries are reachable through the UI.
- Overnight/cross-midnight is fully supported: `endMinute <= startMinute` means it ends the next day (`src/domain/types.ts:30-33`), validated by the modular check `(end - start + 1440) % 1440 >= 15` (`scheduleDraft.ts:33`, `src/domain/validateRule.ts:73`), labelled with ", ends next day" (`src/domain/scheduleLabel.ts:17`, `src/content/domain.ts:12`). Test: `src/features/rules/__tests__/schedule.test.ts:9-16` and `schedule-screen.test.tsx:33-36`.
- Toggling All day **preserves** the previously chosen range (`reduceSchedule` only sets the toggled key, `scheduleDraft.ts:14-16`; test `schedule.test.ts:13-16`).

### Validation limits

`builderValid` (per-step gate on the Continue button, `builderFlow.ts:16-23`):
- `O20`: an activity must have been chosen (`chosen` flag).
- `W3`: `500 ≤ stepGoal ≤ 30000` **and** `stepGoal % 500 === 0` and finite.
- `G2` / `R2` / `B2` / `D`: `validGoal(value, goalRange(...))`.
- `S1`: `scheduleIssues(s).length === 0`.
- everything else: always true.
- `GPlace` is special-cased in `useBuilder.ts:55` to `gymCount > 0` — but see the bug note below, that value is never consumed.

`goalRange` (`src/features/rules/goalRange.ts:2-5`):
| metric | range |
|---|---|
| gym minutes | 10–180 |
| running/biking minutes | 5–300 |
| running distance | 0.5–50 km / 0.25–30 mi |
| biking distance | 1–200 km / 1–120 mi |

`validateRule` (`src/domain/validateRule.ts:5-77`) is the hard gate; it re-checks the same numbers (`:32-47`) plus:
- identity: non-empty string `id`, boolean `enabled`, parseable ISO `createdAt`/`updatedAt` (`:8-15`).
- `mode.activity` must equal `rule.activity` and be one of the four (`:16-22`).
- walking modes must carry a valid `place`; `state` only for walking; `event` only for gym with `trigger:'arrival'` (`:24-28`).
- days: array, non-empty, integers 0–6, no duplicates (`:52-58`).
- window: `range` needs integer 0–1439 start/end and ≥15 minutes modulo midnight; anything not `range`/`allDay` is an issue (`:61-76`).
Issues are de-duplicated (`:77`). Issue vocabulary: `identity | mode | goal | days | window` (`:1`).

Enforcement points: `toRule` throws on any issue (`draft.ts:91-92`), `saveRule` throws before patching the store (`mutations.ts:5-10`), and `rulesStore` drops invalid persisted rules on hydrate (`src/state/rulesStore.ts:8`).

Field-level UI feedback:
- Steps: `NumberField` with `step/min/max` 500/500/30000, an error string "Choose 500–30,000 steps, in increments of 500." when invalid, ±500 buttons disabled at the bounds, and a helper "About N minutes of walking" (`WalkingScreen.tsx:59-92`, copy `src/content/rules.ts:14-19`).
- Workout goals: `NumberField` with `min/max` from `goalRange`, `step` 5 for minutes / `range[0]` for distance, three tappable presets for minutes (gym 30/45/60, running 15/20/30, biking 20/30/45 — `src/content/workoutRules.ts:23`, rendered `WorkoutGoalScreen.tsx:46-66`), a `mi`/`km` unit toggle for distance (`:41-42`), comma→dot normalisation on input (`:43`), and hint "Choose min–max unit." (`src/content/workoutRules.ts:28`).
- Empty text stays empty (value becomes `NaN`, rendered as `''`) and simply blocks Continue (`WalkingScreen.tsx:66-68`, `WorkoutGoalScreen.tsx:39,43`; tests `src/features/rules/__tests__/workout-goals.test.tsx:15-22`).
- Unit change never converts the number (`draft.ts:64`; test `src/features/rules/__tests__/workout-goals.test.tsx:23-29`).
- Schedule errors are inline red labels: "Choose at least one day." / "Choose a window of at least 15 minutes." (`ScheduleScreen.tsx:34-53`, copy `src/content/plan.ts:4-5`), plus a live `scheduleLabel` line (`:54-58`).

### Live preview
`RulePreviewLock` (`src/features/rules/RulePreviewLock.tsx:13-49`) renders a scaled `BlockingScheduleCard` in a fixed `ring*3 × ring*2.5` box (`:18`, size invariance is tested at `src/features/rules/__tests__/schedule-screen.test.tsx:7-13`). The sentence/glyph/progress come from the pure `rulePreviewModel` (`src/features/rules/rulePreviewModel.ts:10-46`), copy `src/content/rulePreview.ts`. Without a schedule it hard-codes "Block from 9 AM to 9 PM" (`rulePreview.ts:6`) — i.e. the branch-step preview lies if the user later picks a different window. Full table of preview sentences is asserted in `src/features/rules/__tests__/rule-preview.test.ts:4-16`.

### Create vs edit
Both live in `useBuilder` (`src/features/conditions/useBuilder.ts:13-95`).

| | Create (`id` undefined) | Edit (`id` present) |
|---|---|---|
| initial draft | `createDraft(activity='walking', settings.units, clock.now())` (`:20`) | `fromRule(rule)` (`:19`, `draft.ts:95-111`) |
| initial schedule | `scheduleDraft({})` = Mon–Fri 9 AM–9 PM (`:27`) | reconstructed from the rule's schedule (`:22-26`) |
| starting step | `O20` (`:34`) | `S3` summary (`:34`) |
| `chosen` | `false` until an activity is picked (`:35`) | `true` (`:35`) |
| activity change | yes, `choose()` replaces the whole draft (`:56-59`) | **impossible** — `O20` is unreachable; header Back on `S3` is Cancel (`ConditionBuilder.tsx:36`) |
| id / createdAt | fresh UUID + now | preserved (`fromRule` copies `id`, keeps `createdAt` via `createDraft(..., rule.createdAt)`, `draft.ts:97-98`) |
| updatedAt | now at save | overwritten at save (`useBuilder.ts:78`) |
| save | `saveRule(toRule(...))` replaces by id (`mutations.ts:9`) | same call, same replace-by-id |
| dirty baseline | `!editing && chosen` also counts as dirty (`:41`) | JSON diff of draft+schedule vs the loaded rule (`:39-41`) |

Summary-edit round trip: pressing "Edit" on a summary row snapshots `{draft, schedule}` into `backup` and jumps backwards to that step (`:61-64`). Continue from there clears the backup and returns to `S3` (`:80-82`); Back **restores** the backup and returns to `S3` (`:65-70`) — this is what makes a half-typed invalid goal non-fatal (test `src/features/conditions/__tests__/builder.test.tsx:74-80`).

Summary rows (`src/features/rules/PlanSummary.tsx:22-28`): "Activity & goal" → `ruleName(rule)` with edit target `goalStep(draft)`; "Walking place" (walking only) → `W1`; "Days & times" → `S1`. `goalStep` (`src/features/rules/plan.ts:33-37`) maps state-walking→`W2`, target-walking→`W3`, gym-arrival→`G1`, gym-time→`G2`, distance→`D`, else `R2`/`B2`. Support line differs for state mode: "Apps stay open while you walk" vs "Unlocks your apps for the rest of the day" (`PlanSummary.tsx:67`, `src/content/plan.ts:20-21`).

Cancel: `cancel()` dismisses the keyboard and, if dirty, opens the `ConfirmSheet` "Discard changes?" / "Discard changes" / "Keep editing" (`useBuilder.ts:88-92`, copy `src/content/conditions.ts:14-17`). Not dirty → close immediately. Tested at `builder.test.tsx:59-73`.

Each mounted builder owns an isolated zustand draft store (`useBuilder.ts:30`, `src/features/rules/RuleDraftStore.ts:13`), so two builders can be mounted at once without cross-talk (test `builder.test.tsx:91-105`). The module-level `useRuleDraftStore` singleton (`RuleDraftStore.ts:11`) is the onboarding one, not the builder's.

### What the builder **cannot** express
- **Per-rule app selection.** There is exactly one global `lockedApps` handle on `rulesStore` (`src/state/rulesStore.ts:5-7`); no rule references it. Both "Lock list" (Conditions) and "Locked apps" (Settings) mutate the same object.
- **Which gym.** `{kind:'event', activity:'gym', trigger:'arrival'}` and the gym-minutes target carry no place id (`src/domain/types.ts:17-18`); saved gyms live in `settingsStore.gymPlaces` (`src/state/settingsStore.ts:5-11`). A gym rule therefore applies to *all* saved gyms, and editing a gym rule offers no way to change the gym (summary has no "gym" row; `GPlace` is not a `goalStep` target).
- **A second window, or different times per weekday.** `Schedule` has exactly one `window` applied to every selected day (`src/domain/types.ts:28-34`).
- **Interval schedules** (every other day, "3× per week"), date ranges, vacation/exception days.
- **Custom rule names.** The title is always derived (`src/domain/ruleName.ts`); there is no name field anywhere in the draft (`draft.ts:3-18`).
- **"Unlock while doing" for anything but walking** — `state` mode is walking-only and rejected for other activities (`validateRule.ts:25-27`).
- **Walking by minutes or distance**, or a **gym distance**, or **calories / heart-rate / pace / elevation** goals — the `RuleMode` union has no such members.
- **A per-rule place for running/biking** (outside vs treadmill applies to walking only).
- **Per-rule notifications, per-rule grace period, or per-rule strictness.** Grace is one global `stopGrace` (`src/state/settingsStore.ts:8`).
- **Rule priority / ordering.**
- Free step goals: multiples of 500 only (`validateRule.ts:35`).
- Windows shorter than 15 minutes.

### Builder problems found
1. **`GPlace` is a dead end.** `ConditionBuilder.tsx:30` returns `<BuilderGymStep/>` before the `ScreenShell`, so on the gym-location step there is **no header, no Back, no Cancel and no footer**. `GymPickerScreen` only renders a header in its `find` stage (`src/features/gym-picker/GymPickerScreen.tsx:22-35`), and it lands on `place` stage (`usePicker.ts:10`). The only exit is saving a gym (`onSaved → f.next`). A user who reaches G1→GPlace and doesn't want to save a gym cannot back out of the builder except by killing the modal gesture (and the route is a `fullScreenModal`).
2. Because of (1), `builderValid`'s `GPlace` branch and `useBuilder.ts:55`'s `gymCount > 0` are unreachable dead logic.
3. **`BuilderGymStep` edits instead of adds.** `src/features/gym-picker/BuilderGymStep.tsx:4-5` passes `placeId = gyms[gyms.length - 1]?.id`, so a user who already saved a gym and then creates a *second* gym condition is editing their most recent gym rather than adding a new one.
4. **Re-tapping the already-selected activity resets the draft.** `choose()` unconditionally calls `createDraft` (`useBuilder.ts:57`), which mints a **new UUID** and discards every branch answer. Harmless on the first pass, destructive if the user taps back to `O20` and re-taps the same tile.
5. The `S1` step in the builder has no live lock preview (no `ruleDraft` prop, `ConditionBuilder.tsx:68`) while onboarding's does — an inconsistency the module README claims is uniform (`src/features/rules/README.md:13`).
6. `useBuilder`'s `dirty` uses `JSON.stringify` of the draft; key order is stable here, but it also means a `NaN` goal serialises to `null` and still reads as dirty. Minor.

---

## 3. Settings — `src/features/settings/`

### `SettingsScreen.tsx` — the row-by-row inventory
Copy source: `src/content/settings.ts`.

1. `Heading` "Settings" + `LivingIcon person` — `:86-87`.
2. **Group "General"** (`:88-95`)
   - one `SettingsRow`: title = profile `name` or "Account"; value = "Not signed in" or "Signed in with Apple/Google/email"; icon `person`; → `/settings/account`.
3. **Group "Subscription"** (`:96-108`)
   - plan row (no press target): title from `c.plan(entitlement.status)` — "ExcerLock membership" / "Trial membership" / "No active membership" / "Membership expired" / "Billing issue" / "Checking membership" (`src/content/settings.ts:14-22`); value = "Renews <date>" when `renewsAt` set; icon `star`.
   - "Manage subscription" → sets an inline note: "This preview keeps you in ExcerLock. Subscription management will open your App Store account in the connected app." (`:102`, copy `:30-31`). **No `Linking` call anywhere.**
   - "Restore purchases" → `runtime.subscription.restore()` (`:44-55`); while pending the row's value shows "Restoring purchases…" (`:105`, `src/content/subscription.ts:43`); on `trial|active` → "Purchases restored", otherwise "No active purchase found", on throw "Something went wrong. Please try again." (`:49-51`). Re-entrancy guarded by `busy` (`:45`). Tested `src/features/settings/__tests__/screen.test.tsx:55-73`.
   - the note renders as a single `Label accessibilityRole="alert"` below the group (`:109-113`).
4. **Group "Data & permissions"** (`:114-132`) — six `PermissionRow`s, in `Object.keys(settingsCopy.permissionNames)` order: Screen Time, Motion & Fitness, Location, Health, Camera, Notifications (`src/content/settings.ts:58-65`). Status badge is a 3-way collapse (`:122-127`): `granted|always|whenInUse` → **"Granted"** (mint pill), `notDetermined` → **"Needed"**, everything else (`denied`, `restricted`) → **"Off"**. Icons from `permissionIcons` (`src/features/settings/PermissionDetail.tsx:9-16`). Each row → `/settings/permission/<name>`.
5. **`Preferences` panel** — group "Preferences" (`src/features/settings/PreferencesPanel.tsx:11-77`)
   - "Distance units" `SegmentedControl` km/mi (`:18-30`) → `setUnits` (`src/features/settings/preferences.ts:4-13`), which **relabels but does not convert** existing distance rules, and throws (surfacing "A distance goal falls outside the range for that unit. Edit the goal before changing units.") if any relabelled rule would fail `validateRule` (`preferences.ts:10`, copy `settings.ts:33`). Tests: `src/features/settings/__tests__/preferences.test.ts:7-20`.
   - "Walk & Scroll stop grace" row → opens a `BottomSheet` of five `ChoiceRow`s (`SettingsScreen.tsx:71-83`): 30 seconds / 1 / 2 / 3 / 5 minutes mapped to `[30,60,120,180,300]` seconds. Support line "How long apps stay open after you stop walking."
   - "Gym auto-detect" `Switch` (`PreferencesPanel.tsx:44-57`) → on: `runtime.gym.enableAutoDetect()`, which asks for **Always** location (`src/demo/fakes/GymFake.ts:95-107`) and only then patches `location: 'always'` + `gymAutoDetect: true`; off: `disableAutoDetect()` (`GymFake.ts:108`). Because the switch is bound to the store, a denied prompt leaves it visibly off. Support: "Always location lets your saved gym recognize a visit while ExcerLock is closed."
   - "Touch feedback" `Switch` → `settingsStore.haptics` (`:61-73`).
6. **Unnamed group** (`:134-137`)
   - "Locked apps" (icon `lock`) → `runtime.screenTime.presentAppPicker()` (`:135`), which in Phase 1 opens the app-owned `FakeAppPicker` bottom sheet (`src/demo/fakes/ScreenTimeFake.ts:10-16`, `src/features/sheets/FakeAppPicker.tsx`).
   - "Saved gyms" (icon `gym`) → `/settings/gyms`.
7. **Group "Community"** (`:138-148`)
   - "Share ExcerLock" → `BottomSheet` with body "Block apps. Exercise more." and a "Copy invitation" button that only flips local state to show "Invitation copied in this preview." (`:61-70`). **Nothing is written to the clipboard and `Share` is never called.**
   - "Rate ExcerLock" → sets a note "Thanks for taking a moment for ExcerLock." (`:147`). **No `StoreReview` / `requestReview` call.**
8. **Group "Other"** (`:154-159`) — "Contact support" → `/settings/support`; "Privacy Policy" → `/settings/legal/privacy`; "Terms of Use" → `/settings/legal/terms`; "Account" → `/settings/account` (**a duplicate of the General-group row**).
9. Footer: version string "ExcerLock <version> (<build>)" from `expo-constants`, wrapped in a `PressableScale`; the **7th** press calls `onDev()` and resets the counter (`:160-171`; test `src/features/settings/__tests__/screen.test.tsx:33-35`) → `/dev` → `DevMenu` (`src/features/dev/DevMenu.tsx`).

Screen shell uses `safeBottom={false}` so the tab bar handles the bottom inset (`:58`, `src/design-system/ScreenShell.tsx:50`).

### Permission rows when denied — `src/features/settings/PermissionDetail.tsx:17-33`
Contents: heading = permission name, support = human status from `settingsCopy.statuses` ("Granted" / "Always allowed" / "While using the app" / "Off" / "Restricted" / "Not requested", `src/content/settings.ts:82-89`); a "why" line (`:66-73`); a "without" consequence line (`:74-81`), e.g. location → "Automatic gym detection needs location. Your other activities still work."; and a single `PrimaryButton` "Open Settings".

**"Open Settings" does nothing but set a local flag** that reveals "This preview leaves device settings unchanged. The connected app will open iOS Settings here." (`:26-31`, copy `settings.ts:56-57`). There is **no** `Linking.openSettings`, and **no in-app re-request** button: once a permission is `denied`, this screen offers no path to change it. (The only re-request paths in the app are the setup primers `src/features/setup/PermissionPrimer.tsx` and the gym auto-detect switch.)

### Gyms management — `src/features/settings/GymsScreen.tsx:19-76`
- Heading "Saved gyms" (`:51`); `LivingIcon map-pin` only when at least one gym (`:52`).
- With gyms: a `SettingsGroup` of one `SettingsRow` per gym — title = name, subtitle = `"<address> · <radiusMeters> m"`, icon `gym`, press → edit (`setEditing(g.id); setAdding(true)`), **plus a full-width `SecondaryButton` "Remove gym: <name>" under each row** (`:55-68`). That second button is unusual for a settings list (no swipe action, two controls per gym).
- Without gyms: `EmptyState` "Save your go-to gym" / "Find your gym on the map to make every visit count." — no action button (`:71`).
- Always: a secondary label "You can save up to 5 gyms." (`:73`) and a `PrimaryButton` "Add gym" **disabled at `gyms.length >= 5`** (`:74`).
- Add/edit both open `GymPicker` (`:29-36`), which is only a route opener that pushes `/gym-picker` with a one-shot session id (`src/features/sheets/GymPicker.tsx:19-27`, `src/features/gym-picker/pickerSession.ts:4-14`).
- Delete → `ConfirmSheet` whose **title and confirm label are both "Remove gym"**, whose **body is just the gym's name**, and whose cancel label is "Close" (`:37-48`). Confirm filters the gym out of `settingsStore.gymPlaces` directly (`:45`) — note it does **not** touch any gym rule (rules don't reference gyms anyway) and does not warn that a gym condition may be left with no place.
- Cap is enforced in three independent places: the button (`GymsScreen.tsx:74`), the picker's `limit` (`src/features/gym-picker/usePicker.ts:141-142`, message `src/content/gymPicker.ts:24`), and the port (`src/demo/fakes/GymFake.ts:43`). Editing an existing gym is still allowed at the cap (tests `src/features/gym-picker/__tests__/picker.test.tsx:92-106`).
- Two different "limit" strings exist: `settingsCopy.gymLimit` "You can save up to 5 gyms." (`settings.ts:44`) and `gymPickerCopy.limit` "You can save up to five gyms. Edit or remove an existing gym to add another." (`gymPicker.ts:24`), plus an unused third in `pickerCopy.limit` (`src/content/pickers.ts:27`).

### Account — `src/features/settings/AccountScreen.tsx:9-67`
- Heading "Account" with the session line as support (`:48`).
- Anonymous → single `PrimaryButton` "Sign in" → `/sign-in` (a `SettingsPage`-wrapped `SignInScreen`, `app/sign-in.tsx:5-14`).
- Signed in → `SecondaryButton` "Sign out" (`runtime.auth.signOut()`) and `SecondaryButton` "Delete account" (`:59-62`).
- Delete opens a `BottomSheet` "Delete your account forever?" listing five facts (`src/content/settings.ts:100-106`): server record deleted; provider/analytics erasure scheduled; conditions/progress/locked apps/settings stay on device; deletion does not cancel the App Store subscription; cannot be undone. Buttons "Delete account forever" (loading state) and "Keep my account" (disabled while busy). Dismissal is blocked while busy (`:36-38`).
- On success the fake resets the session to anonymous and logs `account_deleted` (`src/demo/fakes/AuthFake.ts:33-37`); the screen shows "Your account has been deleted. Your on-device plan is still here." (`:20`). On throw → "Something went wrong. Please try again." and the sheet stays open (`:23-24`).
- **No note is shown after a successful sign-out** — the only visible change is the button set swapping.

### Legal — `src/features/settings/LegalScreen.tsx:6-22`
Renders `legalCopy[doc].title` + three sections each. `src/content/legal.ts:1` is explicitly commented **"Phase 1 placeholder legal text. Replace with counsel-approved documents before release."** Privacy sections: "Your information", "Your choices", "Your device". Terms: "Using ExcerLock", "Membership", "Your plan". No external link, no version/effective date, no scroll-to-accept.

### Support — `src/features/settings/SupportScreen.tsx:9-55`
`SegmentedControl` Problem/Question/Idea (`src/content/settings.ts:90`), a multiline `TextField` "Your message" capped at 4000 chars, footer "Send message" disabled while the message is blank, "Sending…" with a loading state, an error alert "Something went wrong. Please try again.", and a terminal success screen "Message sent" / "Thanks for helping us make ExcerLock better." with a check icon (`:25-31`). The fake sleeps 600 ms and logs only `{category, characters}` — **no message body leaves the device** (`src/demo/fakes/SupportFake.ts:5-11`, documented at `src/features/settings/README.md:7`). Tested `src/features/settings/__tests__/screen.test.tsx:37-53`.

### Settings problems found
- `Preferences` grace row value is `c.graceOptions[[30,60,120,180,300].indexOf(s.stopGrace)]` (`PreferencesPanel.tsx:38`) — any persisted `stopGrace` not in that exact list (the store validator allows 30–300, `src/state/settingsStore.ts:27`) renders `undefined`, i.e. no value at all.
- Duplicate "Account" row in two groups (`SettingsScreen.tsx:90,158`).
- "Manage subscription", "Rate ExcerLock", "Share ExcerLock" and "Open Settings" are all note-only stand-ins; nothing links out.
- No notification-preference rows (quiet hours, reminder toggles) despite the notification permission and copy about trial/lease reminders (`settings.ts:72,80`).
- No data export / "delete my local data" control; account deletion explicitly leaves local data in place.
- No appearance/theme, language, or accessibility settings.

---

## 4. Analytics — `src/features/analytics/`

### What is shown (`AnalyticsScreen.tsx:29-125`, copy `src/content/analytics.ts`)
1. Heading "Analytics".
2. `SegmentedControl` Week / Month / Year; changing period resets `offset` to 0 (`:42-50`).
3. Period navigator: "Previous period" back arrow, a centred label (`"This week/month/year"` at offset 0, otherwise a formatted `start – end` range), "Next period" chevron **disabled at offset 0** so you cannot page into the future (`:51-63`).
4. If `model.reclaimed.measuredDays > 0`: a clock `LivingIcon`, a `TickingNumber` of reclaimed minutes labelled "minutes reclaimed", a "Measured on N of M days" line, and a delta line — `"+N min vs previous period"` or "No previous measurement to compare" when the previous period had no measured days (`:64-72`).
5. Else: `EmptyState` clock — **two distinct no-data states** (`:73-79`): `dayZero` → "Your first week starts today" / "Every bit of movement is a start. Your progress will grow here."; otherwise → "No measurement yet" / "Your time reclaimed will appear when locked-app usage is available." `dayZero` is `history.every(r => r.day >= today)` (`analyticsModel.ts:59`), which is also `true` for an empty history.
6. Usage `UsageChart` labelled "Locked-app minutes" (Week) or "Average daily locked-app minutes" (Month/Year), with the profile's `estimatedDailyMinutes` drawn as a dashed baseline and captioned "Dashed line: your starting estimate, N min/day" (`:80-85`, `UsageChart.tsx:55-87`). Below it the honesty line "Gaps mean no measurement. They are excluded from time reclaimed."
7. Heading "Your movement" + a `SegmentedControl` over Walking/Gym/Running/Biking, then a second `UsageChart` of that activity's totals in `t.chart.exercise` (`:86-100`). Units: steps for walking, minutes otherwise (`src/content/analytics.ts:17`).
8. `StatTile` "Days met" = `met / scheduled` with support "N scheduled" (`:101`).
9. Two `StatTile`s side by side: "Current streak" and "Longest streak", both in days (`:102-105`).
10. **Week only:** a "Your weekly recap" `SettingsGroup` with rows: minutes reclaimed, days met, one row per activity with its rounded total, current streak (`:106-122`).
11. If `rules.length === 0`: a trailing `EmptyState` "Make room for movement" / "Add a condition to start tracking your progress." with a walking icon — rendered **after** all the charts and tiles (`:123`).

### Where the data comes from
- `useHistory()` (`src/state/selectors.ts:56-66`) = `todayHistory(devSnapshot.history, rules, ruleDays, now, tz)`. The historical rows are **entirely scenario fixtures** read off the dev/fake runtime snapshot (`selectors.ts:59`); only *today*'s row is computed live, and even then only `scheduled`/`met` are recomputed while `usageMinutes` still comes from the fixture (`src/state/todayHistory.ts:12-35`). There is no real analytics/usage source wired; `ScreenTimeFake.observeUsage` returns `scenario.usageMinutesToday` for today and `null` for any other day (`src/demo/fakes/ScreenTimeFake.ts:18-28`).
- Baseline: `profileStore.estimatedDailyMinutes` from onboarding (`AnalyticsScreen.tsx:36`, `src/domain/types.ts:67`).
- Rules: `rulesStore` (`:37`) — used only for the "no rules" empty state.
- Clock/timezone: `useClock()` + `runtime.clock.timezone()` (`:35,38`).
- `AnalyticsPort` (`src/ports/AnalyticsPort.ts`) is an **event-tracking** port (`track/screen/identify/reset`, fake at `src/demo/fakes/AnalyticsFake.ts`), unrelated to this screen. The screen sends no events of its own.

### Model semantics (`analyticsModel.ts:6-60`)
- Period bounds: ISO week starting Monday, calendar month, calendar year, computed in UTC noon (`period.ts:3-20`).
- Rows are clipped to `d.day <= today`, so future days never count (`:9-10`); `elapsedDays` is the count of eligible days (`:46`).
- Reclaimed = `Σ max(0, baseline − usage)` over **measured** days only; `null` usage days are dropped and reported through `measuredDays` (`src/domain/reclaimed.ts:1-10`).
- Series grouping: Week → one column per day; Month → seven-day buckets; Year → twelve month buckets (`:22-26`). Usage column value is the **mean** of measured days in the bucket, `null` if the bucket has none (`:31-32`).
- Activity column values are **sums** (`:33-38`), so a Month/Year exercise column mixes step totals and minute totals across a bucket without normalisation.
- `scheduled` / `met` counted from the history rows (`:50-51`); streak from `src/domain/streak.ts:12-22`, computed over the **entire** history, not the visible period (`:52`) — so "Current streak" ignores the period navigator.
- Tests: `src/features/analytics/__tests__/model.test.ts` covers partial weeks, leap-day months, year length, unscheduled days not breaking streaks, and cross-midnight day attribution. `__tests__/screen.test.tsx` covers both empty states and the weekly recap.

### Chart behaviour with no data — `UsageChart.tsx:22-89`
Each column renders its label plus `'—'` when the value is `null` (`:76`), with an accessible label "`<label>: No measurement`" (`:72`). `max` is floored at 1 so an all-null chart draws an empty grid rather than dividing by zero (`:34`). Bars animate with a per-index stagger, instant under Reduce Motion (`:13-15`). The chart is horizontally scrollable and widens with `fontScale` (`:41-42`).

### Analytics problems found
- The "no rules" empty state sits at the very bottom, under charts and streak tiles, rather than replacing them (`:123`) — with zero conditions the user still sees a full analytics page.
- The reclaimed empty state does not suppress the charts/tiles either; a day-zero account sees "Your first week starts today" followed by empty charts and `0 / 0` tiles.
- `analyticsCopy.total` ("Total movement", `src/content/analytics.ts:24`) and `src/content/charts.ts` (`chartCopy`) are defined and unused by this screen.
- Streaks are lifetime, not period-scoped, while sitting between period-scoped tiles — easy to misread.
- `AnalyticsScreen` imports `LivingIcon`/`TickingNumber`/`Icon` etc. all used; no dead imports here. But `useAnalytics` in `src/state/selectors.ts:73-99` is a **second, rolling-window analytics model** that this screen does not use (the screen uses `analyticsModel` with calendar periods) — duplicated logic, one of the two is dead for this surface.

---

## 5. Gym picker — `src/features/gym-picker/`

Shared by setup, Settings → Gyms, and the builder's `GPlace` step (`README.md:3`). Full-screen route, two stages.

- `usePicker` (`usePicker.ts:9-233`) starts at stage `place` (`:10`) with `defaultCentre` = Chicago `41.884,-87.652` (`:8`) when nothing is selected.
- **Place stage** (`PlaceStep.tsx:8-70`): heading "Pick your gym", a fake search bar that opens the find stage, `PickerMap`, the name, the resolved address or raw `lat, lng` fallback (`:47`), a "Arrival radius" `Slider` 50–200 m step 10 with the live value, and an inline error/limit alert. Footer `PrimaryButton` "Save gym", disabled when the name is blank or the 5-gym cap applies, with a loading state (`GymPickerScreen.tsx:36-45`).
- **Find stage** (`FindStep.tsx:69-139`): autofocused search field; "Use my current location / Drop a pin where you are" row when a location is known; a "Find gyms near me" `SecondaryButton` when it is not; a spinner while searching; an error block with "Try again"; typed results under "Search results" with the matched substring tinted (`Match`, `:8-25`); "Gyms near you" when not typing; a permanent "Drop a pin instead" button at the bottom. Empty result copy: "No matches. Try the street name, or drop a pin on the map."
- Search is debounced by `t.motion.duration.standard` (`usePicker.ts:79`), reverse-geocode by `planCheck` with a rounded-coordinate cache (`:90-103`), and stale responses are discarded via a `generation` counter (`:120,125`). Tests cover late responses, offline retry, cap behaviour and a 250 m pin move (`__tests__/picker.test.tsx`).
- Radius is clamped 50–200 and snapped to 10 m in both `clampRadius` (`geometry.ts:29-30`) and the fake port (`src/demo/fakes/GymFake.ts:47`).
- Save id: `existing?.id ?? candidate?.id ?? 'custom:<lat,lng>'` (`usePicker.ts:167`) — two custom pins within 0.0001° collide on the same id.
- Address that failed to resolve is stored as `''` rather than the error string (`:169`).
- On iOS the fake is wrapped by `foregroundGym` and real search comes from a local `ExpoLocalSearch` Expo module (`src/runtime/createRuntime.ts:11-14`, `README.md:9-17`); a stale binary reports "unavailable", never fake results.

---

## 6. Permissions presentation — `src/features/permissions/`

Only one file: `FakePromptHost.tsx:6-18`. It watches `runtime.dev.snapshot().prompt` and renders either the `FakeAppPicker` bottom sheet (`prompt.kind === 'picker'`) or a `FakeSystemPrompt` using `permissionCopy[name]` — or `alwaysLocationCopy` when `scope === 'always'` (`src/content/permissions.ts:1-18`). Mounted once at the navigator root (`src/features/launch/RootNavigator.tsx:43`). Resolving only writes the fake ports and the local permission store; real adapters are explicitly Phase 2 (`src/features/permissions/README.md:3`). There is **no** permission-request UI in Settings — `PermissionDetail` cannot trigger a prompt (see §3).

---

## 7. Content files consumed by these surfaces

| File | Used by | Notes |
|---|---|---|
| `src/content/conditions.ts` | Conditions list, builder chrome | `lockedApps`, `editApps`, `list`, `cancel`, `back` unused |
| `src/content/settings.ts` | all of Settings | includes permission names / why / without / statuses / delete facts |
| `src/content/analytics.ts` | Analytics | `total` unused |
| `src/content/plan.ts` | `ScheduleScreen`, `TimeSheet`, `PlanSummary`, `PlanBuild`, `ReviewWarmup` | `use` ("Use this plan") unused by the builder |
| `src/content/rules.ts` | walking branch (W1–W3) | |
| `src/content/workoutRules.ts` | gym/run/bike branches (G/R/B/D) | |
| `src/content/rulePreview.ts` | `rulePreviewModel` | hard-codes "9 AM"/"9 PM" fallbacks |
| `src/content/domain.ts` | `ruleName`, `scheduleLabel`, `statusContent` | |
| `src/content/activities.ts` | `ChoiceGrid` (O20), `PlanBuild` | |
| `src/content/controls.ts` | `DayPicker`, `TimeRangeRow`, `NumberField`, `RuleCard` delete label | `days`/`dayLetters` are Mon-first |
| `src/content/gymPicker.ts` | gym picker | |
| `src/content/pickers.ts` | `FakeAppPicker` only; imported-but-unused by `ConditionsScreen` | |
| `src/content/permissions.ts` | `FakePromptHost` | |
| `src/content/legal.ts` | `LegalScreen` | placeholder text, flagged in a comment |
| `src/content/tabs.ts` | tab layout | |
| `src/content/charts.ts` | not referenced by Analytics (`UsageChart` uses `analyticsCopy.noMeasurement`) | likely dead |

---

## 8. Domain helpers

- `src/domain/validateRule.ts` — see §2. Note the walking-steps `% 500` check only fires when `goal` is finite (`:35`), and a non-record `schedule` short-circuits with both `days` and `window` issues (`:51`).
- `src/domain/ruleName.ts:3-10` — "Unlock while walking" for state mode, "Arrive at the gym" for the event mode, else `"<verb> <goal> <unit>"` with `atGym` appended for gym ("Spend 30 minutes at the gym"). Verbs from `src/content/domain.ts:2`. Goal is locale-formatted `en-US`.
- `src/domain/scheduleLabel.ts` — `minuteLabel` renders `9 AM` / `9:30 PM` with a non-breaking space (`:3-7`). `scheduleLabel` collapses 7 days → "Every day", exactly `[1..5]` → "Mon–Fri", otherwise a comma list sorted Mon-first (`:9-15`); window → "All day" or `start–end` with ", ends next day" appended when `end <= start` (`:17`). No handling for other common groupings (e.g. weekends).

---

## 9. Consolidated list of suspected problems

1. `ConditionBuilder.tsx:30` — `GPlace` bypasses the shell: no Back/Cancel/footer, trapping the user unless they save a gym.
2. `useBuilder.ts:55` + `builderFlow.ts` — the `GPlace` validity branch is unreachable dead logic.
3. `BuilderGymStep.tsx:4-5` — the builder edits the most recently saved gym instead of adding a new one.
4. `useBuilder.ts:57` — re-selecting the same activity on `O20` mints a new rule id and wipes branch answers.
5. Editing a rule can never change its activity (`ConditionBuilder.tsx:36`, `useBuilder.ts:34`) and can never change the gym.
6. Rules do not reference a gym or an app selection; both are global (`src/domain/types.ts:14-22`, `src/state/rulesStore.ts:5-7`).
7. No reorder / priority anywhere in the conditions surface.
8. `ConditionsScreen.tsx:25,67-68` — `lockedApps` read but unused; the Lock-list row shows no count and hard-codes its title.
9. `ConditionsScreen.tsx:8,12,15,20` — four dead imports.
10. Disabling every rule produces no visible signal on the Conditions screen itself.
11. `PermissionDetail.tsx:26` — "Open Settings" is inert; a denied permission has no in-app recovery path.
12. `SettingsScreen.tsx:64,102,147` — Copy invitation, Manage subscription and Rate are all note-only stubs (no clipboard, no `Linking`, no `StoreReview`).
13. `PreferencesPanel.tsx:38` — grace row value renders blank for any `stopGrace` outside the five hard-coded values.
14. `SettingsScreen.tsx:90,158` — "Account" appears twice.
15. `GymsScreen.tsx:37-48` — delete confirm reuses "Remove gym" as both title and confirm label, with the gym name as the body and "Close" as cancel.
16. `src/content/legal.ts:1` — placeholder legal copy, must be replaced pre-release.
17. `AnalyticsScreen.tsx:123` — "no conditions" empty state renders below a full page of charts.
18. `selectors.ts:73-99` (`useAnalytics`) duplicates `analyticsModel` with different (rolling-window) semantics and is unused by the Analytics screen.
19. `src/state/selectors.ts:59` — all historical analytics data comes from the fake dev snapshot; there is no production data source behind Analytics.
20. `ConditionBuilder.tsx:68` — the builder's schedule step lacks the live lock preview that onboarding's has, contrary to `src/features/rules/README.md:13`.
21. `usePicker.ts:167` — custom pins rounded to 4 decimals share ids across ~11 m.
22. `src/content/charts.ts` appears entirely unused by the analytics surface.
23. Deleting a saved gym (`GymsScreen.tsx:45`) does not warn about gym conditions that may now have no place to detect.
