# Expo MCP guidance for `excer-ui-mock`

Queried through the freshly authorized `expo` MCP server on 2026-08-07. This file contains an implementation-ready summary followed by verbatim, question-relevant MCP response excerpts. No application files were created or changed while gathering this guidance.

## Current prototype decision

The guidance below is the consulted platform baseline, not a claim that every
optional recommendation was adopted. This completed looks-only prototype keeps
its 31-route Router structure and Jest/Router Testing Library seams, but uses
local `SheetFrame` / `AccessibleModal` surfaces instead of Router native form
sheets. Precision inputs use transactional choice lists or steppers instead of
inertial wheels. Those deliberate substitutions keep state deterministic and
avoid presenting local fixtures as real system UI; they are recorded in
`DESIGN.md` section 18 and `docs/ARCHITECTURE.md`.

The only real physical-feedback API retained is `expo-haptics`, used once for
the Home closed-to-open earn transition when the Haptics setting is enabled.
All permission, notification, purchase, account, share, map, health, and app-
locking surfaces remain local simulations.

## Actionable summary

### 1. Scaffold the standalone app on SDK 57

From `/Users/johansardar/ExcerLock`, use Expo's currently documented command:

```sh
npx create-expo-app@latest --template default@sdk-57
```

When prompted for the app name, enter `excer-ui-mock`.

Why this exact choice:

- Expo currently documents SDK 57 explicitly because, during the transition period, omitting `--template default@sdk-57` still creates SDK 54.
- The `default` SDK 57 template is the recommended multi-screen template and already includes Expo Router plus TypeScript configuration.
- The default SDK 57 template uses `src/app` for route files. Keep non-route code outside it, for example under `src/design-system`, `src/features`, `src/presentation`, and `src/content`.

Do not replace the template with `blank-typescript`; doing so would require manually installing and configuring Router and its peer dependencies.

### 2. Install SDK-compatible runtime libraries

Run from the new project's root. Expo MCP returned `npx expo install` for each package, which resolves versions compatible with the project's SDK:

```sh
npx expo install expo-linear-gradient expo-image expo-haptics react-native-gesture-handler react-native-reanimated react-native-worklets react-native-safe-area-context
```

The default template already contains `expo-router`. If Router or its support packages are ever absent, Expo's manual installation command is:

