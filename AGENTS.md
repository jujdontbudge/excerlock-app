<claude-mem-context>
# Memory Context

# [ExcerLock] recent context, 2026-08-23 11:04pm EDT

No previous sessions found.
</claude-mem-context>

# ExcerLock — agent rules

## Building (non-negotiable)

**Any agent building anything Expo/React Native in this repo MUST use the Expo MCP server** (`mcp.expo.dev` — configured in both Claude Code and `~/.codex/config.toml`) for docs lookups, library adds, builds, and workflows — never guess Expo APIs from memory and never scrape docs via browser. Development is TDD: test first, deep modules, code an agent can read and navigate (small files, one responsibility, README per module).

## Visual assets (icons, illustrations, banners, mockups, any image/video)

**Before creating ANY visual asset, read `design/STYLE.md` and follow it exactly.** It defines the four allowed style families (clay hero / white glyph / painted banner / full-screen mockup), the proven prompt templates, the magenta→chroma-key pipeline, validation gates, and the manifest law. Assets produced outside that framework are rejected regardless of quality. If an asset doesn't fit a family, ask Johan instead of inventing a new style.

## Spec

The product spec is `excerlock-app-prd.md` (root). UI build spec for the prototype: `docs/codex-dashboard-ui-build-spec.md`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `JohanSardar/excerlock-app` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root (created lazily — proceed silently while they don't exist). See `docs/agents/domain.md`.

<!-- BEGIN AGENT-TOOLING (managed by /setup-agent-tooling; edit TOOLING.md, not this block) -->
Tool routing for this repo: read `TOOLING.md` before reaching for any external service — it names the CLI/MCP/skill that owns each job (App Store, builds, posting, analytics, VPS).
If a tool errors or is missing: `python3 ~/.claude/agent-tooling/doctor.py --repo .` fixes or names the fix. The fallback for every dashboard is its CLI, per TOOLING.md.
<!-- END AGENT-TOOLING -->
