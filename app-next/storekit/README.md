# Local StoreKit harness

This directory is source for an explicitly generated Debug-only Xcode UI-test harness. Run
`npm run ios:storekit-harness` only after iOS prebuild. Normal prebuild, preview, Release, archive,
and EAS builds do not run the generator or include this configuration.

The Debug app must contain an embedded JS bundle; a plain Expo Debug build expects Metro and is not
a headless launch proof. Follow Expo's installed-SDK procedure: export the full preview environment
plus `EX_UPDATES_NATIVE_DEBUG=1`, run clean iOS prebuild and `npx pod-install`, then run the generator.
The generator applies Expo's documented `SKIP_BUNDLING` → `FORCE_BUNDLING` project change only to
that generated opt-in project. Run the test with the same preview environment. The test process and
app are owned by `xcodebuild test`; callers must use a bounded timeout and clean up their simulator.

The six products mirror the App Store/Adapty catalog recorded in
`plans/ship/research/infra-audit.md`. Xcode StoreKit testing proves only local catalog, purchase UI,
and client result handling. Its local transactions do not prove App Store sandbox receipts,
Adapty entitlement/profile attribution, webhooks, or production activation.
