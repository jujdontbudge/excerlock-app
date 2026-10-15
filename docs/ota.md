# OTA updates


Single owner: `app-next/src/packages/updates/updates.ts` owns every `expo-updates` call.
No other source file may import `expo-updates` (enforced by `./excer check`). Config
(`runtimeVersion`, `updates` block), `eas.json`, dependency manifests,
`createRuntime`, and root mounting remain root-owned; T03 does not edit them.

### Coordinator mount contract (T03 revision: live getters, pending-first, no auto-clear)

Mount `useOtaCoordinator` at the runtime root (T10), above every guard. It is
never gated on paywall or setup state; it receives primitive safe-boundary
inputs via LIVE getters (`OtaSafetyGetter`/`OtaEnvelopeGetter`) and fails closed
when any input is unknown or any getter throws. The hook reads the latest DI
via refs plus real `AppState.currentState` on every evaluation, so a stale
foreground captured before a 75s check/fetch can never reload:

- `purchaseOrRestoreBusy`, `permissionPromptPending`, `cameraActive`,
  `walkingActive`, `proppedActive`, `isForeground` (live from `AppState.currentState`),
  `route` (live pathname from root; see below)
- Safe only when all clear, foreground, and on an actual tab root
  (`/home`, `/conditions`, `/analytics`, `/settings` as returned by
  `usePathname()` with groups excluded; `'/'` is BootGate transient and never
  safe). Legacy `/(tabs)/…` Stack names normalize to the same canonical paths
  (`normalizeOtaRoute`); arbitrary routes are never guessed. See
  `evaluateSafeBoundary`/`isOtaSafeRoute`. Root must provide the explicit
  semantic pathname (no false positives at BootGate).
- First launch: native `ON_LOAD` owns check+download inside
  `fallbackToCacheTimeout`. JS only observes `useUpdates()` via
  `observeStartup()`; it never runs a duplicate check on the same launch.
  Later native downloads are observed via `observeDownloadedUpdate()` without
  repeated startup checks and without resetting unrelated staged state. An
  observed id gains reload authority only on a genuinely new foreground
  (generation `foregroundSeq` advances); the same foreground returns
  `deferred-unsafe/needs-fresh-foreground`, so a timed-out fetch result can
  never be resurrected through observation.
- Background tracking keeps the FIRST departure from active until the next
  active (background→inactive does not overwrite), so an iOS inactive-after-6h
  event cannot reset the duration to zero.
- Later: on foreground, an eligible pending update is attempted FIRST
  regardless of the 6h check cadence, with fresh live safety; unsafe defers
  until another foreground. Startup staged updates apply at the next safe
  boundary without a second launch check. Otherwise after ≥ 6 h in background,
  `checkForUpdateAsync` then `fetchUpdateAsync` with separate budgets
  (`OTA_CHECK_BUDGET_MS`, `OTA_FETCH_BUDGET_MS`; never one shared budget),
  then `reloadAsync` only after live revalidation immediately before reload
  after EVERY async write (purchase/camera/walking/background starting during
  fetch or storage awaits defers). Timed-out work revokes its epoch and can
  never reload late; concurrent checks/reloads return `busy`/`operation in flight`.
- Reload-loop guard persists `{ updateId, launchCount }`; the same update id
  is retried at most twice without a successful launch, then blocked and
  reported. Corrupt persisted guard throws (`OtaCorruptGuardError`) and never
  silently resets retry authority. Required guard/envelope read/write failures
  deny reload and report; last-check persistence is best-effort only
  (explicitly distinct, never denies). Only `markSuccessfulLaunch(runningUpdateId)`
  clears the guard — T10 calls it after hydrated stable app; the hook never
  auto-clears on mount. A pending id equal to the currently running id is
  rejected and cleared (`already-running`), never retried.
- Persist a `resumeEnvelope` (`route` + `draftIds`) before every reload. On the
  next hydrated launch, consume it once and clear it before navigation. A route
  resumes only when the current Journey already admits the selected account and
  the route is one of the existing safe tab roots. The envelope never restores
  Identity, Entitlement, Journey admission, unlock routes, or payment authority.
- `checkAndStage` is diagnostics-only (never used by the hook launch path);
  it stages without reloading and respects the same budgets/running guard.
- Observability: `getOtaObservabilityContext()` exposes `update_id` and
  `runtime_version` for T06 to register as Sentry `release`/`dist`
  (`com.johansardar.excerlock@<version>+<build>`, `<runtimeVersion>-<updateId>`)
  and PostHog super-properties after every reset. Sourcemaps upload per
  `eas update`/build remains T06/root-owned.

