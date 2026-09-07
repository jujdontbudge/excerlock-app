# Fable handoff: onboarding UI integration

## Goal

Continue from the completed ExcerLock onboarding redesign, understand the product and interaction decisions below, independently review the committed work, and merge the onboarding commits into the intended target branch without disturbing concurrent uncommitted work.

## Repository state

- Repository: `/Users/johansardar/ExcerLock`
- Current branch: `rebuild/phase-1`
- Handoff commit: `70fb0d931f195107d5575cfc26a36010c285d419`
- Product spec: `excerlock-app-prd.md`
- UI build spec: `docs/codex-dashboard-ui-build-spec.md`
- Visual system: `design/STYLE.md`
- The worktree is heavily dirty with concurrent work. Preserve it exactly.

## Completed onboarding work

The implemented onboarding now follows this product flow and visual language:

- Welcome and introduction screens use the approved ExcerLock orange, cream, type scale, progress header, and activity imagery.
- Name, referral source, age, occupation, goal, motivation, and screen-time questions use consistent layouts and selection behavior.
- Selected choice rows fill completely orange, preserve their icon, use white text, and show a white checkmark.
- Similar concepts share the same normalized rounded-solid icon family. Unselected icons are orange; selected icons become white. The gym icon is the canonical white dumbbell glyph. The fire icon was replaced with a rounded library glyph.
- Screen-time input asks for daily scrolling hours using discrete hour ranges.
- The impact story animates a year-of-life dot grid faster, keeps unfilled dots visible, and shows a centered orange free-time percentage with supporting black copy.
- The trend screen uses thicker, clearer crossing curves and omits the visible “illustrative, not a forecast” caption.
- The habit-loop story is a four-part professional circular diagram with one icon per stage and precise clockwise arrows.
- The initial loop says “You’re stuck in a loop” and centers “Scrolling is the habit.”
- Pressing Continue transforms the same mounted diagram instead of navigating to a separate page. The lock and running interventions enter as part of the loop transformation.
- Layout movement and text/icon fading happen simultaneously. The implementation avoids blinking, flashing, delayed text swaps, white cards, or a separate white-background state.
- The final loop explains that exercise becomes the habit and is the final onboarding lesson; the redundant “Built around small, repeatable habits” screen was removed.
- Walking, running, gym, biking, and duration/goal branches produce a live lock preview based on the user’s current selections.
- The schedule screen keeps the same live lock visible while days and times are edited. Its message updates for the selected schedule, all-day mode, and the chosen exercise pathway.
- The schedule screen was compacted so its header, controls, validation, live lock, and Continue button fit in one iPhone viewport without scrolling.
- The live lock now has one canonical compact size on every branch and schedule screen.

## Relevant commit series

The current onboarding refinement series is contiguous and ends at `70fb0d9`:

```text
7af87f2 Clean up circular habit layout and clarify loop copy
fa1757c Use precise circular arcs and tangent-aligned arrowheads
48b8ae6 Animate lock and running stages into the habit-change loop
4339305 Keep habit loop mounted while intervention icons slide in
932ec6f Use exercise wording and runner icon in changed loop
34ab06b Improve habit loop spacing across onboarding states
f671265 Refine loop geometry and staged transformation
37fbac7 Crossfade loop story without flashing
7a6ff5b Synchronize loop crossfade with movement
032ba2e Order exercise before reward in loop
24c2590 Make exercise loop the final onboarding lesson
e9e51a0 Preview every onboarding rule as a live lock
aa1cf5c Keep rule lock preview live during schedule setup
3af37b9 Compact schedule controls and lock to fit viewport
70fb0d9 Normalize rule preview size across onboarding
```

Earlier onboarding commits on this branch provide the visual foundation:

```text
ab50a19 Build third introduction with separate library activity tiles
12aedff Match name referral age and occupation questions to approved references
2d271f8 Unify onboarding headers and solid orange choice selections
6b17579 Rename goal question and use orange library goal icons
19fb759 Normalize onboarding icons to orange with white selected states
9f95379 Unify rounded solid icons and replace scrolling slider with hour ranges
cb562a1 Replace flame with attributed rounded library fire glyph
958b310 Recreate staged scrolling impact narrative from Unrot reference
b129fa5 Speed up impact sequence and strengthen neutral dot contrast
354f003 Add centered free-time percentage above scrolling dots
2d3c11f Refine exercise motivation copy and crossing trend chart
ea7cd78 Increase trend curve weight and chart label visibility
fbecaf8 Remove visible forecast caption from onboarding trend
e109ef6 Build four-stage circular habit loop with clockwise motion
b9a60b3 Give each habit-loop stage its own canonical icon
```

