# runtime

Composition boundary that supplies ports to features.

`devFlag.ts` is the single release-hygiene gate for developer-only routes and runtime controls. It is enabled
only by `__DEV__` or an explicit `EXPO_PUBLIC_DEV_MENU=1` build environment value.

Identity binding is composed here: `domain/identity` holds the order and P2-T17's `IdentityBridge`
mounts it, so every session change — including the anonymous one at first launch — identifies the
subscription SDK before analytics.

`requestFailureMessage` centralizes offline-first error selection for network-backed screens and falls back to
the ordinary error when reachability itself cannot be determined.
