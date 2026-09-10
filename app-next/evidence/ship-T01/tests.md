# Test evidence

## Typecheck: `tsc --noEmit` in `app-next/` → EXIT 0, no output.

## Targeted suites (new/ported code)

- `jest src/engine` → 29 suites, 104 tests, ALL PASS (signals gait/health/location/motion/placement/timeline, walking selection ×2, nativeIosRuntime).
- `jest src/screentime` → 2 suites, 17 tests, ALL PASS.

## Guardrails (generated `ios/`, never config source)

- `vitest run app-next/guardrails/` → 3 files, 9 tests, ALL PASS (plugin-order ×4, entitlements ×3, infoplist ×2).

## Full suite: `jest --runInBand --silent` → 165 suites, 646 tests: 644 PASS, 2 FAIL (EXIT 1)

Failing suites (both files UNMODIFIED by T01 — `git status` clean for them; pre-existing on the ship baseline, outside T01 ownership):

- `src/design-system/__tests__/DayPicker.test.tsx` — "weekday shortcuts and individual day toggles update the schedule" (`getByRole('button', {name:'Every day'})` not found).
- `src/demo/__tests__/conditions-tabs.test.tsx` — "overlapping conditions pause across tabs and deletion removes their progress".

T01 touches only `app-next/app.json` + `app-next/package.json` (modified) plus new `modules/excerlock-motion`, `plugins`, `targets`, `patches`, `privacy`, `config`, `guardrails`, `src/engine`, `src/screentime`, `scripts/verify-binary.sh` (untracked additions). No domain/feature source altered; T07 owns domain/Activity cuts.
