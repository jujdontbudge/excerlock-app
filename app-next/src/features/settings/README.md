# Settings

Ordering maps the actual OtterLife segment 08: General (About You, Data Source, notifications, units), Community (sharing), Other (help/feedback, privacy, agreement). ExcerLock places profile/subscription first, required data permissions and preferences next, then community/support/legal/account. Saved gyms and the one locked-app set stay close to their preferences.

`SettingsScreen` composes the groups and fake external actions. `SettingsPage` provides sub-screen navigation. `PermissionDetail`, `GymsScreen`, `SupportScreen`, `AccountScreen` and `LegalScreen` own their individual interactions. Legal content is explicitly marked as a Phase 1 placeholder in `src/content/legal.ts`.

`preferences` relabels saved distance rules when units change; values are not converted. Account deletion returns to an anonymous session and preserves local data. Support uses a local fake port and records only category/length in its debug event. No message is sent externally.
