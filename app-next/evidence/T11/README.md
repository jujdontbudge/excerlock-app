# T11 — Analytics

Calendar Week/Month/Year navigation, ticking reclaimed minutes, measured-day count, previous-period delta, locked-app usage with the estimate line, per-activity movement, scheduled/met days, current/longest streak and the weekly recap are implemented. Month columns are seven-day buckets; year columns are months. Their usage bars show the measured daily average so the daily estimate stays comparable. Exercise totals keep steps separate from minutes.

## Verification

Seven Analytics tests pass: partial weeks, missing measurements, leap-year/calendar navigation, unscheduled-day streak transparency, supplied cross-midnight day attribution, six-week fixture totals and rendered empty states. The shared full run passed 294 tests across 103 suites with 14 snapshots. TypeScript, lint and iOS production export pass.

Recorded all three periods for all three Analytics scenarios, including previous-week navigation. Reviewed normal and XL captures. SVG charts have direct labels and horizontally scroll at large text sizes. Missing usage is a gap, never invented data; the reclaimed hero is absent when unmeasured. No chart dependency was added.

## Motion

Reviewed the current Analytics concept and Otter OT01-M029 weekly-review strip. Kept the prominent single metric, quiet chart grid and stable controls. The period indicator slides, the hero ticks, period charts grow from their baseline with stagger, and activity selection crossfades/grows the new series. A floating clock keeps the first viewport alive. Reduced Motion renders final values and fades. Gemini/human grading is deferred under the latest instruction.
