# SignalKit

Contract: exposes provider interfaces for health, motion, location, screen time, and vendors. Each signal
gets a native implementation and a fixture implementation; selection happens once at the composition
root. Screens never branch on provider availability.

This module ships the interfaces, fixture implementations, shared `TimelinePlayer`, canonical JSON
fixture libraries, and JS-only `WalkVerifier`. Health and location now have Phase-3 native adapters;
their composition roots select them only in an iOS dev-client runtime and keep fixtures as the test
default. Other native implementations remain Phase 3.

Every fixture is a named, versioned manifest with sorted `{atMs, event, payload}` rows. History at or
before zero is applied synchronously. Future rows use manual clock advancement or accelerated auto
playback. Unknown event names, invalid timelines, non-JSON payloads, and unknown catalog names fail at
load.

`SIGNAL_FIXTURE_CATALOG` is the composition-root resolver for scenario fixture names across all five
domains. Test with `npm run test --workspace app -- signals` from the repository root.
