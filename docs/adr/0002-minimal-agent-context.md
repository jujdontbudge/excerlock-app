# 0002: Minimal default agent context

- Date: 2026-09-08
- Status: Accepted for lean Codex/Claude; amended by 0003 and clarified by [0004](0004-share-core-skills-across-agent-clis.md); implemented in the main checkout

## Context

The user requested removing as much skill, MCP and instruction overhead as possible. The local Codex prompt preview exposed 90 skill entries; 12 user-configured MCP servers were available. Most were irrelevant to routine ExcerLock changes.

## Decision

Disable plugins, apps, skill search, known MCP servers and the default skill catalog in repository Codex configuration. Use a Claude launcher with skills disabled and an empty strict MCP configuration. Disable Claude auto-memory and shorten repository instructions to essential rules and on-demand documentation links.

## Consequences

Agents use repository files, ordinary CLI tools and versioned documentation by default. Specialized capabilities require explicit opt-in. Skill files remain available. ADR, release locking, housekeeping and global iOS rules remain. This is checkout-local; existing sessions require restarting and other worktrees require propagation. Provider instructions are outside repository control.

## Validation

Fresh Codex prompt preview: 90 skill entries before, zero after; all 12 configured MCP servers disabled. See `docs/agents/context.md` for activation and limitations.
