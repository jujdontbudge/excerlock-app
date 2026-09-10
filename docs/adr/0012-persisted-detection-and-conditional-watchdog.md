---
status: accepted
date: 2026-09-10
---

# 0012: Persisted detection and conditional watchdog enforcement

## Decision

Use one runtime-root/headless enforcement reconciler, fed by persisted versioned detection reducers.
Keep transient walking verification, stop grace, propped pickup (20 seconds), put-down handoff
(60 seconds) and gym confirmation (30 seconds) as timestamps and evidence generations, not JS timers
expected to survive suspension. Retire the public walking lease contract, not the internal reducer.

Watchdog protection applies only to eligible active-window LIVE conditional relief. Never arm/relock
for earned-goal unlock, outside-window/no-rule states, confirmed lapsed entitlement or account deletion.
Arm valid protection before unshielding; renew without removing the only valid protection first.
Every native callback checks coherent App Group generation, selection, account/window eligibility and
earned suppression before any shield write. Cancellation alone is insufficient against queued callbacks.

Persist raw gym enter/exit before returning from a background task; settle 30-second confirmation on
an actual later alive path. Explicit geofence exit ends live presence immediately. Sampled location noise
is a separate foreground policy; don't convert a missed sample into a definitive region exit. Earned
event/target unlock survives departure. Historical progress never fabricates current live presence.

Walking qualifies after three seconds of supported classification OR qualifying cadence per ship model.
Freshness is tracked per source: change-driven CMMotionActivity silence alone is not sensor death while
cadence remains fresh. Total missing evidence expires live qualification. Persist clock watermarks,
credited-through cursors and session generations to reject stale callbacks and duplicate credit.

## Context

Supersedes ADR0007's foreground-only gym exit semantics for explicit geofence events, and ADR0008's
10-second/lease walking policy. Their implementations remain historical context while T10/T11 are
pending. The copied legacy geofence processor sleeps 30 seconds before saving entry; suspension can
lose the entire visit. The copied placement classifier also debounces pickup for three seconds plus
feature windows, so it does not prove the spec's approximate one-second pickup target.

One state snapshot must distinguish planned enforcement from successfully applied native state.
Unknown/transient entitlement errors preserve prior applied state and do not grant new relief; confirmed
lapse clears shields and cancels enforcing monitors. Authentication readiness gates money/sync, not an
invented enforcement condition. Headless wakes and foreground reconciliation share the same policy.

## Consequences

Requires serialized native shield operations, generation-aware Swift monitor callbacks and tests of
callback/read/write interleavings, not only JS mocks. Main-root composition survives Home/paywall
unmounts. TaskManager registration is module-scoped and background callbacks finish promptly.

Location-session "awake" status means a requested/running capability, not guaranteed continuous host
execution. System termination differs from deliberate force-quit; never promise geofence relaunch after
force-quit. A future schedule boundary cannot be assumed to start the main CoreMotion host merely because
an extension ran. DeviceActivity minimum intervals/backdating/jitter, battery, pickup-to-lock timing and
background detection remain physical-device release gates. Do not retune verified native thresholds or
lower acceptance targets merely to satisfy simulated timing; measure, fix and document actual results.

## References

- `0007-gym-presence-session.md`, `0008-walking-sessions-verify-from-motion.md` (superseded, preserved).
- `plans/ship/01-detection-model.md`, T10 and T11 implementation specifications.
- Copied `engine/signals/location/GeofenceEventProcessor.ts` and placement classifier (review findings).
