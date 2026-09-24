# Service CLIs

Use these CLIs instead of MCP servers. Start with `<tool> --help`. An installed CLI is not proof of login, so check auth before relying on it. Log in only when needed, and never print or commit credential values. Versions were verified on 2026-09-24.

| Service | CLI | Use |
|---|---|---|
| Supabase | `supabase` 2.117 | Auth project settings, JWT/JWKS, CLI admin |
| Sentry | `sentry` 0.44 (issues, events, logs); `sentry-cli` 3.7 (sourcemaps, dSYMs, releases) | Errors and diagnostics |
| PostHog | `posthog-cli` 0.18 | Queries and flags: `posthog-cli api search <topic>`, then `info`, `schema`, and `call --dry-run` before any mutation |
| Expo | `eas` 23.2 | Builds, updates, submit. Run the project's Expo CLI through workspace scripts |
| Adapty | `adapty` 0.8 | Paywalls, products, placements, entitlements |
| App Store Connect | `asc` 5.4 | TestFlight and App Store: use the `asc` skill |
| Resend | `resend` 2.19 | Email and domain diagnostics; send only with explicit authorization |
| Google Cloud | `gcloud` 583 | Production VM `excerlock-api` (`us-central1-a`); procedures live in `deploy/README.md` |
| GitHub | `gh` 2.100 | Issues, PRs, CI: `docs/agents/issue-tracker.md` |

Auth commands, run only when needed: `supabase login`, `sentry auth login`, `posthog-cli login`, `eas login`, `adapty auth login`, `gcloud auth login`, `gh auth login`.

Update tooling through its installer (Homebrew for supabase, gh, asc, sentry-cli and gcloud; `npm install --global --prefix /usr/local` for the npm CLIs) and re-check `command -v` afterwards. Keep Expo, React Native and Drizzle at the versions the workspace pins.
