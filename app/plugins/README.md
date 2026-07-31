# Local Expo config plugins

`withNoPush` is the first plugin by product law and owns the local-only
notification entitlement boundary. Expo applies entitlements mods in LIFO
order, so it deletes `aps-environment` after `expo-notifications` adds its
automatic native configuration.

`withScreenTimeExtensionValidation` uses Expo's finalized iOS mod, which runs
after every Xcode mutation. The installed
`react-native-device-activity` plugin already delegates target generation to
`@kingstinct/expo-apple-targets`, so this repo does not duplicate that
generator. Instead, the final plugin makes clean prebuild fail immediately if
the monitor, shield configuration, or shield action target is absent or loses
its canonical App ID, iOS 17.4 deployment target, Apple team, or entitlements
file.
