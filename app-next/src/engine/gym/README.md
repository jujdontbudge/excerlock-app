# Gym engine

## What is here

Nothing yet, by design. The gym signal path lives in
`engine/signals/location`: `GeofenceEventProcessor` (the fixed 30-second arrival
confirmation), `GymVisitLog` / `AsyncStorageGymVisitLog` (the on-device,
coordinate-free interval store), `LocationTaskRuntime` and
`registerLocationTasks`. `GymAdapter` (P2-T05 §3) implements the port's visit
surface over those.

## What deliberately did not move, and why

`app/src/home/signals/gymPresenceController.ts` (248 lines) stayed in the old
app. Its job was to hold presence as state and write per-condition gym progress
itself. The audit resolves that differently and in three places:

- presence is a **live** fact, `arrivalFor(rules, visits, now)`, never persisted
  (P2-T14 §4);
- dwell is one pure function over clipped, merged visits, `domain/gymDwell.ts`,
  and `progressSync` is its single applier (P2-T15 §3);
- the 30-second confirmation it owned already lives in `GeofenceEventProcessor`
  and moved with it, unchanged.

So the controller's only remaining contribution would be a second, disagreeing
accumulator, which the fix plan explicitly deletes. It also read
`ConfiguredCondition` and `useHomeStore`, neither of which exists here.

The one thing to lift from it when writing `GymAdapter`: it reads the stop-grace
and auto-detect settings from the settings store on every transition rather than
caching them, so a setting changed mid-visit takes effect immediately.
