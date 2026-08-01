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

The sheet's only affirmative action is **"Allow with Passcode"**, which leads to
*"Enter iPhone Passcode for ExcerLock"*. iOS requires device-passcode
authentication before granting Screen Time access.

**A simulator cannot have a device passcode.** Settings → Passcode opens a blank
pane that cannot be interacted with — there is no Secure Enclave to back it.
So the flow dead-ends, and Apple's developer forums independently report
individual authorization failing on Simulator with `FamilyControlsError` code 3.

## The corrected position

**Wrong:** "FamilyControls does not run on the simulator."
**Right:** FamilyControls loads and runs on the simulator; **authorization
cannot be completed there**, so anything gated on authorization — shield apply,
shield lift, DeviceActivity monitoring — cannot be verified on a simulator.

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
