# Locked apps selection

`createNativeScreenTimePort` owns Screen Time authorization and the native
FamilyActivityPicker. It returns the opaque `excerlock.selection.locked.v1`
handle and counts; app names, bundle identifiers and Apple tokens never cross
into JavaScript. The selection payload stays in App Group UserDefaults under
`familyActivitySelectionIds`.

The runtime mounts `NativeScreenTimePickerHost` and routes enforcement through
`EnforcementHost` and `NativeEnforcementTransport`. The enforcement package owns
shields, scheduled windows, renewable watchdogs and the Bank drain. Selection
code does not construct a second drain ladder. See
[`../enforcement/README.md`](../enforcement/README.md) for the App Group schema.

The simulator can complete FamilyControls authorization silently and show the
picker. It cannot prove that a Shield blocks an app or produce Locked-app usage.
Physical-device enforcement remains a release gate.
