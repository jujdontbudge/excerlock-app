# Analytics

`period` uses calendar weeks (Monday start), months and years. `analyticsModel` consumes HistoryDay facts without changing their day attribution, excludes missing measurements from reclaimed math, and calculates streaks over scheduled days. Month columns group days into seven-day buckets; Year columns are months. Usage columns report the mean of measured days, so the daily estimate line stays comparable. Exercise columns sum their own units: walking steps or workout minutes.

`AnalyticsScreen` preserves period/navigation state while mounted in tabs. `UsageChart` is SVG with UI-thread bar growth and direct accessible labels; horizontal scrolling keeps labels readable at large text sizes. Missing usage remains a gap. The hero ticks only when a value exists. Reduced Motion shows final values.

Tests cover period boundaries, leap days, missing data, partial weeks, transparent unscheduled days, and empty states. Native evidence lives in `evidence/T11`.
