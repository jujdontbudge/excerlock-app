# Local StoreKit harness

## Simulator purchase through Xcode (works)

`scripts/storekit-sim.sh` attaches `ExcerLock.storekit` to the shared scheme's Run action and launches the
app from Xcode on `ExcerLock-Next` (or `EXCER_SIM`). The StoreKit store applies only when Xcode
launches the app, not `simctl` or `xcodebuild test`. Prebuild first with `EXCERLOCK_ENV=preview`,
`EXPO_PUBLIC_API_URL=https://api.excerlock.com/testflight` and `LANG=en_US.UTF-8` for `pod install`,
then build once with `xcodebuild` into the default DerivedData. Then run the script. The app connects to
Metro by itself; don't reload it with a dev-client URL, because Expo then crashes with "The app context
has been lost". Plans read "Premium A …" when the local store is active. `excerlock://sample-paywall`
then Start for free opens Apple's "[Environment: Xcode]" sheet; Subscribe, then OK, lands on sign-in.
Apple sandbox accounts can't buy on the simulator ("Password reuse not available for account").


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

The shared scheme's StoreKit reference must be bound by Xcode to the generated catalog; do not
assume its identifier uses ordinary filesystem-relative scheme-directory semantics. A passing build or an
existing `.storekit` source file alone does not prove the running app uses local StoreKit. An Apple
account sign-in prompt instead of local purchase confirmation is a failed harness acceptance gate,
not permission to enter credentials or count the purchase as passed.

The 51 products (the six A/B contracts plus the 45-SKU price/trial grid) mirror the App
Store/Adapty catalog recorded in
`plans/ship/research/infra-audit.md`. Xcode StoreKit testing proves only local catalog, purchase UI,
and client result handling. Its local transactions do not prove App Store sandbox receipts,
Adapty entitlement/profile attribution, webhooks, or production activation.
