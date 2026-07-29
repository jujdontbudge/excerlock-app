# Server composition root

Contract: future Sentry-first instrumentation, environment, configuration, and auth files compose the
neighboring server modules. Invariants: business rules remain behind those public module boundaries.

Fixtures: none; integration fixtures belong to the called module or `server/test`. Test with
`npm run test:server` from the repository root.
