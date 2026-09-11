# Agent capabilities

ADR 0007 supersedes the former lean defaults. `cc` still uses scripts/claude-lean for compatibility, but that script now inherits configured skills, plugins and MCP servers. Codex's repository-wide skill cap and blanket plugin disables are removed. Selected existing Xcode/Expo/documentation/design/service integrations are enabled; unrelated exclusions remain.

Shared skills live in `.agents/skills/`. Claude, Cursor and Gemini also have links in their project-specific skills directories. Pi, Hermes and Muse use the shared discovery described in ADR 0004. Gemini imports AGENTS.md through GEMINI.md. Read only relevant skill bodies; use the web, iOS and service CLI guides from AGENTS.md.

Restart sessions after changing configuration. Skill registration is separate from tool availability, API credentials and subscription access. MCP and plugin formats differ across clients; do not copy credentials or pretend a Codex-only tool exists in another host. Clerk and Maestro remain excluded. Other worktrees may require skill-link propagation. Machine-local links require repair after moving to another machine or changing cached plugin versions.

## Full inventory (ADR 0008)

The user subsequently requested the full installed inventory in seven agents. Global skill directories now expose shared packages; 24 MCP entries use the shared launcher in `~/.local/share/agent-capabilities/`. Native plugin compatibility and account authentication still vary by host. This broadens the selected subset described above; Clerk and Maestro remain excluded. See accepted [ADR 0008](../adr/0008-share-installed-agent-capability-inventory.md).
