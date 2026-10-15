---
status: proposed
date: 2026-10-14
---

# 0081: The Bank Condition sells screen time that drains only while Locked apps are used

## Decision

A new Condition kind, **Bank**, for walking or gym. It is chosen on the "how does this unlock" step (W2 or G1), takes a Difficulty instead of a goal, and has no Schedule. Activity earns Points at a fixed rate; Difficulty sets Offer prices; the Shop tab sells Bank time for Points; Locked apps are open whenever the Bank is above zero and locked when it is empty. The Bank drains only while Locked apps are in use, measured with a DeviceActivity usage-threshold ladder (`includesPastActivity`, minimum iOS 17.4), and re-locks at zero from the monitor extension while ExcerLock is closed.

Rules:
- One Bank Condition at a time, and no other Condition beside it, so the Lock decision has a single owner.
- A new Bank Condition starts with 12 hours. Points and the Bank have no cap and never expire; removing the Condition removes both and unlocks everything.
- Activity counts from the moment the Condition is created; no backfill. Points use the same verified walking and gym evidence as Progress.
- Difficulty changes apply from the next Day.
- Earning: one Point per verified step and 165 per verified gym minute at every Difficulty. Difficulty sets the price of an hour: Easy 2,000, Medium 3,300, Hard 6,000 Points; Offers are 15 m, 1 h, 3 h and 6 h at 0.25, 1, 2.5 and 4.5 times that price. (Revised 2026-10-15 from a per-Difficulty earning rate with fixed prices of 25/100/250/450, so balances read big; the trade per step is unchanged, but a Difficulty change now also reprices Points already held.)
- A Bank Condition Day is met at the Difficulty's daily minimum (Easy 3k steps or 20 gym minutes, Medium 6k or 30, Hard 10k or 45), which feeds the Streak.
- Onboarding: the Difficulty picker replaces the goal step and the Schedule step is skipped. The imported plan shows the Bank Condition as its steps (or gym minutes) per hour of screen time, alongside the existing plan goals. "Add another Condition" is hidden. The Condition demo's Bank scenario is a walking character on the left captioned "You walk" and a phone on the right buying screen time with the steps.
- No notifications and no emergency unlock in v1. Analytics carry no Point or minute amounts.

## Context

Owner request, 2026-10-14. Competitors (Steppin, Mozy, Stepscroll, Clearspace, Unrot, Activate) sell screen time for activity; their most-cited complaints are banked time vanishing and timers that do not match real use. Medium is priced near the market (about 3,300 steps an hour) rather than the first proposal of 1,250 steps an hour, which would have made the lock meaningless for anyone who walks.

Alternatives: a timed session that counts down whether or not apps are used (simpler and exact, rejected by the owner because it charges for time not spent in Locked apps); a separate app mode outside Conditions (rejected; it belongs on the "how does this unlock" step); letting other Conditions coexist (meeting any Condition opens every Locked app for the Day, which would bypass the Bank).

`docs/research/device-activity-gaps.md` (G3, G4) records the drain risks: threshold ticks lag usage, the event count per monitor is undocumented, and thresholds cannot be updated in place, so every purchase re-arms the monitor.

## Consequences

- A device spike on a real iPhone gates the economy: event-ladder ceiling, tick lag, re-lock at zero with the app closed. If 1-minute ticks fail, the ladder uses 5-minute ticks.
- The simulator cannot produce Locked-app usage; proofs cover the Shop, Home and purchase paths through Demo mode, and drain accuracy needs a device check before release.
- The unused drain-ladder leftovers in `app-selection` are revived or replaced, not kept beside new code.
- A new per-account persisted store holds Points and the Bank and joins `AccountDataCoordinator`. The revised, unreleased economy requires `economyVersion: 2` within the account; old dev Bank data is invalidated safely on hydration or import instead of converting mixed Difficulty history. The persisted storage key is unchanged.
- Reward motion follows ADR 0080.

## References

- [0080: Reward motion](0080-reward-motion.md) — **proposed**.
- [0066: Onboarding can stage several Conditions](0066-onboarding-stages-several-conditions.md) — **accepted**; staging is limited to one Bank Condition and nothing else.
- [0076: Relaunch and one-minute watchdog](0076-relaunch-and-one-minute-watchdog.md).
- `docs/research/device-activity-gaps.md`, `app-next/src/packages/lock/resolveLock.ts`, `app-selection/lib/deviceActivitySchedule.ts`.
