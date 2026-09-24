---
status: superseded
date: 2026-09-09
---

# 0008: Share the installed agent capability inventory

## Decision

Make all currently installed portable skills and MCP configurations available to Claude Code, Codex, Grok Build, Pi, Hermes, OpenCode and Muse Code. Preserve explicit Clerk/Maestro exclusions. Keep plugins in their supported native hosts and share portable components with other clients. This broadens ADR 0007 from a kept subset to the installed inventory at the user's explicit request.

## Context

The user requested ALL skills, MCPs and plugins in all seven clients after discovering stale lean-launcher restrictions. A machine-local inventory found 329 skill packages and 24 exportable MCP definitions. Pi needed pi-mcp-adapter. Grok accepted 11 installed plugin packages but not Claude's Swift LSP package. Client skill discovery/config checks and a live five-tool documentation MCP handshake were performed; every service's authentication was not verified.

## Consequences

More available descriptions and MCP tools can increase context and startup work. Skill files do not create missing host tools, native plugin runtimes or OAuth sessions. Two Codex-specific runtime services remain local. Shared MCP launchers reference private source snapshots rather than scattering credentials across clients. Those snapshots and skill symlinks need refresh when credentials or package paths change; this is not automatic synchronization. Existing sessions must restart. No billing or provider account changes are implied.

## References

- [0007: accepted, broadened by this record](0007-restore-kept-agent-capabilities.md)
- Machine-local inventory: `/Users/johansardar/.local/share/agent-capabilities/inventory.json`

## Amendment: prevent unsolicited authentication tabs (2026-09-09)

Enabling unauthenticated Higgsfield and SideShift transports caused repeated browser login tabs. Remove both from automatic MCP startup in all configured clients and block their names in the shared launcher so stale sessions cannot reopen login flows. Terminated the observed matching transport process. Availability must not imply automatic interactive authentication; these services require deliberate opt-in before reconnecting. The remaining shared inventory is 22 configured MCP services.

Superseded by [ADR 0044](0044-lean-cross-harness-agent-context.md).
