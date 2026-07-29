# AnalyticsKit client

Contract: the typed client-owned analytics emitter. It gracefully no-ops without configuration and keeps
the development event ring buffer. Raw `capture()` calls stay behind this boundary.

Fixtures: client/no-key and ownership cases arrive with the first emitter test. Test with
`npm run test --workspace app -- analytics`.
