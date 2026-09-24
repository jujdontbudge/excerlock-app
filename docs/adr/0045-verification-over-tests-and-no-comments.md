---
status: accepted
date: 2026-09-24
---

# 0045: Verify through the real app and static checks; no tests, no comments

## Decision

- **No tests:** the repository has no unit, integration or end-to-end tests. Verification has two parts:
  - `./excer check` is static: typecheck, lint, the dependency-cruiser import rules, and repository checks that replace the old guardrail tests.
  - `./excer prove <feature>` drives the real app on a simulator along a user's path and captures evidence. The feature map in the verification skill says how to reach each feature.
- **No comments:** TypeScript and JavaScript in `app-next/`, `server/` and `packages/` contain no comments. `excerlock/no-comments` enforces this. It allows directive comments that state a reason. Knowledge belongs in names, types, `CONTEXT.md` or an ADR. Swift is exempt.
- **One shape:** code follows the five-noun package shape in `ARCHITECTURE.md`.

## Context

- **Tests had become their own codebase:** 780 test files and 79K lines, which pinned shallow module interfaces and so resisted refactoring. Agents copied their patterns.
- **The alternative:** Lauren Tan's "How I shipped 2,500 PRs" argues that trust comes from verification an agent can run itself: a CLI for control, a feature map for context, and static rules that make mistakes impossible rather than discouraged.
- **Comments had drifted:** they drifted from the code and spread workarounds as precedent.
- **What was lost:** the protections the deleted guardrail tests gave (listed in the rebuild plan) are rebuilt as lint, dependency-cruiser or `./excer check` rules.

## Consequences

- **Refactoring is cheaper:** only the public behavior checked by `./excer prove` and the static invariants constrain it.
- **Costs:** regressions in pure logic surface later, at the simulator. Proof needs a booted simulator and a built app.
- **Follow-up:** port each guardrail as its package lands, and add a feature-map entry for each new feature.

## References

`ARCHITECTURE.md`, `packages/eslint-plugin-excerlock/`, tag `archive/pre-rebuild-2026-09-24` (the last commit with tests).
