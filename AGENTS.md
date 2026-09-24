# ExcerLock

ExcerLock is an iOS app: people set Conditions (walk, go to the gym) that must be met before their distracting apps unlock. Screen Time enforces the lock on-device.

- Product words: `CONTEXT.md`. Use them in code, copy, commits and replies.
- Code shape and import rules: `ARCHITECTURE.md`. Read it before adding or moving code.
- Decisions: `docs/adr/`. Read the relevant ADR before changing a decided area; record new core decisions from `docs/adr/TEMPLATE.md`.

## Layout

| Path | What |
|---|---|
| `app-next/` | The shipping app: Expo SDK 57, React Native 0.86, Expo Router, Swift targets and modules. |
| `server/` | Fastify API at `https://api.excerlock.com`: identity, subscription webhooks, support and incidents. Earning and lock logic stay on-device. |
| `packages/` | Shared workspace packages: `analytics-events`, `eslint-plugin-excerlock`. |
| `deploy/` | Production VM, Caddy and the deploy script. |
| `tools/` | Research recorders and image generation. Not shipped. |

## Verify

1. `npm run typecheck` and `npm run lint --workspace app-next` from the repo root. The repo has no tests by design (`ARCHITECTURE.md` rule 7).
2. Behavior or UI change: run the app on a simulator, reach the screen the way a user would, and capture a screenshot.
3. Server change: exercise the route locally and assert its effect in the database.
4. Say exactly what you verified. Report blocked verification as blocked.

## iOS simulator

Work headless. Keep Simulator.app closed and drive everything with `xcrun simctl` (boot, install, launch, screenshot) and `idb` (accessibility taps and text). Reuse the installed app or an existing build. Build only when the binary is missing or native code changed, and keep caches. Discover schemes and simulator IDs rather than guessing them. Shut down only simulators you booted. Headless Xcode commands: `~/.local/share/agent-ios/GUIDE.md`.

## UI

Read `app-next/src/design-system/UI-STYLE.md` before touching a screen. Take every value from `app-next/src/design-system/tokens.ts`, and reuse the design-system components. Screens are light orange-to-ivory gradients with black-outlined white cards. Motion goes through `app-next/src/motion`.

## Authority

These need the user's explicit go-ahead in the current conversation: pushing, merging to `main`, deploying the server, publishing an OTA update, uploading to TestFlight, submitting to App Review, sending email, and changing production data or third-party dashboards. `main` in `JohanSardar/excerlock-app` is the release source. Run authorized releases under the release lock described in `docs/agents/operations.md`. Leave other agents' uncommitted work untouched.

## Production

The API runs on Google Compute Engine: instance `excerlock-api` in `us-central1-a` (Debian, Node, local PostgreSQL, systemd, Caddy). Read `deploy/README.md` before touching it, and deploy only through `deploy/deploy.sh`, dry run first. After a deploy, check both `/v1/health` and `/v1/ready`, locally and at the public URL.

## Privacy and secrets

Keep health, location, step, gym and Screen Time details out of analytics, logs and the server. Keep credentials out of the repository. Refer to secrets by variable name only; never print `/etc/excerlock/env` or `~/.excerlock/env`.

## Services

Use the vendor CLIs listed in `docs/agents/services.md` (Supabase, Sentry, PostHog, EAS, Adapty, `asc`, Resend, `gcloud`, `gh`). Having a CLI installed does not mean you are logged in; check first. Issues and PRs: `docs/agents/issue-tracker.md`. For a known URL use `~/.local/bin/agent-web`. When docs and types do not explain a dependency's behavior, read its source in `node_modules`.

## Skills

`.agents/skills/` holds this repo's skills (`.claude/skills` links to it): `asc` for App Store Connect, `react-native-best-practices` for Reanimated, gestures, SVG and worklets, and `screensdesign-data` for app and UI research.
