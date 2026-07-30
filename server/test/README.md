# Server test support

Contract: hides shared integration-test support, including the postgres-js
execution boundary used to exercise real Drizzle SQL generation. Invariants:
fixtures contain no production behavior and database doubles respond only at
the external driver seam.

Fixtures: `postgresJsTestDatabase.ts` records statements, parameters, and
transaction entry without requiring a live Postgres process. Run all consumers
with `npm run test:server` from the repository root.
