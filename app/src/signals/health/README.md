# HealthProvider

Contract: HealthKit authorization, anchored samples, today totals, and change notifications behind the
HealthProvider interface. Native and fixture implementations must pass the same contract suite.

`FixtureHealthProvider` consumes `health.samplesAdded`, `health.backgroundWake`, and
`health.authChanged`. Anchors are opaque to consumers. Raw sample attribution remains queryable, while
`getTodayTotal` enforces the PRD's device-recorded-only rule by excluding `wasUserEntered` samples.

Canonical fixtures: `day-mixed-sources`, `manual-entry-day`, `background-wake-replay`, and
`day-steps-approaching-5k`. Test with `npm run test --workspace app -- signals/health`.
