# ADR 0009: Analytics periods and condition-driven stats

- Status: Accepted
- Date: 2026-09-09

## Context

The Analytics tab offered Week/Month/Year calendar periods, a usage-versus-reclaimed chart and two fixed tiles (exercise, streak). Johan asked for Day, Week and All time; stats that adapt to the user's conditions (gym minutes, gym arrivals, steps, walking duration, streak, screen time replaced); and a layout copied from a well-designed reference in ExcerLock colours.

## Decision

- Periods are `Day`, `Week`, `All`. Day totals cover one day and show the surrounding Monday-start week as a met-day dot row. All time spans the first history day through today and buckets by calendar week.
- "Screen time replaced" is the existing reclaimed measure: starting estimate minus measured usage, clamped per day. No new lock-minute counter is introduced yet; if real locked minutes are tracked later, this label should switch to that source.
- Tiles are derived from enabled rules (`analyticsModel.conditions`): gym target → minutes at the gym; gym arrival → count of met arrival rule-days; walking target → steps; walking state → verified walking minutes from state rule-day progress; running/biking → minutes. Streak is always shown. Movement without a condition remains in the "How you earned time" list.
- Visual language: orange gradient canvas, translucent cards outlined with the black `border.outline` hairline, orange bars and glyph discs, neutral text (no orange text). `SegmentedControl` gains an `outline` variant with a full-height orange pill. Reference structure: Befit "Weekly progress" and Stronger "Streak" screens found through ScreensDesign.

## Consequences

- `useAnalytics` in selectors still exposes the old Week/Month/Year rolling windows for other callers and is untouched.
- Arrival counts and walking minutes depend on `ruleDays` retention; days pruned from the store stop counting toward All time.
