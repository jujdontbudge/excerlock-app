# 01 — Product model

This is the domain the whole app is built on. Phase 1 implements it as pure TypeScript in
`app-next/src/domain/` with unit tests, driven by fake signals. Phase 2 feeds it real signals. The types
below are normative: field names, unions and invariants are what Codex implements.

## 1. Vocabulary

| Term | Meaning |
| --- | --- |
| **Rule** (user-facing: "condition") | One exercise requirement with its own schedule. The user's first rule is created in onboarding; more are added in the Conditions tab. |
| **Locked apps** | The single global set of apps and categories the user chose in the system app picker. Every rule locks the same set. |
| **Blocking window** | The days and time range during which a rule locks the apps unless it is met. |
| **Met** | A rule's requirement was satisfied today. Recorded per rule per local day. |
| **Unlocked for the rest of today** | The consequence of any rule being met: the apps are open until the next day's blocking window starts. |
| **Walking session** | A verified live walking session. In `state` mode it opens the apps while it is active; in `target/minutes` mode it books walked minutes toward the goal. |
| **Earned unlock** | The record written the moment a rule is met. It, not the rule, keeps the apps open for the rest of the day (B23). |
| **Day** | A local calendar day, midnight to midnight, in the device's current timezone. |

## 2. Types

```ts
type Activity = 'walking' | 'gym' | 'running' | 'biking';

type Rule = {
  id: string;                      // uuid
  activity: Activity;
  mode: RuleMode;
  schedule: Schedule;
  enabled: boolean;                // false = paused; a paused rule never locks and never counts
  pausedReason?: 'noGym';          // B25: set when the last saved gym was deleted; cleared when a gym is saved
  createdAt: string;               // ISO
  updatedAt: string;
};

type RuleMode =
  | { kind: 'target'; activity: 'walking'; metric: 'steps';   goal: number; place: WalkPlace }   // invalid with place 'treadmill' (B28)
  | { kind: 'target'; activity: 'walking'; metric: 'minutes'; goal: number; place: WalkPlace }   // B28: minutes from the verified session
  | { kind: 'state';  activity: 'walking';                                   place: WalkPlace }
  | { kind: 'event';  activity: 'gym';     trigger: 'arrival' }
  | { kind: 'target'; activity: 'gym';     metric: 'minutes'; goal: number }
  | { kind: 'target'; activity: 'running'; metric: 'minutes'; goal: number }
  | { kind: 'target'; activity: 'running'; metric: 'distance'; goal: number; unit: 'km' | 'mi' }
  | { kind: 'target'; activity: 'biking';  metric: 'minutes'; goal: number }
  | { kind: 'target'; activity: 'biking';  metric: 'distance'; goal: number; unit: 'km' | 'mi' };

type WalkPlace = 'outside' | 'treadmill' | 'either';

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;   // 0 = Sunday, JS convention

type Schedule = {
  days: Weekday[];                 // non-empty
  window: { kind: 'allDay' } | { kind: 'range'; startMinute: number; endMinute: number };
  // startMinute/endMinute are minutes after local midnight, 0..1439.
  // endMinute <= startMinute means the window crosses midnight and ends the next day.
  // startMinute === endMinute is invalid.
};

type LockedApps = {
  handle: OpaqueSelectionHandle | null;   // never contains app names or bundle ids
  appCount: number;
  categoryCount: number;
};

type DayKey = string;              // 'YYYY-MM-DD' in local time

type RuleDay = {
  ruleId: string;
  day: DayKey;
  progress: number;                // steps, minutes, km/mi — in the rule's own metric unit
  met: boolean;
  metAt: string | null;            // ISO, local instant when it became met
  unit?: 'steps' | 'minutes' | 'km' | 'mi'; // optional while rows from the previous schema remain valid
};

type EarnedUnlock = { day: DayKey; ruleId: string; ruleName: string; metAt: string; windowEnd: string }; // B23

type GymVisit = { id: string; placeId: string; enteredAt: string; exitedAt: string | null; source: 'geofence' | 'manual' }; // B31

type WalkingSession = {
  id: string;
  ruleId: string;                  // a state-mode or walking-minutes rule
  placement: 'handheld' | 'propped';
  instanceDay: DayKey;
  startedAt: string;
  verifiedAt: string | null;
  leaseUntil: string;              // 15 minutes from the last verified event; renews indefinitely (B29); a lapsed lease is never revived
  creditedThrough: string;         // high-water mark; credit is a recomputation from timestamps, never an increment
  phase: 'verifying' | 'walking' | 'grace' | 'ended';
  endedAt: string | null;
  endReason: 'stopped' | 'leaseLapsed' | 'windowEnded' | 'dayRollover' | 'ruleChanged' | 'scanFailed' | null;
};
```

