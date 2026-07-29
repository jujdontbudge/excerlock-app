# Ledger bindings

Contract: owns app persistence, store orchestration, and the App Group balance-snapshot mirror around the
pure ledger package. It never reimplements balance, drain, earn, rollover, or ladder math.

The Analysis tab is **not** here: reading day summaries into a surface is `app/src/analysis/`. This
module will feed it the real `DaySummary` records once the store exists.

Fixtures: none in Phase 0. Journal scenarios arrive with the first binding test. Test with
`npm run test --workspace app -- ledger` from the repository root.
