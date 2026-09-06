# T11 — Analytics tab

## Inputs

`02-screen-inventory.md` §6 (Analytics), `01-product-model.md` §7, mockup `main-analytics-v3.png`, AppBlock
replays 90/94 (period control, big metric, chart, cards), reference study (`design/motion/reference/`). Scenarios
`analytics-6-weeks`, `analytics-day-zero`, `analytics-no-measurement`.

## Steps

1. `src/features/analytics/analyticsModel.ts`: pure selectors over `scenario.history`-shaped data
   (`ruleDaysStore` + usage history store): per-period series for locked-app minutes, exercise per activity,
   days met / scheduled, streaks, time reclaimed with measured-day count and delta vs previous period, weekly
   recap rows. Tests with the 6-week fixture, including weeks with unmeasured days and unscheduled days.
2. `AnalyticsScreen`: `SegmentedControl` Week/Month/Year + ‹ › date navigation with a "This week" label;
   time-reclaimed hero (`type.metric`, tabular), "measured on N of M days"; `BarChart` locked-app minutes
   with the estimate line; exercise chart (bars per activity, or steps line); three `StatTile`s (days met,
   current streak, longest streak); weekly recap card (Week only); empty states.
3. Motion modeled on OtterLife (reference study): bars grow on period change, hero number ticks, segmented indicator slides. Reduce
   Motion: instant values.
4. Honesty rules: never show placeholder data outside scenarios; unmeasured days render as gaps with a legend
   note; "illustrative" never appears in the main app.
5. Evidence: each period × each scenario; recording of period switching.

## Acceptance

- [ ] Model tests cover: partial weeks, unmeasured days excluded from reclaimed math, unscheduled days
      transparent for streaks, cross-midnight rule days attributed to start day.
- [ ] Day-zero and no-measurement states render with correct copy.
- [ ] Charts are pure SVG (no chart dependency added), labeled directly, and readable at XL Dynamic Type.
