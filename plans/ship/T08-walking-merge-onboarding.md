# T08 — Walking merge, place multi-select, the 3-second button (B40, B44)

Spec: `01-detection-model.md` §4 (manual check button). Facts: `research/conditions-audit.md` §2 (the
"Detecting walking…" machine, duplicated copy in `home.ts:5-9` and `sessions.ts:4-11`, `0%` = `live?1:0`),
§3 (`WalkPlace` blast radius, `entry.ts:4`, `unlockKind`), §7 (onboarding steps).

## Steps

1. Delete `WalkPlace` from `Rule`/`Mode`; delete every branch on `'treadmill'|'outside'|'either'`
   (`entry.ts`, `unlockKind`, `WalkingSheet` treadmill block, B27 pills). One walking condition. Home offers
   one card with the orange check button and one secondary "My phone is on the treadmill" button → propped mode.
2. New `walkPlaces: Array<'treadmill'|'outside'>` in `profileStore` (not on the rule). Onboarding W1 becomes a
   multi-select `ChoiceRow` list "Where do you walk?" (both selectable, ≥1 required); the same control in
   Settings › Preferences. Written to PostHog as user property `walk_places`. Grep test: nothing else reads it.
3. W2 no longer filters modes by place: step goal (Recommended) · walk for a set time · unlock while walking.
   Treadmill note on W4 deleted.
4. Delete the walking phase copy in both content files (`detectingWalk`, `checkingPace`, `verifying`,
   `verifyingBody`, "Keep walking to stay unlocked"); delete the percentage row and progress bar from the
   state-rule card (`HomeScreen.tsx:123`, `progressContent.ts:22`); delete the popup sheet.
5. The orange button: idle "Check walking" → tapped: 3 s observe → "Detected" (state on, haptic) or
   "Not detected — hold your phone and walk". No sheet, no modal, no spinner; the button label is the only
   feedback. In the Always-denied case the card subtitle explains the button is how to unlock.
6. Copy for the walking card states (locked / unlockedWalking / unlockedPropped) in `home.ts` only — one
   copy source.
7. Screen inventory + product model edits.

## Tests first

- `walking-card.test.tsx`: renders no `%`, no progress bar, no "Detecting"; button label transitions on a
  mocked `MotionPort` (walking within 3 s → "Detected"; not → the failure label; never an intermediate
  spinner state visible after 3 s).
- `walkPlaces.test.ts`: multi-select persists, PostHog property set, no domain read.

## Acceptance

- [ ] Onboarding walking branch: W1 multi-select → W2 three modes → goal → S1. No R/B/treadmill place screens.
- [ ] Home walking card matches B44 on the simulator with the dev-menu motion toggle.
