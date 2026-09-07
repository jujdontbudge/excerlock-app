# P2-T22 — Settings, permissions and account

Decisions: B11, B17, B18, B34, B35, B37, C5, D5. Findings: 35, 49, 68, 79, 81, 83, 99, 100, 101, 107, 108,
115. Per-finding detail: `docs/audit/fix-map.md` § P2-T22. Depends on P2-T18 (identity, lapse) and P2-T21
(camera status).

## 1. One Settings screen (B34, B37; findings 115 with 49, 100, 108 as criteria)

`DetailedSettingsScreen` and the "More settings" tier are removed; `SettingsScreen` is rebuilt from sections
under `features/settings/sections/*` (each under ~200 lines) matching `02-screen-inventory.md` §S: Locked apps
("N apps · M categories" from `describeSelection`), Conditions shortcut, **Permissions with all six rows
including Camera**, Preferences (units, stop grace, touch feedback; Notifications is **one** row in
Permissions with no per-notification toggles, renamed "Reminders"), Subscription (plan, renewal, Manage,
Restore), **one** Account row, Support, Rate, Share, Legal, About, Delete. Every literal moves to
`settingsCopy`. Test file: `features/settings/__tests__/screen.test.tsx`.

## 2. Permission recovery (findings 35, 68, 99)

`PermissionDetail` branches on the real status: `notDetermined` → request; `denied` → **Open Settings**
actually calls `Linking.openSettings()` (today it only sets a note); `restricted` → explains parental controls
/ MDM with no button. `location` gains `restricted`. The same button behaviour is used by Home's
`permissionNeeded` action and the ceremonies. Recorded camera status comes from P2-T21.

## 3. Preferences (findings 80, 81)

Touch feedback actually silences haptics (binding in P2-T17); a denied Always-location grant explains itself
under the switch instead of snapping back silently, with the Settings link.

## 4. Account (findings 79, 101, 107)

One confirmation `BottomSheet` with `mode: 'signOut' | 'delete' | 'deleteData'`: an anonymous user can delete
their data (`auth.deleteAccount()` on the anonymous session, local rules kept per D5); sign-out is confirmed
and says what stays on the device ("Your conditions and progress stay on this phone; sign in again to restore
them on a new phone"); the X4 and Settings sign-in lines say what signing in buys (backup and restore of
conditions and progress, never the app selection).

## 5. Support (finding 83)

The composer collects a reply address and attaches the privacy-floored diagnostics the PRD requires
(`domain/supportDiagnostics.ts`: app version, iOS version, permission statuses, rule count, entitlement
status, last enforcement result; never gym names, coordinates or app names). P2-T10 step 5 sends it.

## Tests first

"Settings renders six permission rows including Camera and exactly one Account row"; "no 'More settings'
state exists"; "Open Settings calls Linking.openSettings when denied"; "restricted shows the explanation and
no button"; "touch feedback off produces no haptic call"; "a denied Always grant shows the explanation"; "an
anonymous user can delete their data and keeps local rules"; "sign-out is confirmed"; "the support payload
never contains a gym name or coordinate".

## Acceptance

- [ ] `02-screen-inventory.md` §S matches the rebuilt screen; the Notifications preference row is gone.
- [ ] Every Settings row does the real thing against the fakes; P2-T10 wires the adapters.
