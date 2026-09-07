# P2-T16 — Walking duration mode (B28)

Johan's answer to the treadmill trap: the builder keeps place first; Treadmill offers only "Walk for N
minutes" and "Unlock while walking"; Outside and Either offer the step goal as well. The duration target is
new. Findings: 89 (plus the owning entry the critics asked for). Per-finding detail: `docs/audit/fix-map.md`
§ P2-T16. Depends on P2-T14 (types) and P2-T15 (the session minutes it reads).

## 1. Rule shape and validation

```ts
| { kind: 'target'; activity: 'walking'; metric: 'minutes'; goal: number; place: WalkPlace }
```

`validateRule`: walking minutes 10–120 in steps of 5 (default 20, presets 15/20/30); the minimum equals the
streak floor `WALKING_STREAK_MINUTES` (a test asserts the two constants are equal, so a met duration day always
clears the integrity floor). `metric: 'steps'` with `place: 'treadmill'` is **invalid** — B28's filter is
unrepresentable, not merely hidden. `migrateRule` rewrites a persisted steps/treadmill rule to `place:
'either'` instead of dropping it. `ruleName` → "Walk for 20 minutes" (`domainCopy.walkFor`).

## 2. Progress source: the session, never the pedometer

`progressSync` skips `walking/minutes` rules. Minutes arrive only through P2-T15's `creditMinutes` effect
into `applyProgress`, which latches `met` at the goal. A propped treadmill session (camera scan) and a handheld
session (cadence) both feed it. `WalkingPort.start(rule)` accepts a `state` or `target/minutes` walking rule
(port README updated; `WalkingFake` accepts it).

## 3. Builder path (place first)

| Activity | Place | Steps |
| --- | --- | --- |
| walking | outside / either | O20 → W1 → W2 {steps (recommended), minutes, while walking} → W3 (steps) or W4 (minutes) → S1 → S3 |
| walking | treadmill | O20 → W1 → W2 {minutes (recommended), while walking} → W4 → S1 → S3 |

`RuleDraft.walkingMode` becomes `'steps' | 'minutes' | 'state'` (`fromRule`, `answersDraft`,
`rulePreviewModel`, `plan.goalStep`, `onboarding/flow.ts`, `onboarding/validation.ts` follow) plus
`walkMinutes` (default 20). `setPlace` coerces `steps → minutes` when the new place is `treadmill`, so
back-navigation can never park the draft on an invalid pair. W4 reuses `WorkoutGoalScreen` with a `walking`
preset entry; `WalkingScreen` stays small. Copy in `content/rules.ts`: third W2 row "Walk for a set time" /
"Unlocks your apps for the rest of the day", W4 heading, and a Treadmill W1 support line mentioning the camera
check. The onboarding preview lock (`rulePreviewModel`) renders the new mode.

## 4. Surfaces that learn the mode

- Home row: "12 / 20 min walked" (`homeCopy.walkedProgress`); the unlock hint already yields
  `{ action: 'progress', remaining, unit: 'minutes' }` → "Until you walk 8 minutes".
- Entry pills per B27 (P2-T19's `unlockEntries` table): treadmill → treadmill pill; either → both pills;
  outside → handheld pill.
- Ceremony: the treadmill screen runs two stages for a duration rule (P2-T21 owns the screen): scan, then
  counting with the ring bound to `row.progress / goal`, no shackle lift or confetti until `met`. If the goal
  exceeds one 15-minute propped lease, W4 shows "You'll be asked to scan again every 15 minutes".
- Shield copy: "Walk 20 minutes to open your apps" (P2-T14's staleness-safe table gains the unit).
- Streak: a met duration day is a met day; `isMetDay` needs no change.

## 5. Fakes and scenarios

`WalkingFake.start` accepts the mode; scenario `treadmill-duration-rule`; `demo/scenarioLoader.ts` learns the
mode; `ruleDays` validator accepts the unit.

## Tests first

"a treadmill step-goal rule is rejected"; "a persisted steps/treadmill rule hydrates as either";
"walk-for-minutes accepts 10–120 in steps of 5"; "the minimum walk-for-minutes goal equals the streak floor";
"walking minutes latch met at the goal"; "a walking session for a duration rule does not unlock the apps";
"treadmill hides the step goal"; "switching place to treadmill turns a step goal into a minutes goal";
"'Walk for 20 minutes'"; "the pedometer never feeds a minutes rule".

## Doc edits

`01-product-model.md` §2 (RuleMode), validation list, §5 progress table row "walking · minutes";
`02-screen-inventory.md` W2/W3/W4 rows; `docs/specs/aha-unlock-screens.md` (duration rule enters the same
ceremony; two stages).

## Acceptance

- [ ] A treadmill user can build, see, progress and complete a duration rule end to end on the simulator with
      the fake camera scan, and the day counts toward the streak.
- [ ] No path in the builder or the edit flow can produce steps + treadmill.
