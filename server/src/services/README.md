# Services

Contract: hides shallow server orchestration such as jobs and analytics. Invariants: each service exposes
one concern and emits only analytics events owned by the server.

Fixtures: clock and analytics cases arrive with the first service test. Test with
`npm run test:server` from the repository root.
