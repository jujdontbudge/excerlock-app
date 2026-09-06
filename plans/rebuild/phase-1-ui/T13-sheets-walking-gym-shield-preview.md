# T13 — Walking session, gym check-in, remaining sheets, shield preview

## Inputs

`02-screen-inventory.md` §7–§8. Old app facts (read-only): `app/src/home/signals/walkingSessionController.ts`
(phases, 15-minute lease, stop grace), `app/src/signals/placement` (propped vs handheld), the treadmill spec
`docs/specs/treadmill-mode.md` (propped framing flow), `app/targets/ShieldConfiguration/ShieldContent.swift`
(what the shield can show). Reference study (`design/motion/reference/`).

## Steps

1. `SH-walk` walking session sheet (state rule): Start → `WalkingPort.start(rule)`; phases from the fake script:
   `verifying` ("Start walking… checking your pace" with a pulsing footprint), `walking` (big lease countdown
   "12:40 until renewal", steps ticking, Stop), `grace` ("Keep walking to stay unlocked · 0:28"), `ended`
   (summary, Done). Treadmill place: a "Prop your phone on the console" framing view with a placeholder
   camera frame and the propped/handheld indicator driven by the fake (`placement: 'propped' | 'handheld'`).
   Home `StatusCard` reflects `unlockedWalking` while the sheet is open or minimized.
   Tests: script drives the phases; Stop ends; grace → ended re-locks Home.
2. `SH-checkin` manual gym check-in: "You're at Gold's Gym?" with distance hint from the fake (`inside` /
   `outside` → "You're 400 m away" and a disabled Check in), success → rule met → Home shows `unlockedMet`.
3. `SH-delete`, `SH-time` already exist; finish `SH-apps`, `SH-gym` polish modeled on OtterLife sheets (reference study) (drag-to-dismiss, backdrop).
4. `ShieldPreview` (dev menu): renders the blocked-app screen content model
   `{ title: 'Blocked by ExcerLock', subtitle: unlockHint, primary: 'Open ExcerLock', secondary: 'Keep walking' | 'OK' }`
   in a full-screen white-blur layout matching what the Swift extension will draw in Phase 2, for each cause
   (`locked`, `lockWindow`, `walkingEnded`). Content model lives in `src/domain/shieldContent.ts` with tests so
   Phase 2 ports the exact strings.
5. Evidence: recordings of the walking session (all phases), check-in inside/outside, shield preview per cause.

## Acceptance

- [ ] `home-walking-session` scenario plays the whole script and Home follows every phase.
- [ ] `gym-arrival-user` check-in inside → met → unlockedMet; outside → disabled with distance.
- [ ] Shield preview strings come from `domain/shieldContent` and match the unlock-hint law.
