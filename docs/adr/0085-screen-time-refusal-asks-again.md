---
status: accepted
date: 2026-10-19
---

# 0085: Refusing Screen Time asks again instead of sending people to Settings

## Decision

The Screen Time adapter reports iOS's own authorization status and keeps no denial memory. Tapping Don't Allow on Apple's Screen Time prompt still counts as an answer, and Setup moves on, but the next Allow Screen Time page shows Apple's prompt again. A request runs whenever the status is not granted, including `denied`. Setup and the permission page open Settings for Screen Time only after that request returns without a grant. Request failures other than a cancellation go to Sentry before the retry notice.

This replaces the paragraph of [ADR 0057](0057-permission-answers-before-setup-advances.md) that stored a cancellation as a persisted `denied`. The rest of 0057 stands.

## Context

On 2026-10-19 a creator on iOS 26.6.2 with app 1.0.1 could not link Screen Time. PostHog shows `permission_resolved {screen_time, denied}` six seconds after the Allow Screen Time page, and no request after it. Her screen recording shows every later attempt going to "Screen Time is off for ExcerLock. Turn it on in Settings." ExcerLock's page in Settings had no Screen Time switch.

Apple adds the Screen Time switches (per-app "Screen Time Restrictions" and Screen Time › Apps with Screen Time Access) only after an app has been approved once (WWDC22 "What's new in Screen Time API"). After Don't Allow, the native status stays `notDetermined`. ADR 0057 persisted that cancellation as `denied` and turned the page into Open Settings, a dead end with no way back for anyone who declined on the first try. The persisted value also overrode `notDetermined` on every later status refresh, so the dead end survived relaunches.

## Consequences

Anyone who tapped Don't Allow, on any version, recovers after this update: the next status refresh replaces the stored `denied` with iOS's `notDetermined`, and the next tap shows Apple's prompt. Someone who declines repeatedly sees the prompt each time they choose to continue. Not now still skips. A real `denied`, where someone turned the switch off in Settings, still ends in Settings, where iOS shows the switch.

## References

- [0057: Permission answers precede Setup advancement](0057-permission-answers-before-setup-advances.md): partly superseded by this ADR.
- `app-next/src/packages/app-selection/createNativeScreenTimePort.ts`, `app-next/src/packages/setup/SetupFlow.tsx`, `app-next/src/packages/permissions/PermissionDetail.tsx`.
- https://developer.apple.com/videos/play/wwdc2022/110336/
