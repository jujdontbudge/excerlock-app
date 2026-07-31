# HealthProvider

Contract: HealthKit authorization, anchored samples, today totals, and change notifications behind the
HealthProvider interface. Native and fixture implementations must pass the same contract suite.

`FixtureHealthProvider` consumes `health.samplesAdded`, `health.backgroundWake`, and
`health.authChanged`. Anchors are opaque to consumers. Raw sample attribution remains queryable, while
`getTodayTotal` enforces the PRD's device-recorded-only rule by excluding `wasUserEntered` samples.

`NativeHealthProvider` preserves that contract over `@kingstinct/react-native-healthkit`. Its narrow
client adapter translates native quantities into condition-domain units: count for steps, kilocalories
for active energy, kilometers for walking/running and cycling distance, meters for swimming, and
minutes for exercise time and workouts. Native HealthKit anchors pass through unchanged.

The native library is exactly pinned at 14.0.2. The root `postinstall` applies the checked-in plugin
patch from `app/patches/` so every clean Expo prebuild installs the cold-launch background observer in
AppDelegate; the guardrail suite verifies the generated call.

Active minutes is selected per local calendar day at read time. Recorded `appleExerciseTime` samples
win when present; otherwise the provider sums recorded workout durations. The two sources are never
added together, and `HKWasUserEntered` samples are excluded from both totals.

Home requests authorization on open, then registers observers. Anchored reads make foreground claim
the reliable path; an already-mounted Home claims again whenever the app enters the foreground.
Background delivery is configured at immediate frequency and treated as best effort: iOS may delay it
and force-quit stops JS delivery, so callers must not promise instant unlocks. Health values remain
on-device and are neither logged nor sent to analytics.

Apple intentionally does not disclose whether read access was granted for each HealthKit type. The
unchanged `HealthProvider` status `authorized` therefore means the OS authorization request completed
and queries are safe to attempt, not proof that the user granted every read. Empty results remain
ambiguous by platform design; widening the shared seam for a status HealthKit cannot provide would be
more misleading.

The production Home composition root instantiates this provider only for an iOS `expo-dev-client`
StoreClient that is not Expo Go. Jest, Expo Go, standalone, and non-iOS runtimes keep fixtures.

Canonical fixtures: `day-mixed-sources`, `manual-entry-day`, `background-wake-replay`, and
`day-steps-approaching-5k`. Test with `npm run test --workspace app -- signals/health`.
