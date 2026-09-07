# Fix map: every audit finding, its fix, and the task that owns it

Generated from the mapping workflow of 2026-09-07 after the planner applied the critics' resolutions. The task files in `plans/rebuild/phase-2-backend/` are the authority; this map carries the per-finding detail (files, first failing tests, copy). Finding numbers match `docs/audit/mvp-gap-audit-2026-09-07.md` and `docs/audit/findings.json`. A "Planner resolution" line overrides the entry text where the two disagree.

## P2-T13 — Test floor, persistence and release hygiene (3 findings)

### #4 [blocker, S] Delete the two "Test …unlock" buttons from the production Home screen

**Planner resolution:** Folded into #10 as an acceptance criterion.

Remove the two unconditional `SecondaryButton`s at HomeScreen.tsx:254-255 and the `?preview=1` pushes behind them. The ceremonies stay reachable exactly where the product says they are: the white `UnlockEntry` pills inside the lock card (B20) for real users, and the dev menu's `unlock-*` scenarios (src/demo/scenarios/unlock.ts) plus the `preview` param on /unlock/gym and /unlock/treadmill for testers. Nothing else changes on Home; the `preview` prop on GymUnlockScreen/TreadmillUnlockScreen is kept because the dev route still uses it. After the fix a user on Home sees the lock card, its entry pills, the conditions list and the lock-list row, and no orange test affordance anywhere.

Files: `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/features/home/__tests__/home-router.test.tsx`

First failing tests:
- Home renders no element labelled "Test gym unlock" or "Test treadmill unlock" in the locked, unlockedMet and beforeWindow scenarios
- the dev menu's unlock-treadmill scenario still reaches the treadmill ceremony in preview mode
- no file under src/features (excluding src/demo and src/features/dev) contains the string "preview=1"

Decisions: B20 · Order: independent; land with the rest of NEW:dev-guard (the /dev route and the Home deep-link params, finding 10) so the release-hygiene guard test is written once

### #10 [high, S] Gate the dev route, the Home deep-link params and the 7-tap entry behind a build flag

**Planner resolution:** Includes #4's button removal; coordinate the HomeScreen JSX block with #74.

Add `src/runtime/devFlag.ts` exporting `devMenuEnabled = __DEV__ || process.env.EXPO_PUBLIC_DEV_MENU === '1'`. Wrap `<Stack.Screen name="dev" />` in `<Stack.Protected guard={devMenuEnabled}>` so `excerlock://dev` resolves to nothing in a release build; return early from `useDemoProgress` when the flag is off so `excerlock://home?steps=…&advance=…&presence=…&placement=…` cannot mutate the runtime; gate the 7-tap footer counter in `DetailedSettingsScreen` and remove the two unguarded 'Test gym unlock' / 'Test treadmill unlock' buttons from `HomeScreen` (they belong in the dev menu). Replace the hardcoded simulator UDID in `src/content/dev.ts:42` with a `<device-udid>` placeholder the tester substitutes.

Files: `app-next/src/runtime/devFlag.ts (NEW)`, `app-next/src/features/launch/RootNavigator.tsx`, `app-next/src/features/home/useDemoProgress.ts`, `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/features/settings/DetailedSettingsScreen.tsx`, `app-next/src/content/dev.ts`, `app-next/src/features/dev/__tests__/dev-guard.test.tsx (NEW)`, `plans/rebuild/02-screen-inventory.md`

First failing tests:
- the dev route is not registered when the dev flag is off
- excerlock://home?steps=5000 leaves the step count untouched when the dev flag is off
- the settings footer opens the dev menu after 7 taps only when the dev flag is on
- Home renders no test-unlock buttons

Decisions: B13 · Order: Removing the two Home test buttons overlaps NEW:ceremony-hardening's ceremony work — do it here and let that task assume they are gone.

### #21 [high, M] Recover per-row from bad persisted data instead of silently wiping the store

**Planner resolution:** Brief widened: per-store `schemaVersion` with a forward-only migration table, per-row validation that quarantines bad rows, a typed write-failure path. Every later schema change (earned unlocks, gym visits, history, migrateRule) rides on it.

Change `v.array` to keep the elements that pass and drop only the ones that fail, returning the filtered array through a new `v.arrayOf` validator shape that `createPersistedStore` can consume (validators return `{ ok, value, dropped }` rather than a bare boolean for array fields). `merge` then keeps every valid rule and rule-day instead of falling back to `fresh()` on one bad element. Record the total dropped count per store in a small `hydrationReport` module, and when it is non-zero render one dismissible line at the top of Home. A user whose storage was partly corrupted keeps every readable condition and every readable day of progress, and is told once that something was dropped instead of being shown an empty account that looks like a fresh install.

Copy:
```
Some saved data could not be read after the last update.
Dismiss
```

Files: `app-next/src/state/validation.ts`, `app-next/src/state/createPersistedStore.ts`, `app-next/src/state/rulesStore.ts`, `app-next/src/state/ruleDaysStore.ts`, `app-next/src/state/hydrationReport.ts (NEW)`, `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/content/common.ts`, `app-next/src/state/__tests__/persist.test.ts`

First failing tests:
- hydrating rules with one malformed row keeps the valid rules and drops only the bad one
- hydrating ruleDays with one malformed row keeps the remaining met days and the streak
- hydrationReport counts every dropped row across the rules and ruleDays stores
- Home shows the hydration notice once when rows were dropped and hides it after dismissal

Decisions: B16, B23 · Order: Shares src/state/validation.ts and createPersistedStore.ts with fix 15 (finding 102); do them in the same pass so the validator contract changes once. Land before the B23 earned-unlock snapshot in NEW:condition-lifecycle, which persists an extra field on the met row and would otherwise be the next thing an all-or-nothing validator wipes.

## P2-T14 — Enforcement domain (19 findings)

### #3 [blocker, L] Unshield and unregister on subscription lapse; keep the app reachable behind a paywall modal (B21)

**Planner resolution:** Domain half only: `enforcementPlan` in `domain/enforcement.ts` (this task). Routing, paywall modal and Home copy are P2-T18; the applyLock call site is P2-T17. Ceremonies keep working while lapsed and book progress; their success copy drops the unlock claim (P2-T21).

Add a pure `enforcementPlan({ entitlement, decision })` in `src/domain/enforcement.ts` returning `{ shields: 'apply' | 'clear'; monitors: 'keep' | 'unregister'; reason }`: `trial`/`active` derive from the LockDecision, while `expired`, `billingIssue`, `none` and `unknown` always return `{ shields: 'clear', monitors: 'unregister' }` — a paywall never holds someone's apps hostage. Then stop unmounting the app on lapse: in `RootNavigator.tsx` the tabs/settings/sign-in/builder/unlock group's guard becomes `loading || (onboarding.setupComplete && (entitled || lapsed))` with `lapsed = status === 'expired' || status === 'billingIssue'`, and the paywall is presented over it as a dismissible `fullScreenModal` (placement `in_app`) whose dismiss lands on Home. A lapsed user therefore reaches Settings, support, account deletion and both ceremonies, and Home reports that blocking is off with a route back to the plans. P2-T04 gains the transition step: on entering `expired`/`billingIssue` the adapter clears every shield and unregisters every DeviceActivity monitor before anything else, and re-registers on the transition back into `trial`/`active`.

Copy:
```
homeCopy.lapsed: 'Blocking is paused'
homeCopy.lapsedBody: 'Your subscription ended, so your apps are open. Start a plan to switch blocking back on.'
homeCopy.seePlans: 'See plans'
subscriptionCopy.dismiss: 'Not now'
```

Files: `app-next/src/domain/enforcement.ts (NEW)`, `app-next/src/domain/__tests__/enforcement.test.ts (NEW)`, `app-next/src/features/launch/RootNavigator.tsx`, `app-next/src/features/subscription/PaywallSlot.tsx`, `app-next/src/features/home/statusContent.ts`, `app-next/src/content/home.ts`, `app-next/src/content/subscription.ts`, `app-next/src/features/launch/__tests__/lapse-routing.test.tsx (NEW)`, `plans/rebuild/01-product-model.md`, `plans/rebuild/02-screen-inventory.md`, `plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md`

First failing tests:
- enforcementPlan clears shields and unregisters monitors the moment the entitlement turns expired, even while resolveLock still says locked
- enforcementPlan keeps the shield for a locked decision on an active entitlement
- enforcementPlan re-registers monitors on the transition from billingIssue back to active
- an expired entitlement can still open Settings, support and account deletion
- the in-app paywall can be dismissed on a lapse and lands on Home
- Home says 'Blocking is paused' with 'See plans' when the entitlement is expired

Decisions: B21, B13, B6 · Order: Lands the enforcement gate that the applyLock call site (finding 9, NEW:enforcement-root) consumes — build NEW:enforcement-root first so there is one place to call enforcementPlan; the adapter half (clear + unregister) is P2-T04.

### #7 [high, L] Instant relief on gym arrival: a provisional unlock state fed by presence (B22)

**Planner resolution:** One state, `unlockedProvisional`, designed in P2-T14 and fed by P2-T15's visit surface. No unlock before the 30-second confirmation (B31). `metAt` for an event rule is the confirmed visit's `enteredAt`. The ceremony (P2-T21) consumes the state.

Add a seventh LockDecision state `{ state: 'unlockedProvisional'; ruleId: string; expiresAt: string }` ranked above `locked` and below `unlockedWalking`, and a `gymPresence: { placeId: string; since: string; confirmed: boolean } | null` input to `LockInput`. `resolveLock` returns `unlockedProvisional` when an enabled gym rule (event trigger or minutes target) is active now and presence is inside: for an unconfirmed arrival `expiresAt = since + 30 s` (the app-fixed confirmation cooldown), and per B22 a gym-minutes rule keeps renewing `expiresAt` while presence holds, so the apps stay open while the user is there and the day's credit books when N minutes accrue. A failed confirmation simply lets the state lapse — shields return, no punishment (PRD §3.7). `GymPort` grows `observePresence` timestamps so the fake and the Phase 2 adapter feed the same fact, and `useGymUnlock` stops being the only credit path: the ring books the reward on an unlock that has already happened. Ceremony copy changes to say so.

Copy:
```
unlockCopy.gymHeld: "Unlocked while you're here"
unlockCopy.gymMinutes: (n: number) => `${n} minutes counts the day`
```

Files: `app-next/src/domain/types.ts`, `app-next/src/domain/resolveLock.ts`, `app-next/src/domain/__tests__/resolveLock.test.ts`, `app-next/src/ports/GymPort.ts`, `app-next/src/ports/README.md`, `app-next/src/demo/fakes/GymFake.ts`, `app-next/src/features/unlock/useGymUnlock.ts`, `app-next/src/features/home/statusContent.ts`, `app-next/src/content/unlock.ts`, `plans/rebuild/01-product-model.md`, `docs/specs/aha-unlock-screens.md`, `plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md`, `plans/rebuild/phase-2-backend/P2-T05-signals-behind-ports.md`

First failing tests:
- resolveLock returns unlockedProvisional the instant gym presence turns inside during the rule's window
- a provisional unlock lapses at expiresAt when the 30-second confirmation never arrives, and the decision falls back to locked
- a gym-minutes rule keeps the provisional unlock alive while presence holds and books met at the goal
- unlockedWalking still beats unlockedProvisional for the same user
- the gym ceremony ring books credit on an unlock that already happened rather than gating it

Decisions: B22, B31, B24 · Order: needs design: provisional unlock state and the gym presence fact — the presence timestamps it needs are the same surface P2-T05 must add for closed-app dwell credit (B31), so design both together before writing either.

### #15 [high, M] Restrict "met wins" to the day of the current window instance

**Planner resolution:** One rewritten met scan with #16 and #52: the day restriction reads the `EarnedUnlock` record (`day === today` or `windowEnd > now`), not `currentInstances`.

