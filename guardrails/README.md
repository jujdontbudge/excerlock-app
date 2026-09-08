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

`single-emitter.test.ts` and `client-observability.test.ts` walk `app-next` (P2-T07). The emitter walk
matches `track(` as well as `capture(`, because in `app-next` a screen names an event through
`AnalyticsPort.track()` and only `app-next/src/adapters/analytics` reaches the SDK's `capture()`. Both
shapes are checked against `@excerlock/analytics-events`, so an event emitted from the wrong side, or
under a name nobody registered, fails CI.

The E2E bundle gate performs two clean iOS exports and has a 180-second budget; its production-marker
elimination assertions are unchanged.
