# MotionProvider

Contract: motion activity and pedometer observations behind one provider interface. It hides the local
Swift module and supplies equivalent deterministic fixture behavior.

`FixtureMotionProvider` consumes only `motion.activityChange`, `motion.pedometerUpdate`, and
`motion.authDenied` rows from the scenario schema. It implements the full dumb-sensor-pipe contract;
walk qualification stays in `WalkVerifier`.

`WalkVerifier` requires walking classification plus the app-fixed 65 steps/minute starting threshold.
The caller supplies the condition's 30-second-to-5-minute grace period. Stop grace is anchored to the
activity sample's `startedAt`; automotive activity and denied authorization disqualify immediately.

Canonical fixtures: `steady-walk`, `red-light`, `stop-for-good`, `drive-off`, `shaky-cheat`,
`late-classification`, and `denied-permission`. Test with
`npm run test --workspace app -- signals/motion`.
