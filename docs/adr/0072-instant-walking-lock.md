---
status: accepted
date: 2026-10-08
---

# 0072: Walking unlocks and locks within about a second, for every account

## Decision

- **Fast detector by default.** `FAST_WALKING_DETECTION` in `activity/filmingModeStore.ts` is `true`, so every account uses the filming-mode step detector (ADR 0064) whether or not filming mode is on. Two steps within 1.3 seconds count as walking. Walking ends after `FILMING_STEPS.stopMs`, now 1 second (it was 1.5 seconds under ADR 0069).
- **No dropped commits.** If a detection change commits while a reconcile is running, the runtime runs one more reconcile once that reconcile finishes (`createRealRuntime.ts`), instead of waiting for the next heartbeat (#167).

Replaying the recorded walks (`.excer/filming/adapter-replay.ts`), apps unlock 0.6–0.8 seconds after walking starts and lock 0.9–1.0 seconds after it stops. Sitting still for 60 seconds never unlocks. With the normal detector, unlock took 3.4 seconds and lock took 35 seconds or more.

## Context

The owner found that walking unlocked and locked too slowly, mostly in the background: apps unlocked only around the time they stopped walking, and stayed open long after they stopped. There are no other users, so on 2026-10-08 the owner chose near-instant timing for everyone and to ship it by OTA.

In the background, motion keeps flowing only while iOS keeps the app alive. That needs the walk keep-alive, which needs Location set to Always (ADR 0036). This decision does not change that requirement.

## Consequences

- Shaking the phone, or a short pause at a crossing, can unlock or lock the apps. Set `FAST_WALKING_DETECTION` back to `false` before real users arrive.
- The 30-second grace from the normal detector no longer applies, so a brief gap in motion updates locks the apps.
- Timings come from replayed captures and are not yet measured on a device.

## References

- `app-next/src/packages/activity/filmingModeStore.ts`, `activity/createNativeDetection.ts`, `activity/lib/detection/FilmingSteps.ts`, `runtime/lib/createRealRuntime.ts`.
- ADR 0036 (walk keep-alive), ADR 0064 (owner filming mode), ADR 0069 (filming timings).
