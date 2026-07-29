# ScreenTime

ScreenTime is the app-facing seam for iOS authorization, the system app/category
picker, shield reconciliation, and concrete lock-window registration. Phase 2
uses a persistent mock. Phase 3 replaces that adapter with
FamilyControls/ManagedSettings/DeviceActivity without changing callers.

## Interface

Callers import only `index.ts` and obtain the adapter through
`getScreenTimeModule()`. The interface exposes:

- Screen Time authorization status and request (`notDetermined | approved |
  denied`).
- the system picker, returning an opaque `ScreenTimeSelectionHandle`;
- one idempotent `reconcile(selection, desiredOsState)` operation that applies
  or clears shields from the `DesiredOsState` computed by `@excerlock/ledger`;
- concrete lock windows with `[startsAtMs, endsAtMs)` boundaries;
- a current shield-state snapshot and change subscription.

The module never calculates balance, Full Lock, holidays, or drain thresholds.
Those decisions belong to Ledger; this module consumes its exported
`DesiredOsState` type exactly.

## Opaque-handle law

`ScreenTimeSelectionHandle` is an opaque token for the user's selected apps and
categories. It must never contain, expose, log, or derive raw bundle IDs or app
names. Apple does not reveal those identifiers through FamilyControls. Only a
ScreenTime adapter may create or persist a handle; callers may only retain it
and pass it back to this interface.

## Mock and clock

`MockScreenTimeModule` mirrors SignalKit's fixture-provider seam: it implements
the production interface and adds deterministic driver controls only for its
own tests. Its clock is injected; scheduling logic never reads `Date.now()`.
State persists under a versioned AsyncStorage key using the same Zustand
persistence pattern as settings. Observable state is emitted only when the
shield snapshot changes, so idempotent reconciliation does not cause spurious
renders.

The mock class is deliberately not exported from `index.ts`. No app module may
import it directly. `getScreenTimeModule()` is the single Phase-3 swap point and
returns the mock today.

## Invariants

- Lock windows are concrete local wall-clock millisecond intervals and are
  active at the start boundary, inactive at the end boundary.
- With no scheduled windows, Ledger's desired state applies all day. Once
  windows exist, shields are clear outside every active window.
- Repeating an authorization request, reconciliation, or schedule registration
  with the same state is a no-op.
- Persisted data is validated before it crosses the interface.

## Test

From the repository root:

```sh
npm run test:app -- --runTestsByPath src/screentime/__tests__/MockScreenTimeModule.test.ts
```
