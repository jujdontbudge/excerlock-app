# Analytics runtime

One PostHog instance is configured with lifecycle capture, replay, surveys,
error capture and flag preloading disabled. Canonical identity readiness and
the analytics opt-in getter gate capture, screens and exposures. `identify`
primes the SDK device id and super-properties before PostHog's implicit flag
reload. Flag reads never expose; mounted surfaces call `flags.expose` once.
Composition should give paywall callers `createPaywallExperimentPort(flags)`,
whose narrow API is `getPaywallVariant()` plus
`trackPaywallVariantExposure(...)`. The latter validates the settled variant
and canonical generation, and must be called only when the real paywall mounts.

The SDK boundary deliberately requires `clearPendingQueues()`: PostHog React
Native 4.61 preserves its event and logs queues across `reset()`. Composition
must clear those persisted queues before delegating to SDK reset so a previous
account's events cannot be sent under the next identity.

`setWalkPlaces` is the typed person-property seam for
`walk_places_updated`. It accepts only the `WalkPlaces` enum, revalidates the
originating canonical identity after registration, and delegates to the SDK's
documented `setPersonProperties(..., false)` behavior without reloading a
flag underneath a mounted surface.

The first mounted surface settles within two seconds and keeps that assignment
for its identity generation. Unknown values use control/false. Client code
never emits purchase/trial/subscription lifecycle events; Adapty is their sole
emitter.