```sh
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

Important Reanimated 4 detail: install both `react-native-reanimated` and `react-native-worklets`. In an Expo project using `babel-preset-expo`, do **not** manually add `react-native-worklets/plugin` or a Reanimated plugin; Expo says the plugin is configured automatically.

### 3. Install the supported test stack

Use Expo's documented dev-dependency commands:

```sh
npx expo install jest-expo jest @types/jest --dev
npx expo install @testing-library/react-native --dev
```

Do **not** install `react-test-renderer`. Expo's current testing guide marks it deprecated because it does not support React 19 and says React Native Testing Library replaces it.

Recommended configuration:

```json
{
  "scripts": {
    "test": "jest --watchAll",
    "test:ci": "jest --runInBand"
  },
  "jest": {
    "preset": "jest-expo"
  }
}
```

Add Jest types to `tsconfig.json` as documented:

```json
{
  "compilerOptions": {
    "types": ["jest"]
  }
}
```

Place tests outside `src/app`; Expo Router treats every file inside the route directory as navigation input. Use `__tests__` or co-located `__tests__` folders under non-route modules.

For the approved navigation seam, use:

```ts
import { renderRouter, screen } from 'expo-router/testing-library';
```

`renderRouter` can build an in-memory route filesystem and exposes path matchers such as `toHavePathname()`. Keep reducer/state-transition tests as ordinary Jest tests and UI behavior tests in React Native Testing Library.

### 4. Required root and Router setup

The SDK 57 default template should provide most Router configuration. Verify rather than re-create it:

- `package.json` has `"main": "expo-router/entry"`.
- `app.json` / app config has the `expo-router` config plugin (the default template configures it).
- Route files live in `src/app`, with `src/app/_layout.tsx` as the root layout.
- Add a deep-link scheme and enable typed routes if the generated config does not already do so:

```json
{
  "expo": {
    "scheme": "excerlock",
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- If `babel.config.js` exists, its preset must be `babel-preset-expo`. If no custom Babel settings are needed, Expo says the file can be deleted.
- Wrap the root navigator as close to the real root as possible with `GestureHandlerRootView`; include `flex: 1` when supplying a custom style. The safe-area provider belongs at the root as well.

```tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

If a React Native `Modal` is used on Android, wrap that modal's content in another `GestureHandlerRootView`. For navigable multi-step sheets, prefer an Expo Router route with `presentation: 'formSheet'`.

The condition-builder sheet can use SDK 57's native Router sheet configuration:

```tsx
<Stack.Screen
  name="condition-builder"
  options={{
    presentation: 'formSheet',
    sheetAllowedDetents: [0.7, 1],
    sheetInitialDetentIndex: 0,
    sheetGrabberVisible: true,
    sheetCornerRadius: 28,
  }}
/>
```

Numeric detents are required if the sheet content uses `flex: 1`; `fitToContents` needs explicit content sizing. Android permits at most three detents. Render title/actions as sheet content because Android does not support native stack headers inside form sheets.

After changing Router/Babel setup, clear Metro's cache:

```sh
npx expo start --clear
```

### 5. Run, verify, and visually test

The generic Expo MCP excerpts below describe Expo Go as one available loop.
Native acceptance for this repository instead uses the app-specific development
binary so the Xcode build, bundle identifier, and native module linkage are
actually exercised.

Initial or native-dependency-changed run:

```sh
npm run ios -- --device "ExcerLock-Demo"
```

That command runs `expo run:ios`, builds/installs **ExcerLock UI Mock**, and
starts Metro. If the native binary is already installed and only JavaScript has
changed, start Metro in development-build mode and open that installed app:

```sh
npx expo start --dev-client
```

Do not start a second Metro while `npm run ios` is already serving. Plain
`npm start` plus `i` may select Expo Go and therefore is not the app-specific
native acceptance path. For a deliberately split workflow, build with
`npx expo run:ios --device <UDID> --no-bundler`, then run
`npx expo start --dev-client` on a free port.

Repository verification gates:

```sh
npm run typecheck
npm test -- --runInBand
npx expo-doctor
npx expo install --check
```

The latest verified acceptance run passed 33 Jest suites / 267 tests,
TypeScript, Expo Doctor 20/20, and the dependency check. The final
`expo export --platform ios` produced one 4.3 MB Hermes bundle from 1,759
modules and 102 assets (104 files / 71 MB total).

The final native command was
`npx expo run:ios --device A5ACC85F-6CB2-45BF-BA66-FD6F36E69801 --no-bundler`.
It built, installed, and launched bundle
`com.johansardar.excerlock.uimock` on the `ExcerLock-Demo` iOS 26.4 Simulator
with zero errors and two warnings. Because port 8081 was occupied, the app was
then pointed explicitly at the development Metro bundle on `127.0.0.1:8090`.
Launch OCR found expected app copy and no red-box signature.

Representative native captures—not a per-ID golden suite—are retained under
`/Users/johansardar/ExcerLock/work/runtime-qa` for onboarding, annual paywall,
populated Home, builder catalog, empty Analysis, and the grouped Debug
controller. Continue to use the same simulator and appearance for any future
fidelity captures, and compare stable routes/states with their `DESIGN.md`
Pillow references.

## Verbatim Expo MCP results and relevant excerpts

The blocks below preserve the text returned by the Expo MCP tools for the questions in scope. Long API references unrelated to installation/configuration were not duplicated; the installation/configuration passages are verbatim.

### `read_documentation`: create-expo-app

URL: `https://docs.expo.dev/more/create-expo/`

~~~~text
# create-expo-app

A command-line tool to create a new Expo and React Native project.

`create-expo-app` is a command-line tool to create and set up a new Expo and React Native project. This tool simplifies the initialization process by providing various templates to get started quickly without the need for manual configuration.

## Create a new project

To create a new project, run the following command:

```sh
# npm
npx create-expo-app@latest --template default@sdk-57

# yarn
yarn create expo-app --template default@sdk-57

# pnpm
pnpm create expo-app --template default@sdk-57

# bun
bun create expo --template default@sdk-57
```

> **Note:** During the SDK 57 transition period, `create-expo-app@latest` without the `--template` flag creates an SDK 54 project. If you plan to use Expo Go on a physical device, use an SDK 54 project. Otherwise, use `--template default@sdk-57` to create an SDK 57 project.
~~~~

The same MCP response's template table described `default` verbatim as:

```text
Default template. Designed to build multi-screen apps. Includes recommended tools such as Expo CLI, Expo Router library and TypeScript configuration enabled. Suitable for most apps.
```

### `learn`: Expo Router quick onboarding

```text
### File Structure Rules
- All routes live in `app/` directory
- Each file = a screen/page with automatic URL
- `app/index.tsx` = initial route (`/`)
- `app/_layout.tsx` = root layout (replaces App.tsx)
- Non-navigation code goes outside `app/`
```

The SDK 57 default-template documentation uses `src/app`; Router supports either `src/app` or top-level `app`, and the scaffolded structure should remain authoritative for this project.

### `add_library`: exact returned commands

```text
===== expo-router =====
Suggested command for this project:
Working directory: The project root
Command: npx expo install expo-router

===== expo-linear-gradient =====
Suggested command for this project:
Working directory: The project root
Command: npx expo install expo-linear-gradient

===== expo-image =====
Suggested command for this project:
Working directory: The project root
Command: npx expo install expo-image

===== expo-haptics =====
Suggested command for this project:
Working directory: The project root
Command: npx expo install expo-haptics

===== react-native-gesture-handler =====
Suggested command for this project:
Working directory: The project root
Command: npx expo install react-native-gesture-handler

===== react-native-reanimated =====
Suggested command for this project:
Working directory: The project root
Command: npx expo install react-native-reanimated

===== react-native-worklets =====
Suggested command for this project:
Working directory: The project root
Command: npx expo install react-native-worklets

===== react-native-safe-area-context =====
Suggested command for this project:
Working directory: The project root
Command: npx expo install react-native-safe-area-context

===== jest-expo =====
Suggested command for this project:
Working directory: The project root
Command: npx expo install jest-expo

===== @testing-library/react-native =====
Suggested command for this project:
Working directory: The project root
Command: npx expo install @testing-library/react-native

===== react-test-renderer =====
Suggested command for this project:
Working directory: The project root
Command: npx expo install react-test-renderer
```

The generic `add_library` result for `react-test-renderer` is superseded by Expo's current React 19 testing guide quoted below, which explicitly says to remove it.

### `read_documentation`: Router manual installation and Babel

URL: `https://docs.expo.dev/router/installation/`

~~~~text
### Install dependencies

You'll need to install the following dependencies:

```sh
# npm
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

The above command will install versions of these libraries that are compatible with the Expo SDK version your project is using.

### Setup entry point

For the property `main`, use the `expo-router/entry` as its value in the **package.json**. The initial client file is [**src/app/_layout.tsx**](/router/reference/src-directory.md) (or [**app/_layout.tsx**](/router/basics/navigation-layouts.md) if not using the **src** directory).

```json
{
  "main": "expo-router/entry"
}
```
~~~~

~~~~text
### Modify babel.config.js

If your project has a **babel.config.js** file, ensure you use `babel-preset-expo` as the `preset`. If you don't need any custom Babel configuration, you can delete the file entirely:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```
~~~~

### `read_documentation`: Reanimated 4 under Expo

URL: `https://docs.expo.dev/versions/latest/sdk/reanimated/`

~~~~text
## Installation

```sh
npx expo install react-native-reanimated react-native-worklets
```

No additional configuration is required. [Reanimated Babel plugin](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#reanimated-babel-plugin) is automatically configured in [`babel-preset-expo`](https://www.npmjs.com/package/babel-preset-expo) when you install the library.
~~~~

### `read_documentation`: Gesture Handler root setup

The Expo SDK Gesture Handler page returned the compatible install command and linked the upstream installation instructions. Fetching that linked page through Expo MCP returned:

~~~~text
### 2. Wrap your app with `GestureHandlerRootView` component

```
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView>
      <ActualApp />
    </GestureHandlerRootView>
  );
}
```

If you don't provide anything to the `styles` prop, it will default to `flex: 1`. If you want to customize the styling of the root view, don't forget to also include `flex: 1` in the custom style, otherwise your app won't render anything. Keep `GestureHandlerRootView` as close to the actual root of the app as possible.
~~~~

### `read_documentation`: Jest and React Native Testing Library

URL: `https://docs.expo.dev/develop/unit-testing/`

~~~~text
Install `jest-expo` and other required dev dependencies in your project. Run the following command from your project's root directory:

#### macOS/Linux

```sh
# npm
npx expo install jest-expo jest @types/jest --dev
```
~~~~

~~~~text
## Install React Native Testing Library

The [React Native Testing Library (`@testing-library/react-native`)](https://callstack.github.io/react-native-testing-library/) is a lightweight solution for testing React Native components. It provides utility functions and works with Jest.

To install it, run the following command:

#### macOS/Linux

```sh
# npm
npx expo install @testing-library/react-native --dev
```

> **[Deprecated](/more/release-statuses.md#deprecated):** `@testing-library/react-native` replaces the deprecated `react-test-renderer` because `react-test-renderer` does not support React 19 and above. Remove the deprecated library from your project if you are currently using it.
~~~~

The same MCP page also returned:

```text
> **Note:** For UI testing, we recommend end-to-end tests instead of snapshot unit tests. See the [E2E tests with Maestro](/eas/workflows/examples/e2e-tests.md) guide.
```

### `read_documentation`: Expo Router integration testing

URL: `https://docs.expo.dev/router/reference/testing/`

```text
Expo Router relies on your file system, which can present challenges when setting up mocks for integration tests. Expo Router's submodule, `expo-router/testing-library`, is a set of testing utilities built on top of the popular [`@testing-library/react-native`](https://callstack.github.io/react-native-testing-library/) and allows you to quickly create in-memory Expo Router apps that are pre-configured for testing.
```

```text
> **Note**: When using Expo Router, do not put your test files inside the **app** directory. All files inside your **app** directory must be either routes or layout files. Instead, use the **__tests__** directory or a separate directory.
```

### `read_documentation`: Router form sheets

URL: `https://docs.expo.dev/router/advanced/modals/`

~~~~text
## Form sheet presentation

Form sheet presents a modal as a bottom sheet that app users can drag between different heights (called detents). This is useful for content that needs partial screen coverage with interactive sizing.

### Basic usage

To use form sheet, set the `presentation` option to `formSheet` on your modal screen:

```tsx
<Stack.Screen
  name="modal"
  options={{
    presentation: 'formSheet',
  }}
/>
```
~~~~

```text
> Android supports a maximum of 3 detents. iOS accepts any number of detents.
```

```text
> In SDK 55 and later, `flex: 1` works correctly on iOS when using custom numeric detents. This does not work with `fitToContents` where you must provide explicit content sizing.
```

### `read_documentation`: run and compile workflow

URLs: `https://docs.expo.dev/get-started/start-developing/`, `https://docs.expo.dev/workflow/ios-simulator/`, and `https://docs.expo.dev/more/expo-cli/`

~~~~text
## Start a development server

To start the development server, run the following command:

```sh
# npm
npx expo start
```
~~~~

```text
Run your app with `npx expo start` and press I from the command line.

You can also press Shift + I in the Expo CLI to interactively select a simulator to open.
```

~~~~text
### Compiling

You can compile your app locally with the `run` commands:

```sh
npx expo run:ios
npx expo run:android
```

If your project does not have the corresponding native directories, the `npx expo prebuild` command will run once to generate the respective directory before building.
~~~~

### `read_documentation`: Maestro E2E workflow

URL: `https://docs.expo.dev/eas/workflows/examples/e2e-tests/`

~~~~text
## Run Maestro tests locally (optional)

To run Maestro tests locally, install the Maestro CLI by following the instructions in [Installing Maestro](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli).

[Install your app on a local Android Emulator or iOS Simulator](/more/expo-cli.md#compiling). Open a terminal, navigate to the Maestro directory, and run the following commands to start the tests with the Maestro CLI:

```sh
maestro test .maestro/expand_test.yml
maestro test .maestro/home.yml
```
~~~~

## Authoritative URLs returned/read through Expo MCP

- https://docs.expo.dev/more/create-expo/
- https://docs.expo.dev/router/introduction/
- https://docs.expo.dev/router/installation/
- https://docs.expo.dev/router/advanced/modals/
- https://docs.expo.dev/versions/latest/sdk/router/
- https://docs.expo.dev/versions/latest/sdk/reanimated/
- https://docs.expo.dev/versions/latest/sdk/gesture-handler/
- https://docs.expo.dev/versions/latest/sdk/safe-area-context/
- https://docs.expo.dev/develop/unit-testing/
- https://docs.expo.dev/router/reference/testing/
- https://docs.expo.dev/get-started/start-developing/
- https://docs.expo.dev/workflow/ios-simulator/
- https://docs.expo.dev/more/expo-cli/
- https://docs.expo.dev/eas/workflows/examples/e2e-tests/