Code signing: Expo account is Free, so the conditional signing requirement is
not enabled. Do not create keys and do not claim tamper verification. The
tamper-manifest proof below runs once per certificate only when signing is
enabled.

### Submission scope of remote configuration (Wave 2 audit, fix 10)

An OTA may carry anything the reviewed binary already contains; it may never
change what users can reach beyond that. Treat each of the following as
**new-submission material — never an OTA**:

- Widening the `stride_gate_config` clamps beyond their measured endpoints
  (ADR 0035), weakening a one-directional field, or disabling the kill switch
  defaults.
- A new PostHog flag, or any new consumer of the existing flag rail
  (`./excer check` bounds the rail).
- A `shield_copy` (or any other remote copy) change that alters
  user-visible capability — what the app lets a user do, gate, or reach.

Review Notes (`docs/asc/review-notes.md`) commit to "remote configuration only
tunes analytics-driven copy, step order and thresholds whose defaults are
exactly the reviewed behavior"; the review binary must keep matching that
sentence for every OTA it receives. If an OTA would move any of the above,
ship it inside the next new-submission binary instead.

### Release ritual (gate for T16; script `app-next/scripts/verify-ota.sh` revision)

1. `eas update --branch production --message "<sha>"` only from a tagged
   commit on `main` after CI is green, under the release lock
   (`python3 scripts/agent-ops.py run -- ...`).
2. Determine the numerically newest `READY_FOR_SALE` IOS version from all
   paginated ASC versions (never from local `app.json`; numeric sort picks
   `1.0.10` over `1.0.9`), resolve its attached build via
   `asc versions view --include build`, fetch authoritative
   `asc builds info --build-id` (`attributes.version` = `CFBundleVersion`
   build number) and `asc apps view` (`bundleId`), then bind the COMPLETE
   `--ipa` (`Payload/*.app/Info.plist` + bound `Expo.plist`): IPA
   `CFBundleIdentifier`/`CFBundleShortVersionString`/`CFBundleVersion` must
   equal ASC bundle/live marketing version/attached build number, and IPA
   `EXUpdatesRuntimeVersion` must equal `--expected-runtime`. Standalone
   unbound `--expo-plist` and unrelated builds fail. Publish only to that runtime.
3. On physical phones: delete the app, install from the public App Store AND
   separately from TestFlight, launch twice each, then pull each
   `Library/Application Support/.expo-internal/expo-v11.db` and assert per-store
   that the intended `update_id` is present with `successful_launch_count > 0`
   (BLOB `id` compared via `hex(id)`) AND `runtime_version == expected runtime`.
   Both installs are required (`--appstore-db` + `--testflight-db` with
   `--appstore-evidence`/`--testflight-evidence` caller-observed device/source
   metadata; the script audits caller-provided artifacts and never claims it
   observed installation). Manifest/server metadata is never device proof.
   Missing either db is a `RUNTIME LIMIT` (exit 2), never a skipped test marked
   passed.
4. Prove a tampered manifest is rejected by the release binary once per
   certificate (signing-enabled builds only; skipped with no claim on Free).
5. Record all of it in `app-next/evidence/release-<version>/`.

Example:

```sh
app-next/scripts/verify-ota.sh \
  --asc-app-id 6787265352 \
  --expected-update-id <uuid> \
  --expected-runtime 1 \
  --ipa /path/to/live.ipa \
  --appstore-db /path/to/appstore-expo-v11.db \
  --testflight-db /path/to/testflight-expo-v11.db \
  --appstore-evidence "UDID=..., store=App Store, exported=..., launches=2" \
  --testflight-evidence "UDID=..., store=TestFlight, exported=..., launches=2"
```

### Bumping `runtimeVersion`

Only when the native manifest (`app-next/config/native.ts`) changes or a native
dependency's iOS code changes. Procedure: bump the string, build, submit,
wait for Ready for Sale, then publish JS to both the old and the new runtime
until the old runtime's 30-day active-install share is under 5%. Never orphan
a runtime that still has installs. Version bumps never change
`runtimeVersion`.

Publish to the older runtime with `./excer ota --message "<what changed>" --runtime 4 --publish`
from the same `origin/main` commit. The flag sets `EXCERLOCK_OTA_RUNTIME=4` (or `5`), which is the only
way `app.config.ts` reports an older runtime, and the gate refuses unless the simulator's installed app
is a runtime 4 build, so the ship proofs run on that binary. The JavaScript stays runtime-4 safe
through optional native module lookups (ADR 0076); a commit that needs runtime 5 native code
must not be published with `--runtime 4`.

Runtime 6 (build 20) adds the Bank drain. `--runtime 4` and `--runtime 5` publish the same JavaScript to older binaries, where the Bank choice stays hidden because `armBankDrain` is missing.
