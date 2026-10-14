# ExcerLock glossary

One word per concept. Code, copy, commits, issues and agent output use these words. `_Avoid_` lists the synonyms that caused drift.

## Product

**Condition**: what a user must do to open their locked apps during a schedule. A Condition has a kind, a goal (for targets), a Schedule and Locked apps. A Bank Condition has a Difficulty instead of a goal and no Schedule. _Avoid_: rule (the code's old name; stored keys still say `rule`, which is an invariant, not a naming choice).

**Condition kind**: how a Condition is met. Exactly one of:
- **Walking target**: apps stay locked until the user walks a number of steps or minutes that day.
- **Walking state**: apps open only while the user is walking.
- **Gym target**: apps stay locked until the user spends a number of minutes at a saved gym.
- **Gym presence**: apps open while the user is at a saved gym (arrival starts it).
- **Bank** (walking or gym): apps stay locked while the Bank is empty; the activity earns Points, Points buy screen time in the Shop, and using Locked apps spends Bank time. Only one Bank Condition is enabled at a time, and no other Condition can sit next to it.

**Points**: what a Bank Condition's activity earns (steps or gym minutes), at the rate its Difficulty sets. Points never expire while their Bank Condition exists. "Earned" is the right word for Points and only for Points.

**Difficulty**: Easy, Medium or Hard. Sets how many Points an activity earns and the daily minimum that keeps the Streak.

**Shop**: the tab where Points buy screen time. It exists only while a Bank Condition is enabled. **Offer**: one thing the Shop sells, a price in Points for an amount of screen time.

**Bank**: screen time the user has bought and not yet spent. It drains only while Locked apps are in use. It starts at 12 hours when a Bank Condition is added, has no cap, never expires, and ends, with its Points, when that Condition is removed. _Avoid_: balance, wallet.

**Schedule**: the days and the time window (all day, or a start and end minute that may cross midnight) in which a Condition locks apps.

**Locked apps**: the user's Screen Time selection, held only as an opaque handle. App names and bundle ids never reach JavaScript, the server or analytics.

**Progress**: how far a Condition is toward being met today. **Met** is the moment it is satisfied for the day. _Avoid_: earned, credit, ledger (Points are earned; Progress is not).

**Day**: a local calendar day (`DayKey`, `YYYY-MM-DD`). A Day is **sealed** once it is over and its Progress becomes History.

**History**: sealed Days, the source of Streak and Reclaimed time. **Streak**: consecutive Days with every scheduled Condition met; a Bank Condition is met on a Day once its Difficulty's daily minimum is reached. **Reclaimed time**: screen time the user kept locked.

**Lock decision**: the single answer to "should apps be locked right now, and why", computed from Conditions, Progress, Activity and Entitlement. **Unlock**: the moment a Lock decision turns open, as the user experiences it. _Avoid_: relief.

**Enforcement**: applying a Lock decision to iOS through Screen Time (shields, schedules, the watchdog) so it holds while ExcerLock is not running. **Shield**: the screen iOS shows over a locked app. **Shield copy**: its text.

**Activity**: what the phone senses: walking (steps, cadence, placement) and gym presence (geofence). **Placement**: whether the phone is handheld or propped. **Treadmill scan**: camera-based proof of walking on a treadmill.

**Gym**: a saved place the user trains at. **Check-in**: a user-started confirmation of Gym presence.

## Account and money

**Journey**: the user's stage in the app: onboarding → paywall → setup → app, plus lapse and win-back.

**Onboarding**: the first-run questions and plan preview before the paywall. **Setup**: sign-in and the permissions the user's Conditions need, after the paywall (ADR 0043). **Setup need**: one missing prerequisite (locked apps, motion, location, gym).

**Entitlement**: whether the user may use the app: `trial`, `active`, or `none`. One source of truth, owned by the subscription package. **Paywall**: the purchase screen. **Win-back**: the offer shown after a subscription lapses.

**Identity**: who the user is: anonymous, or signed in with Apple, Google or an email code. **Account deletion**: erasing the user's server data and local data.

## Engineering

**Demo mode**: a dev build running scripted scenarios through the same code paths with fake adapters. **Scenario**: one scripted demo situation.

**Feature map**: `.agents/skills/verify-excerlock/references/features/`, one file per feature area: what exists and how a user reaches it. **Proof**: evidence from `./excer prove` that a feature works through the production user path.

Architecture words (module, interface, depth, seam, adapter, leverage, locality) follow `ARCHITECTURE.md` and Matt Pocock's `codebase-design`.
