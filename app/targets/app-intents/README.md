# App Intents target

Contract: will hide the App Intents extension generated through `@bacons/apple-targets`. Invariants: no
target is configured in Phase 0; once promoted in `guardrails/native-targets.json`, its target and
entitlements survive clean prebuild and explicitly retain iOS 17.4.

Fixtures: none until the native phase introduces intent inputs. Test the generated target with
`npm run test:guardrails` from the repository root.
