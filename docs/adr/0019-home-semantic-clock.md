---
status: accepted
date: 2026-09-10
---

# 0019: Update Home on semantic time boundaries, not every clock second

## Decision

Keep NativeClockPort and production enforcement/detection cadence unchanged. Home subscribes once to
a semantic clock whose immutable `{now, timezone}` snapshot stays stable inside the surrounding
half-open interval of meaningful UI boundaries. Cache those bounds on rule/RuleDay identity or timezone
changes and boundary crossings; ordinary clock notifications perform only current-time/zone comparisons,
not schedule expansion, history sorting, or Home re-rendering.

Boundaries are local midnight, actual resolved schedule instance starts/ends around today including
overnight ownership, and exact earned `metAt` instants. Crossing in either direction invalidates the
snapshot, including clock rewind. Timezone changes must publish even at the same ISO instant. New
stored facts obtain fresh wall time. Reuse existing deterministic DST resolution, not minute rounding.

Home supplies this time to lock/progress/history/streak hooks. Hooks keep unconditional React hook
ordering and use a no-op subscription when supplied time is present; other callers retain their existing
clock behavior. Include timezone explicitly in memo dependencies rather than relying on stable runtime
object identity. Walking, gym, progress, permissions and runtime status subscriptions remain immediate.

## Context

Home and its nested selectors independently subscribed to the second clock, rebuilding/sorting history
and schedule models on unchanged ticks. Home does not display a continuously ticking duration, while
live state/progress already has dedicated producers. Reducing the shared clock cadence would instead
weaken exact enforcement and is rejected. Minute bucketing misses arbitrary-second earned boundaries.

## Consequences

Stable Home intervals eliminate redundant UI derivation without delaying actual schedule/earned/store
transitions. This is a local behavior optimization, not proof that release startup, battery, or device
performance budgets are met. Device measurements remain T15 acceptance gates.

## References

- `app-next/src/state/homeClock.ts`
- `app-next/src/state/selectors.ts`
- `app-next/src/features/home/HomeScreen.tsx`
- `app-next/src/runtime/NativeClockPort.ts`
- `../../plans/ship/T15-performance.md`
