# Domain

`entitlementAccess` is the single routing policy for subscription status. A lapse keeps the app mounted and
requests a dismissible modal; only a user who has never subscribed is held at the hard paywall. An unknown
status remains on the boot surface while the runtime resolves its persisted last-known-good status.

Pure rules, schedules, lock precedence, progress, streaks and reclaimed-time math. No React or IO. Tests enforce 100% branch coverage. Input rules are validated at store and editor boundaries.

Calendar math uses the supplied IANA timezone. DST gaps shift forward by the gap; repeated times use the first occurrence. A cross-midnight instance keeps the day it starts on. Met records latch and never move to a new timezone day.

Visible domain labels are composed from src/content/domain.ts.
