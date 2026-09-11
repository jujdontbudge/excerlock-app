# T09 — Picker, History, Settings wiring, manage subscription, export (B45, B52)

Facts: `research/conditions-audit.md` §5 (count in `FakeAppPicker.tsx:27-32`, `AppsSetup.tsx:28`;
count-derived predicates `AppsSetup.tsx:34`, `SetupComplete.tsx:28`, `statusContent.ts:55-56`), §6 (History row
`HomeScreen.tsx:206-214`, inert), §8 (`/settings/preferences`, `/settings/units`, `/settings/permission/*`
unreachable; every "Open Settings" inert; auto-detect switch discards result; support has no reply address).

## Steps

1. **Picker.** `ScreenTimePort.presentPicker()` → real `DeviceActivitySelectionSheetView` (persisted
   `familyActivitySelectionId`); every lock-list row (X2, Home, Conditions, Settings) calls it directly. Delete
   `FakeAppPicker` counts and `pickerCopy.counts()`; delete `activitySelectionMetadata` reads (ledger: never
   build logic on counts — iOS auto-promotes to categories). Emptiness = `selectionId == null || isEmpty`;
   only Home's lock card renders "No apps selected" with a tap. X2: one button opening the sheet; cannot
   continue with empty; "Skip for now" stays. Fallback view behind the SwiftUI picker crash (G7).
2. **History row** deleted; Home Analytics row kept.
3. **Settings one screen** (B34/B52): merge "More settings" back; add navigation entries for
   `/settings/preferences`, `/settings/units`, `/settings/permission/[name]` (all six rows incl. Camera);
   `Linking.openSettings()` on every fix button; permission rows read live status on foreground; auto-detect
   switch reflects the real Always result with a reason when denied; delete "Touch feedback"; support form
   gains a reply address field.
4. **Manage subscription**: native `showManageSubscriptions` (StoreKit) via a tiny Expo module or
   `react-native-adapty`'s helper if present; fallback `itms-apps://apps.apple.com/account/subscriptions`.
5. **Export my data**: JSON of rules, days, earned unlocks, visits, profile → share sheet (`expo-sharing`).
   **Analytics opt-out** switch (wired in T06).
6. Delete Home test buttons; gate `/dev`, deep-link params and dev menu behind `__DEV__`.

## Tests first

- `settings-reachability.test.tsx`: every route under `app/settings/**` has ≥1 navigation entry point.
- `picker-no-counts.test.ts`: grep guard for `applicationCount|categoryCount|counts(`.
- `home-empty-selection.test.tsx`.

## Acceptance

- [ ] Simulator: tapping any lock-list row presents Apple's picker; selection persists; no count anywhere.
- [ ] Every Settings row does something real; Manage subscription opens the system sheet.
- [ ] Release bundle contains no `/dev` route (`__DEV__` gate test).
