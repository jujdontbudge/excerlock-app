# T03 revision — status (ship/T03 after 0d0e7f6)

Branch: `ship/T03`. Base: `0d0e7f6`. Scope: release-blocking correctness gaps 1–7 + safe-route minor. No subagents, no root config/package edits, no sim/device, no external services. Shared `node_modules` untouched (read-only symlink).

## Done (tests-first, then fix)

- `app-next/src/runtime/updates.ts` (1310 lines): live `OtaSafetyGetter`/`OtaEnvelopeGetter` (fail closed if throws), revalidation after EVERY async write, pending-first on next foreground regardless of 6h cadence, generation-gated `observeDownloadedUpdate` (same foreground `needs-fresh-foreground`, no resurrection), first-departure background tracking, no hook auto-clear (explicit T10 `markSuccessfulLaunch`), `already-running` reject/clear, required guard/envelope fail-closed (corrupt throws) vs last-check best-effort (explicit), canonical group-excluded safe routes (`/home`, `/conditions`, `/analytics`, `/settings`; `'/'` BootGate unsafe; legacy `/(tabs)/…` normalizes).
- Tests: `updates.test.ts` migrated to live getters + canonical routes; `updates-revision.test.ts` (28 tests: stale matrix purchase/camera/walking/background during fetch + storage, getter-throws, save/load/corrupt guard, envelope, last-check best-effort, resurrection, startup-without-check, unsafe-defer-retry); `updates-hook.test.tsx` (4 tests: first-departure 6h, live refs + `AppState.currentState`, no auto-clear, late-download pending-first without check). Total runtime suite: 77 tests pass.
- `app-next/scripts/verify-ota.sh` (352 lines): requires complete `--ipa` (main `Info.plist` + bound `Expo.plist`), binds `CFBundleIdentifier`/`CFBundleShortVersionString`/`CFBundleVersion` to ASC `bundleId`/live marketing/`attributes.version` (build number), rejects standalone `--expo-plist` and single `--db-path`/`--device-udid`, compares EACH db `runtime_version` to expected, requires SEPARATE `--appstore-db` + `--testflight-db` with `--appstore-evidence`/`--testflight-evidence` (script never claims it observed installation).
- Fixtures: `app-next/scripts/test-verify-ota.sh` (10 cases with mocked `asc`: PASS numeric-newest `1.0.10>1.0.9`, unrelated bundle/build/version, wrong DB runtime, zero launches, missing second DB, standalone plist, single db-path, missing id). `bash -n` clean for both scripts.
- `docs/agents/operations.md`: mount contract + release ritual updated to live getters, pending-first, generation, canonical routes, dual-db verifier.

## Checks (bounded exec, log+exit marker, `set -o pipefail`)

- `npx tsc --noEmit`: clean (exit 0).
- `npx jest src/runtime/__tests__ --runInBand --no-coverage`: 6 suites, 77 tests pass.
- `bash -n` both shell scripts: clean.
- `test-verify-ota.sh`: 10/10 pass (mocked ASC, no network).
- `npx eslint` runtime + tests: 0 errors (warnings cleaned; 1 import-order warning fixed).

## Limits (not passes)

- No sim/device, no live ASC, no real IPA/DB artifacts here; physical App Store + TestFlight `expo-v11.db` activation and tamper-manifest proof remain T00/T16 gates. Missing artifacts are `RUNTIME LIMIT` (exit 2), never PASS.
- Free Expo account: no signing keys, no tamper claim.
- Tests prove logic, not activation on a user device. No completion claim from tests alone.

## Files for root integration

- `app-next/src/runtime/updates.ts`, `__tests__/updates.test.ts`, `__tests__/updates-revision.test.ts`, `__tests__/updates-hook.test.tsx`, `app-next/scripts/verify-ota.sh`, `app-next/scripts/test-verify-ota.sh`, `docs/agents/operations.md`, `app-next/evidence/ship-T03/T03-revision-status.md`, `app-next/evidence/ship-T03/T03-revision-result.md`.
- No push, no finish. Root integrates both commits afterward.
