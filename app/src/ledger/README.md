# Ledger bindings

Contract: owns app persistence, store orchestration, and the App Group balance-snapshot mirror around the
pure ledger package. It never reimplements balance, drain, earn, rollover, or ladder math.

Fixtures: none in Phase 0. Journal scenarios arrive with the first binding test. Test with
`npm run test --workspace app -- ledger` from the repository root.
