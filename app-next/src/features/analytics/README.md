# Analytics

`period` uses calendar weeks (Monday start), months and years. `analyticsModel` consumes sealed `HistoryDay` facts without changing their day attribution, excludes missing measurements from reclaimed math, and calculates the displayed current streak as of `min(today, periodEnd)`. That cutoff makes the current period honest before it ends and makes a paged-back period show the streak current at its end. Month columns group days into seven-day buckets; Year columns are months. Usage columns report the mean of measured days, so the daily estimate line stays comparable. Exercise columns sum their own units: walking steps or workout minutes.

`AnalyticsScreen` preserves period/navigation state while mounted in tabs. Layout reference: `design/mockups/onboarding-orange/main-analytics-v3.png`, with the current orange gradient and monochrome orange glyphs. The main `ComparisonChart` pairs usage and reclaimed minutes with the onboarding estimate as a dashed baseline; monthly/yearly bars average measured daily values, clamping reclaimed time per day before averaging. Missing usage remains a gap. Exercise totals keep walking steps separate from workout minutes. Activity rows open the existing detailed `UsageChart` in a sheet. The Week period also renders the product-model recap facts. With no conditions, the analytics content and charts are replaced by the no-conditions state.

History comes from `historyStore` through `useHistory`, which reconciles today's row from the live rule days and leaves every sealed past day as written. The screen never reads the dev runtime snapshot, and the rule-day compatibility seam it used before P2-T15 is gone.

A day the app never opened has no rule-day row, so `sealDay.ts` writes the missed row that breaks the streak honestly; the fake runtime seals through `activityHistory` on every clock observation. The three analytics dev scenarios (`analytics-6-weeks`, `analytics-day-zero`, `analytics-no-measurement`) seed `scenario.history` into that same store when they load.

Tests cover period boundaries, leap days, missing data, partial weeks, transparent unscheduled days, and empty states. Native evidence lives in `evidence/T11`.
