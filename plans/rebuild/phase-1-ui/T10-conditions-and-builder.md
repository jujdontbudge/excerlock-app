# T10 — Conditions tab and the condition builder

## Inputs

`02-screen-inventory.md` §6 (Conditions), mockup `main-conditions-v3.png`, AppBlock replays 50/72 (rule
list, rule editor) as functional references, reference study (`design/motion/reference/`). Requires T05b (all branch screens).

## Steps

1. `ConditionsScreen`: locked-apps section (count + Edit → SH-apps), `RuleCard` list from `rulesStore`
   (icon, `ruleName`, `scheduleLabel`, enabled switch → `enabled` toggle with haptic, chevron → edit), swipe-
   to-delete (Gesture Handler swipeable row, confirm sheet SH-delete), "Add condition" CTA, `EmptyState`.
   Order: Codex's OtterLife mapping from the reference study; default newest first.
   Tests: toggle updates `resolveLock` (pause hides the rule from Home), delete removes, empty state when none.
2. `ConditionBuilder` (`app/builder.tsx`, modal): a second instance of the flow machine scoped to
   `builder`: O20 (activity) → branch screens (from T05/T05b, mounted with `RuleDraftStore` in builder mode)
   → S1 (schedule) → `BuilderSummary` (S3 layout with Save). Header shows Cancel (confirm if dirty) and no
   progress bar (follow OtterLife if the reference study shows otherwise). Edit mode: `fromRule(rule)` seeds the draft and opens at the
   summary with Edit links. Save writes create/update to `rulesStore`.
   Tests: create each activity end to end; edit changes only the edited field; cancel-dirty confirms; a new
   rule immediately affects `resolveLock` (multi-rule scenario).
3. Overlap is allowed (decision B5): no conflict validation; only `validateRule`.
4. Evidence: list states, swipe, builder create + edit recordings.

## Acceptance

- [ ] `multi-rule-overlap` scenario lists three rules, toggling any one changes Home's status as `resolveLock`
      dictates (rendered integration test across tabs).
- [ ] Builder produces valid rules for all four activities and both gym modes; edit round-trips.
- [ ] Motion notes for Conditions written; XL Dynamic Type screenshot of the list.
