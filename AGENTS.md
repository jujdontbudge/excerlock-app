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
| `tools/excer/` | The `./excer` CLI. |
| `tools/` | Research recorders and image generation. Not shipped. |

## Verify

`./excer` is the control and verification CLI; `./excer --help` lists commands.

1. `./excer check` must pass: typecheck, lint, repository invariants, and ratchets that only go down. There are no tests by design (`ARCHITECTURE.md` rule 7).
2. For a behavior or UI change, follow the `verify-excerlock` skill. Find the feature (`./excer feature show <id>`), drive it (`./excer demo <scenario> --open <route>`), and run only the changed proof with `./excer prove <feature> --proof <name>`. Add or update its proof block when visible behavior changes. Full feature suites and cross-feature sweeps require the user's explicit request. After integration, run `./excer check` and focused changed proofs; do not silently rerun every feature touched by the merged branches. Timebox simulator verification to five minutes per proof, show progress, and report a stalled proof as blocked instead of extending the run.
3. For a server change, run the server locally, confirm `./excer server ready`, and assert the route's effect in the database.
4. Say exactly what you verified, with the evidence path. Report blocked verification as blocked.

## iOS simulator

Work headless. Keep Simulator.app closed. `./excer sim` drives one simulator (`ExcerLock-Next` by default, or `EXCER_SIM`) through `xcrun simctl` and `idb`, and starts that simulator's `idb_companion` when needed. Metro serves on `EXCER_METRO_PORT` (default 8091). Reuse the installed app or an existing build. Build only when the binary is missing or native code changed, and keep caches. Shut down only simulators you booted. Headless Xcode commands: `~/.local/share/agent-ios/GUIDE.md`.

`ExcerLock-Next` on port 8091 belongs to the lead session in the main checkout, where the user watches it. Workers never use it.

### Spawning workers

Every spawned worker gets its own worktree, its own simulator and its own Metro port. Two agents never share a checkout or a simulator.

1. Each worker runs in its own bb worktree off `main`, created when the lead spawns it in step 4. bb runs `.bb-env-setup.sh` (`npm ci`) in the new worktree automatically.
2. Before spawning, give the worker a simulator `ExcerLock-<task>` in the hidden worker set, never the default set (`S=~/.local/share/excer/worker-simulators`). Take the fastest path. First reuse a shut-down simulator from `xcrun simctl --set $S list devices`: rename it (`xcrun simctl --set $S rename <udid> ExcerLock-<task>`) and boot it headless (`xcrun simctl --set $S boot <udid>`). It is already slimmed and already has the app, so skip install unless the existing build is newer than the one on it. Only when none is free, create one (`xcrun simctl --set $S create ExcerLock-<task> com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro <runtime>`), boot it headless, slim it with `simslim --set $S on <udid> --except family` (keeps Screen Time; about 1 GB idle instead of about 4.5 GB), and install the existing build (`EXCER_SIM=<udid> ./excer sim install`). Do not rebuild for it; build only when native code changed. Simulators in the default set appear in bb's Xcode panel and Simulator.app; the user sees only `ExcerLock-Next` unless they ask to watch a worker. `./excer` finds worker simulators by name and refuses to run a worktree against any simulator outside the worker set. Raw `simctl` calls on a worker simulator need `--set $S`.
3. Pick a free Metro port from 8092 upward, unique among running workers.
4. Write the brief to a file, not inline, and spawn the worker with `bb thread spawn --project proj_zg4erm5r23 --parent-self --new-environment worktree --base-branch main --title "<task>" --prompt-file <brief.md>`. bb spawn cannot set environment variables, so repeat both values in its brief, `EXCER_SIM=ExcerLock-<task>` and `EXCER_METRO_PORT=<port>`, and the worker prefixes its `./excer` commands with them. The brief also tells the worker to run `mkdir -p .excer && echo ExcerLock-<task> > .excer/worker-sim` first, so teardown can find its simulator.
5. On a fresh simulator the first deep link asks "Open in ExcerLock?" and the dev menu appears; tap Open, then Continue and Close.
6. Supervise with `bb thread wait <id>`, `bb thread show <id> --git-diff` and `bb thread tell <id> --message-file <f>`. The lead reviews and merges; workers never do. Keep at most five worker simulators on this 24 GB Mac, and reuse them instead of creating more. When a worker finishes, archive its thread (`bb thread archive <id>`); bb then runs `.bb-env-teardown.sh`, which shuts its simulator down and keeps it for the next worker. Delete a simulator (`xcrun simctl --set ~/.local/share/excer/worker-simulators delete <udid>`) only when it is broken or the set holds more than five.

A worker commits only to its own worktree branch. It never pushes, merges or touches another checkout.

For builds, prefer the `xcode_build` tool. Take keys from the Env Catalog (`env_get`, or `env_request` when one is missing); never ask for them in chat.

## UI

Read `app-next/src/packages/ui/UI-STYLE.md` before touching a screen. Take every value from `app-next/src/packages/ui/tokens.ts`, and reuse the `ui` components. Screens are light orange-to-ivory gradients with black-outlined white cards. Motion goes through the `ui` motion hooks (`useMotion`, `Reveal`, `presets`).

## Authority

These need the user's explicit go-ahead in the current conversation: pushing, merging to `main`, deploying the server, publishing an OTA update, uploading to TestFlight, submitting to App Review, sending email, and changing production data or third-party dashboards. `main` in `JohanSardar/excerlock-app` is the release source. Run authorized releases under the release lock described in `docs/agents/operations.md`. Leave other agents' uncommitted work untouched.

## Production

The API runs on Google Compute Engine: instance `excerlock-api` in `us-central1-a` (Debian, Node, local PostgreSQL, systemd, Caddy). Read `deploy/README.md` before touching it, and deploy only through `deploy/deploy.sh`, dry run first. After a deploy, check both `/v1/health` and `/v1/ready`, locally and at the public URL.

## Privacy and secrets

Keep health, location, step, gym and Screen Time details out of analytics, logs and the server. Keep credentials out of the repository. Refer to secrets by variable name only; never print `/etc/excerlock/env` or `~/.excerlock/env`.

## Services

Use the vendor CLIs listed in `docs/agents/services.md` (Supabase, Sentry, PostHog, EAS, Adapty, `asc`, Resend, `gcloud`, `gh`). Having a CLI installed does not mean you are logged in; check first. Issues and PRs: `docs/agents/issue-tracker.md`. For a known URL use `~/.local/bin/agent-web`. When docs and types do not explain a dependency's behavior, read its source in `node_modules`.

## Skills

`.agents/skills/` holds this repo's skills (`.claude/skills` links to it): `verify-excerlock` for proving changes, `asc` for App Store Connect, `react-native-best-practices` for Reanimated, gestures, SVG and worklets, and `screensdesign-data` for app and UI research.
