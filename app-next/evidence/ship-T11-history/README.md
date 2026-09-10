# T11 durable history reconciliation

DetectionService now owns step-history reconciliation through `HistoryCreditLedger`. Each wake first reads the durable ledger and replays any exact persisted pending intent before issuing a new native query. Its cursor is initialized from the maximum known detection/ledger cursor, with the supplied local day start used only when neither exists.

Queries are split at timezone-correct local-midnight boundaries before ledger application. New pending intents persist their originating timezone so a retry after travel retains the original interval/day interpretation; old pending v1 records fall back to the current wake timezone. Catch-up is limited to eight daily segments per wake and resumes from the committed ledger cursor later, avoiding an unbounded background callback.

Verification on 2026-09-10:

- `npm run typecheck --workspace app-next` — pass
- focused DetectionService/durability tests — 12 tests passed
- full Jest — 212 suites, 958 tests, 13 snapshots passed
- `git diff --check` — pass

No native-device HealthKit/pedometer history delivery is proven here.
