# T03 Jest — runtime coordinator (revision)

PASS src/runtime/__tests__/updates.test.ts (migrated to live getters + canonical `/home` routes)
PASS src/runtime/__tests__/updates-revision.test.ts (28 tests: stale matrix purchase/camera/walking/background during fetch + storage, getter-throws, save/load/corrupt guard, envelope, last-check best-effort, resurrection generation, startup-without-check, unsafe-defer-retry)
PASS src/runtime/__tests__/updates-hook.test.tsx (4 tests: first-departure 6h, live refs + AppState.currentState, no auto-clear explicit T10 milestone, late-download pending-first without check)
PASS src/runtime/__tests__/updates-import-boundary.test.ts (single owner, SDK57 modern calls, no paywall imports)
PASS src/runtime/__tests__/runtime.test.ts
PASS src/runtime/__tests__/native-place-search.test.ts

Test Suites: 6 passed, 6 total
Tests:       77 passed, 77 total
Snapshots:   0 total
Ran with --runInBand --no-coverage (bounded exec, log+exit marker, set -o pipefail).
