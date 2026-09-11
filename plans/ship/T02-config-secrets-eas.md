# T02 — `app.config.ts`, secrets, EAS profiles

Facts: `research/infra-audit.md` §6–§7. Blocks T03/04/05/06.

## Steps

1. Port `app/app.config.ts` pattern: `CLIENT_ENV_NAMES` resolved `process.env` (EAS secrets) → `~/.excerlock/env`
   fallback; surface under `extra.client*`; fail the build (not the app) when a required key is missing on
   `preview`/`production`. Keys: `EXPO_PUBLIC_ADAPTY_KEY`, `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`,
   `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (build-time only), `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
   `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
2. `environment` derived from the EAS build profile (`dev|preview|prod`) and exposed as `extra.environment`;
   never from `__DEV__` alone (ledger: `expoGoConfig !== null` misclassifies embedded Release builds).
3. `eas.json` per `03-ota-and-release.md` §1; `eas secret:push` from `~/.excerlock/env` via `scripts/eas-secrets.ts`.
4. Port `scripts/check-env.ts` (live-pings every vendor) and run it in CI.
5. Delete every `EXPO_PUBLIC_RUNTIME` read; the runtime kind comes from `extra.environment` + `__DEV__` only
   (ledger: `EXPO_PUBLIC_*` overrides poison tests).

## Tests first

- `src/runtime/__tests__/config.test.ts`: missing key on `production` throws at config time; `environment`
  matches the profile; test runtime never reads a real key.

## Acceptance

- [ ] `eas build --profile preview` has every key; `check-env` green in CI.
- [ ] No secret in git (`git grep -E 'public_live_|sk_|eyJ'` empty).
