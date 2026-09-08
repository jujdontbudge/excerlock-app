# Settings

`SettingsScreen` is the single scrolling settings surface. It composes the profile header and the Subscription, Permissions, Preferences, Your plan, Support, Legal, Account and About modules from `sections/`; there is no secondary “More settings” state. Each row reads stores or calls a runtime port; the rows that are pure device actions go straight to the platform:

- **Permissions** read `permissionsStore`, which the runtime host refreshes from the adapters on every foreground transition (Screen Time, Motion, Health, Reminders and Camera; Location is written by the gym port's own request). The detail screen requests when `notDetermined` and opens iOS Settings when denied; Home and the setup primers use the same recovery.
- **Manage subscription** opens Apple's subscription page (`adapters/appStore`); **Restore purchases** goes through `SubscriptionPort.restore`, and plan and renewal render the entitlement the subscription adapter publishes.
- **Rate ExcerLock** opens the store's write-review composer through `adapters/review` and ends the automatic rating prompts; **Share ExcerLock** opens the native share sheet with the App Store link.
- **Contact support** sends through `SupportPort`; the real port is `adapters/api`'s `POST /v1/support` client, and a failure keeps the draft with offline, timeout or rejected copy.
- **Export my data** (`exportData.ts`) builds `domain/dataExport`'s JSON from the local stores (conditions, rule days, earned unlocks, daily history; never the app selection or saved gyms), emits `data_export_requested`, writes the file to the cache directory and opens the share sheet. `nativeExport.ts` is the only file that touches `expo-file-system`.
- **Delete account / Delete my data** run `domain/identity`'s teardown; in the real runtime the auth port is wrapped with `adapters/api`'s `withServerDeletion`, so `DELETE /v1/user` runs before the local session teardown and a refused deletion changes nothing.

`SettingsPage` provides sub-screen navigation. `PermissionDetail` owns status-specific permission recovery, `SupportScreen` builds the reply-address request and privacy-floored diagnostics, and `AccountScreen` owns the shared sign-out/deletion confirmation sheet. Anonymous deletion removes server data while preserving the local-first plan. Legal content remains explicitly marked as a Phase 1 placeholder in `src/content/legal.ts`.

Gym auto-detect disables its switch while an Always-location request is open and exposes denied recovery inline. Touch feedback writes the persisted preference; P2-T17 binds that store value at the application root.

`LegalLinks` is the shared tappable Terms of Use and Privacy Policy interface used by welcome and paywall
surfaces. It owns the local document sheet so neither caller can regress to inert legal text.

`AccountScreen` runs sign-out and deletion through `domain/identity`'s `teardownIdentity`, so the
subscription SDK is reset before analytics and the auth provider is always released last.

`preferences` relabels saved distance rules when units change; values are not converted. Account deletion returns to an anonymous session and preserves local data. Under the fake runtime, support and deletion stay on the device: the fake support port records only category and length in its debug event, and no message is sent externally.

`appBuildInfo` is the one reader of the running version and build: the native bundle values from `expo-application` win, because EAS remote versioning can leave `expoConfig.ios.buildNumber` undefined in a store build; app.json is the development fallback. The About row and the support diagnostics both use it.

Legal text is still the Phase 1 placeholder: `content/legal.ts` carries `placeholder: true`, and `content/__tests__/legal-release.test.ts` fails a production build (`EAS_BUILD_PROFILE=production` or `EXPO_PUBLIC_RELEASE_BUILD=1`) until the real Terms and Privacy documents replace it.
