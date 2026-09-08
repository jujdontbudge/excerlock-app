# Server composition root

Contract: instrumentation, environment, configuration, and the Supabase auth
boundary compose the neighboring server modules. Invariants: business rules
remain behind those public module boundaries, and every authenticated route
reads its subject through one accessor (`routes/authenticatedUser.ts`).

Fixtures: none; integration fixtures belong to the called module or
`server/test`. Test with `npm run test:server` from the repository root.
