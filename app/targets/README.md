# Native Apple targets

These directories are source inputs for `react-native-device-activity`'s shipped
`@kingstinct/expo-apple-targets` config plugin. Expo prebuild links them into the
generated Xcode project; nothing under `app/ios` is hand-maintained.

The Screen Time targets all keep the canonical app group, Family Controls
entitlement, team `AX3C2B78YD`, and iOS 17.4 deployment target in their
`expo-target.config.js` files. The finalized local plugin materializes the
monitor class and shared runtime byte-for-byte from the installed
`react-native-device-activity` package during every prebuild. Those generated
files are ignored: package behavior stays package-owned instead of becoming a
1,800-line hand-maintained module here.

Run the generated-project contract from the repository root:

```sh
npm run test:guardrails
```
