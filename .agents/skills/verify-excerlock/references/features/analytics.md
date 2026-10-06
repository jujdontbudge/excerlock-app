---
id: analytics
title: Analytics tab
routes: [(tabs)/analytics]
scenarios: [analytics-6-weeks, analytics-day-zero, analytics-no-measurement, multi-rule-overlap]
depends: [home]
---
## Sub-features
- Day, Week (Monday start) and Month periods, with range navigation.
- Steps or Time in gym drives the ring, chart, totals, tiles and trend. Both existing Condition kinds allow a remembered metric choice, including switched-off Conditions.
- A chart of steps from Motion & Fitness. Missing measurements show as gaps, never zeros.

## How to get to it (user POV)
Analytics tab, or the Analytics shortcut on Home.

## Driving it with excer
Run `./excer demo analytics-6-weeks --open /analytics`. Scenarios open signed in.

```proof
name: six-weeks
scenario: analytics-6-weeks
open: /analytics
expect: Steps | This week: | Streak: | Calories: | Distance: | Active time: | Floors:
```

```proof
name: day-trend-strip
scenario: analytics-6-weeks
open: /analytics
tap: D
expect: Daily steps ring | Streak: 2 days | TUE | MON
```

```proof
name: day-zero
scenario: analytics-day-zero
open: /analytics
expect: Steps | Streak: 0 days
```

```proof
name: week-fit
scenario: analytics-6-weeks
open: /analytics
expect: Steps | Mon | Tue | Wed | Thu | Fri | Sat | Sun
```

```proof
name: chart-swipe
scenario: analytics-6-weeks
open: /analytics
swipe: 0.2,0.45,0.8,0.45
expect: Last week: | Mon | Sun
```

```proof
name: week-short-drag
scenario: analytics-6-weeks
open: /analytics
swipe: 0.2,0.45,0.3,0.45
expect: This week: | Mon | Sun
```

```proof
name: week-current-boundary
scenario: analytics-6-weeks
open: /analytics
swipe: 0.8,0.45,0.2,0.45
expect: This week: | Mon | Sun
```

```proof
name: metric-choice
scenario: multi-rule-overlap
open: /analytics
actions: tap Time in gym, change activity | tap Steps | expect Steps, change activity | expect Calories: | tap Steps, change activity | tap Time in gym | expect Gym time: | tap D | expect Daily gym ring | tap M | expect Monthly activity calendar | tap W
expect: Time in gym, change activity | minutes | Gym time: | Days visited:
relaunch-after-expect: true
after-relaunch-expect: Home | Analytics
then-open: /analytics
then-expect: Time in gym, change activity | Gym time:
```

```proof
name: disabled-kinds
scenario: multi-rule-overlap
open: /conditions
actions: tap More actions for Spend 30 minutes at the gym | tap Turn off | open /analytics | expect Steps, change activity | tap Steps, change activity | tap Time in gym
expect: Time in gym, change activity | Gym time: | Days visited:
```

```proof
name: one-kind-title
scenario: analytics-day-zero
open: /analytics
expect: Steps
absent: change activity | Time in gym
```

## Gotchas
- "Analytics" here means the in-app history screen. Product analytics (PostHog) is a separate concern, and health, location and screen-time details never go to it.
- Unscheduled days are transparent to streaks.
- The Month calendar navigates months; its compact trend shows the latest eight calendar weeks. Scrubbing that trend changes only its highlighted week, not the calendar month.
