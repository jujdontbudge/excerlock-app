# ExcerLock

- Product: `excerlock-app-prd.md`; domain: `CONTEXT.md`. Read only docs relevant to the task.
- Before creating visual assets, follow `design/STYLE.md`; ask if no defined style family fits.
- UI: read `design/UI-STYLE.md` before making or changing any screen or component and follow it. Depart from it only when Johan deliberately asks for something that contradicts it; say that you are doing so.
- For Expo API/native/dependency/build changes, consult official docs matching the installed version. Run affected checks and fix introduced regressions.
- Read relevant `docs/adr/` records before architectural changes. Record core decisions, rationale and project state using `docs/adr/TEMPLATE.md`; preserve superseded records.
- Releases: follow `docs/agents/operations.md`; wrap the entire authorized merge-to-health-check sequence in `python3 scripts/agent-ops.py run -- <command>`. If busy, stop and revalidate later. The lock does not authorize release.
- Agent context configuration and opt-in tools: `docs/agents/context.md`.

- Service tooling: use `supabase`, `az` + SSH/rsync, `sentry`/`sentry-cli`, `posthog-cli`, `resend`, `eas`, `adapty`, `asc` and `gh` as appropriate. Read `docs/agents/service-cli.md` only for service/deployment tasks; discover commands with `--help`.

## On-demand skills

Read the matching skill before the relevant task; do not preload all guides. Follow its relevant references only.

- `react-native-best-practices` — React Native architecture, rendering or native integration: `/Users/johansardar/.agents/skills/react-native-best-practices/SKILL.md`.
- `opensrc` — Dependency behavior, bugs or proposed workarounds: `/Users/johansardar/.codex/plugins/cache/johan-skills/johan-skills/1.0.1/skills/opensrc/SKILL.md`.
- `log-pitfall` — A diagnosed cross-app iOS pitfall; follow the global ledger rule: `/Users/johansardar/.codex/plugins/cache/johan-skills/johan-skills/1.0.1/skills/log-pitfall/SKILL.md`.
- `adapty-sdk-integration` — Adapty subscriptions, identity and paywalls: `/Users/johansardar/ExcerLock/.agents/skills/adapty-sdk-integration/SKILL.md`.
- `mobile-app-ui-design` — Mobile screens, flows, components and UI improvements; follow the existing ExcerLock design system over generic style prescriptions: `/Users/johansardar/.codex/plugins/cache/johan-skills/johan-skills/1.0.1/skills/mobile-app-ui-design/SKILL.md`.
- `asc-cli-usage` — App Store Connect, TestFlight, builds, signing and releases via the installed `asc` CLI: `/Users/johansardar/.agents/skills/asc-cli-usage/SKILL.md`. Check installed command help; see `docs/agents/app-store-connect.md`.

<!-- agent-web:start -->
## Web extraction
For known web URLs, prefer `/Users/johansardar/.local/bin/agent-web` over generic WebFetch: Readability for articles/docs, Crawl4AI for JavaScript, yt-dlp for video/subtitles, gallery-dl for social images/posts, PyMuPDF for PDFs. Read `/Users/johansardar/.local/share/agent-web/GUIDE.md` on demand. Keep search for discovery/citations and APIs or direct structured fetch when better. Verify completeness; retain browser/fetch fallback and obey host tool rules.
<!-- agent-web:end -->

<!-- agent-ios:start -->
For iOS/Xcode/TestFlight work, read /Users/johansardar/.local/share/agent-ios/GUIDE.md on demand. Prefer installed CLIs: asc xcode/build/test/archive/export and asc TestFlight workflows, native xcodebuild, xcrun simctl/devicectl/xcresulttool, and idb. Discover actual schemes/destinations; verify builds, tests and runtime behavior. Keep simulator work headless, obey repo release locks and the Maestro ban. Keep Xcode/TestFlight skills available; no extra MCP needed.
<!-- agent-ios:end -->

