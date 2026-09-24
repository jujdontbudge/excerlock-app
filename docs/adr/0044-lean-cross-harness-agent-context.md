---
status: accepted
date: 2026-09-24
---

# 0044: One lean agent context shared by Claude Code, Pi and Hermes

## Decision

- **Instructions:** `AGENTS.md` is the only repository instruction file. It uses plain path pointers and no `@imports`. `CLAUDE.md` and `GEMINI.md` each contain the single line `@AGENTS.md`. Product vocabulary lives in `CONTEXT.md` and code shape in `ARCHITECTURE.md`.
- **Skills:**
  - Repository skills are real, committed folders in `.agents/skills/`. Pi, Hermes and Codex read that folder natively, and Claude Code reads it through the committed relative symlink `.claude/skills -> ../.agents/skills`.
  - No skill links point outside the repository.
  - The kept set is `asc`, `react-native-best-practices` and `screensdesign-data`, plus the feature-map skill that ships with `./excer`.
- **Services:** reach them through their vendor CLIs (ADR 0005). The repository has no `.mcp.json` and no project MCP servers. Any MCP a person keeps is configured at user level in each harness, with its credentials.
- **Hooks:** no hooks inject context into agent sessions: no memory recall, capture or SessionStart banners. Guardrails live in `./excer check` and CI, because those cover every harness.

## Context

ADR 0008 exposed every installed skill and MCP server to seven clients. By 2026-09-24:

- Claude sessions in this repo started with about 15K tokens of configurable context: 427 MCP tools from 28 servers, 37 skill listings, and hooks.
- Nine of the eighteen project skills were dangling symlinks.
- The mem0 recall hook injected retired Firstmate procedures on every prompt.
- The MCP launcher read credentials from backup snapshots.
- Pi, Hermes and Codex never expand `@imports`.
- Hermes truncates skill descriptions at 60 characters, and a `.hermes.md` file would shadow `AGENTS.md`.
- MCP configuration does not port between harnesses, while a CLI called through bash does.

## Consequences

- **Gains:** every harness sees the same short instructions and the same small skill set, and a worktree is self-contained.
- **Costs:** fewer ready-made integrations; agents must read `--help` output instead of MCP schemas; restoring a removed tool takes a deliberate user-level change.
- **Adding a skill:** it must be a real folder under `.agents/skills/`, with its trigger in the first 60 characters of `description`.
- **Rollback:** the pre-cleanup user configuration is in `~/agent-config-backup-20260924-104922.tgz`.

## References

Supersedes [ADR 0004](0004-share-core-skills-across-agent-clis.md), [ADR 0007](0007-restore-kept-agent-capabilities.md) and [ADR 0008](0008-share-installed-agent-capability-inventory.md). Builds on [ADR 0005](0005-cli-first-ios-and-service-tooling.md).
