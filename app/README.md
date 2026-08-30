# ExcerLock app

Expo SDK 57 application workspace. It uses Expo Router with thin files in `app/`; application modules,
screens, stores, providers, and tests live in `src/`. Native projects are generated with Expo Continuous
Native Generation and are never edited as source.

This app runs through `expo-dev-client`, not Expo Go. From the repository root:

- `npm start --workspace app` starts Metro for the development client.
- `npm run ios --workspace app` synchronizes Pods, then compiles the iOS development build.
- `npm run prebuild:ios --workspace app` regenerates the iOS project without installing Pods.
- `npm run test:app` runs the `jest-expo` suite.

## Dev-client build on a simulator (verified 2026-08-04, #97)

The full dev-client build-and-install path, exactly as last verified against the
pinned e2e simulator (`ExcerLock-E2E`, iPhone 17 Pro, iOS 26.4):

```sh
cd app
npx expo run:ios --device <simulator-udid>     # add --no-bundler to skip Metro
```

The npm `preios` lifecycle runs the pinned `pod-install` tool before Expo,
then Expo compiles the `ExcerLock` scheme (Debug), installs, and launches. The
Pod sync is not optional: an existing generated `ios/` directory can otherwise
omit a newly added local Expo module while still producing a successful build;
the app then crashes when JavaScript calls `requireNativeModule`. If invoking
`npx expo run:ios` directly for a special build, run `npx pod-install ios` first. The built product carries all three Screen Time
extension targets (`DeviceActivityMonitorExtension.appex`, `ShieldAction.appex`,
`ShieldConfiguration.appex`) and the `ExcerLock.entitlements` with
`com.apple.developer.family-controls` — this is the same build path #84 needs
for a physical phone (`--device` with a connected device instead of a UDID).

On a fresh iOS 26.4.1 simulator the real FamilyControls authorization
**completes silently** — no sheet, instant approval, remembered across
uninstall (measured 2026-08-04; the earlier cannot-complete finding did not
reproduce — `docs/research/familycontrols-on-simulator.md`). The deny path and
real shield enforcement still need hardware. The release-style e2e build and
Maestro suite are a separate recipe — see `e2e/README.md`.

Read a module's `README.md` before changing code inside it. Expo API, package, build, and workflow work
must use the configured Expo MCP server as required by the repository `AGENTS.md`.
