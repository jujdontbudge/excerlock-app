# state

Persistent application state and selectors. No UI styling.

`todayHistory` replaces today’s fixture completion with actual enabled schedules and RuleDays before streak/analytics selectors read it. Historical usage remains measurement data; missing usage is not fabricated.

Components call zustand stores only through a `use`-prefixed alias (`import { rulesStore as useRulesStore }`): the React Compiler (`app.json` `reactCompiler`) treats only `use*` calls as hooks, and a bare `fooStore((s) => …)` in a component compiles into a conditionally memoized hook that crashes the release build on its first state change ("Should have a queue"). Jest does not run the compiler, so `__tests__/storeHookNaming.test.ts` enforces the alias.

`activityTruthStore` is the in-memory Home ground-truth label (Walking / Sitting / Shaking / Treadmill); `currentActivityTruth(now)` is what the incident snapshot reads, null once stale.
