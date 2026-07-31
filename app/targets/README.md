# Native Apple targets

These directories are source inputs for `react-native-device-activity`'s shipped
`@kingstinct/expo-apple-targets` config plugin. Expo prebuild links them into the
generated Xcode project; nothing under `app/ios` is hand-maintained.

The Screen Time targets all keep the canonical app group, Family Controls
entitlement, team `AX3C2B78YD`, and iOS 17.4 deployment target in their
`expo-target.config.js` files. `Shared.swift` is vendored byte-for-byte from
`react-native-device-activity@0.6.1` so the monitor can execute the action
records configured by the existing native adapter.

Run the generated-project contract from the repository root:

```sh
npm run test:guardrails
```
