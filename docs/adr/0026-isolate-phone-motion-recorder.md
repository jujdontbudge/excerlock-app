---
status: accepted
date: 2026-09-12
---

# 0026: Isolate the phone motion recorder from the shipping app

## Decision

Build the real-device walking research recorder as a standalone SwiftUI development companion under `tools/phone-walking-recorder`, with bundle ID `com.johansardar.excerlock.lab.walkingrecorder`. It has no Expo Updates integration, production-app target membership, App Group, background mode, or enforcement entitlement. It writes only to its own sandbox and is installed with existing development signing, never through TestFlight, App Store, or OTA.

The companion consumes Core Motion directly. Because the production TypeScript runtime cannot be embedded safely in this native-only app, it contains an explicitly identified equivalent Swift port of `MotionAdapter` and `walkingMachine`; one shared fixture is replayed against both the production TypeScript and Swift port to detect behavioral drift.

## Context

The stationary/high-cadence fixture reaches active walking through the actual production OR policy, while physical iPhone gait, shaking, and lifecycle timing remain unmeasured. Research requires richer raw device-motion fields, precise user label boundaries, interruption evidence, and local export, but the harness must never enter the production binary or an OTA bundle. A runtime-hidden production screen was rejected because it could still ship. A second Expo app was rejected as unnecessary native/runtime surface for a single-device Core Motion lab tool.

The implementation is source-complete and simulator-tested. Physical sensor behavior and installation remain separate evidence gates; simulator data cannot establish gait performance.

## Consequences

The normal app and its mutable stores cannot be overwritten or shared by the recorder. Production CI guardrails verify the source/build-root boundary. The app stays awake while recording in the foreground and reports lifecycle/sample gaps, but deliberately has no background keep-alive; it cannot claim continuous capture through iOS suspension. Raw observations, ground-truth labels, inferred detector decisions, and system events remain separate in each archive.

Any production detector change must update the fixture/port parity proof. The lab-only 50 Hz acceleration, attitude, and magnetic fields are additional research evidence and are not represented as current production telemetry. A connected, trusted personal iPhone and an already-valid development profile are still required to prove installation and physical capture.

## References

- `tools/phone-walking-recorder/README.md`
- `tools/phone-walking-recorder/Sources/ProductionWalkingDetector.swift`
- `tools/phone-walking-recorder/Fixtures/production-path.json`
- `guardrails/phone-walking-recorder-boundary.test.ts`
- [0005: Prefer CLIs for iOS and service operations](0005-cli-first-ios-and-service-tooling.md) — accepted
- [0012: Persisted detection and conditional watchdog](0012-persisted-detection-and-conditional-watchdog.md) — accepted
