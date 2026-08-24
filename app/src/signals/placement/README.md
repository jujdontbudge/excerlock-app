# Phone placement

Public seam for classifying a phone as propped, in hand, or unknown from
`CMDeviceMotion` gravity and rotation-rate samples. The provider is a dumb
sensor pipe; fixture playback and classification stay deterministic in
TypeScript.

`NativePhonePlacementProvider` adapts the local `excerlock-motion` module's
device-motion stream. `PhonePlacementClassifier` uses a one-second evidence
window and a debounced transition boundary; isolated bumps do not become
pickups, and low-amplitude treadmill vibration remains propped.
