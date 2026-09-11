---
status: accepted
date: 2026-09-09
---

# 0007: Restore kept capabilities across coding agents

## Decision

Remove the lean launcher's blanket skill/MCP suppression and the repository Codex catalog cap. Enable the retained skill catalog and relevant configured integrations. Expose the shared project skills to Claude, Cursor and Gemini in their agent-specific directories; retain Pi, Hermes and Muse discovery. Keep CLI-first operation and on-demand skill bodies.

## Context

The user observed Claude reporting that cc deliberately disabled all skills and MCPs. Earlier setup restored Pi/Hermes/Muse discovery but left the older lean Claude/Codex restrictions in place. The user explicitly requested that coding agents have the kept capabilities. This supersedes ADR 0002's blanket suppression and the lean-harness exception in ADR 0004. Existing sessions need restarting.

## Consequences

Skill descriptions and enabled integration schemas can increase startup context. Configured does not guarantee authenticated or healthy: providers, MCP servers and plugins remain host-specific. No credentials or plugins are copied between incompatible harnesses. Clerk and Maestro remain excluded; unrelated disabled integrations are not automatically restored. Absolute project skill symlinks are local-machine configuration. Preserve repository release rules and task authorization.

## References

- [0002: superseded](0002-minimal-agent-context.md)
- [0004: amended](0004-share-core-skills-across-agent-clis.md)
- [Agent context](../agents/context.md)
