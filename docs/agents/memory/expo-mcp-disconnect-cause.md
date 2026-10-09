---
name: expo-mcp-disconnect-cause
description: "Expo/Sentry/Supabase MCP OAuth tokens were being blanked by the session-start doctor hook running `claude mcp list` from many concurrent sessions; fixed 2026-09-07 by a passive keychain read"
metadata: 
  node_type: memory
  type: project
  originSessionId: a33a4ff3-5d95-4524-ab0d-7082a165ed71
  modified: 2026-09-08T03:04:15.514Z
---

The recurring "Expo MCP disconnects every few hours" was not token expiry. The SessionStart hook
`~/.claude/agent-tooling/doctor.py --hook` ran `claude mcp list`, which connects to every remote MCP server
and rewrites the shared keychain item "Claude Code-credentials". With 10+ subagents and compactions starting
at once, the concurrent rewrites raced and blanked the entry (verified 2026-09-07: expo `expiresAt` went to 0
at 21:42 CDT while the token was valid until 22:20 and no Expo call was in flight; `claude mcp list` was shown
to change the keychain item's mdat). Sentry and Supabase OAuth entries were blanked the same way.

**Why:** Johan asked twice for a genuine explanation; an earlier session claimed a fix that never existed.

**How to apply:** doctor.py now uses `mcp_token_ok()` (passive `security find-generic-password` read, plus
"header/command-configured servers count as connected"). Never run `claude mcp list|get` from hooks or
subagents. If tokens blank again, first suspect another process rewriting the keychain, not expiry. Backup of
the old file: `~/.claude/agent-tooling/doctor.py.bak-*`. Related: [[rebuild-plan-and-process]].
