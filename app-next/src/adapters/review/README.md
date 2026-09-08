# review

The App Store rating policy, ported from `app/src/review` and re-based on met days (PRD §8):

1. the fifth met day, once the install is at least three days old;
2. the first 7-day streak;
3. a 30-day streak.

Three prompts or a manual tap on Rate ExcerLock end it. `domain/reviewPrompt` is the pure decision
and the facts it reads (distinct met days, the current streak over scheduled days); `state/reviewStore`
persists the install date, prompt count and manual-rate flag; `reviewPrompts.startReviewPrompts` is the
root binding that re-runs the decision on every rule-day change and claims the prompt before the native
call. `nativeReview` is the only file that imports `expo-store-review`: the automatic path uses the
in-app prompt, the Settings row opens the store's write-review composer, as the guidelines require.
