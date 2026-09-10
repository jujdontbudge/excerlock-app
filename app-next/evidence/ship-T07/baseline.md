# T07 baseline (pre-change, 2026-09-09)

- `npm run typecheck --workspace app-next`: PASS (exit 0).
- `npm run test --workspace app-next -- --runInBand`: 132/134 suites pass, 523/525 tests pass.
  Full log: `baseline-test.log`.
- Two pre-existing failures, both unrelated to running/biking (schedule/conditions UI drift):
  1. `src/demo/__tests__/conditions-tabs.test.tsx` — "overlapping conditions pause across tabs and deletion removes their progress": cannot find header "All conditions are paused".
  2. `src/design-system/__tests__/DayPicker.test.tsx` — "weekday shortcuts and individual day toggles update the schedule": cannot find button "Every day".
- Snapshots: 14 passed.

- `npm run lint --workspace app-next`: FAILS at baseline (exit 1) with pre-existing errors
  (full log: `baseline-lint.log`):
  - `src/design-system/TabBar.tsx:25` literal color (error).
  - `src/design-system/TimeRangeRow.tsx:9,10` literal colors (2 errors).
  - `src/features/rules/WorkoutGoalScreen.tsx:32` set-state-in-effect (error).
  - Plus unused-import warnings in `ConditionsScreen.tsx` and a require-import warning in
    `builder.test.tsx`. T07 acceptance needs lint green, so the 4 errors are in scope to fix.
