# FamilyControls on the iOS Simulator — what is actually true

Tested empirically 2026-08-01 on **iOS 26.4 simulator**, Xcode 26.4, against a
real `expo run:ios` debug build of this app. This file exists because the repo
asserted the opposite in eight places on the strength of **zero tests**.

## ⚠️ Superseded 2026-08-04 — authorization COMPLETES on a fresh simulator

Re-measured on a **freshly created** iPhone 17 Pro device on the same installed
runtime (iOS 26.4.1 · 23E254a), Release e2e build, driven by Maestro
(`e2e/flows/screentime-permission.yaml`), twice:

1. **First-ever request on the fresh device:** status read `notDetermined`, the
   app's "Allow Screen Time" button called `requestAuthorization(.individual)`,
   and it **succeeded instantly — no sheet was ever presented**. The panel
   flipped to approved within a second.
2. **After `simctl privacy reset all` + full app uninstall + reinstall:** the
   app launched **already approved**. The grant is recorded OS-side, survives
   both, and there is no known simulator route to un-grant it (delete the
   device or make a new one).

The 2026-08-01 sheet-then-cancel measurement was real — the log lines and
error strings below happened — but it came from a long-lived, heavily used
device (`CB88DF53…`) that **has since been deleted**, and it did not reproduce
on a fresh device on the same runtime version. Whether the difference was
accumulated device state or something else is **unknowable now**; what is
reproducible today is silent success.

**The corrected corrected position:** on a fresh iOS 26.4.1 simulator device,
real FamilyControls `.individual` authorization completes silently. The
sections below are kept as the trail — including the two wrong reasons — but
their shared conclusion ("authorization cannot complete on a simulator") is
**no longer true** on current tooling.

**What this changes:** the approved state, and every API gated on it, is now
reachable with the real adapter on a simulator. **What it does not change:**
the deny path cannot be produced (no sheet → nothing to refuse), and whether a
shield actually blocks an app — the product's core promise — is still
device-only truth (#84), as is everything this file never covered (background
wakes, real motion).

This is the third revision of this file, and this time the **conclusion**
fell, not just the reasoning. The compounding lesson: a measurement is a fact
about one device on one day, not a law — record the device, the runtime, and
the date with every claim, and re-run the measurement when any of them change.

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

## The corrected position (historical — superseded above)

**Wrong:** "FamilyControls does not run on the simulator."
**Also wrong:** "authorization fails because a simulator has no passcode."
**Wrong again (2026-08-04):** "authorization cannot be completed there because
the authorization UI service is not shipped in the runtime." On a fresh device
the request never involves that UI service at all — it succeeds silently.

Two wrong reasons preceded a conclusion that then fell itself. A conclusion
surviving does not mean the reasoning behind it was ever checked — and a
measured conclusion is still only a fact about one device on one day.

The device smoke suite is still needed, but its reason narrowed twice: it now
exists for the deny path and for **real shield enforcement**, not for reaching
the authorized state.

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
