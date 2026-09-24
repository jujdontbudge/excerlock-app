---
status: superseded
date: 2026-09-09
---

# 0004: Share core skills across agent CLIs

## Decision

Expose the kept core skill packages through ExcerLock's `.agents/skills/` for Pi, Hermes and Muse Code. Keep full skill bodies on demand. Retain the separate lean Codex/Claude configuration rather than assuming every harness shares its settings. This supersedes ADR 0003's manual-only skill-registration decision; ADR 0002 remains accepted for the lean Codex/Claude scope.

The core set covers opensrc, Adapty SDK integration, React Native, mobile UI design, iOS pitfall logging, imagegen, iPhone image mockups, and eight ASC guides for CLI usage, Xcode, TestFlight, signing, build lifecycle, crashes, releases and submission health. Preserve the existing ads-manager package separately.

## Context

The user first requested minimal context, then explicitly retained useful skills and asked that Pi and Hermes in ExcerLock have them. Muse Code was subsequently installed with the same requirement. A Codex catalog setting does not control these other CLIs. Fourteen links were added alongside the existing Adapty and ads-manager packages. Hermes project trust was enabled for this checkout. Local Pi and Hermes discovery and Muse's skill listing verified the 15 core packages; Muse reported them enabled. No Clerk skill appeared in those inventories.

## Consequences

A shared package avoids diverging copies, while descriptions still consume some startup context. This is not a claim of zero active skills: inherited global catalogs remain, including unrelated skills not removed by this change. Absolute symlinks are machine-local and need recreation on another computer; plugin-cache targets may move after upgrades. Existing sessions must reload or restart. Image guidance does not provide credentials or a host image-generation tool. No new MCP was installed for this decision.

## References

- [0003: superseded manual-only skill policy](0003-four-on-demand-skills.md)
- [0002: accepted lean Codex/Claude policy](0002-minimal-agent-context.md)
- [Agent context](../agents/context.md)
- [Repository instructions](../../AGENTS.md)
- [Shared skill directory](../../.agents/skills/)

Superseded by [ADR 0044](0044-lean-cross-harness-agent-context.md).
