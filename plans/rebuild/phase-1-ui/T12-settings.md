# T12 — Settings tab and sub-screens

## Inputs

`02-screen-inventory.md` §6 (Settings) for the required rows, reference study (`design/motion/reference/`) for **grouping and order
per OtterLife** (decision C3: rows go where OtterLife puts them, in OtterLife's order; rows OtterLife lacks
are modeled on the closest OtterLife row Codex picks from the inventory). Mockup `main-settings-v3.png` is a first-viewport concept
only. Old copy for delete-account explanation: `app/src/account/AccountSettingsCard.tsx` (facts), reworded.

## Steps

1. `SettingsScreen` composed from `SettingsGroup`s in the OtterLife-mapped order Codex derives from the reference study, with every required row: profile
   header; subscription (plan/renewal from `entitlementStore`, Manage subscription → fake external link
   note, Restore → `SubscriptionPort.restore()`); permissions (`PermissionRow` × 6 with Fix → opens
   `settings/permission/[name]`); preferences (Units segmented km/mi, Walk & Scroll stop grace picker, Gym
   auto-detect switch with Always-location explanation, Haptics switch); Locked apps → SH-apps; Gyms →
   `settings/gyms`; Support → composer; Rate ExcerLock (fake `StoreReview` no-op with inline confirmation);
   Share ExcerLock (fake share sheet); Terms / Privacy → `settings/legal/[doc]` (markdown-ish content
   screens with placeholder legal text clearly marked in the content file, not on screen); Account (Sign in →
   X4 screens reused as a modal; Sign out; Delete account → confirmation with the five facts); footer version
   + build from `expo-constants`; 7 taps on the footer opens the dev menu.
2. Sub-screens: `settings/permission/[name]` (status, why it is needed, what happens without it, Open
   Settings), `settings/gyms` (list, add via SH-gym, delete, max 5), `settings/support` (category chips:
   Problem / Question / Idea, message field, Send → submitting → sent state; fake port), `settings/account`,
   `settings/legal/[doc]`.
3. Preferences persist (`settingsStore`); Units change re-labels distances everywhere (Conditions list,
   builder D screen) — integration test.
4. Evidence: full Settings scroll recording, each sub-screen, XL Dynamic Type of the main list.

## Acceptance

- [ ] Every required row exists; the order follows the OtterLife settings inventory and the motion notes are written.
- [ ] Delete-account flow ends in the signed-out anonymous state with rules intact (local-first law test).
- [ ] Dev menu opens from 7 footer taps.
