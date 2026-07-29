# ScreenTimeProvider

Contract: the read-only side of device activity—event history and monitor callbacks. Imperative shield
writes remain exclusively in ShieldController.

`FixtureScreenTimeProvider` consumes `screentime.tick`, `screentime.monitorFired`,
`screentime.intervalEnded`, and `screentime.authChanged`. It exposes ordered read history and callbacks;
it has no shield mutation methods.

Canonical fixtures: `tick-ladder-basic`, `tick-ladder-jitter`, and `re-arm-race`. Test with
`npm run test --workspace app -- signals/screentime`.
