# T03 — Domain model, stores, ports, fake runtime, scenarios, dev menu

Goal: the pure product model from `01-product-model.md`, the Zustand stores, the port interfaces, the fake
runtime with every scenario in `04-architecture.md` §4, and the hidden dev menu. After this task the app can
boot into any scenario and screens can be built against real state shapes.

## Steps

1. `src/domain/types.ts` — the types from `01-product-model.md` §2, §8, §9, verbatim names.
2. `src/domain/schedule.ts` — `windowInstances(rule, day, tz)`, `isActiveAt(rule, now, tz)`,
   `nextInstanceStart(rules, after, tz)`, `dayKey(instant, tz)`. Tests: weekday sets, cross-midnight windows,
   all-day, timezone change, DST transition day (America/New_York 2026-03-08 and 2026-11-01).
3. `src/domain/resolveLock.ts` — exactly the function in §3 with the priority order. Tests: every bullet in
   §3 "Consequences", plus property-style tests over random rule sets asserting invariants (walking beats
   met beats locked; paused rules are invisible; `relockAt` is always in the future when present).
4. `src/domain/progress.ts` — `applyProgress(ruleDay, value)`, met latching; `src/domain/streak.ts` —
   scheduled/met day math, current and longest streak; `src/domain/reclaimed.ts` — time reclaimed per day and
   per period; `src/domain/validateRule.ts` — ranges from §2; `src/domain/unlockHint.ts` — §6 selection;
   `src/domain/ruleName.ts` — "Walk 5,000 steps", "Arrive at the gym", "Run 2 mi", "Bike 30 minutes",
   "Unlock while walking"; `src/domain/scheduleLabel.ts` — "Mon–Fri · 9 AM–9 PM", "Every day · All day",
   "Sat, Sun · 8 PM–2 AM". All pure, all tested.
5. `src/ports/*.ts` — the eleven interfaces from `04-architecture.md` §3, each in its own file with a README
   sentence on what Phase 2 must implement.
6. `src/state/` — stores with `persist` (AsyncStorage, keys `excerlock-next.<store>.v1`), a validating `merge`
   for every rehydrated field (as the old app does), `partialize` excluding actions. Stores: `profileStore`,
   `rulesStore` (rules + lockedApps), `ruleDaysStore`, `sessionStore`, `entitlementStore`, `permissionsStore`,
   `settingsStore` (units, stopGrace, gymAutoDetect, haptics), `onboardingStore` (step, answers, complete).
   Selectors: `useLockDecision()` (memoized `resolveLock` over stores + clock), `useTodayProgress()`,
   `useStreak()`, `useAnalytics(period)`.
7. `src/demo/` — `FakeRuntime.ts` wiring fake ports to a `Scenario`; `fakes/*.ts` one per port; `scenarios/*.ts`
   every scenario listed in `04-architecture.md` §4 with realistic data (names, 6 weeks of history for
   `analytics-6-weeks`, a cross-midnight rule, overlapping rules); `clock.ts` (scenario time, adjustable, ticks
   every second so countdowns move); `scenarioLoader.ts` (reset stores from a scenario).
   Tests: scenario schema validation for every scenario; loader round-trip; fake clock advance re-evaluates
   `useLockDecision`.
8. `src/runtime/AppRuntimeProvider.tsx` — provides ports; picks `FakeRuntime` unless `EXPO_PUBLIC_RUNTIME=real`.
9. Dev menu (`app/dev.tsx` + `src/features/dev/`): scenario list with "Load" and "Load and keep edits";
   clock controls (+1 h, +1 day, set); permission toggles; entitlement/session toggles; fake-prompt mode
   (grant/deny/ask); analytics log (from `AnalyticsPort` fake); component previews (from T02); "Shield
   preview" entry (screen arrives in T13); "Record flow" helper showing the `xcrun simctl io` command. Entry:
   7 taps on the Settings footer (wired in T12) and `excerlock://dev`.
10. Scenario reachability test suite: for each scenario, mount the router, load the scenario, assert the boot
    gate lands on the expected route (`onboarding/<step>`, `paywall`, or `(tabs)/home`). This suite grows as
    screens land; keep it green.

## Acceptance

- [ ] `src/domain/` at 100% branch coverage (`jest --coverage` threshold in config).
- [ ] Every scenario loads from the dev menu; boot lands where the reachability test says.
- [ ] Changing the fake clock past a window start flips `useLockDecision()` from `beforeWindow` to `locked`
      (integration test).
- [ ] `src/domain/` and `src/onboarding/` have zero React imports (lint rule).