In `resolveLock`, gate the met-row scan on the day the rule is actually scheduled for right now instead of the whole met history. Build the accepted day set as `today` plus the `day` of every `currentInstances(rule, now, tz)` instance (so an overnight 20:00-02:00 window met at 23:30 still unlocks at 01:00 under yesterday's key), and skip any met row whose `day` is not in that set. Keep the existing `windowInstances(rule, row.day, tz)[0]` guard and the `relockAt` computation unchanged. After the fix a Mon-Fri condition met on Friday resolves to `noRulesToday` on Saturday, so Home shows "No blocking right now / Nothing scheduled today. Enjoy your day." instead of "Unlocked for the rest of today / Blocking resumes Monday at 9:00 AM" over an orange lock card, and a condition met today still keeps the apps open after its window closes (B2).

Files: `app-next/src/domain/resolveLock.ts`, `app-next/src/domain/__tests__/resolveLock.test.ts`

First failing tests:
- resolveLock returns noRulesToday on Saturday when a Mon-Fri condition was met on Friday
- resolveLock still returns unlockedMet at 01:00 for a 20:00-02:00 window met at 23:30 the previous evening
- resolveLock keeps unlockedMet after today's window has closed when today's row is met
- resolveLock ignores a met row from a day the rule is not scheduled even when a later rule's window exists

Decisions: B2, B9, B23 · Order: Land before the earned-unlock snapshot work in NEW:condition-lifecycle (B23): the snapshot must be read through the same day-restricted scan, otherwise a snapshotted met row reintroduces the same cross-day leak. Fix 7 (finding 67) reads the corrected `unlockedMet.byRuleId`, so land this first.

### #16 [high, M] Snapshot the earned unlock on the met row so schedule edits cannot revoke it

**Planner resolution:** The B23 representation is a separate persisted `EarnedUnlock` record in `ruleDaysStore` (not a field on `RuleDay`), written when a row flips to met; `resolveLock` takes `earnedUnlocks`. #111 is an acceptance criterion of this entry.

Add an optional `unlock` snapshot to `RuleDay`: `{ windowStart, windowEnd, name }`, written by `applyProgress` at the single instant `met` flips true (callers already hold the `WindowInstance` they credited, so pass it in). `resolveLock`'s met scan reads that snapshot instead of recomputing `windowInstances(rule, row.day, tz)` (resolveLock.ts:26-27) and stops requiring the row's rule to be present in `enabled` (line 24), so changing days, window, mode, activity or the enabled flag cannot discard an unlock already earned today. `relockAt` still comes from the remaining enabled rules' next instance after the day cutoff, so an edit can move the re-lock but never revoke the day. `LockDecision.unlockedMet` gains `byRuleName` from the snapshot so Home can name a rule that no longer matches. Give `state/validation.ts` an `optional()` helper so rows persisted before the field still load (the validators are all-or-nothing today).

Files: `app-next/src/domain/types.ts`, `app-next/src/domain/progress.ts`, `app-next/src/domain/resolveLock.ts`, `app-next/src/state/validation.ts`, `app-next/src/features/home/progressSync.ts`, `app-next/src/demo/gymProgress.ts`, `app-next/src/demo/fakes/GymFake.ts`, `app-next/src/domain/__tests__/resolveLock.test.ts`, `app-next/src/domain/__tests__/progress.test.ts`, `plans/rebuild/01-product-model.md`

First failing tests:
- resolveLock keeps unlockedMet after the met rule's days are changed to exclude today, with a second unmet rule enabled
- resolveLock keeps unlockedMet after the met rule's window is moved so no instance starts today
- applyProgress writes the window snapshot exactly once, at the instant met flips true, and never rewrites it on later progress
- a ruleDays row persisted without an unlock snapshot still loads and still resolves to unlockedMet for its own day

Decisions: B23, B2, B6 · Order: One fix shared with finding 37 (pause/delete) and it supplies the metAt-ordered row scan finding 52 needs; land before NEW:home-stacking's attribution row, which reads byRuleName.

### #17 [high, M] Register the merged union of rule windows, never per-rule DeviceActivity intervals

**Planner resolution:** One function with #18: `mergedLockIntervals` + `compileMonitorPlan` with `LOCK_WINDOW_BUDGET = 16`. P2-T19's `daySegments` is this same function over one day, not a second implementation.

Add a pure `src/domain/lockIntervals.ts` exporting `mergedLockIntervals(rules, fromDay, dayCount, timezone): { start: string; end: string }[]`: expand every enabled rule's window instances over the horizon (reusing `windowInstances`), sort by start and merge overlapping or touching intervals, so 9–12 plus 10–14 becomes one 9–14 interval and 9–12 plus 12–15 becomes one 9–15. P2-T04 step 1 registers DeviceActivity schedules for these merged intervals only, so an `intervalDidEnd` callback can only ever mean 'no rule is active' and the extension needs no arithmetic. The per-rule registration and its test list are removed from the task.

Files: `app-next/src/domain/lockIntervals.ts (NEW)`, `app-next/src/domain/__tests__/lockIntervals.test.ts (NEW)`, `app-next/src/domain/README.md`, `plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md`, `docs/research/device-activity-gaps.md`

First failing tests:
- two overlapping windows merge into one interval ending at the later end
- adjacent windows 9–12 and 12–15 merge into a single 9–15 interval
- a cross-midnight window merges with the next morning's window
- an all-day rule swallows every other window that day
- a paused rule contributes no interval
- the merged intervals for a locked instant always contain that instant when resolveLock says locked

Decisions: B5, B9, B2 · Order: One fix shared with finding 18 — build mergedLockIntervals here, add the budget assertion there.

### #18 [high, S] Cap DeviceActivity registrations against Apple's 20-monitor limit

**Planner resolution:** Folded into #17 as the budget assertion and the five-rule test.

The merged interval union (finding 17) collapses registration to at most 7 weekly schedules regardless of how many rules exist, which is the substantive fix. On top of it, add `MONITOR_BUDGET = 18` and a pure `scheduleBudget(intervals, reserved)` check next to `mergedLockIntervals` that accounts for the two reserved slots (the B15 daily usage monitor and the walking-lease monitor) and refuses any plan that would exceed the budget; the Phase 2 adapter calls it before `startMonitoring`, registers the earliest intervals it can afford and writes the overflow to the diagnostics log rather than failing silently. P2-T04 gains a schedule-generation test at five daily rules and the cap is stated in the task's Design section.

Files: `app-next/src/domain/lockIntervals.ts (NEW)`, `app-next/src/domain/__tests__/lockIntervals.test.ts (NEW)`, `app-next/src/domain/README.md`, `plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md`, `docs/research/device-activity-gaps.md`

First failing tests:
- five daily rules still produce at most seven merged intervals
- scheduleBudget refuses a plan that would exceed 18 registrations with the usage and lease monitors reserved
- an over-budget plan reports the dropped intervals instead of registering them silently

Decisions: B5, B15, B29 · Order: Same fix as finding 17 (mergedLockIntervals); this entry adds only the budget assertion and the five-rule test, so land it immediately after.

### #37 [medium, S] Pausing or deleting the condition that unlocked today keeps the unlock

B23 answers the contradiction the finding names: today's unlock survives. With finding 16's snapshot in place `resolveLock` no longer consults `enabled` for a met row, so `toggleRule(id, false)` needs no warning sheet and no undo — it simply stops revoking the day. `deleteRule` must stop deleting the row that owns today's unlock: prune every row for that rule except one whose `unlock.windowEnd` covers today, and let day rollover drop it. Update `01-product-model.md:139` ("pausing removes a rule from every branch immediately") to state the exception, since that line is what the code follows today. On Conditions, a paused rule that still owns today's unlock shows a note so the state is legible rather than mysterious.

Copy:
```
Unlocked your apps today
```

Files: `app-next/src/features/conditions/mutations.ts`, `app-next/src/domain/resolveLock.ts`, `app-next/src/features/conditions/ConditionsScreen.tsx`, `app-next/src/design-system/RuleCard.tsx`, `app-next/src/content/conditions.ts`, `app-next/src/domain/__tests__/resolveLock.test.ts`, `app-next/src/features/conditions/__tests__/mutations.test.ts (NEW)`, `plans/rebuild/01-product-model.md`

First failing tests:
- pausing the rule that met today leaves the decision unlockedMet while a second unmet rule stays enabled
- deleting the rule that met today leaves the decision unlockedMet and keeps only that day's row
- the paused rule that owns today's unlock shows the 'Unlocked your apps today' note
- yesterday's snapshot row does not keep the apps open once today's window starts

Decisions: B23, B2, B6, B9 · Order: Same fix as finding 16 — write finding 16's domain change first, then this store and copy change.

### #39 [medium, S] A rest day says when blocking resumes

**Planner resolution:** One entry with #94 (its README note and two pinned examples are acceptance criteria). Type edit lands in P2-T14 before #95 and before the provisional state.

Give `noRulesToday` a `nextLockAt: string | null` field, computed with the same `nextInstanceStart(enabled, now, tz)` call `afterWindow` already uses over its eight-day horizon, and render it through `statusContent`'s existing `resume()` helper so both states read "Blocking resumes Monday at 9:00 AM". When no enabled rule has a window in the horizon the existing `c.noNext` copy stands. This closes the `02-screen-inventory.md:104,124` requirement that both open states show the next scheduled start; no new copy is needed.

Files: `app-next/src/domain/types.ts`, `app-next/src/domain/resolveLock.ts`, `app-next/src/features/home/statusContent.ts`, `app-next/src/domain/__tests__/resolveLock.test.ts`, `app-next/src/demo/__tests__/home-status.test.ts`

First failing tests:
- noRulesToday carries the next scheduled start over the eight-day horizon
- Home on a Saturday with a Mon-Fri rule reads "Blocking resumes Monday at 9:00 AM"
- noRulesToday with no future window keeps the no-next copy
- a user with no rules at all still gets the no-conditions empty state, not a resume line

Decisions: B9, B2, B5 · Order: One fix with #94 — keep both entries, land once. The types.ts change to LockDecision must land before #95's beforeWindow edit.

### #40 [medium, M] Clamp enforcement time to a monotonic watermark so a backwards clock cannot revive an unlock

**Planner resolution:** One module: `domain/watermark.ts` exporting `effectiveNow` and `nextWatermark` (no `monotonic.ts`). No blanket disable under the fake runtime; the dev menu uses `RuntimeControls.setClock({ rewind: true })` so the `clock-rewind` scenario still exercises the guard.

Add `src/domain/monotonic.ts` with `clampNow(now, watermark)` returning the later of the two, and a persisted `src/state/watermarkStore.ts` (`excerlock-next.watermark.v1`, mirrored to the app group in Phase 2) that only ever advances. The root enforcement host reads the clock once, advances the watermark, and passes the clamped instant into `resolveLock`, so a met row whose `relockAt` has passed and a `WalkingSession` whose `leaseUntil` has lapsed both stay expired after the user sets their iPhone clock back. Guard `FakeClock.advance` against negative deltas (throw) and keep `set` behind the dev flag. Record the rule in 01-product-model.md §3 next to the timezone-change edge.

Files: `app-next/src/domain/monotonic.ts (NEW)`, `app-next/src/domain/__tests__/monotonic.test.ts (NEW)`, `app-next/src/state/watermarkStore.ts (NEW)`, `app-next/src/runtime/EnforcementHost.tsx (NEW)`, `app-next/src/demo/clock.ts`, `app-next/src/domain/__tests__/resolveLock.test.ts`, `plans/rebuild/01-product-model.md`

First failing tests:
- clampNow never returns an instant earlier than the watermark
- a backwards clock jump does not revive an expired met row
- a backwards clock jump does not revive a lapsed walking lease
- the watermark advances across launches but never retreats
- FakeClock.advance rejects a negative delta

Decisions: B2, B3, B29 · Order: after NEW:enforcement-root lands the single clock read (finding 9) — the clamp belongs there, not in resolveLock's callers.

### #43 [medium, S] Treat a null Screen Time selection handle as no selection, everywhere

In `statusContent`, decide `noAppsSelected` from `!apps.handle || apps.appCount + apps.categoryCount === 0` instead of the counts alone, so a selection whose opaque handle iOS invalidated degrades to 'Choose the apps you want to block' rather than claiming normal blocking. Tighten `state/validation.ts`'s `lockedApps` so a persisted row with a null handle and non-zero counts is normalised to zeroes on load. Add `describeSelection(handle): { appCount: number; categoryCount: number } | null` to `ScreenTimePort` (null for a handle this adapter did not issue) and document the degrade law in `src/ports/README.md`, porting `app/src/screentime/README.md:41-43`; the root enforcement host calls it on foreground and zeroes the stored counts when it answers null.

Files: `app-next/src/features/home/statusContent.ts`, `app-next/src/state/validation.ts`, `app-next/src/ports/ScreenTimePort.ts`, `app-next/src/ports/README.md`, `app-next/src/demo/fakes/ScreenTimeFake.ts`, `app-next/src/runtime/EnforcementHost.tsx (NEW)`, `app-next/src/features/home/__tests__/home-status.test.tsx (NEW)`, `plans/rebuild/phase-2-backend/P2-T08-sync.md`

First failing tests:
- Home shows 'Choose the apps you want to block' when the handle is null even though the counts are not zero
- the persisted store zeroes a locked-apps row whose handle is null but whose counts are not
- the foreground check zeroes the selection when describeSelection returns null

Decisions: B6 · Order: Land before finding 60's count rows so the zero-state copy those rows render is actually reachable; the foreground verification hangs off NEW:enforcement-root.

### #44 [medium, M] Give the lockWindow shield its own subtitle and publish a per-rule content set (B36)

**Planner resolution:** One entry with #105: #65's staleness rewrite first, then this lockWindow branch and per-monitor publication, then #45's canNotify collapse. The app-group refresh question is carried into P2-T04.

Per B36, `shieldContent` gains a real `lockWindow` branch whose subtitle names the cheapest unlock rather than falling back to the generic sentence, so `locked` and `lockWindow` stop being byte-identical and the ShieldPreview control shows three distinct outputs. Add a pure `shieldContentSet(rules, rows)` next to it that returns one pre-written config per active rule's hint kind; P2-T04 step 2 publishes that set to the app group alongside the `met`, `walkLease` and `usageDay` facts whenever the app runs, so the extension can select a real unlock path at interval start without computing anything.

Copy:
```
sessionCopy.shieldWindowPrefix: 'Blocking has started.'
```

Files: `app-next/src/domain/shieldContent.ts`, `app-next/src/domain/__tests__/shieldContent.test.ts`, `app-next/src/content/sessions.ts`, `app-next/src/features/sessions/ShieldPreview.tsx`, `plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md`

First failing tests:
- the lockWindow shield names the cheapest unlock instead of the generic fallback
- locked and lockWindow shields are no longer byte-identical
- shieldContentSet returns one config per active rule's hint kind
- the preview screen renders three different subtitles for the three causes

Decisions: B36 · Order: One shieldContent signature change shared with findings 45 and 65 — land 65's staleness rewrite first so this branch inherits the safe strings, then 45's canNotify collapse.

### #45 [medium, M] Give the shield a real route home: the third notification id and a Close-only collapse (B30)

**Planner resolution:** B30 amends B14: the catalog has three ids, the third emittable only from ShieldAction (grep test). Register `app/locked-apps.tsx` outside every guard (P2-T17).

B30 settles the notification-count law: a third local notification id exists for the shield's 'Open ExcerLock' button, so P2-T09's 'the catalog has exactly two ids' test becomes three and the third id gets copy and a landing rule — `excerlock://` to Home, or `excerlock://unlock/gym?ruleId=…` / `excerlock://unlock/treadmill?ruleId=…` when the cheapest unlock is one of the two ceremonies. Add `canNotify` to `shieldContent` so that when notification permission is absent the two buttons collapse to a single 'Close' rather than presenting a dead route, porting the old law at `app/src/shield/README.md:66-73`. Add the `Linking` prefix config to the root layout so a deep link that arrives while the boot gate is still resolving is replayed after the guard opens, instead of being dropped.

Copy:
```
sessionCopy.shieldClose: 'Close'
sessionCopy.shieldTapTitle: 'Open ExcerLock'
sessionCopy.shieldTapBody: 'Tap to open ExcerLock and unlock your apps.'
```

Files: `app-next/src/domain/shieldContent.ts`, `app-next/src/domain/__tests__/shieldContent.test.ts`, `app-next/src/content/sessions.ts`, `app-next/src/features/sessions/ShieldPreview.tsx`, `app-next/src/features/launch/RootNavigator.tsx`, `app-next/app/_layout.tsx`, `plans/rebuild/phase-2-backend/P2-T09-notifications.md`, `plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md`, `plans/rebuild/00-decisions.md`

First failing tests:
- shieldContent collapses to a single Close button when notifications are not granted
- the shield keeps 'Open ExcerLock' plus the walking secondary when notifications are granted
- the notification catalog has exactly three ids
- excerlock://unlock/gym?ruleId=… lands on the gym ceremony after the boot gate resolves

Decisions: B30, B14, B20 · Order: Shares the shieldContent signature with findings 44 and 65; B30 amends B14, so update the decision register's B14 row in the same commit. Delivery of the third notification is P2-T09.

### #52 [medium, S] Credit the condition that was met first, deterministically

`resolveLock.ts:23` sorts met rows by day only, so with two rows for the same day the array position decides `byRuleId`, and `progressSync`'s `[...unchanged, ...changes]` rebuild (progressSync.ts:56) moves any still-accruing row to the end — the credited condition can flip as progress ticks, and finding 36 makes that flip visible. Sort by `day` descending then `metAt` ascending, with a missing `metAt` sorting last, so the first earned unlock owns the day. No new decision is needed: B23 makes the earned unlock a snapshotted fact, and the earliest met row is the one that actually opened the apps.

Files: `app-next/src/domain/resolveLock.ts`, `app-next/src/domain/__tests__/resolveLock.test.ts`, `plans/rebuild/01-product-model.md`

First failing tests:
- with two conditions met the same day the decision credits the one met first, whatever order the rows are stored in
- reordering ruleDays does not change byRuleId
- a met row with no metAt never outranks one that has one

Decisions: B23, B2, B6 · Order: Same function and same test file as finding 16; land them together.

### #65 [medium, S] Rewrite shield copy to be staleness-safe: name the goal, never the remainder

Apple's `ShieldConfiguration` is a fixed template refreshed only when the app runs, so a baked remainder lies as soon as the user walks. Add `goal: number | null` to `UnlockHint` (the value is already in scope in `unlockHint.ts`) and replace `sessionCopy.shieldProgress(remaining, unit)` with `sessionCopy.shieldGoal(verb, goal, unit)`, which names the target instead: 'Walk 5,000 steps to open your apps.' Keep the live remainder on Home only. Approve the new strings through the ShieldPreview screen before P2-T04 ports the Swift, and add a test that the shield output does not change as progress changes.

Copy:
```
sessionCopy.shieldGoal: (verb: string, goal: string, unit: string) => `${verb} ${goal} ${unit} to open your apps.`
```

Files: `app-next/src/domain/types.ts`, `app-next/src/domain/unlockHint.ts`, `app-next/src/domain/shieldContent.ts`, `app-next/src/domain/__tests__/shieldContent.test.ts`, `app-next/src/domain/__tests__/unlockHint.test.ts`, `app-next/src/content/sessions.ts`, `app-next/src/features/sessions/ShieldPreview.tsx`, `plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md`

First failing tests:
- the shield subtitle names the goal, never the remaining amount
- the shield subtitle is unchanged after progress moves from 0 to 3,200 steps
- Home still shows the live remainder for the same rule

Decisions: B36, B11 · Order: First of the three shieldContent changes (then finding 44's lockWindow branch, then finding 45's canNotify collapse); finding 42's claim-on-open shield line uses the same table.

### #94 [low, S] afterWindow and noRulesToday both carry the next start, and the split is pinned by test

**Planner resolution:** Folded into #39.

The geometry critique does not hold — a 20:00-02:00 rule that ended at 06:00 today means blocking did happen today, so `afterWindow` is correct there, while a rule that ended at 20:00 yesterday with nothing today means no blocking happened today and `noRulesToday` is correct. What is real is that `noRulesToday` carries no next start. So: the same field addition and the same `resume()` rendering as #39, plus a comment in `domain/README.md` stating the intent (afterWindow = an instance belonging to today, or yesterday's cross-midnight instance, has ended; noRulesToday = nothing was scheduled) and `resolveLock` tests that pin both examples so the split cannot drift.

Files: `app-next/src/domain/types.ts`, `app-next/src/domain/resolveLock.ts`, `app-next/src/features/home/statusContent.ts`, `app-next/src/domain/README.md`, `app-next/src/domain/__tests__/resolveLock.test.ts`

First failing tests:
- a rule that ended at 20:00 yesterday with nothing scheduled today yields noRulesToday carrying the next start
- an overnight rule that ended at 06:00 today yields afterWindow carrying the next start
- both states render the same "Blocking resumes …" line on Home

Decisions: B9, B2 · Order: One fix with #39 — keep both entries, land once.

### #95 [low, S] "Get ahead" is offered only where getting ahead is possible

Split the two jobs `beforeWindow.ruleId` is doing today. Keep `ruleId` as the owner of the upcoming window (the timeline needs it) and add `getAheadRuleId: string | null`, chosen from enabled target-mode rules scheduled in that window only. `statusContent` renders `c.getAhead(...)` when it is set and falls back to the existing `c.walkReady` ("Your apps stay open while you keep walking.") when the upcoming window has only state rules — which is honest, because a session started before the window is still live when the window opens and `resolveLock` returns `unlockedWalking`. No new copy.

Files: `app-next/src/domain/types.ts`, `app-next/src/domain/resolveLock.ts`, `app-next/src/features/home/statusContent.ts`, `app-next/src/domain/__tests__/resolveLock.test.ts`, `app-next/src/demo/__tests__/home-status.test.ts`

First failing tests:
- beforeWindow with only a state rule upcoming carries no get-ahead rule
- Home before a state-only window reads "Blocking starts at 9:00 AM" with the walk-ready subtitle
- beforeWindow with a mixed set picks the target rule for the get-ahead line, not the earliest-starting rule
- the timeline still receives the window owner's ruleId

Decisions: B3, B4, B7 · Order: After #39 and #94 land their LockDecision field changes — all three edit the same union in domain/types.ts.

### #97 [low, S] Raise the minimum blocking window to 30 minutes (B32)

**Planner resolution:** Domain constant `MIN_WINDOW_MINUTES = 30` and the `migrateRule` widening (a persisted 15–29-minute window becomes 30, cross-midnight safe, no rule dropped) are P2-T14; enumerate `domain/__tests__/fixtures.ts` and `demo/scenarios/*` and add the test 'no shipped scenario violates MIN_WINDOW_MINUTES'. P2-T20 updates the builder range UI and copy.

Per B32 the minimum lock window becomes 30 minutes, clear of Apple's 15-minute DeviceActivity floor. Replace the bare `15` in `validateRule.ts:73` with a named `MIN_WINDOW_MINUTES = 30` constant carrying a comment that cites B32 and the floor in `docs/research/device-activity-gaps.md:26`, update the product model's '`range` window at least 15 minutes long' line to 30, and show the builder's window error when a shorter range is picked (the 5-minute wheel step stays, so a user can still land on 30 exactly). P2-T04's schedule-generation tests gain the minimum-length case.

Copy:
```
rulesCopy.windowTooShort: 'Blocking windows are at least 30 minutes.'
```

Files: `app-next/src/domain/validateRule.ts`, `app-next/src/domain/__tests__/validateRule.test.ts`, `app-next/src/content/rules.ts`, `app-next/src/features/rules/TimeSheet.tsx`, `app-next/src/features/conditions/ConditionBuilder.tsx`, `plans/rebuild/01-product-model.md`, `plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md`

First failing tests:
- a 15-minute window no longer validates
- a 30-minute window validates
- a cross-midnight 30-minute window validates
- the builder shows 'Blocking windows are at least 30 minutes' when a shorter range is chosen

Decisions: B32, B9 · Order: Any existing scenario or fixture with a shorter window must be migrated in the same commit, otherwise the persisted-store validator drops those rules on load.

### #105 [low, M] Give the lockWindow shield its own subtitle and make all three variants previewable

**Planner resolution:** Folded into #44 (per-rule publication) with its ShieldPreview fix; the preview picks the hint with `unlockHint`'s ordering law.

Per B36 the `lockWindow` cause gets its own subtitle naming the cheapest unlock, published per rule to the app group whenever the app runs. Add a `shieldWindow` template to sessionCopy that frames the window and names the action ("Blocking is on until 9 PM. <cheapest unlock> to open your apps.") and branch `shieldContent` on all three causes instead of only testing for `'walkingEnded'`, so `locked` and `lockWindow` stop producing byte-identical output. Fix the preview so the copy can actually be approved: ShieldPreview passes a hint for every cause — when the live decision is not `locked`, synthesise one from the enabled rules scheduled today rather than passing `undefined` and collapsing both non-walking causes to the generic fallback. The app-group publication of the per-rule subtitle and the window end time belongs to P2-T04's DeviceActivity work, which is where the Swift shield reads it.

Copy:
```
shieldWindow: (until, action) => `Blocking is on until ${until}. ${action} to open your apps.`
```

Files: `app-next/src/domain/shieldContent.ts`, `app-next/src/content/sessions.ts`, `app-next/src/features/sessions/ShieldPreview.tsx`, `app-next/src/domain/__tests__/shieldContent.test.ts`, `plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md`

First failing tests:
- shieldContent('locked', hint) and shieldContent('lockWindow', hint) return different subtitles for the same hint
- the lockWindow subtitle names both the window end and the cheapest unlock action
- the shield preview renders a non-fallback subtitle for all three causes in a scenario whose decision is beforeWindow

Decisions: B36 · Order: needs design: what the shield extension can read from the app group and how often it refreshes (P2-T04) — the copy and the preview land now, the per-rule publication with P2-T04

### #111 [low, S] Make the null relockAt / nextLockAt branch reachable and tested, or delete it

**Planner resolution:** Acceptance criterion of #16: a snapshotted met row whose rules are all gone yields `relockAt: null` and renders `homeCopy.noNext`.

Today `nextInstanceStart`'s 8-day horizon plus weekly repetition makes both null branches unreachable, so `homeCopy.noNext` renders nowhere and the 'permanent unlock' path has never been reasoned about — which matters because the Phase 2 adapter has to know whether a shield can ever be cleared indefinitely. B23 makes it reachable: once an earned unlock is snapshotted on the met row, a met row whose condition was then deleted or paused keeps today's unlock while no enabled rule remains to supply a next start, so `relockAt` is legitimately null and 'Your apps stay open until your next scheduled condition.' is the correct line. Keep the nullability, add the tests that prove it, and state in `src/domain/README.md` that a null `relockAt` means 'clear the shield until a rule is re-enabled', not 'forever'.

Files: `app-next/src/domain/resolveLock.ts`, `app-next/src/domain/__tests__/resolveLock.test.ts`, `app-next/src/domain/README.md`, `app-next/src/features/home/statusContent.ts`, `app-next/src/features/home/__tests__/home-status.test.tsx (NEW)`, `plans/rebuild/01-product-model.md`

First failing tests:
- resolveLock keeps unlockedMet with relockAt null after the met rule is deleted
- resolveLock keeps unlockedMet after the met rule is paused
- Home renders 'Your apps stay open until your next scheduled condition.' for that state
- afterWindow reports nextLockAt null when no enabled rule remains

Decisions: B23, B2, B9 · Order: after NEW:condition-lifecycle's B23 earned-unlock snapshot lands — that snapshot is what makes the branch reachable; if B23 is implemented some other way the branch stays dead and the nullability plus homeCopy.noNext should be deleted instead.

## P2-T15 — Session and credit engine (16 findings)

### #1 [blocker, M] Propped-verified treadmill minutes must accrue exactly like handheld ones

**Planner resolution:** Closed by the session machine (P2-T15): `completeProppedScan` emits a `verified` event; credit flows through the `creditMinutes` effect into `applyProgress`. No playback loop, no `play()`, no `writeWalkingProgress` increment.

Extract the clock-driven playback out of `WalkingFake` into a new pure module `app-next/src/demo/walkingPlayback.ts` that answers, for one session, `{phase, walkedSeconds, graceUntil}` from `{script, stepMs, startedAt, verifiedAt, placement, now}`. Add `verifiedAt: string | null` and `baseProgress: number` to `WalkingSession` (validated in `state/validation.ts`), set `verifiedAt` in `completeProppedScan`, and have `completeProppedScan` start the same clock subscription `start()` uses instead of a lease-expiry-only watcher. Propped seconds accrue from `verifiedAt` forward (so the unverified scan itself never books credit) and are written through `writeWalkingProgress` as the absolute `baseProgress + walkedSeconds/60`. The user props the phone, passes the scan, walks 40 minutes, and Analytics shows 40 walking minutes, `todayHistory` marks the day met at the 10-minute floor, and the streak advances. This is also the minutes source the B28 treadmill "Walk for N minutes" target reads.

Files: `app-next/src/demo/walkingPlayback.ts (NEW)`, `app-next/src/demo/fakes/WalkingFake.ts`, `app-next/src/demo/walkingProgress.ts`, `app-next/src/domain/types.ts`, `app-next/src/state/validation.ts`, `app-next/src/demo/README.md`, `app-next/src/demo/__tests__/walking-playback.test.ts (NEW)`

First failing tests:
- completeProppedScan followed by twelve minutes of clock advance writes twelve walking minutes to the rule's day row
- a propped-verified day with twelve walking minutes is a met day in todayHistory and advances the streak
- walking minutes accrue from verifiedAt, not from the instant the scan screen opened
- a propped session whose scan never completed writes zero minutes

Decisions: B3, B12, B28, B29 · Order: Shared walkingPlayback.ts refactor with #31, #63 and #84 — land this entry first; it introduces the module, verifiedAt and baseProgress the other three build on.

### #8 [high, L] Seal each past day so streaks and Analytics have a real record

Introduce a persisted `historyStore` and a pure `domain/dayRollover.ts` with `sealDays(sealed, rules, ruleDays, lastSealedDay, today, tz)` that emits one `HistoryDay` per elapsed day between the last sealed day and today — including days the app was never opened, which seal as `scheduled: true, met: false` and therefore break the streak as `01-product-model.md:177-178` requires. `todayHistory` keeps recomputing only today, layered on the sealed rows. `contextPersistence` stops writing `patch.history = scenario.history` on every launch; a scenario's history is applied only when the dev menu explicitly loads that scenario, so a plain relaunch keeps what the user actually did. Phase 2 then syncs sealed rows (P2-T08) rather than inventing history.

Files: `app-next/src/domain/dayRollover.ts (NEW)`, `app-next/src/state/historyStore.ts (NEW)`, `app-next/src/state/todayHistory.ts`, `app-next/src/state/selectors.ts`, `app-next/src/state/validation.ts`, `app-next/src/demo/contextPersistence.ts`, `app-next/src/demo/activityHistory.ts`, `app-next/src/state/README.md`, `app-next/src/domain/README.md`, `app-next/src/domain/__tests__/dayRollover.test.ts (NEW)`

First failing tests:
- a scheduled day on which the app was never opened seals as scheduled and unmet and breaks the streak
- yesterday's met row survives a relaunch instead of being restored from the scenario
- loading a dev scenario replaces sealed history but a plain relaunch does not
- sealDays run twice on the same day produces the same rows
- today's row is still recomputed live on top of the sealed rows

Decisions: B2, B9, B16 · Order: needs design: day-boundary sealing — the same rollover pass owns #64's pruning and shares the day-ownership helper from #62; land before #64 and #110.

### #31 [medium, M] The walking lease renews indefinitely while cadence holds (B29)

**Planner resolution:** Renewal is not a port method: a `verified` event renews the lease inside P2-T15's session machine; a lapsed lease is never revived. Propped renewal = a new scan or a handheld verification (treadmill spec). No `renew()` on `WalkingPort`.

B29 answers the finding's open question: renew indefinitely, no session cap. Remove both hardcoded `900000` literals and the unconditional `elapsed >= 900000 ? 'ended'` cutoff from the fake. Add `app-next/src/domain/walkingLease.ts` with `WALK_LEASE_MS = 15 * 60_000` and `nextLeaseEnd(currentLease, now, verified)`, and have `walkingPlayback` extend `leaseUntil` by one increment whenever the tick crosses the current lease while the phase is still `walking`; a session whose phase has left `walking` is not renewed and ends when the lease lapses. No `renew()` is added to `WalkingPort` — renewal is the adapter's business and the app only reads `leaseUntil` through `observe`, which keeps the port shape identical for Phase 2. Document the law in `ports/README.md`, the `leaseUntil` comment in `domain/types.ts`, and amend P2-T04 so `extendWalkIncrement` renews without a cap. "until renewal" then stops lying.

Files: `app-next/src/domain/walkingLease.ts (NEW)`, `app-next/src/demo/walkingPlayback.ts (NEW)`, `app-next/src/demo/fakes/WalkingFake.ts`, `app-next/src/domain/types.ts`, `app-next/src/ports/WalkingPort.ts`, `app-next/src/ports/README.md`, `app-next/src/domain/__tests__/walkingLease.test.ts (NEW)`, `plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md`

First failing tests:
- a session still in the walking phase at 14:50 elapsed has its lease extended to 29:50 rather than ending
- a session whose phase has left walking is not renewed and ends when the lease lapses
- a walk that runs for fifty minutes keeps resolveLock in unlockedWalking throughout
- no file writes a lease duration literal; every lease end derives from WALK_LEASE_MS

Decisions: B29, B3, B14, B30 · Order: Same walkingPlayback.ts refactor as #1, #63 and #84 — land after #1. The P2-T04 amendment is the phase-2 half of the same decision.

### #32 [medium, L] Gym dwell minutes come from a visit log, not a foreground clock accumulator

**Planner resolution:** Merged with #58: `GymPort.visits()/observeVisits()/checkIn()` returning rule-agnostic `GymVisit`, persisted in `gymVisits` store, summed by `domain/gymDwell.ts`; `demo/gymProgress.ts` is deleted and `progressSync` is the single applier.

B31 answers the open question: credit the full geofence enter-to-exit interval from the region timestamps. Add a dwell surface to `GymPort` — `visitsToday(): Promise<GymVisit[]>` and `observeVisits(cb)` with `GymVisit = { id, placeId, enteredAt, exitedAt: string | null }` in `ports/models.ts` — and move the arithmetic into a pure `domain/gymDwell.ts` (`dwellMinutes(visits, placeIds, dayStart, now)`, closed visits credited in full, an open visit credited enter→now, visits shorter than the thirty-second confirmation dropped as blips). `progressSync` stops excluding gym rules and computes their progress from visits like every other target; `gymProgress`'s clock accumulator becomes the fake's visit writer only. A user who leaves the phone in a locker for an hour comes back to sixty credited minutes, and the same computation is testable against the fake and the real geofence adapter.

Files: `app-next/src/ports/GymPort.ts`, `app-next/src/ports/models.ts`, `app-next/src/ports/README.md`, `app-next/src/domain/gymDwell.ts (NEW)`, `app-next/src/features/home/progressSync.ts`, `app-next/src/demo/gymProgress.ts`, `app-next/src/demo/fakes/GymFake.ts`, `app-next/src/domain/__tests__/gymDwell.test.ts (NEW)`, `plans/rebuild/phase-2-backend/P2-T05-signals-behind-ports.md`, `plans/rebuild/01-product-model.md`

First failing tests:
- dwellMinutes credits a closed visit's full enter-to-exit interval
- an open visit credits enter-to-now and keeps growing on each tick
- a visit that started while the app was closed is credited in full on the first sync after launch
- a visit shorter than the thirty-second confirmation credits nothing
- a gym minutes rule reaches its goal through progressSync with no foreground clock ticks at all

Decisions: B31, B22, B11, B24 · Order: After #62's shared progressDay helper — the visit-to-day mapping must use it. The real geofence visit log is P2-T05; this entry fixes the port shape and the domain so the adapter has something to implement against.

### #38 [medium, M] End the walking session when its window ends

**Planner resolution:** Teardown rule (window end, day rollover, rule change → `stop`) lives in P2-T15's machine via `clock.at`; P2-T17 arms it at the root.

`resolveLock` already gates `unlockedWalking` on the session's rule being active (resolveLock.ts:20), so the lock decision is right; what is missing is teardown, so `WalkingFake.play` keeps ticking and the sheet keeps counting down "until renewal" after the apps have re-shielded. Add a pure `sessionWindowEnd(rule, session, tz)` (the end of the instance containing `session.startedAt`) and a small `startSessionGuard(runtime)` mounted at the app root beside `startProgressSync`, which calls `runtime.walking.stop()` when `now >= sessionWindowEnd`, when the session's rule is paused, or when it is gone. Make `toggleRule` stop a live session for the rule it pauses (`deleteRule` already clears `walkingSession`). The sheet's ended state gains a reason line so the user is told why, rather than watching a dead clock.

Copy:
```
Your blocking window ended.
```

Files: `app-next/src/domain/session.ts (NEW)`, `app-next/src/runtime/sessionGuard.ts (NEW)`, `app-next/app/_layout.tsx`, `app-next/src/features/conditions/mutations.ts`, `app-next/src/features/sessions/WalkingSheet.tsx`, `app-next/src/content/sessions.ts`, `app-next/src/domain/__tests__/session.test.ts (NEW)`, `app-next/src/runtime/__tests__/sessionGuard.test.ts (NEW)`, `app-next/src/runtime/README.md`

First failing tests:
- the walking session ends the moment its rule's window ends, with lease time still on the clock
- pausing the rule that owns a live walking session ends the session
- the walking sheet shows the ended state with the window-ended reason instead of a lease countdown
- a session started in a window that crosses midnight ends at that instance's end, not at midnight

Decisions: B3, B9, B29 · Order: The guard must live at the app root, not in the Home tab — same anchoring point findings 9 and 42 need for startProgressSync. P2-T05 later swaps the guard's stop() for the ported walkingSessionController's own window-end timer; the guard itself stays.

### #41 [medium, L] Scenarios and domain tests that actually cover time, and coverage enforced in CI

**Planner resolution:** Split: the CI/coverage half is P2-T13 and lands first; the scenarios half stays here and is authored against 30-minute windows.

Add the missing scenarios — spring-forward and fall-back days, a Saturday rest day, an all-day rule, a lease at 14:30 elapsed, a met-yesterday day that must relock at today's window, two rules met the same day, and one non-`America/New_York` zone (Asia/Tokyo) — and matching `resolveLock` cases for each, plus a backwards-clock case. Then make the declared floor real: `app-next/package.json`'s test script runs `jest --runInBand --coverage`, and the root `test:unit` and `.github/workflows/ci.yml` run the app-next workspace, which today they do not (`test:app` targets the old `app` workspace only, so no app-next test has ever run in CI).

Files: `app-next/src/demo/scenarios/dst-spring-forward.ts (NEW)`, `app-next/src/demo/scenarios/dst-fall-back.ts (NEW)`, `app-next/src/demo/scenarios/rest-day-weekend.ts (NEW)`, `app-next/src/demo/scenarios/all-day-rule.ts (NEW)`, `app-next/src/demo/scenarios/lease-near-expiry.ts (NEW)`, `app-next/src/demo/scenarios/relock-after-met-yesterday.ts (NEW)`, `app-next/src/demo/scenarios/two-rules-met.ts (NEW)`, `app-next/src/demo/scenarios/timezone-tokyo.ts (NEW)`, `app-next/src/demo/scenarios/index.ts`, `app-next/src/demo/scenarios/README.md`, `app-next/src/domain/__tests__/resolveLock.test.ts`, `app-next/package.json`, `package.json`, `/Users/johansardar/ExcerLock/.github/workflows/ci.yml`

First failing tests:
- a window spanning the spring-forward gap resolves to the correct wall-clock start and locks at it
- an all-day rule on the fall-back day is locked for all twenty-five hours
- a Saturday with a Mon-Fri rule resolves to noRulesToday carrying Monday's start
- a session at 14:30 elapsed is still unlockedWalking and renews rather than ending
- a rule met yesterday relocks at today's window start
- two rules met the same day attribute the unlock to the earlier metAt, not to array order
- the same rules and instant in Asia/Tokyo produce a different day key and a different decision
- npm test in app-next fails when src/domain branch coverage drops below one hundred percent

Decisions: B2, B5, B8, B9 · Order: After #39/#94 (noRulesToday.nextLockAt), #62 (day ownership) and #64 (bounded ruleDays scan), so the new assertions pin the fixed shapes rather than the current ones. The coverage-script half is the same package.json change as #96.

### #58 [medium, M] Gym dwell becomes a per-day fact, so a visit before the condition existed counts

**Planner resolution:** Merged into #32.

Make gym time a day total like steps and workouts (B8). Add a `gymDaysStore` holding `{ day, minutes, visits: { enteredAt, exitedAt | null }[] }` written by the presence writer, and a pure `gymMinutesForDay(visits, day, tz)` summing the intervals clipped to the local day. `progressSync` stops excluding gym rules (progressSync.ts:25) and computes gym-minutes progress from that total exactly as it computes steps, so a rule created or unpaused at noon sees the morning's visit instead of `0 / 30 min`. `gymProgress` stops being the accumulator and becomes the writer of visit intervals, which also removes its `dayKey(now)` fallback. Phase 2's `GymAdapter` writes region enter/exit timestamps into the same store, which is what B31's full enter-to-exit credit needs.

Files: `app-next/src/state/gymDaysStore.ts (NEW)`, `app-next/src/domain/gymMinutes.ts (NEW)`, `app-next/src/demo/gymProgress.ts`, `app-next/src/features/home/progressSync.ts`, `app-next/src/state/validation.ts`, `app-next/src/domain/__tests__/gymMinutes.test.ts (NEW)`, `app-next/src/features/home/__tests__/live-progress.test.ts`, `plans/rebuild/phase-2-backend/P2-T05-signals-behind-ports.md`, `plans/rebuild/01-product-model.md`

First failing tests:
- a gym-minutes condition created after the visit ended still sees the day's dwell minutes
- unpausing a gym condition at noon credits the morning's visit
- gym minutes are summed from visit intervals clipped to the local day, so a visit crossing midnight splits across two days
- an open visit accrues against the clock and closes on exit without double counting

Decisions: B8, B31, B22 · Order: The port surface that feeds these visits (`GymPort.visitsToday` / `observeVisit`) is finding 32's entry — land this store first so the fake and the Phase 2 adapter write the same shape. It also removes the `dayKey(now)` fallback finding 62 reports.

### #62 [medium, M] One helper decides which day a progress row belongs to

**Planner resolution:** Adopted semantics: `progressDay(rule, at, tz): DayKey | null`, null = no row written; file `domain/progressDay.ts`. Evidence correction: `progressSync.ts:27-28` reads `currentInstances(...)[0] ?? windowInstances(rule, today, tz)[0]`.

Add `app-next/src/domain/progressDay.ts` exporting `progressDay(rule, now, tz): DayKey | null` — the day of the instance containing `now`, else the day of today's instance if the rule is scheduled today, else `null` meaning no row is written at all. Route all three writers through it: `demo/gymProgress.ts` (which today falls back to `dayKey(now)` and so accumulates rows on unscheduled days), `demo/fakes/GymFake.ts:73-74` (same fallback), and `features/home/progressSync.ts:27-28` (which correctly returns nothing). Write `gymProgress`'s history row against the same resolved day rather than `dayKey(now)`, so a cross-midnight session can no longer land on the instance's start day in the rule-day store and on the calendar day in history. `state/selectors.ts`'s `useTodayProgress` reads the same helper so the card and the stored row cannot disagree.

Files: `app-next/src/domain/progressDay.ts (NEW)`, `app-next/src/demo/gymProgress.ts`, `app-next/src/demo/fakes/GymFake.ts`, `app-next/src/features/home/progressSync.ts`, `app-next/src/state/selectors.ts`, `app-next/src/domain/README.md`, `app-next/src/domain/__tests__/progressDay.test.ts (NEW)`

First failing tests:
- no rule-day row is written for a rule that is not scheduled today
- a cross-midnight session credits the instance's start day in both the rule-day store and the history row
- all three writers resolve the same day for the same rule and instant
- a rule scheduled today but outside its window still credits today's instance day

Decisions: B8, B2, B9 · Order: Land before #32's dwell rewrite (which must map visits through this helper), before #8's sealing pass and before #41's new scenarios.

### #63 [medium, M] Resuming a walk after a relaunch stops double-counting minutes

**Planner resolution:** Closed by the session machine's `creditedThrough` high-water mark; `resume()` recomputes from the record.

Resolve the walking script once, in `walkingPlayback.ts`, from `ctx.scenario.walking ?? DEFAULT_SCRIPT`, and use that single resolution in both `play()` and `resume()` — today `resume()` derives its baseline from `ctx.scenario.walking` (zero when absent) while `play()` falls back to the default script, so the elapsed minutes are added on top of a baseline that already contains them. Store the session's starting progress once as `WalkingSession.baseProgress` when the session is created, and have playback always write the absolute `baseProgress + walkedSeconds/60` rather than an increment, so replaying the same session any number of times is idempotent.

Files: `app-next/src/demo/walkingPlayback.ts (NEW)`, `app-next/src/demo/fakes/WalkingFake.ts`, `app-next/src/demo/walkingProgress.ts`, `app-next/src/domain/types.ts`, `app-next/src/state/validation.ts`, `app-next/src/demo/__tests__/walking-playback.test.ts (NEW)`

First failing tests:
- resuming a walk after a relaunch writes the same minutes as an uninterrupted walk of the same length
- resume with no scenario walking script does not double the elapsed minutes
- playback and resume use the same resolved script
- replaying resume three times leaves the day row unchanged

Decisions: B3, B28, B29 · Order: Same walkingPlayback.ts refactor as #1, #31 and #84 — land after #1, which introduces baseProgress.

### #64 [medium, M] Bound the met-day scan and prune rule-day rows at rollover

Two changes. First, `resolveLock` only ever needs rows whose day is today or yesterday — `relockAt` never advances past the next day's window — so filter to that slice before the sort instead of filtering and sorting the whole persisted array once a second. Second, add `domain/ruleDayRetention.ts` with `pruneRuleDays(days, today, tz)` keeping a fourteen-day window, and run it inside the day-rollover pass from #8, where the permanent record is the sealed `HistoryDay` row rather than the per-rule row. Memoize the decision selector on row identity so a tick that changed nothing does not re-derive. At thousands of daily users with three rules apiece, this is the difference between a bounded two-row scan and a growing thousand-row filter-plus-sort every second on device.

Files: `app-next/src/domain/resolveLock.ts`, `app-next/src/domain/ruleDayRetention.ts (NEW)`, `app-next/src/domain/dayRollover.ts (NEW)`, `app-next/src/state/ruleDaysStore.ts`, `app-next/src/state/selectors.ts`, `app-next/src/domain/__tests__/ruleDayRetention.test.ts (NEW)`, `app-next/src/domain/__tests__/resolveLock.test.ts`

First failing tests:
- resolveLock reads only today's and yesterday's rows
- a met row from three days ago cannot produce unlockedMet
- rollover prunes rule-day rows older than the retention window and always keeps today and yesterday
- pruning never removes a row that the current lock decision depends on
- the lock decision is not recomputed when a clock tick changes no row

Decisions: B2, B6, B23 · Order: After #8 — the prune runs inside its rollover pass, and pruning is only safe once sealed history is the permanent record. Coordinate with NEW:condition-lifecycle's B23 earned-unlock snapshot so a snapshotted met row is never pruned out from under an earned unlock.

### #84 [low, S] An abandoned propped scan resumes as unverified, never as an unlock

**Planner resolution:** Closed by the session machine: a session only advances on a real `verified` event.

With `verifiedAt` on the session (from #1), `resume()` refuses to advance a propped session past `verifying` while `verifiedAt` is null, and an unverified propped session older than `GAIT_SCAN_TIMEOUT_MS + GAIT_FAILURE_GRACE_MS` resumes as `ended` and is cleared. A user who starts a propped scan, force-quits and reopens gets the locked Home they earned, not the phantom `unlockedWalking` that today's replay of the default script produces. `resolveLock` needs no change — it already requires phase `walking` or `grace`.

Files: `app-next/src/demo/walkingPlayback.ts (NEW)`, `app-next/src/demo/fakes/WalkingFake.ts`, `app-next/src/domain/types.ts`, `app-next/src/state/validation.ts`, `app-next/src/features/unlock/TreadmillUnlockScreen.tsx`, `app-next/src/demo/__tests__/walking-playback.test.ts (NEW)`

First failing tests:
- relaunching ten seconds into an abandoned propped scan resumes as verifying, not walking
- relaunching after the scan timeout plus the framing grace resumes as ended and clears the session
- a propped session that completed its scan resumes as walking with its minutes intact
- a handheld session is unaffected by the verifiedAt gate

Decisions: B3, B12, B20 · Order: Same walkingPlayback.ts and verifiedAt work as #1 — land #1 first.

### #87 [low, S] Widen Workout so the manual-entry anti-cheat can be stated at the port boundary

**Planner resolution:** Phase 1 port change: `Workout` carries `source: 'device' | 'manual'`, the fake and `progressSync` filter, contract test 'a manually entered workout never counts'. P2-T05 gets an acceptance row.

`Workout = { kind; minutes; km }` cannot express a source flag, a sample id or a start time, so the one HealthKit anti-cheat the PRD keeps (`excerlock-app-prd.md:102,192,203`) can only live inside the Phase 2 adapter and can never be exercised by a fake, a scenario or the port-level contract suite P2-T05:49-50 promises to reuse. Widen it to `{ id: string; kind; startedAt: string; minutes: number; km: number; manuallyEntered: boolean }`, have `progressSync` drop `manuallyEntered` samples and de-duplicate on `id` before summing, and add a `manual-entry-day` scenario mirroring the old app's adversarial fixture. P2-T05's `HealthAdapter` then fills the fields from `HKWorkout` (UUID, startDate, `HKMetadataKeyWasUserEntered`) and passes the same suite the fake passes.

Files: `app-next/src/ports/models.ts`, `app-next/src/demo/fakes/HealthFake.ts`, `app-next/src/features/home/progressSync.ts`, `app-next/src/demo/scenarios/manual-entry-day.ts (NEW)`, `app-next/src/demo/scenarios/index.ts`, `app-next/src/demo/__tests__/ports.test.ts`, `plans/rebuild/phase-2-backend/P2-T05-signals-behind-ports.md`

First failing tests:
- a manually entered 30-minute run never advances a running rule's progress
- two workout samples with the same id are counted once
- a device-recorded workout started today still counts in full
- the port contract suite asserts every Workout carries id, startedAt and manuallyEntered

Decisions: B10, B11 · Order: Port shape and fake land in Phase 1 so the adapter inherits a suite that already proves the filter; no dependency on other entries.

### #88 [low, L] Give the propped lease an end the user can see, and book the handoff machine properly

**Planner resolution:** Lease half (propped lease lapses 15 minutes after the last verification; re-scan or handheld verification renews) lands in P2-T15 at stage ui-now with a named copy key `unlockCopy.scanAgain`. Only the placement handoff machine stays in P2-T05.

Phase 1 has no PROPPED/HANDHELD/HANDOFF machine: `TreadmillScanController`'s phases are scan-only, `WalkingPort` has no placement signal beyond a poll-only `treadmillFraming()`, and `WalkingFake` lease expiry just calls `stop()` so the apps re-lock with no prompt. The verifier is right that P2-T05:13-17 already owns the machine and keeps phases mapped 1:1 to the Phase 1 script, so do not widen the port speculatively — instead close the user-visible half now: on lease expiry the fake ends the session with a reason, Home renders a "scan again" state for a treadmill/either state rule, and the treadmill ceremony can be re-entered from the pill without a fresh start error. B29 fixes the semantics the adapter must implement: the lease renews indefinitely while cadence stays verified, so a successful handheld motion verification resets the propped lease and expiry returns to SCANNING rather than ending the session — write that into P2-T05 alongside P2-T09's 30-second warning.

Copy:
```
Scan again to keep your apps open
```

Files: `app-next/src/demo/fakes/WalkingFake.ts`, `app-next/src/domain/types.ts`, `app-next/src/features/home/progressContent.ts`, `app-next/src/content/home.ts`, `app-next/src/features/unlock/gait/TreadmillScanController.ts`, `plans/rebuild/phase-2-backend/P2-T05-signals-behind-ports.md`, `plans/rebuild/phase-2-backend/P2-T09-notifications.md`

First failing tests:
- a propped session whose lease expires ends with a reason and Home invites another scan instead of showing a silent lock
- re-entering the treadmill ceremony after lease expiry starts a fresh session and scan
- a handheld verification during a propped session extends the lease instead of ending it (adapter contract test, fixture-driven)

Decisions: B29, B12, B3 · Order: needs design: propped lease renewal and the PROPPED/HANDHELD/HANDOFF placement machine, including where placement events enter the port; the Phase 1 lease-expiry copy slice can land independently.

### #96 [low, M] localInstant declares its DST outcome instead of returning an unchecked guess

Make the non-converging exit explicit rather than accidental. Track the correction across iterations: a correction that repeats or flips sign is the deliberate DST-gap path (already asserted at `schedule.test.ts:40-41` and documented at `domain/README.md:5`), so return the forward-shifted instant and say so in the code; a loop that exits with a correction that is neither zero nor a known transition amount throws rather than silently producing a window at the wrong wall-clock minute. Add coverage for a half-hour zone (Australia/Adelaide) and Lord Howe's thirty-minute DST shift. Ship the coverage-script change with #41 so the declared 100% domain branch floor is actually measured.

Files: `app-next/src/domain/calendar.ts`, `app-next/src/domain/__tests__/calendar.test.ts (NEW)`, `app-next/src/domain/__tests__/schedule.test.ts`, `app-next/src/domain/README.md`, `app-next/package.json`

First failing tests:
- a 09:00 window in Australia/Adelaide resolves to the exact requested local wall-clock minute
- a 02:30 window on a Lord Howe DST day shifts forward by the thirty-minute gap and is reported as a gap, not a guess
- the existing America/New_York spring-gap and fall-fold assertions still pass unchanged
- a correction that neither converges nor matches a transition throws instead of returning

Decisions: B9, B8 · Order: The package.json coverage-script half is the same change as #41 — land once, in whichever entry goes first.

### #106 [low, S] Do not offer "Start a walk" before the rule's window opens

**Planner resolution:** `WalkingPort.start()` refuses with typed `notScheduled` (P2-T15); P2-T19 renders the copy.

`useTodayProgress` yields today's instance before the window starts, so `HomeScreen:90-108` renders the state rule's card with a live "Start a walk" button while `resolveLock` grants `unlockedWalking` only for a rule that is active now. The honest walk therefore unlocks nothing and burns lease time. Pass the window state into `progressContent` — `useTodayProgress` already returns the `instance`, so hand it through with `isActiveAt` — and for a state rule outside its window drop the action and set the detail to the window start time. The apps genuinely are open in `beforeWindow`, so the sheet's "Your apps are open while you walk" is not a lie; the missing sentence is simply when the rule starts to matter.

Copy:
```
Starts at 9:00 AM
```

Files: `app-next/src/features/home/progressContent.ts`, `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/content/home.ts`, `app-next/src/demo/__tests__/home-progress-content.test.ts`, `app-next/src/demo/scenarios/home-before-window.ts`

First failing tests:
- a state rule whose window opens at 9 AM shows "Starts at 9:00 AM" and no Start a walk button before 9
- the same rule shows Start a walk the moment its window is active
- an all-day state rule always shows the action

Decisions: B3, B7, B9 · Order: Related to finding 95 ("Get ahead" offered for state rules where getting ahead is impossible) — the same in-window test should silence both invitations.

### #114 [low, S] Look the gym met row up on the window's start day, not on today's date

**Planner resolution:** Consumer of #62's `progressDay`.

`GymUnlockScreen.tsx:20-24` reads the met row under `dayKey(now, tz)`, while both writers (`demo/gymProgress.ts:36` and `demo/fakes/GymFake.ts:73-75`) key rows to `currentInstances(rule, now, tz)[0]?.day ?? dayKey(now, tz)` — the day the window started on. After midnight in a 20:00–02:00 window the lookup misses, `alreadyCredited` is false, and the already-booked arrival replays the whole ceremony including confetti, defeating the `celebrate={false}` path the spec wrote for exactly this case. Resolve the day the same way the writers do, and extract that expression once as `progressDay(rule, now, tz)` in `domain/schedule.ts` so the screen, both writers, `progressSync:27` and `useTodayProgress` stop each inlining their own copy.

Files: `app-next/src/domain/schedule.ts`, `app-next/src/features/unlock/GymUnlockScreen.tsx`, `app-next/src/demo/gymProgress.ts`, `app-next/src/demo/fakes/GymFake.ts`, `app-next/src/features/home/progressSync.ts`, `app-next/src/state/selectors.ts`, `app-next/src/domain/__tests__/schedule.test.ts`, `app-next/src/features/unlock/__tests__/gym.test.tsx`

First failing tests:
- progressDay returns the window's start day at 00:30 inside a 20:00–02:00 instance and today's date otherwise
- opening the gym ceremony at 00:30 after a 23:30 check-in shows the lifted state with no ring and no confetti
- an uncredited overnight rule at 00:30 still shows the full arrival ceremony

Decisions: B2, B20 · Order: Shares the day-boundary helper with finding 62 (writers disagreeing about which day owns a row) — extract progressDay once in NEW:condition-lifecycle and let both entries consume it.

## P2-T16 — Walking duration mode (B28) (1 findings)

### #89 [low, M] Filter the walking mode list by place so Treadmill cannot mean a step goal (B28)

B28 overrides the audit's recommendation: the builder keeps place first and filters modes by place. `WalkingScreen` renders `walkingCopy.modes` unconditionally at W2, so Treadmill + "Reach a step goal" — the recommended mode — is the natural path and produces a rule a propped phone can never satisfy. Make the W2 list a function of `draft.place`: Treadmill offers only "Walk for N minutes" and "Unlock while walking"; Outside and Either offer step goal, walk-for-minutes and unlock-while-walking. When the user goes back and changes place to Treadmill with `walkingMode` already 'target'/steps, `reduceDraft` coerces the mode to the duration target so the draft can never hold a filtered-out combination, and `builderPath` routes to the duration goal step instead of W3.

Files: `app-next/src/content/rules.ts`, `app-next/src/features/rules/WalkingScreen.tsx`, `app-next/src/features/rules/draft.ts`, `app-next/src/features/conditions/builderFlow.ts`, `app-next/src/features/conditions/__tests__/builder.test.tsx`

First failing tests:
- choosing Treadmill at W1 offers exactly two modes at W2 and no step goal
- choosing Outside or Either at W1 offers all three modes
- going back and switching place to Treadmill with a step goal already chosen coerces the draft to walk-for-minutes and routes to the minutes step
- no saved rule can carry mode target/steps with place treadmill (validateRule guard)

Decisions: B28, B3 · Order: after NEW:walking-duration-mode types land — the "Walk for N minutes" rule shape, its goal range and its copy must exist before Treadmill's list can be reduced to two entries.

## P2-T17 — Runtime root and enforcement host (5 findings)

### #9 [high, M] Move enforcement and progress sync to the app root, above every route guard

**Planner resolution:** Owns the root composition (see P2-T17): one AppState 'active' handler lives in `EnforcementHost`; #29, #38, #46, #51 and #80 attach to it.

Extract the non-React `lockDecision(runtime)` out of `useLockDecision` and mount a new `src/runtime/EnforcementHost.tsx` inside `AppRuntimeProvider` in `app/_layout.tsx`, above every `Stack.Protected`. The host subscribes to the clock and the rules/ruleDays/entitlement stores, calls `applyLock` on every change, and owns `startProgressSync` (removed from `app/(tabs)/_layout.tsx`); an `AppState` 'active' handler re-reads permission statuses, re-runs the claim-on-open progress refresh and re-applies the lock. Home keeps `useLockDecision` for rendering only. Rewrite P2-T04 step 3 to name the root host, not `useLockDecision()`.

Files: `app-next/src/runtime/EnforcementHost.tsx (NEW)`, `app-next/src/runtime/__tests__/enforcement-host.test.tsx (NEW)`, `app-next/src/runtime/README.md`, `app-next/src/state/selectors.ts`, `app-next/app/_layout.tsx`, `app-next/app/(tabs)/_layout.tsx`, `app-next/src/features/home/progressSync.ts`, `plans/rebuild/04-architecture.md`, `plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md`

First failing tests:
- the lock is applied while the user is still inside the post-purchase setup sequence, before the tabs exist
- progress keeps accruing after the tab stack unmounts
- returning to the foreground re-reads permissions and re-applies the lock
- the host applies the lock exactly once per distinct decision

Decisions: B21, B8 · Order: Build first in this theme: findings 3, 40 and 66 all attach to this single call site (enforcement gate, clamped now, failure channel).

### #29 [high, M] Re-read Health and steps on foreground so finished runs and rides register

**Planner resolution:** Attaches to P2-T17's single foreground handler; no second AppState subscription inside `startProgressSync`.

`progressSync.refresh()` is the only caller of `HealthPort.workoutsToday`, it fires at mount and on store/day changes only, and `startProgressSync` is mounted once inside the tabs layout, so a warm foreground never re-reads Health and `StepsPort.stepsSince` has no production caller at all. Add an `AppState` 'active' subscription inside `startProgressSync` that calls `refresh()` and re-reads `runtime.steps.stepsSince(localDayStart)` (decision B8's from-midnight rule), and move the `startProgressSync` mount from `app/(tabs)/_layout.tsx` to `app/_layout.tsx` so it survives every guard and tab unmount. Add the Home line P2-T05:11-12 already prescribes so a goal reached while the app was closed reads as claimed-on-open rather than as a frozen bar, and use it as the running/biking card's detail while those cards have no action.

Copy:
```
Open ExcerLock after your workout to unlock
```

Files: `app-next/src/features/home/progressSync.ts`, `app-next/app/_layout.tsx`, `app-next/app/(tabs)/_layout.tsx`, `app-next/src/content/home.ts`, `app-next/src/features/home/progressContent.ts`, `app-next/src/features/home/__tests__/live-progress.test.ts`, `app-next/src/demo/scenarios/runner-claim-on-open.ts (NEW)`, `plans/rebuild/phase-2-backend/P2-T05-signals-behind-ports.md`

First failing tests:
- a run added to the Health fake while the app is backgrounded reaches the progress row after an AppState 'active' event
- progressSync re-reads steps through stepsSince on foreground, not only through the subscribe push
- the running card shows "Open ExcerLock after your workout to unlock" while it has no action and the goal is unmet
- progressSync keeps running after the Home tab unmounts (mounted at the app root)

Decisions: B8, B10, B11 · Order: Merge with finding 9's root-mounting of applyLock/startProgressSync — the same move above the guards serves both; amends P2-T05 §1 and §4 to say the foreground re-query lives in progressSync, not the adapter.

### #46 [medium, M] Add a root error boundary and stop toRule throwing at render

**Planner resolution:** Mounted by P2-T17's runtime composition; the non-throwing `tryRule` lands before P2-T20's builder work.

Export an `ErrorBoundary` from `app/_layout.tsx` (Expo Router picks it up) that renders a plain recovery screen — heading, one line, and a "Back to Home" button that resets navigation — with the strings in `src/content/common.ts`. Separately, split `toRule` into a throwing `toRuleOrThrow` (kept for `saveRule`) and a non-throwing `tryRule(draft, schedule): { rule } | { issues }`, and have `PlanSummary` call the latter: on issues it renders an inline row saying the plan needs a change with an Edit link to the offending step instead of throwing during render. `OnboardingRoute.tsx:43` (`PlanBuild`) gets the same treatment. A user with an unexpected draft state sees a recoverable screen and keeps their answers rather than a blank crash.

Copy:
```
Something went wrong
ExcerLock hit a problem drawing this screen. Your conditions and progress are safe.
Back to Home
Something in this plan needs a change
```

Files: `app-next/app/_layout.tsx`, `app-next/src/features/launch/AppErrorBoundary.tsx (NEW)`, `app-next/src/features/rules/draft.ts`, `app-next/src/features/rules/PlanSummary.tsx`, `app-next/src/features/onboarding/OnboardingRoute.tsx`, `app-next/src/content/common.ts`, `app-next/src/content/plan.ts`, `app-next/src/features/launch/__tests__/error-boundary.test.tsx (NEW)`, `app-next/src/features/rules/__tests__/plan.test.tsx (NEW)`

First failing tests:
- the root error boundary renders the recovery screen when a child throws during render
- the recovery screen Back to Home button resets navigation to the Home tab
- PlanSummary renders an inline needs-a-change row with an Edit link for an invalid draft instead of throwing
- saveRule still rejects an invalid rule through toRuleOrThrow

Decisions: B5 · Order: The non-throwing `tryRule` half unblocks NEW:builder-fixes (the builder's summary step calls the same function), so land it before the builder validation work. The boundary half is independent of everything. Phase 2 should wire Sentry into `componentDidCatch` — amends plans/rebuild/phase-2-backend/P2-T07-posthog-sentry.md.

### #66 [medium, M] Give applyLock a result and a fail-closed, idempotent contract

**Planner resolution:** Port signature (`ApplyResult`, fail-closed law, contract suite) is defined in P2-T14; this entry wires the call site and the `enforcementFailed` Home state.

Change the port to `applyLock(decision: LockDecision): Promise<{ applied: boolean; reason?: string }>` and write two laws into `src/ports/README.md`: fail closed — if registering the renewal monitor fails the adapter applies the shield before reporting the failure (ported from `app/src/screentime/native/NativeShieldScheduler.ts:196-199,232-242`) — and idempotent — a repeat call with an unchanged decision is a no-op, so the once-a-second caller is free. The root enforcement host awaits the result, records failures in the diagnostics log and pushes an `enforcementFailed` status so Home can say blocking is not actually on with a retry action. Update the port table at 04-architecture.md:65 and P2-T04's Design section to the new signature.

Copy:
```
homeCopy.enforcementFailed: 'Blocking is not on'
homeCopy.enforcementFailedBody: 'ExcerLock could not block your apps. Try again, or check Screen Time access.'
homeCopy.tryAgain: 'Try again'
```

Files: `app-next/src/ports/ScreenTimePort.ts`, `app-next/src/ports/README.md`, `app-next/src/demo/fakes/ScreenTimeFake.ts`, `app-next/src/runtime/EnforcementHost.tsx (NEW)`, `app-next/src/features/home/statusContent.ts`, `app-next/src/content/home.ts`, `app-next/src/features/home/__tests__/home-status.test.tsx (NEW)`, `plans/rebuild/04-architecture.md`, `plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md`

First failing tests:
- applyLock resolves { applied: false, reason } when the shield cannot be applied
- Home says 'Blocking is not on' with a Try again action after a failed apply
- a repeated applyLock with an unchanged decision does not re-apply
- a failed monitor registration still applies the shield before reporting the failure

Decisions: B21, B6 · Order: after NEW:enforcement-root's host lands (finding 9) — same call site; the new status state shares statusContent with findings 42 and 43.

### #80 [medium, S] Touch feedback preference actually silences haptics

Add `src/motion/bindHaptics.ts` — a one-responsibility binder that reads `settingsStore.data.haptics`, calls `setHapticsEnabled` immediately and on every store change, and returns the unsubscribe — and call it once from the runtime provider in `app/_layout.tsx` so a rehydrated `haptics:false` is applied at boot instead of leaving the module-level `enabled` at `haptics.ts:4` permanently true. In `PreferencesPanel.tsx:66-71`, write the store first and fire `feedback()` only when the new value is `true`, so the confirming tap does not buzz as the user turns feedback off.

Files: `app-next/src/motion/bindHaptics.ts (NEW)`, `app-next/src/features/settings/PreferencesPanel.tsx`, `app-next/app/_layout.tsx`, `app-next/src/motion/README.md`

First failing tests:
- turning touch feedback off suppresses the confirming tap and every later feedback() call
- turning touch feedback back on fires one confirming tap and re-enables feedback
- a rehydrated haptics:false setting disables feedback before the first screen renders

Decisions: B34, C5 · Order: Shares PreferencesPanel.tsx with finding 81; either order works, but both must land before the finding 115 rebuild folds Preferences into the single Settings screen.

## P2-T18 — Entitlement, identity and paywall (10 findings)

### #5 [blocker, L] Split the entitlement gate so a lapse never locks the user out of Settings, support, account deletion or the ceremonies

**Planner resolution:** Keep the `entitlementAccess` status→access/placement table and the router guard; drop the LockDecision rewrite (a lapse is never `noRulesToday`). `grace` is folded into `active` for v1 (see #50). Shields are cleared by P2-T14's `enforcementPlan`, applied by P2-T17.

Add a pure `src/domain/entitlementAccess.ts` returning `{ appAccess, paywall }` from an `Entitlement['status']`: `trial`/`active`/`grace` → `{appAccess:true, paywall:null|'banner'}`; `expired`/`billingIssue` → `{appAccess:true, paywall:'in_app'}`; `none`/`unknown` → `{appAccess:false, paywall:'onboarding'}`. `RootNavigator.tsx:34-41` guards `(tabs)`, `settings`, `sign-in`, `builder` and both `unlock/*` screens on `access.appAccess && onboarding.setupComplete` instead of `entitled`, and the `paywall` screen becomes `presentation: 'modal'`, `gestureEnabled` and closable when `paywall === 'in_app'` while staying a non-dismissible full screen for `'onboarding'` (B13's hard paywall survives untouched for first-run). `bootDestination` sends a lapsed user with `setupComplete` to `/(tabs)/home`, and a new root-level `PaywallGate` pushes `/paywall` once on the transition into `expired`/`billingIssue`. Per B21 the same transition unshields: add `applyEntitlementGate(decision, status)` next to `resolveLock`, which rewrites any `locked`/`unlockedWalking` decision to `{state:'noRulesToday'}` while the entitlement is lapsed, so the Phase 2 adapter clears shields and (its own amendment) unregisters every DeviceActivity monitor. PaywallSlot renders the existing `c.expired`/`c.billingIssue` banner plus a Close button when the placement is `in_app`.

Copy:
```
close: 'Close'
unshielded: 'Nothing is blocked while your subscription is inactive.'
(existing expired/billingIssue banners unchanged)
```

Files: `app-next/src/features/launch/RootNavigator.tsx`, `app-next/src/domain/entitlementAccess.ts (NEW)`, `app-next/src/domain/applyEntitlementGate.ts (NEW)`, `app-next/src/features/launch/PaywallGate.tsx (NEW)`, `app-next/src/onboarding/bootDestination.ts`, `app-next/src/features/subscription/PaywallSlot.tsx`, `app-next/src/features/subscription/PaywallStandIn.tsx`, `app-next/src/content/subscription.ts`, `app-next/app/_layout.tsx`, `app-next/src/domain/README.md`, `plans/rebuild/01-product-model.md`, `plans/rebuild/02-screen-inventory.md`, `plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md`, `plans/rebuild/phase-2-backend/P2-T06-adapty.md`

First failing tests:
- entitlementAccess('expired') keeps app access and asks for the in_app paywall, while entitlementAccess('none') withholds app access
- a mid-session lapse to billingIssue leaves Settings › Account and both unlock ceremonies reachable
- the in_app paywall can be closed back to Home; the onboarding paywall still refuses back navigation and shows no Close button
- applyEntitlementGate turns a locked decision into noRulesToday while the entitlement is expired, and leaves it alone while it is trial
- a lapsed user who was already set up boots to Home with the paywall over it, not to a bare paywall

Decisions: B21, B13, B2 · Order: First entry of NEW:subscription-lapse; findings 12 and 50 both build on src/domain/entitlementAccess.ts, so land this one first. The shield-clearing and DeviceActivity-monitor-unregistration half of B21 is a Phase 2 amendment to P2-T04 and P2-T06 and cannot be proven before P2-T04.

### #12 [high, S] A restore that finds nothing must never revoke a live entitlement

`SubscriptionFake.restore` (`SubscriptionFake.ts:19-28`) stops patching the entitlement store on the `notFound` path: it logs, returns the current entitlement untouched, and only writes when the restore produces a *better* entitlement. Encode that as a tiny pure rule beside the fake so the Phase 2 adapter inherits it — `mergeRestoredEntitlement(current, restored)` returns `current` unless `restored` is entitled, and never downgrades an entitled status. The `notFound` result reaches the UI as a return value plus `c.notFound` / `settingsCopy.noRestore`, which both call sites already render (`PaywallSlot.tsx:37`, `DetailedSettingsScreen.tsx:57`), so no screen logic changes. Record the same law as an acceptance line in P2-T06 so the Adapty adapter cannot regress it.

Files: `app-next/src/demo/fakes/SubscriptionFake.ts`, `app-next/src/domain/mergeRestoredEntitlement.ts (NEW)`, `app-next/src/features/subscription/__tests__/subscription.test.ts`, `app-next/src/features/settings/__tests__/screen.test.tsx`, `app-next/src/demo/README.md`, `plans/rebuild/phase-2-backend/P2-T06-adapty.md`

First failing tests:
- mergeRestoredEntitlement keeps an active entitlement when the restore returns none
- restoring from Settings while active leaves the user inside the app and shows 'No active purchase found'
- restoring with a real purchase on a none entitlement upgrades to active
- a restore that finds nothing does not write the entitlement store at all

Decisions: B21, B13 · Order: After finding 5 (the router split removes the 'ejected to the hard paywall' half of this bug even before the fake is fixed). The Settings half of the call site moves in finding 115's single-Settings rebuild; the fake fix is independent of it.

### #13 [high, S] Tappable Terms of Use and Privacy Policy on the purchase screen

**Planner resolution:** Stand-in fix here; P2-T06 acceptance row requires the Adapty paywall to carry Terms, Privacy, price and renewal, and the Phase 2 README tells Johan the dashboard paywall must too.

Extract the pair of legal links `WelcomeFooter.tsx:32-49` already renders into a `LegalLinks` component (lead text + two `accessibilityRole="button"` labels + the `LegalScreen` bottom sheet), and use it from both `WelcomeFooter` and `PaywallStandIn`, replacing the inert `c.terms` `Label` at `PaywallStandIn.tsx:65-69` with the sentence plus the two tappable documents. Guideline 3.1.2 also wants price and renewal period on the same screen: the plan rows already carry them once finding 86 removes the placeholder lifetime row. Because C6 makes the shipped paywall the Adapty Builder view, also record the requirement where it will actually be built — a row on the P screen in the screen inventory and an acceptance line in P2-T06 that the Builder paywall carries Terms, Privacy, price and renewal period.

Copy:
```
legalLead: 'By subscribing you agree to our '
and: ' and '
(reuses welcomeCopy.privacy 'Privacy Policy' and welcomeCopy.terms 'Terms of Use')
```

Files: `app-next/src/features/settings/LegalLinks.tsx (NEW)`, `app-next/src/features/onboarding/welcome/WelcomeFooter.tsx`, `app-next/src/features/subscription/PaywallStandIn.tsx`, `app-next/src/content/subscription.ts`, `app-next/src/features/settings/README.md`, `plans/rebuild/02-screen-inventory.md`, `plans/rebuild/phase-2-backend/P2-T06-adapty.md`

First failing tests:
- the paywall renders Terms of Use and Privacy Policy as buttons, not plain text
- tapping Privacy Policy on the paywall opens the privacy document sheet
- the welcome screen's legal links still open both documents after the extraction

Decisions: B13, C6 · Order: Shares content/subscription.ts with findings 82, 86 and 90; land 86 (plan list) first so the terms block sits under the final two rows.

### #48 [medium, M] Signing in from the welcome screen identifies the user, restores the entitlement and routes accordingly

`WelcomeFooter.tsx:23,55` stops passing a bare `setSheet(null)`. On a successful sign-in it runs a new `resumeAfterSignIn(runtime)` in `src/onboarding/`: bind the identity (finding 51), `await runtime.subscription.restore()`, and return `'entitled' | 'noSubscription' | 'error'`. On `entitled`, close the sheet and let `BootGate`/`bootDestination` do what it already does for a `trial`/`active` status — jump past onboarding to `/setup/<step>` or `/(tabs)/home`. On `noSubscription`, close the sheet and show the returning-user note under the CTA so the user knows the account carries no plan and onboarding continues. `SignInScreen.tsx:32` already reports success; it just needs to hand the resulting `Session` to `onContinue`. Add a `returning-subscriber` demo scenario (signed-in session, `active` entitlement, `restoreOutcome: 'restored'`) so the happy path is exercisable in the dev menu.

Copy:
```
welcomeBack: 'Welcome back — restoring your plan…'
noSubscription: 'That account has no active subscription. Choose a plan to continue.'
signInError: "We couldn't check that account. Try again."
```

Files: `app-next/src/features/onboarding/welcome/WelcomeFooter.tsx`, `app-next/src/features/setup/SignInScreen.tsx`, `app-next/src/onboarding/resumeAfterSignIn.ts (NEW)`, `app-next/src/onboarding/README.md`, `app-next/src/content/welcome.ts`, `app-next/src/demo/scenarios.ts`, `plans/rebuild/phase-2-backend/P2-T06-adapty.md`, `plans/rebuild/phase-2-backend/P2-T08-sync.md`

First failing tests:
- signing in from welcome with an active subscription leaves onboarding and lands on Home
- signing in from welcome with no purchase keeps the user in onboarding and says the account has no subscription
- resumeAfterSignIn identifies the subscription SDK before it calls restore
- a failed restore from welcome shows the retry note and does not change the session

Decisions: B18, B13, D3 · Order: After NEW:identity-spine finding 51 lands userId on Session and the identity bridge; resumeAfterSignIn calls into it.

### #50 [medium, M] Add a `grace` entitlement status that keeps access and asks for a new payment method

**Planner resolution:** Decision for v1: no `grace` status. Adapty's billing grace period maps to `active` (access kept); P2-T06 records it. Revisit if support tickets show payment-fix confusion.

Extend `Entitlement['status']` (`domain/types.ts:71-73`) and the `entitlementStore` validator with `'grace'`, and classify it in `entitlementAccess` (finding 5) as full app access with a persistent non-blocking banner — Apple's billing grace period keeps the subscription entitled, so `grace` must never route to the paywall or clear a shield. Settings › Subscription shows `settingsCopy.plan('grace')` with an `Update payment method` row that opens `https://apps.apple.com/account/subscriptions` in Phase 2 (Phase 1 shows the existing `c.external` preview note), and the dev menu's entitlement switcher gains the status so the state is reachable. Map Adapty's grace-period flag onto it in P2-T06 step 5 rather than folding grace into `active`, so the messaging can exist at all.

Copy:
```
graceBanner: "We couldn't renew your subscription. Update your payment method to keep going."
updatePayment: 'Update payment method'
settingsCopy.plan grace: 'Payment problem'
```

Files: `app-next/src/domain/types.ts`, `app-next/src/state/entitlementStore.ts`, `app-next/src/domain/entitlementAccess.ts (NEW)`, `app-next/src/content/subscription.ts`, `app-next/src/content/settings.ts`, `app-next/src/features/dev/DevControls.tsx`, `app-next/src/features/settings/SettingsScreen.tsx`, `plans/rebuild/01-product-model.md`, `plans/rebuild/phase-2-backend/P2-T06-adapty.md`

First failing tests:
- entitlementAccess('grace') grants app access and asks for no paywall
- a grace entitlement keeps a locked decision locked (applyEntitlementGate does not unshield)
- Settings shows the payment-problem plan line and an Update payment method row while in grace
- the dev menu can put the app into grace and Home stays reachable

Decisions: B21, B13 · Order: Shares src/domain/entitlementAccess.ts with finding 5; land 5 first. The Home-surface banner belongs to NEW:home-stacking; this entry ships the Settings row and the domain status only. Adapty's grace flag mapping is a P2-T06 amendment.

### #51 [medium, M] Give every session a user id and bind it to the subscription and analytics SDKs

`Session` becomes `{kind:'anonymous'; userId: string} | {kind:'signedIn'; userId: string; provider; email}` in `domain/types.ts:74-76`, with the `sessionStore` validator and `AuthFake` generating a stable anonymous id that survives rehydration (Phase 2: the Supabase anonymous uid, per P2-T01 step 3). Add a pure `src/domain/identity.ts` holding the ordering law — bind is `subscription.identify` then `analytics.identify`; teardown is `subscription.reset` then `analytics.reset` then the auth provider last (P2-T01:9) — and a thin `IdentityBridge` mounted in `app/_layout.tsx` that subscribes to `auth.subscribe` and applies it on every session change, including the anonymous one at first launch. That gives `identify`/`reset` their first production call sites and makes the Adapty `customer_user_id` = Supabase uid = PostHog `distinct_id` spine (D3) expressible from Phase 1.

Files: `app-next/src/domain/types.ts`, `app-next/src/domain/identity.ts (NEW)`, `app-next/src/runtime/IdentityBridge.tsx (NEW)`, `app-next/src/state/sessionStore.ts`, `app-next/src/state/validation.ts`, `app-next/src/demo/fakes/AuthFake.ts`, `app-next/app/_layout.tsx`, `app-next/src/runtime/README.md`, `plans/rebuild/01-product-model.md`, `plans/rebuild/phase-2-backend/P2-T01-supabase-auth.md`, `plans/rebuild/phase-2-backend/P2-T06-adapty.md`, `plans/rebuild/phase-2-backend/P2-T07-posthog-sentry.md`

First failing tests:
- a fresh install gets an anonymous user id that is unchanged after a store rehydration
- mounting the app calls subscription.identify then analytics.identify with the same anonymous id
- signing in re-identifies both SDKs with the signed-in user id
- signing out resets the subscription SDK before the analytics SDK before the auth provider
- deleting the account follows the same teardown order and ends on a new anonymous id

Decisions: B18, D1, D3, D4 · Order: First entry of NEW:identity-spine; finding 48 depends on it.

### #69 [medium, M] Name the offline case instead of collapsing it into the generic error

Add a `NetworkPort` with `isOnline(): Promise<boolean>` and a fake that the dev menu can flip, then, wherever a network action fails, prefer one shared offline string over the generic "Something went wrong. Please try again." The four surfaces are the paywall (purchase and restore in `PaywallSlot.run`), sign-in (`SignInScreen` for both the code send and the verify), and the support composer. The support composer additionally keeps the typed message and labels the send row "Not sent — tap to retry" rather than showing a bare error, matching the old app's rule that an interrupted send is restored as failed-with-reason and never as forever-sending. Phase 2 swaps the fake for `expo-network` behind the same port and adds the offline branch to the real Adapty/Supabase adapters.

Copy:
```
You are offline. Connect and try again — this will not retry on its own.
Not sent — tap to retry
```

Files: `app-next/src/ports/NetworkPort.ts (NEW)`, `app-next/src/demo/fakes/NetworkFake.ts (NEW)`, `app-next/src/runtime/AppRuntimeProvider.tsx`, `app-next/src/features/subscription/PaywallSlot.tsx`, `app-next/src/features/setup/SignInScreen.tsx`, `app-next/src/features/settings/SupportScreen.tsx`, `app-next/src/content/common.ts`, `app-next/src/content/settings.ts`, `app-next/src/features/subscription/__tests__/paywall.test.tsx`, `app-next/src/features/setup/__tests__/sign-in.test.tsx`

First failing tests:
- a failed purchase while offline shows the offline copy instead of the generic error
- a failed restore while offline shows the offline copy
- a failed email code send while offline shows the offline copy and keeps the typed address
- a failed support send keeps the message and labels the button Not sent — tap to retry

Decisions: B13, B18 · Order: The port, the fake and all four copy branches are ui-now; only the real reachability adapter is phase 2. Amends plans/rebuild/phase-2-backend/P2-T06-adapty.md, P2-T01-supabase-auth.md and P2-T10 step 5 to require the offline branch, and extends P2-T08-sync.md:14, which today covers offline only for the sync queue.

### #82 [medium, M] Derive the trial reminder line and the timeline from the live offer

Replace the hardcoded strings in `content/subscription.ts:12,19-23` with functions of a `TrialOffer`: `reminder(offer)` and `timeline(offer)` compute the reminder day as `trialDays - reminderDaysBefore` and the billing day as `trialDays`, collapsing to a 24-hour reminder (`Day <trialDays-1>`) when `reminderDaysBefore >= trialDays`. `TrialScreen.tsx:13` already holds `runtime.subscription.entitlement().offer`; pass it into `c.reminder(offer)` at T2/T3 and `c.timeline(offer)` at T4 so every screen states the same trial length. Phase 2 feeds the real Adapty offer (P2-T06), and P2-T09's scheduling math (`renewsAt − 2 days`, or `− 24 h` for short trials) then matches the copy by construction.

Copy:
```
reminder: (offer) => `${offer.reminderDaysBefore} day${offer.reminderDaysBefore === 1 ? '' : 's'} before your trial ends`
timeline: (offer) => [
  { title: 'Today', body: 'Start your free trial and make your plan.' },
  { title: `Day ${Math.max(1, offer.trialDays - offer.reminderDaysBefore)} · Reminder`, body: "We'll remind you if you've enabled notifications." },
  { title: `Day ${offer.trialDays} · Billing begins`, body: 'Your subscription starts unless you cancel before the trial ends.' }
]
```

Files: `app-next/src/content/subscription.ts`, `app-next/src/features/subscription/TrialScreen.tsx`, `app-next/src/features/subscription/__tests__/trial.test.tsx`, `app-next/src/content/README.md`, `plans/rebuild/phase-2-backend/P2-T06-adapty.md`, `plans/rebuild/phase-2-backend/P2-T09-notifications.md`

First failing tests:
- a 7-day trial with a 2-day reminder shows 'Day 5 · Reminder' and 'Day 7 · Billing begins'
- a 3-day trial with a 2-day reminder shows the reminder on Day 1 and billing on Day 3
- a 2-day trial collapses to a 24-hour reminder instead of a day-zero one
- the T2 reminder line names the same day the T4 timeline does

Decisions: B14, C6 · Order: Shares content/subscription.ts with findings 13, 86 and 90; independent of their edits (different keys).

### #86 [low, S] Remove the Lifetime plan from the paywall stand-in

**Planner resolution:** Moved to P2-T18 (paywall content) for file locality.

Per B35 there is no Lifetime plan in v1. Drop `{ id:'lifetime', … }` from `content/subscription.ts:29`, leaving Annual and Monthly, which is also what the PRD's monetization decision ships (annual anchor with the 7-day trial, monthly without one). `PaywallStandIn.tsx:26` already switches the CTA between 'Start free trial' for annual and 'Continue' otherwise, so with the lifetime row gone the CTA, the renewal sentence and the trial timeline all describe products that exist. Note in the screen inventory's P row that the stand-in offers exactly the two plans and that the Adapty Builder owns the real ones (E4).

Files: `app-next/src/content/subscription.ts`, `app-next/src/features/subscription/__tests__/paywall-router.test.tsx`, `plans/rebuild/02-screen-inventory.md`

First failing tests:
- the paywall offers exactly two plans, Annual and Monthly
- selecting Monthly shows the Continue CTA and no free-trial promise
- no screen mentions a lifetime purchase

Decisions: B35 · Order: Shares the content/subscription.ts plan list with finding 90; land 86 first so 90's plan-aware fake only has to cover the two surviving plans. Grouped with NEW:settings-one-screen because B35 is scoped there, though the file touched is the paywall content module.

### #90 [low, S] Pass the selected plan through the subscription port so the picker means something

Widen `SubscriptionPort.presentPaywall(placement)` to `presentPaywall(placement, planId?)`, have `PaywallSlot.tsx:33-35` pass its `selected` state, and make `SubscriptionFake.presentPaywall` plan-aware: `annual` grants `{status:'trial', renewsAt: now + offer.trialDays}` as today, `monthly` grants `{status:'active', renewsAt: now + 30 days}` with no trial, matching the PRD's 'trial on annual only'. That makes the purchase state testable without inventing a purchase mechanism, and it is the shape Phase 2 needs anyway when the Adapty Builder returns the purchased package. Record in the screen inventory's P row and in P2-T06 that the Builder owns plan selection in Phase 2 and the local picker exists only so the Phase 1 flow is exercisable.

Files: `app-next/src/ports/SubscriptionPort.ts`, `app-next/src/demo/fakes/SubscriptionFake.ts`, `app-next/src/features/subscription/PaywallSlot.tsx`, `app-next/src/features/subscription/__tests__/subscription.test.ts`, `app-next/src/features/subscription/README.md`, `plans/rebuild/02-screen-inventory.md`, `plans/rebuild/phase-2-backend/P2-T06-adapty.md`

First failing tests:
- choosing Annual grants a trial that ends on the offer's trial day
- choosing Monthly grants an active subscription with no trial period
- the CTA label matches the entitlement the current selection will grant
- presentPaywall records the chosen plan id in the dev event log

Decisions: C6, B35, B13 · Order: After finding 86 removes the lifetime row (same plan list). Shares content/subscription.ts with findings 13 and 82.

## P2-T19 — Home for stacked conditions (18 findings)

### #6 [high, M] Render the unlock pill and every rule's progress card together inside the Home lock

**Planner resolution:** First change of the Home slot contract (P2-T19): `BlockingScheduleCard` drops the `action` prop and renders `{children}`; pills are children rows.

`BlockingScheduleCard` renders `{action ?? children}` at line 77, so the moment an entry pill exists the whole `conditionCards` array is discarded, and `HomeScreen.tsx:242` only renders those cards when there is no schedule card at all. Change the card to render the two slots as siblings — the action row first, then the children — and keep `HomeScreen` passing `conditionCards` as children. Per `docs/specs/aha-unlock-screens.md:31-33` the pill legitimately replaces *the entry rule's own* footer status line, so HomeScreen filters that one rule out of `conditionCards` (its number already rides in the pill's `detail`) and every other rule scheduled today keeps its bar, count and action. The user then sees, on a locked day with a gym or treadmill rule plus a step rule, the pill and "1,240 / 5,000 steps" at the same time instead of a name-only list.

Files: `app-next/src/design-system/BlockingScheduleCard.tsx`, `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/features/home/README.md`, `app-next/src/design-system/__tests__/LockCard.test.tsx`, `app-next/src/features/home/__tests__/home-router.test.tsx`

First failing tests:
- BlockingScheduleCard renders an action row and its children together rather than one or the other
- Home in the multi-rule-overlap scenario shows a progress bar and count for the run rule and the step rule while the treadmill pill is visible
- the entry rule's number appears exactly once — in the pill's status line, not also as a duplicate progress row
- Home with two enabled rules and no entry pill still renders two progress cards (regression guard for the non-pill path)

Decisions: B5, B6, B20 · Order: Land before finding 14's one-row name+number list, which replaces the white name-only "Conditions" duplicate this fix leaves standing; both live in NEW:home-stacking.

### #14 [high, M] One condition list on Home, with name and number on the same row

Delete the duplicate white "Conditions" list (HomeScreen.tsx:188-224) and let the in-lock rows carry both halves. Add a pure `conditionState(rule, row, decision, now, tz)` in `domain/` returning `met | live | blockingNow | satisfiedToday | inProgress | paused | notScheduled`, and change `ProgressCard`'s `lock` appearance so it keeps the rule name beside the icon with the detail on the right and a tick when met, instead of dropping the title. Home then renders exactly one row per enabled rule scheduled today, inside the lock card. This only becomes visible once `BlockingScheduleCard` renders `{action}` *and* `{children}` instead of `{action ?? children}` (line 78), which today throws every progress row away whenever a gym or treadmill entry pill exists. Correct the false sentence in the Home README ("the separate duplicate condition list is hidden").

Copy:
```
Met today
Blocking now
Satisfied today
Not scheduled today
Paused
```

Files: `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/design-system/ProgressCard.tsx`, `app-next/src/design-system/BlockingScheduleCard.tsx`, `app-next/src/domain/conditionState.ts (NEW)`, `app-next/src/content/home.ts`, `app-next/src/features/home/README.md`, `app-next/src/domain/__tests__/conditionState.test.ts (NEW)`, `app-next/src/features/home/__tests__/home-router.test.tsx`

First failing tests:
- Home renders one row per condition scheduled today and each row carries both the rule name and its progress detail
- Home renders no second condition list while a lock card is showing
- a locked day that has a gym entry pill still renders every condition's progress row
- conditionState returns 'met' for the rule whose row met today and 'satisfiedToday' for the other enabled rules that day

Decisions: B5, B6, B2 · Order: Depends on finding 6's `{action}{children}` change to BlockingScheduleCard; `conditionState` is the shared module finding 92 consumes, so build it here.

### #19 [high, S] Show the missing permission on unlock-while-walking and gym-arrival cards

**Planner resolution:** One hoist closes #19 and #77; implement once, keep #77's gym-arrival case as a test.

`progressContent` computes the permission gate only after both early returns (`state` at :17-29, `event` at :31-39), so those two rule shapes can never render `motionNeeded` or `locationNeeded`. Hoist the `permission` / `needed` computation above the mode switch, keyed off `rule.activity` as it is today, and have all three branches return `needed` as `detail` when the permission is missing, with the action label replaced by a new `fix` action that `HomeScreen` routes to `/settings/permission/<name>`. Treat `restricted` the same as `denied`. `progressSync` keeps skipping ungranted rules, but the card now says why the bar is frozen instead of inviting a walk that can never verify.

Copy:
```
Fix
```

Files: `app-next/src/features/home/progressContent.ts`, `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/content/home.ts`, `app-next/src/demo/__tests__/home-progress-content.test.ts`

First failing tests:
- an unlock-while-walking card with Motion denied reads "Motion & Fitness access needed to update steps" and offers Fix instead of Start a walk
- a gym arrival card with Location denied reads "Location access needed to recognize your gym" instead of "Your next visit counts · Auto-detect off"
- a restricted Motion status is treated as denied on a state card
- granted permissions leave the walk and check-in actions exactly as they are today

Decisions: B11 · Order: One hoist in progressContent closes this and finding 77 — build them as a single change.

### #28 [high, M] Give a walking rule with place 'either' both a treadmill pill and a walk-with-my-phone pill (B27)

**Planner resolution:** Home entry pills come from `unlockEntries(rule)` (B27 table in P2-T19); the handheld pill opens `WalkingSheet`.

`unlockKind` (`entry.ts:4`) sends every state rule whose place is not 'outside' to the camera, so an 'either' rule can never verify handheld. Replace it with `unlockKinds(rule): ('gym' | 'treadmill' | 'walk')[]` — gym rules → `['gym']`, state place 'treadmill' → `['treadmill']`, place 'either' → `['treadmill', 'walk']`, place 'outside' → `['walk']` — and have `HomeScreen` render one `UnlockEntry` per kind inside the lock, with the 'walk' pill opening `WalkingSheet` (handheld `walking.start(rule)`) and the treadmill pill opening the ceremony. The `ProgressCard` action for state rules follows the same table, so "Start a walk" on an 'either' rule no longer pushes the camera. This is B27 exactly: one tap, no camera surprise outdoors.

Copy:
```
I'm walking with my phone
```

Files: `app-next/src/features/unlock/entry.ts`, `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/features/home/progressContent.ts`, `app-next/src/content/home.ts`, `app-next/src/features/home/__tests__/home-router.test.tsx`, `app-next/src/demo/scenarios/multi-rule-overlap.ts`

First failing tests:
- a place 'either' state rule renders two pills on the locked Home — "I'm using a treadmill" and "I'm walking with my phone"
- the handheld pill opens the walking sheet and starts a session with no placement, never /unlock/treadmill
- a place 'treadmill' state rule still renders only the treadmill pill
- a place 'outside' state rule renders only the walk pill and no camera route
- gym pills still stack above walking pills when both are active

Decisions: B27, B3, B28 · Order: Touches the same WalkingSheet surface as findings 78 and 103 — sequence them 28 → 78 → 103 in one NEW:home-stacking pass.

### #33 [medium, S] Give "blocking is off" its own headline and glyph on Home

**Planner resolution:** Retag: B21/B6, not B36. `permissionNeeded` and `noAppsSelected` get a distinct closed-lock treatment and headline; P2-T19's Home table must not mark them unchanged.

Give the `permissionNeeded` and `noAppsSelected` branches of `statusContent` their own `title`, `icon: 'shield'` and `unlocked: false` instead of spreading the base model's open padlock and `homeCopy.open`. Move the current one-liners into the subtitle, and add `blockingOff`, `permissionBody` and `noAppsBody` keys to `src/content/home.ts` rather than reusing `open`. The inline fix action stays exactly as the inventory specifies ("Allow Screen Time" / "Choose apps"). A user who denied or revoked Screen Time now sees a closed shield and "Blocking is off" instead of the same benign "No blocking right now" a genuine rest day shows.

Copy:
```
Blocking is off
Screen Time access is off, so ExcerLock cannot block anything.
No apps are chosen, so there is nothing to block.
```

Files: `app-next/src/features/home/statusContent.ts`, `app-next/src/content/home.ts`, `app-next/src/features/home/__tests__/home-router.test.tsx`

First failing tests:
- statusContent titles the permissionNeeded state Blocking is off with a shield glyph and unlocked false
- statusContent titles the noAppsSelected state Blocking is off and keeps the Choose apps action
- statusContent still titles a genuine rest day No blocking right now with the open padlock

Decisions: B36 · Order: Independent. Touches the same statusContent branch table as fix 7 (finding 67) and fix 11 (finding 98); sequence them within NEW:home-stacking to avoid three edits to one if-chain.

### #34 [medium, S] Show 'Apps are blocked' and the live unlock hint on the locked Home

**Planner resolution:** The blocked headline and `nextUnlockHint` render in every `locked` row of the Home table, single rule included.

`statusContent` already computes 'Apps are blocked' / 'Until you walk 1,800 steps' for the locked state; Home throws it away because the only render site (`HomeScreen.tsx:225-229`) is gated on `status.unlocked`. Pass `status.title` and `status.subtitle` into `BlockingScheduleCard` as new `statusTitle`/`statusSubtitle` props rendered above the rule sentence, and delete the gated secondary Label so the same line appears in every schedule-card state. The card then reads 'Apps are blocked · Until you walk 1,800 steps' over the static rule description instead of only the rule description.

Files: `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/design-system/BlockingScheduleCard.tsx`, `app-next/src/features/home/__tests__/home-status.test.tsx (NEW)`, `plans/rebuild/02-screen-inventory.md`

First failing tests:
- the locked Home shows 'Apps are blocked' and 'Until you walk 1,800 steps'
- the unlockedMet Home still shows 'Unlocked for the rest of today' with the resume line
- the unlockedWalking Home still shows the lease countdown

Decisions: B6, B2 · Order: Touches the same BlockingScheduleCard slots as NEW:home-stacking's multi-rule progress work — do them in one pass so the card's children/action/status slots are designed once.

### #36 [medium, M] The met day draws an open lock and names the condition that opened it

On `unlockedMet` and `unlockedWalking` Home renders `BlockingScheduleCard`, which always draws a closed padlock (`lock` icon at BlockingScheduleCard.tsx:61 plus the closed `LockShackle` at :35), so the specified open lock and the v1 unlock moment — wired only to the `StatusCard` hero at HomeScreen.tsx:182 — never appear on the state that earns them. Give `BlockingScheduleCard` an `open` prop: `LockShackle` draws the lifted shackle and the header glyph becomes `lock-open`; Home passes it for both unlocked states, and `useUnlockMoment` moves onto that glyph so the crossfade, pop spring and one success haptic fire on the card Home actually shows. Under the timeline print "Unlocked by <name>" from `decision.byRuleName`, and let the met condition's row carry the tick from finding 14's `conditionState`.

Copy:
```
Unlocked by ${name}
```

Files: `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/design-system/BlockingScheduleCard.tsx`, `app-next/src/design-system/LockShackle.tsx`, `app-next/src/features/home/useUnlockMoment.ts`, `app-next/src/content/home.ts`, `app-next/src/features/home/__tests__/home-router.test.tsx`, `app-next/src/design-system/__tests__/StatusCard.test.tsx`

First failing tests:
- Home draws the open lock on an unlockedMet day and the closed lock on a locked day
- Home names the condition that unlocked the day
- the unlock moment fires once when the decision transitions into unlockedMet while a lock card is showing, and not on re-render

Decisions: B19, B2, B23 · Order: Needs `byRuleName` from finding 16; shares the met-row tick with finding 14.

### #42 [medium, M] Say why a goal met while the app was closed has not unlocked yet

**Planner resolution:** Owner of the `claimPending` flag: `progressSync` exposes `lastClaimAt` (null until the first successful refresh of this launch) through a selector; Home shows the claim-pending line while `locked` and `lastClaimAt === null`, and 'Unlocked — we caught up while the app was closed' when a refresh flips a row to met. One string, shared with #29.

Add the claim-on-open copy prescribed by P2-T05 to `src/content/home.ts` and a `claimPending` state in `statusContent` shown while the decision is `locked` and this launch has not yet completed its first progress claim, so the user reads 'Open ExcerLock after your walk to unlock' instead of a bare shield hint. Add the state to the screen inventory's §H Home state list so it gets built and tested rather than being an unlisted Phase 2 string. On the shield side, the staleness-safe subtitle (finding 65) carries the same instruction, because Apple's template cannot compute it: a step-goal shield reads 'Walk 5,000 steps, then open ExcerLock.'

Copy:
```
homeCopy.claimPending: 'Open ExcerLock after your walk to unlock'
sessionCopy.shieldClaim: (goal: string, unit: string) => `Walk ${goal} ${unit}, then open ExcerLock.`
```

Files: `app-next/src/content/home.ts`, `app-next/src/features/home/statusContent.ts`, `app-next/src/features/home/__tests__/home-status.test.tsx (NEW)`, `app-next/src/content/sessions.ts`, `app-next/src/domain/shieldContent.ts`, `plans/rebuild/02-screen-inventory.md`, `plans/rebuild/phase-2-backend/P2-T05-signals-behind-ports.md`

First failing tests:
- Home says 'Open ExcerLock after your walk to unlock' while the first claim of the launch is still pending
- the claim-on-open line disappears once the claim credits the day and the decision turns unlockedMet
- the step-goal shield subtitle tells the user to open ExcerLock rather than naming a live remainder

Decisions: B11, B8 · Order: The shield half is the same string table as findings 44/45/65 (NEW:shield-copy) — write it once there and consume it here; the detection that flips claimPending is P2-T05.

### #60 [medium, S] Show 'N apps · M categories' on the Home, Conditions and Settings lock rows

Add one shared `lockedAppsSummary(apps)` helper (in `src/content/pickers.ts`, next to `pickerCopy.counts`) that returns the count line, or the warning line when nothing is selected, and pass its result as the subtitle/value of all three rows: Home's 'Lock list' `SettingsRow`, the Conditions screen's hardcoded 'Lock list' row (which already destructures `lockedApps` and never uses it), and Settings' 'Locked apps' row. When the total is zero the row reads 'No apps chosen yet' in the warning tone, so a silently emptied selection is visible from anywhere instead of only on setup step X2.

Copy:
```
pickerCopy.none: 'No apps chosen yet'
```

Files: `app-next/src/content/pickers.ts`, `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/features/conditions/ConditionsScreen.tsx`, `app-next/src/features/settings/DetailedSettingsScreen.tsx`, `app-next/src/features/conditions/__tests__/locked-apps-count.test.tsx (NEW)`, `plans/rebuild/02-screen-inventory.md`

First failing tests:
- Home's lock list row shows '4 apps · 2 categories'
- the Conditions lock list row shows the same count as Home
- the Settings locked apps row shows the same count as Home
- all three rows read 'No apps chosen yet' when nothing is selected

Decisions: B6 · Order: after finding 43 (a null handle counts as no selection) so the zero-state copy is reachable; NEW:settings-one-screen must keep this row when it rebuilds Settings.

### #67 [medium, M] Say which condition satisfied the day, on Home and on Conditions

**Planner resolution:** `satisfiedToday` is a value of `domain/conditionState.ts`, not a separate prop.

When the decision is `unlockedMet`, attribute it everywhere the other conditions appear. In `progressContent`, take the decision's `byRuleId` and, for every scheduled rule that is not the one that met, return a "Met by <condition> today" detail line and suppress the now-pointless action button. On the Conditions screen, read `useLockDecision()` and pass a `satisfied` flag to `RuleCard`, which renders a "Satisfied today" badge next to the schedule line. B6 stops looking like a bug: the user with "Walk 5,000 steps, Mon-Fri 9-12" and "Run 20 minutes, daily 18-22" who hit the step goal at 10:00 can see at 18:00 why the evening condition never locked.

Copy:
```
Met by {condition} today
Satisfied today
```

Files: `app-next/src/features/home/progressContent.ts`, `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/features/conditions/ConditionsScreen.tsx`, `app-next/src/design-system/RuleCard.tsx`, `app-next/src/content/home.ts`, `app-next/src/content/conditions.ts`, `app-next/src/features/home/__tests__/live-progress.test.ts`, `app-next/src/features/conditions/__tests__/builder.test.tsx`

First failing tests:
- progressContent labels a non-met scheduled condition Met by <condition> today while unlockedMet is active
- progressContent hides the Check in and Start a walk actions for conditions satisfied by another condition
- RuleCard shows the Satisfied today badge when the day is already met by any condition
- RuleCard shows no badge when the decision is locked

Decisions: B2, B6, B23 · Order: Depends on fix 1 (finding 15) — the attribution is only correct once `unlockedMet` stops firing on days no condition is scheduled. Shares the statusContent/progressContent pass with fix 4 (finding 33) and fix 11 (finding 98).

### #74 [medium, S] Delete Home's inert History row and the duplicate Analytics row

The inventory's Home content is StatusCard, ProgressCards, the locked-apps row, the streak chip and "Add condition" (02-screen-inventory.md:118-129). Delete the `SettingsRow title={c.history}` at HomeScreen.tsx:275 — it has no `onPress`, so SettingsRow renders neither chevron nor PressableScale and it is a navigation-shaped pill that does nothing — together with `homeCopy.history`, and delete the Analytics shortcut row above it, which duplicates a tab that is one tap away in the tab bar. The remaining lock-list row keeps its card wrapper; the surrounding `View` with the three card wrappers collapses to the lock-list row plus the conditional "Add condition" button.

Files: `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/content/home.ts`, `app-next/src/features/home/__tests__/home-router.test.tsx`

First failing tests:
- Home renders no row titled "History"
- Home renders no row titled "Analytics" (the tab remains the only route to it)
- the lock-list row still opens the app picker

Decisions: none · Order: land with #4 — both delete adjacent JSX in the same block of HomeScreen; do them in one edit to avoid a conflict

### #77 [medium, S] A gym-arrival card must say when Location is off

Same defect and same fix as finding 19: the `event` branch of `progressContent` (:31-39) returns before the permission computation at :41-48, so `homeCopy.locationNeeded` can only ever reach gym *minutes* rules. With the permission block hoisted above the mode switch, an arrival card with `permissions.location` of `notDetermined` or `denied` renders "Location access needed to recognize your gym" as its detail and offers the Fix action instead of a Check in button that cannot work, matching what walking-steps, running and gym-minutes cards already do. Note that `autoOff` is the settings toggle, not the permission, so both facts stay distinct.

Files: `app-next/src/features/home/progressContent.ts`, `app-next/src/content/home.ts`, `app-next/src/demo/__tests__/home-progress-content.test.ts`

First failing tests:
- a gym arrival card with Location denied reads the location-needed line rather than "Your next visit counts · Auto-detect off"
- a gym arrival card with Location whenInUse and auto-detect off still reads "Your next visit counts · Auto-detect off"

Decisions: B11, B24 · Order: Identical change to finding 19 — one hoist in progressContent closes both; keep both entries but implement once.

### #78 [medium, S] Add the outdoor walking-state scenario and delete WalkingSheet's unreachable treadmill block

**Planner resolution:** Owns the WalkingSheet cleanup; #113 folded in. The `treadmillFraming()` call site is deleted; the port method stays documented as the Phase 2 handoff input (P2-T05).

No scenario creates a `state` rule with `place: 'outside'`, so the sheet that serves the recommended outdoor flow is never seen in review, and the sheet's treadmill branch (`treadmill = mode.place === 'treadmill'` at :25, the `frame.ready` disable at :57, the framing block at :109-127) is dead because those rules route to `/unlock/treadmill` before reaching it. Add a `walking-state-outdoor` scenario and delete the treadmill flag, the disabled-start gate and the framing block together with the copy keys they own (`framing`, `propped`, `handheld`, `frameReady`, `frameWaiting`); keep `sessionCopy.framingBody`, which `WalkingFake.treadmillFraming()` still returns. After finding 28 the sheet also serves the handheld half of an 'either' rule, and it must not show a propping prompt there either.

Files: `app-next/src/features/sessions/WalkingSheet.tsx`, `app-next/src/content/sessions.ts`, `app-next/src/demo/scenarios/walking-state-outdoor.ts (NEW)`, `app-next/src/demo/scenarios/index.ts`, `app-next/src/demo/__tests__/scenarios.test.ts`, `app-next/src/demo/__tests__/reachability.test.tsx`

First failing tests:
- the walking-state-outdoor scenario reaches the walking sheet from Home and starts a session
- the walking sheet renders no framing block and no propping copy for any place
- Start walking is enabled for an outdoor state rule regardless of the framing signal
- every sessionCopy key still has a call site (dead-copy guard)

Decisions: B3, B27 · Order: After finding 28's routing change, so the sheet's real audience (outside plus either-handheld) is settled before the treadmill branch is removed; `WalkingPort.treadmillFraming()` then has no Phase 1 caller and is kept only for finding 88 / P2-T05 pickup detection.

### #85 [low, M] The lock card draws every window today, not just one

`blockingSchedule` takes exactly one rule and renders its window as the whole day's picture, so a user with 'Mon-Fri 9-12' and 'daily 18-22' never sees the evening block previewed. Add a pure `daySegments(rules, day, tz)` that merges every enabled rule's instances for the day into ordered, non-overlapping segments; `blockingSchedule` takes those plus the hint rule, the summary line reads "9 AM-12 PM and 6 PM-10 PM", and `BlockingTimeline` draws each segment with the one containing `now` highlighted. Add a two-disjoint-window scenario so the case is exercised at all — no scenario has more than one window today.

Copy:
```
${a} and ${b}
```

Files: `app-next/src/domain/daySegments.ts (NEW)`, `app-next/src/features/home/blockingSchedule.ts`, `app-next/src/design-system/BlockingTimeline.tsx`, `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/content/blockingSchedule.ts`, `app-next/src/demo/scenarios/two-windows.ts (NEW)`, `app-next/src/demo/scenarios/index.ts`, `app-next/src/domain/__tests__/daySegments.test.ts (NEW)`, `app-next/src/features/home/__tests__/blockingSchedule.test.ts`

First failing tests:
- two disjoint windows today produce two timeline segments and one summary line naming both
- two overlapping windows merge into a single segment
- an all-day rule swallows every other segment
- a window that crosses midnight draws to the end of the timeline and is labelled next day

Decisions: B5, B6, B9 · Order: After finding 14's card restructure. Keep `daySegments` in `domain/` — the union of today's windows is also what the Phase 2 DeviceActivity registration needs to avoid unshielding at the earlier window's interval end (audit section 1, findings 17 and 18).

### #92 [low, S] Every condition row shows its state today

**Planner resolution:** Consumes `domain/conditionState.ts`; `pausedNoGym` is a state value.

`ConditionsScreen` renders name, schedule and a switch and nothing else, so the screen a user opens to manage a stack answers none of 'which is done', 'which is blocking me', 'which one unlocked my apps'. Feed `RuleCard` a state chip from finding 14's `conditionState`: Met today · Blocking now · In progress 3,120 of 5,000 · Satisfied today · Not scheduled today · Paused, plus B25's 'Paused - no saved gym' variant and finding 37's 'Unlocked your apps today'. `ConditionsScreen` passes the lock decision, today's rows and the clock, all of which already exist as selectors. Add the row to `02-screen-inventory.md:136`, which today specifies name + schedule + switch only.

Copy:
```
Met today
Blocking now
In progress
Satisfied today
Not scheduled today
Paused
```

Files: `app-next/src/features/conditions/ConditionsScreen.tsx`, `app-next/src/design-system/RuleCard.tsx`, `app-next/src/domain/conditionState.ts (NEW)`, `app-next/src/content/conditions.ts`, `app-next/src/demo/__tests__/conditions-tabs.test.tsx`, `plans/rebuild/02-screen-inventory.md`

First failing tests:
- a met condition's row reads Met today
- the condition that is blocking right now reads Blocking now
- an unmet condition on a day another condition already unlocked reads Satisfied today
- a condition not scheduled today says so rather than looking active
- a paused condition reads Paused, and the gym-orphaned one reads its reason

Decisions: B5, B6, B2, B25 · Order: Consumes the `conditionState` module built in finding 14; the paused-reason variant comes from finding 56.

### #103 [low, S] Surface the error when starting a walk fails

`WalkingSheet.start()` awaits `runtime.walking.start(rule)` in a `try/finally` with no `catch`, so a rejection — the condition paused or deleted in another tab, or a non-state rule — stops the spinner and does nothing else, as an unhandled promise. Add a `catch` that stores an error string and render it as a `Label accessibilityRole="alert"` in the sheet body, the way `TreadmillUnlockScreen:139` already does, clearing it on the next attempt. The reachable window is narrow today (`HomeSheets:13` only mounts the sheet for an enabled rule) but widens once finding 28 routes 'either' rules here, and a silent no-op is never acceptable on a primary action.

Copy:
```
Couldn't start the walk. Check that this condition is on and scheduled now.
```

Files: `app-next/src/features/sessions/WalkingSheet.tsx`, `app-next/src/content/sessions.ts`, `app-next/src/features/sessions/__tests__/walking-sheet.test.tsx (NEW)`

First failing tests:
- a rejected walking.start renders the alert instead of silently returning the sheet to its ready state
- the alert clears when the user taps Start again and the second attempt succeeds

Decisions: B3, B9 · Order: After finding 28 and 78, which are the other two changes to WalkingSheet in this batch.

### #109 [low, S] Add condition is always on Home

Drop the `!scheduleCard` gate on the Add condition button (HomeScreen.tsx:277) so it renders in every state, including the locked and met days when a user is most likely to want a second way to unlock. Once finding 14 deletes the duplicate white list, the tertiary 'Edit / Add' link inside it goes with it, making this button Home's only add affordance — the screen inventory requires it unconditionally (02-screen-inventory.md:128). Keep it below the lock card in the secondary action group.

Files: `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/features/home/__tests__/home-router.test.tsx`

First failing tests:
- Home shows Add condition on a locked day
- Home shows Add condition on a met carry-over day where no condition is scheduled
- tapping it opens the builder from a locked day

Decisions: B5 · Order: Must land with finding 14, which removes the 'Edit / Add' link that is today's only alternative route.

### #113 [low, S] Remove WalkingSheet's unreachable treadmill camera placeholder

**Planner resolution:** Folded into #78.

`unlockKind` routes every non-outdoor state rule to /unlock/treadmill and HomeScreen only opens the walk sheet when `unlockKind` is null, so WalkingSheet.tsx:109-127's mint-bordered "the camera preview appears here when connected" block can never render — and after B27 the sheet's job is explicitly the handheld/outdoor walk, so it will not come back. Delete that block, the `treadmill` flag at :25, the `runtime.walking.treadmillFraming()` call at :24 and the `disabled={treadmill && !frame.ready}` gate at :57, so Start is enabled whenever a walk can begin. Then delete the framing copy that loses its last reader — `sessionCopy.framing`, `propped`, `handheld`, `frameReady`, `frameWaiting`; keep `framingBody`, which WalkingFake still returns as the ceremony's framing message. The treadmill ceremony's own framing copy lives in src/content/unlock.ts and is untouched.

Files: `app-next/src/features/sessions/WalkingSheet.tsx`, `app-next/src/content/sessions.ts`, `app-next/src/features/sessions/__tests__/walking-sheet.test.tsx`

First failing tests:
- WalkingSheet renders no camera-preview placeholder for any rule it can be opened with
- Start is enabled for an outdoor state rule regardless of the fake's reported placement
- every remaining framing key in sessionCopy has a reader

Decisions: B20, B27 · Order: after B27's two Home pills land (NEW:walking-duration-mode / finding 28), since that change is what finally fixes which rules reach WalkingSheet; deleting the block earlier is still safe because the branch is dead today

## P2-T20 — Conditions builder and lifecycle (11 findings)

### #23 [high, M] Take the gym step out of the builder so every step has Back, Cancel and a footer

**Planner resolution:** GPlace is deleted (B24). Gym rules bind to any saved gym; with zero gyms the summary shows an 'Add a gym' row that pushes `/gym-picker`, and a rule saved with no gym is stored paused with `pausedReason: 'noGym'` (B25). #54's gym edit path is G1 → G2; #55's Gyms row routes to `/settings/gyms`; #57 collapses into #25.

The inventory's builder path is O20 → branch → S1 → S3 (02-screen-inventory.md:142-144) and the gym branch defers gym choice ("You'll pick your gym after setup", :65). Honour it: drop `'GPlace'` from `builderPath`, delete the `if (f.step === 'GPlace') return <BuilderGymStep/>` early return in ConditionBuilder.tsx:30 and the `'GPlace'` special case in the `branch` test at :23, and delete BuilderGymStep.tsx. Because gym conditions bind to any saved gym (B24), the binding belongs on the summary, not on a step: add a "Gyms" row to PlanSummary for gym rules showing the saved-gym count ("2 saved gyms" / "No gym saved yet") whose Edit pushes the existing `/gym-picker` route (which already owns its own header and back) when none is saved, and `/settings/gyms` when one is. Move `useBuilder`'s dead `step === 'GPlace' ? gymCount > 0` validity onto S3 for gym activities so Save is blocked with an inline "Save a gym first" instead of trapping the user earlier. Every builder step then renders inside the ScreenShell that owns the back arrow, the discard-confirm Cancel and the Continue/Save footer.

Copy:
```
No gym saved yet · Save a gym first · Gyms
```

Files: `app-next/src/features/conditions/builderFlow.ts`, `app-next/src/features/conditions/ConditionBuilder.tsx`, `app-next/src/features/conditions/useBuilder.ts`, `app-next/src/features/rules/PlanSummary.tsx`, `app-next/src/content/plan.ts`, `app-next/src/features/gym-picker/BuilderGymStep.tsx`, `app-next/src/features/conditions/__tests__/builder.test.tsx`, `plans/rebuild/02-screen-inventory.md`

First failing tests:
- builderPath for a gym rule with gymMode 'time' is ['O20','G1','G2','S1','S3'] and contains no 'GPlace'
- every step the builder can reach renders a back control and a footer button
- the summary's Save is disabled with "Save a gym first" when no gym is saved, and enabled once one exists
- the summary's gym row opens the gym picker route rather than replacing the builder body

Decisions: B24, B25 · Order: one change closes this and #25 — land the builderPath/BuilderGymStep deletion first, then #25's picker-entry guard; must land after (or with) NEW:condition-lifecycle's B24 gym-binding decision in the product model, since the summary row states the binding

### #25 [high, S] Every "add a gym" entry adds a gym instead of editing the last one

**Planner resolution:** Lands with #23; adds the invariant that a `placeId` handed to the picker comes only from a saved-gym row.

Deleting BuilderGymStep (see #23) removes the `placeId={gyms[gyms.length - 1]?.id}` that silently put the picker into edit mode on the most recently saved gym. Make the invariant explicit so it cannot come back: the gym picker is opened with a `placeId` only from a saved-gym row in Settings › Saved gyms (edit that gym); every other entry — the builder summary's gym row, Settings' "Add gym", setup X3 — opens `/gym-picker` with no `placeId` (add a new gym). In GymPickerScreen, treat a `placeId` that does not resolve to a saved place as absent rather than falling through to defaults, and keep `usePicker`'s five-gym `limit` as the only cap. A user with "Gold's Gym" saved who adds a gym condition now ends up with two gyms, not a renamed one.

Files: `app-next/src/features/gym-picker/BuilderGymStep.tsx`, `app-next/src/features/gym-picker/GymPickerScreen.tsx`, `app-next/src/features/settings/GymsScreen.tsx`, `app-next/app/gym-picker.tsx`, `app-next/src/features/sheets/__tests__/gym.test.ts`

First failing tests:
- opening the picker with no placeId and saving leaves the existing gym untouched and adds a second row
- opening the picker with a placeId that matches no saved place seeds the blank add form, not the last gym
- at five saved gyms the add path is refused with the limit message instead of overwriting a gym

Decisions: B24 · Order: shares its root change with #23 (BuilderGymStep deletion); land immediately after it

### #53 [medium, M] A mode change in edit mode always shows its goal screen

Edit opens at S3, the Activity row's only target is `goalStep(draft)` (plan.ts:33-37), and `next()` with a backup jumps straight back to S3 (useBuilder.ts:80-82) — so switching mode saves the untouched `createDraft` defaults (5,000 steps, 30 gym minutes) and skips GPlace. With finding 54's `editPath` in place, an edit that lands on a mode chooser continues along the branch — W2 → W3, G1 → GPlace → G2, R1/B1 → the matching goal — before returning to S3, so a goal is always chosen, never inherited. When the mode is left unchanged the draft is not re-created, so the saved goal survives.

Files: `app-next/src/features/conditions/useBuilder.ts`, `app-next/src/features/conditions/builderFlow.ts`, `app-next/src/features/rules/RuleScreen.tsx`, `app-next/src/features/conditions/__tests__/builder.test.tsx`

First failing tests:
- changing 'unlock while walking' to a step goal shows the step goal screen before the summary
- changing 'arrive at the gym' to 'spend time at the gym' shows the gym place step and then the minutes goal
- re-opening the mode chooser and keeping the same mode returns to the summary with the saved goal untouched
- cancelling out of an edit sub-flow restores the goal the rule had before

Decisions: B28, B4 · Order: Shares `editPath` with finding 54 — build finding 54 first. Also after NEW:walking-duration-mode lands, because B28's place-filtered mode list is what this flow walks.

### #54 [medium, L] Edit becomes a summary with sub-flows, so activity and every mode are editable

**Planner resolution:** Builds `editPath`; gym path is G1 → G2 (no GPlace). `choose()` must preserve `id`, `createdAt` and `enabled`.

Replace the linear replay of creation. `PlanSummary` rows become Activity (→ O20), Goal (→ the mode chooser: W2 for walking, G1 for gym, R1/B1 for run/bike, instead of today's fixed `goalStep`), Place for walking (→ W1) and Days & times (→ S1). Add a pure `editPath(entry, draft)` to `builderFlow.ts` returning the remaining branch steps from the edited step up to but excluding S1; `useBuilder.next()` walks that segment before returning to S3, so every reachable mode change is reachable in edit too — a step goal can become 'unlock while walking', gym minutes can become arrival, distance can become minutes. `choose()` in edit mode must keep the draft's `id`, `createdAt` and `enabled`: `createDraft` mints a fresh uuid today, which would silently create a second rule and orphan the first the moment O20 becomes reachable from edit.

Copy:
```
Goal
Edit activity
Edit goal
```

Files: `app-next/src/features/rules/PlanSummary.tsx`, `app-next/src/features/rules/plan.ts`, `app-next/src/features/conditions/builderFlow.ts`, `app-next/src/features/conditions/useBuilder.ts`, `app-next/src/content/plan.ts`, `app-next/src/features/conditions/__tests__/builder.test.tsx`, `app-next/src/features/conditions/README.md`, `plans/rebuild/02-screen-inventory.md`

First failing tests:
- editing a step-goal walking condition reaches the 'unlock while walking' chooser and returns to the summary
- editing a gym-minutes condition can turn it into an arrival condition
- editing a distance condition can turn it into a minutes condition
- changing the activity of an existing condition keeps its id and updates the same rule rather than creating a second one
- editing days and times still returns straight to the summary without walking the branch

Decisions: B4, B5, B28 · Order: Build `editPath` here; finding 53 depends on it. Removing delete-and-recreate as the only route also removes the progress loss that finding 37's delete path would otherwise cause.

### #55 [medium, M] State that a gym condition matches any saved gym, and reach the gym list from the condition

**Planner resolution:** Keeps the product-model and inventory corrections (any saved gym); its Gyms row routes to `/settings/gyms`; the PlanSummary row is shared with #23 (one row, one copy string).

B24 settles it: no `placeId` on `RuleMode` — a gym condition matches any of the saved gyms, which is exactly what `gymProgress.ts:32-45` and `useGymUnlock.ts:21-25` already do. Write that into `01-product-model.md` §3 and §5 so the behaviour is specified rather than emergent, and correct `02-screen-inventory.md:180`, whose SH-gym entry point ("gym rule progress card") does not exist because Home now routes that card to `/unlock/gym`. Give the plan summary a Gyms row for gym conditions reading "Any of your N saved gyms", whose Edit opens the saved-gym list — the GPlace step inside the builder, `/settings/gyms` from Conditions — so the picker is reachable from the condition again. Home's gym card keeps routing to the ceremony, which already falls back to "Save a gym first".

Copy:
```
Gyms
Any of your ${n} saved gyms
Edit gyms
```

Files: `plans/rebuild/01-product-model.md`, `plans/rebuild/02-screen-inventory.md`, `app-next/src/features/rules/PlanSummary.tsx`, `app-next/src/content/plan.ts`, `app-next/src/features/conditions/useBuilder.ts`, `app-next/src/features/conditions/__tests__/builder.test.tsx`

First failing tests:
- a gym condition's summary shows a Gyms row naming how many gyms are saved
- the Gyms row opens the saved-gym list from the builder and returns to the summary
- a walking condition's summary shows no Gyms row

Decisions: B24, B11, B26 · Order: Pairs with finding 56 (B25's auto-pause is the consequence of 'any saved gym' reaching zero) and finding 57 (the builder's gym step is the other half of this entry point).

### #56 [medium, M] Deleting the last saved gym auto-pauses the gym conditions and says so

B25: auto-pause with a note. Add optional `pausedReason: 'noGym' | null` to `Rule` (optional so persisted rules still validate), and a pure `gymRulesToPause(rules, gymPlaces)` returning the enabled gym rules that lose their only signal — under B24 that is only when the last gym goes; removing one of several is harmless. `GymsScreen`'s confirm sheet gets a real title and a consequence body in that case (today it passes `c.removeGym` as both title and confirm with the bare gym name as body), and on confirm applies the pause. `RuleCard` shows the reason with a "Save a gym" action, and turning the switch back on clears the reason.

Copy:
```
Remove ${name}?
This is your only saved gym. ${n} gym condition will be paused until you save another gym.
Paused - no saved gym
Save a gym
```

Files: `app-next/src/domain/types.ts`, `app-next/src/domain/gymDependency.ts (NEW)`, `app-next/src/features/settings/GymsScreen.tsx`, `app-next/src/content/settings.ts`, `app-next/src/features/conditions/mutations.ts`, `app-next/src/design-system/RuleCard.tsx`, `app-next/src/features/conditions/ConditionsScreen.tsx`, `app-next/src/state/validation.ts`, `app-next/src/domain/__tests__/gymDependency.test.ts (NEW)`, `app-next/src/features/settings/__tests__/screen.test.tsx`

First failing tests:
- removing the last saved gym pauses every enabled gym condition and the sheet names how many will pause
- removing one of two saved gyms pauses nothing and the sheet says nothing about conditions
- a condition paused for a missing gym shows the reason and a Save a gym action
- turning that condition back on clears the reason
- a rule persisted without pausedReason still loads

Decisions: B25, B24, B9 · Order: After finding 55 fixes the product-model line that says a gym condition matches any saved gym; the paused-reason chip is rendered by finding 92's row state.

### #57 [medium, S] The builder's gym step adds a gym instead of overwriting one

**Planner resolution:** Collapsed into #25 (GPlace deleted).

`BuilderGymStep.tsx:5` passes `placeId={gyms[gyms.length - 1]?.id}`, which `usePicker` turns into `existing` and saves under that id (usePicker.ts:9,167) — so the builder rewrites the most recently saved gym at any gym count, not only at the cap, and `usePicker.ts:141-142` suppresses the cap warning because that id is already in the list. Pass no `placeId`, so Save always adds. When gyms already exist the step lists them with Continue — under B24 any saved gym satisfies the condition, so the step's real requirement is "at least one" — plus "Add another gym", disabled at five with the cap line.

Copy:
```
Use my saved gyms
Add another gym
You have saved the maximum of 5 gyms.
```

Files: `app-next/src/features/gym-picker/BuilderGymStep.tsx`, `app-next/src/features/gym-picker/usePicker.ts`, `app-next/src/content/gymPicker.ts`, `app-next/src/features/gym-picker/__tests__/picker.test.tsx`, `app-next/src/features/conditions/builderFlow.ts`

First failing tests:
- saving a gym from the builder adds a gym and leaves the existing ones untouched
- the builder's gym step continues without saving when a gym is already saved
- at five saved gyms the builder's gym step offers no Add and says why

Decisions: B24, B11 · Order: With finding 55 (B24 is the contract this step enforces). It also gives the step an exit that is not "Save gym", which is finding 23's trap.

### #59 [medium, S] The summary says blocking starts as soon as you save

`useBuilder.next()` saves and closes with no check of whether the chosen window already covers `now` (useBuilder.ts:84-87), and the summary's only copy is "Your plan is ready" — so a 9 AM to 9 PM condition saved at 3 PM locks every chosen app on the spot with no acknowledgement. Add a pure `startsNow(schedule, now, tz)` using `currentInstances` over the drafted rule, and let `PlanSummary` print either "Blocking starts as soon as you save." plus the one line of what is left today, or "Blocking starts at 9:00 AM." when the window is still ahead. The clock comes from the runtime the builder already holds; no new state.

Copy:
```
Blocking starts as soon as you save.
Blocking starts at ${time}.
To unlock today: ${goal}.
```

Files: `app-next/src/features/rules/PlanSummary.tsx`, `app-next/src/features/conditions/useBuilder.ts`, `app-next/src/features/conditions/ConditionBuilder.tsx`, `app-next/src/content/plan.ts`, `app-next/src/features/conditions/__tests__/builder.test.tsx`

First failing tests:
- a 9 AM to 9 PM condition summarised at 3 PM says blocking starts as soon as you save and names what is left today
- the same condition summarised at 7 AM names the start time instead
- an all-day condition always says blocking starts as soon as you save

Decisions: B7, B2, B8 · Order: Independent of the edit rework; can land before findings 53 and 54.

### #76 [medium, S] Keep the 50–200 m radius slider and finally render the trade-off line (B26)

B26 keeps the PRD's draggable 50–200 m radius and makes the screen inventory the loser, so `PlaceStep.tsx:61` and `clampRadius` stay as they are. The copy the decision asks for already exists and is simply never rendered: `gymPickerCopy.helper` ("Bigger circle: detects you sooner, may include the parking lot.") has no call site anywhere in `src`. Render it as a support label directly under the slider, and correct `plans/rebuild/02-screen-inventory.md:180` from "radius fixed 100 m" to the 50–200 m slider starting at 100 m so the two documents stop disagreeing.

Files: `app-next/src/features/gym-picker/PlaceStep.tsx`, `plans/rebuild/02-screen-inventory.md`, `app-next/src/features/gym-picker/__tests__/picker.test.tsx`

First failing tests:
- the gym picker renders the radius trade-off line under the slider
- the slider still clamps to 50–200 m in steps of 10 and defaults to 100 m

Decisions: B26 · Order: No dependencies; the saved radiusMeters is what P2-T05 hands startGeofencingAsync, so the doc correction should land before that task is executed.

### #91 [low, M] Give RuleCard a status line and a paused tone so the Conditions list is scannable

**Planner resolution:** One `status: { text, tone }` prop on `RuleCard`, computed by `domain/conditionState.ts` (P2-T19 builds it, this entry consumes it).

B25 makes this structural rather than cosmetic: deleting a gym must auto-pause the conditions that depend on it "with a note on its row", so RuleCard needs a place to put a note. Add an optional `status: { text: string; tone: 'paused' | 'active' | 'met' | 'idle' }` prop rendered as a support line under the schedule line, and reduce the icon and title opacity when `enabled` is false. ConditionsScreen computes the text from data it can already reach — rulesStore, ruleDaysStore and the clock — as: "Paused", "Paused — its gym was deleted" (B25), "Not scheduled today", "Met today" (including an unlock earned before an edit, B23), or "Active now · 1,240 / 5,000 steps". No new store and no new domain state: reuse `windowInstances`, `progressContent`'s formatting and the met row. 02-screen-inventory.md:137-138's card description gains the status line.

Copy:
```
Paused · Paused — its gym was deleted · Not scheduled today · Met today · Active now
```

Files: `app-next/src/design-system/RuleCard.tsx`, `app-next/src/features/conditions/ConditionsScreen.tsx`, `app-next/src/content/conditions.ts`, `app-next/src/features/conditions/__tests__/conditions.test.tsx`, `plans/rebuild/02-screen-inventory.md`

First failing tests:
- a paused condition's card reads "Paused" and renders its icon and title at reduced opacity
- a condition auto-paused by a deleted gym reads the B25 note on its row
- a condition scheduled today with progress reads "Active now · 1,240 / 5,000 steps"
- a condition met today still reads "Met today" after its days are edited to exclude today (B23)

Decisions: B23, B25, B9 · Order: after NEW:condition-lifecycle lands the earned-unlock snapshot (B23) and the gym-delete auto-pause (B25); the status line renders their facts and has little to say without them

### #102 [low, S] Keep the edit snapshot out of the validated answers map and fail loudly when it is missing

**Planner resolution:** Chosen model: the S3 edit snapshot is component state on the route (lost on relaunch, acceptable). No unvalidated persisted key.

Stop round-tripping the S3 edit snapshot through `answers`, whose validator caps every value at 500 characters and drops the whole field when one value fails — a realistic multi-branch answer set measures 502 characters before `ruleId`/`ruleCreatedAt` are added. Hold `editBackup` in a dedicated unvalidated store key (or component state on the onboarding route) with no length cap, and set `returnTo` only after the snapshot is confirmed stored. Make `back()` fail loudly when no snapshot is found: keep the user on the edit step with an inline message rather than silently restoring the edited values. A user who explored several activity branches, pressed Edit, changed the goal and pressed Back gets the original value back instead of a silently kept change.

Copy:
```
Your earlier answer could not be restored. Set it again before you go back.
```

Files: `app-next/src/features/onboarding/useOnboarding.ts`, `app-next/src/state/onboardingStore.ts`, `app-next/src/content/plan.ts`, `app-next/src/features/onboarding/__tests__/onboarding-edit.test.tsx (NEW)`

First failing tests:
- pressing Back after an S3 edit restores the pre-edit answers for a four-branch answer set
- the edit snapshot survives an answer set larger than the 500-character value cap
- back() keeps the user on the edit step with an inline message when no snapshot was stored
- advancing from an edit clears returnTo and the stored snapshot

Decisions: B33 · Order: Shares the validator work in src/state/validation.ts and createPersistedStore.ts with fix 3 (finding 21) — do both in one pass so the validator contract changes once. The same edit-and-cancel shape is what NEW:builder-fixes fixes in the condition builder, so land them together.

## P2-T21 — Ceremony hardening (9 findings)

### #2 [blocker, M] Framing-grace expiry keeps the ceremony mounted instead of a silent shield

Stop `onExpired` from calling `router.back()`. On expiry the ceremony stays mounted, `TreadmillScanController`'s `expired` phase drives a terminal failure state, and the footer offers the same two exits the permission-denied branch already has: "Try again" (restarts `controller.start()` and re-issues the propped session) and "Continue with phone in hand" (starts the handheld session and dismisses). The walking session is still stopped so nothing false is unlocked, but the user is told why. New strings go in `app-next/src/content/unlock.ts` under `treadmill`. Amend `docs/specs/aha-unlock-screens.md:138-139`, which currently says the screen pops back to Home with the "Walk complete" state — that copy lives only in `WalkingSheet`, which this path never opens, and popping is exactly the silent shield `docs/specs/treadmill-mode.md:131` forbids.

Copy:
```
expired: "We couldn't see you walking"
expiredBody: "The camera never got a clear view. Try again, or keep your phone with you and we'll verify your steps instead."
retry: "Try again"
```

Files: `app-next/src/features/unlock/TreadmillUnlockScreen.tsx`, `app-next/src/content/unlock.ts`, `app-next/src/features/unlock/README.md`, `app-next/src/features/unlock/__tests__/treadmill.test.tsx`, `docs/specs/aha-unlock-screens.md`

First failing tests:
- the thirty-second framing grace expiring leaves the ceremony mounted and shows the scan-failed heading
- onExpired never navigates away from the treadmill screen
- Try again after an expiry restarts the scan and clears the failure heading
- Continue with phone in hand after an expiry starts a handheld walking session and dismisses

Decisions: B19, B20, B27 · Order: After B27's two-pill Home entry lands in NEW:walking-duration-mode, so "Continue with phone in hand" and the outdoor pill start the same handheld session.

### #11 [high, M] Make the gym time-target ceremony tell the truth: instant relief on arrival (B22)

**Planner resolution:** Consumes P2-T14's `unlockedProvisional`; presence is a live `LockInput` fact from visits, never persisted in `ruleDaysStore`. Drop the `unlockedArrived` name.

B22 settles the open question: a confirmed arrival inside the window unlocks while presence holds, and the day's credit books when N minutes accrue. Implement it as a provisional unlock state rather than by muting the ceremony — `resolveLock` gains `unlockedArrived { ruleId, placeId }`, ranked below `unlockedWalking` and above `locked`, granted when an enabled gym rule (`event` or `target`) is active now and confirmed gym presence is live; presence reaches the domain through a new `gymPresence: { placeId, since } | null` field on `ruleDaysStore` written by `GymPort.observePresence`, mirroring `walkingSession`. Losing presence drops back to `locked` exactly as a lapsed walking lease does. The ceremony keeps its lift, confetti and haptic because something real happened, and `unlockCopy.gym.detectedTime` becomes the B22 sentence naming the goal; Home's gym-minutes card shows the same promise while presence holds.

Copy:
```
Unlocked while you're here. 30 minutes counts the day.
```

Files: `app-next/src/domain/types.ts`, `app-next/src/domain/resolveLock.ts`, `app-next/src/state/ruleDaysStore.ts`, `app-next/src/demo/fakes/GymFake.ts`, `app-next/src/demo/gymProgress.ts`, `app-next/src/content/unlock.ts`, `app-next/src/features/unlock/GymUnlockScreen.tsx`, `app-next/src/features/home/progressContent.ts`, `app-next/src/domain/__tests__/resolveLock.test.ts`, `app-next/src/features/unlock/__tests__/gym.test.tsx`

First failing tests:
- resolveLock returns unlockedArrived for an active gym minutes rule while confirmed presence is live and the row is unmet
- resolveLock falls back to locked the moment presence flips to outside before the minutes accrue
- unlockedArrived loses to unlockedWalking and to unlockedMet when both apply
- the gym ceremony for a minutes rule shows "Unlocked while you're here. 30 minutes counts the day." and Home reports unlockedArrived, not "Apps are blocked"
- an arrival rule (event kind) still books met and resolves to unlockedMet, unchanged

Decisions: B22, B2, B6, B31 · Order: needs design: the unlockedArrived provisional lock state — it is the same state finding 7 asks for, so design it once in NEW:condition-lifecycle and let this entry consume it; the ceremony copy and Home detail can land in the same commit.

### #22 [high, S] Separate "no gym saved" and "still locating" from "location denied" on the gym ceremony

`useGymUnlock.ts:33-35` sets `denied = !p` from a null coordinate, and `GymFake.location()` returns null whenever `gymPlaces` is empty, so a user with location granted and no saved gym is told to open Settings. Derive `denied` from `permissionsStore.location` (`denied` or `notDetermined`) instead of from the sample, add a `locating` flag for "permission granted, no fix yet", and order the title/body/footer switch in `GymUnlockScreen.tsx:40-77` as denied → noGym → locating → inside/outside so the reachable "Save a gym first" / "Choose a gym" state finally shows. Base `noGym` on the saved-places list being empty rather than on `nearest` being undefined.

Copy:
```
Finding your location…
Hold on a moment.
```

Files: `app-next/src/features/unlock/useGymUnlock.ts`, `app-next/src/features/unlock/GymUnlockScreen.tsx`, `app-next/src/content/unlock.ts`, `app-next/src/demo/scenarios/unlock.ts`, `app-next/src/features/unlock/__tests__/gym.test.tsx`

First failing tests:
- with location granted and no saved gym the ceremony shows "Save a gym first" and the Choose a gym button
- with location denied the ceremony shows "Location access is off" and Open Settings even when a gym is saved
- with location granted, a gym saved and no coordinate yet the ceremony shows the locating state, not a permission error
- a slow first fix followed by a real sample transitions locating → outside without a flash of the denied screen

Decisions: B24, B25 · Order: Pairs with finding 25/56's gym-binding work (B24/B25) in NEW:condition-lifecycle: once deleting a gym auto-pauses its condition, the empty-gym state here should be rare but must still read correctly.

### #24 [high, M] Request, record and honour camera permission before the treadmill scan starts

`GaitPort.permission()` has no caller and nothing writes `permissionsStore.camera`, so the iOS prompt lands on an unread screen and Settings says "Not requested" forever. Have `TreadmillUnlockScreen` render the idle heading and the privacy line first, then call `provider.permission()`, write the result into `permissionsStore.camera`, and only call `controller.start()` on `granted`; a `denied` or `restricted` answer goes straight to the existing handheld-fallback state without touching the camera. Widen `GaitPort.permission()` to return `PermissionStatus` so `restricted` (MDM / parental controls) can be represented and is treated as denied rather than as granted. `NativeGait.permission()` stops probing by start/stop and reads the real `AVCaptureDevice` authorization status in Phase 2, where the `NSCameraUsageDescription` string is also added.

Files: `app-next/src/features/unlock/TreadmillUnlockScreen.tsx`, `app-next/src/ports/GaitPort.ts`, `app-next/src/demo/fakes/GaitFake.tsx`, `app-next/src/runtime/NativeGait.tsx`, `app-next/app.json`, `app-next/src/features/unlock/__tests__/treadmill.test.tsx`, `plans/rebuild/phase-2-backend/P2-T03-port-native-engine.md`

First failing tests:
- the treadmill screen asks the gait port for camera permission before it starts the scan
- a denied answer writes 'denied' into permissionsStore.camera, shows the handheld fallback and never starts the provider
- a restricted answer is treated as denied rather than proceeding to scan
- a granted answer writes 'granted' and starts the scan, and the Settings Camera row reads the recorded status
- the privacy line is on screen before the permission call is made

Decisions: B12, B20 · Order: The recorded status is what finding 100's missing Settings Camera row (NEW:settings-one-screen) displays; app.json's NSCameraUsageDescription and the real AVCaptureDevice read belong to P2-T03 and are the only phase2 slice here.

### #30 [high, S] Gate the treadmill ceremony on the booking actually succeeding

`onVerified` sets `verified.current = true` and drops the boolean `completeProppedScan()` returns, which is `false` whenever the session is missing or already ended — reachable because a failed `walking.start` only sets an error string while the `AppState` listener restarts the scan on the next foreground. Read the result: `const booked = preview || runtime.walking.completeProppedScan(); if (!booked) { setError(...); return; }` and set `verified.current` only after it succeeds, so the shackle, confetti and success haptic cannot fire over nothing. Track whether a session was actually started in a ref and make the `AppState` 'active' handler refuse to call `controller.start()` without one. `close()` then still runs `walking.stop()` on the failure path, leaving no orphaned session behind.

Copy:
```
We couldn't start your walk. Close this and try again.
```

Files: `app-next/src/features/unlock/TreadmillUnlockScreen.tsx`, `app-next/src/content/unlock.ts`, `app-next/src/features/unlock/__tests__/treadmill.test.tsx`

First failing tests:
- a passing scan with no live walking session shows the alert and leaves the frame unlifted with no confetti
- AppState 'active' does not restart the scan when walking.start rejected
- a scan that books successfully still plays the full ceremony and leaves the session in phase walking
- closing after a failed booking calls walking.stop()

Decisions: B3, B12, B20 · Order: Land alongside finding 2's framing-grace fix (same file, same never-shield-silently rule) and before finding 1's propped-minutes booking, which changes what completeProppedScan does.

### #61 [medium, S] Leaving the gym radius aborts the in-flight check-in

Add `request.current?.abort()` to the `presence === 'outside'` branch of `useGymUnlock`, next to the existing state reset and generation bump. Cancellation then becomes the app's decision rather than something inherited from the fake's `Left gym` rejection, so a Phase 2 geofence adapter that resolves optimistically or misses a presence change cannot credit an arrival the user walked away from. The unmount abort stays as it is.

Files: `app-next/src/features/unlock/useGymUnlock.ts`, `app-next/src/features/unlock/__tests__/gym.test.tsx`

First failing tests:
- leaving the radius mid-ring aborts the in-flight check-in even when the port would have resolved
- an aborted check-in writes no rule-day progress and leaves the shackle down
- re-entering the radius after an abort allows a fresh check-in

Decisions: B22, B26, B31 · Order: Independent of the other ceremony work; land any time after #93's clock change touches the same hook, or before it — the two edits do not overlap.

### #75 [medium, M] Delete the dead manual check-in sheet and make the gym card's label match the ceremony it opens

**Planner resolution:** Enumerate the keys by grep before deleting; `sessionCopy.noGym` and `error` have readers elsewhere. Sequence with #78 and #44/#65 as one `content/sessions.ts` pass.

`unlockKind` returns 'gym' for every gym rule, so the `setSheet({type:'checkin'})` branch and the `'checkin'` case in HomeSheets are unreachable. Remove `'checkin'` from the sheet union in HomeScreen and HomeSheets (leaving `{ type: 'walk'; ruleId: string }`), remove the `onChooseGym` prop HomeSheets declares but never destructures along with the callback Home passes it, and drop the `action: 'checkin'` / `label: c.checkIn` returns from progressContent's event and gym-target branches. Label the gym card's action with `homeCopy.gymEntry` ("I'm at the gym") so the card and the lock-card pill say the same thing about the same full-screen ceremony; per B22 the gym-minutes card's detail says the visit is counting while you're there. Delete the SH-checkin row from 02-screen-inventory.md:181 (aha-unlock-screens.md:50 already deleted CheckInSheet) and delete the orphaned `sessionCopy.checkin/at/inside/outside/timeSuccess/success/noGym` keys — grep first: `noGym` and `error` have readers in other content modules and `chooseGym` is used by GymSetup, so only remove keys with zero references.

Copy:
```
Gym card action label: "I'm at the gym" (reuses homeCopy.gymEntry)
```

Files: `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/features/sessions/HomeSheets.tsx`, `app-next/src/features/home/progressContent.ts`, `app-next/src/content/home.ts`, `app-next/src/content/sessions.ts`, `plans/rebuild/02-screen-inventory.md`

First failing tests:
- the Home sheet type accepts only 'walk'; no code path can set 'checkin'
- a gym arrival card's action reads "I'm at the gym" and pushes /unlock/gym with the rule id
- every remaining key in sessionCopy has at least one reader outside the content file

Decisions: B20, B22 · Order: the gym card's detail copy depends on B22's instant-relief wording (finding 7/11); write the label change now and revisit the detail string when NEW:ceremony-hardening lands the provisional-unlock state

### #93 [low, M] The gym confirmation window and its ring run on ClockPort

**Planner resolution:** `ClockPort.at`/`monotonicMs` are P2-T15; this entry moves the hook onto them.

Drive all product timing off `ClockPort`. `useGymUnlock` computes ring progress as `(Date.parse(clock.now()) - startedAt) / duration` from the clock's subscription rather than `Date.now()` on a 50 ms interval, and `GymFake.checkIn`'s confirmation resolves when the clock reaches `startedAt + confirmation.milliseconds` rather than on a real `setTimeout`. Visual smoothness stays with a Reanimated `withTiming` interpolation over the clock-derived target, which carries no product meaning. A tester advancing the dev clock then sees the ring, the lease and the windows agree; in production `Date.now` and `ClockPort` are the same clock, so nothing changes for users.

Files: `app-next/src/features/unlock/useGymUnlock.ts`, `app-next/src/demo/fakes/GymFake.ts`, `app-next/src/features/unlock/README.md`, `app-next/src/features/unlock/__tests__/gym.test.tsx`

First failing tests:
- advancing the dev clock by thirty seconds completes the gym confirmation ring
- the ring's reported progress equals elapsed clock time over the confirmation window
- check-in resolves when the clock reaches the confirmation deadline, not after a wall-clock timeout
- leaving the radius before the clock deadline still rejects the check-in

Decisions: B22, B31, B26 · Order: Touches the same hook as #61; land #61 first so the abort path exists before the timing source changes.

### #98 [low, S] Explain the verifying state after the camera-denied handheld fallback

Add a `verifying` state to the Home surfaces so the handheld hand-off is not silent. `progressContent` returns "Checking your pace…" as the detail for a state rule whose session is in phase `verifying`, and `statusContent` keeps the locked card but swaps its subtitle to the same line so the card explains itself. In `TreadmillUnlockScreen`'s "Continue with phone in hand" handler, after `runtime.walking.start(rule)` and `router.back()`, open Home's walking sheet for that rule (the sheet already renders start → verifying → walking → grace) instead of dropping the user on a bare locked Home. The spec's dismissal behaviour is unchanged; only the explanation is added.

Copy:
```
Checking your pace…
```

Files: `app-next/src/features/unlock/TreadmillUnlockScreen.tsx`, `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/features/home/progressContent.ts`, `app-next/src/features/home/statusContent.ts`, `app-next/src/content/home.ts`, `app-next/src/features/unlock/__tests__/treadmill.test.tsx`, `app-next/src/features/home/__tests__/live-progress.test.ts`

First failing tests:
- progressContent details a verifying walking session as Checking your pace
- statusContent subtitles the locked card with Checking your pace while a session is verifying
- the treadmill handheld fallback starts the session and opens the Home walking sheet for that rule
- the treadmill handheld fallback does nothing to the session in preview mode

Decisions: B3, B27 · Order: Shares the statusContent branch table with fix 4 (finding 33) and the progressContent pass with fix 7 (finding 67). Amends docs/specs/aha-unlock-screens.md:136-139, which specifies the dismissal but not what Home says next.

## P2-T22 — Settings, permissions and account (12 findings)

### #35 [medium, S] Make every "Open Settings" button actually open iOS Settings

Replace the three note-only handlers with `Linking.openSettings()` — `PermissionDetail.tsx:26`, `PermissionPrimer.tsx:80`, and Home's denied path. On Home, branch the status action: when `permissions.screenTime` is `denied` or `restricted` the label becomes "Open Settings" and routes through `Linking.openSettings()` instead of `runtime.screenTime.requestAuthorization()`, which iOS will never re-present after a denial. Delete `settingsCopy.settingsNote` and `setupCopy.settingsNote` (both are preview-only apologies) and replace them with a per-permission path line so the user knows where they are going. The pattern already exists and works in `GymUnlockScreen.tsx:67`.

Copy:
```
Open Settings
Settings › Screen Time › ExcerLock
Settings › ExcerLock › Motion & Fitness
Settings › ExcerLock › Location
Settings › Health › Data Access & Devices › ExcerLock
Settings › ExcerLock › Camera
Settings › ExcerLock › Notifications
```

Files: `app-next/src/features/settings/PermissionDetail.tsx`, `app-next/src/features/setup/PermissionPrimer.tsx`, `app-next/src/features/home/HomeScreen.tsx`, `app-next/src/features/home/statusContent.ts`, `app-next/src/content/settings.ts`, `app-next/src/content/setup.ts`, `app-next/src/content/home.ts`, `app-next/src/features/settings/__tests__/screen.test.tsx`, `app-next/src/features/setup/__tests__/primers.test.tsx`

First failing tests:
- the permission detail Open Settings button calls Linking.openSettings
- the setup permission primer Open Settings button calls Linking.openSettings instead of revealing a note
- Home shows Open Settings and calls Linking.openSettings when Screen Time is denied
- Home still shows Allow Screen Time and calls requestAuthorization when Screen Time is notDetermined

Decisions: B37 · Order: Land together with fix 8 (finding 68) — both rewrite the PermissionDetail button, and doing them separately means editing the same six lines twice. Amends plans/rebuild/phase-2-backend/P2-T10-settings-account-wiring.md:5-6, which already schedules request-when-notDetermined / openSettings-when-denied for Settings but says nothing about Home's denied action; add Home to that step's acceptance.

### #49 [medium, L] Fold Settings back into one screen with every required row, Camera included

**Planner resolution:** Folded into #115 as acceptance criteria (six permission rows incl. Camera, one Account row, no `more` state). The test file is `features/settings/__tests__/screen.test.tsx`.

B34 removes the two-tier shape. Merge DetailedSettingsScreen's content into SettingsScreen as one scrolling screen in the inventory's order — profile/account header, Subscription (plan + renewal, Manage subscription, Restore purchases), Permissions, Preferences, Locked apps, Saved gyms, Support (Contact support, Rate, Share), Legal (Terms, Privacy as two rows navigating `legal/terms` and `legal/privacy`), Account, version footer with the 7-tap dev gate — then delete DetailedSettingsScreen.tsx and the `more` component state, so the OS back gesture and tab switches behave. Add `'camera'` to `permissionOrder` so all six permission rows appear. "Manage subscription" stops calling `setMore(true)`: in Phase 1 it shows the existing `c.external` note in place, and P2-T10 swaps in the App Store subscriptions URL. Per B37 rename the Notifications preference row to reflect OS-level-only control (no per-notification toggles). Move every English literal in the compact screen ("Permissions", "Preferences", "Account & support", "Account & privacy", "Units", "Notifications", "Help & feedback", "Privacy & terms", "More settings") into settingsCopy.

Copy:
```
Notifications row renamed to "Notifications" with support line "Managed in iOS Settings." (B37: no in-app per-notification toggles)
```

Files: `app-next/src/features/settings/SettingsScreen.tsx`, `app-next/src/features/settings/DetailedSettingsScreen.tsx`, `app-next/src/features/settings/PreferencesPanel.tsx`, `app-next/src/content/settings.ts`, `app-next/src/features/settings/__tests__/settings.test.tsx`, `plans/rebuild/phase-2-backend/P2-T10-settings-account-wiring.md`

First failing tests:
- Settings renders all six permission rows including Camera without any further navigation
- tapping "Manage subscription" does not navigate away from Settings and shows the subscription note
- "Terms of Use" and "Privacy Policy" each navigate to their own legal document route
- the version footer's seventh tap opens the dev menu from the single Settings screen
- no Settings row title is a literal defined outside src/content/settings.ts

Decisions: B34, B37 · Order: land the single-screen merge before the B35 paywall change and the B37 notification-row rename so all three edit one file; the real App Store destination stays in P2-T10

### #68 [medium, S] Branch the permission detail screen on its actual status

Split `PermissionDetail`'s body by `status` instead of rendering `why`, `without` and the button unconditionally. Granted / whenInUse / always: show `why` plus a confirmation line and demote the button to a secondary "Change in Settings". notDetermined: show `why` plus a primary "Allow" that calls the matching runtime request. Denied: show `why`, `without` and a primary "Open Settings" wired to `Linking.openSettings()`. Restricted: show `why` plus a new restricted line explaining that a Screen Time passcode or a device-management profile is in force and ExcerLock cannot request it, with no request button. A user checking that everything is fine sees a confirmation instead of "Your selected apps cannot be blocked without access."

Copy:
```
This is on. Nothing to do here.
Change in Settings
Allow
A Screen Time passcode or a device management profile blocks this. ExcerLock cannot ask for it.
```

Files: `app-next/src/features/settings/PermissionDetail.tsx`, `app-next/src/content/settings.ts`, `app-next/src/features/settings/__tests__/screen.test.tsx`

First failing tests:
- the permission detail for a granted permission shows the confirmation line and no without line
- the permission detail for notDetermined shows Allow and calls the matching runtime request
- the permission detail for denied shows the without line and Open Settings
- the permission detail for restricted shows the restriction explanation and offers no Allow button

Decisions: B37 · Order: Land in the same pass as fix 5 (finding 35) — both rewrite the same button in PermissionDetail.tsx. The restricted branch needs fix 13 (finding 99) for Location to ever reach it, so land 99 alongside or immediately after.

### #79 [medium, M] An anonymous user can delete their data from the Account screen

Anonymous sessions are not local-only — P2-T01 step 3 provisions a server row keyed by the anonymous uid and P2-T08 pushes rules to it — so the existing deletion path is the right one, it is just hidden. `AccountScreen.tsx:55-63` shows the destructive action for both session kinds: signed-in keeps `c.delete` and its five facts, anonymous gets `Delete my data` with its own fact list, both going through the same confirmation `BottomSheet` and the same `runtime.auth.deleteAccount()` (which under P2-T10 step 6 deletes the server record, schedules Adapty/PostHog erasure and starts a fresh anonymous session). For the anonymous case the fake and the adapter also clear the local stores (rules, ruleDays, profile, settings including saved gyms) so 'delete my data' is honest, and the copy states plainly that it does not cancel an App Store subscription.

Copy:
```
deleteData: 'Delete my data'
deleteDataTitle: 'Delete your data forever?'
deleteDataFacts: [
  'Your ExcerLock record on our server will be deleted.',
  'Analytics and subscription-provider erasure will be scheduled.',
  'Your conditions, progress, locked apps and settings on this device will be erased.',
  'This does not cancel an App Store subscription.',
  'This cannot be undone.'
]
deleteDataConfirm: 'Delete my data forever'
dataDeleted: 'Your data has been deleted. ExcerLock is starting fresh on this device.'
```

Files: `app-next/src/features/settings/AccountScreen.tsx`, `app-next/src/content/settings.ts`, `app-next/src/demo/fakes/AuthFake.ts`, `app-next/src/features/settings/README.md`, `plans/rebuild/02-screen-inventory.md`, `plans/rebuild/phase-2-backend/P2-T10-settings-account-wiring.md`

First failing tests:
- an anonymous account screen offers Delete my data alongside Sign in
- confirming the anonymous deletion clears the rules store and starts a new anonymous session
- the anonymous confirmation says the App Store subscription is not cancelled
- a signed-in account screen still shows the five-fact deletion sheet unchanged

Decisions: B18, B34 · Order: Shares AccountScreen.tsx and its confirmation sheet with finding 107; land 79 first so 107 reuses the same sheet shape. Independent of the finding 115 Settings rebuild.

### #81 [medium, S] A denied Always-location grant explains itself instead of snapping the switch back

`PreferencesPanel.tsx:51-55` awaits `runtime.gym.enableAutoDetect()` (`GymFake.ts:95-107` already returns false when the Always prompt is refused) and, on false, keeps the switch off and reveals an inline explanation plus a button that navigates to `settings/permission/location`, where the existing detail screen's Open Settings action lives. The switch gets a `busy` guard while the prompt is up so a double tap cannot double-request. Clear the explanation as soon as the switch succeeds or is turned off.

Copy:
```
autoDenied: 'Gym auto-detect needs Always location. Turn it on in Settings so a saved gym can recognize a visit while ExcerLock is closed.'
autoDeniedAction: 'Open location settings'
```

Files: `app-next/src/features/settings/PreferencesPanel.tsx`, `app-next/src/content/settings.ts`, `app-next/src/features/settings/README.md`

First failing tests:
- denying Always location leaves the gym auto-detect switch off and shows the explanation
- the explanation's button navigates to the location permission detail
- granting Always location turns the switch on and shows no explanation
- the switch cannot be toggled again while the permission prompt is open

Decisions: B34, B11, B26 · Order: Shares PreferencesPanel.tsx with finding 80; both land before the finding 115 rebuild.

### #83 [medium, M] Support messages carry a reply address and the diagnostics the PRD requires

Widen `SupportPort.send` from `(category, message)` to a single `SupportRequest` — `{ category, message, replyTo, diagnostics }` — and add a pure `src/domain/supportDiagnostics.ts` that assembles the field list the PRD demands (app version and build, iOS version, device model, entitlement status, the six permission statuses) and nothing else, so the privacy floor is type-enforced: no health values, no locked-app names, no gym names or coordinates. `SupportScreen.tsx` gains a reply-email `TextField` — required and validated when the session is anonymous (the majority under B18), prefilled from `session.email` when signed in — a collapsible 'What we'll send' block rendering the diagnostics before send, and a sent screen that names the destination and the response time. P2-T10 step 5's real `POST /v1/support` then has a payload shape to send.

Copy:
```
replyEmail: 'Your email'
replyEmailHelp: 'So we can reply. We only use it to answer this message.'
replyEmailError: 'Enter an email we can reply to.'
diagnostics: "What we'll send"
diagnosticsBody: 'Attached automatically so we can help faster. No health data, app names or locations are included.'
sentBody: 'Your message went to support@excerlock.com. We reply within two business days.'
```

Files: `app-next/src/ports/SupportPort.ts`, `app-next/src/domain/supportDiagnostics.ts (NEW)`, `app-next/src/features/settings/SupportScreen.tsx`, `app-next/src/demo/fakes/SupportFake.ts`, `app-next/src/content/settings.ts`, `app-next/src/features/settings/__tests__/screen.test.tsx`, `app-next/src/features/settings/README.md`, `plans/rebuild/02-screen-inventory.md`, `plans/rebuild/phase-2-backend/P2-T10-settings-account-wiring.md`

First failing tests:
- an anonymous user cannot send until a valid reply email is entered
- a signed-in user's email prefills the reply address and the field stays editable
- the diagnostics preview lists version, build, iOS version, device, entitlement and the six permission statuses and nothing else
- supportDiagnostics never includes a gym name, a coordinate or a health value
- the sent screen names support@excerlock.com and the response time

Decisions: B17, B18, B34 · Order: Independent of the finding 115 rebuild, but both change how Settings routes to support; land 83 first so the rebuilt screen links the finished composer.

### #99 [low, S] Let Location hold the restricted status

Add `'restricted'` to the `location` union in `domain/types.ts`, `plans/rebuild/01-product-model.md:208` and the `permissionsStore` validator, so an MDM- or Screen-Time-restricted device can be represented instead of silently keeping the previous value. Everywhere that treats location as granted (`progressContent`, `PermissionPrimer`, `GymSetup`'s successor, the settings rows) already funnels non-granted values through the denied path, so only the `restricted` copy is new: reuse the restriction line added in fix 8 rather than telling the user to allow something the OS will never grant. Settings then reads "Restricted" instead of "Not requested".

Files: `app-next/src/domain/types.ts`, `app-next/src/state/permissionsStore.ts`, `app-next/src/content/settings.ts`, `app-next/src/features/settings/PermissionDetail.tsx`, `plans/rebuild/01-product-model.md`, `app-next/src/state/__tests__/stores.test.ts`

First failing tests:
- permissionsStore accepts and persists a restricted location status
- the Settings location row reads Restricted when the status is restricted
- the location permission detail shows the restriction explanation and offers no Allow button

Decisions: B11 · Order: Land with or immediately after fix 8 (finding 68), which adds the restricted branch and its copy — without that branch the new status has nowhere to render. Amends the Permissions type in plans/rebuild/01-product-model.md:208.

### #100 [low, S] List all six permissions in Settings and drop the duplicate Notifications row

**Planner resolution:** Folded into #115 as acceptance criteria.

As part of collapsing Settings to one screen (B34), derive the permission list from `settingsCopy.permissionNames` rather than the hard-coded five-key `permissionOrder`, so Camera appears alongside Screen Time, Motion, Health, Location and Notifications as the inventory requires. Remove the Preferences-group "Notifications" row, which navigates to the same `permission/notifications` detail already listed under Permissions — and which B37 renames anyway, since notifications are OS-level only in v1 with no per-notification toggles. A user whose treadmill scan stopped working can find the Camera row without going through "More settings".

Files: `app-next/src/features/settings/SettingsScreen.tsx`, `app-next/src/features/settings/DetailedSettingsScreen.tsx`, `app-next/src/features/settings/__tests__/screen.test.tsx`

First failing tests:
- the Settings permission group lists all six permissions including Camera
- the Settings screen has exactly one row that navigates to the notifications permission detail

Decisions: B34, B37 · Order: Fold into the B34 one-screen rebuild rather than patching the two-tier shape that rebuild deletes — `DetailedSettingsScreen.tsx` (which already iterates all six) merges into `SettingsScreen.tsx` in that task, and this fix is the merge's acceptance criterion.

### #101 [low, S] State what signing in buys and what stays on the device

**Planner resolution:** Copy only (X4 line, Settings row, legal.ts correction); the sign-out sheet is #79's sheet with #107's `signOut` mode.

Add one benefit/consequence line to setup X4 and to the Settings sign-in row: signing in restores conditions and progress on a new phone, while the blocked-app selection stays on this device (decision D5 — Apple ties Screen Time tokens to the device, so app selections can never sync). Add a sign-out confirmation sheet to `AccountScreen` reusing the existing `BottomSheet` pattern, saying that conditions, progress and locked apps stay on this device. Correct the placeholder privacy section's "Your device" paragraph so it describes sync accurately instead of claiming everything remains local; the file stays marked as a Phase 1 placeholder for counsel.

Copy:
```
Signing in restores your conditions and progress on a new phone. Your blocked-app selection stays on this device.
Sign out?
Your conditions, progress and locked apps stay on this device.
Sign out
Stay signed in
```

Files: `app-next/src/content/setup.ts`, `app-next/src/content/settings.ts`, `app-next/src/content/legal.ts`, `app-next/src/features/setup/SignInScreen.tsx`, `app-next/src/features/settings/AccountScreen.tsx`, `app-next/src/features/settings/SettingsScreen.tsx`, `app-next/src/features/settings/__tests__/screen.test.tsx`

First failing tests:
- the setup sign-in screen shows the restore-on-a-new-phone line and the app-selection caveat
- signing out opens a confirmation naming what stays on the device and only signs out on confirm
- dismissing the sign-out confirmation leaves the session signed in

Decisions: B18, D5 · Order: Independent; the copy is ui-now even though SyncFake stays a no-op until plans/rebuild/phase-2-backend/P2-T08-sync.md. Add the promise this copy makes to P2-T08's acceptance (conditions and rule days come back on a new phone; app selections do not) and to P2-T10 step 7's legal guardrail.

### #107 [low, S] Sign-out is confirmed and says what stays on the device

**Planner resolution:** Adds the `signOut` mode to #79's sheet.

Give sign-out the same treatment deletion already has at `AccountScreen.tsx:33-46`: tapping `Sign out` opens the confirmation `BottomSheet` with a short fact list (the plan stays on this device, backup stops until the next sign-in, the subscription is not cancelled), and only the sheet's confirm button calls `action(false)`. On success set a note the way deletion does, so the screen says something happened instead of silently flipping the heading support text to 'Not signed in'. Reuse the sheet built in finding 79 with a `mode: 'signOut' | 'delete' | 'deleteData'` prop rather than adding a third sheet.

Copy:
```
signOutTitle: 'Sign out of ExcerLock?'
signOutFacts: [
  'Your conditions, progress, locked apps and settings stay on this device.',
  'Your plan stops backing up until you sign in again.',
  'This does not cancel an App Store subscription.'
]
signOutConfirm: 'Sign out'
staySignedIn: 'Stay signed in'
signedOutNote: "You're signed out. Your plan is still on this device."
```

Files: `app-next/src/features/settings/AccountScreen.tsx`, `app-next/src/content/settings.ts`, `app-next/src/features/settings/__tests__/screen.test.tsx`

First failing tests:
- tapping Sign out opens a confirmation and does not sign the user out
- confirming sign-out ends the session and shows the signed-out note
- dismissing the sign-out confirmation leaves the session signed in
- the sign-out facts say the plan stays on the device and the subscription is not cancelled

Decisions: B34, B18, D5 · Order: After finding 79, which introduces the shared confirmation sheet this reuses.

### #108 [low, S] One Notifications entry, in Permissions, with no per-notification toggles

**Planner resolution:** Folded into #115.

B37 makes notifications OS-level only in v1, so there is nothing for a Preferences row to toggle. Delete the duplicate `Notifications` row at `SettingsScreen.tsx:58-59`; the Permissions group at `:32-57` already renders Notifications with its live status and routes to the same `permission/notifications` detail. Preferences keeps exactly the four rows the screen inventory lists — Units, Walk & Scroll stop grace, Gym auto-detect, Touch feedback — and the permission detail's copy (`settingsCopy.why.notifications`) already names the two local notifications B14 defines, so the user can see what the permission buys without a toggle that would not work.

Files: `app-next/src/features/settings/SettingsScreen.tsx`, `app-next/src/features/settings/__tests__/screen.test.tsx`, `app-next/src/features/settings/README.md`, `plans/rebuild/02-screen-inventory.md`

First failing tests:
- Settings lists Notifications exactly once, inside Permissions
- the Preferences group contains no notification row or toggle
- the Notifications permission row shows its live status and opens the permission detail

Decisions: B37, B34, B14 · Order: Same rebuild as finding 115 — the single-Settings screen closes both; do 115's structure first and delete this row as part of it. Both entries are kept because they name different defects (a duplicate route vs. a duplicate row).

### #115 [low, L] Rebuild Settings as the one screen the inventory specifies, with one Account row

**Planner resolution:** The single structural Settings entry (B34); sections under `features/settings/sections/*`.

B34 removes the compact-plus-'More settings' shape. Fold `DetailedSettingsScreen.tsx` into `SettingsScreen.tsx` as a single scrolling screen in the inventory's order — profile header (name + sign-in state, tapping opens Account), Subscription (plan/renewal, Manage subscription, Restore purchases), Permissions (six `PermissionRow`s), Preferences, Locked apps + Saved gyms, Support (Contact support, Rate, Share), Legal (Terms, Privacy), Account (Sign in/Sign out, Delete), version footer with the seven-tap dev entry. The profile header is a header, not a row, so exactly one tappable Account row exists (the `:99-104`/`:168` duplication and the `more` state both disappear). Because the screen would exceed the ~200-line file rule, split it into `SettingsScreen.tsx` (composition and order) plus one small section component per group under `features/settings/sections/`, each with its own responsibility, and delete `DetailedSettingsScreen.tsx`.

Files: `app-next/src/features/settings/SettingsScreen.tsx`, `app-next/src/features/settings/DetailedSettingsScreen.tsx`, `app-next/src/features/settings/sections/SubscriptionSection.tsx (NEW)`, `app-next/src/features/settings/sections/PermissionsSection.tsx (NEW)`, `app-next/src/features/settings/sections/SupportSection.tsx (NEW)`, `app-next/src/features/settings/sections/LegalSection.tsx (NEW)`, `app-next/src/features/settings/sections/README.md (NEW)`, `app-next/src/features/settings/PreferencesPanel.tsx`, `app-next/app/(tabs)/settings.tsx`, `app-next/src/features/settings/__tests__/screen.test.tsx`, `app-next/src/features/settings/README.md`, `plans/rebuild/02-screen-inventory.md`

First failing tests:
- Settings renders every required row without a 'More settings' tap
- Settings has exactly one Account row and one profile header, both opening the Account screen
- the row order matches the screen inventory list top to bottom
- the version footer still opens the dev menu on the seventh tap
- no route or test references DetailedSettingsScreen

Decisions: B34, B37, B35 · Order: Structural entry of NEW:settings-one-screen; it is the same rebuild that closes finding 108. Land after findings 80, 81 and 83 so the finished Preferences panel and support composer are simply placed, not rewritten twice; finding 12's restore fix must land before the Restore purchases row moves.

## P2-T23 — Onboarding and setup (8 findings)

### #20 [high, M] Make setup X3 for gym a two-part step: gym picker in the shell, then the Location primer

**Planner resolution:** X3 for gym: picker in the shell, then the Location primer; X5 rows become tappable (#70).

Split X3 for the gym branch into `X3a` (gym picker) and `X3b` (Location primer) inside `setupFlow.ts`, and stop returning `<GymPickerScreen/>` bare from `SetupRoute`. Render the picker inside `OnboardingShell` so it keeps the back arrow, the progress bar and a "Skip for now" secondary, then advance to `<PermissionPrimer name="location" .../>` before X4 so `branchPermission('gym') === 'location'` and the whole `setupCopy` location block finally render. Move `GymSetup.tsx`'s "Auto-detect arrivals" switch and its `autoDetectBody` explanation into that primer as the post-grant upgrade toggle (offered only once `whenInUse`/`always` is held), then delete `GymSetup.tsx`, which has no importers. A gym user now sees map-search-and-pin, then "Recognize your gym visits", then the explained Always upgrade, exactly as the inventory requires, and the X5 Location row can tick.

Copy:
```
Auto-detect arrivals
Allow location access all the time to recognize arrivals when ExcerLock is closed.
```

Files: `app-next/src/onboarding/setupFlow.ts`, `app-next/src/features/setup/SetupRoute.tsx`, `app-next/src/features/setup/PermissionPrimer.tsx`, `app-next/src/features/setup/GymSetup.tsx`, `app-next/src/features/gym-picker/GymPickerScreen.tsx`, `app-next/src/content/setup.ts`, `app-next/src/features/setup/__tests__/setup-router.test.tsx`, `app-next/src/features/setup/__tests__/setupFlow.test.ts`

First failing tests:
- setup for a gym user advances gym picker to the Location primer before the sign-in step
- the gym picker step inside setup shows back and Skip for now and keeps the progress bar
- the Location primer offers the Always auto-detect toggle only after location is granted
- setup for a walking user still goes straight from apps to the Motion primer

Decisions: B11, B24, B26 · Order: Land before fix 10 (finding 70): the X5 "Location access" checklist row can only be honestly tickable and tappable once this step actually asks for Location. Reuses the existing dead copy keys in src/content/setup.ts rather than adding new ones.

### #26 [high, S] Build onboarding screen O19 from the copy that is already written

B33 gives the screen inventory the win, so O19 gets built rather than cut. Add src/features/onboarding/screens/O19.tsx: `Heading` with the inventory title plus three principle rows (icon, title, body) mapped from the existing `onboardingLabels.principles` with staggered `Reveal` indices, matching O08/O09's row rhythm — no institution logos. Insert `'O19'` into `preBranch` between O18 and O20 in src/onboarding/flow.ts, register the component in PreBranchScreen's `screens` map, and add the O19 title/body to `onboardingCopy`. `onboardingStore`'s step regex already accepts O19, so resume works; remove the `.filter(step => step !== 'O19')` from the flow test so the path assertion covers it. The progress fraction picks up the extra step automatically.

Copy:
```
Title: "Built around small, repeatable habits". Rows (already in onboardingLabels.principles): "Start small — Choose something you can actually do." / "Make it repeatable — Give your habit a regular place in your day." / "Reward the action — Move first. Then enjoy your apps."
```

Files: `app-next/src/features/onboarding/screens/O19.tsx (NEW)`, `app-next/src/onboarding/flow.ts`, `app-next/src/features/onboarding/PreBranchScreen.tsx`, `app-next/src/content/onboarding.ts`, `app-next/src/onboarding/__tests__/flow.test.ts`

First failing tests:
- pathFor walks O18 → O19 → O20 for every branch and back again
- O19 renders three principle rows with their icons and no institution logo
- resuming onboarding at a persisted step of 'O19' lands on O19 rather than O01

Decisions: B33 · Order: independent; land before #71 and #72 so all three onboarding-copy tests touch one flow snapshot

### #27 [high, S] Show the "illustrative" label on the O15 trend chart and the O02 badge

The no-fake-data law and 02-screen-inventory.md:39 require the invented curves to be labelled on screen, and B33 confirms the inventory wins. Render `onboardingLabels.illustrative` as a `Label variant="support" tone="secondary"` caption directly under the trend card in TrendHero (keeping the container's existing accessibility label so VoiceOver is not doubled), and render the same caption under O02's "-3h 12m" badge in ProgressBadge/ProgressArtwork. Invert finish-prebranch.test.tsx:10 from `queryByText(...)` toBeNull to `getByText(...)` toBeTruthy. Nothing about the curves or the badge geometry changes; a sighted user now reads that the numbers are an illustration.

Copy:
```
Illustrative, not a forecast
```

Files: `app-next/src/features/onboarding/scenes/TrendHero.tsx`, `app-next/src/features/onboarding/progress/ProgressBadge.tsx`, `app-next/src/features/onboarding/__tests__/finish-prebranch.test.tsx`

First failing tests:
- O15 shows the visible caption "Illustrative, not a forecast" under the trend card
- O02 shows the same caption under the -3h 12m badge
- the trend card still exposes exactly one accessibility description, not two

Decisions: B33 · Order: independent

### #70 [medium, S] Make the setup completion checklist say what is missing and let the user fix it

Make every unchecked `Checklist` row tappable: pass an `onPress` per item from `SetupComplete` that routes to the matching primer step (`/setup/X1`, the apps sheet, the branch primer) or to `/settings/permission/<name>` once setup is done. Change the heading when anything is unchecked — "Almost set" with a body telling the user to tap anything unfinished — and keep "You're all set" plus the existing body only when every row ticks. The user is no longer told they are all set while Screen Time is off and no apps are chosen.

Copy:
```
Almost set
Tap anything unfinished to set it up now.
```

Files: `app-next/src/features/setup/SetupComplete.tsx`, `app-next/src/design-system/Checklist.tsx`, `app-next/src/content/setup.ts`, `app-next/src/features/setup/__tests__/setup-router.test.tsx`

First failing tests:
- SetupComplete headings Almost set when any checklist row is unchecked
- SetupComplete headings You're all set only when every row is checked
- tapping the unchecked Screen Time row routes back to the Screen Time primer
- tapping a checked row does nothing

Decisions: B33 · Order: Land after fix 2 (finding 20): until X3 actually asks a gym user for Location, the Location row is unchecked for a reason the user cannot act on, and a tappable row would route them somewhere setup never took them.

### #71 [medium, M] Replace O10's five bands with the specified 1–12 h slider

B33 reverts O10 to the inventory version and keeps `estimatedDailyMinutes` permanent, so the coarse five-way commitment goes. Rebuild O10 around the existing `design-system/Slider` (which already has haptic step feedback): min 60, max 720, step 30 minutes, with a big live number above it rendered from the current value ("4h 30m" / `onboardingLabels.hoursUnit`) and the existing heading and body unchanged. `setAnswer('estimatedDailyMinutes', value)` writes the exact minute value, so the Time-reclaimed denominator and the dashed estimate baseline are the user's real answer rather than one of five constants. Delete src/content/screenTime.ts and the ScreenTimeChoice scene once nothing references them, and drop the `upper: 481` band boundary with them. The O11–O14 impact math already reads `estimatedDailyMinutes` and needs no change.

Copy:
```
Slider label "Hours scrolling per day" (existing onboardingLabels.hours); live number uses the existing hoursUnit / hourUnit strings.
```

Files: `app-next/src/features/onboarding/screens/O10.tsx`, `app-next/src/features/onboarding/scenes/ScreenTimeChoice.tsx`, `app-next/src/content/screenTime.ts`, `app-next/src/content/onboarding.ts`, `app-next/src/features/onboarding/__tests__/onboarding.test.tsx`

First failing tests:
- O10 renders a slider whose value moves in 30-minute steps between 1 and 12 hours
- dragging to 4h 30m persists estimatedDailyMinutes as 270, not a band constant
- the live number reads back the persisted value when the user returns to O10
- no source file imports screenTimeRanges

Decisions: B33 · Order: independent of the other onboarding-copy fixes but touches the same test file as #26 and #72

### #72 [medium, S] Give O02 and O03 their own headings and record the other rewrites in the inventory

**Planner resolution:** B33 scope only: O02 and O03 headings and the `title.replace` removal. No decision-register edit. The other six headings (O18 included) are an open question for Johan.

B33 names the duplicate O01 heading as one of the three places the screen inventory wins: set `onboardingCopy.O02.title` to "See your progress" and `O03.title` to "Stay in control" (02-screen-inventory.md:26-27), leaving both bodies as shipped, so the user no longer reads "Block apps. Exercise more." three screens running. B33 does not extend to the other six rewrites (O08, O15, O16–O18 and setup X2), so the shipped strings there become the approved ones: update 02-screen-inventory.md's quoted headings to match the code and add a one-line note in 00-decisions.md recording that B33 ratified them, so spec and app agree in one direction. O02.tsx's `title.replace('. ', '.\n')` line-break trick only fires on the old two-sentence title and is harmless on the new one, but drop it from O02/O03 so the heading is not silently reformatted.

Copy:
```
O02 title: "See your progress". O03 title: "Stay in control".
```

Files: `app-next/src/content/onboarding.ts`, `app-next/src/features/onboarding/screens/O02.tsx`, `app-next/src/features/onboarding/screens/O03.tsx`, `plans/rebuild/02-screen-inventory.md`, `plans/rebuild/00-decisions.md`

First failing tests:
- O01, O02 and O03 render three distinct headings
- each intro screen's heading matches the string quoted for it in 02-screen-inventory.md

Decisions: B33 · Order: independent; see notes — the O18 heading is left as shipped and flagged rather than changed

### #73 [medium, S] Reconcile the O06/O07 option lists and stop promising tailoring the app does not do

**Planner resolution:** Ship half (b) only (stop promising tailoring). Half (a), the O06/O07 lists, is an open question for Johan.

Two separable halves. (a) Restore the approved option lists in onboardingChoices.ts: O06 becomes the six inventory bands (Under 18, 18–24, 25–34, 35–44, 45–54, 55+) and O07 the seven inventory options (Student, Employed, Self-employed, Parent at home, Between jobs, Retired, Other), replacing the seven-band age split and the developer/founder/finance/architecture list that no source asks for. (b) `ageBand`, `occupation`, `improveFirst` and `mainReason` are written by `commitPlan` and read by nothing, so the honest fix is the copy, not a new feature: change O06's body from "This helps us tailor your plan" and O07's from "We'll fit your plan around your day" to lines that only claim what happens ("This helps us understand who ExcerLock is for."). O08's "Pick one. You can change it later" is the inventory's own approved string and stays, but the four answers should be attached as PostHog person properties in P2-T07 so the collection has a stated purpose; nothing else reads them and no editor is invented.

Copy:
```
O06 body: "This helps us understand who ExcerLock is for." O07 body: "This helps us understand who ExcerLock is for."
```

Files: `app-next/src/content/onboardingChoices.ts`, `app-next/src/content/onboarding.ts`, `app-next/src/features/onboarding/__tests__/onboarding.test.tsx`, `plans/rebuild/phase-2-backend/P2-T07-posthog-sentry.md`

First failing tests:
- O06 offers exactly the six approved age bands and O07 the seven approved occupations
- neither O06 nor O07 renders a body claiming the plan is tailored
- commitPlan still persists ageBand, occupation, improveFirst and mainReason to the profile

Decisions: B33 · Order: independent; the P2-T07 person-property line is a plan edit, not code, and can land with the same commit

### #104 [low, S] Name the four activities the same way on O03 as everywhere else

`welcomeCopy.activities` is `['Walking','Running','Cycling','Strength training']` while the product has Walking, Gym, Running, Biking (activities.ts, B10) and O20 uses those names. The tiles render icon-only, so the mismatch reaches VoiceOver users rather than sighted ones, but it is still two vocabularies for the same four things six screens apart. Change the array to `['Walking','Gym','Running','Biking']` so ActivityTile's accessibility labels match the picker; better still, derive it from `activities` in src/content/activities.ts so the two lists cannot drift again.

Copy:
```
Activity tile accessibility names: Walking · Gym · Running · Biking
```

Files: `app-next/src/content/welcome.ts`, `app-next/src/features/onboarding/screens/O03.tsx`

First failing tests:
- O03's four activity tiles expose the accessibility names Walking, Gym, Running and Biking
- O03's tile names equal the titles in src/content/activities.ts

Decisions: B10 · Order: independent

## P2-T24 — Analytics and streak surfaces (3 findings)

### #47 [medium, M] Restore the Analytics delta, the three stat tiles, the estimate baseline and the no-conditions empty state

**Planner resolution:** Keeps its four structural additions; the streak-literal sweep belongs to #110.

Four additions plus one vocabulary fix, all against copy that already exists in src/content/analytics.ts. (1) Under the Time-reclaimed hero render `c.delta(model.delta)` when the previous period has measured days, else `c.noComparison`. (2) Replace the two ad-hoc bordered Views with three `StatTile`s — Days met (`c.daysMet`, "{met} of {scheduled}", `c.scheduled`), Current streak (`c.current`), Longest streak (`c.longest`) — and keep the exercise totals as the CompactGroup rows they already are. (3) Pass the onboarding baseline into the top-level chart so the dashed starting-estimate line renders: ComparisonChart already plots the locked-app-minutes series, so add an `estimate?: number` prop that draws the dashed rule and the `c.estimate(baseline)` caption (UsageChart's existing `estimate` handling is the reference implementation). (4) When `rulesStore.rules` is empty, render `EmptyState` with `c.noRules`/`c.noRulesBody` in place of the hero and charts. (5) Rename the CompactGroup heading "How you earned time" to `c.exercise` ("Your movement") — "earned time" is time-bank vocabulary that B1 removed — and move the hero's hardcoded "Time reclaimed", "Compared with your starting screen time", "Exercise" and "Best: N days" literals into analyticsCopy so Analytics obeys the content convention.

Copy:
```
Section heading "Your movement" replaces "How you earned time"; hero labels move verbatim into content: "Time reclaimed", "Compared with your starting screen time".
```

Files: `app-next/src/features/analytics/AnalyticsScreen.tsx`, `app-next/src/features/analytics/ComparisonChart.tsx`, `app-next/src/content/analytics.ts`, `app-next/src/features/analytics/__tests__/analytics.test.tsx`

First failing tests:
- a period with a measured previous period shows "+N min vs previous period"; one without shows "No previous measurement to compare"
- Analytics renders three stat tiles labelled Days met, Current streak and Longest streak, with days met reading "N of M scheduled"
- the comparison chart draws the dashed estimate line and its caption at the onboarding baseline
- with zero conditions Analytics renders the "Make room for movement" empty state and no charts
- no rendered Analytics string contains "earned time"

Decisions: B1, B15, B16 · Order: the numbers behind the tiles only become real once NEW:history-and-streaks persists past days (finding 8); land this UI first against the fixture history, then the tiles light up for free

### #110 [low, S] The Analytics streak tile says it is a current streak, not a period figure

**Planner resolution:** Owns the Analytics literal sweep (`analyticsCopy.current`, `bestEver`); #47 and #112 do not touch those two strings.

Keep the computation — `02-screen-inventory.md:154` asks for current and longest streak as a tile row, and it is correct to compute it from today regardless of the page the user is on — but stop the tile implying otherwise. `AnalyticsScreen` hardcodes `{n}-day streak` and `Best: N days`; replace those with the existing `analyticsCopy.current` ("Current streak") and a new `bestEver` string, so a user paging back to March sees a tile that plainly reads as today's streak next to that period's stats. Pass `today` into `analyticsModel` explicitly for the streak, separate from the period bounds, so the intent is legible in the model rather than incidental.

Copy:
```
current: "Current streak" (already in content/analytics.ts, currently unused by the tile)
bestEver: (n: number) => `Best ever: ${n} days`
```

Files: `app-next/src/features/analytics/analyticsModel.ts`, `app-next/src/features/analytics/AnalyticsScreen.tsx`, `app-next/src/content/analytics.ts`, `app-next/src/features/analytics/README.md`, `app-next/src/features/analytics/__tests__/analytics.test.ts`

First failing tests:
- paging to a previous week leaves the streak tile unchanged and labelled as a current streak
- the streak tile reads from today regardless of the selected period and offset
- the period-scoped tiles beside it do change with the offset

Decisions: B16 · Order: After #8 — until sealed history exists the figure is fixture theatre and the relabelling would be honest about a number that is still fake.

### #112 [low, S] Drop time-bank vocabulary from the Analytics heading

**Planner resolution:** Heading change only ('How you earned time' → `analyticsCopy.exercise`).

Replace the hardcoded "How you earned time" literal at `AnalyticsScreen.tsx:138` with `analyticsCopy.exercise` ("Your movement"), which already exists in the content file and is currently unreferenced. B1 removed the time bank entirely — no allowance, no earned minutes, no rate — and the surviving model is that a met condition opens the apps for the rest of the day, so nothing is earned. Sweep the rest of `AnalyticsScreen.tsx` for literals that belong in `src/content/analytics.ts` (the "{n}-day streak" and "Best: {n} days" strings on the streak tile) and move them, per the content-file law in `src/content/README.md`.

Copy:
```
Your movement
{n}-day streak
Best: {n} days
```

Files: `app-next/src/features/analytics/AnalyticsScreen.tsx`, `app-next/src/content/analytics.ts`, `app-next/src/features/analytics/__tests__/analytics.test.tsx`, `app-next/src/content/__tests__/copy.test.ts`

First failing tests:
- the Analytics per-activity section is headed Your movement
- no screen in app-next renders the words earned time or time bank
- the streak tile reads its labels from analyticsCopy

Decisions: B1, B15, B16 · Order: Independent. Land with the streak-facts work in NEW:history-and-streaks, since the same streak tile is the other thing on that screen still holding literals.
