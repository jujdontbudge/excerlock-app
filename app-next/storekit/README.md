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

After loading the preview environment, **unset `SENTRY_AUTH_TOKEN` and set
`SENTRY_DISABLE_AUTO_UPLOAD=true`** before every local native build. Do not inherit production
upload credentials. On this Apple Silicon host, use the explicitly owned simulator destination with
`ARCHS=arm64 ONLY_ACTIVE_ARCH=YES`; a generic simulator destination can select x86_64 while cached
Expo modules contain only arm64. Preserve the same DerivedData path for incremental builds.

The shared scheme's StoreKit reference must resolve from
`ios/ExcerLock.xcodeproj/xcshareddata/xcschemes/` to the generated catalog. A passing build or an
existing `.storekit` source file alone does not prove the running app uses local StoreKit. An Apple
account sign-in prompt instead of local purchase confirmation is a failed harness acceptance gate,
not permission to enter credentials or count the purchase as passed.

The six products mirror the App Store/Adapty catalog recorded in
`plans/ship/research/infra-audit.md`. Xcode StoreKit testing proves only local catalog, purchase UI,
and client result handling. Its local transactions do not prove App Store sandbox receipts,
Adapty entitlement/profile attribution, webhooks, or production activation.
