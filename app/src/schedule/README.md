# Schedule

**Contract.** `schedule` owns the local rules that say whether a ledger day is
scheduled active, recurring rest, holiday, or a one-day override. It provides
one pure classification function, one typed persisted store, calendar-field
conversion, and the Rules editor mounted by Manage. It does not compute
earnings, shields, streaks, recap rows, or heat-map cells.

## The precedence law

`classifyScheduleDay` is the only place where overlapping rules are resolved:

| Priority | Rule | Classification |
| --- | --- | --- |
| 1 | One-day override | `override`, active or rest exactly as chosen |
| 2 | Inclusive holiday range | `holiday`, inactive |
| 3 | Recurring rest weekday | `rest`, inactive |
| 4 | No matching rule | `scheduledActive`, active |

An active override can therefore open a Sunday or holiday for training; a rest
override can excuse an otherwise active weekday. Components and future
consumers do not reimplement that ordering.

Missing schedule data is deliberately the fourth row: **every day is active**.
This is the local-first safety rule. A missing, invalid, or not-yet-hydrated
schedule can never withhold the normal earning and locking economy.

## Ledger days, not a second calendar

Rules are stored against the ledger's integer `dayIndex`. Holiday fields use
`parseCalendarDate` to turn `YYYY-MM-DD` into that index and
`formatCalendarDate` to render it back. The conversion uses UTC getters because
the ledger's timestamps are already local wall-clock milliseconds; there is no
second timezone interpretation.

`classifyScheduleAt` delegates to `@excerlock/ledger`'s `dayIndexFor` with the
same `dayBoundaryOffsetMinutes` held in `LedgerConfig`. Callers convert epoch
time to local wall-clock time once at their edge, exactly as Home already does.
Tests cover midnight, a 04:00 boundary across the New York spring DST jump, and
both inclusive edges of a multi-day holiday.

## Persistence

`store/scheduleStore.ts` persists only:

- `recurringRestWeekdays`
- `holidays`
- `overrides`

under `excerlock.schedule.v1` through Zustand and AsyncStorage. Actions are
removed by `partialize`. `scheduleStorePersistence.ts` treats storage as
untrusted: it filters weekday values, rejects reversed/fractional holiday
ranges, rejects unknown override directions, deduplicates entries, and returns
canonical sorted arrays.

## Manage integration

`ScheduleRulesCard` is mounted under **Your rules** on Manage:

- a switch per weekday expresses “I do not train Sundays”;
- start/end calendar fields add a planned holiday range;
- one date can be forced active or rest in either direction.

The editor writes the schedule store directly. It keeps only unfinished field
text and validation copy in component state; there is no mirrored schedule.

## Follow-ups

This ticket builds the input only. `analysis` and `packages/ledger` are
intentionally untouched. The follow-up work may read the public API in
`index.ts` to make rest-day-transparent streaks, the heat-map schedule states,
and the recap scheduled-day denominator.

## Tests

From the repository root:

```sh
npm run test --workspace app -- --runTestsByPath \
  src/schedule/__tests__/classifyScheduleDay.test.ts \
  src/schedule/__tests__/calendarDates.test.ts \
  src/schedule/__tests__/scheduleStore.test.ts \
  src/schedule/__tests__/ScheduleRulesCard.test.tsx
```

The component and store suites mock AsyncStorage at the native boundary.
RNTL 14's `render` and `fireEvent.press` calls are awaited.
