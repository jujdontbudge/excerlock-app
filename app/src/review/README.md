# Review prompts

This module owns the complete PRD §8 rating policy. Callers report product
moments; they do not decide whether a prompt is allowed.

- `policy.ts` is the pure three-stage decision: fifth unlock after install day
  three, first 7-day streak, then 30-day streak. It also enforces the 30-minute
  post-shield cooldown and permanent stop conditions.
- `reviewStore.ts` persists install age, unlock count, prompt count, the last
  effective-shield activation, and the manual-Rate stop flag.
- `ReviewCoordinator.ts` serializes those decisions with the native boundary.
- `nativeReview.ts` is the only code that imports `expo-store-review`. Automatic
  product moments use the native in-app prompt; the manual Settings row opens
  the configured store URL with the write-review query instead, as the Expo and
  store guidelines require.

The release app config must contain the App Store/Play Store URL before store
submission. Until the store listing supplies that URL, the manual method safely
returns `false`; it never substitutes a button-triggered in-app prompt.
