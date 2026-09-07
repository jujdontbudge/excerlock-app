# Rule editing

`draft.ts` holds the editable rule, defaults, reducer and validated domain conversion. Draft identity is created once; conversions preserve it. `RuleDraftStore` is the shared editing session for onboarding and Conditions. Persisted onboarding answers restore the session through `OnboardingRuleScreen`.

`WalkingScreen` only receives a draft and dispatches typed actions, so its choices and goal field can be mounted in either flow. Invalid numeric input stays editable and cannot proceed. Screen movement belongs to the parent flow; the hero, choices and helper animate within it.

`ScheduleScreen` and `TimeSheet` share the pure schedule reducer with onboarding and the builder. All-day preserves the selected range. `PlanSummary` displays only validated domain rules; `commitPlan` replaces by stable identity and stores profile answers. `PlanBuild` checks the actual rule facts in sequence and releases every timer on unmount. The review warm-up stores a local rating without a native request.

`RuleScreen` is the reusable branch boundary. Its activity hero stays mounted while questions and forms crossfade; the outer onboarding/builder shell preserves that boundary. `WorkoutModeScreen` and `WorkoutGoalScreen` own mode choices, presets and distance units. `answersDraft` is a pure parser with separate run/bike values; unit changes preserve the number. `goalRange` supplies the field’s range/helper validation, with final rules still checked by domain validation.

Branch setup uses compact controls above a live `RulePreviewLock`. The pure `rulePreviewModel` derives the lock sentence, activity glyph, unit, goal, and progress from `RuleDraft` for every walking, gym, running, and biking path.

Summary edits save a local answer snapshot and restore it on Back. Invalid partial numeric input remains editable and cannot crash the summary when canceled.
