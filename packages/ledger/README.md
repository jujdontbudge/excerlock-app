# @excerlock/ledger

Pure balance math over an append-only day journal (ARCHITECTURE.md §2). No React,
no React Native, no I/O, no `Date.now()` — every function takes the clock as an
argument and returns plain data. Client-only by rule: the server never computes
balances (PRD §10.1).

```
npm install && npx vitest run    # self-contained; also: npm run typecheck
```

## What it promises

- **Balance / drain / earn / rollover math** — base allowance at the user-set day
  boundary; fixed-chunk and pro-rata rate credits into one shared balance;
  rest-of-day / set-period payouts as *shield holidays* (shields down, balance
  not draining); drain ticks clamped at zero (never negative); rollover with a
  user-set cap; Full Lock is just `baseAllowanceMinutes: 0`; an unset allowance
  is `UNLIMITED`.
- **Idempotent journal** — entries are keyed `(source, id)` (HealthKit anchors,
  workout UUIDs, tick event names map straight in). Replaying any batch is a
  no-op; reduced state is independent of append order; first write wins.
- **Drain-ladder planning + re-arm** (`planDrainLadder`) — the 1-minute ladder as
  absolute cumulative-usage thresholds (#16 M3/M5, `includesPastActivity`
  semantics). Re-arming after any balance change or force-quit is calling it
  again with the current usage count; the final rung lands exactly where the
  balance hits zero.
- **Walk & Scroll session math** (`walk.ts`) — the app-fixed 15-minute unlock
  increment (ticket #4): explicit start, each re-verification renews to exactly
  one increment from now, a lapsed window can never be extended (force-quit caps
  the exploit at one increment). Sessions are always full price: the ladder stays
  armed while balance remains, and at zero balance walking grants access, never
  credit.
- **Desired OS state** (`desiredOsState`) — `{shields: 'up'|'down',
  drainThresholds[]}` for ShieldController to reconcile. Shields are down iff
  balance remains, a holiday is running, or a walk window is active (walking
  beats everything, Full Lock included).
- **Day summaries** (`daySummaries`) — one record per day since the first entry,
  gap days included, kept indefinitely by the store (#14): earned / spent /
  usage / balances / rollover, per-condition totals, and the §3.13
  meaningful-activity verdicts using the app-fixed streak floors (rate ≥ 15 min
  banked, state ≥ 10 sustained min, events on fire). Feeds the Analysis heat
  map, streaks, and Time Reclaimed (`usageMinutes` is the usage input).

## Invariants

- All timestamps are **local wall-clock milliseconds** — the caller converts real
  epoch time once at the edge; days are uniform 24 h in that domain.
- The balance never goes negative; a clamped tick still counts fully toward
  `usageMinutes` (that is what the OS saw).
- At the same instant, earns apply before drains — the user is never shorted.
- `spentMinutes` = minutes actually deducted; `usageMinutes` = everything the
  drain ladder reported, holidays and clamped remainders included.
- `UNLIMITED` is `Infinity`; persistence layers must map it before JSON
  round-trips (JSON.stringify turns it into `null`).
- Streak floors and the walk increment are exported constants, never
  configuration — they are integrity protection, not economy values.

## What it hides / does not do

Schedules, rest days, lock windows, and condition evaluation live above
(condition-model + stores): the journal only ever sees their *outcomes* as
entries. Streak *chaining* across days (rest-day transparency, sick override)
needs schedule knowledge, so it belongs to the store; this package supplies the
per-day predicate (`meaningfulActivity`).

## Fixtures

`fixtures/canonical-day.json` — one full ledger day (4 AM boundary, Full Lock
morning, chunk + rate earns, holiday, clamped drain, sustained walk) replayed
end-to-end through the public surface in `__tests__/replay.test.ts`.

## Files

`src/day.ts` boundary math · `src/journal.ts` idempotent append ·
`src/reduce.ts` day reducer · `src/balance.ts` remainingMinutes ·
`src/ladder.ts` drain ladder · `src/walk.ts` W&S increments ·
`src/desired.ts` desired OS state · `src/summary.ts` day summaries ·
`index.ts` the one public surface.
