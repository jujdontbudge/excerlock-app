# P2-T19 — Home for stacked conditions

Home must tell the truth for any number of conditions, any mix of kinds, and every state the domain can
produce. Decisions: B2, B3, B5, B6, B7, B9, B11, B20, B21, B23, B27. Findings: 6, 14, 19, 28, 33, 34, 36, 42,
60, 67, 74, 77, 78, 85, 92, 103, 109, 113. Per-finding detail: `docs/audit/fix-map.md` § P2-T19. Depends on
P2-T14, P2-T15, P2-T16, P2-T17.

## 1. The lock card slot contract (write first, then land findings in this order: 6 → 14 → 34/33/36 → 74/109 → 85)

`BlockingScheduleCard` has exactly these slots: header glyph (`closed | open | alarm`), status title, status
subtitle, the day timeline (every window today, from P2-T14's `mergedLockIntervals` over one day), and
**children rows**. The `action` prop is deleted: `{action ?? children}` (`BlockingScheduleCard.tsx:77`) is the
whole of finding 6. Entry pills are rows, so a gym pill and a step-goal row appear together. `ProgressCard` in
`lock` appearance keeps its title; the duplicate white name list is removed (14) in favour of one `ConditionRow`
per rule: icon + name + value/goal on one row, bar under it, 0–2 white pills. "Edit / Add" stays below the lock
so "Add condition" is always reachable (109); the inert History row and the duplicate Analytics row go (74;
coordinate the JSX block with P2-T13's test-button removal).

`src/domain/conditionState.ts` (NEW) is the single computation of a rule's state today:
`met | live | blockingNow | satisfiedToday | inProgress | paused | pausedNoGym | notScheduled | permissionNeeded`.
`RuleCard` (P2-T20) and `ConditionRow` both render it through one `status: { text, tone }` prop.

## 2. Entry pills (B27; findings 28, 78, 113)

`features/unlock/entry.ts` becomes `unlockEntries(rule): ('gym' | 'treadmill' | 'handheld')[]`:

| Rule | Pills |
| --- | --- |
| gym event / gym minutes | "I'm at the gym" |
| walking `state` or `minutes`, place treadmill | "I'm using a treadmill" |
| … place either | "I'm using a treadmill" + "I'm walking with my phone" |
| … place outside | "I'm walking with my phone" |
| walking steps, running, biking | none |

The handheld pill opens `WalkingSheet` with handheld placement; the sheet loses its unreachable treadmill
block and the `treadmillFraming()` call (78, 113 folded), gains an error slot for a failed start (103) and
the `notScheduled` copy when the window has not opened (P2-T15 refusal; finding 106 is rendered here).
Scenario `walking-state-outdoor` added.

## 3. The state table (one owner; updates `02-screen-inventory.md` §H once)

`statusContent`'s chain is order-sensitive. Final order: `lapsed` (P2-T18 strings) → `enforcementFailed`
(P2-T17) → `permissionNeeded` → `noAppsSelected` → `noRules` → `allPaused` → decision states. Rows:

| Decision / status | Home shows |
| --- | --- |
| `lapsed` | "Blocking is paused" · "See plans" |
| `enforcementFailed` | closed lock, "Blocking couldn't be applied" · retry |
| `permissionNeeded`, `noAppsSelected` | **closed/alarm lock and a "Nothing is being blocked" headline**, distinct from the rest-day copy, with the fix action (33). A `state` or gym rule whose sensor is denied shows the denial, not "Start a walk" (19, 77: one hoist in `progressContent`) |
| `locked`, any number of rules | "Apps are blocked" headline plus `nextUnlockHint` in **every** locked row, single rule included (34); one `ConditionRow` per rule ordered by window start; "N apps · M categories" from `describeSelection` (60) |
| `locked`, gym + step goal | both rows; the gym row carries the pill, the step row keeps its numbers (6) |
| `locked`, walking either | one row, two pills |
| `locked`, walking treadmill minutes | "0 / 20 min walked", treadmill pill |
| `locked`, `lastClaimAt === null` | claim-pending line "Checking today's activity…" (42) |
| `locked`, gym rule paused for no gym | greyed row "Paused — save a gym" → `/settings/gyms` (92) |
| `unlockedMet` | open shackle, "Unlocked for the rest of today", "Unlocked by {byName}" (36); a later unmet window reads "Satisfied by {byName} today" (67); after a foreground refresh flipped the row: "Unlocked — we caught up while the app was closed" (42) |
| `unlockedProvisional` | open shackle, "Unlocked while you're here", "{n} minutes counts the day" for a minutes rule |
| `unlockedWalking` | lease clock on that row + Stop; other rows keep their numbers |
| `beforeWindow` | "Blocking starts at 9:00 AM"; "Get ahead" only when `getAheadRuleId` is set (95) |
| `afterWindow`, `noRulesToday` | `StatusCard` with "Blocking resumes {day} at {time}" from `nextLockAt` (39) |

Copy in `content/home.ts`: `handheldEntry`, `unlockedBy`, `satisfied`, `pausedNoGym`, `walkedProgress`,
`claimPending`, `caughtUp`, `blockedHeadline`, `nothingBlocked`, `resumes`.

## Tests first

`design-system/__tests__/BlockingScheduleCard.test.tsx` (NEW): "an action row and progress rows both render".
`features/home/__tests__/home-multi-rule.test.tsx` (NEW): "every condition scheduled today has a row with its
name and its number"; "a gym pill and a step-goal row appear together"; "a place-either rule shows two pills";
"the unlocked day names the condition that unlocked it"; "an unmet evening condition says it is satisfied
today"; "two windows are drawn on one timeline"; "a single locked condition shows the blocked line and the
unlock hint"; "Screen Time denied does not render the rest-day headline"; "a goal reached while the app was
closed unlocks on the next foreground and says so"; "a rest day says when blocking resumes". One home for
`statusContent` assertions: `src/demo/__tests__/home-status.test.ts` (no second `home-status.test.tsx`).

## Acceptance

- [ ] Scenarios `home-two-conditions-locked`, `home-met-second-window`, `walking-either-two-pills`,
      `walking-state-outdoor` exist and are in the dev menu.
- [ ] `02-screen-inventory.md` §H state list matches the table above.
