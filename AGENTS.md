# ExcerLock

- Canonical source: `main` in `JohanSardar/excerlock-app`; the shipping iOS app is `app-next/`. Local checkouts and agent worktrees may live anywhere. Integrate completed task work into `main`. See `docs/agents/operations.md` for release scope and coordination.

- Product: `excerlock-app-prd.md`; domain: `CONTEXT.md`. Read only docs relevant to the task.
- Before creating visual assets, follow `design/STYLE.md`; ask if no defined style family fits.
- UI: read `design/UI-STYLE.md` before making or changing any screen or component and follow it. Depart from it only when Johan deliberately asks for something that contradicts it; say that you are doing so.
- For Expo API/native/dependency/build changes, consult official docs matching the installed version. Run affected checks and fix introduced regressions.
- Read relevant `docs/adr/` records before architectural changes. Record core decisions, rationale and project state using `docs/adr/TEMPLATE.md`; preserve superseded records.
- API server (`server/`) deploys to `api.excerlock.com`: follow `deploy/README.md` (current host, `deploy/deploy.sh`, migrations, health/ready proof).
- Releases: follow `docs/agents/operations.md`; wrap the entire authorized merge-to-health-check sequence in `python3 scripts/agent-ops.py run -- <command>`. If busy, stop and revalidate later. The lock does not authorize release.
- Claim your worktree with `scripts/agent-ops.py claim`; finish only your committed completed work with the correct base ref. Follow the operations guide; never force cleanup.
- App Store screenshots: `app-store-screenshots/README.md` (HTML outline → GPT Image edits via `gen.py`; the approved publish set is `app-store-screenshots/finals/`).
- Issues: `JohanSardar/excerlock-app` via `gh`; details in `docs/agents/issue-tracker.md`.
- Agent context configuration and opt-in tools: `docs/agents/context.md`.

- Service tooling: use `supabase`, `az` + SSH/rsync, `sentry`/`sentry-cli`, `posthog-cli`, `resend`, `eas`, `adapty`, `asc` and `gh` as appropriate. Read `docs/agents/service-cli.md` only for service/deployment tasks; discover commands with `--help`.

## Verification loop (standing — do not wait to be told)

Purely visual UI work—copy, spacing, typography, color, imagery, layout, cosmetic animation, and other presentation-only changes that do not alter behavior—does not require E2E. Inspect the affected screen on a simulator/device and capture one screenshot. Interactive Studio/iteration work intended only to open a screen and receive feedback is likewise not release-grade E2E.

New features and changes to business logic, state transitions, navigation or interaction behavior, persistence, native behavior, backend behavior, APIs, or other interface contracts require a failing test first, the applicable focused tests and code checks, and real-screen E2E before TestFlight. E2E must assert the visible result and the server/API effect where applicable; follow `app-next/e2e-next/README.md` and the existing CI gates (`.github/workflows/ci.yml`). Preserve the ban on Maestro, Detox, and additional iOS drivers.

No changed user-facing behavior reaches TestFlight without a simulated user exercising it and asserting the visible result. Loop until verification passes; never treat `BLOCKED` as `PASS`.

Short citations (why this is encoded as law, not a prompt): [Claude Code verification loops](https://claude.com/blog/building-verification-loops-in-claude-code-with-skills) / [Stop hooks](https://docs.claude.com/en/docs/claude-code/hooks#stop); [Cursor test-generation loop](https://cursor.com/for/test-generation); [Spotify Honk hidden verifiers](https://engineering.atspotify.com/2025/12/feedback-loops-background-coding-agents-part-3); [Devin computer-use + assertions before click](https://cognition.ai/blog/testing-development); [Maestro MCP](https://maestro.dev/mcp) (agentic UI-test pattern; not used here); [Ken Imoto PreToolUse TDD hook](https://kenimoto.dev/blog/claude-code-tdd-test-after-code-six-of-ten/). On X/Grok: write the verifier first so proof sits outside the agent's narration; an external oracle is the score, not the transcript.

## On-demand skills

Read the matching skill before the relevant task; do not preload all guides. Follow its relevant references only.

- `react-native-best-practices` — React Native architecture, rendering or native integration: `/Users/johansardar/.agents/skills/react-native-best-practices/SKILL.md`.
- `opensrc` — Dependency behavior, bugs or proposed workarounds: `/Users/johansardar/.codex/plugins/cache/johan-skills/johan-skills/1.0.1/skills/opensrc/SKILL.md`.
- `log-pitfall` — A diagnosed cross-app iOS pitfall; follow the global ledger rule: `/Users/johansardar/.codex/plugins/cache/johan-skills/johan-skills/1.0.1/skills/log-pitfall/SKILL.md`.
- `adapty-sdk-integration` — Adapty subscriptions, identity and paywalls: `/Users/johansardar/ExcerLock/.agents/skills/adapty-sdk-integration/SKILL.md`.
- `mobile-app-ui-design` — Mobile screens, flows, components and UI improvements; follow the existing ExcerLock design system over generic style prescriptions: `/Users/johansardar/.codex/plugins/cache/johan-skills/johan-skills/1.0.1/skills/mobile-app-ui-design/SKILL.md`.
- `excerlock-visual-design` — Every substantive ExcerLock visual-design task; automatically use GPT Image 2.5 Sunburst at low quality to spice up the design: `.agents/skills/excerlock-visual-design/SKILL.md`.
- `asc-cli-usage` — App Store Connect, TestFlight, builds, signing and releases via the installed `asc` CLI: `/Users/johansardar/.agents/skills/asc-cli-usage/SKILL.md`. Check installed command help; see `docs/agents/app-store-connect.md`.

<!-- agent-web:start -->
## Web extraction
For known web URLs, prefer `/Users/johansardar/.local/bin/agent-web` over generic WebFetch: Readability for articles/docs, Crawl4AI for JavaScript, yt-dlp for video/subtitles, gallery-dl for social images/posts, PyMuPDF for PDFs. Read `/Users/johansardar/.local/share/agent-web/GUIDE.md` on demand. Keep search for discovery/citations and APIs or direct structured fetch when better. Verify completeness; retain browser/fetch fallback and obey host tool rules.
<!-- agent-web:end -->

<!-- agent-ios:start -->
For iOS/Xcode/TestFlight work, read /Users/johansardar/.local/share/agent-ios/GUIDE.md on demand. Prefer installed CLIs: asc xcode/build/test/archive/export and asc TestFlight workflows, native xcodebuild, xcrun simctl/devicectl/xcresulttool, and idb. Discover actual schemes/destinations; verify builds, tests and runtime behavior. Keep simulator work headless, obey repo release locks and the Maestro ban. Keep Xcode/TestFlight skills available; no extra MCP needed.
<!-- agent-ios:end -->

<!-- excerlock-shared-skills:start -->
Pi and Hermes discover the kept skills in `.agents/skills/`: opensrc, Adapty integration, mobile UI design, React Native, iOS pitfall logging, image generation and Xcode/TestFlight/signing/release diagnostics. Load only the relevant skill body. Image skills provide guidance, not credentials or a Codex image tool: check the current host capability and follow the skill's fallback requirements; never assume a ChatGPT subscription supplies image API access. Web extraction and service CLIs use the on-demand guides above.
<!-- excerlock-shared-skills:end -->

## Text color

- UI text must not be orange, except the single hero metric on a screen and one emphasis word inside an onboarding headline. Use neutral primary/secondary text on light surfaces and white text on orange fills; orange remains available for backgrounds, icons and non-text indicators.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
