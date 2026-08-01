# Getting a real iPhone in front of this app — what it actually costs

Researched 2026-08-01, after Johan pushed back on the assumption that a device
means "a $1000 phone." It does not. It can mean $0.

This file exists because the physical-device requirement had been asserted for
weeks without anyone costing it. Companion to
`docs/research/familycontrols-on-simulator.md`, which establishes *why* hardware
is needed; this one establishes *how cheaply*.

Claims are marked **HARD** (primary source) or **SOFT** (inference, forum,
secondary reporting). Three things could not be verified and are marked
NOT VERIFIED rather than estimated.

## The recommendation

**Borrow a phone for an afternoon. $0.** If nobody will lend one, buy a used
**iPhone SE 2nd gen (2020)** for **$78–$130**.

## Why the motion requirement costs nothing extra

Every iPhone that can run iOS 17.4 already has the motion coprocessor — every
iPhone since the 5s has one, and from A12 onward it is folded into the SoC.
**The motion requirement is strictly dominated by the OS requirement**, so it
adds zero to the price. (SOFT — Apple publishes no device matrix; its position
is "call `isStepCountingAvailable()`".)

Framework floors are **iOS 15.0** for FamilyControls, ManagedSettings and
DeviceActivity alike (**HARD** — Apple's docs JSON backend). Our 17.4 deployment
target is the real constraint.

## Prices — live listings fetched 2026-08-01

| Model | Chip | Max iOS | Swappa (lowest) | Back Market |
|---|---|---|---|---|
| **iPhone SE 2nd gen (2020)** | A13 | **26** | **$62** carrier / **$78** unlocked | — |
| iPhone XR | A12 | **18 only** | $98 unlocked | from $149 |
| iPhone 11 | A13 | **26** | $98 T-Mobile / $124 unlocked | — |

**Budget $90–$130 all-in** for an unlocked Good-condition unit with shipping and
tax; the "from $62" figure is one Fair-condition carrier-locked listing.

**eBay sold data was NOT retrieved** — eBay blocked automated fetching twice. No
eBay figure appears here because none was measured.

**Do not buy the XR.** It costs the same or more than an SE 2020 and caps at
**iOS 18**, so the one smoke test would run on an OS almost no user has. iOS 26
dropped the XR/XS entirely; the new floor is iPhone 11 / SE 2nd gen.

## Practical requirements

- **No SIM or cellular plan.** Wi-Fi is enough; nothing in these frameworks
  touches a network service (**HARD** by absence from Apple's docs).
- **Apple ID:** needed to finish setup. Only `.child` authorization requires a
  child iCloud account in an iCloud Family; ExcerLock uses `.individual`, which
  does not (SOFT — Apple Developer Forums 686330 / 746716).
- **A device passcode is a real gate** — the grant accepts Face ID, Touch ID or
  passcode (SOFT). The separate *Screen Time passcode* is not required.
- **Device registration is free** beyond the existing $99/yr. **100 devices per
  type per membership year**; disabling one does not free a slot (**HARD** —
  `developer.apple.com/help/account/devices/devices-overview`).
- **MDM-managed devices fail.** `.child` returns `FamilyControlsError.restricted`
  with "device is managed by MDM" (SOFT — forum, but the log string is specific).
  **`.individual` under MDM is NOT VERIFIED** — reports conflict. This is the
  question worth spending a free DTS incident on.

## An iPad covers half — and is not cheaper

Screen Time API is on iPadOS from 15.0 (**HARD**). But
`CMPedometer.isStepCountingAvailable()` returns **false** on iPad (SOFT but
unanimous — Apple Developer Forums 113666; no HARD source exists because Apple
deliberately makes this a runtime check).

| Checklist item | iPad |
|---|---|
| Authorization + passcode grant | covered |
| Shield applies / lifts | covered |
| DeviceActivity monitoring + re-arm | covered |
| Walking detection | almost certainly not |
| Step cadence | **no** |

So an iPad verifies the blocking half and none of the exercise half — and a used
iPad 8th gen costs **more** than an SE 2020. **Do not buy one.** If one is
already in a drawer, it is worth 30 minutes to de-risk the blocking half early.

## Cloud device farms are a dead end — with receipts

**A FamilyControls app cannot run on any public device-farm iOS device.**

- **BrowserStack (HARD)** publishes the exact entitlement list it preserves;
  `com.apple.developer.family-controls` is not on it. Asked whether you can
  register their UDIDs in your own profile instead: *"No. On iOS, we resign apps
  with wildcard provisioning profile."*
- **AWS Device Farm (HARD)**: "replaces the embedded provisioning profile with a
  wildcard profile and then re-signs the app… Re-signing the app **removes
  entitlements**." `skipAppResign` is private-devices-only.
- **Sauce Labs (HARD)**: same preserved list, no family-controls; resigning can
  be disabled on private devices only.

**The structural reason no policy change could fix this:** `family-controls` is a
privileged entitlement bound to a specific App ID that Apple explicitly enabled.
A **wildcard** profile is by definition not tied to a specific App ID, so it is
architecturally incapable of carrying it.

Nobody appears to have ever tried — no blog, forum, or issue anywhere. Given how
loudly developers complain about this API, the silence is informative.

Economics, even setting all that aside: the only entitlement-preserving
configurations are private devices at **$200+/month** — more in one month than
buying the phone outright and keeping it forever.

## Apple does not lend devices

**HARD negative finding** — neither `compare-memberships` nor `whats-included`
lists device loans, hardware, or lab hardware. Developer Centers offer free
consultations in a handful of cities; they are not device loans.

**DTS is worth using anyway.** Code-level support is a listed benefit (**HARD**).
The current incident limit is **NOT VERIFIED** — historically 2/year, reportedly
uncapped since June 2024, but no Apple page states it. Spend one on the question
above: *does `requestAuthorization(for: .individual)` succeed on an MDM-enrolled
or supervised device, and does it require a device passcode?*

## Borrowing — the actual procedure

**Nothing is erased. No factory reset. No jailbreak. Fully reversible.**

1. Plug in; they tap **Trust This Computer** and enter their passcode.
2. Xcode registers the UDID and installs the build (~1 min).
3. On first launch **they** tap Allow and enter **their own** passcode — we never
   see or learn it.
4. Run the checklist: pick apps, confirm blocked, walk around to confirm step
   counting and walking detection.
5. Delete the app.

To fully undo: deleting the app clears the settings it applied (ManagedSettings
state is per-app and invalidated on removal). Belt and braces —
**Settings → Screen Time → Apps with Screen Time Access → toggle ExcerLock off**
before deleting; this does not require the Screen Time passcode.

The only irreversible part is **on our side**: their UDID stays in the developer
account until renewal. One of 100 slots. Irrelevant.

**Three disqualifiers:** a work phone under corporate management; a phone already
running another parental-control or focus app (iOS allows only one holder of
Screen Time access at a time); or a phone older than an iPhone XR.

## Ranked

| Route | Cost | Covers | Confidence |
|---|---|---|---|
| **Borrow for an afternoon** | **$0** | everything | high |
| Used iPhone SE 2nd gen (2020) | $78–$130 | everything, permanently, on iOS 26 | high |
| Used iPhone XR | $98–$149 | everything, capped at iOS 18 — **skip** | high it works, low it's wise |
| An iPad already owned | $0 | blocking only, no exercise half | high / medium |
| Cloud device farm | $39–$250+/mo | **nothing — dead end** | high |
