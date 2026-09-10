# App Intents target

Contract: will hide the App Intents extension generated through `@bacons/apple-targets`. Invariants: no
target is configured in Phase 0; once promoted in `guardrails/native-targets.json`, its target and
entitlements survive clean prebuild and explicitly retain iOS 17.4.

Fixtures: none until the native phase introduces intent inputs. Test the generated target with
`npm run test:guardrails` from the repository root.

## T01 status (ship)

Pending. Empty intent (`EmptyIntent.swift`, no Family Controls) + `Info.plist`
(`com.apple.appintents-extension`) + `expo-target.config.pending.js` (App Groups
only, team `AX3C2B78YD`, iOS 17.4) are preserved as the planned capability.
No Xcode appex is generated until Astra's fifth-target review resolves the
extension detail. The validator asserts the pending definition exists; binary
verification reports the App Intents appex as unchecked.
