# T03 revision — result (exact APIs + limits)

## Exact coordinator APIs (post-revision)

- `OtaSafetyInput` (primitives; `null`/`undefined` = unknown → unsafe).
- `OtaSafetyGetter = () => OtaSafetyInput` (live; throws → `deferred-unsafe/safety-unavailable`, never reloads).
- `OtaEnvelopeGetter = () => ({ route: string; draftIds: string[] } | null)` (live; throws → `failed`, never reloads).
- `OtaForegroundArgs = { nowMs: number; backgroundedAtMs: number | null; getSafety: OtaSafetyGetter; getEnvelope?: OtaEnvelopeGetter | null }`.
- `OtaForegroundResult = suppressed-first-launch | suppressed-disabled | suppressed-not-due { backgroundDurationMs, sinceLastCheckMs } | busy | no-update | reloaded { updateId } | deferred-unsafe { reason, updateId } | blocked-loop-guard { updateId } | already-running { updateId } | failed { error }`.
- `OtaReloadResult = reloaded | deferred-unsafe | blocked-loop-guard | already-running | no-pending | suppressed-disabled | failed`.
- `OtaCoordinator.observeStartup({ currentlyRunningUpdateId?, downloadedUpdateId? })`: stages startup download with immediate authority (no second check); never networks; never clears guard; never stages running id.
- `OtaCoordinator.observeDownloadedUpdate(downloadedUpdateId?, currentlyRunningUpdateId?)`: stages observation with delayed authority (`pendingStagedAtSeq = foregroundSeq`; same foreground → `deferred-unsafe/needs-fresh-foreground`); preserves different staged ids (no reset); clears running ids.
- `OtaCoordinator.onForeground(args)`: pending-first regardless of 6h cadence (fresh live safety; unsafe defers); else 6h due check → separate-budget check/fetch → live revalidation after EVERY async write → reload. Generation `foregroundSeq` increments per foreground. Last-check best-effort only.
- `OtaCoordinator.tryReloadIfSafe({ getSafety, getEnvelope?, nowMs? })`: live revalidation after `saveEnvelope` and `saveGuard` + before `reload`; required failures deny + report; running check before/after writes.
- `OtaCoordinator.checkAndStage(nowMs?)`: diagnostics-only (never used by hook); same budgets; stages as `fetch` source; rejects running ids.
- `OtaCoordinator.markSuccessfulLaunch(runningUpdateId)`: ONLY guard-clear path; T10 calls after hydrated stable app; hook never auto-calls; required storage failures propagate.
- `isOtaSafeRoute(route)` + `normalizeOtaRoute(route)`: canonical `{'/home','/conditions','/analytics','/settings'}`; strips `?`/`#`, trailing `/`, `(group)` segments; `'/'`/`'/index'`/`'index'`/`'/(tabs)'` unsafe; nested/detail unsafe.
- `evaluateSafeBoundary(input)`, `isOtaCheckDue({ nowMs, backgroundedAtMs, lastCheckAtMs })`, `OtaBudgetTimeoutError`, `OtaAuthorityRevokedError`, `OtaStorageError`, `OtaCorruptGuardError`, `OtaCorruptEnvelopeError`.
- `createMemoryOtaStorage()`, `createAsyncStorageOtaStorage()` (guard/envelope required-throw; last-check best-effort swallow), `createExpoUpdatesClient()` (SDK57 `checkForUpdateAsync`/`fetchUpdateAsync`/`reloadAsync` + `useUpdates`), `getOtaObservabilityContext()`, `createOtaCoordinator(deps)`.
- `useOtaCoordinator({ coordinator?, getSafety?, getEnvelope?, now?, report? })`: stable coordinator (state initializer); DI via refs updated in effect; `AppState.currentState` live override for `isForeground`; first-departure background tracking; startup once + download observation without resets; no auto-clear.

## Exact verifier APIs

- `verify-ota.sh --asc-app-id --expected-update-id --expected-runtime --ipa --appstore-db --testflight-db --appstore-evidence --testflight-evidence [--appstore-udid --testflight-udid] [--output text|json]`; rejects `--expo-plist`, `--db-path`, `--device-udid`, `--dry-run`.
- Binds IPA `CFBundleIdentifier`/`CFBundleShortVersionString`/`CFBundleVersion`/`EXUpdatesRuntimeVersion` to ASC `bundleId`/numeric-newest live marketing/`attributes.version`/expected runtime; each DB must contain intended UUID with `successful_launch_count>0` and `runtime_version==expected`.
- `test-verify-ota.sh`: 10 mocked-`asc` cases (PASS `1.0.10`, unrelated bundle/build/version, wrong DB runtime, zero launches, missing TestFlight DB → `RUNTIME LIMIT`, standalone plist, single db-path, missing id).

## Limits

- Logic tests (77 Jest + 10 shell fixtures) do not prove on-device activation, launch health, or App Store/TestFlight installs. No sim/device, no live ASC/IPA/DB, no signing keys (Free), no tamper claim. T00 device/screenshots and T16 dual-store `expo-v11.db` proof remain gates. Missing artifacts are runtime limits, never passes. Hook root integration (T10 mounting + pathname mapping + `markSuccessfulLaunch` after hydration) remains root-owned.
