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
- `NativeScreenTimeModule.ts` maps authorization, ManagedSettings shields,
  concrete lock-window monitors, and observable shield state.
- `deviceActivitySchedule.ts` owns calendar conversion, private monitor names,
  and the app-fixed 15-minute unlock increment.
- `nativeStore.ts` persists only the opaque handle, count summary, desired OS
  state, and concrete window timestamps. It never stores app names, bundle ids,
  or FamilyControls tokens.

## Renewable unlock invariant

Every effective `shields: "down"` reconciliation inside the active economy
stops the prior unlock monitor and registers a new non-repeating interval from
the current verification time through exactly 15 minutes later. Its
`intervalDidEnd` action applies the shield from the monitor extension. The
start is never backdated. If monitor registration fails, the adapter applies
the shield before returning the error.

The monitor survives the host app being force-quit once ticket #80 supplies the
`ActivityMonitorExtension` target. Reconciliation outside a configured lock
window clears shields without a lease because the economy is inactive there.

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

FamilyControls and ManagedSettings do not run on the simulator. Shield apply,
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
