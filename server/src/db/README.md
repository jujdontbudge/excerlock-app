# Database

Contract: hides the future Drizzle schema and migrations. Invariants: persistence contracts belong here;
domain calculations and raw vendor payload retention do not.

Fixtures: the PGlite harness and migration cases arrive with the first database test. Test with
`npm run test:server` from the repository root.
