# T04 — Onboarding flow machine, shell, and pre-branch screens O01–O20

Goal: L0/L1 boot gate, the onboarding flow machine, the shared onboarding shell, and the twenty pre-branch
screens, animated per `design/motion/10-onboarding.md`.

## Inputs

- `02-screen-inventory.md` §1–§2. Mockups: `002-block-apps-preview.png`, `step-4…16-*.png`, `loop-trend.png`,
  `loop-loop.png`, `loop-break.png`, `loop-reward-v3.png`, `final-principles-v3.png`, `loop-picker-v3.png`.
  Reference screenshots for structure: DAWG 017 (O09), Unrot 023–027 (O10–O14), AppBlock 004/005/008,
  Opal 003/004.
- Reference study: `design/motion/reference/` (OtterLife first).

## Steps

1. `src/onboarding/flow.ts` — the step graph as data: ordered pre-branch ids, branch subgraphs (defined here
   but only walking's screens are built in this task; the machine must already route all four), tail ids.
   `nextStep(state)`, `prevStep(state)`, `progressFraction(state)` (branch-aware, counts the user's actual path),
   `skipRules` (W2 while-walking → S1; G1 arrival → S1; R1/B1 distance → D), `resumeStep(persisted)`.
   Tests first: every path from O01 to P enumerated; Back retraces exactly; progress is monotonic and reaches
   1.0 at P; resume lands on the persisted step.
2. `src/features/onboarding/OnboardingShell.tsx` — `ScreenShell` + `OnboardingHeader` + pinned footer CTA;
   answers write to `onboardingStore` on Continue; keyboard handling for O04.
3. Boot gate (`app/index.tsx` + `src/features/launch/BootGate.tsx`): hydration → route per L1 rules.
   Test: fresh scenario → `onboarding/O01`; `trial-active` + complete → tabs; `trial-expired` → paywall.
4. Screens O01–O20, one file each in `src/features/onboarding/screens/`, copy in `src/content/onboarding.ts`.
   - O01–O03: hero components (`ScheduleWidget`, trend `LineChart`, lock+tiles) with entrances modeled on OtterLife's intro cards.
   - O04 name; O05–O09 choice lists; O10 slider with live number and haptic ticks.
   - O11 quick math with sequential number ticks (`useTickingNumber` in `src/motion/`).
   - O12–O14 one `DotGridReveal` screen with three states, dots fill with timing modeled on Unrot/OtterLife reveals.
   - O15 trend chart draws in.
   - O16–O18 one `LoopStory` screen with three states, heading crossfade, diagram morph.
   - O19 principles rows staggered in.
   - O20 `ChoiceGrid`; selecting lifts the card; Continue routes into the branch.
   Each screen: rendered-router test (renders heading, CTA disabled until valid, Continue advances, Back
   returns), plus a state test for multi-state screens.
5. Progress persists per step; killing and relaunching the app resumes (test via store reset + re-mount).
6. Evidence: screenshots of every screen and state; one recording of O01→O20 in `evidence/T04/`.

## Acceptance

- [ ] All 20 screens reachable in order with Back working; `onboarding-walking-resume` scenario resumes at W3
      (W3 itself arrives in T05; until then assert the step id).
- [ ] Flow-machine tests enumerate all four branch paths even though only walking's screens exist yet.
- [ ] Motion notes for O01–O20 (what was matched from OtterLife, timings used) in `evidence/T04/motion-notes.md`.
- [ ] No inline copy; no literals; XL Dynamic Type screenshot for O04, O10, O20.
