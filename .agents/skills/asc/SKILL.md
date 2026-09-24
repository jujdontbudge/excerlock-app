---
name: asc
description: App Store Connect via the asc CLI. Use for TestFlight uploads, builds, signing, submission, review blockers, metadata and crash triage.
---

# App Store Connect (`asc`)

`asc` 5.x from https://github.com/rorkai/App-Store-Connect-CLI, installed with Homebrew. Run `asc version` and `asc <command> --help` before scripting. 5.x removed the 4.x flags, so guide examples may need the new names (`--build-id`, not `--build`): https://github.com/rorkai/App-Store-Connect-CLI/blob/main/migrate-to-5-0.mdx

## Credentials

The ExcerLock key is not a stored `asc` profile, and the keychain default belongs to another app. Before any call:

```sh
set -a; source ~/.excerlock/env; set +a
export ASC_PRIVATE_KEY_PATH=~/.excerlock/AuthKey_${ASC_KEY_ID}.p8
asc auth status   # must report environmentCredentialsComplete: true
```

Never print or commit key values. ASC app id: `6787265352`.

## Authority

Having the CLI does not mean you may upload, submit or change App Store data. Do that only when the user authorizes it, and run the whole sequence under the release lock from `docs/agents/operations.md`.

## ExcerLock's proven lane

The local archive, export and TestFlight upload lane, with its pitfalls, is recorded in `docs/releases/2026-09-17-testflight-1.0.0-2.md`. The most recent run is `docs/releases/2026-09-22-testflight-1.0.0-10.md`. Review notes live in `docs/asc/review-notes.md`.

## Guides

Read only the guide for the task. Guides call each other by their old skill names (`asc-<topic>`), and each one is at `references/<topic>/GUIDE.md`.

| Guide | Use for |
|---|---|
| `references/cli-usage/GUIDE.md` | Flags, output formats, pagination, auth. Read first. |
| `references/id-resolver/GUIDE.md` | Turning names into app, build, version and group IDs. |
| `references/xcode-build/GUIDE.md` | Archive, export and upload. |
| `references/signing-setup/GUIDE.md` | Certificates and provisioning profiles. |
| `references/build-lifecycle/GUIDE.md` | Build processing state and expiry. |
| `references/testflight-orchestration/GUIDE.md` | TestFlight groups, testers and what-to-test notes. |
| `references/release-flow/GUIDE.md` | Staging a version, attaching a build and submitting. |
| `references/submission-health/GUIDE.md` | Review blockers, privacy, digital goods and readiness repairs. |
| `references/metadata-sync/GUIDE.md` | Store listing metadata. |
| `references/whats-new-writer/GUIDE.md` | Release notes. |
| `references/crash-triage/GUIDE.md` | TestFlight crashes and feedback. |
