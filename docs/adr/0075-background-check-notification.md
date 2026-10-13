---
status: accepted
date: 2026-10-12
---

# 0075: A notification tells the user when iOS has closed ExcerLock during a walking Condition

## Decision

- **Background check.** While a walking Condition is locking apps or a walking Unlock is live, and ExcerLock is not in the foreground, the runtime schedules a local notification three minutes ahead (`background_check`) and pushes it back every minute (`runtime/lib/BackgroundCheck.ts`). A running app never lets it fire. If iOS suspends or ends the process, the timer stops, the notification fires ("ExcerLock stopped in the background"), and tapping it relaunches the app, which restores detection. Coming to the foreground, leaving the Condition window, turning notifications off, or a fresh launch cancels it. It needs notification permission and the app's notifications setting.
- **Launch telemetry.** `runtime_launched` carries the `app_state` at process start, once per process. A gap in `shields_*` events that ends in `runtime_launched` means iOS ended the previous process; one that ends without it means the process was only suspended.

## Context

On 2026-10-12 the owner reported that background walking unlock and lock worked for about an hour, then stopped: the apps stayed open or stayed locked until they reopened ExcerLock. Their PostHog events (update `01a121d4`, build 17) show hundreds of background lock and unlock pairs within seconds of each other, and two stalls:

- 15:00:18 (US Central) walking unlocked, with no event until 15:36:32, when `home` opened and the shields went back on;
- 17:53:41 walking unlocked, with no event until 18:01:02, when `home` opened and the shields went back on.

Both reopen at `home`, the first route, so both look like cold starts. Sentry has no error near either time. The JS runtime was not running: iOS ended the process, most likely through memory pressure while the user was in an app that had just unlocked. Standard location updates do not relaunch an ended app, so walking could not lock or unlock anything until the owner opened it. The walking watchdog (ADR 0073) can relock up to 15 minutes later, but nothing can unlock until the app runs again.

## Consequences

- The fix ships by OTA. It does not stop iOS from ending the app; it shortens a silent outage to about three minutes and a tap.
- Users without notification permission get no warning.
- Each re-arm reads the notification permission and replaces one pending request. That costs little while the keep-alive is running anyway.
- A next binary should make the app recover by itself:
  - `CLBackgroundActivitySession` with `CLLocationUpdate.liveUpdates`, recreated at launch, so iOS relaunches an ended app when location updates arrive;
  - a `warningTime` on the watchdog schedule, so a relock lands within about a minute instead of 15;
  - measure background memory in Instruments to lower the chance of being ended.

## References

- `app-next/src/packages/runtime/lib/BackgroundCheck.ts`, `runtime/lib/createRealRuntime.ts`, `notifications/notificationPlan.ts`, `notifications/createNativeNotifications.ts`.
- ADR 0036, 0072, 0073.
- https://developer.apple.com/videos/play/wwdc2023/10180/
- https://developer.apple.com/forums/thread/747557
