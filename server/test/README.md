# Server test support

Contract: hides shared integration-test support, including the future PGlite harness. Invariants: module
behavior tests remain beside source under `__tests__/`; this directory contains no production behavior.

Fixtures: PGlite lifecycle support arrives with the first database test. Run all consumers with
`npm run test:server` from the repository root.
