# ScreenTimeProvider

Contract: the read-only side of device activity—event history and monitor callbacks. Imperative shield
writes remain exclusively in ShieldController.

Fixtures planned: tick ladders, callback jitter, and re-arm races. Test with
`npm run test --workspace app -- signals/screentime`.
