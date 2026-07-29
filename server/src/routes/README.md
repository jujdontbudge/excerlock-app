# Routes

Contract: owns and hides the `/v1/*` HTTP transport for health, support, user, and vendor endpoints.
Invariants: handlers translate transport data and delegate; they contain no vendor or ledger rules.

Fixtures: request/response cases arrive with the first route test. Test with
`npm run test:server` from the repository root.
