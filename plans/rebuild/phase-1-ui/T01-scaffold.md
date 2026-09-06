# T01 — Scaffold `app-next/`

Goal: a running Expo SDK 57 dev-client app on the simulator with Expo Router, the test stack, lint/typecheck,
and the repo conventions in place. No product screens yet beyond a boot placeholder.

## Prerequisites

- Expo MCP connected (decision E6). Every `expo`/`eas`/dependency question goes through it.
- Branch `rebuild/phase-1` created from `wip/pre-rebuild-snapshot-2026-09-06` (decisions A5/A6). That branch
  carries the plan, the design overrides and the research assets; `main` does not.

## Steps (TDD where there is behavior)

1. Create `app-next/` with `npx create-expo-app` (blank TypeScript template, SDK 57) **via the Expo MCP
   recipe**, then align `app.json` with `app/app.json`: name `ExcerLock`, slug `excerlock`, scheme
   `excerlock`, bundle id `com.johansardar.excerlock`, EAS project id and updates URL, `ios.deploymentTarget`
   17.4 via `expo-build-properties`, `userInterfaceStyle: "light"`, `supportsTablet: false`, portrait,
   experiments `typedRoutes` and `reactCompiler`, splash white with the running-lock logo (copy the approved
   logo from `design/logo-concepts/2026-09-05/` per its FOUNDRY manifest; do not generate a new one).
   **No** Screen Time, HealthKit, location, motion, camera or Adapty plugins in Phase 1.
2. Add `app-next` to root `package.json` workspaces; `npm install` from root.
3. Dependencies (exact versions via Expo MCP `expo install`): expo-router, react-native-reanimated (4.x),
   react-native-worklets, react-native-gesture-handler, react-native-svg, expo-haptics, expo-splash-screen,
   expo-font, expo-linear-gradient, @react-native-async-storage/async-storage, zustand,
   @react-native-community/datetimepicker, react-native-safe-area-context, react-native-screens.
   Dev: jest-expo, @testing-library/react-native, typescript, eslint (expo config).
4. `jest.config.js` (jest-expo preset, `src/**` coverage, ignore `evidence/`), `jest.setup.ts` (gesture-handler
   jestSetup, Reanimated mock with `useReducedMotion: () => true`, expo-haptics mock), `npm test`,
   `npm run typecheck`, `npm run lint`, `npm run ios`, `npm start`.
5. Directory skeleton from `04-architecture.md` §2 with a README in every folder stating ownership.
6. `app/_layout.tsx`: `GestureHandlerRootView` + `SafeAreaProvider` + `AppRuntimeProvider` (from `src/runtime`,
   which for now provides a stub runtime) + Stack. `app/index.tsx`: boot gate placeholder that renders the
   splash color and a `testID="boot"`.
7. First test: rendered-router test that `/` mounts and shows `boot`. Second test: `src/runtime` chooses
   `FakeRuntime` when `EXPO_PUBLIC_RUNTIME !== 'real'`.
8. Simulator: create `ExcerLock-Next` (iPhone 17 Pro, latest iOS) with `xcrun simctl create`, boot headless,
   `npx expo run:ios --device <udid>`; confirm launch; screenshot to `evidence/T01/launch.png`;
   `xcrun simctl shutdown all`.
9. `app-next/README.md`: how to run, test, where things live, the evidence convention.
10. `.gitignore`: `evidence/**` except `evidence/README.md`, `ios/`, `.expo/`.

## Acceptance

- [ ] `npm run typecheck`, `npm test`, `npm run lint`, `npx expo-doctor`, `npx expo install --check`,
      `npx expo export --platform ios` all green from `app-next/`.
- [ ] App builds and launches as a dev client on the headless simulator; screenshot in evidence.
- [ ] Root workspace still installs cleanly; `app/` untouched (`git status` shows only `app-next/`, root
      `package.json`/lockfile).
