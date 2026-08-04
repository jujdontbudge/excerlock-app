# ScreenTime

ScreenTime is the app-facing seam for iOS authorization, the system app/category
picker, shield reconciliation, and concrete lock-window registration. Tests and
non-native previews use a persistent mock. Native iOS runtimes select the real
FamilyControls/ManagedSettings/DeviceActivity adapter without changing callers;
see [`native/README.md`](native/README.md).

## Interface

Callers import only `index.ts` and obtain the adapter through
`getScreenTimeModule()`. The interface exposes:

- Screen Time authorization status and request (`notDetermined | approved |
  denied`).
- the system picker, returning an opaque `ScreenTimeSelectionHandle`, plus
  `describeSelection(handle)` — the adapter-composed `ScreenTimeSelectionSummary`
  a caller may render;
- one `reconcile(selection, desiredOsState)` operation that applies or clears
  shields from the `DesiredOsState` computed by `@excerlock/ledger`;
- concrete lock windows with `[startsAtMs, endsAtMs)` boundaries, readable back
  through `getLockWindows()` so a caller can say when a shield lifts;
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

## Mock and clock

`MockScreenTimeModule` mirrors SignalKit's fixture-provider seam: it implements
the production interface and adds deterministic driver controls only for its
own tests. Its clock is injected; scheduling logic never reads `Date.now()`.
The app-owned adapter receives the stable `screenTimeAppClock` indirection, so
an E2E composition root can pin both lock policy and the mock boundary to the
same scenario instant even when the singleton was constructed first.
State persists under a versioned AsyncStorage key using the same Zustand
persistence pattern as settings. Observable state is emitted only when the
shield snapshot changes, so idempotent reconciliation does not cause spurious
renders.

The mock and native classes are deliberately not exported from `index.ts`. No
app module may import either implementation directly. `getScreenTimeModule()`
is the single composition point, with one exemption: the build-gated E2E
runtime root may install a scenario-selected module through
`installScreenTimeModule()`, because a scenario owns its OS boundary the same
way it owns every signal fixture. Scenarios default to the mock; a scenario
declaring `screenTimeModule: "native"` keeps the real adapter (see
`e2e/scenario-schema.md`).

Simulator coverage of the native adapter was re-measured 2026-08-04 (#97): on
a fresh iOS 26.4.1 simulator, real FamilyControls authorization **completes
silently** — no sheet, instant approval, remembered across uninstall and
`simctl privacy reset`. The e2e flow `screentime-permission` runs the real
notDetermined read, the primer, the request, and the approved-state UI against
the real adapter. What still requires hardware (#84): the deny path (no sheet
on a simulator means nothing can be refused), real shield enforcement, and
everything behind it. `requestAuthorization()` resolves to the re-read OS
status instead of rejecting, because on a device FamilyControls records a
refusal before it throws — the status is the truthful answer.

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
npm run test:app -- --runTestsByPath src/screentime/__tests__/MockScreenTimeModule.test.ts
```
