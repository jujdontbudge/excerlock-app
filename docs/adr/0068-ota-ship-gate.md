---
status: accepted
date: 2026-10-08
---

# 0068: Production OTA updates go through the ship gate

## Decision

`./excer ota --message "<what changed>" --publish` is the only way to publish a production OTA update. It refuses unless:

- nothing that goes into the bundle is uncommitted, and HEAD is `origin/main`;
- `./excer check --full` passes, including the `detached-methods` ratchet and the iOS release bundle export;
- the ship proofs pass on the simulator: `launch/first-launch-welcome`, `launch/subscriber-opens-home` and `launch/every-tab-opens`, which opens Home, Conditions, Analytics and Settings for a signed-in account.

It publishes under the release lock and tags `ota-runtime<version>-<date>-<sha>`. Running `eas update` for production directly is not allowed. Without `--publish` the command runs the gate only.

The dev fakes for ports whose device implementation is a class (`auth`, `subscription`) are wrapped by `classBackedPort`, which throws when a method is called detached from its port, as the device does.

## Context

Update `6d2c0115` (owner showcase data) passed `runtime.auth.subscribeIdentity` to `useSyncExternalStore` unbound. On a device `auth` is a `SupabaseAuthAdapter` class instance, so `this` was undefined, Home threw while rendering, and every account that opened Home was sent back to the Home Screen on each launch. The dev `AuthFake` is an object of closures, so the simulator showed no fault, and `./excer check` had no rule for it. The crash also never reached Sentry. The update was replaced by republishing the previous update group within the hour.

The alternatives were a Release-configuration end-to-end run of the real runtime on the simulator, which creates production accounts on every run, and type-aware lint alone, which cannot tell a safe arrow-field port (the clock) from an unsafe class method. The gate combines the lint ratchet with fakes that fail the way the device fails.

## Consequences

- A detached port method fails `./excer check`, and a render crash on any main screen fails the ship proofs, before anything is published.
- Publishing takes several minutes longer: the full check and three proofs.
- The fakes do not cover native-module failures or Release-only behaviour. A real-runtime boot test remains a follow-up.
- The existing 55 detached methods are a ratchet ceiling and should be removed over time.

## References

- `tools/excer/commands/ota.ts`, `tools/excer/checks/ratchets.ts` (`detachedMethods`), `app-next/src/packages/dev-harness/lib/fakes/classBackedPort.ts`.
- `.agents/skills/verify-excerlock/references/features/launch.md` (`every-tab-opens`).
- ADR 0067 (owner showcase data), ADR 0025 (main is the release source).
