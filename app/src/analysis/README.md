# Analysis

**Contract.** `analysis` owns the Analysis tab: it projects Home's real journal through the ledger's
`daySummaries()` read model, then turns that ascending `DaySummary` record into the readings the tab
shows — the weekly recap, the Time Reclaimed hero, the selected Week/Month/Year trend, the streak, the
per-condition earning breakdown and the day-by-day ledger. It hides *how* a window is projected, sliced,
summed, ordered and formatted; the screen only lays out. It computes no ledger math of its own and owns
no store: it only reads Home's journal/config/condition names and onboarding's confession.

**Invariants.**

- **One journal adapter, no duplicate ledger.** `model/dayRecord.ts` is the only journal-facing seam and
  delegates directly to `daySummaries(journal, ledgerConfig, throughMs)`. Balance, drain, earn, rollover
  and the §3.13 meaningful-activity verdicts are decided by `@excerlock/ledger` and are never recomputed
  here. The real `ledgerConfig`, including `dayBoundaryOffsetMinutes`, crosses that seam unchanged.
- **Every visual decision comes from `@/ui`.** `Screen`, `Card`, `SectionHeader`, `Glyph` and the theme
  tokens. No colour, radius, font size or gradient is declared in this directory.
- **No chart library.** The week chart is two flex-height `View`s per day (ticket #38). A week of
  two-bar columns is layout, not a charting problem.
- **Every selector is total.** An empty ledger is a first-class input: `selectToday` returns `null`,
  totals return zeros, `buildAnalysisView().isEmpty` is `true`. Nothing throws on day zero.
- **Missing attribution is not zero.** `ConditionDaySummary.earnedMinutes` is optional so summaries
  written before ledger attribution can live forever. If any record for a condition lacks it, that
  condition's window reads `not recorded`; an explicit `0` remains `0m`.
- **No clock.** `AnalysisScreen` accepts `throughMs` when its caller has a render instant; otherwise the
  latest journal event is the deterministic cutoff. "Today" is the last summary on record and weekday
  arithmetic runs off `dayIndex`. Nothing here calls `Date.now()`.
- **The confession is read, never written.** `confessed_daily_minutes` (#43) is a fixed
  life-before-ExcerLock snapshot — PRD §3.13 forbids editing it, because a tunable baseline turns the
  hero into a vanity dial. `AnalysisScreen` subscribes to `useConfessionStore`; every layer below it
  takes the baseline as a plain argument, so the whole model stays pure and store-free.
- **Condition names are joined, never copied into the ledger.** Summaries persist immutable condition
  ids. `AnalysisScreen` reads `useHomeStore`, resolves the current catalog names and passes a plain map
  into the model; fixture tests pass the fixture's equivalent map explicitly.
- **Sells, never scolds** (PRD §3.15 Tab 3). A day with no activity reads "No activity" — no red, no ✗.
  A negative earned-versus-spent difference is phrased as drawn from the daily allowance, because that
  is what it is. The same applies to the arithmetic: Time Reclaimed clamps per day, and where the clamp
  hides something the card states it as a number rather than a verdict (below).

## Layout

| Path | Responsibility |
|---|---|
| `model/calendar.ts` | weekday arithmetic over `dayIndex` + the day and date-range labels |
| `model/conditionBreakdown.ts` | joins condition ids to names and totals optional attributed earnings without turning missing history into zero |
| `model/dayRecord.ts` | the sole Home-journal adapter; delegates to `daySummaries()` with the real config and an injected cutoff |
| `model/format.ts` | the one minute/day-count formatting surface |
| `model/selectors.ts` | `selectToday` · Week/Month/Year period selection · streaks · totals · bars |
| `model/timeReclaimed.ts` | `selectTimeReclaimed` — the PRD §3.13 formula over any window |
| `model/recap.ts` | `buildRecap` — the weekly recap's five rows |
| `model/view.ts` | `buildAnalysisView` — the single read the screen performs |
| `fixtures/daySummaries.ts` | three weeks of derived, self-consistent `DaySummary` records for tests and E2E |
| `components/RecapCard.tsx` | the week in five rows, led by its Time Reclaimed and delta |
| `components/TimeReclaimedHero.tsx` | the month's hero numeral and what sits under it |
| `components/EarnedSpentCard.tsx` | earned vs spent vs the difference, for a window |
| `components/ConditionBreakdownCard.tsx` | per-condition banked minutes, legacy `not recorded`, and the no-earnings state |
| `components/StreakCard.tsx` | current streak · best ever · active days |
| `components/PeriodControl.tsx` | accessible Week/Month/Year selection |
| `components/WeekChart.tsx` | the selected window's earned/spent bar pairs, built from `View`s |
| `components/DayLedger.tsx` | one row per recorded day, newest first |
| `components/AnalysisEmpty.tsx` | the day-zero state |
| `screens/AnalysisScreen.tsx` | joins the read-only stores, owns selected-period UI state and lays out the tab |

## The fixture

`FIXTURE_DAY_SUMMARIES` remains for unit/render tests and E2E scenarios. It is never the production
default. The fixture is 21 days — Mon 6 Jul through Sun 26 Jul 2026, three whole Monday-to-Sunday weeks
— for a user on a 4 AM boundary with a 30 min/day allowance and a 60-minute rollover cap.

Only the story is authored: earned minutes, spent minutes and each day's condition activity. Balances,
rollover, meaningful-activity verdicts and the requirement that condition attribution sums to the day's
banked total are held to the identities `packages/ledger` guarantees by
`__tests__/fixtures.test.ts` — so the fixture can never drift into a state the real ledger would refuse
to produce. The shape: week 1 finds its feet, week 2 is a clean eight-day run carrying into week 3's
Monday, week 3 stumbles once and then reaches today on a five-day run. Three quiet days burn the balance
to exactly zero.

Production renders Home's real journal when `days` is omitted. Tests and E2E can still inject a
deterministic record with `<AnalysisScreen days={…} />`; they can pass `throughMs` to extend the real
journal through quiet gap days without introducing a clock into this module.

There is deliberately **no confession fixture**. The baseline comes from the real store, so a build where
onboarding was skipped renders the hero's `unconfessed` state — which is exactly what that user sees in
the app. `<AnalysisScreen confessedDailyMinutes={240} />` overrides it for a demo or a test.

## Time Reclaimed, and the day you went over

The formula is the PRD's, decided 2026-07-28: per-day saved = `max(0, confessed_daily_minutes − that
day's locked-group usage)`, summed over the window — month for the hero, week for the recap, all-time
for the milestone ladder. The clamp is deliberate: one blowout day never subtracts from the number.

A clamp hides something, so `selectTimeReclaimed` keeps what it hid. `overMinutes` is the mirror sum,
`netMinutes` is the signed truth, and `overDays` counts the days that ran over. The hero shows the
clamped number and, whenever a day went over, one line of plain arithmetic under it — *"8 of 21 days ran
over that average; the window is +1h 42m on balance"* — with the identical sentence, sign and all, when
that balance is negative. A user who spent more than they confessed sees a fact, not a zero that
pretends and not a scolding.

Three inputs are not numbers and are handled as states rather than defaults:

| Input | Status | What the surface says |
|---|---|---|
| Onboarding skipped | `unconfessed` | no numeral at all — what is missing, plus the usage it *can* report |
| A confession of zero (or nonsense) | `noBaseline` | "nothing to reclaim against" — never `−usage`, which would be a scolding dressed as arithmetic |
| Confession on record | `measured` | the formula, plus the over-days line when there is one |

## Not built yet

The PRD's Analysis tab has six blocks (§3.15 Tab 3). This build ships blocks 1 and 2 (#51), 3 and 4
(partially, #38), block 5 (#56), plus the day ledger. Still owed:

- **Recap · Share button** — needs the on-device share-card renderer (PRD §3.13: 9:16 + 1:1 templates,
  aggregates-and-dates privacy floor). No module owns it yet; `RecapCard` has the three facts the card
  wants.
- **Recap · 72-hour freshness** — needs the §3.14 recap moment (last day of week, 18:00) and therefore a
  clock. This module has none by invariant, so the card renders whenever there is a week to recap.
- **Recap row ② denominator** — should be the week's *scheduled* active days; needs the **schedule
  store**. Until it exists the denominator is days on record, so a rest day dilutes the ratio.
- **Recap row ③ top source** ("most from Gym visits") — its name and attribution inputs now exist in
  `conditionNameMap` + `selectConditionBreakdown`; adding the row remains recap rendering work.
- **Requirement heat map** (six cell states, kind glyphs, tap-for-detail) — still blocked. It needs a
  **schedule store** to classify active/missed vs rest/holiday/override days, plus the **timestamp of
  each condition's first qualifying outcome** to apply the PRD's first-met tie-break. `DaySummary`
  carries neither input; its condition values are aggregate totals only.
- **Rest-day-transparent streaks** — same schedule store; `selectStreak` is the naive per-day chain
  until then.
- **Milestones shelf** — needs the 22 **badge assets** (`design/STYLE.md`) and the unlock state (which
  badges are new, for the tab dot). The three ladders' inputs now all exist:
  `selectTimeReclaimed(days, baseline)` over the whole record, `selectStreak`, and the activity count.

## Tests

`npm run test:app` from the repository root, or `npm run test --workspace app -- analysis` for this
module. Selector, fixture-coherence, formatting, view-model and render tests live in `__tests__/`.

RNTL and storage traps, all paid for here:

- `AnalysisScreen` reaches the confession and Home stores, so **its test file must mock
  `@react-native-async-storage/async-storage`** (the trap `app/src/manage/README.md` names). Every other
  test in this module takes plain inputs and needs no mock.
- Reset both stores in **`beforeEach`, never `afterEach`** — a describe-level `afterEach` runs before
  RNTL's cleanup, so the update lands on a still-mounted tree and React warns about `act`.
- RNTL 14's `render` and `fireEvent.press` are both async; await either one when used. Never
  `unmount()` and then `render()` in the same test, because that detaches `screen` for later tests.
- `toHaveTextContent("…")` matches the node's **whole** text, so an assertion against one phrase inside
  a longer sentence has to be a regex.
