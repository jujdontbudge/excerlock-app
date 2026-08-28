# Phone placement

Public seam for classifying a phone as propped, in hand, or unknown from
`CMDeviceMotion` gravity and rotation-rate samples. The provider is a dumb
sensor pipe; fixture playback and classification stay deterministic in
TypeScript.

`NativePhonePlacementProvider` adapts the local `excerlock-motion` module's
device-motion stream. `PhonePlacementClassifier` uses a one-second evidence window. It distinguishes
orientation drift from high-frequency rotation: a running deck may produce
large gyro deltas while the phone's gravity pose stays bounded. Vibration-based
initial placement settles briefly before commitment, and leaving `propped`
requires 1.5 seconds of continuous hand evidence; set-downs remain faster.
Captured-device replays cover both an in-hand outdoor walk and a phone resting
on a running treadmill, in addition to synthetic fixtures with irregular timing.
