# MotionProvider

Contract: motion activity and pedometer observations behind one provider interface. It hides the local
Swift module and supplies equivalent deterministic fixture behavior.

`FixtureMotionProvider` consumes only `motion.activityChange`, `motion.pedometerUpdate`, and
`motion.authDenied` rows from the scenario schema. It implements the full dumb-sensor-pipe contract;
walk qualification stays in `WalkVerifier`.

`NativeMotionProvider` adapts the local `excerlock-motion` Expo Module to the same contract. The
composition root selects it only in an iOS dev-client build; tests remain fixture-backed and loading
SignalKit does not eagerly require the native JSI module.

`WalkVerifier` requires walking classification plus fresh cadence at or above the app-fixed 65
steps/minute starting threshold. The value is provisional pending physical-device spike #27 and is
not a user setting. Two consecutive qualifying cadence observations establish sustained walking.
Cadence expires after the documented five-second sensor/poll window, so an old sample cannot verify a
resumed walk. The caller supplies the condition's
30-second-to-5-minute grace period. Stop grace is anchored to the activity sample's `startedAt`;
automotive activity and denied authorization disqualify immediately.

Canonical fixtures: `steady-walk`, `red-light`, `stop-for-good`, `drive-off`, `shaky-cheat`,
`late-classification`, and `denied-permission`. Test with
`npm run test --workspace app -- signals/motion`.
