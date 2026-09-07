# Analytics

`period` uses calendar weeks (Monday start), months and years. `analyticsModel` consumes HistoryDay facts without changing their day attribution, excludes missing measurements from reclaimed math, and calculates streaks over scheduled days. Month columns group days into seven-day buckets; Year columns are months. Usage columns report the mean of measured days, so the daily estimate line stays comparable. Exercise columns sum their own units: walking steps or workout minutes.

`AnalyticsScreen` preserves period/navigation state while mounted in tabs. Layout reference: `design/mockups/onboarding-orange/main-analytics-v3.png`, with the current orange gradient and monochrome orange glyphs. The main `ComparisonChart` pairs usage and reclaimed minutes; monthly/yearly bars average measured daily values, clamping reclaimed time per day before averaging. Missing usage remains a gap. Exercise totals keep walking steps separate from workout minutes. Activity rows open the existing detailed `UsageChart` in a sheet.

Tests cover period boundaries, leap days, missing data, partial weeks, transparent unscheduled days, and empty states. Native evidence lives in `evidence/T11`.
