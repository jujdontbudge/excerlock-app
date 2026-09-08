# Architecture guardrails

These Vitest files walk repository source/configuration and enforce the boundaries approved in
`ARCHITECTURE.md` §5. `npm run test:guardrails` first performs a clean no-install Expo iOS prebuild, then
runs every assertion; the same command is CI-blocking.

Native checks activate from declared dependencies and target configuration. This lets the Phase 0
scaffold stay green while still failing immediately when HealthKit, RNDA, analytics events, or an App
Intents target is introduced without its required generated wiring.

`phase3-production-callers.test.ts` additionally walks the production import graph rooted at Expo Router
and requires real, public-module imports of every Phase 3 accessor to be called. Same-named local methods
do not satisfy it. This prevents a complete fixture-tested native adapter from becoming unreachable when
composition changes.

The E2E bundle gate performs two clean iOS exports and has a 180-second budget; its production-marker
elimination assertions are unchanged.

## Release guardrails (`release/`)

`guardrails/release/` holds the store-build gate for the rebuilt app: identity (decision A3), EAS profile
shape, no `aps-environment`, no developer surface, the domain coverage floor, the App Privacy manifest and
the workspace state before and after the P2-T12 rename. They need no prebuild and run first in CI via
`npm run test:release-guardrails`. `release/release-app.ts` resolves the release app as `app-next/` until
the rename and `app/` after it, so the same files hold on both sides of the cutover. The list with the
rule behind each test is `docs/release/release-guardrails.md`.
