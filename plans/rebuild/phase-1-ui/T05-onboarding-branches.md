# T05 — Onboarding branches (T05: walking only · T05b: gym, running, biking)

Goal: the branch screens from `02-screen-inventory.md` §3 as reusable "rule screens" that the Conditions
builder (T10) mounts again. T05 builds walking (W1–W3) before Home so M1 proves one path end to end; T05b,
after T09, adds G1–G2, R1–R2, B1–B2 and the shared distance screen D.

## Inputs

Mockups `final-walk-place-v3.png`, `final-walk-rule-v3.png`, `final-walk-target-v3.png`, `final-gym-rule.png`,
`final-gym-target.png`, `final-run-rule.png`, `final-run-target.png`, `final-bike-rule.png`,
`final-bike-target.png`, `final-distance.png`. Reference study (`design/motion/reference/`).
`01-product-model.md` §2 for defaults and ranges.

## Steps (T05)

1. `src/features/rules/` — screens are parameterized by a `RuleDraft` (a partial `Rule` being edited) and a
   `RuleDraftStore` shared by onboarding and the builder. Reducer + tests: `setPlace`, `setWalkingMode`,
   `setStepGoal`, `setGymMode`, `setGymMinutes`, `setRunMode`, `setMinutes`, `setDistance`, `toRule(draft,
   schedule)`, `fromRule(rule)`. Validation via `domain/validateRule`.
2. W1 place (three `ChoiceRow`s, recommended badge on Outside). W2 mode: "Reach a step goal" (Recommended,
   support: "Unlocks your apps for the rest of the day") and "Unlock while walking" (support: "Apps open while
   you walk, close when you stop"). W3 `NumberField` steps with ±500 steppers and the "about N minutes" helper
   (`steps / 100` minutes, rounded to 5).
3. Skip rule: W2 while-walking → S1 (machine already knows; assert in the rendered test).
4. Evidence and motion notes for W1–W3.

## Steps (T05b)

5. G1 (time at gym / arrive; support line "You'll pick your gym after setup"), G2 minutes with presets.
6. R1, R2; B1, B2; D shared distance screen with unit dropdown (default from `settingsStore.units`, which
   defaults from the device locale: `mi` for US, else `km`). Distance state is the **alternative** to the
   minutes screen, never a second question (handoff).
7. Tests: every branch path produces a valid `Rule` via `toRule`; presets set the field; unit switch converts
   nothing (it changes the unit, not the number) and shows the range for that unit.
8. Evidence for all screens; recordings of each full branch.

## Acceptance

- [ ] T05: fresh install → walking → W3 → S1 works; `toRule` yields a walking target rule.
- [ ] T05b: all four branches produce valid rules; skip rules verified in rendered tests; D reused by both
      running and biking with per-activity defaults.
- [ ] Motion notes written; XL Dynamic Type screenshot for W3 and D.
