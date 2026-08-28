# Runtime selection

One composition seam decides whether code may load iOS-only native modules.

`shouldUseNativeIosRuntime` selects native adapters in bare, standalone, and
custom development builds, and fixtures in tests, non-iOS environments, and
Expo Go. It keys on the Expo Go host version rather than `expoGoConfig`:
embedded manifests can make `expoGoConfig` non-null in a real Release binary.
Keeping this decision here prevents camera, motion, placement, HealthKit, and
Screen Time from drifting into different definitions of “native build.”
