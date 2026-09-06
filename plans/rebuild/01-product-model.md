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
| **Walking session** | A verified live walking session (state mode). Opens the apps while it is active. |
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
  createdAt: string;               // ISO
  updatedAt: string;
};

type RuleMode =
  | { kind: 'target'; activity: 'walking'; metric: 'steps';   goal: number; place: WalkPlace }
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
};

type WalkingSession = {
  ruleId: string;                  // the state-mode rule it belongs to
  startedAt: string;
  leaseUntil: string;              // Apple's 15-minute renewable lease; a lapsed lease ends the session
  phase: 'verifying' | 'walking' | 'grace' | 'ended';
};
```

Validation (enforced by the builder and by `validateRule`):

- `goal` ranges and steps: steps 500–30,000 in steps of 500 (default 5,000); gym minutes 10–180 (default 30);
  run/bike minutes 5–300 (default 20 run, 30 bike); run distance 0.5–50 km or 0.25–30 mi (default 2 mi / 3 km);
  bike distance 1–200 km or 1–120 mi (default 5 mi / 8 km). Defaults are what onboarding recommends;
  the field is still editable.
- `days` non-empty. `range` window at least 15 minutes long.
- The onboarding recommendation is Mon–Fri, 9:00 AM–9:00 PM, and it is **pre-selected but editable**
  (the handoff's "recommended defaults near the end of setup").

## 3. Lock resolution

One pure function decides what the OS should do. Phase 1 drives it from the fake store; Phase 2 hands its
output to the Screen Time adapter.

```ts
type LockDecision =
  | { state: 'noRulesToday' }                                     // apps open, nothing scheduled today
  | { state: 'beforeWindow';  nextLockAt: string; ruleId: string } // apps open, blocking starts later today
  | { state: 'locked';        activeRuleIds: string[]; nextUnlockHint: UnlockHint }
  | { state: 'unlockedMet';   byRuleId: string; relockAt: string | null } // met today, open until next day's window
  | { state: 'unlockedWalking'; sessionRuleId: string; leaseUntil: string }
  | { state: 'afterWindow';   nextLockAt: string | null };        // today's windows are over, apps open

function resolveLock(input: {
  now: string;                    // ISO
  timezone: string;               // IANA
  rules: Rule[];
  ruleDays: RuleDay[];            // today's and yesterday's rows are enough
  walkingSession: WalkingSession | null;
}): LockDecision;
```

Rules of resolution, in priority order:

1. **Walking session wins.** If a state-mode rule is enabled, scheduled now (its window contains `now`), and
   a `WalkingSession` for it is in phase `walking` or `grace` with `leaseUntil > now`, the result is
   `unlockedWalking`. This beats everything, including an unmet target rule in the same window.
2. **Met wins.** If any enabled non-state rule has `RuleDay.met === true` for the day of the current window
   instance (see §4), the result is `unlockedMet`. `relockAt` is the start of the next window instance of any
   enabled rule that begins on a later day than the day of the met window instance. If a window crosses
   midnight, its instance belongs to the day it started on, and the unlock lasts through its end.
3. **Locked.** If at least one enabled non-state rule is active now and nothing above applies, the result is
   `locked`, listing every active rule. A state-mode rule active now without a live session also contributes
   to `locked`. `nextUnlockHint` is the cheapest thing the user can do (see §6).
4. **Before window.** If no rule is active now but some enabled rule has a window instance starting later
   today, `beforeWindow` with the earliest start.
5. **After window / no rules.** Otherwise `afterWindow` (a window instance ended earlier today) or
   `noRulesToday`.

Consequences Codex must test explicitly:

- Two rules, A (Mon–Fri 9–12) met at 10:00, B (daily 18–22) unmet → at 19:00 the apps are **open**
  (`unlockedMet` by A). Re-lock at B's next start on a later day, which is tomorrow 18:00 — unless A's
  window tomorrow starts first (09:00), in which case `relockAt` is tomorrow 09:00.
- A state rule (while walking, Mon–Fri all day) and a target rule (5,000 steps, Mon–Fri all day): before the
  goal, apps open only during a walking session; after the goal, open for the rest of the day.
- A window 20:00–02:00 met at 23:30 → open through 02:00 and until the next window start (tomorrow 20:00).
- A window 20:00–02:00 not met, at 01:00 the next day → `locked`; the active instance is yesterday's.
- Pausing a rule (`enabled: false`) removes it from every branch above immediately.
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
| walking · state | Walking session verification (cadence + activity classification; treadmill propped path when `place` is `treadmill`/`either` and the phone is propped) | never "met"; opens apps only while live |
| gym · arrival | Geofence entry for a saved gym, or manual check-in inside its radius | first arrival today |
| gym · minutes | Geofence dwell time today (auto-detect) or checked-in time today (manual) | `progress >= goal` |
| running · minutes / distance | HealthKit workouts of type running started today, summed duration / distance | `progress >= goal` |
| biking · minutes / distance | HealthKit workouts of type cycling started today | `progress >= goal` |

Once `met` is true for a day it stays true (no un-meeting when a HealthKit sample is deleted).

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

Hard paywall: the main tabs are reachable only when `Entitlement.status` is `trial` or `active`. `expired` and
`billingIssue` route to the paywall with the matching message. `unknown` shows the splash until resolved (Phase
2 gives it a 3-second budget, then treats it as `none` with a retry on the paywall).

## 10. What the old packages contribute

- `packages/condition-model`: its uniqueness/overlap verdicts and rate kind are obsolete (B4, B5). Its
  `STREAK_FLOORS` and the picker-rule idea survive as constants in `app-next/src/domain/`. Do not import the
  package; copy the two constants with attribution.
- `packages/ledger`: not used.
- `packages/analytics-events`: reused in Phase 2 (see `phase-2-backend/`).
