---
status: accepted
date: 2026-10-06
---

# 0066: Onboarding can stage several Conditions

## Decision

Projected results (S3) has an "Add another Condition" button under the projected stats. It opens the Condition builder in a staging mode: the same exercise, goal and schedule screens, with a close button that returns to Projected results. Staging mode skips the gym-location step and the review step, and it saves nothing. A finished Condition returns straight to Projected results as another card, which the person can remove. The projected stats cover every activity in the plan.

Added Conditions are kept in the onboarding store (`extraRules`) next to the answers, so they survive a relaunch. Import checks that Screen Time can hold every staged schedule, and the plan commit after admission saves all of them with the first Condition. The Condition demo and trial preview still show only the first Condition.

## Context

The owner asked for people to be able to set up more than one Condition before the paywall, for example walking on weekdays and the gym at weekends (2026-10-06). Onboarding previously built exactly one Condition from its flat answers and committed it after admission.

Alternatives considered:
- **Repeating the onboarding branch screens.** These read and write the flat answers that describe the first Condition, so a second pass would overwrite it.
- **Opening the regular builder.** It saves immediately, needs admission and permissions, and asks for the gym location before the paywall.

## Consequences

- People can leave onboarding with several Conditions; setup after the paywall already derives its permission and gym steps from every Condition.
- Gym Conditions added in onboarding get their gym location in setup, like the first Condition.
- A staged Condition that would exceed Screen Time's schedule capacity is refused with the existing schedule-limit notice.

## References

- `app-next/src/packages/onboarding/lib/plan.ts` (`stageExtraRule`, `removeExtraRule`, `commitStagedPlan`), `onboarding/onboardingStore.ts`, `onboarding/PlanSummary.tsx`, `editor/lib/useBuilder.ts`, `editor/lib/builderFlow.ts`.
- `.agents/skills/verify-excerlock/references/features/onboarding.md` (`add-another-condition`, `add-condition-close`).
