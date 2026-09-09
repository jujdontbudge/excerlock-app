# Minimal agent context

Applies to this checkout. Existing sessions retain their loaded context; start a fresh session in this repository. Other worktrees do not automatically receive uncommitted configuration changes.

## On-demand skills

The root AGENTS.md explicitly indexes React Native best practices, opensrc, log-pitfall, Adapty integration, mobile-app-ui-design and asc-cli-usage. Both Codex and Claude can read these files through their normal file tools when relevant. This is a small manual skill index, not automatically registered slash commands. The broad automatic catalog remains suppressed because per-skill overrides alone did not filter its prompt preview. No skill or MCP plugin needs enabling to read the guides.

## Codex

`.codex/config.toml` disables plugins, apps, skill search and the 12 currently configured MCP servers. Explicit skill overrides retain the skill files for later use. A one-token catalog budget ensures no skill descriptions enter the default prompt (verified with `codex debug prompt-input`; the per-skill overrides alone did not suppress its catalog). Newly installed MCP servers require adding another disabled entry. User model, authentication and permission settings remain inherited.

## Claude

Run `scripts/claude-lean`, or `cc` after reloading your shell. The launcher disables all skills and strictly uses an empty MCP configuration. Project settings turn off auto-memory; the prototype Expo plugin is disabled. The main checkout's entry in `~/.claude.json` also disables currently inherited MCP servers. Direct `claude` launches do not get the launcher's all-skills guarantee.

## On-demand use

Read a specific document or retained skill file only when relevant. Prefer existing CLI tools (`gh`, `xcrun`, `idb`, `asc`) and official versioned documentation. Enable an individual MCP in repo configuration only when needed, then disable it again. Core provider/system instructions and inherited global iOS rules remain. Configuration does not remove context from already-running desktop or CLI sessions.

## Pi, Hermes and Muse Code

These harnesses have separate skill discovery from the lean Codex/Claude setup. ExcerLock's `.agents/skills/` exposes the 15 core packages plus the existing ads-manager skill; Pi, Hermes and Muse discovery was verified on 2026-09-09. Hermes trusts this checkout. Global catalogs are still inherited; the zero-catalog statement above applies only to the configured lean harnesses. Full skill bodies remain on demand. Machine-local symlinks may need repair after plugin upgrades or on another computer. See accepted ADRs [0004](../adr/0004-share-core-skills-across-agent-clis.md), [0005](../adr/0005-cli-first-ios-and-service-tooling.md) and [0006](../adr/0006-route-web-extraction-by-source-type.md).
