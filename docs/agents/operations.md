# Agent releases and housekeeping

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

### Coordinator mount contract

Mount `useOtaCoordinator` at the runtime root (T10), above every guard. It is
never gated on paywall or setup state; it receives primitive safe-boundary
inputs via DI and fails closed when any input is unknown:

- `purchaseOrRestoreBusy`, `permissionPromptPending`, `cameraActive`,
  `walkingActive`, `proppedActive`, `isForeground`, `route`
- Safe only when all clear, foreground, and on a tab root (not onboarding,
  builder, paywall, or ceremony). See `evaluateSafeBoundary`/`isOtaSafeRoute`.
- First launch: native `ON_LOAD` owns check+download inside
  `fallbackToCacheTimeout`. JS only observes `useUpdates()` via
  `observeStartup()`; it never runs a duplicate check on the same launch.
- Later: on foreground after ≥ 6 h in background, `checkForUpdateAsync` then
  `fetchUpdateAsync` with separate budgets (`OTA_CHECK_BUDGET_MS`,
  `OTA_FETCH_BUDGET_MS`; never one shared budget), then `reloadAsync` only at
  the next safe boundary. Timed-out work revokes its epoch and can never
  reload late; concurrent checks/reloads return `busy`/`operation in flight`.
- Reload-loop guard persists `{ updateId, launchCount }`; the same update id
  is retried at most twice without a successful launch, then blocked and
  reported. Only `markSuccessfulLaunch(runningUpdateId)` clears the guard,
  called when the new runtime reaches the coordinator steady milestone.
- Persist a `resumeEnvelope` (`route` + `draftIds`) before every reload.
- Observability: `getOtaObservabilityContext()` exposes `update_id` and
  `runtime_version` for T06 to register as Sentry `release`/`dist`
  (`com.johansardar.excerlock@<version>+<build>`, `<runtimeVersion>-<updateId>`)
  and PostHog super-properties after every reset. Sourcemaps upload per
  `eas update`/build remains T06/root-owned.

Code signing: Expo account is Free, so the conditional signing requirement is
not enabled. Do not create keys and do not claim tamper verification. The
tamper-manifest proof below runs once per certificate only when signing is
enabled.

### Release ritual (gate for T16; script `app-next/scripts/verify-ota.sh`)

1. `eas update --branch production --message "<sha>"` only from a tagged
   commit on `main` after CI is green, under the release lock
   (`python3 scripts/agent-ops.py run -- ...`).
2. Determine the numerically newest `READY_FOR_SALE` IOS version from all
   paginated ASC versions (never from local `app.json`), resolve its attached
   build, and read that build's embedded `runtimeVersion` from its exported
   `Expo.plist` (`EXUpdatesRuntimeVersion`, via `--expo-plist` or `--ipa`).
   Publish only to that runtime. Fail if the intended runtime differs.
3. On a physical phone: delete the app, install from the public App Store
   (and separately from TestFlight), launch twice, then pull
   `Library/Application Support/.expo-internal/expo-v11.db` and assert the
   intended `update_id` is present with `successful_launch_count > 0` (BLOB
   `id` compared via `hex(id)`). Both installs. Manifest/server metadata is
   never device proof. Fail the release otherwise. Missing `--db-path` is a
   `RUNTIME LIMIT` (exit 2), never a skipped test marked passed.
4. Prove a tampered manifest is rejected by the release binary once per
   certificate (signing-enabled builds only; skipped with no claim on Free).
5. Record all of it in `app-next/evidence/release-<version>/`.

Example:

```sh
app-next/scripts/verify-ota.sh \
  --asc-app-id 6787265352 \
  --expected-update-id <uuid> \
  --expected-runtime 1 \
  --db-path /path/to/expo-v11.db \
  --expo-plist /path/to/Expo.plist
```

### Bumping `runtimeVersion`

Only when `plans/ship/02-native-manifest.md` changes or a native
dependency's iOS code changes. Procedure: bump the string, build, submit,
wait for Ready for Sale, then publish JS to both the old and the new runtime
until the old runtime's 30-day active-install share is under 5%. Never orphan
a runtime that still has installs. Version bumps never change
`runtimeVersion`.
