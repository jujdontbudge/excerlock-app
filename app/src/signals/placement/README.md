# Phone placement

Public seam for classifying a phone as propped, in hand, or unknown from
`CMDeviceMotion` gravity and rotation-rate samples. The provider is a dumb
sensor pipe; fixture playback and classification stay deterministic in
TypeScript.

`NativePhonePlacementProvider` adapts the local `excerlock-motion` module's
device-motion stream. `PhonePlacementClassifier` computes two features per
one-second window — the largest gravity deviation from the window mean, and the
median rotation-rate magnitude — and decides on their medians over a three-second
horizon. A walking hand cannot hold a pose: measured on a treadmill it swings
gravity by ≥0.039 g in 95 % of windows and rotates at ≥0.32 rad/s, while a phone
propped on the running console stays within 0.015 g and 0.26 rad/s apart from
sub-second jolts. The thresholds (0.03 g, 0.45 rad/s) sit between those bands
and the pooled horizon absorbs the jolts. Leaving `propped` needs three seconds
of continuous hand evidence; a set-down needs 1.5 seconds. Real device
recordings of both cases live in `__tests__/fixtures/treadmillRecordings.json`
and pin the behaviour, alongside synthetic fixtures with irregular timing.
