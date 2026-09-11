---
status: accepted
date: 2026-09-11
---

# 0025: Main is the release source

## Decision

Use `main` as the single integrated product branch and `app-next/` as the iOS
release application. App Store binaries and Expo OTA updates must originate from
verified commits reachable from `main`. Keep an explicit record binding each
release to its source commit, native runtime, and Apple build or Expo update ID.

Git integration does not publish a binary or update. The existing restriction on
App Review submission, public release, and production OTA publication remains in
force. The Expo production channel need not share the Git branch name.

## Context

The shipping implementation accumulated on `ship/implementation` while the primary
checkout remained on `rebuild/phase-1`. On 2026-09-11 the user requested consolidation
into `main`. There were 127 local branches and 85 registered worktrees.

The primary checkout's outstanding app/server changes were already incorporated
into shipping history: 93 dirty file versions matched the shipping tip, and all
55 differing app/server/plan file versions matched earlier blobs on that lineage.
Preserve these files in a checkpoint while retaining subsequent shipping fixes.
Uncommitted agent documentation and tooling configuration are integrated separately.

The user has an uploaded Apple build, but no public App Store version or published
Expo OTA update. Source control and actual distribution therefore need distinct
records. A branch name alone cannot prove which code is running on a phone.

## Consequences

- The main checkout uses `main`; completed work is committed and pushed there.
- Short-lived task branches may isolate changes, but do not become alternate release sources.
- The legacy `app/` directory remains for regression coverage and is not packaged for release.
- Existing branches and unreviewed local working copies remain recoverable. Cleanup
  follows the existing ownership/retirement rules, never blanket deletion.
- Push-to-main CI verifies source and service readiness without publishing an app.
- Each future release records immutable source/artifact identifiers and verifies the
  target native runtime before any OTA publication.

## References

- [Release operations](../agents/operations.md)
- [Consolidation and release state](../releases/2026-09-11-main-consolidation.md)
- [ADR 0001: release coordination](0001-coordinate-releases-and-retire-agent-work.md) — accepted
- [Shipping scope](../../plans/ship/README.md)
