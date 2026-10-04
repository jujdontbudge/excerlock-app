---
status: accepted
date: 2026-10-03
---

# 0062: Check treadmill walking once and grant up to 15 minutes

## Decision

The promise is "checks that you're walking and grants up to 15 minutes". A foreground Treadmill scan checks one six-second window every half second and requires two more seconds of sustained walking evidence. The cadence band stays 1.2–3 steps per second. Separate face and shoulder tracks must each have adequate time-bin coverage and gaps no greater than 200 ms, realistic vertical bob, Pearson lag correlation, agreeing half-window cadence and consistent cycles. Use one median scale for the whole window; never divide position by a changing frame scale. Source changes, framing jumps, late or invalid time and lost coverage discard evidence. A single scan lasts at most 30 seconds, then existing framing and expiry handling apply.

A pass starts a 15-minute deadline, rather than granting continuous Walking state. A local notification warns 30 seconds before it ends when notification permission is granted. Confirmed walking after pickup extends the deadline; pickup alone does not. A fresh successful scan restarts it. Enforcement publishes the earlier of the schedule end and this deadline as `eligibleUntil` to the existing DeviceActivity watchdog. Renewing the watchdog cannot extend the scan grant. Keep pickup and put-down handoff limits inside the grant deadline.

Persist `proppedMachine` version 2 under the existing detection key. An upgrade clears version-1 grants because they have no trustworthy expiry. An older bundle's existing version validator rejects version 2 and uses inactive propped state; rollback cannot recreate unlimited propped access. The outer detection version and storage key remain unchanged.

Stage 1 calls only APIs present in App Store build 17, runtime 4. Stage 2 adds optional frame timing, joints, association and camera-motion fields using the existing sample event. Absence preserves the Stage 1 path. Build 18 needs a distinct runtime before distribution; no binary or OTA release is authorized here.

## Context

Issue [#163](https://github.com/JohanSardar/excerlock-app/issues/163) reproduced stationary face-box jitter passing the peak detector, repeated five-second attempts, and propped state with no deadline. Independent reviews required Pearson correlation with separate means and variance floors, fixed scale, independently qualified sources and fail-closed timing. The old spec's adaptive five-second scan cannot establish these properties; its 15-minute grant was never implemented.

Head-and-shoulders video cannot distinguish walking from deliberate rhythmic bobbing. That is a known residual for voluntary distraction control. Incidental standing, talking, looking, shifting and phone handling must reject in the owner/setup evaluation. Console shake and background walkers need extra native evidence. A correlated face and shoulder are not independent evidence against camera movement. Wider body-only historical fixtures use a fixed half-torso scale as a face-size proxy; their passes do not validate console framing.

## Consequences

The ring stays empty until a complete window passes, and the paced ceremony remains. Publish changed values at most five times a second, with phase changes immediately. Scan generation and cancellation guards prevent stale completion from granting access or showing success.

Local replay compares the frozen old implementation and the production detector/controller on a virtual clock. Reports include settings and source hashes, pass times, rejection reasons and separate deliberate bobbing outcomes. Trajectories stay local, outside analytics and the server. Freeze thresholds before opening the held-out session. Require zero incidental passes in that session and at least 17/18 walking clips within ten seconds. Missing clips produce a pending verdict. A narrow owner/setup result does not establish a general false-pass rate.

Build 17's existing watchdog incorrectly rejects callbacks at or after `eligibleUntil` ([#164](https://github.com/JohanSardar/excerlock-app/issues/164)). Stage 1 supplies the correct deadline, but suspended enforcement of that deadline is blocked on the Stage 2 binary correction; an OTA alone is not cleared for release. The simulator proves the JS state deadline, notification plan and watchdog deadline input. DeviceActivity scheduling, suspension/termination, pickup, live capture throughput, camera-shake rejection and iPhone 13 lag remain physical-device release checks. Stock Camera footage differs from live capture; offline extraction records that limitation.

## References

- [Treadmill spec](../specs/treadmill-mode.md), updated for the window and deadline.
- [ADR 0012](0012-persisted-detection-and-conditional-watchdog.md), accepted: detection persistence and conditional watchdog.
- `app-next/src/packages/unlock/lib/gait/WindowedGaitDetector.ts`
- `app-next/src/packages/activity/proppedMachine.ts`
- `app-next/src/packages/enforcement/RuntimeEnforcementSource.ts`
- `tools/gait-eval/`, `tools/gait-fixture-extractor/RECORDING.md`
