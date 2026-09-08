# runtime

Composition boundary that supplies ports to features.

Identity binding is composed here: `domain/identity` holds the order and P2-T17's `IdentityBridge`
mounts it, so every session change — including the anonymous one at first launch — identifies the
subscription SDK before analytics.

`requestFailureMessage` centralizes offline-first error selection for network-backed screens and falls back to
the ordinary error when reachability itself cannot be determined.
