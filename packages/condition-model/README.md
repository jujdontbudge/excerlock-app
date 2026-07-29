# Condition Model

`@excerlock/condition-model` is the pure TypeScript ConditionEngine contract. It owns catalog data,
source coverage, uniqueness/overlap verdicts, and deterministic evaluation of signal timelines. It
does not import React, React Native, stores, clocks, filesystems, or network clients.

## Public seam

Consumers and tests import only `index.ts`.

- `CONDITION_KINDS` declares the strict kind-to-reward mapping.
- `CONDITION_CATALOG` declares every v1 condition and its picker metadata.
- `VENDOR_COVERAGE` records every Tier-1 vendor cell as `promoted`, `weak`, or `impossible`.
- `EMPTY_START_CONDITIONS`, `STREAK_FLOORS`, and `ACTIVE_MINUTES_SIGNAL` expose decided engine data.
- `conditionUniquenessKey`, `conditionsOverlap`, `getPickerVerdict`, and `listPickerVerdicts` own
  builder rules.
- `evaluateCondition` consumes `{atMs, event, payload}` rows and an explicit clock, returning plain
  `eventFired`, `rateCredit`, `stateEntered`, and `stateExited` outcomes.

## Laws

- Kinds are `state`, `event`, and `rate`; their reward families cannot be mixed.
- Uniqueness is `(kind + signal + source + place)`. Threshold is never part of the key.
- Event and rate conditions on the same signal and source block one another. State conditions only
  conflict with exact duplicates.
- Native sources are offered by their catalog entries. A direct source is hidden until connected;
  impossible coverage stays hidden; weak coverage is selectable but never promoted.
- Active-minutes uses Watch `appleExerciseTime` when samples exist today, otherwise recorded workout
  duration. The two inputs are never added together.
- New users start with no conditions. Meaningful streak activity is 15 credited rate minutes or
  10 sustained state minutes.
- Evaluation reads only rows inside the supplied day and through `nowMs`. Active-window bounds,
  cumulative snapshots, deltas, discrete occurrences, state grace, repeatability, caps, and cooldowns
  are deterministic inputs—there is no ambient time.

## Timeline rows

All rows use the shared fixture shape:

```ts
type SignalTimelineRow =
  | { atMs: number; event: "signalSnapshot"; payload: SignalSnapshotPayload }
  | { atMs: number; event: "signalDelta"; payload: SignalDeltaPayload }
  | { atMs: number; event: "signalOccurrence"; payload: SignalOccurrencePayload }
  | { atMs: number; event: "signalState"; payload: SignalStatePayload };
```

Snapshots are day-cumulative numeric totals. Deltas are incremental numeric changes. Occurrences are
individually identified events with an optional numeric value. State rows carry a boolean `active`.
Every payload names its signal and source, plus `placeId` when the signal is place-scoped.

## Local verification

```sh
npm install
npx vitest run
npm run typecheck
```
