# ExcerLock `app-next` — Domain Logic Inventory

How locking actually decides, in code, as of the working tree on branch `rebuild/phase-1` (2026-09-07).

All paths are absolute. Root of the shipping app: `/Users/johansardar/ExcerLock/app-next`.
Everything below is from files I opened; anything I did not find is stated as **absent** with the directory checked.

---

## 0. Files in scope and what each one owns

### `src/domain` (pure, no React, no IO)

| File | Lines | Responsibility |
| --- | --- | --- |
| `/Users/johansardar/ExcerLock/app-next/src/domain/types.ts` | 99 | All domain types: `Rule`, `RuleMode`, `Schedule`, `RuleDay`, `WalkingSession`, `LockDecision`, `UnlockHint`, `Permissions`, `Profile`, `Entitlement`, `Session`, `LockedApps`, `DayKey` |
| `/Users/johansardar/ExcerLock/app-next/src/domain/resolveLock.ts` | 50 | The entire lock state machine |
| `/Users/johansardar/ExcerLock/app-next/src/domain/schedule.ts` | 38 | `windowInstances`, `currentInstances`, `isActiveAt`, `nextInstanceStart` |
| `/Users/johansardar/ExcerLock/app-next/src/domain/calendar.ts` | 36 | `dayKey`, `addDays`, `localInstant` (tz + DST math) |
| `/Users/johansardar/ExcerLock/app-next/src/domain/progress.ts` | 9 | `applyProgress` — the only place `met` flips |
| `/Users/johansardar/ExcerLock/app-next/src/domain/unlockHint.ts` | 20 | Which of several locked rules to advertise |
| `/Users/johansardar/ExcerLock/app-next/src/domain/streak.ts` | 22 | `WALKING_STREAK_MINUTES = 10`, `isMetDay`, `streak` |
| `/Users/johansardar/ExcerLock/app-next/src/domain/reclaimed.ts` | 10 | `reclaimedDay`, `reclaimedPeriod` |
| `/Users/johansardar/ExcerLock/app-next/src/domain/validateRule.ts` | 78 | Structural + bounds validation of a `Rule` |
| `/Users/johansardar/ExcerLock/app-next/src/domain/ruleName.ts` | 10 | Display name (not asked for, but it is in `src/domain`) |
| `/Users/johansardar/ExcerLock/app-next/src/domain/scheduleLabel.ts` | 18 | Schedule display label, incl. "ends next day" |
| `/Users/johansardar/ExcerLock/app-next/src/domain/shieldContent.ts` | 16 | Shield copy from an `UnlockHint` |

`/Users/johansardar/ExcerLock/app-next/src/domain/README.md:3-5` states the contract: pure, 100% branch coverage, "DST gaps shift forward by the gap; repeated times use the first occurrence. A cross-midnight instance keeps the day it starts on. Met records latch and never move to a new timezone day."

### `src/state`

Eight persisted zustand stores (`/Users/johansardar/ExcerLock/app-next/src/state/stores.ts:9-18`): `profileStore`, `rulesStore`, `ruleDaysStore`, `sessionStore`, `entitlementStore`, `permissionsStore`, `settingsStore`, `onboardingStore`. Plus `selectors.ts` (React hooks over `resolveLock`), `todayHistory.ts`, `validation.ts`, `createPersistedStore.ts`, `useHydrated.ts`.

### `src/demo`

`FakeRuntime.ts`, `FakeContext.ts`, `clock.ts` (FakeClock), `contextPersistence.ts`, `activityHistory.ts`, `stepCount.ts`, `gymProgress.ts`, `walkingProgress.ts`, `walkTiming.ts`, `places.ts`, `scenarioLoader.ts`, `validateScenario.ts`, `fakes/*` (13 fakes), `scenarios/*` (32 scenarios).

### `src/runtime`

`Runtime.ts` (port bundle type), `createRuntime.ts`, `AppRuntimeProvider.tsx`, `ForegroundGym.ts` (real iOS foreground location wrapper), `NativeGait.tsx`, `NativePlaceSearch.ts`.

### `src/ports`

15 interface files + `models.ts` + `RuntimeControls.ts` + `README.md`.

---

## 1. The `LockDecision` state machine

### 1.1 The six states

`/Users/johansardar/ExcerLock/app-next/src/domain/types.ts:93-99`:

```
| { state: 'noRulesToday' }
| { state: 'beforeWindow'; nextLockAt: string; ruleId: string }
| { state: 'locked'; activeRuleIds: string[]; nextUnlockHint: UnlockHint }
| { state: 'unlockedMet'; byRuleId: string; relockAt: string | null }
| { state: 'unlockedWalking'; sessionRuleId: string; leaseUntil: string }
| { state: 'afterWindow'; nextLockAt: string | null }
```

Note: `LockDecision` has **no** `allPaused`, `noRules`, `permissionNeeded` or `noAppsSelected` state. Those four are invented one layer up, in the *presentation* function `statusContent` (`/Users/johansardar/ExcerLock/app-next/src/features/home/statusContent.ts:50-56`), which short-circuits before it ever looks at `decision.state`. So an app with zero rules, all rules paused, no Screen Time grant, or no apps selected still yields a real `LockDecision` from the domain — the UI just never shows it. Any Phase 2 enforcement that reads `LockDecision` directly will **not** see those four cases.

### 1.2 The decision function

Sole entry point: `resolveLock(input)` at `/Users/johansardar/ExcerLock/app-next/src/domain/resolveLock.ts:12`.

Input (`/Users/johansardar/ExcerLock/app-next/src/domain/resolveLock.ts:5-11`): `{ now: string; timezone: string; rules: Rule[]; ruleDays: RuleDay[]; walkingSession: WalkingSession | null }`. It is pure — no clock, no store, no IO.

Preamble (`resolveLock.ts:13-15`):
- `enabled = rules.filter(r => r.enabled)` — a paused rule is invisible to every subsequent branch.
- `today = dayKey(now, tz)`.
- `active = enabled.filter(r => isActiveAt(r, now, tz))`.

### 1.3 Priority order — exact, in evaluation order

**Priority 1 — `unlockedWalking`** (`resolveLock.ts:16-22`). Returns iff **all four** hold:
1. `session` is non-null;
2. `session.phase` is `'walking'` or `'grace'` (`resolveLock.ts:18`) — **`'verifying'` does not unlock**, and neither does `'ended'`;
3. `Date.parse(session.leaseUntil) > Date.parse(now)` — strict; a lease expiring exactly now is dead (`resolveLock.ts:19`, asserted at `/Users/johansardar/ExcerLock/app-next/src/domain/__tests__/resolveLock.test.ts:42`);
4. the session's rule is in `active` **and** its `mode.kind === 'state'` (`resolveLock.ts:20`). So a walking session whose rule is paused, deleted, outside its window, or not state-mode is ignored entirely.

This is decision **B3** in `/Users/johansardar/ExcerLock/plans/rebuild/00-decisions.md:24` — state mode is the one exception to B2 and it beats a met target. Asserted at `resolveLock.test.ts:24-44`.

