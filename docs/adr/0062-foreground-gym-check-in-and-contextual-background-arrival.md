---
status: accepted
date: 2026-10-03
---

# 0062: Fresh foreground Gym check-in and contextual background arrival

## Decision

Gym check-in uses one Expo Location fix for its map, distance and acceptance, independently of Gym auto-detect. Accept a fix at most 10 seconds old with accuracy at most min(50 metres, half the arrival radius) and its centre within the radius. A fresh fix whose distance minus accuracy exceeds the radius is outside; other fixes retry for at most 10 seconds and show an explicit result. Recheck throughout the cancelable 30-second confirmation. Manual transitions for saved gyms pass the durable visit log's account epoch even if geofences are disabled. Publish arrivals and exits. Celebrate only after the current open Lock decision is successfully applied.

Offer Always location after saving a gym, while creating a Gym Condition, and once on Home for existing gyms. Explain “so ExcerLock can unlock when you arrive” before the OS upgrade. Enable and register Gym auto-detect after a grant. Persist the offer and explicit manual preference in additive Settings fields; keep the storage key and version unchanged. Existing Always-refusal memory with auto-detect off is treated conservatively as an opt-out. Earlier toggle choices without persisted refusal memory cannot be reconstructed; all future opt-outs are durable. When In Use retains manual check-in and explains that arrival with ExcerLock closed needs Always.

Preserve confirmed visits across account restore and generic coverage loss; invalidate an explicitly removed gym and end a visit on a definitive exit. Re-read current presence on foreground launch before projecting live Gym presence. Historical Progress alone cannot assert live presence. Poll manual visits while foregrounded to detect departures without geofences. Do not promise background departure detection without Always location.

The UI policy in ADR 0053 has a narrow exception for the requested “Getting a better fix…” message during bounded location uncertainty. The picker displays “Finding your location” only until its timeout. Other status-copy rules remain.

## Context

The owner's iPhone at UIUC on 2026-10-03 showed a Chicago picker, a hidden gym circle, a silent check-in button and no background arrival. Independent review found multiple production blockers and a simulator fake that bypassed the production visit path. Native build 17 already contains Expo Location, Maps, TaskManager and Local Search. These changes use their existing calls; no native module or binary changes are required.

ADR 0012 requires durable raw transitions and confirmation on a later execution opportunity. Expo already requests region state on registration. A surviving JS timer cannot guarantee a background wake after 30 seconds, so the product promises “unlocks soon after you arrive”. Force-quit remains different from system termination.

## Consequences

Simulator presence uses the production transition processor, visit log, confirmation and gym reducer. Indoor fix thresholds, shields while the app is closed, force-quit and reboot require Johan's iPhone. Location and distance stay on-device and are absent from analytics and server payloads. Small arrival regions and iOS wake timing still need field verification.

## References

- GitHub issue [#165](https://github.com/JohanSardar/excerlock-app/issues/165).
- [ADR 0012](0012-persisted-detection-and-conditional-watchdog.md), accepted; its durable presence policy remains.
- [ADR 0057](0057-permission-answers-before-setup-advances.md), accepted; refusal memory remains.
- [ADR 0053](0053-screens-stay-still-and-say-nothing.md), accepted; bounded location uncertainty is the exception above.
- `activity/gymFix.ts`, `activity/GymCheckIn.ts`, `gyms/GymBackgroundSetup.tsx`.
