---
id: analytics
title: Analytics tab
routes: [(tabs)/analytics]
scenarios: [analytics-6-weeks, analytics-day-zero, analytics-no-measurement]
depends: [home]
---
## Sub-features
- Day, Week (Monday start) and All-time periods, with range navigation.
- The hero metric plus tiles: streak always, and gym minutes, arrivals, steps and walking minutes only for enabled Condition kinds.
- A chart of steps from Motion & Fitness. Missing measurements show as gaps, never zeros.

## How to get to it (user POV)
Analytics tab, or the Analytics shortcut on Home.

## Driving it with excer
Run `./excer demo analytics-6-weeks --open /`, sign in, and open Analytics. The hard Paywall blocks a direct `/analytics` link before admission.

```proof
name: six-weeks
scenario: analytics-6-weeks
open: /
tap: Sign in | Continue with Apple | Analytics
expect: Analytics | This week: | Streak: | Calories: | Distance: | Active time: | Floors:
```

```proof
name: day-trend-strip
scenario: analytics-6-weeks
open: /
tap: Sign in | Continue with Apple | Analytics | D
expect: Daily steps ring | Streak: 2 days | TUE | MON
```

```proof
name: day-zero
scenario: analytics-day-zero
open: /
tap: Sign in | Continue with Apple | Analytics
expect: Analytics | Streak: 0 days
```

## Gotchas
- "Analytics" here means the in-app history screen. Product analytics (PostHog) is a separate concern, and health, location and screen-time details never go to it.
- Unscheduled days are transparent to streaks.
- The Month calendar navigates months; its compact trend shows the latest eight calendar weeks. Scrubbing that trend changes only its highlighted week, not the calendar month.
