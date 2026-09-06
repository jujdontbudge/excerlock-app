# Rule editing

`draft.ts` holds the editable rule, defaults, reducer and validated domain conversion. Draft identity is created once; conversions preserve it. `RuleDraftStore` is the shared editing session for onboarding and Conditions. Persisted onboarding answers restore the session through `OnboardingRuleScreen`.

`WalkingScreen` only receives a draft and dispatches typed actions, so its choices and goal field can be mounted in either flow. Invalid numeric input stays editable and cannot proceed. Screen movement belongs to the parent flow; the hero, choices and helper animate within it.
