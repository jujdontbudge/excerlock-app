# ExcerLock service CLIs

Verified 2026-09-08. Use ordinary shell CLIs on demand; no new MCP servers or skill catalogs are enabled. Binary installation and authenticated service access are separate checks.

| Service | CLI / installed version | Use |
|---|---|---|
| Supabase | `supabase` 2.117.0 | Auth project administration, migrations, types and edge functions |
| Azure VPS | `az` 2.90.0; system `ssh`; `rsync` 3.5.0 | VM inspection/provisioning; deployed Fastify API uses SSH + rsync + systemd + Caddy |
| Sentry inspection | `sentry` 0.44.1 | Read issues/events, logs and service API |
| Sentry build artifacts | `sentry-cli` 3.7.0 | Sourcemaps, debug symbols and release artifact workflows |
| PostHog | `posthog-cli` 0.18.1 | Analytics/API queries, flags and artifact workflows |
| Resend | `resend` 2.19.1 | Email, domains and delivery diagnostics on explicit email tasks |
| Expo cloud | `eas` 23.2.0 | EAS build/update/submit workflows |
| Adapty | `adapty` 0.8.3 | Paywalls, products, placements and subscription configuration |
| App Store Connect | `asc` 5.1.0 | App Store/TestFlight workflows; see app-store-connect.md |
| GitHub | `gh` 2.100.0 | Repository, issue, PR and CI operations |

Use the project's installed Expo CLI and Drizzle Kit through workspace package scripts. Do not globally upgrade Expo/React Native or database tooling separately from their compatible app dependencies. Vercel was not found in this checkout's deployment configuration. Docker is not the production deployment path.

## Resend

Official CLI: `resend-cli` (npm), executable `resend`. Start with `resend --help` and the relevant command help. Authenticate with `resend login` or an existing `RESEND_API_KEY` environment variable; never store API keys in repository files. Installation does not configure application email sending or a verified sending domain. Send emails or broadcasts only when the user explicitly authorizes the message and recipients. No test email is needed to verify installation. Documentation: https://resend.com/docs/cli

## Command discovery

- All tools: start with `<tool> --help` and inspect the specific subcommand.
- Sentry: `sentry auth status`, `sentry issue --help`; existing `sentry-cli` auth does not prove new `sentry` auth.
- PostHog: `posthog-cli api search <topic>`, then `info <tool>` and `schema <tool> <field>` as needed; `call --dry-run` before a requested mutation. The CLI supplies schemas on demand, so a loaded MCP server is unnecessary. Match a guide to the task instead of installing every available skill.
- Azure: `az vm get-instance-view -g excerlock -n excerlock-api`; deployment procedure remains in `deploy/README.md`.
- Auth: `sentry auth`, `posthog-cli login`, `supabase login`, `eas login`, `adapty auth login` only as needed. Never print or commit credential values.

## Verified access and limits

Supabase project listing and EAS identity reads succeeded; GitHub auth status succeeded; Adapty local auth is configured. New Sentry and PostHog CLIs need login.

Azure VM `excerlock-api` was **deallocated** and the selected subscription **Disabled**. SSH timed out. These are observed external states, not caused by CLI installation. No VM start, subscription/billing change, server package upgrade or deployment was performed. Recheck before future operations.

## Maintenance

Homebrew owns Supabase, Azure CLI, gh, rsync, asc and getsentry/tools/sentry-cli. The npm tools in this setup use `/usr/local`: `npm install --global --prefix /usr/local <package>@<verified-version>`. The default npm prefix on this machine differs, so always verify `command -v` after updating.

`~/.local/bin/rsync` points at `/opt/homebrew/bin/rsync` so the current Homebrew binary wins over Apple's older compatibility implementation. Removing that symlink restores previous PATH resolution. Other Homebrew binaries/dependencies upgraded by the package manager are retained in their prior kegs where available because install cleanup was disabled.

Official references: [Supabase](https://supabase.com/docs/guides/local-development/cli/getting-started), [Azure](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-macos), [Sentry](https://cli.sentry.dev/getting-started/), [PostHog](https://posthog.com/docs/cli), [Expo](https://docs.expo.dev/build/setup/), [Adapty](https://github.com/adaptyteam/adapty-cli), [Clerk](https://clerk.com/docs/cli).
