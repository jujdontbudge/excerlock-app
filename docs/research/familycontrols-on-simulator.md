# FamilyControls on the iOS Simulator — what is actually true

Tested empirically 2026-08-01 on **iOS 26.4 simulator**, Xcode 26.4, against a
real `expo run:ios` debug build of this app. This file exists because the repo
asserted the opposite in eight places on the strength of **zero tests**.

## The claim that was wrong

The 2026-07-28 charting session recorded *"FamilyControls does not run on
simulator"* as a parenthetical. It was never tested. It then propagated into
`docs/research/e2e-loop.md`, `e2e/HARNESS.md`, `e2e/DEVICE-SMOKE.md` and four
module READMEs, where repetition made it read as verified fact.

**As literally worded, it is false.** The frameworks run.

## What was measured

Frameworks ship in **both** the simulator SDK and the iOS 26.4 simulator
runtime — `FamilyControls.framework`, `ManagedSettings.framework`,
`DeviceActivity.framework`, plus the `FamilyControlsObjC`,
`FamilyControlsSlotSupport` and `ScreenTimeCore` private frameworks.

A probe route calling the real `react-native-device-activity` API returned:

| Call | Result |
|---|---|
| module load | **works** — 63 exports |
| `getAuthorizationStatus()` | **works** → `0` (notDetermined) |
| `isShieldActive()` | **works** → `false` |
| `requestAuthorization()` | **throws** — `Family Controls authorization canceled` |

The system log shows `FamilyControlsAgent` running, `com.apple.FCAuthenticationUI`
being launched, and `[com.apple.FamilyControls:authorization] Authorization
records succeeded`. **The real "Allow Access to Screen Time" sheet renders and
names "ExcerLock".** It is not a stub and it is not absent.

## Why authorization still cannot complete

**Corrected 2026-08-01.** This section first claimed the blocker was a
passcode check. That was wrong, and wrong in the same way as the claim this
whole file exists to fix: it was the plausible reading, not the measured one.

`FamilyControls.framework` contains **two distinct error strings**:

```
Family Controls authorization requires a device passcode.
Family Controls authorization canceled.
```

The app received the **second**. If a passcode check were the gate, the first
would have been thrown. The actual system log line is:

```
FamilyControlsAgent [com.apple.FamilyControls:authentication]
  Service deactivated without returning a response. Treating it as a cancel.
```

So the authorization UI service **dies before answering**, and the framework
reports that silence as a cancel.

The mechanical cause is that the passcode UI is not shipped in the simulator
runtime at all. `PasscodeAndBiometricsSettings.framework` and its App Intents
extension contain **only `.lproj` localization directories** — zero Mach-O, zero
`Info.plist`. Among the 152 bundles in `PreferenceBundles` there is no passcode
or Face ID pane (only `SIMPasscodeTelephonySettings`, which is the unrelated
SIM-card PIN). That absence is also why Settings → Passcode renders blank.

A device passcode additionally **cannot be set by any route**, which was
verified separately and exhaustively: no keybag framework or keybag file exists
anywhere in the runtime; the runtime volume is a sealed read-only APFS snapshot,
so nothing can be injected; `simctl` has no passcode capability in any
subcommand, and `strings` finds none in `simctl` or `CoreSimulator.framework`;
`mdmd` implements only *clear*-device-passcode, never set; and Simulator.app's
biometric "enrolment" is a synthetic HID stub with **zero** passcode strings in
its binary, refuting the idea that enrolment implies a passcode.

`simctl privacy` cannot grant it either — its complete service list is calendar,
contacts, contacts-limited, location, location-always, photos, photos-add,
media-library, microphone, **motion**, reminders, siri. There is no screen-time,
family-controls, or device-activity service.

**The conclusion is unchanged; only the reason is.** Both routes are closed, so
authorization cannot complete on a simulator either way — but the honest
statement is "the authorization UI service is absent," not "the passcode check
fails."

### One lead not yet tested

Authorization persists to `Authorizations.plist` / `InternalAuthorizations.plist`
under `<device>/data/Library/com.apple.FamilyControlsAgent/`. Neither file
exists yet; the container holds only an empty `Store.plist`, a 32-byte
`KeyData.plist`, and `PrivateSyncSerialization.plist`. Writing a synthetic
authorization record has **not** been attempted, and `FamilyControlsAgent` may
cross-check it against that key blob. Separately, ManagedSettings persistence
**does** already work on the simulator — `EffectiveSettings.plist` holds live
keys — so if the gate could be forced, shield writes might round-trip.
Unverified in both directions; do not cite it as either possible or impossible.

## The corrected position

**Wrong:** "FamilyControls does not run on the simulator."
**Also wrong:** "authorization fails because a simulator has no passcode."
**Right:** FamilyControls loads and runs on the simulator and presents the real
authorization sheet; **authorization cannot be completed there because the
authorization UI service is not shipped in the runtime**, so anything gated on
authorization — shield apply, shield lift, DeviceActivity monitoring — cannot be
verified on a simulator.

Two wrong reasons preceded the right one, for the same correct conclusion. That
is the pattern worth remembering: a conclusion surviving does not mean the
reasoning behind it was ever checked.

The device smoke suite is therefore still needed, but for a narrower and more
precise reason than the repo claimed.

## What this *unblocks* for the simulator loop

More is simulator-testable than the old claim allowed:

- `getAuthorizationStatus()` and `isShieldActive()` return real values, so
  unauthorized-state handling can be exercised against the real API rather than
  only against `MockScreenTimeModule`.
- The **authorization request UI presents**, so the whole app flow up to and
  including the system sheet — permission priming, the request call, and the
  denial path — is verifiable on a simulator.
- Only the post-authorization surface needs hardware.

## Reproducing

```bash
cd app && npx expo run:ios          # ios/ is already prebuilt
xcrun simctl spawn <udid> log stream --style compact \
  --predicate 'subsystem CONTAINS "FamilyControls" OR subsystem CONTAINS "ScreenTime"'
```

Then call `getAuthorizationStatus()` / `requestAuthorization()` from a scratch
route. The probe used for this write-up was deleted after use; the table above
is its output.
