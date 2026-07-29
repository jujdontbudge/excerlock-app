# ExperimentRail

Contract: a typed flag registry plus the sole `ExperimentVariantProvider`. No other file may call
`useFeatureFlag`; control renders immediately and late variants do not replace it.

Fixtures: flag timing and override cases arrive with the provider tests. Test with
`npm run test --workspace app -- experiments`.
