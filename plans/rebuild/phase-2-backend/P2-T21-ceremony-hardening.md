# P2-T21 — Ceremony hardening

Sole owner of `TreadmillUnlockScreen.tsx`, `GymUnlockScreen.tsx`, `useGymUnlock.ts` and the gait scan
controller wiring for this milestone; P2-T14/T15/T16 contribute only the domain and port changes this task
consumes. Decisions: B3, B12, B19, B20, B22, B24, B25, B27, B28, B31. Findings: 2, 11, 22, 24, 30, 61, 75,
93, 98. Per-finding detail: `docs/audit/fix-map.md` § P2-T21. Spec edits land in
`docs/specs/aha-unlock-screens.md` and `docs/specs/treadmill-mode.md` as part of each item.

## Treadmill

1. **Framing-grace expiry is never silent** (blocker, finding 2). `onExpired` stops calling `router.back()`;
   the screen renders a terminal failure state with two exits: **Try again** (new scan, same rule) and
   **Continue with phone in hand** (handheld start). Minutes already credited are kept. The spec line that
   said "pops back to Home" is amended.
2. **Booking is the gate, not the animation** (finding 30). The shackle lifts, confetti fires and "Exercise
   detected" appears only after the session machine has accepted the `verified` event and the lease exists
   (`WalkingSession.phase === 'walking'`); a failed booking shows the failure state above.
3. **Two stages for a duration rule** (P2-T16). Stage 1 scan: ring = gait confidence; on verify a body settle,
   one success haptic, heading "Exercise detected" / "20 minutes counts the day", **no shackle lift, no
   confetti**. Stage 2 counting: ring = `row.progress / goal`, heading "Counting your walk" / "12 minutes to
   unlock", the propped lease remaining shown; near expiry the lease warning (P2-T09) and the screen say
   "Scan again to keep counting" (`unlockCopy.scanAgain`, also on Home). At `met`: full lift, confetti, "Goal
   reached" / "Unlocked for the rest of today", Done. State rules keep today's single stage.
4. **Camera permission** (finding 24): request, record and honour it before the scan starts; `notDetermined`
   asks, `denied` shows the handheld fallback with the reason and a Settings link; the recorded status is what
   Settings › Permissions › Camera shows (P2-T22).
5. **Verifying after the camera-denied handheld fallback** is explained (finding 98): the sheet says "Checking
   your steps for a moment" rather than a blank verifying state.

## Gym

6. **Instant relief tells the truth** (B22; finding 11). The ceremony consumes `unlockedProvisional`: on the
   30-second confirmation the shackle lifts and the copy reads "Unlocked while you're here" and, for a
   minutes rule, "{n} minutes counts the day"; the ring is reward booking for an unlock that already happened,
   never the gate. An event rule books `met` with `metAt = enteredAt`.
7. **States are distinct** (finding 22): "No gym saved yet" (→ `/settings/gyms`), "Finding you…", and
   "Location is off" (→ Settings) are three states, not one.
8. **Leaving the radius aborts the in-flight check-in** (finding 61): `AbortController` in the
   `presence === 'outside'` branch, not only on unmount.
9. **Timing runs on `ClockPort`** (finding 93): the confirmation window and the ring use `clock.at` and
   `monotonicMs`, never `Date.now`; the dev clock advances them.
10. **The manual check-in sheet is deleted** (finding 75): the gym card's label matches the ceremony it opens;
    copy keys enumerated by grep before deletion (`sessionCopy.noGym` and `error` have other readers);
    `02-screen-inventory.md` SH-checkin row removed.

## Lapsed subscription

Both ceremonies keep working and keep booking progress while lapsed (B21; P2-T18); the success heading stays
and the subtitle becomes "Your apps aren't blocked right now" with a "See plans" link. No confetti claims an
unlock that did not happen.

## Tests first

`features/unlock/__tests__/treadmill.test.tsx`: "framing grace expiry keeps the screen mounted and offers Try
again"; "the shackle does not lift until the session is booked"; "a duration rule's ring tracks minutes after
the scan verifies"; "the scan does not lift the shackle for a duration rule"; "the shackle lifts when the goal
is reached"; "camera denied offers the handheld fallback". `features/unlock/__tests__/gym.test.tsx`: "the
shackle lifts at confirmation, not at the ring's end"; "leaving the radius aborts the check-in"; "no gym saved
routes to the gym list"; "the confirmation advances with the dev clock". "a lapsed ceremony books progress and
does not claim an unlock".

## Acceptance

- [ ] Every exit from either ceremony lands on a screen that explains what happened (no silent shield).
- [ ] `docs/specs/aha-unlock-screens.md` status line and the two spec amendments are updated.
