---
status: accepted
date: 2026-09-10
---

# 0021: Separate startup diagnostics from full cold-launch acceptance

## Decision

Instrument one process-scoped native Points of Interest interval from AppDelegate entry through the first React child mount to a hydrated, laid-out real Home on the following animation frame. These are diagnostic sub-intervals only. The T15 full cold-launch target remains unverified until a signed Release build is measured on the target physical iPhone with Apple's application-launch metric; delegate-relative values must never be reported as process-start or first-frame time.

## Context

The existing simulator acceptance script opens a development-client URL and polls accessibility. Its elapsed command/poll time is neither an app clock nor Release startup evidence. React Native 0.86 posts `RCTContentDidAppearNotification` from Fabric's root component after its first child mount. Expo local modules provide a stable JS-to-native readiness marker, while an idempotent config plugin preserves AppDelegate instrumentation across clean prebuilds. AppDelegate is the earliest app-owned callback but occurs after process and dyld startup.

## Consequences

The added native module advances the candidate runtimeVersion from `1` to `2`; a new binary is required. No production OTA publication is authorized under the submission-ready-only scope.

Points of Interest traces can explain native-delegate-to-React and delegate-to-interactive-Home regressions on one monotonic native clock. Home emits nothing for fake runtimes and waits for hydration, layout, and a frame; native-content races retry for at most eight frames. The helper exports raw xctrace XML and explicitly leaves numeric timing unverified until its schema is validated against an actual export fixture. A physical signed XCTest `XCTApplicationLaunchMetric`/device trace remains required; simulator and dev-client captures are harness checks only.

## References

- `app-next/modules/excerlock-startup/`
- `app-next/src/runtime/startup/useInteractiveHomeMarker.ts`
- `app-next/scripts/measure-startup.sh`
- `plans/ship/T15-performance.md`
