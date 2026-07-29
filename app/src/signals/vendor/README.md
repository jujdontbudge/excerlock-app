# VendorProvider

Contract: fetches normalized today-only vendor activity through the server proxy. Raw payloads are not
persisted, and earning is evaluated on-device.

Fixtures planned: all Tier-1 vendors, including manual/trainer activities and incomplete score cases.
Test with `npm run test --workspace app -- signals/vendor`.
