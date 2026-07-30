# E2E scenario runtime

This module is the build-gated composition root for deterministic Maestro
scenarios. It statically bundles the manifests in `e2e/scenarios`, validates
their complete fixture × clock × app-state contract, resolves all five
SignalKit fixtures through `SIGNAL_FIXTURE_CATALOG`, and loads a selected
scenario from `excerlock://e2e/scenario/<name>`.

Only the root layout may read `EXPO_PUBLIC_E2E`. Screens consume their normal
module interfaces and never branch on the flag. The production bundle
guardrail proves this module's canary is absent when that flag is unset.
`app/eas.json` owns the release-style `e2e` simulator profile and sets the
flag to `1`; it deliberately does not enable `developmentClient`.

Test with `npm run test --workspace app -- e2e`.
