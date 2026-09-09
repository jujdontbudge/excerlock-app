# 0003: Four explicit on-demand skills

- Date: 2026-09-08
- Status: Superseded by [0004](0004-share-core-skills-across-agent-clis.md) on 2026-09-09; historical implementation retained below
- Amends: 0002

## Context

After reviewing the 90 suppressed skills, the user accepted a small useful set rather than no skill guidance. Per-skill overrides did not remove entries from the installed Codex prompt preview; the tiny catalog budget did.

## Decision

Keep automatic skill catalogs, plugins and MCP servers disabled. Add four short task-triggered file references to root AGENTS.md: React Native best practices, opensrc, log-pitfall and Adapty SDK integration. Agents read the matching guide through ordinary file tools only when relevant. Specialist build, release and design guides remain available for explicit tasks.

## Consequences

Both Codex and Claude inherit the same compact index without restoring unrelated catalogs. These are manual on-demand guides, not registered slash commands. Plugin-cache paths may require updates after plugin upgrades. Existing sessions require restart. Other worktrees need the changes propagated separately.

## Amendment: retain mobile UI design guidance (2026-09-08)

After comparing two React dashboard builds using the same brief, one with mobile-app-ui-design and one without, the user explicitly chose to keep the design skill. Add it as a fifth task-triggered guide for mobile screens, flows and UI improvements. Existing ExcerLock design rules take precedence over generic style prescriptions. The comparison was one sample per condition, not evidence of universal superiority. Automatic catalogs and MCP settings remain unchanged.
