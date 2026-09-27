---
id: analytics
title: Analytics tab
routes: [(tabs)/analytics]
scenarios: [analytics-6-weeks, analytics-day-zero, analytics-no-measurement]
depends: [home]
---
## Sub-features
- Day, Week (Monday start) and Month periods. Swiping the header and chart right pages to the previous day, week or month; swiping left pages forward, never past today. VoiceOver adjusts the period total instead.
- The trend card labels its time axis: Day shows MON to SUN of the selected day's week, Week shows eight weeks with the month name where a month starts and the Monday date elsewhere, Month shows twelve months labelled every other month. The selected point wears a pill, and scrubbing the trend selects that period at the top.
- The hero metric plus tiles: streak always, and gym minutes, arrivals, steps and walking minutes only for enabled Condition kinds.
- A chart of steps from Motion & Fitness. Missing measurements show as gaps, never zeros.

## How to get to it (user POV)
Analytics tab, or the Analytics shortcut on Home.

## Driving it with excer
Run `./excer demo analytics-6-weeks --open /analytics`.

```proof
name: six-weeks
scenario: analytics-6-weeks
open: /analytics
expect: Analytics | This week: | Streak: | Calories: | Distance: | Active time: | Floors:
```

```proof
name: day-trend-strip
scenario: analytics-6-weeks
open: /analytics
tap: D
expect: Daily steps ring | Streak: 2 days | MON | TUE | WED | THU | FRI | SAT | SUN
```

```proof
name: day-previous-page
scenario: analytics-6-weeks
open: /analytics
tap: D | Previous day
expect: Daily steps ring | Calories: 80 kcal | MON | SUN
```

```proof
name: week-timeline
scenario: analytics-6-weeks
open: /analytics
expect: This week: 3,200 steps | AUG | SEP | 17 | 24
```

```proof
name: month-timeline
scenario: analytics-6-weeks
open: /analytics
tap: M
expect: This month: 27,350 steps | NOV | JAN | MAR | MAY | JUL | SEP
```

```proof
name: day-zero
scenario: analytics-day-zero
open: /analytics
expect: Analytics | Streak: 0 days
```

## Gotchas
- "Analytics" here means the in-app history screen. Product analytics (PostHog) is a separate concern, and health, location and screen-time details never go to it.
- Unscheduled days are transparent to streaks.
- Swipes are proven by hand (`idb ui swipe`), since proof blocks can only tap. `Previous day` goes through the same paging path.
- In the demo, the Motion & Fitness fake returns the scenario's recorded steps for past days, so paged totals match the trend.
- The dev-client gear starts over the `M` segment on a fresh simulator; drag it away before tapping `M`.
