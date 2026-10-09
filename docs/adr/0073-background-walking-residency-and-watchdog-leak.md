---
status: accepted
date: 2026-10-09
---

# 0073: Relocking stops the walking watchdog, and the keep-alive asks for 100 m

## Decision

- **Watchdog.** Before a lock or open state is published, `EnforcementHost` cancels the walking watchdog against the revision the native record holds (`policyRevision()`, then `cancelWatchdogs`). Native `publish` drops a committed watchdog from the record without stopping its DeviceActivity monitor, so each unlock followed by a relock left one monitor registered for its 15 minutes. With ADR 0072's instant timing, a walk with a few stops filled iOS's 20-activity limit; then `startMonitoring` failed with "excessive activities", the walking unlock failed closed, and the apps stayed locked while walking. The JS fix ships by OTA; the native leak in `publish` should also be fixed in the next binary.
- **Keep-alive.** The walk keep-alive asks for `Accuracy.Balanced` (100 m) with no distance filter, instead of 1 km and 500 m (ADR 0036). The blue indicator stays off and auto-pause stays off. Expo restores a running task with the options it was started with, so `hydrateState` (launch and each foreground) re-applies the options to a running keep-alive. That also restarts it from the foreground, which is the reliable case on iOS 16.4+.

## Context

On 2026-10-09 the owner reported that, with the app in the background, walking sometimes did not unlock and stopping often did not lock until they opened the app. Their PostHog events that morning show both:
- a walking unlock at 10:52:52 with no relock until a cold start at 11:25:51;
- a relock that happened only when the app came to the foreground;
- background locks and unlocks that worked within seconds.

Sentry recorded "This application is monitoring excessive activities" at 11:27:51, during the same walks.

Apple DTS (forum thread 726945) says that from iOS 16.4, an app that starts both standard and significant-change location updates (Expo's location task does both) may be suspended in the background if it asks for low accuracy with a distance filter. Continuous background updates need `kCLLocationAccuracyHundredMeters` or better and no distance filter. Once the app is suspended, Core Motion stops reaching it, and nothing locks or unlocks until it runs again. ADR 0036 chose 1 km before any phone test of residency.

## Consequences

- Leaked monitors on a phone that has the old code expire within 15 minutes of their unlock.
- Location costs more battery during Condition windows: Wi-Fi and cell positioning at 100 m with more callbacks, and the callbacks do no work beyond forwarding the location to any listener.
- Residency still needs Location set to Always (AwakeSession). With When In Use, the app is suspended soon after it leaves the screen.
- If background stalls continue, the next steps need a binary: fix `publish`, start the keep-alive from the foreground, or a `CLBackgroundActivitySession`.

## References

- `app-next/src/packages/enforcement/EnforcementHost.ts`, `enforcement/NativeEnforcementTransport.ts`, `activity/lib/location/ExpoLocationClient.ts`, `modules/excerlock-enforcement/ios/ExcerlockEnforcementModule.swift` (`publish`).
- ADR 0036 (keep-alive options, superseded on accuracy and distance filter), ADR 0072 (instant walking).
- https://developer.apple.com/forums/thread/726945
