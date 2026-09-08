# ScreenTime

The native edge for iOS authorization, the system app/category picker, shield
reconciliation and DeviceActivity monitor registration. See
[`native/README.md`](native/README.md) for the package-level details.

## What changed when this moved out of the old app (P2-T03)

The ledger and its balance economy are retired, so `DesiredOsState` is gone.
In its place:

- `reconcile(selection, shields, plan)` takes a `ShieldIntent` (`up` | `down`)
  and the `MonitorPlan` that `domain/compileMonitorPlan` produces: merged,
  absolute, non-repeating intervals, at most `LOCK_WINDOW_BUDGET`. It is the one
  re-arm routine — a rule edit, midnight, a timezone change, an entitlement
  transition and a lease renewal all come through it.
- The per-window `scheduleLockWindow` / `cancelLockWindow` / `getLockWindows`
  trio is gone. Monitor count no longer tracks rule count, and because the plan
  merges overlapping and adjacent windows, an `intervalDidEnd` can only ever
  mean "no rule is active".
- The drain ladder (`BALANCE_DRAIN_MONITOR`, the rung events) is deleted. The
  threshold helpers it used survive in `deviceActivitySchedule.ts` because the
  Analytics usage monitor (B15) needs exactly them.
- The walking lease is explicit: `armUnlockLease(selection, untilMs)` takes the
  session machine's deadline instead of being inferred from an empty ladder.
- Monitor names come from `domain/monitorPlan.monitorNameForLockWindow`, which
  hashes the interval. Nothing a rule is called reaches the OS activity log.

**Not moved.** The ledger-era composition root and fake — `accessor.ts`,
`clock.ts`, `appRuntime.ts`, `MockScreenTimeModule.ts`, `mockStore.ts` — stayed
behind. app-next composes its runtime in `src/runtime/createRuntime.ts` and
fakes Screen Time at the port level in `src/demo/fakes/ScreenTimeFake.ts`, so
moving a second composition root and a second fake would have handed P2-T04 two
of everything. P2-T04 writes `ScreenTimeAdapter implements ScreenTimePort` over
this module.

## Opaque-handle law

`ScreenTimeSelectionHandle` is an opaque token for the user's selected apps and
categories. It must never contain, expose, log, or derive raw bundle IDs or app
names. Apple does not reveal those identifiers through FamilyControls. Only a
ScreenTime adapter may create or persist a handle; callers may only retain it
and pass it back to this interface.

The same law governs the summary. `ScreenTimeSelectionSummary.displayName` is
composed **by the adapter, from counts** ("4 apps · 2 categories") — never from
a bundle identifier or an app name, because FamilyControls renders those only
inside its own `Label` view and never hands the string to the process. A caller
that wants to name the locked group therefore prints this line and nothing else.
`describeSelection` answers `null` for a handle this adapter did not issue, so a
stale persisted token degrades into "choose your apps" rather than a crash.

## Runtime selection

The composition root selects the mock only for tests, Expo Go, and non-iOS
runtimes. Every other iOS runtime selects the native adapter: an
`expo-dev-client` development build, a `Standalone` production/release build, a
`Bare` build, or an execution-environment value introduced after this code was
written. [Expo documents](https://docs.expo.dev/versions/latest/sdk/constants/#executionenvironment)
`StoreClient` as Expo Go or `expo-dev-client`, and `Standalone` as a
production/release build; `expoGoConfig` is the discriminator that is populated
only by Expo Go.

This native-by-default rule is deliberate. Once #80 added the native extension
targets, an unfamiliar iOS environment failing toward the native module became
safer than silently running a simulation that never blocks an app. As a second
guard, an iOS `Standalone` runtime with contradictory Expo Go metadata throws at
startup rather than resolving the mock. `NODE_ENV === "test"` remains the first
selection rule, so Jest always retains the deterministic mock.

## Persistence

State persists under a versioned AsyncStorage key (`excerlock.screentime.native.v2`)
using the same Zustand persistence pattern as settings. Observable state is
emitted only when the shield snapshot changes, so an idempotent reconcile does
not cause spurious renders. Scheduling logic never reads `Date.now()`; the clock
is injected.

## Invariants

- Lock windows are concrete local wall-clock millisecond intervals and are
  active at the start boundary, inactive at the end boundary.
- With no scheduled windows, Ledger's desired state applies all day. Once
  windows exist, shields are clear outside every active window.
- Repeating authorization and schedule registration with the same state is a
  no-op. Reconciliation emits no duplicate observable state; the native
  adapter may still re-arm an OS usage ladder or renew an eligible 15-minute
  unlock lease.
- Persisted data is validated before it crosses the interface.

## Test

From the repository root:

```sh
npm test --workspace app-next -- --runTestsByPath src/engine/screentime/native/__tests__/NativeScreenTimeModule.test.ts
```
