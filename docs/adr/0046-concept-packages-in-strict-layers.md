---
status: accepted
date: 2026-09-24
---

# 0046: Concept packages in strict layers

## Decision

All app source lives in `app-next/src/packages/<name>/`, one package per product concept. A package's root files are its public entry points and `lib/` is private. Packages sit in the layers listed in `ARCHITECTURE.md` and import only packages from lower layers, so the package graph cannot form a cycle. `ports` holds every port interface, the `Runtime` type and `useRuntime()`. `runtime` is the only composition root. Native code lives in `Native*` entry files or `lib/native/`. `app-next/.dependency-cruiser.cjs` encodes the rules, and `./excer check` holds its violation count at zero.

## Context

The app was organised by technical type (`domain`, `state`, `content`, `ports`, `runtime`, `features`, `design-system`). Every feature imported every type folder, and `useRuntime` lived in the composition root that imports every feature. The result was a single cycle through all 25 concepts, and three file-level cycles. An agent could not tell from a path what a change would reach.

The layers were derived from the real import graph after four cuts. `useRuntime` and the port types moved into `ports`, mixed copy files were split by consumer, the root layout became `runtime/AppRoot`, and the setup-needs hook moved into `permissions`. Declaring an ideal layer list first, and then bending the code to fit it, was rejected: it would have meant rewriting working screens for no behaviour change.

## Consequences

- A path now says what a file is for and who may import it; a wrong import fails `./excer check`.
- `./excer move` moves files and rewrites their imports, so later reshaping is cheap.
- Stores stay public entry points of their owning package rather than hidden behind commands. Only the owning package writes them. Narrowing them further is follow-up work.
- The layer list is long (16 levels) because it records the real graph. A new cross-package import may force a package to move up a layer; that is intended friction.

## References

- `ARCHITECTURE.md`, `app-next/.dependency-cruiser.cjs`, `tools/excer/commands/move.ts`.
- ADR 0045 (accepted): verification through `./excer`, no tests, no comments.
