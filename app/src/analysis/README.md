# Analysis

**Contract.** `analysis` owns the Analysis tab: it projects Home's real journal through the ledger's
`daySummaries()` read model, then turns that ascending `DaySummary` record into the readings the tab
shows — the weekly recap, the Time Reclaimed hero, the selected Week/Month/Year trend, the streak, the
requirement heat map, the per-condition earning breakdown, the milestone shelf and the day-by-day
ledger. It hides *how* a window is projected, sliced, summed, ordered and formatted; the screen only
lays out. It computes no ledger math of its own. The tab reads Home's journal/config/condition names,
Schedule's rules and onboarding's confession; its `milestones` submodule separately owns the one
persisted UI-state record that prevents unlock announcements from replaying.

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
- **The clock stops at the screen boundary.** The Analysis route injects an `AnalysisClock`;
  `AnalysisScreen` samples it and passes only local wall-clock milliseconds into the pure view. That
  instant drives both quiet-day journal projection and recap freshness. Selectors never call
  `Date.now()` or import a clock; weekday arithmetic still runs only from `dayIndex`. Tests without a
  clock keep the latest journal event as their deterministic cutoff, and `throughMs` remains an
  explicit projection override.
- **Heat-map chronology is data, not object order.** A cell compares defined
  `ConditionDaySummary.firstQualifiedAtMs` values directly. `0` is a real qualifying instant;
  `undefined` means the condition never qualified. Equal instants use condition id as an explicit
  stable tie-break, never the insertion order of the `conditions` record.
- **Schedule classification stays owned by Schedule.** `AnalysisScreen` injects
  `classifyScheduleDay`; the pure view never repeats override → holiday → recurring rest → active
  precedence. The same classification drives heat-map cells, streak continuity and recap row ②.
  Without a schedule, Schedule's local-first fallback classifies every day as active.
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
| `clock.ts` | the injected Analysis time contract + the app route's local-wall-clock implementation |
| `model/calendar.ts` | weekday arithmetic over `dayIndex` + the day and date-range labels |
| `model/conditionBreakdown.ts` | joins condition ids to names and totals optional attributed earnings without turning missing history into zero |
| `model/dayRecord.ts` | the sole Home-journal adapter; delegates to `daySummaries()` with the real config and an injected cutoff |
| `model/format.ts` | the one minute/day-count formatting surface |
| `model/requirementHeatMap.ts` | six-state whole-week columns, first-qualified attribution and honest before-history/future padding |
| `model/selectors.ts` | `selectToday` · Week/Month/Year period selection · schedule-aware streaks · totals · bars |
| `model/timeReclaimed.ts` | `selectTimeReclaimed` — the PRD §3.13 formula over any window |
| `model/recap.ts` | `buildRecap` — the weekly recap's five rows, including its scheduled-active denominator |
| `model/recapFreshness.ts` | chooses the newest generated recap at the Start-week-on-aligned 18:00 moment and expires it after 72 hours |
| `model/view.ts` | `buildAnalysisView` — the single read the screen performs |
| `fixtures/daySummaries.ts` | three weeks of derived, self-consistent `DaySummary` records for tests and E2E |
| `components/RecapCard.tsx` | the week in five rows, led by its Time Reclaimed and delta |
| `components/RecapShareAction.tsx` | projects a full recap into the privacy-safe share-card input and opens its preview |
| `components/RequirementHeatMapCard.tsx` | accessible requirement cells, kind glyphs and selectable day detail |
| `components/TimeReclaimedHero.tsx` | the month's hero numeral and what sits under it |
| `components/EarnedSpentCard.tsx` | earned vs spent vs the difference, for a window |
| `components/ConditionBreakdownCard.tsx` | per-condition banked minutes, legacy `not recorded`, and the no-earnings state |
| `components/StreakCard.tsx` | current streak · best ever · active days |
| `components/PeriodControl.tsx` | accessible Week/Month/Year selection |
| `components/WeekChart.tsx` | the selected window's earned/spent bar pairs, built from `View`s |
| `components/DayLedger.tsx` | one row per recorded day, newest first |
| `components/AnalysisEmpty.tsx` | the day-zero state |
| `milestones/` | the fixed badge ladders, persisted announcement lifecycle, focus-triggered unlock moment and share/progress presentation |
| `screens/AnalysisScreen.tsx` | samples the injected clock, joins the read-only stores, owns selected-period UI state and lays out the tab |

