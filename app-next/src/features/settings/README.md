# Settings

Main-screen layout follows `design/mockups/onboarding-orange/main-settings-v3.png`: profile, Permissions, Preferences, Account & support. It uses the current orange gradient, orange utility glyphs, white grouped cards and compact 44-point rows. Camera permission and the existing full preference/subscription/legal controls remain under More settings, owned by `DetailedSettingsScreen`; no settings functionality was deleted. Appearance is not invented as a nonfunctional control.

`SettingsScreen` composes the groups and fake external actions. `SettingsPage` provides sub-screen navigation. `PermissionDetail`, `GymsScreen`, `SupportScreen`, `AccountScreen` and `LegalScreen` own their individual interactions. Legal content is explicitly marked as a Phase 1 placeholder in `src/content/legal.ts`.

`LegalLinks` is the shared tappable Terms of Use and Privacy Policy interface used by welcome and paywall
surfaces. It owns the local document sheet so neither caller can regress to inert legal text.

`AccountScreen` runs sign-out and deletion through `domain/identity`'s `teardownIdentity`, so the
subscription SDK is reset before analytics and the auth provider is always released last.

`preferences` relabels saved distance rules when units change; values are not converted. Account deletion returns to an anonymous session and preserves local data. Support uses a local fake port and records only category/length in its debug event. No message is sent externally.
