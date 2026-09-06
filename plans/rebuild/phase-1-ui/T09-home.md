# T09 — Tabs shell and Home

## Inputs

`02-screen-inventory.md` §6 (Home), mockup `main-home-v3.png` (concept only), AppBlock replay 50 (`reference/
replay-50.png`) for the blocking status card, reference study (`design/motion/reference/`) (component order per OtterLife) and
`00-principles.md`. `01-product-model.md` §3 (LockDecision), §6 (unlock hint).

## Steps

1. `app/(tabs)/_layout.tsx` with the custom `TabBar` from T02: Home · Conditions · Analytics · Settings, labels
   and line icons, indicator motion modeled on OtterLife's (reference study), content stays mounted, no cross-fade through black.
   Conditions/Analytics/Settings render `EmptyState` placeholders until T10–T12.
2. `src/features/home/HomeScreen.tsx` composing, in the OtterLife-mapped order Codex derives from the reference study: `StatusCard`, `ProgressCard` list,
   locked-apps row, streak chip, "Add condition". Header per OtterLife mapping (greeting with `profile.name`,
   date).
3. `StatusCard` content model: `src/features/home/statusContent.ts` maps `LockDecision` + permissions +
   lockedApps to `{ icon, title, subtitle, action? }` for every state in §6 (locked, unlockedMet,
   unlockedWalking with countdown, beforeWindow, afterWindow, noRulesToday, permissionNeeded overrides,
   noAppsSelected, allPaused). Unit-test every mapping including time formatting ("Blocking resumes tomorrow
   at 9:00 AM", "Unlocked while you walk · 12:40 left").
4. The simple v1 unlock moment (decision B19): on transition into `unlockedMet`, lock glyph → open glyph with
   `spring.pop` on scale + crossfade, one success haptic, nothing else. Reduce Motion: crossfade only. Test the
   transition via the fake clock (`home-before-window` → advance to window → locked → fake steps reach goal →
   unlockedMet).
5. `ProgressCard` per rule scheduled today: walking steps (live count from `StepsPort` fake auto-increment),
   gym arrival ("Check in" opens SH-checkin, "Auto-detect on/off" pill), gym minutes (progress), run/bike
   (progress from `HealthPort` fake), state rule ("Start a walk" opens SH-walk; live session shows lease
   countdown and Stop). Paused rules are not shown. Test each variant.
6. Locked-apps row opens `SH-apps`; streak chip reads `useStreak()`; "Add condition" opens `/builder` (T10
   provides it; route exists now with a placeholder).
7. Every Home state has a scenario; screenshot each; record: locked → met via dev menu.

## Acceptance

- [ ] All ten Home states render from scenarios with correct copy (snapshot tests of `statusContent`).
- [ ] Fake clock and fake steps drive `locked` → `unlockedMet` live, with the haptic call asserted in a test.
- [ ] Tab switch keeps Home scroll position; indicator animation matches the OtterLife tab motion in the reference study.
- [ ] M1 gate: fresh install → walking onboarding → paywall stand-in → setup → Home, recorded end to end in
      `evidence/T09/m1-end-to-end.mp4`, and Johan has looked at it.
