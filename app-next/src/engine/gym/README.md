# Gym engine (T01 stub)

Nothing yet, by design. The gym signal path lives in
`engine/signals/location`: `GeofenceEventProcessor` (the fixed 10-second
arrival confirmation), `GymVisitLog` / `AsyncStorageGymVisitLog` (the
on-device, coordinate-free interval store), `LocationTaskRuntime` and
`registerLocationTasks`. `GymAdapter` (T11 §6) implements the port's visit
surface over those.

When writing `GymAdapter`: read the stop-grace and auto-detect settings from
the settings store on every transition rather than caching them, so a setting
changed mid-visit takes effect immediately.
