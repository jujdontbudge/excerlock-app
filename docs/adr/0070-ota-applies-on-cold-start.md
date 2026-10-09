---
status: accepted
date: 2026-10-08
---

# 0070: A downloaded OTA update applies only on the next cold start

## Decision

The app never reloads itself to apply an OTA update. `OTA_APPLY_ON_COLD_START_ONLY` in `updates/updates.ts` is `true`. `reloadWithGuard` returns `deferred-unsafe` / `cold-start-only` before it would call `Updates.reloadAsync`. A downloaded update starts the next time iOS launches the process: when the user opens the app after it was closed or evicted, or when iOS relaunches it in the background for location, geofence or motion. The foreground check and download stay as they were. `./excer check` (`updates-owner`) fails if the flag is not `true` or if a second reload call appears.

## Context

After the 2026-10-08 OTA, the owner reopened the suspended app and it stayed blank until they force-quit it. The only OTA-specific path is the foreground reload in `useOtaCoordinator` (ADR history in `docs/ota.md`). On the `active` transition, it reloaded into a pending update that was usually downloaded during a background relaunch, without disposing the running runtime: location tasks, motion, Screen Time, Supabase and Adapty. The new runtime's startup has no overall deadline, so a stall left a blank `ScreenShell` until the process was killed. Walking Conditions keep the process alive in the background, so a reload could also land in the middle of detection.

The alternative, reloading only when going to the background after disposing the runtime, still restarts JS during background work and needs disposal that has never run in production.

## Consequences

- Publishing an OTA can no longer freeze or restart a running app; users get the update on their next cold start, which for a long-lived background process can be days later.
- Background detection is never interrupted by an update.
- A startup deadline for `AppRuntimeProvider` and a timeout around `getAuthContext` in `ServerSubscriptionAdmission` remain follow-ups for non-OTA stalls.

## References

- `app-next/src/packages/updates/updates.ts` (`OTA_APPLY_ON_COLD_START_ONLY`, `reloadWithGuard`), `tools/excer/checks/boundaries.ts` (`updatesOwner`).
- `app-next/app.config.ts` (`checkAutomatically: 'ON_LOAD'`, `fallbackToCacheTimeout: 3000`).
- ADR 0068 (OTA ship gate).