Use `git log --oneline` and inspect the graph before deciding whether the target needs the complete earlier sequence or already contains some of it.

## Latest implementation contract

`app-next/src/features/rules/RulePreviewLock.tsx` owns the lock-preview size. There is no per-screen compact variant. The root preview footprint is fixed, and its card is scaled consistently within it. `RuleScreen` and `ScheduleScreen` both render this same component.

`app-next/src/features/rules/__tests__/schedule-screen.test.tsx` asserts that the preview root style is identical with and without a schedule. Do not reintroduce a `compact` prop or screen-specific lock geometry.

## Fresh verification

At commit `70fb0d9`, this focused test command passed:

```bash
cd app-next
npm test -- --watch=false \
  src/features/rules/__tests__/schedule-screen.test.tsx \
  src/features/rules/__tests__/rule-preview.test.ts \
  src/features/rules/__tests__/walking.test.tsx \
  src/features/rules/__tests__/activity-branches.test.tsx
```

Result: 4 suites passed, 23 tests passed.

ESLint passed for:

```text
app-next/src/features/rules/RulePreviewLock.tsx
app-next/src/features/rules/ScheduleScreen.tsx
app-next/src/features/rules/__tests__/schedule-screen.test.tsx
```

Fresh simulator inspection used `ExcerLock-Next`, UDID `B68873CD-B6ED-4961-85AF-0C807E657999`, at a 402-point viewport. The W3 branch and S1 schedule previews both occupied approximately x=88–314, confirming identical visible width. The complete schedule screen and Continue button fit without scrolling.

Full-repository typecheck is **not verified green** for this handoff. Earlier runs encountered failures in concurrent work, including `BootScreen.tsx` style typing and gym-picker/native module work. Re-run it after integration and attribute failures from current output rather than treating this focused verification as a full build pass.

## Protected concurrent work

There are many modified and untracked files outside this completed commit series, including active work in home, sessions, unlock, gym picker, runtime, ports, the design system, assets, package files, plans, and specs.

Do not run `git reset --hard`, `git clean`, a blanket stash, or `git add -A`. Do not overwrite or include dirty files in an onboarding merge commit.

In particular, `app-next/app/gym-picker.tsx` is untracked and currently contains a lazy import/Suspense workaround that allowed onboarding to launch despite an `RNMapsAirModule could not be found` startup error. It was deliberately excluded from the onboarding commits because it belongs to concurrent gym-picker work.

Before any integration, capture:

```bash
git status --short
git branch --show-current
git log --oneline --decorate --graph --all -40
```

## Rejected implementations

- Do not restore a separate second page for the changed habit loop.
- Do not place loop stages on white cards or introduce a white background during the transformation.
- Do not delay text replacement until after geometry moves; that caused visible flashing.
- Do not use hand-drawn-looking arrows. Keep the precise circular arc geometry and tangent-aligned arrowheads.
- Do not restore multicolored onboarding choice icons.
- Do not make the live lock full-size on branch screens or use separate lock sizes by screen.
- Do not remove the live lock from schedule editing.

## Tool and repository constraints

- App implementation changes belong in `app-next/`.
- Expo/React Native docs, libraries, builds, and workflows must use the Expo MCP configured for this repository.
- Use TDD for behavior changes.
- Maestro is banned. Use `xcrun simctl` and `idb` for simulator work.
- Keep only one simulator booted during verification.
- Read `TOOLING.md` before using an external service.
- Before creating any visual asset, read and follow `design/STYLE.md` and its manifest rules.

## Primary next safe action

Inspect the branch graph and repository docs to identify the intended merge target. Then independently review the committed onboarding range and merge only those commits into that target. Preserve the dirty worktree and avoid pulling concurrent uncommitted files into the merge.

If the target branch is not unambiguous, stop before mutating git history and report:

1. the candidate target branches;
2. which onboarding commits each already contains;
3. the exact recommended merge or cherry-pick command;
4. why one product decision is still required.

After a safe merge, report the target branch, resulting SHA, conflicts and their resolution, focused test results, full build/typecheck status, and simulator verification status.
