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
- `evaluateCondition` and `evaluateConditions` consume `{atMs, event, payload}` rows and an explicit
  clock, returning plain `eventFired`, `rateCredit`, `stateEntered`, and `stateExited` outcomes.

## Laws

- Kinds are `state`, `event`, and `rate`; their reward families cannot be mixed.
- Uniqueness is `(kind + signal + source + place)`. Threshold is never part of the key.
- Event and rate conditions on the same signal and source block one another. State conditions only
  conflict with exact duplicates.
- Native sources are offered by their catalog entries. A direct source is hidden until connected;
  impossible coverage stays hidden; weak coverage is selectable but never promoted. Verdicts
  distinguish `isDefaultSource` from vendor `isRecommended` status.
- Active-minutes uses Watch `appleExerciseTime` when samples exist today, otherwise recorded workout
  duration. The two inputs are never added together.
- New users start with no conditions. Meaningful streak activity is 15 credited rate minutes or
  10 sustained state minutes.
- Evaluation reads only rows inside the supplied day and through `nowMs`. Active-window bounds,
  cumulative snapshots, deltas, discrete occurrences, state grace, repeatability, caps, and cooldowns
  are deterministic inputs—there is no ambient time. Cumulative snapshots outside an active window
  establish a baseline but cannot earn; only the movement inside the window is evaluated.

## Configured conditions

Every configured condition has `id`, `catalogId`, `source`, optional `placeId`, optional
`activeWindow`, and kind-specific `settings`. The settings discriminant locks the reward family:

- Event settings carry an event payout (`fixedMinutes`, `restOfDay`, or `setPeriod`), optional
  threshold, repeatability, per-day cap, and cooldown.
- Rate settings carry only `proportionalCredit.minutesPerUnit`. The catalog's fixed quantum is display
  and picker data; the engine evaluates the resulting pure ratio. There is no rate-cap field.
- State settings carry only `sustainedUnlock` and `exitGraceMs`.

An active window stores optional minute-of-day bounds. A start greater than its end is an overnight
window. Event occurrences and metric movement outside it do not earn. A live state enters at the
window start and exits immediately at the window end, without extending enforcement through grace.

## Timeline rows

All rows use the shared fixture shape:

```ts
type SignalTimelineRow =
  | { atMs: number; event: "signalSnapshot"; payload: SignalSnapshotPayload }
  | { atMs: number; event: "signalDelta"; payload: SignalDeltaPayload }
  | { atMs: number; event: "signalOccurrence"; payload: SignalOccurrencePayload }
  | { atMs: number; event: "signalState"; payload: SignalStatePayload };
```

Snapshots are day-cumulative numeric totals. Deltas are incremental numeric changes; negative
corrections produce signed rate-credit adjustments so credited time continues to match the current
total. Occurrences are individually identified events with an optional numeric value. State rows carry
a boolean `active`. Every payload names its signal and source, plus `placeId` when the signal is
place-scoped. Sample and occurrence ids are deduplicated within an evaluation.

## Local verification

```sh
npm install
npx vitest run
npm run typecheck
```
