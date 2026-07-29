# ShieldController

Contract: the only writer of `react-native-device-activity`. Its idempotent `reconcile(desired)` boundary
translates ledger-desired state into native calls and hides re-arm and walk-session mechanics.

Fixtures: a recorder implementation will capture exact native call sequences. Test with
`npm run test --workspace app -- shield`.
