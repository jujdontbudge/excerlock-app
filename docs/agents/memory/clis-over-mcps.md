---
name: clis-over-mcps
description: "Johan's standing rule (2026-09-07): use vendor CLIs, not MCP servers, for Expo, Supabase, Adapty, Google Cloud, App Store Connect, Sentry, PostHog"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a33a4ff3-5d95-4524-ab0d-7082a165ed71
  modified: 2026-09-08T04:00:17.209Z
---

Johan said "dont use mcps use clis" after the Expo/Sentry/Supabase MCP OAuth tokens kept being wiped
(see [[expo-mcp-disconnect-cause]]). Use `eas`, `supabase` (plus its Management API with the CLI's
keychain token), `adapty`, `gcloud`, `asc`, `sentry-cli`, and PostHog's API instead of the MCP tools.

**Why:** MCP OAuth sessions in this setup expire or get blanked under concurrent agents; CLIs hold
long-lived logins and are scriptable.

**How to apply:** reach for the CLI first; only fall back to an MCP if no CLI or API path exists, and say
so. Infrastructure decision the same day: Supabase is auth-only (free to 50k MAU); app data lives in our own
Postgres on a Google Compute Engine VM (free-tier e2-micro) in GCP project `excerlock`, replacing the dead
Azure for Students VM. See [[rebuild-plan-and-process]].
