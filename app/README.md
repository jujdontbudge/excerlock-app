# ExcerLock app

Expo SDK 57 application workspace. It uses Expo Router with thin files in `app/`; application modules,
screens, stores, providers, and tests live in `src/`. Native projects are generated with Expo Continuous
Native Generation and are never edited as source.

This app runs through `expo-dev-client`, not Expo Go. From the repository root:

- `npm start --workspace app` starts Metro for the development client.
- `npm run ios --workspace app` compiles the iOS development build.
- `npm run prebuild:ios --workspace app` regenerates the iOS project without installing Pods.
- `npm run test:app` runs the `jest-expo` suite.

Read a module's `README.md` before changing code inside it. Expo API, package, build, and workflow work
must use the configured Expo MCP server as required by the repository `AGENTS.md`.
