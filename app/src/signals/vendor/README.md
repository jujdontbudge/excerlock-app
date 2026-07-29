# VendorProvider

Contract: fetches normalized today-only vendor activity through the server proxy. Raw payloads are not
persisted, and earning is evaluated on-device.

`FixtureVendorProvider` consumes `vendor.activityAvailable`, `vendor.connectionChanged`, and
`vendor.rateLimited`. Recorded scrubbed JSON is held only in the in-memory fixture provider and exposed
through `fetchToday`; production normalization remains the server proxy's responsibility.

Canonical fixtures cover Strava recorded/manual/trainer activities, Whoop `PENDING_SCORE`, Polar's
missing manual flag, Oura daily activity, and the all-disconnected baseline. Test with
`npm run test --workspace app -- signals/vendor`.
