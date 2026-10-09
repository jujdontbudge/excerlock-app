---
status: accepted
date: 2026-10-03
---

# 0064: Owner filming mode makes walking unlock and lock in about a second

## Decision

A hidden filming mode makes the walking Condition react in about a second, so the owner can film it.

- **Turning it on.** Tap the Settings version footer seven times in a production build. In dev builds those taps still open the developer menu, which has its own Filming mode switch.
- **Duration.** It stays on for two hours (`FILMING_MODE_MS`) in the persisted `excerlock-next.filming-mode.v1` store (`activity` package), or until the same taps turn it off. Settings shows "Filming mode on" under the version while it lasts.
- **What changes.** While it is on, `MotionAdapter` feeds every 50 Hz device-motion sample into `FilmingSteps`, a quick step detector:
  - It measures upward acceleration along gravity, smoothed over 3 samples.
  - A step is a peak of at least 0.12 g that re-arms below −0.03 g.
  - Two steps 250–1000 ms apart within 1.3 s count as walking.
  - 1.5 seconds with no vertical movement of 0.09 g or more counts as stopped (1 s until 2026-10-08).
- **Verdict.** The detector's verdict replaces the normal motion evidence:
  - walking counts as fully verified walking (`verifiedMs = WALK_QUALIFY_MS`), so relief starts at once;
  - stopped is a confirmed stop, so the lock returns at once with no stop grace;
  - the verdict is re-sent every second.
- **Fallback.** With no fresh samples (none for 2 s, or under 1 s of samples since it turned on), the normal evidence applies unchanged.
- **Scope.** It changes nothing else, and nothing at all while it is off.
- **Delivery.** It ships to App Store build 17 by OTA. The owner chose this on 2026-10-03, knowing it is an exception to the rule in `docs/ota.md` that an OTA never changes what users can reach.

## Context

The owner wanted short videos showing that apps unlock the moment you start walking and lock the moment you stop. The shipped walking path cannot do that:
- the stride gate needs a 3 s window and dwell (`SHIPPED_STRIDE_GATE`);
- the walking machine needs 3 s of qualifying evidence (`WALK_QUALIFY_MS`);
- relief then holds through the stop grace (30 s–5 min).

The owner was offered two options:
- a hidden switch in the App Store app, sent as an OTA;
- a separate filming build installed over USB.

They chose the hidden switch because it is fastest and works on their own phone as it is.

Calibration replayed the recorded 50 Hz captures (`strideRhythmCaptures.json`, from git history at `209775cf`) through the real `MotionAdapter` and `reduceWalking`. Results are in `.excer/filming/replay-results.txt`:
- **Unlock:** 0.6 s after walking data began when the phone is in the hand, 0.6 s on a treadmill, 0.8 s in a pocket.
- **Lock:** 0.9–1.0 s after it ended.
- **Steady walking:** never flickers.
- **Sitting still for 60 s:** never unlocks.
- **Normal mode:** unchanged (3.4 s to unlock).

Shaking the phone also counts as walking in filming mode. That is accepted, because only the owner turns it on and it switches itself off. The simulator has no motion sensors, so the real timing on an iPhone is unverified until the owner tries it.

## Consequences

- The owner can film near-instant unlock and lock on their own phone without a new binary.
- Anyone who finds the gesture gets an easier walking Condition for two hours. That is a small Guideline 2.3.1 hidden-feature risk, accepted for now. Remove the gesture, or disclose it in Review Notes, before the next App Store submission.
- While filming mode is on, the app persists detection every second: more battery for up to two hours.
- Filming mode relies on the stride sample stream, so the stride gate kill switch also turns it off.
- A detection commit that lands during a running lock update can wait for the next update (#167). Re-sending every second caps that delay at about a second while filming.

## References

- `app-next/src/packages/activity/lib/detection/FilmingSteps.ts`, `MotionAdapter.ts`, `activity/filmingModeStore.ts`, `settings/SettingsScreen.tsx`.
- `docs/ota.md`, "Submission scope of remote configuration": the rule this OTA knowingly excepts.
- ADR 0035 (stride gate clamps), still accepted; filming mode does not touch the remote clamps.
- #167: dropped detection commit during a running reconcile.
