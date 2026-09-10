# Fixture timeline player

`TimelinePlayer` is SignalKit's single virtual-clock implementation. It loads a named, versioned
fixture manifest, validates the universal `{atMs, event, payload}` rows, applies history (`atMs <= 0`)
synchronously, and emits future rows in manifest order.

Manual playback advances only through explicit `advanceBy`/`advanceTo` calls. Auto playback converts
virtual delays through the configured speed. Providers validate their own payloads and consume emitted
rows; the player owns no signal-domain behavior.

Test with `npm run test --workspace app -- signals/timeline`.
