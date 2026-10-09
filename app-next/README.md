# ExcerLock app

The shipping iOS app: Expo SDK 57, React Native 0.86 and Expo Router, with Screen Time extensions in `targets/` and native modules in `modules/`.

- Routes live in `app/`, product code in `src/packages/<name>/`. Shape and import rules: `ARCHITECTURE.md`. Screens: `src/packages/ui/UI-STYLE.md`.
- From this folder: `npm run typecheck`, `npm run lint`, `npm start` (Metro on port 8091). From the repo root: `./excer check`.
- Drive and verify the app on the simulator with `./excer` (the `verify-excerlock` skill). Build a new binary only when native code changes.
- Releases: `docs/agents/operations.md`. OTA updates: `docs/ota.md`.