Validation (enforced by the builder and by `validateRule`):

- `goal` ranges and steps: steps 500–30,000 in steps of 500 (default 5,000); walking minutes 10–120 in steps
  of 5 (default 20; the minimum equals the 10-minute streak floor); gym minutes 10–180 (default 30);
  run/bike minutes 5–300 (default 20 run, 30 bike); run distance 0.5–50 km or 0.25–30 mi (default 2 mi / 3 km);
  bike distance 1–200 km or 1–120 mi (default 5 mi / 8 km). Defaults are what onboarding recommends;
  the field is still editable.
- `days` non-empty. `range` window at least 30 minutes long (B32; `MIN_WINDOW_MINUTES`). A persisted shorter
  window is widened to 30 at hydration, never dropped.
- Walking place `treadmill` allows only the minutes target and state mode (B28); `outside` and `either` allow
  all three.
- The onboarding recommendation is Mon–Fri, 9:00 AM–9:00 PM, and it is **pre-selected but editable**
  (the handoff's "recommended defaults near the end of setup").

## 3. Lock resolution

One pure function decides what the OS should do. Phase 1 drives it from the fake store; Phase 2 hands its
output to the Screen Time adapter. Above it sits the enforcement gate: `enforcementPlan({ entitlement,
decision })` clears every shield and unregisters every monitor while the entitlement is `expired`,
`billingIssue` or `none` (B21); `unknown` keeps the last applied state. The gate never changes the decision.

```ts
type LockDecision =
  | { state: 'noRulesToday';  nextLockAt: string | null }                        // apps open, nothing scheduled today
  | { state: 'beforeWindow';  nextLockAt: string; ruleId: string; getAheadRuleId: string | null } // blocking starts later today
  | { state: 'locked';        activeRuleIds: string[]; nextUnlockHint: UnlockHint }
  | { state: 'unlockedMet';   byRuleId: string; byName: string; metAt: string; relockAt: string | null }
  | { state: 'unlockedProvisional'; byRuleId: string; placeId: string; holdsUntil: string } // B22: confirmed gym presence
  | { state: 'unlockedWalking'; sessionRuleId: string; leaseUntil: string }
  | { state: 'afterWindow';   nextLockAt: string | null };                        // today's windows are over, apps open

function resolveLock(input: {
  now: string;                    // ISO, already clamped by effectiveNow (watermark) on the enforcement path
  timezone: string;               // IANA
  rules: Rule[];
  ruleDays: RuleDay[];            // today's and yesterday's rows are enough
  earnedUnlocks: EarnedUnlock[];  // today's and yesterday's
  walkingSession: WalkingSession | null;
  gymPresence: { placeId: string; confirmedAt: string; holdsUntil: string } | null; // live, derived from visits, never persisted
}): LockDecision;
```

Rules of resolution, in priority order (this is the only statement of precedence; task files cite it):

1. **Walking session wins.** If a `state` walking rule is enabled, has a window instance containing `now`, and
   a `WalkingSession` for it is in phase `walking` or `grace` with `leaseUntil > now`, the result is
   `unlockedWalking`. A `target/minutes` walking session never reaches this branch: walking toward a goal does
   not open the apps, reaching it does.
2. **Earned unlock wins.** If an `EarnedUnlock` exists with `day === today` or `windowEnd > now`, the result is
   `unlockedMet`, attributed to the earliest `metAt`. The record reads no rule, so pausing, deleting or
   re-scheduling the condition that earned it cannot revoke today's unlock (B23), and a Friday earn never
   unlocks Saturday. `relockAt` is recomputed live: the start of the next window instance of any enabled rule
   on a later day than the earning instance; `null` when no enabled rule has one.
3. **Confirmed presence wins.** If an enabled gym rule has a window instance containing `now` and
   `gymPresence` is set (a visit confirmed for 30 seconds), the result is `unlockedProvisional` while
   `holdsUntil > now` (B22). An `event` rule books `met` at the confirmation with `metAt = enteredAt`; a
   `minutes` rule holds the unlock while presence lasts and books `met` at the goal. Losing presence lets the
   state lapse to `locked`, with no punishment.
4. **Locked.** If at least one enabled rule is active now and nothing above applies, `locked`, listing every
   active rule sorted by window start then `createdAt`. `nextUnlockHint` is the cheapest thing the user can
   do (see §6).
5. **Before window.** If no rule is active now but some enabled rule has a window instance starting later
   today, `beforeWindow` with the earliest start; `getAheadRuleId` names an enabled **target** rule that can be
   progressed before its window, or is `null`.
6. **After window / no rules.** Otherwise `afterWindow` (a window instance ended earlier today) or
   `noRulesToday`; both carry the next start, or `null` when nothing is scheduled ahead.

Consequences Codex must test explicitly:

- Two rules, A (Mon–Fri 9–12) met at 10:00, B (daily 18–22) unmet → at 19:00 the apps are **open**
  (`unlockedMet` by A). Re-lock at B's next start on a later day, which is tomorrow 18:00 — unless A's
  window tomorrow starts first (09:00), in which case `relockAt` is tomorrow 09:00.
- A state rule (while walking, Mon–Fri all day) and a target rule (5,000 steps, Mon–Fri all day): before the
  goal, apps open only during a walking session; after the goal, open for the rest of the day.
- A window 20:00–02:00 met at 23:30 → open through 02:00 and until the next window start (tomorrow 20:00).
- A window 20:00–02:00 not met, at 01:00 the next day → `locked`; the active instance is yesterday's.
- Pausing, deleting or editing a rule that already earned today's unlock keeps the unlock (B23); pausing an
  unmet rule removes it from the locked and before-window branches immediately.
- A rule met on Friday does not unlock Saturday; a met row from a deleted rule still yields `relockAt: null`
  when no enabled rule has a later window.
- Two rules met the same day credit the earlier `metAt`, whatever the store order.
- A walking session running past its window does not unlock; the session ends at window end.
- Rewinding the device clock does not revive an expired lease or an ended unlock (watermark).
- Timezone change: `resolveLock` is re-run with the new `timezone`; `DayKey` values are computed in the new
  zone. Met flags recorded under yesterday's key in the old zone are not re-mapped (accept the edge).

## 4. Window instances

A rule with `days` and a `range` window produces, for each scheduled weekday `d`, an instance starting at
`d startMinute` and ending at `d endMinute` (next day if crossing midnight). An `allDay` window is the instance
`00:00–24:00` of each scheduled day. The **day of an instance** is the local date it starts on. `RuleDay.met`
is recorded against that date.

## 5. Progress and "met"

Progress is measured **from local midnight of the instance day**, not from the window start (decision B8).

| Mode | Progress source (Phase 2) | Met when |
| --- | --- | --- |
| walking · steps | Core Motion pedometer steps since local midnight (`CMPedometer.queryPedometerData` from day start, plus live updates) | `progress >= goal` |
| walking · minutes | Minutes credited by the verified walking session (handheld cadence, or the propped treadmill scan with its 15-minute lease renewed by a re-scan or a handheld verification); the pedometer never feeds it | `progress >= goal` |
| walking · state | Walking session verification (cadence + activity classification; treadmill propped path when `place` is `treadmill`/`either` and the phone is propped) | never "met"; opens apps only while live |
| gym · arrival | A confirmed `GymVisit` (geofence entry or manual check-in, 30-second confirmation) at **any** saved gym (B24) | first confirmed visit today; `metAt = enteredAt` |
| gym · minutes | Dwell summed from `GymVisit` enter/exit timestamps at any saved gym, clipped to the day and merged across overlaps; a visit with the app closed credits in full (B31); a per-day accumulator independent of the window (B8) | `progress >= goal`; the apps are open while presence holds (B22) |
| running · minutes / distance | HealthKit workouts of type running started today, summed duration / distance | `progress >= goal` |
| biking · minutes / distance | HealthKit workouts of type cycling started today | `progress >= goal` |

Once `met` is true for a day it stays true (no un-meeting when a HealthKit sample is deleted). The moment a row
flips to met an `EarnedUnlock` is written (§3). Which day a progress row belongs to is decided by one helper,
`progressDay(rule, at, tz)`: the containing instance's day, else today's instance day if the rule is scheduled
today, else no row at all. Deleting the last saved gym pauses every gym rule with `pausedReason: 'noGym'`
(B25); saving a gym re-enables them.

## 6. Unlock hint (what the locked state tells the user)

`nextUnlockHint` picks, among active unmet rules, the one with the smallest remaining effort, with immediate
actions (arrive at gym, start walking) ranked first, then numeric remainders compared only within the same
unit. Copy examples: "Walk 1,240 more steps", "Arrive at Gold's Gym", "Start a walk to unlock while you walk",
"Run 12 more minutes". This is the same selection law the old `unlockOffer.ts` implements; Phase 2 may port it.

## 7. Streaks and analytics facts

- A **scheduled day** is a day on which at least one enabled rule has a window instance.
- A **met day** is a scheduled day with at least one rule met (state-mode-only days count as met if a walking
  session of ≥ 10 minutes happened; that floor is an app-fixed integrity constant carried over).
- **Streak** = consecutive met days over scheduled days only; unscheduled days are transparent (neither extend
  nor break).
- **Time reclaimed** for a day = `max(0, estimatedDailyMinutes − lockedAppUsageMinutes)` where
  `estimatedDailyMinutes` is the onboarding "hours scrolling per day" answer (never editable after onboarding,
  as today) and usage comes from the usage monitor (Phase 2). Days without a measurement are excluded, and the
  hero says how many days were measured.
- **Weekly recap** rows: time reclaimed this week vs last, days met "N of M scheduled", total activity per
  activity type, current streak.

## 8. Onboarding answers that are not rules

Stored in a `Profile`:

```ts
type Profile = {
  name: string;
  referralSource: string;           // one of the referral options
  ageBand: string;                  // option id
  occupation: string;               // option id
  improveFirst: 'exercise' | 'screenTime' | 'wellness';
  mainReason: string;               // option id from the motivation screen
  estimatedDailyMinutes: number;    // from the scrolling-hours screen; permanent
  units: 'km' | 'mi';               // default from device locale; editable in Settings
};
```

## 9. Subscription and identity (facts the UI needs)

```ts
type Entitlement = { status: 'unknown' | 'none' | 'trial' | 'active' | 'expired' | 'billingIssue'; renewsAt: string | null };
type Session     = { kind: 'anonymous' } | { kind: 'signedIn'; provider: 'apple' | 'google' | 'email'; email: string | null };
type PermissionStatus = 'notDetermined' | 'granted' | 'denied' | 'restricted';
type Permissions = { screenTime: PermissionStatus; motion: PermissionStatus; location: 'notDetermined' | 'whenInUse' | 'always' | 'denied'; health: PermissionStatus; camera: PermissionStatus; notifications: PermissionStatus };
```

Access by status (B21; `domain/entitlementAccess.ts`): `none` → the hard paywall (never subscribed); `trial`
and `active` → the app; `expired` and `billingIssue` → the app stays mounted (Home, Settings, support,
deletion and both ceremonies reachable) with the paywall presented as a dismissible modal, every shield cleared
and every monitor unregistered, Home saying "Blocking is paused"; `unknown` shows the splash inside a 3-second
budget, then falls back to the last persisted known-good status (never to a clear). Adapty's billing grace
period maps to `active` in v1. `Session` carries a `userId` on both variants from first launch.

## 10. What the old packages contribute

- `packages/condition-model`: its uniqueness/overlap verdicts and rate kind are obsolete (B4, B5). Its
  `STREAK_FLOORS` and the picker-rule idea survive as constants in `app-next/src/domain/`. Do not import the
  package; copy the two constants with attribution.
- `packages/ledger`: not used.
- `packages/analytics-events`: reused in Phase 2 (see `phase-2-backend/`).