## The fixture

`FIXTURE_DAY_SUMMARIES` remains for unit/render tests and E2E scenarios. It is never the production
default. The fixture is 21 days — Mon 6 Jul through Sun 26 Jul 2026, three whole Monday-to-Sunday weeks
— for a user on a 4 AM boundary with a 30 min/day allowance and a 60-minute rollover cap.

Only the story is authored: earned minutes, spent minutes and each day's condition activity. Balances,
rollover, meaningful-activity verdicts and the requirement that condition attribution sums to the day's
banked total are held to the identities `packages/ledger` guarantees by
`__tests__/fixtures.test.ts` — so the fixture can never drift into a state the real ledger would refuse
to produce. Qualifying fixture conditions also carry plausible within-day first-met times; conditions
below their meaningful-activity floor deliberately have no timestamp. The shape: week 1 finds its feet,
week 2 is a clean eight-day run carrying into week 3's Monday, week 3 stumbles once and then reaches
today on a five-day run. Three quiet days burn the balance to exactly zero.

Production renders Home's real journal when `days` is omitted. Tests and E2E can still inject a
deterministic record with `<AnalysisScreen days={…} />`; they can pass `throughMs` to extend the real
journal to an explicit cutoff, or inject an `AnalysisClock` to exercise generation and freshness.

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

## Schedule-aware streaks and recap

`selectStreak` counts meaningful scheduled-active days. Rest, holiday and inactive-override days are
transparent: they neither increment nor break the run. A missed scheduled-active day does break it,
including an active override on a recurring rest day. The default classifier treats every day as
scheduled-active, preserving the original per-day chain when no schedule exists.

Recap row ② applies that same classifier to the current recorded week. Its numerator is meaningful
scheduled-active days and its denominator is scheduled-active days, so deliberately scheduled rest
never dilutes the ratio. When the whole recorded week is restful, `RecapCard` says `Rest week` rather
than dividing by zero or presenting the week as a failure.

## Requirement heat map

The heat map is the whole record grouped into seven-day columns. `weekStartsOn` chooses the first row
in every column. The first column is padded with `beforeHistory` blanks and the current column with
`future` blanks; neither becomes a missed day. With no history, `buildAnalysisView()` returns no heat-map
columns and `AnalysisScreen` keeps the existing invitation-only empty state.

The six cell states are `metByEvent` · `metByRate` · `metByState` · `missed` · `rest` · `blank`.
Met cells share the primary fill and differ by their white event check, rate bars or state pulse-dot.
Missed active days are neutral and empty; rest, holiday and inactive-override days use a separate faint
tint; blank padding has no fill. Every cell is an accessibility button with a state-specific label.
Selecting one opens its dated detail inside the card: requirement status, earned minutes and every
qualifying condition in first-met order.

## Analysis blocks

All six PRD §3.15 Analysis blocks now ship. The milestone block projects the existing all-record
`selectTimeReclaimed(days, baseline)`, `selectStreak`, and activity-count readings into the fixed
22-badge shelf. Its own README documents the persisted unlock-announcement lifecycle and rendering law.

The Recap **Share** button now projects the five-row in-app recap into
`@/shareCards`' aggregate/date-only input and opens the 9:16/1:1 preview. The
capture and iOS-share operations still use that module's explicit deterministic
mock while Expo MCP is unavailable; real file capture and the native sheet are
not built or claimed here.

## Tests

`npm run test:app` from the repository root, or `npm run test --workspace app -- analysis` for this
module. Selector, fixture-coherence, formatting, view-model and render tests live in `__tests__/`.

RNTL and storage traps, all paid for here:

- `AnalysisScreen` reaches the confession, Home and Schedule stores, so **its test file must mock
  `@react-native-async-storage/async-storage`** (the trap `app/src/manage/README.md` names). A pure test
  that imports Schedule's public index to exercise the real classifier needs the same boundary mock.
- Reset all three stores in **`beforeEach`, never `afterEach`** — a describe-level `afterEach` runs before
  RNTL's cleanup, so the update lands on a still-mounted tree and React warns about `act`.
- RNTL 14's `render` and `fireEvent.press` are both async; await either one when used. Never
  `unmount()` and then `render()` in the same test, because that detaches `screen` for later tests.
- `toHaveTextContent("…")` matches the node's **whole** text, so an assertion against one phrase inside
  a longer sentence has to be a regex.
