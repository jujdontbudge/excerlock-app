# MotionProvider

Contract: motion activity and pedometer observations behind one provider interface. It hides the local
Swift module and supplies equivalent deterministic fixture behavior.

`FixtureMotionProvider` consumes only `motion.activityChange`, `motion.pedometerUpdate`, and
`motion.authDenied` rows from the scenario schema. It implements the full dumb-sensor-pipe contract;
walk qualification stays in `WalkVerifier`.

`NativeMotionProvider` adapts the local `excerlock-motion` Expo Module to the same contract. Walk
Sessions select it in every non-Expo-Go iOS app runtime, including Standalone releases; tests, Expo Go,
and non-iOS stay fixture-backed. Loading SignalKit does not eagerly require the native module.

Home's explicit `WalkingSessionController` owns the production provider, `WalkVerifier`, foreground
location keep-alive, active-window timer, and watchdog. Nothing starts merely because the app opened or
because no While-walking condition exists. The user starts a session from its condition card. Verified
cadence publishes both state changes and subsequent re-verifications: Lock uses each publication to
renew Screen Time's 15-minute OS-side unlock lease. Cadence-freshness and stop-grace expiry still publish
without waiting for another sensor event, and stopping or disabling the owning condition tears down both
native providers.

`WalkVerifier` requires walking classification plus fresh cadence at or above the app-fixed 65
steps/minute starting threshold. The value is provisional pending physical-device spike #27 and is
not a user setting. Two consecutive qualifying cadence observations establish sustained walking.
Cadence expires after the documented five-second sensor/poll window, so an old sample cannot verify a
resumed walk. The caller supplies the condition's
30-second-to-5-minute grace period. Stop grace is anchored to the activity sample's `startedAt`;
automotive activity and denied authorization disqualify immediately.

The native Health feed observes this same session snapshot rather than constructing a second motion
pipe, so Home cards and `LockController` cannot disagree about whether walking is verified. E2E installs
the scenario's motion fixture and uses that fixture's relative clock domain before signal hosts mount.

Canonical fixtures: `steady-walk`, `red-light`, `stop-for-good`, `drive-off`, `shaky-cheat`,
`late-classification`, and `denied-permission`. Test with
`npm run test --workspace app -- signals/motion`.
