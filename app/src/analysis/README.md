# Analysis

**Contract.** `analysis` owns the Analysis tab: it turns a run of `DaySummary` records into the readings
that tab shows — this week's earned-versus-spent balance, the streak, the day-by-day ledger and the bar
chart over them. It hides *how* a window is sliced, summed, ordered and formatted; the screen only lays
out. It computes no ledger math of its own and owns no store.

**Invariants.**

- **Reads day summaries, never a journal.** `DaySummary` comes from `@excerlock/ledger` — balance, drain,
  earn, rollover and the §3.13 meaningful-activity verdicts are already decided there and are never
  recomputed here. `packages/` is not modified by this module.
- **Every visual decision comes from `@/ui`.** `Screen`, `Card`, `SectionHeader`, `Glyph` and the theme
  tokens. No colour, radius, font size or gradient is declared in this directory.
- **No chart library.** The week chart is two flex-height `View`s per day (ticket #38). A week of
  two-bar columns is layout, not a charting problem.
- **Every selector is total.** An empty ledger is a first-class input: `selectToday` returns `null`,
  totals return zeros, `buildAnalysisView().isEmpty` is `true`. Nothing throws on day zero.
- **No clock.** "Today" is the last summary on record and weekday arithmetic runs off `dayIndex`, so
  every render is deterministic and every test is stable. Nothing here calls `Date.now()`.
- **Sells, never scolds** (PRD §3.15 Tab 3). A day with no activity reads "No activity" — no red, no ✗.
  A negative earned-versus-spent difference is phrased as drawn from the daily allowance, because that
  is what it is.

## Layout

| Path | Responsibility |
|---|---|
| `model/calendar.ts` | weekday arithmetic over `dayIndex` + the day labels |
| `model/format.ts` | the one minute/day-count formatting surface |
| `model/selectors.ts` | `selectToday` · `selectWeek` · `selectStreak` · `selectTotals` · `selectBars` |
| `model/view.ts` | `buildAnalysisView` — the single read the screen performs |
| `fixtures/daySummaries.ts` | three weeks of derived, self-consistent `DaySummary` records |
| `components/EarnedSpentCard.tsx` | earned vs spent vs the difference, for a window |
| `components/StreakCard.tsx` | current streak · best ever · active days |
| `components/WeekChart.tsx` | the earned/spent bar pairs, built from `View`s |
| `components/DayLedger.tsx` | one row per recorded day, newest first |
| `components/AnalysisEmpty.tsx` | the day-zero state |
| `screens/AnalysisScreen.tsx` | the tab; `app/app/(tabs)/analysis.tsx` is a two-line route over it |

## The fixture

Phase 2 builds UI on mocks (ARCHITECTURE §6). `FIXTURE_DAY_SUMMARIES` is 21 days — Mon 6 Jul through
Sun 26 Jul 2026, three whole Monday-to-Sunday weeks — for a user on a 4 AM boundary with a 30 min/day
allowance and a 60-minute rollover cap.

Only the story is authored: earned minutes, spent minutes and each day's condition activity. Balances,
rollover and the meaningful-activity verdicts are **derived** with the identities `packages/ledger`
guarantees, and `__tests__/fixtures.test.ts` holds the result to them — so the fixture can never drift
into a state the real ledger would refuse to produce. The shape: week 1 finds its feet, week 2 is a
clean eight-day run carrying into week 3's Monday, week 3 stumbles once and then reaches today on a
five-day run. Three quiet days burn the balance to exactly zero.

Swapping in the real feed is one prop: `<AnalysisScreen days={…} />`.

## Not built yet

The PRD's Analysis tab has six blocks (§3.15 Tab 3). This build ships blocks 3 and 4 (partially) plus
the day ledger. Still owed, each blocked on something this module does not own:

- **Weekly recap card** and **Time Reclaimed hero** — need `confessed_daily_minutes` from onboarding.
- **Week/Month/Year segmented control** — needs more than one window of real data.
- **Requirement heat map** (six cell states, kind glyphs, tap-for-detail) — needs the schedule store to
  tell rest days from missed ones.
- **Rest-day-transparent streaks** — same reason; `selectStreak` is the naive per-day chain until then.
- **Per-condition earning breakdown** — needs condition names, which live in the condition store.
- **Milestones shelf** — needs the 22 badge assets (`design/STYLE.md`).

## Tests

`npm run test:app` from the repository root, or `npm run test --workspace app -- analysis` for this
module. Selector, fixture-coherence, formatting, view-model and render tests live in `__tests__/`.
