# Server test support

Contract: hides shared repository-test support. Invariants: fixtures contain
no production behavior, migrations are the source of test schema truth, and
database doubles respond only at the external driver seam.

Fixtures: `postgresJsTestDatabase.ts` records statements, parameters, and
transaction entry for narrow SQL-generation and failure-injection tests.
`pgliteTestDatabase.ts` executes repository behavior against an in-memory
Postgres instance migrated from `server/drizzle`; its `reset` method truncates
all repository tables between tests. Run all consumers with
`npm run test:server` from the repository root.
