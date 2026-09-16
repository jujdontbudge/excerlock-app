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

`createPostHogRuntime` is the concrete, singleton SDK factory. Its subclass
uses PostHog's public persisted queue keys plus protected storage flush hook to
clear and durably persist the event, AI, and logs queues without uploading
them. The factory applies the privacy options, exposes the adapter and distinct
ID getter, and requires disposal before another client can be created.

`setWalkPlaces` is the typed person-property seam for
`walk_places_updated`. It accepts only the `WalkPlaces` enum, revalidates the
originating canonical identity after registration, and delegates to the SDK's
documented `setPersonProperties(..., false)` behavior without reloading a
flag underneath a mounted surface.
The generic `track('walk_places_updated', ...)` path performs this mapping too,
so the UI caller cannot accidentally leave the person property stale.

The first mounted surface settles within two seconds and keeps that assignment
for its identity generation. Unknown values use control/false. Client code
never emits purchase/trial/subscription lifecycle events; Adapty is their sole
emitter.

`shield_copy` is the payload-only flag rail: `flags.getPayload('shield_copy')`
returns the live SDK payload for the current generation, waiting only for the
first flags settlement when none has happened yet, and reads with
`sendEvent: false` so remote configuration never emits an experiment exposure.
The payload crosses no trust boundary: `src/runtime/shield/` validates it
strictly (unknown causes/fields, non-string or oversized copy are rejected) and
only then hands canonical JSON to `ExcerlockEnforcementModule.setShieldCopyOverrides`,
which writes the App Group key the shield extension reads.