**Priority 2 — `unlockedMet`** (`resolveLock.ts:23-32`). This is decision **B2**/**B6** (`00-decisions.md:23`, `:28`): any met rule opens the apps for everyone.

The loop (`resolveLock.ts:23`): `ruleDays.filter(d => d.met).sort((a,b) => b.day.localeCompare(a.day))` — **most recent day first**, lexicographic on `YYYY-MM-DD`. Ties within the same day fall back to the order rows appear in `ruleDays` (`Array.prototype.sort` is stable), i.e. **effectively arbitrary and store-order-dependent** when two rules were met on the same day. Nothing prefers "the rule met earliest today" or "the rule met most recently" — `metAt` is never read by `resolveLock`.

For each met row (`resolveLock.ts:24-31`):
- `rule = enabled.find(r => r.id === row.ruleId && r.mode.kind !== 'state')` — **state-mode rules are excluded from the met path**, which is consistent with `applyProgress` never setting `met` for them (§4.4).
- skip if no such rule, or if `row.day > today` (a future-dated row cannot unlock; `resolveLock.ts:25`, asserted `resolveLock.test.ts:78`).
- `instance = windowInstances(rule, row.day, tz)[0]`; skip if none (`resolveLock.ts:26-27`). This means: a rule that is met on a day it is **not scheduled** for cannot unlock. `instance` is otherwise **unused** — a dead binding whose only purpose is the truthiness check.
- `cutoff = localInstant(addDays(row.day, 1), 0, tz)` — local midnight starting the day *after* the met day (`resolveLock.ts:28`).
- `relockAt = nextInstanceStart(enabled, cutoff - 1 ms, tz)` (`resolveLock.ts:29`) — the earliest window start of **any enabled rule** strictly after 23:59:59.999 of the met day. Subtracting 1 ms is what lets a window that starts exactly at local midnight (an all-day rule) qualify as the relock.
- if `relockAt` exists and `relockAt <= now`, `continue` — this met row has expired; try the next one (`resolveLock.ts:30`).
- otherwise return `{ state: 'unlockedMet', byRuleId: rule.id, relockAt }`.

If `relockAt` is `null` (no enabled rule has any window in the following 8 days), the unlock is returned with `relockAt: null` and **never expires** by this path.

**Priority 3 — `locked`** (`resolveLock.ts:33-40`). If `active.length`:
- `activeRuleIds` = **every** currently-in-window enabled rule id (`resolveLock.ts:39`), not just the one being advertised.
- `rows` = for each active rule, the `RuleDay` rows whose `day` matches that rule's *current window instance's* day (`resolveLock.ts:34-38`). For a cross-midnight window this is the **start** day, not `today`.
- `nextUnlockHint = unlockHint(active, rows)` (§1.5).

**Priority 4 — `beforeWindow`** (`resolveLock.ts:41-45`). All enabled rules' window instances **for `today` only**, filtered to `start > now`, sorted by ISO start string; returns the earliest with its `ruleId`. Because only `today` is scanned, a rule that starts tomorrow does not produce `beforeWindow`.

**Priority 5 — `afterWindow`** (`resolveLock.ts:46-49`). `ended` is true if any window instance from `[today-1, today]` has `dayKey(w.end, tz) === today && w.end <= now` — i.e. *something* finished blocking earlier today. `nextLockAt = nextInstanceStart(enabled, now, tz)`, which scans 8 days and may return `null`.

**Priority 6 — `noRulesToday`** (`resolveLock.ts:49`). The fall-through. Returned when rules exist, none is active, none starts later today, and none ended today — including the case where an enabled rule is scheduled for tomorrow.

### 1.4 Stacking — what happens with several enabled rules on the same day

Answers below follow directly from §1.3; each is stated with the code line that produces it.

| Stack | Result |
| --- | --- |
| **Two target rules, both active, both unmet** | `locked`, `activeRuleIds` contains **both** (`resolveLock.ts:39`). One hint is chosen by `unlockHint` (§1.5). |
| **Two target rules, one met** | `unlockedMet` by the met one (`resolveLock.ts:23-31`) — the unmet one is fully overruled. This is B6 verbatim. |
| **Target met + state rule active, no live session** | `unlockedMet` (the state rule cannot be met, and priority 1 requires a live lease). |
| **Target met + live walking lease** | `unlockedWalking` wins (priority 1 precedes priority 2). Asserted `resolveLock.test.ts:34-38`. |
| **Gym `event` rule + walking `target` rule, gym checked in** | `unlockedMet` byRuleId = gym; both `event` and `target` are `mode.kind !== 'state'` so both are eligible met producers. `applyProgress` treats `event` as met at `progress >= 1` (`progress.ts:6`). |
| **Overlapping windows, one met** | `relockAt` is computed against **all enabled rules**, not the met rule (`resolveLock.ts:29`). The morning-rule-met / evening-rule-unmet case is the headline test: `resolveLock.test.ts:6-23` — met at 09:00–12:00, an 18:00–22:00 rule still unmet, and `relockAt` is **next day 09:00**, not today 18:00. The evening window never re-locks. |
| **Disjoint windows, none active** | Falls to `beforeWindow` (earliest remaining start today) → `afterWindow` → `noRulesToday`. |
| **All-day rule + range rule, all-day met** | `relockAt` = next local midnight (the all-day rule's start; `cutoff - 1 ms` is exactly what admits it). |
| **All-day rule active + range rule active** | `locked` with both ids. |
| **All rules paused** | Every branch filters on `enabled`; result is `noRulesToday` (asserted for a cross-midnight paused rule at `resolveLock.test.ts:77`). The UI overrides this to `allPaused` at `statusContent.ts:51-52`. |

A randomized invariant test (`resolveLock.test.ts:81-113`, 80 seeded iterations, 4 rules) asserts the priority ladder holds and that `resolveLock` is insensitive to disabled rules being present versus filtered out (`resolveLock.test.ts:104`), and that a returned `relockAt` is always strictly in the future (`:110-111`).

### 1.5 `unlockHint` — which locked rule is advertised

`/Users/johansardar/ExcerLock/app-next/src/domain/unlockHint.ts`:
- Throws `'No active rules'` on an empty list (`unlockHint.ts:3`).
- Non-target rules map to an immediate action: `state → 'walk'`, `event → 'arrive'`, with `remaining: null, unit: null` (`unlockHint.ts:6-7`).
- Target rules map to `action: 'progress'`, `remaining = max(0, goal - progress)`, `unit = metric === 'distance' ? mode.unit : mode.metric` (so the unit string is literally `'steps'`, `'minutes'`, `'km'` or `'mi'`) (`unlockHint.ts:8-13`).
- Reduction (`unlockHint.ts:15-19`): the **first** non-`progress` offer encountered wins and is never displaced (`if (best.action !== 'progress') return best`). Among `progress` offers, a later offer replaces the current best **only if the units match and its remaining is smaller** (`unlockHint.ts:18`). Consequence: **remainders in different units are never compared** — "2 mi to run" vs "5,000 steps to walk" resolves to whichever rule appears first in `active`, i.e. the order in `rulesStore.rules`. Asserted at `unlockHint.test.ts:25` and `:29-31`.

### 1.6 Who consumes a `LockDecision`

- `useLockDecision()` — `/Users/johansardar/ExcerLock/app-next/src/state/selectors.ts:20-30`. Memoized over `now` (a 1 s tick), `timezone`, `rules`, `days`, `walkingSession`.
- `HomeScreen` (`/Users/johansardar/ExcerLock/app-next/src/features/home/HomeScreen.tsx:42`, `:50-58`, `:75-89`, `:109-116`).
- `statusContent` (`/Users/johansardar/ExcerLock/app-next/src/features/home/statusContent.ts:28-78`).
- `shieldContent` (`/Users/johansardar/ExcerLock/app-next/src/domain/shieldContent.ts`) consumes an `UnlockHint`, not a `LockDecision`.
- **Nobody calls `ScreenTimePort.applyLock`.** See §8.

---

## 2. Window evaluation

### 2.1 `windowInstances(rule, day, timezone)`

`/Users/johansardar/ExcerLock/app-next/src/domain/schedule.ts:5-18`. Returns 0 or 1 instance.

- **Disabled short-circuit** (`schedule.ts:6`): `if (!rule.enabled ...) return []`. A paused rule has no windows at all.
- **Day-of-week** (`schedule.ts:6`): `rule.schedule.days.includes(new Date(`${day}T12:00:00Z`).getUTCDay())`. The DayKey is anchored at **noon UTC** so no timezone can shift it to an adjacent date; `getUTCDay()` gives 0=Sunday, matching `Weekday` in `types.ts:26`. The weekday is that of the *local* DayKey, which is correct because `day` is already local.
- **All-day** (`schedule.ts:8-9`): `start = 0`, `end = 1440`.
- **Range**: `start = startMinute`, `end = endMinute`.
- **End resolution** (`schedule.ts:15`): `localInstant(end <= start || end === 1440 ? addDays(day,1) : day, end === 1440 ? 0 : end, timezone)`.
  - `end <= start` → **crosses midnight**, ends the next local day. Documented at `types.ts:32`.
  - `end === 1440` (all-day) → next local day at minute 0, i.e. the next local midnight. So an all-day window is exactly `[local midnight, next local midnight)` and **DST-aware**: 23 h on spring-forward, 25 h on fall-back — asserted `/Users/johansardar/ExcerLock/app-next/src/domain/__tests__/schedule.test.ts:30-37`.
  - `end === start` cannot occur: `validateRule` rejects any range under 15 minutes (`validateRule.ts:73`).
- **Day ownership**: the instance keeps `day` = the day it *starts* on, even when it ends the next day (`schedule.ts:13`). Asserted `schedule.test.ts:14-24`; documented `domain/README.md:5`.

### 2.2 `currentInstances` / `isActiveAt`

`/Users/johansardar/ExcerLock/app-next/src/domain/schedule.ts:19-28`. Looks at **yesterday and today only** (`schedule.ts:22`) so a cross-midnight window that started yesterday is found, and filters `start <= now < end` — **inclusive start, exclusive end** (`schedule.ts:24`). Asserted `schedule.test.ts:10-11`.

Because all-day windows are exactly one local day and cross-midnight windows are at most 24 h minus the range, consecutive days never overlap; `currentInstances` therefore returns at most one instance in practice. Nothing in the code enforces that, and `resolveLock.ts:34-37` `flatMap`s over the result as if there could be several.

### 2.3 `nextInstanceStart(rules, after, tz)`

`/Users/johansardar/ExcerLock/app-next/src/domain/schedule.ts:29-37`. Scans a **fixed 8-day horizon** starting at `dayKey(after, tz)` (`schedule.ts:32`), collects every start strictly greater than `after`, sorts lexicographically on the ISO strings (safe — all are `Z`-normalized), returns the first or `null`. If no enabled rule has a window in the next 8 days, callers get `null`: `unlockedMet.relockAt = null` (never re-locks) and `afterWindow.nextLockAt = null` (`statusContent.ts:32` renders `c.noNext`).

### 2.4 Timezone source and `dayKey`

- **Source**: `runtime.clock.timezone()` — `ClockPort.timezone()` (`/Users/johansardar/ExcerLock/app-next/src/ports/ClockPort.ts:4`). In Phase 1 this is `FakeClock.zone` (`/Users/johansardar/ExcerLock/app-next/src/demo/clock.ts:13`), initialised from `scenario.clock.timezone` (`FakeContext.ts:14`) and changeable only via `dev.setTime(now, tz)` (`clock.ts:18-24`, `FakeRuntime.ts:109`). **There is no code anywhere that reads the device timezone or reacts to it changing.** `src/ports/README.md:15` books that as Phase 2: "ClockPort: Phase 2 observes system time and timezone changes." Jest pins `TZ=America/New_York` (`/Users/johansardar/ExcerLock/app-next/jest.config.js:1`).
- **`dayKey(instant, timezone)`** (`/Users/johansardar/ExcerLock/app-next/src/domain/calendar.ts:2-10`): `Intl.DateTimeFormat('en-CA', {timeZone, year, month, day}).formatToParts()`, joined `YYYY-MM-DD`. So "day" means **the local calendar date in the supplied IANA zone**. `DayKey` is typed as `string` (`types.ts:42`) and validated by regex `^\d{4}-\d{2}-\d{2}$` in the store (`/Users/johansardar/ExcerLock/app-next/src/state/validation.ts:30`).
- **`addDays`** (`calendar.ts:11-15`): noon-UTC anchor + `setUTCDate`, sliced back to 10 chars. Immune to DST because it never touches local time.

### 2.5 DST

`localInstant(day, minute, timezone)` (`/Users/johansardar/ExcerLock/app-next/src/domain/calendar.ts:16-35`) converts a wall-clock (day, minute-after-local-midnight) into an instant by fixed-point iteration:

1. Guess `instant = Date.parse(day + 'T00:00:00Z') + minute*60000`.
2. Format that instant in `timezone`, re-parse the formatted wall time as if UTC, and correct by the difference.
3. Repeat at most **3 times** (`calendar.ts:19`); return exactly when `correction === 0` (`calendar.ts:32`), otherwise **return the last guess silently** (`calendar.ts:35`).

Behaviour on DST boundaries, asserted at `schedule.test.ts:38-42`:
- **Spring-forward gap** (a nonexistent local time such as 02:30 on 2026-03-08 in `America/New_York`): the correction never reaches 0, and the loop **shifts the instant forward by the gap** — 02:30 resolves to `2026-03-08T07:30:00.000Z`, i.e. 03:30 EDT.
- **Fall-back fold** (a repeated local time such as 01:30 on 2026-11-01): resolves to `2026-11-01T05:30:00.000Z`, the **first** occurrence (01:30 EDT).

Documented in `domain/README.md:5`. **No DST test exists for `resolveLock` itself** — only for `windowInstances`.

---

## 3. Every timer, cooldown and lease

### 3.1 Walking session phases — `verifying` / `walking` / `grace` / `ended`

The four phases are typed at `/Users/johansardar/ExcerLock/app-next/src/domain/types.ts:56` and persisted-validated at `/Users/johansardar/ExcerLock/app-next/src/state/validation.ts:36`.

**The phase machine itself lives only in the fake.** `/Users/johansardar/ExcerLock/app-next/src/demo/fakes/WalkingFake.ts:19-43` (`play`):
- The script comes from `scenario.walking` or defaults to `{ script: ['verifying','walking','grace','ended'], stepMs: 6000 }` (`WalkingFake.ts:21-24`).
- On every clock tick: `elapsed = now - session.startedAt`; `index = min(script.length-1, floor(elapsed / stepMs))`; `phase = elapsed >= 900000 ? 'ended' : script[index]` (`WalkingFake.ts:26-28`). So each phase lasts exactly `stepMs` (6 s by default) and the whole session is hard-capped at 15 minutes.
- `graceUntil` is `startedAt + (index+1)*stepMs`, and only while `phase === 'grace'` (`WalkingFake.ts:33-35`).
- On `'ended'` the tick subscription cancels itself (`WalkingFake.ts:38-41`).

There is **no cadence, gait or step-rate criterion** driving phases — it is wall-clock time against a fixture script. `src/ports/README.md:7` books the real version for Phase 2: "WalkingPort: Phase 2 implements cadence/gait verification, renewable leases and treadmill framing."

`resolveLock` treats `'verifying'` as locked and `'grace'` as unlocked (`resolveLock.ts:18`; grace asserted at `resolveLock.test.ts:39-41`).

### 3.2 The 15-minute lease — and the absent renewal

- Constant: **`900000` ms, hardcoded twice**, at `/Users/johansardar/ExcerLock/app-next/src/demo/fakes/WalkingFake.ts:55` (`start`) and `:84` (`completeProppedScan`). It is not a named constant anywhere; `src/domain` contains no lease constant (checked all 12 files in `/Users/johansardar/ExcerLock/app-next/src/domain`).
- `types.ts:55` comments the field: "Apple's 15-minute renewable lease; a lapsed lease ends the session."
- **Renewal is absent.** I grepped `app-next/src` and `app-next/app` for `900000`, `leaseUntil`, `renew`: the only writes to `leaseUntil` are the two session-creation sites above. `completeProppedScan` (`WalkingFake.ts:80-88`) *resets* the lease to `now + 15 min` when a propped treadmill scan verifies, and installs a tick watcher that calls `stop()` once `now >= leaseUntil` — that is a one-off re-issue at scan completion, not a renewal loop. The UI shows renewal copy (`c.renewal` at `/Users/johansardar/ExcerLock/app-next/src/features/sessions/WalkingSheet.tsx:92`) with no mechanism behind it.
- Lease expiry is enforced in two independent places, which can disagree: (a) purely computed in `resolveLock.ts:19`; (b) the fake's own watcher at `WalkingFake.ts:86`. A propped session that is never scanned (`WalkingFake.ts:60`: `if (options?.placement !== 'propped') play(...)`) gets **no ticking at all** — its phase stays `'verifying'` forever in the store until the lease timestamp passes, at which point `resolveLock` simply stops unlocking it. Nothing sets it to `'ended'`.
- `NotificationsPort.scheduleWalkLeaseWarning` exists (`/Users/johansardar/ExcerLock/app-next/src/ports/NotificationsPort.ts:6`, faked at `/Users/johansardar/ExcerLock/app-next/src/demo/fakes/NotificationsFake.ts:15`) and is **never called** — grep over `app-next/src` and `app-next/app` finds only the definition and the fake. Decision B14 (`00-decisions.md:36`) requires it.

### 3.3 The stop-grace setting — stored, never used

`settingsStore.stopGrace` defaults to `30` and validates `30..300` seconds (`/Users/johansardar/ExcerLock/app-next/src/state/settingsStore.ts:14`, `:27`); the UI offers 30/60/120/180/300 (`/Users/johansardar/ExcerLock/app-next/src/features/settings/SettingsScreen.tsx:76-78`, `/Users/johansardar/ExcerLock/app-next/src/features/settings/PreferencesPanel.tsx:38`). **No timing code reads it** — grep across `app-next/src` and `app-next/app` returns only those three files plus the store and its test. The `'grace'` phase length is `script.stepMs` (6 s), entirely unrelated.

### 3.4 Gym 30-second presence confirmation

- Constant: `export const PRESENCE_CONFIRM_MS = 30000` at `/Users/johansardar/ExcerLock/app-next/src/features/unlock/useGymUnlock.ts:7` — a **feature-layer** constant, not a domain one.
- Passed to the port: `runtime.gym.checkIn(nearest.id, { milliseconds: PRESENCE_CONFIRM_MS, signal: request.current.signal })` (`useGymUnlock.ts:91`). Contract at `/Users/johansardar/ExcerLock/app-next/src/ports/GymPort.ts:9`: `checkIn(placeId, confirmation?: { milliseconds: number; signal: AbortSignal })`.
- Fake implementation (`/Users/johansardar/ExcerLock/app-next/src/demo/fakes/GymFake.ts:55-94`): rejects immediately if `presence !== 'inside'` (`:57`) or the id is not a saved gym (`:58`); then, if a `confirmation` is supplied, races a `setTimeout(confirmation.milliseconds)` against (a) a presence subscription that rejects with `'Left gym'` the moment presence leaves (`:63`) and (b) the abort signal, which rejects with `'Check-in cancelled'` (`:61`, `:64-65`). Only on the timeout resolving does it call `progress.arrive()` and write progress (`:67-93`).
- The UI runs its own cosmetic 50 ms progress-ring interval over the same duration (`useGymUnlock.ts:62-80`) and uses **3000 ms in preview mode** (`useGymUnlock.ts:66`).
- Losing presence during the hold also resets the ring, bumps a generation token and fires `gym_unlock_lost` (`useGymUnlock.ts:46-53`).
- Real-device wrapper: `foregroundGym.checkIn` (`/Users/johansardar/ExcerLock/app-next/src/runtime/ForegroundGym.ts:78-83`) samples native coordinates first, throws `'Outside saved gym'` if not inside, then delegates to the fake's `checkIn` — so **on device the credit path is still the fake's** (comment at `ForegroundGym.ts:5`: "reward storage remains owned by the demo GymPort").
- `foregroundGym` also runs a **3-second location polling interval** (`ForegroundGym.ts:33-43`) while anything observes location or presence, with a `pending` re-entrancy guard.
- Covered by `/Users/johansardar/ExcerLock/app-next/src/demo/__tests__/session-integrity.test.ts:24-31` (outside check-in rejected) but **the 30 s confirmation timer itself, the abort path and the "left gym mid-hold" path have no test** — every test calls `checkIn(id)` with no `confirmation` argument (`session-integrity.test.ts:44`, `ports.test.ts:37`, `acceptance-integrity.test.ts:19`, `:75`).

### 3.5 Relock time

**No relock timer exists anywhere.** `relockAt` is a pure computed value (`resolveLock.ts:29`) recomputed on every clock tick because `useLockDecision` re-memoizes on `now` (`selectors.ts:26-29`), and `FakeClock` ticks once per second while anyone subscribes (`/Users/johansardar/ExcerLock/app-next/src/demo/clock.ts:37`). Nothing schedules an OS-level relock; nothing calls `applyLock`.

### 3.6 "Rest of window and rest of day" (decision B2)

B2 (`/Users/johansardar/ExcerLock/plans/rebuild/00-decisions.md:23`): "A met rule unlocks the apps for the rest of the blocking window and the rest of the day, no matter what. Apps re-lock at the start of the next day's blocking window."

Implementation: `resolveLock.ts:28-30`. `cutoff` is the **next local midnight after the met day**, and `relockAt` is the first window start of any enabled rule at/after that cutoff. So the implementation is literally "rest of the local day" — later windows on the same day never re-lock, including windows belonging to *other* rules. Directly asserted by `resolveLock.test.ts:6-23`.

A subtle consequence with cross-midnight windows: a rule met at 23:30 inside a 20:00→02:00 window has `row.day` = the start day, so the cutoff is the start day's next midnight — 30 minutes later. The unlock therefore ends at the *next* window start (20:00 the following evening), which is what `resolveLock.test.ts:62-80` asserts (`relockAt: '2026-09-07T20:00:00.000Z'`, still `unlockedMet` at 19:00, `locked` at 20:00).

### 3.7 Before / after window

Neither carries a timer. `beforeWindow.nextLockAt` is the earliest remaining start **today** (`resolveLock.ts:41-45`); `afterWindow.nextLockAt` is `nextInstanceStart` over the 8-day horizon and can be `null` (`resolveLock.ts:49`).

### 3.8 Other timers, for completeness

| Timer | Location | Period |
| --- | --- | --- |
| Fake clock tick | `/Users/johansardar/ExcerLock/app-next/src/demo/clock.ts:37` | 1000 ms, only while subscribed; cleared on last unsubscribe (`clock.ts:40-43`) |
| Foreground location poll | `/Users/johansardar/ExcerLock/app-next/src/runtime/ForegroundGym.ts:33-43` | 3000 ms |
| Gait fixture playback | `/Users/johansardar/ExcerLock/app-next/src/demo/fakes/GaitFake.tsx:30-33` | `1000/15` ms (15 fps) |
| Gym confirmation ring | `/Users/johansardar/ExcerLock/app-next/src/features/unlock/useGymUnlock.ts:67` | 50 ms |
| Support submit latency | `/Users/johansardar/ExcerLock/app-next/src/demo/fakes/SupportFake.ts:7` | 600 ms |

---

## 4. Time-based goals: how progress accrues and when `met` flips

### 4.1 `applyProgress` — the only place `met` changes

`/Users/johansardar/ExcerLock/app-next/src/domain/progress.ts:2-8`:

```ts
if (!Number.isFinite(value)) throw new Error('Invalid progress');
const progress = Math.max(0, value), mode = rule.mode;
const reached = mode.kind === 'target' ? progress >= mode.goal : mode.kind === 'event' && progress >= 1;
const met = mode.kind !== 'state' && (row.met || reached);
return { ...row, progress, met, metAt: met ? (row.metAt ?? now) : null };
```

- `NaN`/`Infinity` throws (`progress.ts:3`).
- Negative values clamp to 0 (`progress.ts:4`).
- `target`: met at `progress >= goal` (inclusive).
- `event`: met at `progress >= 1` — the callers always pass literal `1` (`GymFake.ts:85`, `gymProgress.ts:44`).
- `state`: **never met**, and note `met: mode.kind !== 'state' && ...` actively *clears* a previously true `met` if a rule is somehow re-evaluated as state-mode.
- **Latching**: `row.met || reached` — once met, met stays met even when progress later drops (asserted `progress.test.ts:7`). `metAt` latches to the first instant (`row.metAt ?? now`) and is cleared to `null` whenever `met` is false.

### 4.2 Walking steps, running/biking minutes and distance — `progressSync`

`/Users/johansardar/ExcerLock/app-next/src/features/home/progressSync.ts` (mounted once, for the whole tab stack, at `/Users/johansardar/ExcerLock/app-next/app/(tabs)/_layout.tsx:12`).

- Only handles rules with `mode.kind === 'target'` and `activity !== 'gym'` (`progressSync.ts:25`).
- **Permission gate** (`progressSync.ts:26`): walking requires `permissions.motion === 'granted'`; running/biking require `permissions.health === 'granted'`. Denied → the rule is skipped entirely and no progress is written. Asserted `/Users/johansardar/ExcerLock/app-next/src/features/home/__tests__/live-progress.test.ts:32-41`.
- **Which day gets credited** (`progressSync.ts:27`): `currentInstances(rule, now, tz)[0] ?? windowInstances(rule, today, tz)[0]` — the *current* window instance if one is live (so an overnight window credits its start day), otherwise today's instance. If neither exists the rule is skipped, so **progress is only ever written for a day the rule is actually scheduled**.
- **Walking value**: the latest `steps` from `StepsPort.subscribe` (`progressSync.ts:38`, `:70-73`). This is an **absolute total for the day**, not a delta — decision B8 (`00-decisions.md:34`, "activity done before the window counts") falls out of that because the pedometer total is day-scoped.
- **Running/biking value** (`progressSync.ts:39-48`): sums `HealthPort.workoutsToday(kind)` filtered to the rule's activity; `minutes` summed directly, `distance` summed as `w.km` divided by `1.609344` when `unit === 'mi'`. Also absolute, not incremental.
- **Staleness guard** (`progressSync.ts:15`, `:39`, `:62`): `signalKey()` is `${scenarioId}:${dayKey(now, tz)}`. Workouts are only used if the key they were fetched under still matches, so yesterday's workouts and a previous scenario's workouts cannot leak. Asserted `live-progress.test.ts:42-51` and `:52-53`.
- Writes only changed rows (`progressSync.ts:50-57`).
- Re-runs on: step updates, `rulesStore` changes, `permissionsStore` changes, dev-snapshot changes, and clock ticks that cross a day boundary (`progressSync.ts:69-84`).

### 4.3 Gym minutes and gym arrival

Two writers, both in the demo layer:

**(a) `gymProgress` — the presence clock** (`/Users/johansardar/ExcerLock/app-next/src/demo/gymProgress.ts`). File comment (`:8`): "Local presence clock: time is credited only after a manual or authorized automatic arrival."
- `last` (the accrual anchor) is set by `arrive()` (`:10-12`), cleared to `null` whenever the snapshot is loading or presence is `'outside'` (`:16`).
- **Auto-arrival** (`:17-22`): if `last === null` and presence became non-outside, it arrives automatically **only if** `settingsStore.gymAutoDetect` is on **and** `permissionsStore.location === 'always'`.
- On every clock tick with `last !== null`, not loading, and presence `'inside'` (`:25`): credits `(now - last) / 60000` minutes, advances `last`, and applies it to **every enabled `activity === 'gym'` rule** (`:32-45`) — including `event` rules, which get a literal `1` (`:44`).
- **Which day**: `currentInstances(rule, now, tz)[0]?.day ?? dayKey(now, tz)` (`:36`) — overnight windows credit their start day. Asserted `/Users/johansardar/ExcerLock/app-next/src/demo/__tests__/acceptance-integrity.test.ts:55-92`.
- Also mirrors the minutes into `DevSnapshot.history[today].activity.gym` (`:46-50`) — note the *history* row uses `dayKey(now)` while the *rule day* uses the window's start day, so after midnight in an overnight window the two disagree by one day. `acceptance-integrity.test.ts:90` asserts exactly that split (rule day `2026-09-07` met, history gym minutes on `2026-09-08`).

**(b) `GymFake.checkIn`** (`/Users/johansardar/ExcerLock/app-next/src/demo/fakes/GymFake.ts:55-94`) — after confirmation succeeds it calls `progress.arrive()` and then writes each enabled gym rule: `event` → `1` (met), `target` → **its current progress unchanged** (`:85-87`), so a manual check-in on a minutes-goal rule starts the clock but credits nothing itself.

Accrual stops when presence leaves: `session-integrity.test.ts:41-50` checks in, advances 18 min to reach the 30-minute goal, sets presence outside, advances a further minute, and asserts progress stays at 30.

### 4.4 State-mode walking minutes

`/Users/johansardar/ExcerLock/app-next/src/demo/walkingProgress.ts:4-9` — `writeWalkingProgress` **overwrites** the row with `{ progress: minutes, met: false, metAt: null }`. It does not go through `applyProgress`, so a state rule's row can never be met and any prior `met`/`metAt` on that row is destroyed.

Called from `WalkingFake.ts:36` with `startedAt` (not `now`) as the day source, so all minutes of a session land on the session's **start** day even if it runs past midnight.

Those minutes matter for **streaks only**, via `isMetDay` (`/Users/johansardar/ExcerLock/app-next/src/domain/streak.ts:5-11`): a day counts as met if any enabled rule has a met row, **or** if every enabled rule is state-mode and `walkingMinutes >= WALKING_STREAK_MINUTES` (10, `streak.ts:3`). The "every enabled rule is state-mode" condition means one mixed target rule disables the walking-minutes streak path entirely (asserted `streak.test.ts:21`). Wired up in `/Users/johansardar/ExcerLock/app-next/src/state/todayHistory.ts:24-33`, which passes `max(0, ...progress of today's state-rule rows)`.

### 4.5 Streak

`streak(days, today)` (`/Users/johansardar/ExcerLock/app-next/src/domain/streak.ts:12-21`): considers only rows with `day <= today && scheduled`, sorted ascending. Met → `current++`. Unmet → `current = 0` **unless the row is today**, so today never breaks a streak until it rolls over (asserted `streak.test.ts:11-12`). Unscheduled days are transparent.

### 4.6 Reclaimed time

`/Users/johansardar/ExcerLock/app-next/src/domain/reclaimed.ts`: `reclaimedDay(baseline, usage) = usage === null ? null : max(0, baseline - usage)`; `reclaimedPeriod` filters out `null` and reports `measuredDays`. Missing usage is never fabricated (`state/README.md:5`). Baseline is `profileStore.estimatedDailyMinutes` (`selectors.ts:77`), default 180.

---

## 5. Day rollover, relaunch, clock changes

### 5.1 Day rollover

**There is no rollover job, no midnight timer, no reset routine.** Rollover is emergent:

- Progress rows are keyed `(ruleId, day)` (`types.ts:44-50`), so a new `dayKey` simply misses every existing row and `progressSync`/`selectors`/`gymProgress` synthesize a fresh zeroed row (`progressSync.ts:29-35`, `selectors.ts:44-50`, `gymProgress.ts:37-43`). Asserted `live-progress.test.ts:26-28` and `:52-53`.
- **Old rows are never pruned.** `ruleDaysStore` (`/Users/johansardar/ExcerLock/app-next/src/state/ruleDaysStore.ts`) accumulates one row per rule per scheduled day forever; the only deletion is `deleteRule` removing that rule's rows (`/Users/johansardar/ExcerLock/app-next/src/features/conditions/mutations.ts:20`). At thousands of DAU × years this is an unbounded JSON blob re-serialized to AsyncStorage on every patch, and `resolveLock.ts:23` sorts **all** of it on every clock tick.
- Stale met rows are neutralized only by the `relockAt <= now` check (`resolveLock.ts:30`), which walks the sorted list until one survives. With `relockAt === null` (no enabled rule scheduled in the next 8 days) a very old met row will unlock the apps indefinitely.
- **The walking session is not cleared at midnight.** Nothing zeroes `ruleDaysStore.walkingSession`; it expires only by lease timestamp (`resolveLock.ts:19`) or by reaching phase `'ended'` (`WalkingFake.ts:28`, `:17`), and is set to `null` only by the user pressing Done (`/Users/johansardar/ExcerLock/app-next/src/features/sessions/WalkingSheet.tsx:44`) or by `deleteRule` (`mutations.ts:21`).
- `todayHistory` (`/Users/johansardar/ExcerLock/app-next/src/state/todayHistory.ts`) recomputes today's `scheduled`/`met` from live rules and rows on every read, replacing whatever the fixture history claims (`todayHistory.ts:21-35`).

### 5.2 App relaunch

- `hydrateStores()` (`/Users/johansardar/ExcerLock/app-next/src/state/stores.ts:19-21`) rehydrates all eight stores in parallel; `useHydrated()` (`useHydrated.ts:10-13`) gates the UI.
- Rehydration is **field-by-field validated against fresh defaults**, not against the previous in-memory state: `createPersistedStore.ts:28-31` merges by running `validated(persisted.data, fresh())`, so any field failing its validator falls back to the **initial default**, and unknown keys are dropped. Asserted `/Users/johansardar/ExcerLock/app-next/src/state/__tests__/persist.test.ts:9-14` and `stores.test.ts:10-15`.
- Rules are validated through the full `validateRule` on hydration (`/Users/johansardar/ExcerLock/app-next/src/state/rulesStore.ts:8`) — one malformed rule invalidates the **whole array** (`v.array` requires every element to pass, `validation.ts:12`), so the store silently falls back to `rules: []`. Same shape for `ruleDays` (`ruleDaysStore.ts:7`).
- The walking session is restored as data and then **replayed**: `FakeRuntime` awaits persistence + store hydration and calls `walking.resume()` (`/Users/johansardar/ExcerLock/app-next/src/demo/FakeRuntime.ts:31-48`). `WalkingFake.resume` (`WalkingFake.ts:63-74`) recomputes elapsed time from `session.startedAt`, back-computes the pre-session baseline as `max(0, storedProgress - seconds/60)`, and restarts the script. Sessions already at `'ended'` are left alone (`WalkingFake.ts:67`). Asserted `/Users/johansardar/ExcerLock/app-next/src/demo/__tests__/context-persistence.test.ts:11-18`.
- Demo-only adapter metadata (scenario id, clock instant, timezone, step override, prompt mode, presence, placement) is restored separately by `contextPersistence` (`/Users/johansardar/ExcerLock/app-next/src/demo/contextPersistence.ts:27-62`) under its own key `excerlock-next.fake-context.v1`; a corrupt blob is swallowed so launch is never blocked (`contextPersistence.ts:57-59`, asserted `context-persistence.test.ts:8-10`).
- **`applyLock` is not called on relaunch** (or ever) — see §8.

### 5.3 Clock changes

- `FakeClock.set(now, timezone)` (`/Users/johansardar/ExcerLock/app-next/src/demo/clock.ts:18-24`) validates the instant (`Number.isFinite(Date.parse(now))` → throws `'Invalid clock instant'`) and probes the zone by constructing an `Intl.DateTimeFormat` (which throws on an invalid IANA id), then emits to all listeners and observers. `advance(ms)` accepts any delta including negative (`clock.ts:14-17`) — nothing rejects going backwards.
- **Nothing reacts to a backwards clock jump.** `resolveLock` is pure and simply recomputes, which means: a lease whose `leaseUntil` is now in the future again becomes live; a met row whose `relockAt <= now` was true becomes false again and re-unlocks the apps. `metAt` is never compared to `now`. There is no monotonic clock, no "last seen instant" watermark, and no tamper detection anywhere in `src/domain`, `src/state` or `src/runtime`.
- **Nothing reacts to a timezone change.** `useLockDecision` reads `runtime.clock.timezone()` (`selectors.ts:23`) on each render but that value is not part of a subscription — the re-render is driven by the 1 s clock tick, so a timezone change happens to be picked up within a second in Phase 1 purely as a side effect. `ClockPort` (`/Users/johansardar/ExcerLock/app-next/src/ports/ClockPort.ts`) exposes `subscribe()` with no timezone-change signal. If the timezone shifts, `dayKey(now)` can move to a different calendar date while `RuleDay.day` rows keep their old keys; `domain/README.md:5` asserts "Met records latch and never move to a new timezone day" as intended behaviour, but there is **no test** for it.
- `gymProgress` credits `(now - last)` regardless of sign only in the sense that `Math.max(0, ...)` clamps it (`gymProgress.ts:28`), so a backwards jump credits 0 minutes rather than negative — the one place that defends itself.

---

## 6. Fakes/scenarios only vs. domain code Phase 2 keeps

### 6.1 Real domain — Phase 2 keeps as-is

Everything under `/Users/johansardar/ExcerLock/app-next/src/domain` is pure and stack-free: the lock state machine, window/instance math, tz+DST calendar math, `applyProgress` latching, `unlockHint` ranking, `streak`/`isMetDay`, `reclaimed`, `validateRule`. `/Users/johansardar/ExcerLock/plans/rebuild/04-architecture.md:129` books `app/src/lock/model/lockPrecedence.ts` in the **old** app to be replaced by `domain/resolveLock`.

### 6.2 Feature/state layer — real logic, but outside `src/domain`

Phase 2 must keep or deliberately re-home these; they are not fakes but they are also not covered by the domain's 100%-branch rule:

| Module | Path |
| --- | --- |
| Port-observation → `RuleDay` synchronizer | `/Users/johansardar/ExcerLock/app-next/src/features/home/progressSync.ts` |
| Today-row reconciliation for streak/analytics | `/Users/johansardar/ExcerLock/app-next/src/state/todayHistory.ts` |
| Decision → UI copy, including the four non-domain states | `/Users/johansardar/ExcerLock/app-next/src/features/home/statusContent.ts` |
| Per-rule progress card model + permission gating | `/Users/johansardar/ExcerLock/app-next/src/features/home/progressContent.ts` |
| The 30-second gym confirmation orchestration | `/Users/johansardar/ExcerLock/app-next/src/features/unlock/useGymUnlock.ts` |
| Rule CRUD + cascade delete of rows/session | `/Users/johansardar/ExcerLock/app-next/src/features/conditions/mutations.ts` |
| Persisted-store validation vocabulary | `/Users/johansardar/ExcerLock/app-next/src/state/validation.ts` |
| Real iOS foreground location + geofence-ish presence | `/Users/johansardar/ExcerLock/app-next/src/runtime/ForegroundGym.ts` |
| Real Apple Maps search | `/Users/johansardar/ExcerLock/app-next/src/runtime/NativePlaceSearch.ts` |
| Real gait native module bridge | `/Users/johansardar/ExcerLock/app-next/src/runtime/NativeGait.tsx` |

### 6.3 Fake-only — nothing survives Phase 2

| Behaviour | Where |
| --- | --- |
| Walking `verifying`/`walking`/`grace`/`ended` phase progression | `/Users/johansardar/ExcerLock/app-next/src/demo/fakes/WalkingFake.ts:19-43` |
| The 15-minute lease constant and its one-shot re-issue | `WalkingFake.ts:55`, `:84` |
| `walkedSeconds` script arithmetic | `/Users/johansardar/ExcerLock/app-next/src/demo/walkTiming.ts` |
| Gym minute accrual by clock tick | `/Users/johansardar/ExcerLock/app-next/src/demo/gymProgress.ts` |
| State-walking minute writes | `/Users/johansardar/ExcerLock/app-next/src/demo/walkingProgress.ts` |
| Pedometer totals + auto-increment | `/Users/johansardar/ExcerLock/app-next/src/demo/stepCount.ts`, `/Users/johansardar/ExcerLock/app-next/src/demo/fakes/StepsFake.ts` |
| Locked-app usage minutes | `/Users/johansardar/ExcerLock/app-next/src/demo/fakes/ScreenTimeFake.ts:18-28` |
| Workouts | `/Users/johansardar/ExcerLock/app-next/src/demo/fakes/HealthFake.ts` |
| Six canned Chicago gyms, fixed 100 m radius | `/Users/johansardar/ExcerLock/app-next/src/demo/places.ts` |
| Simulated inside/outside via a 140 m latitude offset | `/Users/johansardar/ExcerLock/app-next/src/demo/fakes/GymFake.ts:16-18` |
| Gait fixture playback at 15 fps | `/Users/johansardar/ExcerLock/app-next/src/demo/fakes/GaitFake.tsx` |
| The whole `FakeClock` (including the 1 s tick that drives every re-render) | `/Users/johansardar/ExcerLock/app-next/src/demo/clock.ts` |
| Adapter-metadata persistence | `/Users/johansardar/ExcerLock/app-next/src/demo/contextPersistence.ts` |
| 32 scenarios | `/Users/johansardar/ExcerLock/app-next/src/demo/scenarios/` |

`createRuntime` hard-refuses a real runtime: `if (mode === 'real') throw new Error('Real runtime is unavailable in Phase 1')` (`/Users/johansardar/ExcerLock/app-next/src/runtime/createRuntime.ts:9`), and `Runtime.kind` is typed `readonly 'fake'` with no other member (`/Users/johansardar/ExcerLock/app-next/src/runtime/Runtime.ts:16`). Two real adapters are already spliced in on iOS device builds outside tests (`createRuntime.ts:11-14`): `foregroundGym` and `nativeGait`.

---

## 7. TODOs, placeholders, and behaviour the tests do not cover

### 7.1 Literal TODO/FIXME markers

**Absent.** I grepped `app-next/src`, `app-next/app` and `app-next/modules` for `TODO`, `FIXME`, `XXX` — zero hits. Everything unfinished is marked either as "Phase 1 placeholder" prose or is simply missing.

### 7.2 Declared placeholders

| Marker | Location |
| --- | --- |
| "Phase 1 offer fixture only. Phase 2 must read Adapty's real offer and prices." | `/Users/johansardar/ExcerLock/app-next/src/content/subscription.ts:1` |
| "Paywall stand-in. Prices and the 7-day trial are placeholders." | `/Users/johansardar/ExcerLock/app-next/src/content/subscription.ts:44` |
| "Phase 1 placeholder legal text." | `/Users/johansardar/ExcerLock/app-next/src/content/legal.ts:1` |
| 11 per-port "Phase 2 implements…" lines | `/Users/johansardar/ExcerLock/app-next/src/ports/README.md:5-15` |
| "device enforcement, instant-relief shielding, background geofencing, lease renewal notifications and handheld hand-off remain Phase 2 work" | `/Users/johansardar/ExcerLock/app-next/src/features/unlock/README.md:11` |
| Empty tab placeholder | `/Users/johansardar/ExcerLock/app-next/src/features/home/TabPlaceholder.tsx:8` |

### 7.3 Dead / unwired code

1. **`ScreenTimePort.applyLock` is never called.** §8.
2. **`SyncPort` is entirely unused.** `SyncFake` returns no-ops (`/Users/johansardar/ExcerLock/app-next/src/demo/fakes/SyncFake.ts:3`); grep over `app-next/src` + `app-next/app` finds no call to `pushRules`, `pushRuleDays` or `sync.pull`.
3. **`NotificationsPort.scheduleWalkLeaseWarning` and `scheduleTrialReminder` are never called.** Only `notifications.request()` is used, at `/Users/johansardar/ExcerLock/app-next/src/features/subscription/TrialScreen.tsx:17`. Decision B14 requires both.
4. **`settingsStore.stopGrace` is never read by timing code.** §3.3.
5. **`instance` in `resolveLock.ts:26` is bound and never used** beyond its truthiness.
6. **`Profile.warmupRating` / `Profile.units`** are stored in two places (`profileStore.units` at `profileStore.ts:28` and `settingsStore.units` at `settingsStore.ts:26`) with no reconciliation.
7. **`WalkingPort.details()` returns a mutable closure value** (`WalkingFake.ts:12`, `:89`) with no subscription, so `WalkingSheet` depends on `useDevSnapshot()` (`WalkingSheet.tsx:20`) purely for its re-render side effect.

### 7.4 Behaviour with no test

Test files read in full: `/Users/johansardar/ExcerLock/app-next/src/domain/__tests__/` (9 files), `/Users/johansardar/ExcerLock/app-next/src/state/__tests__/` (3), `/Users/johansardar/ExcerLock/app-next/src/demo/__tests__/` (13), `/Users/johansardar/ExcerLock/app-next/src/runtime/__tests__/` (2), plus `/Users/johansardar/ExcerLock/app-next/src/features/home/__tests__/live-progress.test.ts`.

Uncovered, by area:

**Lock decision**
- No test for a `'verifying'`-phase session (the `phase` guard at `resolveLock.ts:18` is exercised only via `'walking'`, `'grace'` and expiry).
- No test for **two rules met on the same day** — the sort-tie ordering at `resolveLock.ts:23` is undefined behaviour in practice.
- No test where `nextInstanceStart` returns `null` inside the met branch (`relockAt: null`, a permanent unlock).
- No test that `beforeWindow` ignores tomorrow's windows (the `today`-only scan at `resolveLock.ts:42`).
- No test for `unlockHint` when two `progress` offers have **different** units and different remainders — the "first wins" behaviour at `unlockHint.ts:18` is only exercised at `unlockHint.test.ts:25` with one specific ordering.
- No DST test on `resolveLock` (only on `windowInstances`, `schedule.test.ts:30-43`).
- No timezone-change test at all — the `domain/README.md:5` claim that "met records latch and never move to a new timezone day" is unverified.
- No backwards-clock test.

**Timers**
- The **15-minute lease boundary is never tested end to end**; the only lease assertion is the synthetic `leaseUntil === now` case at `resolveLock.test.ts:42`. Lease renewal has no implementation and therefore no test.
- **`completeProppedScan`'s lease re-issue and its `now >= leaseUntil` watcher (`WalkingFake.ts:84-87`) have no test.**
- **The 30-second gym confirmation has no test** — no test passes a `confirmation` argument to `checkIn`; the abort path (`GymFake.ts:64`) and the "left gym mid-hold" path (`GymFake.ts:63`) are both unexercised.
- **Gym auto-arrival has no test.** `gymProgress.ts:17-22` (auto-arrive when `gymAutoDetect && location === 'always'`) is never reached: `ports.test.ts:40` calls `enableAutoDetect()` but never advances the clock afterwards.
- `foregroundGym`'s 3 s poll, presence transitions and `checkIn` guard have **no test at all** — `createRuntime` only installs it when `Platform.OS === 'ios' && NODE_ENV !== 'test'` (`createRuntime.ts:11`), so every test runs the pure fake.
- `NativeGait` has no test (`/Users/johansardar/ExcerLock/app-next/src/runtime/__tests__/` contains only `runtime.test.ts` and `native-place-search.test.ts`).

**State**
- No test that a single malformed rule wipes the whole `rules` array on hydration.
- No test of `ruleDays` growth or pruning.
- No test that `writeWalkingProgress` clobbers a previously-met row.

**Coverage enforcement**
- `/Users/johansardar/ExcerLock/app-next/jest.config.js:7` sets `coverageThreshold: { './src/domain/': { branches: 100 } }` — **only `src/domain`, only branches, and only when coverage is collected**. `package.json:44` runs `jest --runInBand` with **no `--coverage` flag**, so the threshold does not gate the default test run. `src/state`, `src/demo`, `src/runtime` and every feature module have **no coverage floor**.

---

## 8. `ScreenTimePort.applyLock` — contract, callers, timing

### 8.1 The contract

`/Users/johansardar/ExcerLock/app-next/src/ports/ScreenTimePort.ts:3-9`:

```ts
export interface ScreenTimePort {
  authorizationStatus(): PermissionStatus;
  requestAuthorization(): Promise<PermissionStatus>;
  presentAppPicker(): Promise<LockedApps>;
  applyLock(decision: LockDecision): void;
  observeUsage(callback: (minutes: number | null) => void): Unsubscribe;
}
```

What `applyLock` expects:
- **Input**: the complete `LockDecision` value object (`types.ts:93-99`) — fire-and-forget, **synchronous, returns `void`, no promise, no error channel, no acknowledgement**. There is no way for a caller to learn whether the shield was actually applied.
- **It is a full-state command, not a delta.** The port is expected to reconcile the device shield to whatever the decision says: shield on for `locked`, shield off for `unlockedMet` / `unlockedWalking` / `beforeWindow` / `afterWindow` / `noRulesToday`.
- **It is not told which apps.** The selection lives separately in `rulesStore.lockedApps` (`/Users/johansardar/ExcerLock/app-next/src/state/rulesStore.ts:7`), written only by `presentAppPicker` (`ScreenTimeFake.ts:14`). `LockedApps` carries an **opaque handle** (`types.ts:36-40`, `OpaqueSelectionHandle = { readonly token: string }`) explicitly annotated "never contains app names or bundle ids" — matching FamilyControls' opaque `FamilyActivitySelection`. So `applyLock` must resolve the current selection itself from that stored handle.
- **It is not told the relock instant** even though `unlockedMet.relockAt` and `beforeWindow.nextLockAt` are present in the decision — so a Phase 2 implementation that wants a `DeviceActivitySchedule` has to derive it from the decision fields (they are there; the contract just doesn't call them out).
- **No idempotency contract, no dedupe, no "unchanged" signal**, so a caller ticking once per second would call it 86,400 times a day.

Phase 2 obligation recorded at `/Users/johansardar/ExcerLock/app-next/src/ports/README.md:5`: "ScreenTimePort: Phase 2 implements FamilyControls authorization, opaque selection, shielding and measured usage."

### 8.2 Who calls it, and when

**Nobody. `applyLock` has exactly two occurrences in the entire app** (grep over `app-next/src`, `app-next/app`, `app-next/modules`):

- the interface declaration, `/Users/johansardar/ExcerLock/app-next/src/ports/ScreenTimePort.ts:7`;
- the fake implementation, `/Users/johansardar/ExcerLock/app-next/src/demo/fakes/ScreenTimeFake.ts:17`: `applyLock: (decision) => ctx.log('lock_applied', { state: decision.state })`.

There is **no call site**. The lock decision is computed for display only (`useLockDecision` → `statusContent` → `StatusCard`), and nothing in Phase 1 ever pushes it toward enforcement. Concretely, the following do **not** happen today and are the gap Phase 2 has to close:

| Moment enforcement should fire | Status |
| --- | --- |
| On every `LockDecision` change (clock tick crossing a window/lease/relock boundary) | absent — `selectors.ts:20-30` only memoizes a value |
| On app foreground / relaunch after hydration | absent — `FakeRuntime.ts:31-48` resumes the walking script but never applies a lock |
| On rule create/edit/pause/delete | absent — `mutations.ts` writes stores only |
| On app-selection change | absent — `ScreenTimeFake.presentAppPicker` writes `lockedApps` and returns (`ScreenTimeFake.ts:10-16`) |
| On goal met (`applyProgress` flipping `met`) | absent — `progressSync.ts:52-57` and `gymProgress.ts:51-53` write rows only |
| On walking session start / lease lapse / phase `ended` | absent — `WalkingFake.ts:17`, `:37` write the session only |
| On day rollover / next window start | absent — no scheduler of any kind |

The other three `ScreenTimePort` members **are** used: `authorizationStatus` via `permissionsStore` reads in `statusContent.ts:53`; `requestAuthorization` at `/Users/johansardar/ExcerLock/app-next/src/features/home/HomeScreen.tsx:63`; `presentAppPicker` at `HomeScreen.tsx:60`; `observeUsage` is fed by `ScreenTimeFake.ts:18-28` and consumed for Analytics.

---

## 9. Rule validation bounds (reference, since they bound every goal)

`/Users/johansardar/ExcerLock/app-next/src/domain/validateRule.ts` returns a deduped `RuleIssue[]` (`'identity' | 'mode' | 'goal' | 'days' | 'window'`).

- Identity (`:8-15`): non-empty string `id`, boolean `enabled`, parseable `createdAt`/`updatedAt`.
- Mode (`:16-49`): `mode.activity` must equal `rule.activity` and be one of the four; walking modes need a valid `place`; `state` is walking-only; `event` is gym+`arrival` only.
- Goal bounds (`:32-47`):

| Mode | Min | Max | Extra |
| --- | --- | --- | --- |
| walking steps | 500 | 30 000 | must be a multiple of 500 (`:35`) |
| gym minutes | 10 | 180 | |
| running / biking minutes | 5 | 300 | |
| running distance km | 0.5 | 50 | |
| running distance mi | 0.25 | 30 | |
| biking distance km | 1 | 200 | |
| biking distance mi | 1 | 120 | |

- Days (`:52-58`): non-empty, integers 0–6, no duplicates.
- Window (`:59-76`): `allDay`, or a `range` with integer minutes 0–1439 and **`(end - start + 1440) % 1440 >= 15`** — a minimum 15-minute window, wrap-aware, which also rules out `start === end`.

Note `validateRule` performs **no cross-rule checks** — decision B5 (`00-decisions.md:27`) explicitly allows overlapping rules with "no conflict validation beyond completeness".
