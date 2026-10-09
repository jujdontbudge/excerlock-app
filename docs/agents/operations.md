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

Publish production OTA updates only with `./excer ota --message "<what changed>" --publish` ([ADR 0068](../adr/0068-ota-ship-gate.md)); never run `eas update` for production directly. It runs the full check and the ship proofs, then publishes under the release lock.

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

OTA publishing, its safety rules and the release ritual: `docs/ota.md`.
