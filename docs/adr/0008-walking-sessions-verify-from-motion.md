---
status: accepted
date: 2026-09-09
---

# 0008: Walk & Scroll sessions verify from the motion signal

## Decision

A walking-state session is driven by a live motion classification (`WalkingPort.observeWalking`), not by a timer. `verifying` becomes `walking` only after the cadence has held for `WALK_VERIFY_MS` (10 seconds); while it holds, the 15-minute lease is renewed; when it stops the session enters `grace` for the user's stop-grace setting and then `ended`. The app-level `startWalkingSync` engine starts that same session on its own when walking is detected and a walking-state condition can earn today, so "I'm walking" on the card and automatic detection share one path. Scenario scripts (`scenario.walking`) keep their scripted phases for demos and recordings; only unscripted sessions verify from the signal.

## Context

Before this, any handheld session moved through verifying, walking, grace and ended on a fixed six-second script regardless of movement, so the card could not "actually check" anything and there was no automatic unlock. The PRD (§3.5b) specifies walking classification plus a sustained cadence threshold as the qualifying condition, an app-fixed threshold, and graceful early ending without punishment. The Phase 1 runtime has no native pedometer adapter yet: the fake exposes the classification through `dev.setMotion` and the Motion dev control, and a native CMPedometer/CMMotionActivity adapter should sit behind the same port later, the way `foregroundGym` wraps location.

## Consequences

Home cards report "Detecting walking…", "Walking detected" and "Keep walking to stay unlocked" from the session phase, and colour the label and bar green once detected. A manual Stop is respected: automatic restarts wait for walking to stop and begin again. The `home-progress-content` snapshot changed accordingly. Follow-up: the native motion adapter, and shield enforcement, remain Phase 2.

## References

- `app-next/src/demo/fakes/WalkingFake.ts`, `app-next/src/features/home/walkingSync.ts`, `app-next/src/domain/walking.ts`
- `app-next/src/features/home/__tests__/walking-sync.test.ts`
- ADR 0007 (gym presence session), `excerlock-app-prd.md` §3.5b
