---
status: superseded
date: 2026-09-09
---

# 0007: Gym presence session drives unlock and minute credit

Superseded for the ship architecture by [ADR 0012](0012-persisted-detection-and-conditional-watchdog.md).
Historical implementation below is preserved; T10/T11 integration and device verification remain pending.

## Decision

Gym presence is a persisted session in `ruleDaysStore.gymPresence` (`placeId`, `startedAt`, `confirmedAt`). The same 30-second `GymPort.checkIn` confirmation opens it whether the user taps Unlock or the app-level `startGymPresenceSync` engine notices they are inside a saved gym. A confirmed session yields the new `unlockedAtGym` lock state while a gym condition is active. Sampled absence pauses the minute clock immediately; sustained absence (60 seconds) ends the session so the lock returns. Both waits are app-fixed engine constants in `src/domain/presence.ts`.

## Context

Before this, presence only refreshed while the gym unlock screen was open, so a visit that started there kept crediting minutes after the user went home, and a target condition offered no relief until the goal was met. The PRD (§3.4, §3.8) asks for a 30-second confirmation debounce, instant relief on arrival, a manual tier that works on "while using" location, and leave-detection that never punishes: a single blip must not relock a workout. Foreground sampling every three seconds is what the Phase 1 runtime has; background geofencing, "always" location and shield enforcement remain Phase 2, so the manual "I'm at the gym" route stays the safety net and the auto-detect toggle keeps its background meaning.

Alternatives considered: deriving the unlock from raw sampled presence (rejected: no debounce, flickers at the radius edge) and keeping presence local to the unlock screen (rejected: Home cannot relock and the clock cannot pause).

## Consequences

Home, the unlock ceremony and the minute clock share one source of truth, and tests can drive it with `dev.setPresence` plus clock advances. Leaving the gym relocks about a minute after the last inside sample, and the timer stops within one sample. Confirmation restarts after a cold launch. Follow-up: background geofencing and shield enforcement in Phase 2 should feed the same session.

## References

- `app-next/src/features/home/gymPresenceSync.ts`, `app-next/src/demo/gymProgress.ts`, `app-next/src/domain/resolveLock.ts`
- `app-next/src/features/home/__tests__/gym-presence.test.ts`
- `excerlock-app-prd.md` §3.4 and §3.8
