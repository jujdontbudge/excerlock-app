---
status: accepted
date: 2026-09-08
---

# 0001: Coordinate releases and retire agent work conservatively

## Decision

Use a shared per-app local kernel lock for the full release sequence and a daily conservative cleanup of generated build output and explicitly completed worktrees. Keep ownership/completion state outside Git. See [operations.md](../agents/operations.md) for commands and thresholds.

## Context

Multiple agents and Git worktrees are used for this app. A September 8 storage audit found substantial repeated build and checkout data across the Mac. Johan requested release serialization and automatic housekeeping while preserving unfinished changes. Existing server deploy scripts did not acquire a shared app lock. This change implements the local wrapper and deploy integration; it does not perform a production release. Daily execution is configured in the local Codex task, separately from the repository.

## Consequences

Different apps may release independently; simultaneous releases of this app fail fast. Worktrees are not retired based on age alone. Dirty, ignored-file, active, unmerged and unclassified copies remain for review. Git branches and unique changes are retained. Local locks do not coordinate independent remote runners or protect commands that bypass the wrapper. Process activity checks are snapshots; agents must follow ownership and release instructions.
