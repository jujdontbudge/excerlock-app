# T07 — Remove running and biking (B38, B39)

## Result

- `npm run typecheck --workspace app-next`: PASS (exit 0). Log: `final-typecheck.log`.
- `npm run test --workspace app-next -- --runInBand`: 135/137 suites, 512/512
  T07-scoped tests pass; the only 2 failures are pre-existing baseline failures with
  byte-identical failure modes (see Limits). Log: `final-test2.log`.
- `npm run lint --workspace app-next`: exit 0 (0 errors; 6 warnings, 5 pre-existing plus
  1 `require()` warning in the new B38 smoke test, same pattern as the existing builder
  test). Log: `final-lint.log`.
- Acceptance grep `git grep -inE "'running'|'biking'|HealthPort" -- src app` returns ONLY
  `app-next/src/ports/__tests__/healthCapability.test.ts` (the B38 compiled-capability
  smoke test). Verified post-commit; see `grep-acceptance.txt`.

## Tests-first evidence

- `typecheck-after-union.log`: 60 errors captured right after narrowing `Activity` to
  `'walking' | 'gym'` (the first failing test).
- `migration-test-red.log`: the new `src/state/__tests__/rulesMigration.test.ts` (mixed
  store → walking/gym only + note; note consumable; malformed day-row dropped) fails 3/3
  before the migration exists, passes 3/3 after.
- `baseline-test.log` / `baseline.md`: pre-change baseline (523/525 pass) and the lint
  baseline (4 pre-existing errors, all fixed by T07 — including the `WorkoutGoalScreen`
  set-state-in-effect via a render-adjust pattern).

## What changed

- Domain: `Activity = 'walking' | 'gym'`; run/bike `RuleMode`s deleted; `validateRule`
  accepts walking/gym bounds only and rejects retired modes (covered by new rejection cases).
- Ports/runtime: `HealthPort.ts` and `HealthFake.ts` deleted; `health` removed from
  `Runtime`, `Permissions`, `permissionsStore`, `Scenario` (`Workout` type deleted with it).
- Sync/content: `progressSync` is steps-only; `progressContent`/analytics/history shapes are
  walking/gym only; all run/bike copy, cards, builder arms (R1/R2/B1/B2/D), X3 Health branch,
  Health primers/rows/checklist entries removed. O20 offers two cards; O03 artwork is
  walking + gym tiles (same tokens, recentered geometry).
- Icons: `running`/`biking` glyphs removed from `paths`/`solidGlyphs`/`activityLibrary`;
  HabitLoop/TrendHero exercise art swapped to `walking`.
- Stores: `createPersistedStore` gains `sanitize` (per-row filtering on patch + hydration)
  and `migrate` (hydration-only) hooks. `rulesStore` migrates retired rows to a one-line
  `migrationNote` shown once as a dismissible Conditions banner; `ruleDaysStore` drops
  malformed day-rows per-row. `stores.test.ts` updated to the per-row contract.
- Units: `setUnits` always succeeds (no distance goals left); dead range-error UI removed.
- Specs: `01-product-model.md` (union, modes, progress table, Permissions), 
  `02-screen-inventory.md` (O20 two cards, R/B rows removed, X3/permission rows), and P2
  references (T05/T11/T15/T19/T23 annotated as superseded by B38/T07, text preserved).
- Lint: `TabBar` endpoint now references `surface.orangeGradient[2]` (identical value);
  `TimeRangeRow` iOS system values moved to exact-value `surface.well` / `state.switchOn`
  token aliases (pixels unchanged).

## Limits

- Two pre-existing failures are NOT fixed (identical before/after; fixing either needs a
  product decision outside T07):
  1. `conditions-tabs.test.tsx` expects Home to render a header "All conditions are paused"
     and hide the Today section when all rules pause; Home keeps its greeting + Today layout.
  2. `DayPicker.test.tsx` expects an "Every day" shortcut button the `DayPicker` component
     does not render (only 7 day checkboxes exist).
- No simulator boot/use, no physical-device or submission evidence (final gates, per task).
- `git grep` exceptions, all explained rather than worked around:
  - `assets/running-lock*.png` (BootScreen, LoopBrandMark): the shipped icon asset filename.
  - `PaywallSlot` local `running` ref: purchase re-entrancy guard, unrelated.
  - `GaitVisionService.swift` `startRunning/stopRunning`: AVFoundation capture-session
    methods, unrelated to activities.
  - `loop-insert-runner` testID + `loopIntervention.runner` content key: the habit-loop
    intervention stage name ("Exercise first"), not an activity.
  - `running-lock` in the L0 screen-inventory row: the same asset filename.
  - Motion-classification strings: no `running`/`cycling` activity strings exist anywhere
    in `src/` motion code (`motion` is `'walking' | 'still'`, `gait` is
    `'none' | 'walking' | 'still'`), so native detection vocabulary is untouched.
  - `01-product-model.md:171` "session running past its window": prose verb, not the activity.
- Stale onboarding answers (`activity: 'running'`) are not migrated: O20 forces a re-pick
  via `canContinue`, so no corrupt state persists.
- Orphan `ruleDays` rows for retired rule ids are left inert (lock/analytics resolve only
  through enabled rules); `deleteRule` still cascades for live deletes.

Note: the four full-suite raw logs (`baseline-test.log`, `full-after-source.log`,
`final-test.log`, `final-test2.log`, ~500 KB each, mostly RN stack traces) stay local in
this worktree and are intentionally not committed; the committed logs above carry the
results and the red-to-green evidence.
