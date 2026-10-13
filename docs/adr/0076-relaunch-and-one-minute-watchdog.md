---
status: accepted
date: 2026-10-12
---

# 0076: Core Location relaunches an ended app, and a walking Unlock relocks within about a minute if the app dies

## Decision

- **Relaunch anchor (`modules/excerlock-residency`).** While the walk keep-alive runs inside a walking Condition's window, the app also iterates `CLLocationUpdate.liveUpdates()`, holds a `CLServiceSession(authorization: .always)` on iOS 18 and later, and monitors visits. A persisted flag with an expiry (the window's end) lets an `ExpoAppDelegateSubscriber` retake all three in `didFinishLaunchingWithOptions`, before React Native starts, because Core Location only rejoins sessions retaken within a few seconds of a relaunch. It retakes them only with Always authorization; otherwise, or once the flag has expired, launch stops visit monitoring. `AwakeSession` sets the flag together with the keep-alive and clears it when the walking window ends. The classic Expo task stays: it is what keeps the process running while the phone does not move. No `CLBackgroundActivitySession`, so there is no blue indicator.
- **One-minute watchdog.** On a binary whose enforcement module exports `watchdogWarning`, a walking or treadmill Unlock registers its 15-minute DeviceActivity schedule with `warningTime`, so `intervalWillEndWarning` relocks 90 seconds after registration (`fireAt`); the extension accepts the warning from 60 seconds after registration, so a warning that arrives early still relocks. The app renews it every 30 seconds. In the foreground the one-second clock tick drives renewal; in the background a 15-second timer reconciles while the policy is conditional. A failed renewal keeps the previous registration while it still protects for at least 30 seconds, instead of failing closed mid-walk. Within 90 seconds of `eligibleUntil` the registration drops `fireAt` instead of renewing every tick. Gym Unlocks keep the 15-minute end, because gym presence comes from geofence relaunches, not a running process. On runtime 4 binaries nothing changes.
- **Publish no longer leaks watchdogs.** Native `publish` stops the monitor of a committed watchdog it drops, drops staged registrations older than 30 seconds, and on each new revision stops any `excerlock.watchdog.*` monitor that has no registration (ADR 0073 named this for the next binary).
- **The ADR 0075 notification** now needs the keep-alive to be running inside a walking window, so While Using users and other Condition kinds never see it, and coming back to the app also removes one already shown.
- **Runtime 5.** New native code, so `runtimeVersion` becomes `5`. JS stays compatible with runtime 4 through optional module lookups and the `watchdogWarning` capability.

## Context

ADR 0075: on 2026-10-12 iOS ended the owner's ExcerLock in the background twice, both times seconds after a walking Unlock, and nothing ran again until they opened it. The research (WWDC23 10180, WWDC24 10212, DTS forum threads 794100, 797319, 767460, 810433, 747557) found:

- Classic continuous updates keep a process alive but never relaunch it. Significant change relaunches only after about 500 m, so never indoors or on a treadmill.
- `liveUpdates` and Core Location sessions are relaunched after a system kill once location updates are available, if retaken immediately at launch. A force quit from the app switcher prevents background relaunch.
- Apple asks background apps to stay under 50 MB. Jetsam ends larger ones first.
- `warningTime` is the sanctioned way below the 15-minute minimum. DeviceActivity callbacks fire only while the device is in use, so a relock may land when the phone is next picked up.

## Verification

On an iOS 26.4 simulator with the Release build: with the flag set and Always granted, a `SIGKILL` (as jetsam does) was followed by a background relaunch with the location launch key within about a second, five times out of five, and JS reconciled about two seconds later. With the flag off, expired, or with While Using only, the app stayed ended. Release footprint was about 75 MB in the foreground and after a background relaunch. Scripted runs of `planWatchdog` and `EnforcementHost` covered renewal, refused renewals, end-of-window, gym switches and runtime-4 behaviour. DeviceActivity callbacks, battery, jetsam on a real phone and the app-switcher force quit need the owner's iPhone.

## Consequences

- If the process dies during a walking Unlock, apps relock within about 90 seconds of the last renewal, instead of up to 15 minutes later.
- `CLServiceSession` needs iOS 18; on iOS 17.4–17.x only `liveUpdates` and visits remain, so relaunch is less certain there.
- After a kill, the app returns when the phone next gets location updates. On a stationary phone that can take a while; the ADR 0075 notification covers that gap.
- A user force quit still stops everything until the app is opened.
- More location work during Condition windows: battery has to be measured on a device.
- More DeviceActivity calls (one start and one stop every 30 seconds while walking unlocked). Apple publishes no rate limit; a refused renewal is reported to Sentry and the previous registration stands.

## References

- `app-next/modules/excerlock-residency/`, `activity/lib/detection/AwakeSession.ts`, `ports/watchdog.ts`, `enforcement/EnforcementHost.ts`, `modules/excerlock-enforcement/ios/ExcerlockEnforcementModule.swift`, `targets/DeviceActivityMonitorExtension/GuardedDeviceActivityMonitorExtension.swift`.
- ADR 0036, 0073, 0075.
- https://developer.apple.com/videos/play/wwdc2023/10180/
- https://developer.apple.com/videos/play/wwdc2024/10212/
- https://developer.apple.com/documentation/deviceactivity/deviceactivityschedule/warningtime
