# Native ScreenTime adapter

This directory is the only JS/TS code that imports
`react-native-device-activity`. It implements the existing `ScreenTimeModule`
surface without exposing a FamilyControls token to callers.

## Responsibilities

- `deviceActivityApi.ts` is the package translation edge.
- `NativeScreenTimePickerHost.tsx` turns the native persisted
  `FamilyActivityPicker` sheet into the interface's `pickSelection()` promise.
  The picker receives the opaque id `excerlock.selection.locked.v1`; JS receives
  app/category counts only. The serialized Apple token stays in app-group
  UserDefaults.
- `NativeScreenTimeModule.ts` maps authorization, selection persistence, and
  observable shield state.
- `NativeShieldScheduler.ts` is the sole owner of ManagedSettings transitions,
  lock-window monitors, the balance drain ladder, and unlock leases.
- `deviceActivitySchedule.ts` owns calendar conversion, private monitor names,
  and the app-fixed 15-minute unlock increment.
- `nativeStore.ts` persists only the opaque handle, count summary, desired OS
  state, and concrete window timestamps. It never stores app names, bundle ids,
  or FamilyControls tokens.

## Renewable unlock invariant

A `shields: "down"` reconciliation with no balance drain ladder inside the
active economy stops the prior unlock monitor and registers a new
non-repeating interval from the current verification time through exactly 15
minutes later. Its `intervalDidEnd` action applies the shield from the monitor
extension. The start is never backdated. If monitor registration fails, the
adapter applies the shield before returning the error.

When Ledger supplies drain thresholds, the adapter instead re-arms a local-day
DeviceActivity usage ladder with `includesPastActivity: true`; the final rung
applies the shield OS-side. This is why the deployment target remains iOS 17.4.
The scheduler resolves the package-owned serialized selection just in time for
`startMonitoring`; it never persists or returns that value. Event names and
monitor names contain no app or lock-window names.

The monitor survives the host app being force-quit once ticket #80 supplies the
`ActivityMonitorExtension` target. Reconciliation outside a configured lock
window clears shields without a lease because the economy is inactive there.

The #44 interface does not carry the policy cause or the user's custom ledger
day-boundary offset. Consequently the adapter cannot distinguish walking from
another no-ladder open state, and its usage interval is the local calendar day.
Those are seam-level limits, not facts supplied by
`react-native-device-activity`; this ticket does not widen the interface.

## Build selection

`accessor.ts` selects this adapter only in an iOS `expo-dev-client` build.
Jest, Expo Go, Android, and other previews continue to receive
`MockScreenTimeModule`. The root layout mounts one picker host for the shared
native adapter.

## Native-target handoff

The config plugin is installed with
`appGroup: group.com.johansardar.excerlock` and
`copyToTargetFolder: false`. Ticket #80 owns the monitor, shield-configuration,
and shield-action targets and their canonical bundle identifiers. Until those
targets exist, JS can call ManagedSettings from the host app, but OS-side
`intervalDidEnd` and lock-window actions cannot execute.

FamilyControls and ManagedSettings load and run on the simulator, but authorization cannot be completed there (no device passcode is possible), so everything gated behind it is unverifiable — see `docs/research/familycontrols-on-simulator.md`. Shield apply,
lift, interval lapse, force-quit survival, and provisioning therefore remain
unverified until #80 is built and the complete flow is exercised on a physical
iOS 17.4+ device.

## Tests

From the repository root:

```sh
npm run test:app -- --runTestsByPath \
  src/screentime/native/__tests__/NativeScreenTimeModule.test.ts \
  src/screentime/native/__tests__/NativeScreenTimePickerHost.test.tsx
```
