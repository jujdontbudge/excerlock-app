---
status: accepted
date: 2026-09-17
---

# 0036: Walk keep-alive stays Always location, without the blue indicator

Accuracy and distance filter superseded by ADR 0073 (100 m, no filter).

## Decision

The lock-window residency keep-alive keeps Always background location but stops advertising itself as a background location user and stops paying for a GPS stream:

- `ExpoLocationClient.startLocationUpdates` passes `showsBackgroundLocationIndicator: false`. With Always authorization Apple shows the blue pill only when this is true; the status-bar arrow is a separate, system-owned indicator and still appears while location is active.
- Accuracy drops from `Accuracy.High` (`kCLLocationAccuracyNearestTenMeters`) to `Accuracy.Low` (`kCLLocationAccuracyKilometer`), `activityType` moves from `Fitness` to `Other`, `distanceInterval` becomes 500 m, and `pausesUpdatesAutomatically` stays false.
- Coarse accuracy is scoped to the active lock window: `AwakeSession.reconcile` starts this task only while the shield/conditional window is active and stops it outside, while the foreground fix used for gym save and manual check-in keeps `Accuracy.High`.
- `UIBackgroundModes` stays `["location", "fetch"]` and the Always authorization flow is unchanged. Issue #140 (walking setup never requests Always) remains open and out of scope.

No detection code, rule, grace period or watchdog changes. Only the residency stream's accuracy and indicator options change.

## Context

The captain rejected the blue background-location indicator and asked whether background location could go without breaking hands-free unlock. The investigation report (below) established:

- The pill is self-inflicted. The keep-alive runs a continuous location task purely as a process-residency mechanism — its samples are never read; the walking rule consumes Core Motion — and `showsBackgroundLocationIndicator: true` is the one option that turns it into a pill.
- Apple's rules: for an Always-authorized app the pill appears only when the flag is true (for When In Use it is mandatory while location runs in the background), and the status-bar arrow cannot be suppressed while location is active.
- Live Core Motion delivery stops when the app is suspended, and only background location keeps the process resident. Dropping background location converts hands-free unlock into a tap-to-unlock lease (the report's option 3.a) — a product-model change the captain explicitly did not take.

Alternatives considered:

- `Accuracy.Lowest` (`kCLLocationAccuracyThreeKilometers`), the report's named level, was rejected for this change. The report's own run C calls very-low accuracy combined with significant-change monitoring the one residency risk on iOS 16.4+, and names 1 km as the first fallback. This change ships in the next binary without the report's phone proof, so it takes the fallback now; the phone proof can lower it to 3 km if residency holds.
- Keeping `Accuracy.High` and only flipping the indicator was rejected: the samples are unused, so a GPS stream for the whole lock window is wasted battery.
- Keeping `ActivityType.Fitness` was rejected: the task tracks no workout, and `Fitness` tunes radio behavior the residency does not need. `pausesUpdatesAutomatically` must stay false regardless — the report notes iOS would otherwise pause Fitness updates when the user stops moving, which is exactly when re-lock must fire.

## Consequences

- The pill is gone from the next binary while the arrow and the Control Center indicator remain. The Always purpose string still needs the #140 honesty pass; this ADR does not change it.
- Battery cost drops from a full GPS stream to coarse Wi-Fi/cell positioning with rare callbacks, while the keep-alive keeps Core Motion live.
- Residency now depends on the coarse level holding across a lock window. The report's phone-proof protocol (runs A–C on iPhone Il, including the 20-minute idle residency run) remains the verification before release sign-off. If a run loses residency, raise accuracy (`Accuracy.Low` is already in use; next step `Balanced`) rather than re-raising the indicator.
- Pins: `app-next/guardrails/entitlements.test.ts` asserts the runtime option object (indicator false, coarse accuracy, 500 m distance filter, no auto-pause) and the Always plugin flag; `app-next/src/engine/signals/location/__tests__/ExpoLocationClient.test.ts` covers the same transition through `AwakeSession` (window active → coarse keep-alive; outside → stopped; foreground fix stays High).

## References

- Investigation report: `/Users/johansardar/firstmates/excerlock-firstmate/data/blue-arrow-remove-b1/report.md` (firstmate task `blue-arrow-remove-b1`; not in this repository) — recommendation 3.e, verified Apple-doc table, phone-proof protocol runs A–C.
- [`app-next/src/engine/signals/location/ExpoLocationClient.ts`](../../app-next/src/engine/signals/location/ExpoLocationClient.ts) — keep-alive options and foreground fix.
- [`app-next/src/runtime/detection/AwakeSession.ts`](../../app-next/src/runtime/detection/AwakeSession.ts) — lock-window start/stop.
- [`app-next/config/native.ts`](../../app-next/config/native.ts) — `UIBackgroundModes` and the expo-location plugin flag.
- [`app-next/guardrails/entitlements.test.ts`](../../app-next/guardrails/entitlements.test.ts), [`app-next/src/engine/signals/location/__tests__/ExpoLocationClient.test.ts`](../../app-next/src/engine/signals/location/__tests__/ExpoLocationClient.test.ts) — pins and transition test.
- Related ADRs: [0012](0012-persisted-detection-and-conditional-watchdog.md), [0025](0025-main-is-the-release-source.md).
- Issue #140 (walking setup never requests Always).
