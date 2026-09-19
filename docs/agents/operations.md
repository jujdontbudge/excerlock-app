# Agent releases and housekeeping

## Canonical branch and application

`main` is the authoritative integration and release source. The primary checkout
is `/Users/johansardar/ExcerLock`; the shipping iOS application is `app-next/`.
Do not package the legacy `app/` tree. Integrate completed task branches into
`main` and record the exact source commit for every App Store build and OTA update.
The Expo `production` channel is independent of the Git branch name.

Push-to-main CI runs verification and service readiness probes only. It does not
publish an OTA, upload/submit a binary, or deploy the server. The active scope
continues to exclude App Review submission, public release, and production OTA
publication. See [ADR 0025](../adr/0025-main-is-the-release-source.md).

## Release coordination

Run the **whole** release sequence under one app lock:

```sh
python3 scripts/agent-ops.py run -- bash /absolute/path/to/release-sequence.sh
```

The foreground script must perform merge, final verification, push, any remote CI wait, deployment/submission, and health checks in that order as applicable. Stop on failure (`set -euo pipefail`). Select the correct branch and obtain any required release authorization before running it. The lock does not grant permission to publish or skip existing checks. Do not detach release commands or use a no-wait submission without waiting for its result before returning.

The existing server deploy script acquires this lock automatically; nested calls reuse the inherited lock. For manual Git pushes, OTA updates, App Store submissions or other release scripts, use the wrapper explicitly. A busy lock exits 75 instead of queuing a potentially stale release. Re-read the repository state and revalidate before retrying. Ordinary development need not hold the release lock.

The kernel lock is shared by this app's local checkouts, with different app IDs for ExcerLock and Recovi. It persists in child processes if the supervisor is killed, and the OS releases it once all holders exit. Never delete lock files. This coordinates cooperating commands **on this Mac**, not independent CI jobs or other machines, and cannot intercept arbitrary bypass commands. An environment variable by itself is not accepted as proof of lock ownership; the inherited descriptor must match the locked inode.

## Worktree ownership

When starting work, register the checkout with a task/session identifier:

```sh
python3 scripts/agent-ops.py claim /absolute/path/to/worktree --owner task-or-session-id
```

When finished and committed, explicitly mark it complete with its actual integration branch:

```sh
python3 scripts/agent-ops.py finish /absolute/path/to/worktree --owner task-or-session-id --base-ref YOUR_INTEGRATION_BRANCH
```

Allowed integration refs are listed in `.agent-ops.json`. Main checkouts are never retired. Existing worktrees are inventoried as unassigned until claimed; they are never assumed finished. Claiming again clears completion status. A completion record is a cleanup signal, not permission to merge or publish.

## Automatic cleanup

Daily maintenance runs these commands for the main checkouts:

```sh
python3 scripts/agent-ops.py cleanup          # preview
python3 scripts/agent-ops.py cleanup --apply  # apply eligible cleanup
python3 scripts/agent-ops.py status          # ownership registry
```

Policy:

- Retire only explicitly finished worktrees after 7 days, with the same HEAD as at completion, clean tracked/untracked state, no ignored files, and all commits merged into the recorded integration ref. Keep the Git branch. Never force removal or prune unknown registrations.
- Clear only configured generated Xcode output directories after every contained entry has been unchanged for 14 days. Require recognizable Xcode output, no tracked files, no path indirection, and no release archives or sensitive file names. Keep source, dependencies, credentials, archives, arbitrary backups and conversation history.
- Skip checkouts with active processes, and recheck immediately before removal. Release and maintenance locks exclude each other. Activity detection is a conservative process snapshot, not a sandbox against another program starting work between checks.
- Preserve uncertain cases and record why. Missing or unreadable activity information aborts cleanup.

State and the latest report live in `~/.local/state/agent-ops/<app-id>/`. The scheduler runs in Codex on this Mac; it requires the host to be available. It must not mark worktrees finished automatically, fetch or alter Git history, deploy, or broaden deletion targets. On a different machine, configure a scheduler deliberately.

## OTA updates (T03 coordinator, T16 release gate)

Single owner: `app-next/src/runtime/updates.ts` owns every `expo-updates` call.
No other source file may import `expo-updates` (enforced by
`src/runtime/__tests__/updates-import-boundary.test.ts`). Config
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
- Persist a `resumeEnvelope` (`route` + `draftIds`) before every reload.
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
  (`guardrails/flag-consumers.test.ts` bounds the rail).
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
   passed. Fixtures: `app-next/scripts/test-verify-ota.sh` (mocked `asc`;
   unrelated build, wrong DB runtime, zero launches, missing second DB,
   numeric newest).
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

Only when `plans/ship/02-native-manifest.md` changes or a native
dependency's iOS code changes. Procedure: bump the string, build, submit,
wait for Ready for Sale, then publish JS to both the old and the new runtime
until the old runtime's 30-day active-install share is under 5%. Never orphan
a runtime that still has installs. Version bumps never change
`runtimeVersion`.
