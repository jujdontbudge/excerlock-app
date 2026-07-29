# Architecture guardrails

These seven Vitest files walk repository source/configuration and enforce the boundaries approved in
`ARCHITECTURE.md` §5. They run with `npm run test:guardrails` and are CI-blocking.

Native checks activate from declared dependencies and target configuration. This lets the Phase 0
scaffold stay green while still failing immediately when HealthKit, RNDA, analytics events, or an App
Intents target is introduced without its required generated wiring.
