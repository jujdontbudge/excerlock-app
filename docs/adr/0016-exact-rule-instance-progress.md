---
status: accepted
date: 2026-09-10
---

# 0016: Exact measurements for overnight rule accounting

## Decision

Calendar activity totals remain calendar HistoryDay facts. RuleDay progress is recomputed from exact
measurements against `[midnight(instance.day), min(observedAt, instance.end)]`. Native step checkpoints
are queried for that exact range, not apportioned from daily scalar counts. Checkpoints are keyed by
source timezone, instance midnight and fixed instance end; only an exactly matching cached endpoint may
avoid a query. The serialized detection owner generation-fences querying and durable recording without
changing the independent daily-credit cursor. Root requests unsealed yesterday/today instances on full
reconciliation, never foreground clock ticks. This covers late wakes after an overnight window ends.

Verified walking intervals persist independently of pending projection acknowledgements. Consecutive
verified observations retain the session's origin timezone until negative evidence ends continuity.
Walking attribution uses source-timezone instance frames, not projection-time zone reclassification;
interval unions permit legitimate overlap between yesterday's still-active instance and today's get-ahead
instance. Gym progress uses exact confirmed intervals/confirmation timestamps and unions overlaps.
The event writer helper `progressDay` chooses containing instance day, else today's scheduled day, else null.

## Context

T11 preserves P2-T15 sections 4 and 6. Calendar aggregate projection incorrectly left a Monday 20:00–02:00
rule unmet after Tuesday-morning activity, or credited only Tuesday when both weekdays were scheduled.
A next-day scalar count cannot reveal activity before the 02:00 cutoff. Proportional allocation, assigning
all next-day activity to Monday, or converting steps to minutes would invent evidence.

## Consequences

The same physical activity may legitimately contribute to two overlapping rule-instance measurements;
it is not duplicated in calendar history. Existing earned RuleDays remain latched. Legacy aggregate-only
walking state migrates with no invented intervals; exact native step querying supplies new checkpoints.
Sealing waits until every relevant current/source-zone overnight accounting instance has ended, rather
than freezing a missed day while it still accepts progress after travel. Final unpruned RuleDays are
persisted before the aggregate seal; only after the seal is durable may row/raw retention and pending
acknowledgement run. Thus a crash between stores leaves reconstructable per-rule evidence. Explicit
failed-write recovery runs on full reconciliation, never silently clears a first failed barrier. Already-sealed dates are not reprojected. Exact walking threshold timestamps
come from interval intersections; step metAt uses the earliest observed exact checkpoint that proves it.

Rule edits do not have historical schedule versions; existing immutable seals and monotonic earned rows
remain authoritative. Source-zone walking evidence protects travel/replay ownership, not arbitrary
retrospective reconstruction of edited schedules. Physical pedometer/background timing and store/device
acceptance remain separate gates; mocked checkpoint tests are not device activation proof.

## References

- `plans/ship/T11-detection-adapters.md`, step 8.
- `plans/rebuild/01-product-model.md`, sections 4 and 5.
- `plans/rebuild/phase-2-backend/P2-T15-session-credit-engine.md`, sections 4 and 6.
- `app-next/src/domain/projectInstanceProgress.ts`, `progressDay.ts`, `sealDay.ts`.
- `app-next/src/runtime/detection/HistoryCreditLedger.ts`, `WalkingDurationLedger.ts`.
- ADR0014 (history sealing), ADR0015 (deterministic timezone resolution).
