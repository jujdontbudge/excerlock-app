# Settings

`SettingsScreen` is the single scrolling settings surface. It composes the profile header and the Subscription, Permissions, Preferences, Your plan, Support, Legal, Account and About modules from `sections/`; there is no secondary “More settings” state. Each row reads stores or calls a runtime port, while real platform and server adapters remain P2-T10's responsibility.

`SettingsPage` provides sub-screen navigation. `PermissionDetail` owns status-specific permission recovery, `SupportScreen` builds the reply-address request and privacy-floored diagnostics, and `AccountScreen` owns the shared sign-out/deletion confirmation sheet. Anonymous deletion removes server data while preserving the local-first plan. Legal content remains explicitly marked as a Phase 1 placeholder in `src/content/legal.ts`.

Gym auto-detect disables its switch while an Always-location request is open and exposes denied recovery inline. Touch feedback writes the persisted preference; P2-T17 binds that store value at the application root.

`preferences` relabels saved distance rules when units change; values are not converted. Account deletion returns to an anonymous session and preserves local data. Support uses a local fake port and records only category/length in its debug event. No message is sent externally.
